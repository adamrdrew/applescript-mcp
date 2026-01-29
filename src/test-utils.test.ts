/**
 * Tests for test utilities
 *
 * These verify the mocking infrastructure works correctly.
 */

import { describe, it, expect } from 'vitest';
import {
  createMockFileSystem,
  createMockCommandExecutor,
  successResponse,
  errorResponse,
  errorResponseWithData,
  mockExecuteResponse,
  createExecError,
  expectThrows,
} from './test-utils.js';

describe('createMockFileSystem', () => {
  it('reads files that exist', async () => {
    const fs = createMockFileSystem({ '/test.txt': 'hello' });
    const content = await fs.readFile('/test.txt', 'utf-8');
    expect(content).toBe('hello');
  });

  it('throws when reading non-existent files', async () => {
    const fs = createMockFileSystem({});
    await expect(fs.readFile('/missing.txt', 'utf-8')).rejects.toThrow('ENOENT');
  });

  it('writes and reads files', async () => {
    const fs = createMockFileSystem({});
    await fs.writeFile('/new.txt', 'content');
    const content = await fs.readFile('/new.txt', 'utf-8');
    expect(content).toBe('content');
  });

  it('checks existence correctly', async () => {
    const fs = createMockFileSystem({ '/exists.txt': 'data' });
    expect(fs.existsSync('/exists.txt')).toBe(true);
    expect(fs.existsSync('/missing.txt')).toBe(false);
  });

  it('creates directories', async () => {
    const fs = createMockFileSystem({});
    await fs.mkdir('/test/dir', { recursive: true });
    expect(fs.existsSync('/test/dir')).toBe(true);
  });

  it('lists directory contents', async () => {
    const fs = createMockFileSystem({
      '/dir/file1.txt': 'a',
      '/dir/file2.txt': 'b',
      '/dir/subdir/file3.txt': 'c',
    });
    const entries = await fs.readdir('/dir');
    expect(entries).toContain('file1.txt');
    expect(entries).toContain('file2.txt');
    expect(entries).toContain('subdir');
  });
});

describe('createMockCommandExecutor', () => {
  it('returns mocked responses', async () => {
    const executor = createMockCommandExecutor({
      'echo hello': { stdout: 'hello\n', stderr: '' },
    });
    const result = await executor.execFile('echo', ['hello']);
    expect(result.stdout).toBe('hello\n');
  });

  it('throws mocked errors', async () => {
    const executor = createMockCommandExecutor({
      'fail': new Error('Command failed'),
    });
    await expect(executor.execFile('fail', [])).rejects.toThrow('Command failed');
  });

  it('throws for unmocked commands', async () => {
    const executor = createMockCommandExecutor({});
    await expect(executor.execFile('unknown', [])).rejects.toThrow('Command not mocked');
  });
});

describe('response helpers', () => {
  it('creates success responses', () => {
    const response = successResponse({ value: 42 });
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ value: 42 });
    expect(response.error).toBeUndefined();
  });

  it('creates error responses', () => {
    const response = errorResponse('Something failed');
    expect(response.success).toBe(false);
    expect(response.error).toBe('Something failed');
  });

  it('creates error responses with data', () => {
    const response = errorResponseWithData('Failed', { partial: true });
    expect(response.success).toBe(false);
    expect(response.error).toBe('Failed');
    expect(response.data).toEqual({ partial: true });
  });
});

describe('mockExecuteResponse', () => {
  it('creates execute responses with defaults', () => {
    const response = mockExecuteResponse('output');
    expect(response.stdout).toBe('output');
    expect(response.stderr).toBe('');
    expect(response.exitCode).toBe(0);
  });

  it('creates execute responses with all fields', () => {
    const response = mockExecuteResponse('out', 'err', 1);
    expect(response.stdout).toBe('out');
    expect(response.stderr).toBe('err');
    expect(response.exitCode).toBe(1);
  });
});

describe('createExecError', () => {
  it('creates error with code', () => {
    const error = createExecError('Failed', { code: 1 });
    expect(error.message).toBe('Failed');
    expect(error.code).toBe(1);
  });

  it('creates error with killed flag', () => {
    const error = createExecError('Timeout', { killed: true });
    expect(error.killed).toBe(true);
  });

  it('creates error with stdout/stderr', () => {
    const error = createExecError('Error', { stdout: 'out', stderr: 'err' });
    expect(error.stdout).toBe('out');
    expect(error.stderr).toBe('err');
  });
});

describe('expectThrows', () => {
  it('passes when function throws', async () => {
    const error = await expectThrows(async () => {
      throw new Error('Expected error');
    });
    expect(error.message).toBe('Expected error');
  });

  it('fails when function does not throw', async () => {
    await expect(
      expectThrows(async () => {
        return 'success';
      })
    ).rejects.toThrow('Expected function to throw');
  });

  it('checks error message with string', async () => {
    await expectThrows(
      async () => {
        throw new Error('Contains expected text');
      },
      'expected text'
    );
  });

  it('checks error message with regex', async () => {
    await expectThrows(
      async () => {
        throw new Error('Error code 123');
      },
      /code \d+/
    );
  });
});
