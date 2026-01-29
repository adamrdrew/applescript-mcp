# Tools Reference

## Overview

This document covers all MCP tools exposed by the server. Tools are registered in `src/index.ts` and implemented across `src/tools/`.

## Core Tools

### list_scriptable_apps

Lists all applications on the system that support AppleScript automation.

**Parameters:** None

**Returns:**
```typescript
{
  success: true,
  data: {
    apps: string[]  // Sorted alphabetically
  }
}
```

**Implementation:** `src/tools/list-apps.ts`

**Notes:**
- Scans `/Applications`, `/System/Applications`, `/Applications/Utilities`, `~/Applications`
- Uses a known-scriptable-apps set for faster detection of common apps
- Checks SDEF availability for unknown apps

---

### get_app_dictionary

Retrieves the AppleScript dictionary for an application with examples.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| app | string | Yes | Application name (e.g., "Finder", "Safari") |

**Returns:** Formatted markdown with:
- Quick start examples
- Key commands with syntax and examples
- Key classes with property tables
- Complete reference of all commands, classes, enumerations
- Tips for using the dictionary

**Implementation:** `src/tools/get-dictionary.ts`

**Notes:**
- Caches parsed dictionaries for 1 hour
- Tries name variations if initial lookup fails

---

### execute_applescript

Executes an AppleScript with safety analysis and learning.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| script | string | Yes | AppleScript code to execute |
| intent | string | No | Natural language description (for learning) |
| timeout | number | No | Max execution time in ms (default: 30000, max: 300000) |
| confirmedDangerous | boolean | No | Set true to execute high-risk scripts |

**Returns:**
```typescript
{
  success: boolean,
  data: {
    stdout: string,
    stderr: string,
    exitCode: number,
    safetyAnalysis: SafetyAnalysis
  },
  error?: string  // Enhanced error message on failure
}
```

**Implementation:** `src/tools/execute.ts`

**Behavior:**
1. Validates script is non-empty string
2. Runs safety analysis
3. Blocks critical-risk operations unless `confirmedDangerous: true`
4. Blocks high-risk operations unless `confirmedDangerous: true`
5. Executes via osascript
6. Logs execution to pattern store
7. On failure: generates smart error message with fix suggestions
8. On success: may suggest related capabilities

---

### validate_applescript

Checks script syntax and analyzes safety without executing.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| script | string | Yes | AppleScript code to validate |

**Returns:**
```typescript
{
  success: true,
  data: {
    valid: boolean,
    errors: string[],
    safetyAnalysis: SafetyAnalysis
  }
}
```

**Implementation:** `src/tools/execute.ts`

**Notes:**
- Uses `osacompile -e script -o /dev/null` for syntax validation
- Always includes safety analysis regardless of syntax validity

---

### get_system_state

Gets the current state of the Mac for context-aware automation.

**Parameters:** None

**Returns:**
```typescript
{
  success: true,
  data: {
    timestamp: string,
    frontmostApp: string,
    runningApps: string[],
    finderSelection: string[],
    clipboardText: string | null,  // Truncated if > 1000 chars
    currentVolume: number,
    musicPlaying: {
      isPlaying: boolean,
      track: string | null,
      artist: string | null,
      album: string | null
    },
    safariTabs: Array<{ title: string, url: string }>  // Max 10 tabs
  }
}
```

**Implementation:** `src/tools/system-state.ts`

**Notes:**
- Runs multiple AppleScript queries in parallel for speed
- Silently handles failures for individual state components

## Learning Tools

### get_workflow_pattern

Finds similar AppleScript patterns that have worked before.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| intent | string | Yes | What you want to accomplish |
| app | string | No | Filter by app name |
| action | string | No | Filter by action type (create, delete, play, etc.) |

**Returns:**
```typescript
{
  success: true,
  data: {
    patterns: Array<{
      script: string,
      intent: string,
      successCount: number,
      apps: string[]
    }>,
    skillExamples: string[],
    context: string
  }
}
```

**Implementation:** `src/tools/smart-tools.ts`

---

### analyze_failure

Analyzes why an AppleScript failed and provides fix suggestions.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| script | string | Yes | The AppleScript that failed |
| error | string | Yes | The error message |

**Returns:**
```typescript
{
  success: true,
  data: {
    analysis: {
      errorType: string,
      rootCause: string,
      suggestions: string[],
      fixedScript: string | null,
      relatedSuccessfulPattern: string | null,
      confidence: 'high' | 'medium' | 'low'
    },
    smartMessage: string  // Formatted error with fixes
  }
}
```

**Implementation:** `src/tools/smart-tools.ts`

---

### get_app_skill

Gets the skill guide for an app with working examples and gotchas.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| app | string | Yes | App name (e.g., "Music", "Finder") |

**Returns:** Skill file content or message if unavailable

**Implementation:** `src/tools/smart-tools.ts`

**Notes:**
- Skill files are markdown in `~/.applescript-mcp/skills/`
- Built-in skills: Music, Finder, Safari, Mail, Reminders, Calendar, Notes, Messages, Contacts, Photos

---

### get_smart_suggestion

Gets an intelligent script suggestion based on patterns and skills.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| app | string | Yes | Target app |
| intent | string | Yes | What you want to do |

**Returns:**
```typescript
{
  success: true,
  data: {
    suggestion: string,           // The script
    basedOn: 'pattern' | 'skill' | 'generic',
    confidence: 'high' | 'medium' | 'low',
    relatedPatterns: string[],
    warnings: string[]            // Gotchas for this app
  }
}
```

**Implementation:** `src/tools/smart-tools.ts`

---

### get_learning_stats

Gets statistics about the learning system.

**Parameters:** None

**Returns:**
```typescript
{
  success: true,
  data: {
    totalPatterns: number,
    successfulPatterns: number,
    byApp: Record<string, number>,
    byCategory: Record<string, number>,
    topPatterns: Array<{
      script: string,      // Truncated to 200 chars
      successCount: number,
      apps: string[]
    }>,
    availableSkills: string[]
  }
}
```

**Implementation:** `src/tools/smart-tools.ts`

## Discovery Tool

### discover_capabilities

Shows what Mac automation is possible.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| app | string | No | Get detailed capabilities for a specific app |

**Returns:** Formatted markdown overview

**Without app parameter:**
- Prioritizes currently running apps
- Shows all capabilities by category (Media, Files, Web, Communication, Productivity)
- Includes learning status and available skill guides

**With app parameter:**
- Deep dive for specific app
- Capabilities list
- Example prompts to try
- Quick wins (simple commands)
- Gotchas from skill file
- Related workflows

**Implementation:** `src/tools/discover.ts`

**Categories:**
| Category | Apps |
|----------|------|
| MEDIA | Music, Photos |
| FILES | Finder |
| WEB | Safari |
| COMMUNICATION | Mail, Messages, Contacts |
| PRODUCTIVITY | Reminders, Calendar, Notes |
