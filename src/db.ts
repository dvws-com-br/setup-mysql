import * as mysql from 'mysql2/promise';

export interface DbConfig {
    host: string;
    port: number;
    user: string;
    password: string;
}

export interface Queryable {
    query(sql: string, params?: unknown[]): Promise<[unknown, unknown]>;
}

export interface SchemaRow {
    SCHEMA_NAME?: string;
}

export function escapeIdentifier(name: string): string {
    return mysql.escapeId(name);
}

export async function createDatabase(
    connection: Queryable,
    dbName: string,
): Promise<void> {
    const escapedDbName = escapeIdentifier(dbName);

    await connection.query(`DROP DATABASE IF EXISTS ${escapedDbName}`);
    await connection.query(`CREATE DATABASE ${escapedDbName}`);
}

export async function listDatabases(
    connection: Queryable,
    basePrefix: string,
): Promise<string[]> {
    const [databases] = (await connection.query(
        `
            SELECT SCHEMA_NAME
            FROM information_schema.SCHEMATA
            WHERE SCHEMA_NAME LIKE ?
        `,
        [`${basePrefix}%`],
    )) as [SchemaRow[], unknown];

    return databases
        .map((database) => database.SCHEMA_NAME)
        .filter((name): name is string => typeof name === 'string');
}

export async function dropDatabases(
    connection: Queryable,
    dbNames: string[],
): Promise<string[]> {
    const removed: string[] = [];

    for (const dbName of dbNames) {
        await connection.query(
            `DROP DATABASE IF EXISTS ${escapeIdentifier(dbName)}`,
        );
        removed.push(dbName);
    }

    return removed;
}

export async function cleanupDatabases(
    connection: Queryable,
    basePrefix: string,
): Promise<string[]> {
    const databases = await listDatabases(connection, basePrefix);

    return dropDatabases(connection, databases);
}
