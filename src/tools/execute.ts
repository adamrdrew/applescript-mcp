import type { ExecuteResponse, ToolResponse } from '../types.js';
import { executeAppleScript as runScript } from '../apple/executor.js';

const DEFAULT_TIMEOUT = 30000;
const MIN_TIMEOUT = 1000;
const MAX_TIMEOUT = 300000;

/**
 * Safety analysis result
 */
export interface SafetyAnalysis {
  safe: boolean;
  risk: 'none' | 'low' | 'medium' | 'high' | 'critical';
  warnings: string[];
  requiresConfirmation: boolean;
}

/**
 * Extended execute response with safety info
 */
export interface ExecuteResult extends ExecuteResponse {
  safetyAnalysis?: SafetyAnalysis;
}

/**
 * Patterns that indicate potentially destructive operations
 */
const DANGEROUS_PATTERNS: Array<{
  pattern: RegExp;
  risk: SafetyAnalysis['risk'];
  warning: string;
}> = [
  // File deletion
  {
    pattern: /\bdelete\s+(every|all)\s+(file|folder|item|document)/i,
    risk: 'critical',
    warning: 'BULK DELETE: This will delete multiple files/folders. This action may be irreversible.',
  },
  {
    pattern: /\bdelete\s+(file|folder|item|document)/i,
    risk: 'high',
    warning: 'DELETE: This will delete a file or folder. Items go to Trash but verify before running.',
  },
  {
    pattern: /\bempty\s+(the\s+)?trash/i,
    risk: 'critical',
    warning: 'EMPTY TRASH: This permanently deletes all items in Trash. This cannot be undone.',
  },
  // File moving/overwriting
  {
    pattern: /\bmove\s+(every|all)\s+(file|folder|item)/i,
    risk: 'high',
    warning: 'BULK MOVE: This will move multiple files/folders. Verify the destination.',
  },
  {
    pattern: /\bduplicate\s+(every|all)\s+(file|folder|item)/i,
    risk: 'medium',
    warning: 'BULK DUPLICATE: This will create copies of multiple items. May use significant disk space.',
  },
  // System modifications
  {
    pattern: /\b(shutdown|restart|sleep)\b/i,
    risk: 'high',
    warning: 'SYSTEM POWER: This will shutdown, restart, or sleep your Mac.',
  },
  {
    pattern: /\bdo\s+shell\s+script\b/i,
    risk: 'high',
    warning: 'SHELL COMMAND: This executes a shell command. Review carefully for dangerous operations like rm, sudo, etc.',
  },
  {
    pattern: /\bdo\s+shell\s+script\s+"[^"]*\b(rm|sudo|chmod|chown|mkfs|dd|format)\b/i,
    risk: 'critical',
    warning: 'DANGEROUS SHELL COMMAND: Contains potentially destructive shell commands (rm, sudo, etc.).',
  },
  // Keystroke injection
  {
    pattern: /\bkeystroke\b/i,
    risk: 'medium',
    warning: 'KEYSTROKE: This simulates keyboard input. Ensure the target app is correct.',
  },
  {
    pattern: /\bkey\s+code\b/i,
    risk: 'medium',
    warning: 'KEY CODE: This simulates key presses. Verify target application focus.',
  },
  // Email operations
  {
    pattern: /\bsend\s+(every|all)\s+(message|mail|email)/i,
    risk: 'critical',
    warning: 'BULK EMAIL: This will send multiple emails. Verify recipients and content.',
  },
  {
    pattern: /\bsend\b.*\boutgoing\s+message\b/i,
    risk: 'medium',
    warning: 'SEND EMAIL: This will send an email. Verify recipient and content.',
  },
  // Calendar/Reminders bulk ops
  {
    pattern: /\bdelete\s+(every|all)\s+(event|reminder|calendar)/i,
    risk: 'critical',
    warning: 'BULK DELETE CALENDAR: This will delete multiple calendar events or reminders.',
  },
  // Notes/Contacts bulk ops
  {
    pattern: /\bdelete\s+(every|all)\s+(note|contact)/i,
    risk: 'critical',
    warning: 'BULK DELETE: This will delete multiple notes or contacts.',
  },
  // Process termination
  {
    pattern: /\bquit\s+(every|all)\s+application/i,
    risk: 'high',
    warning: 'QUIT ALL APPS: This will quit multiple applications. Unsaved work may be lost.',
  },
];

/**
 * Analyze a script for safety concerns
 */
export function analyzeScriptSafety(script: string): SafetyAnalysis {
  const warnings: string[] = [];
  let maxRisk: SafetyAnalysis['risk'] = 'none';

  const riskOrder: SafetyAnalysis['risk'][] = ['none', 'low', 'medium', 'high', 'critical'];

  for (const { pattern, risk, warning } of DANGEROUS_PATTERNS) {
    if (pattern.test(script)) {
      warnings.push(warning);
      if (riskOrder.indexOf(risk) > riskOrder.indexOf(maxRisk)) {
        maxRisk = risk;
      }
    }
  }

  return {
    safe: maxRisk === 'none' || maxRisk === 'low',
    risk: maxRisk,
    warnings,
    requiresConfirmation: maxRisk === 'high' || maxRisk === 'critical',
  };
}

/**
 * Execute an AppleScript script
 */
export async function executeAppleScript(
  script: string,
  timeout: number = DEFAULT_TIMEOUT,
  options?: { skipSafetyCheck?: boolean | undefined; confirmedDangerous?: boolean | undefined }
): Promise<ToolResponse<ExecuteResult>> {
  // Validate script
  if (!script || typeof script !== 'string') {
    return {
      success: false,
      error: 'Script parameter is required and must be a string',
    };
  }

  if (script.trim().length === 0) {
    return {
      success: false,
      error: 'Script cannot be empty',
    };
  }

  // Safety analysis
  const safetyAnalysis = analyzeScriptSafety(script);

  // Block critical operations unless explicitly confirmed
  if (safetyAnalysis.risk === 'critical' && !options?.confirmedDangerous) {
    return {
      success: false,
      error: `🛑 BLOCKED: This script contains critical-risk operations:\n\n${safetyAnalysis.warnings.map((w) => `• ${w}`).join('\n')}\n\nIf you really want to run this, set confirmedDangerous: true`,
      data: {
        stdout: '',
        stderr: '',
        exitCode: -1,
        safetyAnalysis,
      },
    };
  }

  // Warn about high-risk operations
  if (safetyAnalysis.risk === 'high' && !options?.confirmedDangerous && !options?.skipSafetyCheck) {
    return {
      success: false,
      error: `⚠️ WARNING: This script contains high-risk operations:\n\n${safetyAnalysis.warnings.map((w) => `• ${w}`).join('\n')}\n\nTo proceed, set confirmedDangerous: true`,
      data: {
        stdout: '',
        stderr: '',
        exitCode: -1,
        safetyAnalysis,
      },
    };
  }

  // Validate and normalize timeout
  const effectiveTimeout = Math.min(Math.max(timeout, MIN_TIMEOUT), MAX_TIMEOUT);

  // Execute the script
  const result = await runScript(script, effectiveTimeout);

  // Enhance error messages for common issues
  if (!result.success && result.error) {
    result.error = enhanceErrorMessage(result.error, script);
  }

  // Add safety analysis to successful results too (for transparency)
  if (result.data) {
    (result.data as ExecuteResult).safetyAnalysis = safetyAnalysis;
  }

  return result as ToolResponse<ExecuteResult>;
}

/**
 * Execute AppleScript that targets a specific application
 */
export async function executeForApp(
  appName: string,
  script: string,
  timeout: number = DEFAULT_TIMEOUT,
  options?: { skipSafetyCheck?: boolean | undefined; confirmedDangerous?: boolean | undefined }
): Promise<ToolResponse<ExecuteResult>> {
  const wrappedScript = `tell application "${appName}"
${indentScript(script)}
end tell`;

  return executeAppleScript(wrappedScript, timeout, options);
}

/**
 * Indent a script for use inside a tell block
 */
function indentScript(script: string): string {
  return script
    .split('\n')
    .map((line) => `\t${line}`)
    .join('\n');
}

/**
 * Enhance error messages with helpful context and fixes
 */
function enhanceErrorMessage(error: string, script: string): string {
  const lowerError = error.toLowerCase();

  // Application not running
  if (lowerError.includes('not running') || lowerError.includes("application isn't running")) {
    const appMatch = script.match(/tell\s+application\s+"([^"]+)"/i);
    const appName = appMatch?.[1] ?? 'The target application';
    return `❌ ${appName} is not running.

HOW TO FIX:
1. Launch ${appName} manually, OR
2. Add 'activate' before your command:
   tell application "${appName}"
     activate
     -- your commands here
   end tell`;
  }

  // Permission denied - Automation
  if (lowerError.includes('not allowed') || (lowerError.includes('permission') && !lowerError.includes('-5000'))) {
    const appMatch = script.match(/tell\s+application\s+"([^"]+)"/i);
    const appName = appMatch?.[1] ?? 'the target app';
    return `❌ Automation permission denied for ${appName}.

HOW TO FIX:
1. Open System Settings
2. Go to Privacy & Security → Automation
3. Find your terminal app (Terminal, iTerm, etc.)
4. Enable the toggle for "${appName}"
5. You may need to restart your terminal

Original error: ${error}`;
  }

  // Permission denied - File access
  if (lowerError.includes('-5000') || (lowerError.includes('permission') && lowerError.includes('operation'))) {
    return `❌ File access permission denied.

HOW TO FIX:
1. Open System Settings
2. Go to Privacy & Security → Files and Folders (or Full Disk Access)
3. Enable access for your terminal app
4. You may need to restart your terminal

For Trash access specifically, you may need Full Disk Access.

Original error: ${error}`;
  }

  // Accessibility permissions
  if (lowerError.includes('accessibility') || lowerError.includes('keystroke') || lowerError.includes('key code')) {
    return `❌ Accessibility permission required.

HOW TO FIX:
1. Open System Settings
2. Go to Privacy & Security → Accessibility
3. Click the + button and add your terminal app
4. Enable the toggle next to it
5. Restart your terminal

Original error: ${error}`;
  }

  // Syntax error
  if (lowerError.includes('syntax error')) {
    return `❌ AppleScript syntax error.

COMMON FIXES:
• Check for missing "end tell", "end if", or "end repeat"
• Verify quotation marks are balanced (use \\" inside strings)
• Make sure property/command names are spelled correctly
• Use 'get_app_dictionary' to check available commands

Original error: ${error}`;
  }

  // Application doesn't understand
  if (lowerError.includes("doesn't understand")) {
    const cmdMatch = error.match(/doesn't understand the "?([^"]+)"? message/i);
    const cmd = cmdMatch?.[1] ?? 'this command';
    return `❌ The application doesn't understand "${cmd}".

HOW TO FIX:
1. Use 'get_app_dictionary' to see available commands
2. Check if you're targeting the right application
3. Some commands require specific objects (e.g., "close" needs a window)

Original error: ${error}`;
  }

  // Can't get
  if (lowerError.includes("can't get")) {
    return `❌ AppleScript can't find the requested item.

COMMON CAUSES:
• The item doesn't exist (e.g., no current track if nothing is playing)
• Wrong property name (use 'get_app_dictionary' to check)
• The item is in a different container than expected

Original error: ${error}`;
  }

  // Timeout
  if (lowerError.includes('timed out')) {
    return `❌ Script execution timed out.

HOW TO FIX:
1. Increase the timeout parameter (current max: 300000ms)
2. Check if the application is frozen or unresponsive
3. Break complex operations into smaller scripts
4. Some operations (like large file copies) just take time`;
  }

  // User cancelled
  if (lowerError.includes('user canceled') || lowerError.includes('user cancelled')) {
    return `ℹ️ Operation cancelled by user (dialog dismissed or Escape pressed).`;
  }

  // Missing value
  if (lowerError.includes('missing value')) {
    return `❌ A required value was not provided or returned null.

COMMON CAUSES:
• Referencing a property that doesn't exist on this object
• The application returned no data for this request
• Optional parameters that need explicit values

Original error: ${error}`;
  }

  return `❌ ${error}`;
}

/**
 * Validate an AppleScript without executing it
 */
export async function validateScript(
  script: string
): Promise<ToolResponse<{ valid: boolean; errors: string[]; safetyAnalysis: SafetyAnalysis }>> {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execFileAsync = promisify(execFile);

  const safetyAnalysis = analyzeScriptSafety(script);

  try {
    await execFileAsync('osacompile', ['-e', script, '-o', '/dev/null'], {
      timeout: 10000,
    });

    return {
      success: true,
      data: {
        valid: true,
        errors: [],
        safetyAnalysis,
      },
    };
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr ?? '';
    const errors = stderr
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => line.trim());

    return {
      success: true,
      data: {
        valid: false,
        errors: errors.length > 0 ? errors : ['Unknown syntax error'],
        safetyAnalysis,
      },
    };
  }
}

/**
 * Build common AppleScript patterns
 */
export const ScriptBuilder = {
  tell(appName: string, commands: string | string[]): string {
    const cmdArray = Array.isArray(commands) ? commands : [commands];
    return `tell application "${appName}"
${cmdArray.map((cmd) => `\t${cmd}`).join('\n')}
end tell`;
  },

  activate(appName: string): string {
    return `tell application "${appName}" to activate`;
  },

  dialog(message: string, options?: { title?: string; buttons?: string[] }): string {
    let script = `display dialog "${escapeString(message)}"`;
    if (options?.title) {
      script += ` with title "${escapeString(options.title)}"`;
    }
    if (options?.buttons && options.buttons.length > 0) {
      script += ` buttons {${options.buttons.map((b) => `"${escapeString(b)}"`).join(', ')}}`;
    }
    return script;
  },

  notification(message: string, options?: { title?: string; subtitle?: string }): string {
    let script = `display notification "${escapeString(message)}"`;
    if (options?.title) {
      script += ` with title "${escapeString(options.title)}"`;
    }
    if (options?.subtitle) {
      script += ` subtitle "${escapeString(options.subtitle)}"`;
    }
    return script;
  },

  getFrontmostApp(): string {
    return `tell application "System Events" to get name of first process whose frontmost is true`;
  },

  listRunningApps(): string {
    return `tell application "System Events" to get name of every process whose background only is false`;
  },
};

function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}
