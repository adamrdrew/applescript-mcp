/**
 * Failure Analyzer - Figure out WHY scripts fail and suggest fixes
 *
 * AppleScript errors are notoriously cryptic. This module:
 * 1. Parses error messages to understand the root cause
 * 2. Suggests specific fixes based on common patterns
 * 3. Learns from past failures to improve suggestions
 */

import { findSimilarPatterns, getPatternsForApp } from './pattern-store.js';

export interface FailureAnalysis {
  errorType: ErrorType;
  rootCause: string;
  suggestions: string[];
  relatedSuccessfulPattern: string | null;
  fixedScript: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export type ErrorType =
  | 'permission_denied'
  | 'app_not_running'
  | 'syntax_error'
  | 'object_not_found'
  | 'property_not_found'
  | 'command_not_understood'
  | 'timeout'
  | 'type_mismatch'
  | 'index_out_of_bounds'
  | 'missing_value'
  | 'user_cancelled'
  | 'unknown';

/**
 * Known error patterns with their causes and fixes
 */
const ERROR_PATTERNS: Array<{
  patterns: RegExp[];
  type: ErrorType;
  getCause: (match: RegExpMatchArray, script: string) => string;
  getSuggestions: (match: RegExpMatchArray, script: string) => string[];
  getFix?: (match: RegExpMatchArray, script: string) => string | null;
}> = [
  // Permission errors
  {
    patterns: [
      /not allowed/i,
      /permission/i,
      /access.*denied/i,
      /not authorized/i,
      /(-1743)/,
    ],
    type: 'permission_denied',
    getCause: (_, script) => {
      const app = extractAppFromScript(script);
      return `Automation permission denied for ${app || 'the target application'}.`;
    },
    getSuggestions: (_, script) => {
      const app = extractAppFromScript(script);
      return [
        'Open System Settings → Privacy & Security → Automation',
        `Enable permissions for your terminal/Claude to control ${app || 'the app'}`,
        'If using System Events, also check Accessibility permissions',
        'You may need to restart your terminal after changing permissions',
      ];
    },
  },

  // App not running
  {
    patterns: [
      /application isn't running/i,
      /not running/i,
      /connection.*invalid/i,
      /(-600)/,
    ],
    type: 'app_not_running',
    getCause: (_, script) => {
      const app = extractAppFromScript(script);
      return `${app || 'The application'} is not running.`;
    },
    getSuggestions: (_, script) => {
      const app = extractAppFromScript(script);
      return [
        `Launch ${app || 'the application'} before running this script`,
        'Add "activate" at the start of your tell block to launch the app',
        'Use "launch" instead of "activate" for background operations',
      ];
    },
    getFix: (_, script) => {
      // Add activate to the script
      const match = script.match(/(tell application "[^"]+")\s*\n/i);
      if (match) {
        return script.replace(match[0], `${match[1]}\n\tactivate\n`);
      }
      return null;
    },
  },

  // Object not found
  {
    patterns: [
      /can't get/i,
      /doesn't exist/i,
      /missing/i,
      /(-1728)/,
    ],
    type: 'object_not_found',
    getCause: (match) => {
      const objectMatch = match.input?.match(/can't get ([^.]+)/i);
      const object = objectMatch?.[1] || 'the requested object';
      return `${object} doesn't exist or couldn't be found.`;
    },
    getSuggestions: () => [
      'Check if the object exists before accessing it (use "exists" test)',
      'The collection might be empty - try checking "count of" first',
      'Use "first" instead of index 1 for more flexible access',
      'If referencing by name, ensure the name matches exactly',
    ],
  },

  // Command not understood
  {
    patterns: [
      /doesn't understand/i,
      /expected.*but found/i,
      /(-1708)/,
    ],
    type: 'command_not_understood',
    getCause: (match, script) => {
      const app = extractAppFromScript(script);
      const cmdMatch = match.input?.match(/doesn't understand the "?([^"]+)"? message/i);
      return `${app || 'The app'} doesn't have a "${cmdMatch?.[1] || 'that'}" command.`;
    },
    getSuggestions: (_, script) => {
      const app = extractAppFromScript(script);
      return [
        `Check the ${app || 'app'} dictionary for available commands`,
        'Some commands need to be inside a specific context (e.g., "tell window 1")',
        'The command might be named differently - check for similar commands',
        'Some operations need System Events instead of the app directly',
      ];
    },
  },

  // Syntax error
  {
    patterns: [
      /syntax error/i,
      /expected.*but found/i,
      /(-2740)/,
      /(-2741)/,
    ],
    type: 'syntax_error',
    getCause: (match) => {
      return `Syntax error: ${match.input?.substring(0, 100) || 'invalid AppleScript syntax'}`;
    },
    getSuggestions: () => [
      'Check for missing "end tell", "end if", or "end repeat"',
      'Verify quotation marks are balanced and properly escaped',
      'AppleScript uses & for concatenation, not +',
      'Make sure "of" clauses are in the right order (property of object of container)',
    ],
  },

  // Type mismatch
  {
    patterns: [
      /can't make.*into/i,
      /type mismatch/i,
      /(-1700)/,
    ],
    type: 'type_mismatch',
    getCause: (match) => {
      const convMatch = match.input?.match(/can't make ([^"]+) into type ([^.]+)/i);
      if (convMatch) {
        return `Can't convert ${convMatch[1]} to ${convMatch[2]}.`;
      }
      return 'Type conversion failed.';
    },
    getSuggestions: () => [
      'Use explicit coercion: "text" as string, number as integer',
      'Some objects need specific conversion: "x as list" or "x as text"',
      'Check if you\'re comparing compatible types',
    ],
  },

  // Index out of bounds
  {
    patterns: [
      /invalid index/i,
      /(-1719)/,
    ],
    type: 'index_out_of_bounds',
    getCause: () => 'The index is out of range - the collection is smaller than expected.',
    getSuggestions: () => [
      'Check "count of" before accessing by index',
      'Use "first", "last", or "every" instead of numeric indices',
      'Remember AppleScript uses 1-based indexing, not 0-based',
    ],
  },

  // Timeout
  {
    patterns: [
      /timed out/i,
      /(-1712)/,
    ],
    type: 'timeout',
    getCause: () => 'The operation took too long and timed out.',
    getSuggestions: () => [
      'Increase the timeout parameter',
      'The app might be busy or unresponsive - check its state',
      'Break complex operations into smaller steps',
      'Some dialogs block until user interaction - check for open dialogs',
    ],
  },

  // User cancelled
  {
    patterns: [
      /user cancel/i,
      /(-128)/,
    ],
    type: 'user_cancelled',
    getCause: () => 'The operation was cancelled by the user.',
    getSuggestions: () => [
      'This is usually expected - user dismissed a dialog or pressed Escape',
      'Add error handling: try...on error...end try',
    ],
  },
];

/**
 * Extract the app name from a script
 */
function extractAppFromScript(script: string): string | null {
  const match = script.match(/tell application "([^"]+)"/i);
  return match?.[1] || null;
}

/**
 * Analyze a script failure and provide actionable suggestions
 */
export async function analyzeFailure(
  script: string,
  errorMessage: string
): Promise<FailureAnalysis> {
  // Find matching error pattern
  for (const pattern of ERROR_PATTERNS) {
    for (const regex of pattern.patterns) {
      const match = errorMessage.match(regex);
      if (match) {
        // Found a match - build analysis
        const app = extractAppFromScript(script);

        // Try to find a successful pattern for this app
        let relatedSuccessfulPattern: string | null = null;
        if (app) {
          const patterns = await getPatternsForApp(app);
          const successful = patterns.find(p => p.success);
          if (successful) {
            relatedSuccessfulPattern = successful.script;
          }
        }

        return {
          errorType: pattern.type,
          rootCause: pattern.getCause(match, script),
          suggestions: pattern.getSuggestions(match, script),
          relatedSuccessfulPattern,
          fixedScript: pattern.getFix?.(match, script) || null,
          confidence: 'high',
        };
      }
    }
  }

  // Unknown error - try to provide generic help
  const app = extractAppFromScript(script);
  let relatedSuccessfulPattern: string | null = null;

  if (app) {
    const patterns = await getPatternsForApp(app);
    const successful = patterns.find(p => p.success);
    if (successful) {
      relatedSuccessfulPattern = successful.script;
    }
  }

  return {
    errorType: 'unknown',
    rootCause: `Unknown error: ${errorMessage}`,
    suggestions: [
      'Check the app dictionary for correct syntax',
      'Verify the app is running and accessible',
      'Try simplifying the script to isolate the issue',
      app ? `Look at successful patterns for ${app}` : 'Check for similar successful patterns',
    ],
    relatedSuccessfulPattern,
    fixedScript: null,
    confidence: 'low',
  };
}

/**
 * Music-specific error analysis
 * The Music app is particularly tricky, so we have dedicated analysis
 */
export function analyzeMusicFailure(
  script: string,
  errorMessage: string
): { issue: string; fix: string; correctedScript: string | null } | null {
  const lowerError = errorMessage.toLowerCase();
  const lowerScript = script.toLowerCase();

  // Common Music.app issues

  // Issue: Using "add" instead of "duplicate" for playlist tracks
  if (lowerError.includes("doesn't understand") && lowerScript.includes('add')) {
    return {
      issue: 'Music.app uses "duplicate" not "add" to add tracks to playlists',
      fix: 'Replace "add" with "duplicate...to"',
      correctedScript: script.replace(/add\s+(.+?)\s+to\s+playlist/gi, 'duplicate $1 to playlist'),
    };
  }

  // Issue: Creating playlist with tracks directly
  if (lowerError.includes("can't make") && lowerScript.includes('playlist')) {
    return {
      issue: 'You can\'t create a playlist with tracks in one step. Create the playlist first, then duplicate tracks to it.',
      fix: 'Split into: 1) make new playlist, 2) duplicate tracks to it',
      correctedScript: null, // Too complex to auto-fix
    };
  }

  // Issue: Searching in wrong context
  if (lowerError.includes("can't get") && lowerScript.includes('search')) {
    return {
      issue: 'Music.app search requires searching "entire library" or "library playlist 1"',
      fix: 'Use: search library playlist 1 for "term"',
      correctedScript: script.replace(
        /search\s+(?:for\s+)?"([^"]+)"/gi,
        'search library playlist 1 for "$1"'
      ),
    };
  }

  // Issue: Referencing "songs" instead of "tracks"
  if (lowerScript.includes('song') && !lowerScript.includes('track')) {
    return {
      issue: 'Music.app uses "tracks" not "songs" as the object type',
      fix: 'Replace "song" with "track"',
      correctedScript: script.replace(/\bsong\b/gi, 'track').replace(/\bsongs\b/gi, 'tracks'),
    };
  }

  // Issue: Player state checks
  if (lowerError.includes("can't get") && lowerScript.includes('current track')) {
    return {
      issue: 'There might not be a current track if nothing is playing',
      fix: 'Check player state first: if player state is playing then...',
      correctedScript: null,
    };
  }

  return null;
}

/**
 * Generate a smarter error message with context
 */
export async function generateSmartErrorMessage(
  script: string,
  rawError: string
): Promise<string> {
  // First check for Music-specific issues
  if (script.toLowerCase().includes('music')) {
    const musicAnalysis = analyzeMusicFailure(script, rawError);
    if (musicAnalysis) {
      let message = `🎵 **Music.app Issue**: ${musicAnalysis.issue}\n\n`;
      message += `**Fix**: ${musicAnalysis.fix}`;
      if (musicAnalysis.correctedScript) {
        message += `\n\n**Corrected Script**:\n\`\`\`applescript\n${musicAnalysis.correctedScript}\n\`\`\``;
      }
      return message;
    }
  }

  // General analysis
  const analysis = await analyzeFailure(script, rawError);

  let message = `❌ **${analysis.rootCause}**\n\n`;

  if (analysis.suggestions.length > 0) {
    message += '**How to fix:**\n';
    analysis.suggestions.forEach(s => {
      message += `• ${s}\n`;
    });
  }

  if (analysis.fixedScript) {
    message += `\n**Auto-corrected script:**\n\`\`\`applescript\n${analysis.fixedScript}\n\`\`\``;
  }

  if (analysis.relatedSuccessfulPattern) {
    message += `\n**Here's a similar script that worked:**\n\`\`\`applescript\n${analysis.relatedSuccessfulPattern}\n\`\`\``;
  }

  return message;
}
