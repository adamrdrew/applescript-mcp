import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ExecuteResponse, ToolResponse } from '../types.js';

// ============================================================
// Constants
// ============================================================

export const DEFAULT_TIMEOUT = 30000;
export const MAX_TIMEOUT = 300000;
export const MIN_TIMEOUT = 1000;
export const MAX_BUFFER = 10 * 1024 * 1024; // 10MB
export const SDEF_MAX_BUFFER = 50 * 1024 * 1024; // 50MB

// ============================================================
// Types
// ============================================================

/**
 * Error type for exec operations
 */
export interface ExecError extends Error {
  killed?: boolean | undefined;
  code?: number | undefined;
  stdout?: Buffer | string | undefined;
  stderr?: Buffer | string | undefined;
}

/**
 * Type guard for ExecError
 */
export function isExecError(error: unknown): error is ExecError {
  return error instanceof Error;
}

/**
 * Interface for command execution (injectable for testing)
 */
export interface CommandRunner {
  exec(
    command: string,
    args: string[],
    options: { timeout: number; maxBuffer: number; encoding: BufferEncoding }
  ): Promise<{ stdout: string; stderr: string }>;
}

// ============================================================
// Default Command Runner
// ============================================================

const execFileAsync = promisify(execFile);

/**
 * Default command runner using Node's execFile
 */
export const defaultCommandRunner: CommandRunner = {
  async exec(command, args, options) {
    const { stdout, stderr } = await execFileAsync(command, args, options);
    return { stdout, stderr };
  },
};

// ============================================================
// Error Parsing
// ============================================================

/**
 * Parse AppleScript error messages into more readable format
 */
export function parseAppleScriptError(stderr: string): string | null {
  if (!stderr) return null;

  // Common error patterns
  const patterns = [
    /execution error: (.+) \(-?\d+\)$/m,
    /syntax error: (.+)$/m,
    /(.+): execution error: (.+)$/m,
  ];

  for (const pattern of patterns) {
    const match = stderr.match(pattern);
    if (match) {
      return match[1] ?? match[2] ?? null;
    }
  }

  return stderr.trim();
}

/**
 * Clamp timeout to valid range
 */
export function clampTimeout(timeout: number): number {
  return Math.min(Math.max(timeout, MIN_TIMEOUT), MAX_TIMEOUT);
}

// ============================================================
// Script Execution
// ============================================================

/**
 * Execute an AppleScript script using osascript
 */
export async function executeAppleScript(
  script: string,
  timeout: number = DEFAULT_TIMEOUT,
  runner: CommandRunner = defaultCommandRunner
): Promise<ToolResponse<ExecuteResponse>> {
  const effectiveTimeout = clampTimeout(timeout);

  try {
    const { stdout, stderr } = await runner.exec('osascript', ['-e', script], {
      timeout: effectiveTimeout,
      maxBuffer: MAX_BUFFER,
      encoding: 'utf8',
    });

    return {
      success: true,
      data: {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
      },
    };
  } catch (error) {
    return handleExecError(error, effectiveTimeout);
  }
}

/**
 * Execute an AppleScript file
 */
export async function executeAppleScriptFile(
  filePath: string,
  timeout: number = DEFAULT_TIMEOUT,
  runner: CommandRunner = defaultCommandRunner
): Promise<ToolResponse<ExecuteResponse>> {
  const effectiveTimeout = clampTimeout(timeout);

  try {
    const { stdout, stderr } = await runner.exec('osascript', [filePath], {
      timeout: effectiveTimeout,
      maxBuffer: MAX_BUFFER,
      encoding: 'utf8',
    });

    return {
      success: true,
      data: {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
      },
    };
  } catch (error) {
    return handleExecError(error, effectiveTimeout);
  }
}

/**
 * Handle execution errors uniformly
 */
function handleExecError(
  error: unknown,
  timeout: number
): ToolResponse<ExecuteResponse> {
  if (!isExecError(error)) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }

  if (error.killed) {
    return {
      success: false,
      error: `Script execution timed out after ${timeout}ms`,
      data: {
        stdout: error.stdout?.toString() ?? '',
        stderr: error.stderr?.toString() ?? '',
        exitCode: error.code ?? -1,
      },
    };
  }

  const stderr = error.stderr?.toString() ?? '';
  const errorMessage = parseAppleScriptError(stderr) ?? error.message;

  return {
    success: false,
    error: errorMessage,
    data: {
      stdout: error.stdout?.toString() ?? '',
      stderr,
      exitCode: error.code ?? 1,
    },
  };
}

// ============================================================
// SDEF Retrieval
// ============================================================

/**
 * Get the sdef (scripting definition) for an application
 */
export async function getSdef(
  appPath: string,
  runner: CommandRunner = defaultCommandRunner
): Promise<ToolResponse<string>> {
  try {
    const { stdout, stderr } = await runner.exec('sdef', [appPath], {
      timeout: DEFAULT_TIMEOUT,
      maxBuffer: SDEF_MAX_BUFFER,
      encoding: 'utf8',
    });

    if (stderr && !stdout) {
      return {
        success: false,
        error: stderr.trim(),
      };
    }

    return {
      success: true,
      data: stdout,
    };
  } catch (error) {
    if (isExecError(error)) {
      return {
        success: false,
        error: error.stderr?.toString().trim() ?? error.message,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get sdef',
    };
  }
}

// ============================================================
// Application Discovery
// ============================================================

/**
 * Standard search paths for applications
 */
export const APP_SEARCH_PATHS = [
  '/Applications',
  '/System/Applications',
  '/System/Applications/Utilities',
  `${process.env['HOME']}/Applications`,
  '/Applications/Utilities',
];

/**
 * Find the path to an application by name
 */
export async function findAppPath(
  appName: string,
  runner: CommandRunner = defaultCommandRunner
): Promise<string | null> {
  const normalizedName = appName.endsWith('.app') ? appName : `${appName}.app`;

  // Try direct path in standard locations
  for (const basePath of APP_SEARCH_PATHS) {
    const fullPath = `${basePath}/${normalizedName}`;
    try {
      await runner.exec('test', ['-d', fullPath], {
        timeout: 5000,
        maxBuffer: 1024,
        encoding: 'utf8',
      });
      return fullPath;
    } catch {
      // App not found at this path, continue searching
    }
  }

  // Try mdfind as a fallback for apps in non-standard locations
  try {
    const { stdout } = await runner.exec(
      'mdfind',
      [`kMDItemKind == 'Application' && kMDItemDisplayName == '${appName}'`],
      { timeout: 10000, maxBuffer: MAX_BUFFER, encoding: 'utf8' }
    );
    const paths = stdout.trim().split('\n').filter(Boolean);
    if (paths.length > 0 && paths[0]) {
      return paths[0];
    }
  } catch {
    // mdfind failed, ignore
  }

  // Last resort: case-insensitive search
  for (const basePath of APP_SEARCH_PATHS) {
    try {
      const { stdout } = await runner.exec('ls', [basePath], {
        timeout: 5000,
        maxBuffer: MAX_BUFFER,
        encoding: 'utf8',
      });
      const apps = stdout.split('\n');
      const match = apps.find(
        (app) => app.toLowerCase() === normalizedName.toLowerCase()
      );
      if (match) {
        return `${basePath}/${match}`;
      }
    } catch {
      // Ignore and continue
    }
  }

  return null;
}

/**
 * Check if an application supports AppleScript
 */
export async function isScriptable(
  appPath: string,
  runner: CommandRunner = defaultCommandRunner
): Promise<boolean> {
  const sdefResult = await getSdef(appPath, runner);
  return sdefResult.success && Boolean(sdefResult.data);
}
