import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockCore = vi.hoisted(() => ({
    getInput: vi.fn<(name: string) => string>(),
    exportVariable: vi.fn(),
    setOutput: vi.fn(),
    saveState: vi.fn(),
    setFailed: vi.fn(),
}));

const mockQuery = vi.hoisted(() => ({
    query: vi.fn(),
    end: vi.fn(),
}));

const mockMysql = vi.hoisted(() => ({
    createConnection: vi.fn(),
    escapeId: vi.fn((value: string) => `\`${value}\``),
}));

vi.mock('@actions/core', () => mockCore);
vi.mock('mysql2/promise', () => mockMysql);

import { main, run } from './main';

describe('main', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockCore.getInput.mockImplementation((name) => {
            switch (name) {
                case 'host':
                    return 'localhost';
                case 'port':
                    return '3306';
                case 'username':
                    return 'root';
                case 'password':
                    return 'secret';
                case 'database-prefix':
                    return 'test_1234_unit__';
                case 'env-name':
                    return 'DB_DATABASE';
                default:
                    return '';
            }
        });

        mockMysql.createConnection.mockResolvedValue(mockQuery);
        mockQuery.query.mockResolvedValue([[], []]);
    });

    it('creates a unique database and exports the expected variables', async () => {
        await run();

        expect(mockMysql.createConnection).toHaveBeenCalledWith({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: 'secret',
        });

        expect(mockQuery.query).toHaveBeenCalledTimes(2);

        const dropSql = mockQuery.query.mock.calls[0][0] as string;
        const createSql = mockQuery.query.mock.calls[1][0] as string;
        const dbName = dropSql.match(/^DROP DATABASE IF EXISTS `([^`]+)`$/)?.[1];

        expect(dbName).toMatch(/^test_1234_unit__[0-9a-f]{6}$/);
        expect(createSql).toBe(`CREATE DATABASE \`${dbName}\``);

        expect(mockCore.exportVariable).toHaveBeenCalledWith('DB_DATABASE', dbName);
        expect(mockCore.setOutput).toHaveBeenCalledWith('database', dbName);
        expect(mockCore.saveState).toHaveBeenCalledWith('envName', 'DB_DATABASE');
        expect(mockCore.saveState).toHaveBeenCalledWith('database', dbName);
        expect(mockCore.saveState).toHaveBeenCalledWith('database_prefix', 'test_1234_unit__');
        expect(mockCore.saveState).toHaveBeenCalledWith('host', 'localhost');
        expect(mockCore.saveState).toHaveBeenCalledWith('port', '3306');
        expect(mockCore.saveState).toHaveBeenCalledWith('user', 'root');
        expect(mockCore.saveState).toHaveBeenCalledWith('password', 'secret');
        expect(mockQuery.end).toHaveBeenCalled();
    });

    it('closes the connection and fails the run when a query fails', async () => {
        mockQuery.query.mockRejectedValueOnce(new Error('connection failed'));

        main();
        await vi.waitFor(() => expect(mockCore.setFailed).toHaveBeenCalled());

        expect(mockCore.setFailed).toHaveBeenCalledWith(expect.any(Error));
        expect(mockQuery.end).toHaveBeenCalled();
    });
});
