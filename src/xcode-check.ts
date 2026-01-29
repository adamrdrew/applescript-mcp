/**
 * Xcode installation check for AppleScript MCP Server.
 *
 * Verifies that Xcode is installed, which is required for the `sdef` command
 * used to retrieve application scripting dictionaries.
 */

import { existsSync } from 'node:fs';

/**
 * Standard path where Xcode is installed on macOS.
 */
const XCODE_PATH = '/Applications/Xcode.app';

/**
 * Mac App Store link for Xcode installation.
 */
const XCODE_APP_STORE_URL = 'https://apps.apple.com/us/app/xcode/id497799835?mt=12';

/**
 * Result of the Xcode installation check.
 */
export interface XcodeCheckResult {
  installed: boolean;
}

/**
 * Check if Xcode is installed on the system.
 *
 * Verifies the presence of Xcode at the standard installation path.
 * The `sdef` command, required for dictionary retrieval, depends on Xcode.
 *
 * @param pathChecker - Optional function to check path existence (for testing)
 * @returns Object indicating whether Xcode is installed
 */
export function checkXcodeInstalled(
  pathChecker: (path: string) => boolean = existsSync
): XcodeCheckResult {
  const installed = pathChecker(XCODE_PATH);
  return { installed };
}

/**
 * Format an error message for when Xcode is not installed.
 *
 * Provides a clear, actionable message with:
 * - Statement that Xcode is required
 * - Why it is needed (for dictionary retrieval via sdef)
 * - Link to install from Mac App Store
 *
 * @returns Formatted error message string
 */
export function formatXcodeMissingError(): string {
  return `Xcode is required but not installed.

The AppleScript MCP Server uses the 'sdef' command to retrieve application
scripting dictionaries. This command is only available when Xcode is installed.

To install Xcode:
  ${XCODE_APP_STORE_URL}

After installation, you may need to run:
  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`;
}
