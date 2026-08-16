import * as core from '@actions/core';
import * as mysql from 'mysql2/promise';
import { cleanupDatabases, type DbConfig } from './db';

export async function run(): Promise<void> {
    const basePrefix = core.getState('database_prefix');

    if (!basePrefix) {
        return;
    }

    const config: DbConfig = {
        host: core.getInput('host'),
        port: Number(core.getInput('port')),
        user: core.getInput('username'),
        password: core.getInput('password'),
    };

    const connection = await mysql.createConnection(config);

    try {
        const removed = await cleanupDatabases(connection, basePrefix);

        for (const dbName of removed) {
            console.log(`Database removed: ${dbName}`);
        }

        console.log(`Removed ${removed.length} database(s).`);
    } finally {
        await connection.end();
    }
}

export function main(): void {
    run().catch((err) => {
        core.warning(err instanceof Error ? err.message : String(err));
    });
}

if (typeof require !== 'undefined' && require.main === module) {
    main();
}
