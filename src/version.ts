/**
 * Version reading utility for AppleScript MCP Server.
 *
 * Reads the version from package.json dynamically at runtime.
 * Uses import.meta.url to resolve the package.json path relative
 * to the module location, ensuring correct behavior regardless
 * of the current working directory.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Package.json structure (minimal, only what we need)
 */
interface PackageJson {
  version: string;
}

/**
 * Type guard for PackageJson
 */
function isPackageJson(value: unknown): value is PackageJson {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj['version'] === 'string';
}

/**
 * Default version returned when package.json cannot be read or parsed.
 */
const FALLBACK_VERSION = 'unknown';

/**
 * Read the version from package.json.
 *
 * @param fileReader - Optional file reader function for testing (defaults to readFileSync)
 * @returns The version string from package.json, or 'unknown' if reading fails
 */
export function getPackageVersion(
  fileReader: (path: string) => string = (path) => readFileSync(path, 'utf-8')
): string {
  try {
    // Resolve package.json relative to this module
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const packageJsonPath = join(currentDir, '..', 'package.json');

    const content = fileReader(packageJsonPath);
    const parsed: unknown = JSON.parse(content);

    if (!isPackageJson(parsed)) {
      return FALLBACK_VERSION;
    }

    return parsed.version;
  } catch {
    return FALLBACK_VERSION;
  }
}

/**
 * Format the startup banner with the given version.
 *
 * @param version - The version string to display
 * @returns The formatted banner string
 */
export function formatStartupBanner(version: string): string {
  return `🍎 Welcome to AppleScript MCP
Version ${version}

✅ Server now running...`;
}
