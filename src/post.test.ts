import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCore = vi.hoisted(() => ({
    getState: vi.fn(),
    getInput: vi.fn<(name: string) => string>(),
    warning: vi.fn(),
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

import { main, run } from './post';

describe('post', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockCore.getState.mockReturnValue('test_1234_unit_');
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
                default:
                    return '';
            }
        });

        mockMysql.createConnection.mockResolvedValue(mockQuery);
        mockQuery.query.mockResolvedValue([[], []]);
    });

    it('does nothing when there is no saved prefix', async () => {
        mockCore.getState.mockReturnValue('');

        await run();

        expect(mockMysql.createConnection).not.toHaveBeenCalled();
        expect(mockQuery.query).not.toHaveBeenCalled();
    });

    it('drops every database matching the saved prefix', async () => {
        mockQuery.query.mockResolvedValueOnce([
            [{ SCHEMA_NAME: 'test_1234_unit_abc123' }, { SCHEMA_NAME: 'test_1234_unit_def456' }],
            [],
        ]);

        await run();

        expect(mockMysql.createConnection).toHaveBeenCalledWith({
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: 'secret',
        });
        expect(mockQuery.query).toHaveBeenNthCalledWith(
            1,
            expect.stringContaining('WHERE SCHEMA_NAME LIKE ?'),
            ['test_1234_unit_%'],
        );
        expect(mockQuery.query).toHaveBeenNthCalledWith(
            2,
            'DROP DATABASE IF EXISTS `test_1234_unit_abc123`',
        );
        expect(mockQuery.query).toHaveBeenNthCalledWith(
            3,
            'DROP DATABASE IF EXISTS `test_1234_unit_def456`',
        );
        expect(mockQuery.end).toHaveBeenCalled();
        expect(mockCore.warning).not.toHaveBeenCalled();
    });

    it('warns and closes the connection when a query fails', async () => {
        mockQuery.query.mockRejectedValueOnce(new Error('query failed'));

        main();
        await vi.waitFor(() => expect(mockCore.warning).toHaveBeenCalled());

        expect(mockCore.warning).toHaveBeenCalledWith('query failed');
        expect(mockQuery.end).toHaveBeenCalled();
    });
});
