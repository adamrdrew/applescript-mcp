import { executeAppleScript as runScript } from '../apple/executor.js';
import type { ToolResponse } from '../types.js';

/**
 * Current system state information
 */
export interface SystemState {
  timestamp: string;
  frontmostApp: string;
  runningApps: string[];
  finderSelection: string[];
  clipboardText: string | null;
  currentVolume: number;
  musicPlaying: {
    isPlaying: boolean;
    track: string | null;
    artist: string | null;
    album: string | null;
  };
  safariTabs: Array<{ title: string; url: string }>;
}

/**
 * Get the current state of the system for context-aware automation
 */
export async function getSystemState(): Promise<ToolResponse<SystemState>> {
  try {
    const state: SystemState = {
      timestamp: new Date().toISOString(),
      frontmostApp: '',
      runningApps: [],
      finderSelection: [],
      clipboardText: null,
      currentVolume: 0,
      musicPlaying: { isPlaying: false, track: null, artist: null, album: null },
      safariTabs: [],
    };

    // Get all info in parallel for speed
    const [
      frontmostResult,
      runningAppsResult,
      finderSelectionResult,
      clipboardResult,
      volumeResult,
      musicResult,
      safariResult,
    ] = await Promise.all([
      runScript('tell application "System Events" to get name of first process whose frontmost is true'),
      runScript('tell application "System Events" to get name of every process whose background only is false'),
      runScript('tell application "Finder" to get name of selection as list'),
      runScript('the clipboard as text'),
      runScript('output volume of (get volume settings)'),
      runScript(`
        tell application "Music"
          if player state is playing then
            set trackName to name of current track
            set artistName to artist of current track
            set albumName to album of current track
            return "playing|" & trackName & "|" & artistName & "|" & albumName
          else
            return "stopped"
          end if
        end tell
      `),
      runScript(`
        tell application "Safari"
          set tabInfo to ""
          repeat with w in windows
            repeat with t in tabs of w
              set tabInfo to tabInfo & name of t & "|||" & URL of t & ";;;"
            end repeat
          end repeat
          return tabInfo
        end tell
      `),
    ]);

    // Parse results
    if (frontmostResult.success && frontmostResult.data) {
      state.frontmostApp = frontmostResult.data.stdout.trim();
    }

    if (runningAppsResult.success && runningAppsResult.data) {
      state.runningApps = runningAppsResult.data.stdout
        .split(', ')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (finderSelectionResult.success && finderSelectionResult.data) {
      const sel = finderSelectionResult.data.stdout.trim();
      if (sel) {
        state.finderSelection = sel.split(', ').map((s) => s.trim());
      }
    }

    if (clipboardResult.success && clipboardResult.data) {
      const clip = clipboardResult.data.stdout;
      // Only include if it's reasonable text (not huge binary data)
      if (clip.length < 1000) {
        state.clipboardText = clip;
      } else {
        state.clipboardText = `[${clip.length} characters - truncated]`;
      }
    }

    if (volumeResult.success && volumeResult.data) {
      state.currentVolume = parseInt(volumeResult.data.stdout, 10) || 0;
    }

    if (musicResult.success && musicResult.data) {
      const musicData = musicResult.data.stdout.trim();
      if (musicData.startsWith('playing|')) {
        const parts = musicData.split('|');
        state.musicPlaying = {
          isPlaying: true,
          track: parts[1] ?? null,
          artist: parts[2] ?? null,
          album: parts[3] ?? null,
        };
      }
    }

    if (safariResult.success && safariResult.data) {
      const tabData = safariResult.data.stdout.trim();
      if (tabData) {
        state.safariTabs = tabData
          .split(';;;')
          .filter(Boolean)
          .map((t) => {
            const [title, url] = t.split('|||');
            return { title: title ?? '', url: url ?? '' };
          })
          .slice(0, 10); // Limit to 10 tabs
      }
    }

    return {
      success: true,
      data: state,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get system state',
    };
  }
}
