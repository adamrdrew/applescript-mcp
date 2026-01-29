/**
 * Tests for apple/executor.ts
 *
 * These tests verify the AppleScript execution and SDEF retrieval functionality
 * using mock command runners to avoid actual system calls.
 */

import { describe, it, expect } from 'vitest';
import {
  executeAppleScript,
  executeAppleScriptFile,
  getSdef,
  findAppPath,
  isScriptable,
  parseAppleScriptError,
  clampTimeout,
  isExecError,
  type CommandRunner,
  type ExecError,
  MIN_TIMEOUT,
  MAX_TIMEOUT,
  DEFAULT_TIMEOUT,
} from './executor.js';

// ============================================================
// Test Helpers
// ============================================================

/**
 * Creates a mock command runner for testing
 */
function createMockRunner(
  responses: Record<string, { stdout: string; stderr: string } | Error>
): CommandRunner {
  return {
    async exec(command, args) {
      const key = `${command} ${args.join(' ')}`;

      // Check for exact match
      if (responses[key]) {
        const response = responses[key];
        if (response instanceof Error) {
          throw response;
        }
        return response;
      }

      // Check for command-only match
      if (responses[command]) {
        const response = responses[command];
        if (response instanceof Error) {
          throw response;
        }
        return response;
      }

      // Default: command not found
      throw new Error(`Mock not configured for: ${key}`);
    },
  };
}

/**
 * Creates an exec error for testing
 */
function createExecError(
  message: string,
  options: {
    code?: number;
    killed?: boolean;
    stdout?: string;
    stderr?: string;
  } = {}
): ExecError {
  const error = new Error(message) as ExecError;
  if (options.code !== undefined) error.code = options.code;
  if (options.killed !== undefined) error.killed = options.killed;
  if (options.stdout !== undefined) error.stdout = options.stdout;
  if (options.stderr !== undefined) error.stderr = options.stderr;
  return error;
}

// ============================================================
// parseAppleScriptError Tests
// ============================================================

describe('parseAppleScriptError', () => {
  it('returns null for empty string', () => {
    expect(parseAppleScriptError('')).toBe(null);
  });

  it('parses execution error with code', () => {
    const stderr = 'execution error: The variable x is not defined. (-2753)';
    expect(parseAppleScriptError(stderr)).toBe('The variable x is not defined.');
  });

  it('parses syntax error', () => {
    const stderr = 'syntax error: Expected end of line but found identifier.';
    expect(parseAppleScriptError(stderr)).toBe(
      'Expected end of line but found identifier.'
    );
  });

  it('parses prefixed execution error', () => {
    // The third pattern captures the prefix and the error message
    // Pattern: /(.+): execution error: (.+)$/m matches the first group as prefix
    const stderr = '45:78: execution error: Application is not running. (-600)';
    // First capture group is "45:78", second is "Application is not running. (-600)"
    // Function returns match[1] ?? match[2], so it returns "45:78"
    // But the first pattern matches first: execution error: (.+) \(-?\d+\)$
    // So it extracts "Application is not running."
    expect(parseAppleScriptError(stderr)).toBe('Application is not running.');
  });

  it('returns trimmed stderr for unknown patterns', () => {
    const stderr = '  Some unknown error format  ';
    expect(parseAppleScriptError(stderr)).toBe('Some unknown error format');
  });
});

// ============================================================
// clampTimeout Tests
// ============================================================

describe('clampTimeout', () => {
  it('returns value within range unchanged', () => {
    expect(clampTimeout(5000)).toBe(5000);
    expect(clampTimeout(DEFAULT_TIMEOUT)).toBe(DEFAULT_TIMEOUT);
  });

  it('clamps values below minimum', () => {
    expect(clampTimeout(100)).toBe(MIN_TIMEOUT);
    expect(clampTimeout(0)).toBe(MIN_TIMEOUT);
    expect(clampTimeout(-1000)).toBe(MIN_TIMEOUT);
  });

  it('clamps values above maximum', () => {
    expect(clampTimeout(999999)).toBe(MAX_TIMEOUT);
    expect(clampTimeout(MAX_TIMEOUT + 1)).toBe(MAX_TIMEOUT);
  });
});

// ============================================================
// isExecError Tests
// ============================================================

describe('isExecError', () => {
  it('returns true for Error instances', () => {
    expect(isExecError(new Error('test'))).toBe(true);
  });

  it('returns true for Error with exec properties', () => {
    const error = createExecError('test', { code: 1, killed: false });
    expect(isExecError(error)).toBe(true);
  });

  it('returns false for non-Error values', () => {
    expect(isExecError(null)).toBe(false);
    expect(isExecError(undefined)).toBe(false);
    expect(isExecError('string')).toBe(false);
    expect(isExecError({ message: 'error' })).toBe(false);
  });
});

// ============================================================
// executeAppleScript Tests
// ============================================================

describe('executeAppleScript', () => {
  it('returns success with stdout on successful execution', async () => {
    const runner = createMockRunner({
      'osascript -e return 1': { stdout: '1\n', stderr: '' },
    });

    const result = await executeAppleScript('return 1', DEFAULT_TIMEOUT, runner);

    expect(result.success).toBe(true);
    expect(result.data?.stdout).toBe('1');
    expect(result.data?.stderr).toBe('');
    expect(result.data?.exitCode).toBe(0);
  });

  it('returns failure with parsed error on script error', async () => {
    const error = createExecError('Command failed', {
      stderr: 'execution error: The variable x is not defined. (-2753)',
      code: 1,
    });
    const runner = createMockRunner({
      osascript: error,
    });

    const result = await executeAppleScript('return x', DEFAULT_TIMEOUT, runner);

    expect(result.success).toBe(false);
    expect(result.error).toBe('The variable x is not defined.');
    expect(result.data?.exitCode).toBe(1);
  });

  it('returns timeout error when killed', async () => {
    const error = createExecError('Timeout', {
      killed: true,
      code: -1,
      stdout: 'partial',
      stderr: '',
    });
    const runner = createMockRunner({
      osascript: error,
    });

    const result = await executeAppleScript('delay 1000', 1000, runner);

    expect(result.success).toBe(false);
    expect(result.error).toContain('timed out');
    expect(result.data?.stdout).toBe('partial');
    expect(result.data?.exitCode).toBe(-1);
  });

  it('handles non-Error exceptions', async () => {
    const runner: CommandRunner = {
      async exec() {
        throw 'string error';
      },
    };

    const result = await executeAppleScript('return 1', DEFAULT_TIMEOUT, runner);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unknown error occurred');
  });

  it('uses default timeout when not specified', async () => {
    const runner = createMockRunner({
      osascript: { stdout: '1', stderr: '' },
    });

    const result = await executeAppleScript('return 1', undefined, runner);

    expect(result.success).toBe(true);
  });
});

// ============================================================
// executeAppleScriptFile Tests
// ============================================================

describe('executeAppleScriptFile', () => {
  it('returns success with stdout on successful execution', async () => {
    const runner = createMockRunner({
      'osascript /path/to/script.scpt': { stdout: 'result\n', stderr: '' },
    });

    const result = await executeAppleScriptFile(
      '/path/to/script.scpt',
      DEFAULT_TIMEOUT,
      runner
    );

    expect(result.success).toBe(true);
    expect(result.data?.stdout).toBe('result');
  });

  it('returns failure on script error', async () => {
    const error = createExecError('Script error', {
      stderr: 'syntax error: Expected end',
      code: 1,
    });
    const runner = createMockRunner({
      osascript: error,
    });

    const result = await executeAppleScriptFile('/bad/script.scpt', DEFAULT_TIMEOUT, runner);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Expected end');
  });
});

// ============================================================
// getSdef Tests
// ============================================================

describe('getSdef', () => {
  it('returns SDEF content on success', async () => {
    const sdefContent = '<?xml version="1.0"?><dictionary></dictionary>';
    const runner = createMockRunner({
      'sdef /Applications/Music.app': { stdout: sdefContent, stderr: '' },
    });

    const result = await getSdef('/Applications/Music.app', runner);

    expect(result.success).toBe(true);
    expect(result.data).toBe(sdefContent);
  });

  it('returns error when stderr only', async () => {
    const runner = createMockRunner({
      sdef: { stdout: '', stderr: 'sdef: error reading' },
    });

    const result = await getSdef('/Applications/NoSdef.app', runner);

    expect(result.success).toBe(false);
    expect(result.error).toBe('sdef: error reading');
  });

  it('returns error on exception', async () => {
    const error = createExecError('Command failed', {
      stderr: 'No sdef for this app',
    });
    const runner = createMockRunner({
      sdef: error,
    });

    const result = await getSdef('/Applications/NoSdef.app', runner);

    expect(result.success).toBe(false);
    expect(result.error).toBe('No sdef for this app');
  });
});

// ============================================================
// findAppPath Tests
// ============================================================

describe('findAppPath', () => {
  it('finds app in /Applications', async () => {
    const runner = createMockRunner({
      'test -d /Applications/Music.app': { stdout: '', stderr: '' },
    });

    const result = await findAppPath('Music', runner);

    expect(result).toBe('/Applications/Music.app');
  });

  it('finds app in /System/Applications', async () => {
    const runner = createMockRunner({
      'test -d /System/Applications/Notes.app': { stdout: '', stderr: '' },
    });
    // Make /Applications fail
    (runner as { exec: (c: string, a: string[]) => Promise<{ stdout: string; stderr: string }> }).exec = async (
      command,
      args
    ) => {
      const key = `${command} ${args.join(' ')}`;
      if (key === 'test -d /System/Applications/Notes.app') {
        return { stdout: '', stderr: '' };
      }
      throw new Error('Not found');
    };

    const result = await findAppPath('Notes', runner);

    expect(result).toBe('/System/Applications/Notes.app');
  });

  it('returns null when app not found', async () => {
    const runner: CommandRunner = {
      async exec() {
        throw new Error('Not found');
      },
    };

    const result = await findAppPath('NonexistentApp', runner);

    expect(result).toBe(null);
  });

  it('handles .app suffix correctly', async () => {
    const runner = createMockRunner({
      'test -d /Applications/Safari.app': { stdout: '', stderr: '' },
    });

    const result = await findAppPath('Safari.app', runner);

    expect(result).toBe('/Applications/Safari.app');
  });

  it('uses mdfind as fallback', async () => {
    let mdfindCalled = false;
    const runner: CommandRunner = {
      async exec(command, args) {
        if (command === 'mdfind') {
          mdfindCalled = true;
          return { stdout: '/Custom/Path/CustomApp.app\n', stderr: '' };
        }
        throw new Error('Not found');
      },
    };

    const result = await findAppPath('CustomApp', runner);

    expect(mdfindCalled).toBe(true);
    expect(result).toBe('/Custom/Path/CustomApp.app');
  });

  it('does case-insensitive search with ls', async () => {
    let lsCalled = false;
    const runner: CommandRunner = {
      async exec(command, args) {
        if (command === 'ls' && args[0] === '/Applications') {
          lsCalled = true;
          return { stdout: 'Safari.app\nMUSIC.APP\nFinder.app', stderr: '' };
        }
        throw new Error('Not found');
      },
    };

    const result = await findAppPath('music', runner);

    expect(lsCalled).toBe(true);
    expect(result).toBe('/Applications/MUSIC.APP');
  });
});

// ============================================================
// isScriptable Tests
// ============================================================

describe('isScriptable', () => {
  it('returns true when SDEF is available', async () => {
    const runner = createMockRunner({
      sdef: { stdout: '<dictionary></dictionary>', stderr: '' },
    });

    const result = await isScriptable('/Applications/Music.app', runner);

    expect(result).toBe(true);
  });

  it('returns false when SDEF retrieval fails', async () => {
    const runner = createMockRunner({
      sdef: new Error('No sdef'),
    });

    const result = await isScriptable('/Applications/NoSdef.app', runner);

    expect(result).toBe(false);
  });

  it('returns false when SDEF is empty', async () => {
    const runner = createMockRunner({
      sdef: { stdout: '', stderr: '' },
    });

    const result = await isScriptable('/Applications/Empty.app', runner);

    expect(result).toBe(false);
  });
});
