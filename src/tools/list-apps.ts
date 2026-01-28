import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, access, constants } from 'node:fs/promises';
import { join } from 'node:path';
import type { ListAppsResponse, ToolResponse } from '../types.js';

const execFileAsync = promisify(execFile);

/**
 * Known application directories on macOS
 */
const APP_DIRECTORIES = [
  '/Applications',
  '/System/Applications',
  '/System/Applications/Utilities',
  '/Applications/Utilities',
];

/**
 * Apps known to support AppleScript (for faster detection)
 */
const KNOWN_SCRIPTABLE_APPS = new Set([
  'Finder',
  'System Events',
  'Mail',
  'Safari',
  'Calendar',
  'Contacts',
  'Notes',
  'Reminders',
  'Photos',
  'Music',
  'TV',
  'Podcasts',
  'Books',
  'Preview',
  'TextEdit',
  'Terminal',
  'Script Editor',
  'Automator',
  'Keynote',
  'Numbers',
  'Pages',
  'Xcode',
  'Messages',
  'FaceTime',
  'Maps',
  'Shortcuts',
  'Voice Memos',
  'Stocks',
  'Home',
  'News',
  'App Store',
  'System Preferences',
  'System Settings',
  'Font Book',
  'Archive Utility',
  'Image Capture',
  'Digital Color Meter',
  'Disk Utility',
  'Activity Monitor',
  'Console',
  'Keychain Access',
  'Screenshot',
  'QuickTime Player',
]);

/**
 * List all scriptable applications on the system
 */
export async function listScriptableApps(): Promise<ToolResponse<ListAppsResponse>> {
  try {
    const scriptableApps = new Set<string>();

    // Add user's home Applications folder if it exists
    const homeApps = process.env['HOME']
      ? join(process.env['HOME'], 'Applications')
      : null;
    const directories = homeApps
      ? [...APP_DIRECTORIES, homeApps]
      : APP_DIRECTORIES;

    // Scan each directory for .app bundles
    const scanPromises = directories.map(async (dir) => {
      try {
        await access(dir, constants.R_OK);
        const entries = await readdir(dir);
        return entries
          .filter((entry) => entry.endsWith('.app'))
          .map((entry) => ({
            name: entry.replace(/\.app$/, ''),
            path: join(dir, entry),
          }));
      } catch {
        return [];
      }
    });

    const appLists = await Promise.all(scanPromises);
    const allApps = appLists.flat();

    // Check each app for scriptability
    const checkPromises = allApps.map(async ({ name, path }) => {
      // Quick check: if it's a known scriptable app, add it
      if (KNOWN_SCRIPTABLE_APPS.has(name)) {
        return name;
      }

      // Check for sdef support
      const isScriptable = await checkScriptable(path);
      return isScriptable ? name : null;
    });

    const results = await Promise.all(checkPromises);

    for (const name of results) {
      if (name) {
        scriptableApps.add(name);
      }
    }

    // Sort alphabetically
    const sortedApps = Array.from(scriptableApps).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );

    return {
      success: true,
      data: {
        apps: sortedApps,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list applications',
    };
  }
}

/**
 * Check if an application is scriptable by attempting to get its sdef
 */
async function checkScriptable(appPath: string): Promise<boolean> {
  try {
    // Try to get the sdef - if it works, the app is scriptable
    const { stdout } = await execFileAsync('sdef', [appPath], {
      timeout: 5000,
      maxBuffer: 1024 * 1024,
    });

    // Check if we got meaningful XML back
    return stdout.includes('<dictionary') || stdout.includes('<suite');
  } catch {
    return false;
  }
}

/**
 * Get detailed information about scriptable apps including their paths
 */
export async function listScriptableAppsWithPaths(): Promise<
  ToolResponse<{ apps: Array<{ name: string; path: string }> }>
> {
  try {
    const scriptableApps: Array<{ name: string; path: string }> = [];

    const homeApps = process.env['HOME']
      ? join(process.env['HOME'], 'Applications')
      : null;
    const directories = homeApps
      ? [...APP_DIRECTORIES, homeApps]
      : APP_DIRECTORIES;

    const scanPromises = directories.map(async (dir) => {
      try {
        await access(dir, constants.R_OK);
        const entries = await readdir(dir);
        return entries
          .filter((entry) => entry.endsWith('.app'))
          .map((entry) => ({
            name: entry.replace(/\.app$/, ''),
            path: join(dir, entry),
          }));
      } catch {
        return [];
      }
    });

    const appLists = await Promise.all(scanPromises);
    const allApps = appLists.flat();

    const checkPromises = allApps.map(async ({ name, path }) => {
      if (KNOWN_SCRIPTABLE_APPS.has(name)) {
        return { name, path };
      }

      const isScriptable = await checkScriptable(path);
      return isScriptable ? { name, path } : null;
    });

    const results = await Promise.all(checkPromises);

    for (const result of results) {
      if (result) {
        scriptableApps.push(result);
      }
    }

    scriptableApps.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );

    return {
      success: true,
      data: {
        apps: scriptableApps,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list applications',
    };
  }
}
