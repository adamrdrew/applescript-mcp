# Safety System

## Overview

The safety system analyzes AppleScript code before execution to detect potentially dangerous operations. It is implemented in `src/tools/execute.ts`.

## Risk Levels

| Level | Behavior | User Action Required |
|-------|----------|---------------------|
| none | Execute normally | None |
| low | Execute normally | None |
| medium | Warning in response | None (informational) |
| high | Blocked | Set `confirmedDangerous: true` |
| critical | Blocked | Set `confirmedDangerous: true` |

## SafetyAnalysis Type

```typescript
interface SafetyAnalysis {
  safe: boolean;              // true if none or low risk
  risk: 'none' | 'low' | 'medium' | 'high' | 'critical';
  warnings: string[];         // Human-readable warnings
  requiresConfirmation: boolean;  // true if high or critical
}
```

## Dangerous Patterns

Patterns are matched against the script using case-insensitive regex.

### Critical Risk

| Pattern | Warning |
|---------|---------|
| `delete (every\|all) (file\|folder\|item\|document)` | BULK DELETE: This will delete multiple files/folders |
| `empty (the )?trash` | EMPTY TRASH: Permanently deletes all items in Trash |
| `delete (every\|all) (event\|reminder\|calendar)` | BULK DELETE CALENDAR: Deletes multiple calendar events/reminders |
| `delete (every\|all) (note\|contact)` | BULK DELETE: Deletes multiple notes or contacts |
| `send (every\|all) (message\|mail\|email)` | BULK EMAIL: Will send multiple emails |
| `do shell script "...(rm\|sudo\|chmod\|chown\|mkfs\|dd\|format)..."` | DANGEROUS SHELL COMMAND: Contains destructive shell commands |

### High Risk

| Pattern | Warning |
|---------|---------|
| `delete (file\|folder\|item\|document)` | DELETE: Will delete a file or folder (goes to Trash) |
| `move (every\|all) (file\|folder\|item)` | BULK MOVE: Will move multiple files/folders |
| `(shutdown\|restart\|sleep)` | SYSTEM POWER: Will shutdown, restart, or sleep the Mac |
| `do shell script` | SHELL COMMAND: Review carefully for dangerous operations |
| `quit (every\|all) application` | QUIT ALL APPS: Will quit multiple applications |

### Medium Risk

| Pattern | Warning |
|---------|---------|
| `duplicate (every\|all) (file\|folder\|item)` | BULK DUPLICATE: May use significant disk space |
| `keystroke` | KEYSTROKE: Simulates keyboard input |
| `key code` | KEY CODE: Simulates key presses |
| `send.*outgoing message` | SEND EMAIL: Will send an email |

## Confirmation Flow

When a script is blocked:

1. `executeAppleScript` returns `success: false`
2. Error message explains the risk and warnings
3. User must call again with `confirmedDangerous: true`

Example blocked response:
```
BLOCKED: This script contains critical-risk operations:

- BULK DELETE: This will delete multiple files/folders. This action may be irreversible.

If you really want to run this, set confirmedDangerous: true
```

## analyzeScriptSafety Function

```typescript
function analyzeScriptSafety(script: string): SafetyAnalysis
```

**Algorithm:**
1. Initialize `maxRisk` to `none`
2. For each pattern in `DANGEROUS_PATTERNS`:
   - If pattern matches script, add warning and update maxRisk
3. Return SafetyAnalysis with:
   - `safe`: true if maxRisk is `none` or `low`
   - `risk`: the highest risk level found
   - `warnings`: all matching warnings
   - `requiresConfirmation`: true if `high` or `critical`

## Enhanced Error Messages

The safety system also enhances error messages for common issues via `enhanceErrorMessage`:

| Error Type | Enhanced Message |
|------------|------------------|
| App not running | Instructions to launch app or add `activate` |
| Permission denied (automation) | Steps to enable Automation permission |
| Permission denied (file access) | Steps to enable File/Full Disk Access |
| Accessibility required | Steps to enable Accessibility permission |
| Syntax error | Common fixes for AppleScript syntax |
| Command not understood | How to check dictionary |
| Can't get | Common causes for missing objects |
| Timeout | How to handle timeouts |
| User cancelled | Informational message |
| Missing value | Common causes |

## Script Validation

The `validateScript` function checks syntax without executing:

```typescript
async function validateScript(script: string): Promise<ToolResponse<{
  valid: boolean;
  errors: string[];
  safetyAnalysis: SafetyAnalysis;
}>>
```

Uses `osacompile -e script -o /dev/null` for syntax checking.

## ScriptBuilder Utility

Helper functions for building common AppleScript patterns safely:

```typescript
const ScriptBuilder = {
  tell(appName: string, commands: string | string[]): string,
  activate(appName: string): string,
  dialog(message: string, options?: { title?: string; buttons?: string[] }): string,
  notification(message: string, options?: { title?: string; subtitle?: string }): string,
  getFrontmostApp(): string,
  listRunningApps(): string,
}
```

These escape strings properly to prevent injection.

## Integration with Execution

The execution flow:

```
1. executeAppleScript called
          |
          v
2. analyzeScriptSafety runs
          |
          v
3. Check risk level:
   - critical + !confirmedDangerous -> BLOCK
   - high + !confirmedDangerous + !skipSafetyCheck -> BLOCK
   - otherwise -> proceed
          |
          v
4. Execute script
          |
          v
5. Attach safetyAnalysis to result data
```

Safety analysis is always included in the response data for transparency, even for successful executions.
