import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import type { ExecuteResponse, ToolResponse } from '../types.js';

const execFileAsync = promisify(execFile);

const DEFAULT_TIMEOUT = 30000;
const MAX_TIMEOUT = 300000;

/**
 * Execute an AppleScript script using osascript
 */
export async function executeAppleScript(
  script: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<ToolResponse<ExecuteResponse>> {
  const effectiveTimeout = Math.min(Math.max(timeout, 1000), MAX_TIMEOUT);

  try {
    const { stdout, stderr } = await execFileAsync('osascript', ['-e', script], {
      timeout: effectiveTimeout,
      maxBuffer: 10 * 1024 * 1024,
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
    if (isExecError(error)) {
      if (error.killed) {
        return {
          success: false,
          error: `Script execution timed out after ${effectiveTimeout}ms`,
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

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Execute an AppleScript file
 */
export async function executeAppleScriptFile(
  filePath: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<ToolResponse<ExecuteResponse>> {
  const effectiveTimeout = Math.min(Math.max(timeout, 1000), MAX_TIMEOUT);

  try {
    const { stdout, stderr } = await execFileAsync('osascript', [filePath], {
      timeout: effectiveTimeout,
      maxBuffer: 10 * 1024 * 1024,
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
    if (isExecError(error)) {
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

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get the sdef (scripting definition) for an application
 */
export async function getSdef(appPath: string): Promise<ToolResponse<string>> {
  try {
    const { stdout, stderr } = await execFileAsync('sdef', [appPath], {
      timeout: 30000,
      maxBuffer: 50 * 1024 * 1024,
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

/**
 * Find the path to an application by name
 */
export async function findAppPath(appName: string): Promise<string | null> {
  const normalizedName = appName.endsWith('.app') ? appName : `${appName}.app`;

  const searchPaths = [
    '/Applications',
    '/System/Applications',
    '/System/Applications/Utilities',
    `${process.env['HOME']}/Applications`,
    '/Applications/Utilities',
  ];

  for (const basePath of searchPaths) {
    const fullPath = `${basePath}/${normalizedName}`;
    try {
      const { stdout } = await execFileAsync('test', ['-d', fullPath]);
      return fullPath;
    } catch {
      // App not found at this path, continue searching
    }
  }

  // Try mdfind as a fallback for apps in non-standard locations
  try {
    const { stdout } = await execFileAsync('mdfind', [
      `kMDItemKind == 'Application' && kMDItemDisplayName == '${appName}'`,
    ]);
    const paths = stdout.trim().split('\n').filter(Boolean);
    if (paths.length > 0 && paths[0]) {
      return paths[0];
    }
  } catch {
    // mdfind failed, ignore
  }

  // Last resort: try direct path construction
  for (const basePath of searchPaths) {
    try {
      const { stdout } = await execFileAsync('ls', [basePath]);
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
export async function isScriptable(appPath: string): Promise<boolean> {
  const sdefResult = await getSdef(appPath);
  return sdefResult.success && Boolean(sdefResult.data);
}

/**
 * Parse AppleScript error messages into more readable format
 */
function parseAppleScriptError(stderr: string): string | null {
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

interface ExecError extends Error {
  killed?: boolean;
  code?: number;
  stdout?: Buffer | string;
  stderr?: Buffer | string;
}

function isExecError(error: unknown): error is ExecError {
  return error instanceof Error;
}
