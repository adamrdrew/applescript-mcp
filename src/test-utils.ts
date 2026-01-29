/**
 * Test utilities for common mocking patterns
 *
 * This module provides injectable dependencies and mock factories
 * to enable isolated unit testing without external system calls.
 */

import type { ToolResponse, ExecuteResponse } from './types.js';

/**
 * Interface for file system operations (injectable)
 */
export interface FileSystemOperations {
  readFile(path: string, encoding: 'utf-8'): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  existsSync(path: string): boolean;
  readdir(path: string): Promise<string[]>;
  access(path: string): Promise<void>;
}

/**
 * Interface for command execution (injectable)
 */
export interface CommandExecutor {
  execFile(
    command: string,
    args: string[],
    options?: {
      timeout?: number;
      maxBuffer?: number;
      encoding?: BufferEncoding;
    }
  ): Promise<{ stdout: string; stderr: string }>;
}

/**
 * Creates a mock file system with in-memory storage
 */
export function createMockFileSystem(
  initialFiles: Record<string, string> = {}
): FileSystemOperations {
  const files = new Map<string, string>(Object.entries(initialFiles));
  const directories = new Set<string>();

  return {
    async readFile(path: string): Promise<string> {
      const content = files.get(path);
      if (content === undefined) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }
      return content;
    },

    async writeFile(path: string, content: string): Promise<void> {
      files.set(path, content);
    },

    async mkdir(path: string): Promise<void> {
      directories.add(path);
    },

    existsSync(path: string): boolean {
      return files.has(path) || directories.has(path);
    },

    async readdir(path: string): Promise<string[]> {
      const entries: string[] = [];
      for (const filePath of files.keys()) {
        if (filePath.startsWith(path + '/')) {
          const relativePath = filePath.slice(path.length + 1);
          const firstPart = relativePath.split('/')[0];
          if (firstPart && !entries.includes(firstPart)) {
            entries.push(firstPart);
          }
        }
      }
      return entries;
    },

    async access(path: string): Promise<void> {
      if (!files.has(path) && !directories.has(path)) {
        throw new Error(`ENOENT: no such file or directory, access '${path}'`);
      }
    },
  };
}

/**
 * Creates a mock command executor
 */
export function createMockCommandExecutor(
  responses: Record<string, { stdout: string; stderr: string } | Error>
): CommandExecutor {
  return {
    async execFile(
      command: string,
      args: string[]
    ): Promise<{ stdout: string; stderr: string }> {
      const key = `${command} ${args.join(' ')}`;

      // Check for exact match first
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
      throw new Error(`Command not mocked: ${key}`);
    },
  };
}

/**
 * Creates a successful ToolResponse
 */
export function successResponse<T>(data: T): ToolResponse<T> {
  return { success: true, data };
}

/**
 * Creates a failed ToolResponse without data
 */
export function errorResponse(error: string): ToolResponse<never> {
  return { success: false, error };
}

/**
 * Creates a failed ToolResponse with data
 */
export function errorResponseWithData<T>(error: string, data: T): ToolResponse<T> {
  return { success: false, error, data };
}

/**
 * Creates a mock ExecuteResponse
 */
export function mockExecuteResponse(
  stdout: string,
  stderr = '',
  exitCode = 0
): ExecuteResponse {
  return { stdout, stderr, exitCode };
}

/**
 * Exec error type for testing
 */
export interface ExecError extends Error {
  code?: number | undefined;
  killed?: boolean | undefined;
  stdout: string;
  stderr: string;
}

/**
 * Creates an exec error for testing error handling
 */
export function createExecError(
  message: string,
  options: {
    code?: number;
    killed?: boolean;
    stdout?: string;
    stderr?: string;
  } = {}
): ExecError {
  const error = new Error(message) as ExecError;
  if (options.code !== undefined) {
    error.code = options.code;
  }
  if (options.killed !== undefined) {
    error.killed = options.killed;
  }
  error.stdout = options.stdout ?? '';
  error.stderr = options.stderr ?? '';
  return error;
}

/**
 * Waits for a specified duration (for async testing)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Asserts that a function throws an error
 */
export async function expectThrows(
  fn: () => Promise<unknown>,
  expectedMessage?: string | RegExp
): Promise<Error> {
  try {
    await fn();
    throw new Error('Expected function to throw');
  } catch (error) {
    if (error instanceof Error && error.message === 'Expected function to throw') {
      throw error;
    }
    if (expectedMessage) {
      const message = error instanceof Error ? error.message : String(error);
      if (typeof expectedMessage === 'string') {
        if (!message.includes(expectedMessage)) {
          throw new Error(
            `Expected error message to include "${expectedMessage}", got "${message}"`
          );
        }
      } else if (!expectedMessage.test(message)) {
        throw new Error(
          `Expected error message to match ${expectedMessage}, got "${message}"`
        );
      }
    }
    return error instanceof Error ? error : new Error(String(error));
  }
}
