import * as core from '@actions/core';
import * as mysql from 'mysql2/promise';
import { randomBytes } from 'crypto';
import { createDatabase, type DbConfig } from './db';

export async function run(): Promise<void> {
    const config: DbConfig = {
        host: core.getInput('host'),
        port: Number(core.getInput('port')),
        user: core.getInput('username'),
        password: core.getInput('password'),
    };

    const prefix = core.getInput('database-prefix');
    const envName = core.getInput('env-name');

    const suffix = randomBytes(3).toString('hex');
    const dbName = `${prefix}${suffix}`;

    const connection = await mysql.createConnection(config);

    try {
        await createDatabase(connection, dbName);
    } finally {
        await connection.end();
    }

    core.exportVariable(envName, dbName);

    core.setOutput('database', dbName);

    core.saveState('envName', envName);
    core.saveState('database', dbName);
    core.saveState('database_prefix', prefix);
    core.saveState('host', config.host);
    core.saveState('port', String(config.port));
    core.saveState('user', config.user);
    core.saveState('password', config.password);

    console.log(`Database created: ${dbName}`);
}

export function main(): void {
    run().catch((err) => {
        core.setFailed(err instanceof Error ? err : new Error(String(err)));
    });
}

if (typeof require !== 'undefined' && require.main === module) {
    main();
}
