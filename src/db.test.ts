import { describe, expect, it, vi } from 'vitest';
import {
    cleanupDatabases,
    createDatabase,
    dropDatabases,
    escapeIdentifier,
    listDatabases,
} from './db';
import type { Queryable } from './db';

function mockConnection(): { connection: Queryable } {
    return {
        connection: {
            query: vi.fn(),
        } as unknown as Queryable,
    };
}

describe('escapeIdentifier', () => {
    it('wraps the identifier in backticks', () => {
        expect(escapeIdentifier('test_1_job_ab12cd')).toBe('`test_1_job_ab12cd`');
    });
});

describe('createDatabase', () => {
    it('drops an existing database before creating a new one', async () => {
        const { connection } = mockConnection();
        const { query } = connection as unknown as { query: ReturnType<typeof vi.fn> };

        await createDatabase(connection, 'test_1_job_ab12cd');

        expect(query).toHaveBeenNthCalledWith(1, 'DROP DATABASE IF EXISTS `test_1_job_ab12cd`');
        expect(query).toHaveBeenNthCalledWith(2, 'CREATE DATABASE `test_1_job_ab12cd`');
    });
});

describe('listDatabases', () => {
    it('returns the schema names matching the prefix', async () => {
        const { connection } = mockConnection();
        const { query } = connection as unknown as { query: ReturnType<typeof vi.fn> };
        query.mockResolvedValueOnce([
            [{ SCHEMA_NAME: 'pre_a' }, { SCHEMA_NAME: 'pre_b' }],
            [],
        ]);

        const names = await listDatabases(connection, 'pre_');

        expect(names).toEqual(['pre_a', 'pre_b']);
        expect(query).toHaveBeenCalledWith(
            expect.stringContaining('WHERE SCHEMA_NAME LIKE ?'),
            ['pre_%'],
        );
    });
});

describe('dropDatabases', () => {
    it('drops each database and returns the removed names', async () => {
        const { connection } = mockConnection();
        const { query } = connection as unknown as { query: ReturnType<typeof vi.fn> };

        const removed = await dropDatabases(connection, ['a', 'b']);

        expect(removed).toEqual(['a', 'b']);
        expect(query).toHaveBeenNthCalledWith(1, 'DROP DATABASE IF EXISTS `a`');
        expect(query).toHaveBeenNthCalledWith(2, 'DROP DATABASE IF EXISTS `b`');
    });
});

describe('cleanupDatabases', () => {
    it('lists and drops databases for a prefix', async () => {
        const { connection } = mockConnection();
        const { query } = connection as unknown as { query: ReturnType<typeof vi.fn> };
        query.mockResolvedValueOnce([
            [{ SCHEMA_NAME: 'pre_a' }, { SCHEMA_NAME: 'pre_b' }],
            [],
        ]);

        const removed = await cleanupDatabases(connection, 'pre_');

        expect(removed).toEqual(['pre_a', 'pre_b']);
        expect(query).toHaveBeenCalledTimes(3);
    });
});
