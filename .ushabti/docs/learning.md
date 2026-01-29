# Learning System

## Overview

The learning system (`src/learning/`) provides intelligence that improves over time by remembering successful patterns and providing contextual help. It consists of three modules:

- **pattern-store.ts**: Execution history and pattern indexing
- **skill-loader.ts**: App-specific skill file loading
- **analyzer.ts**: Error analysis and fix suggestions

## Pattern Store (`src/learning/pattern-store.ts`)

### Data Location

All data stored in `~/.applescript-mcp/`:
- `learned-patterns.json`: Execution history
- `patterns-index.json`: Fast lookup indices

### ExecutionRecord

Each script execution is logged as:

```typescript
interface ExecutionRecord {
  id: string;                    // Unique ID
  timestamp: string;             // ISO timestamp
  intent: string;                // Natural language description
  apps: string[];                // Apps involved (extracted from script)
  script: string;                // The script executed
  success: boolean;              // Did it work?
  result: string;                // Output or error message
  category: Category;            // media|files|communication|productivity|system|other
  actions: string[];             // Verbs extracted (create, delete, play, etc.)
  successCount: number;          // Times this exact pattern succeeded
  keywords: string[];            // For fuzzy matching
}
```

### Pattern Index

Fast lookup structure:

```typescript
interface PatternIndex {
  byApp: Record<string, string[]>;      // app -> [pattern ids]
  byAction: Record<string, string[]>;   // action -> [pattern ids]
  byCategory: Record<string, string[]>; // category -> [pattern ids]
  byKeyword: Record<string, string[]>;  // keyword -> [pattern ids]
}
```

### Key Functions

#### logExecution

```typescript
async function logExecution(
  intent: string,
  script: string,
  success: boolean,
  result: string
): Promise<ExecutionRecord>
```

Called automatically after each script execution:
1. Extract apps, actions, keywords from script
2. Determine category from apps/actions
3. Check if same script exists (by normalized comparison)
4. If exists: update successCount
5. If new: create record and update indices
6. Save to disk

#### findSimilarPatterns

```typescript
async function findSimilarPatterns(
  intent: string,
  options?: {
    app?: string;
    action?: string;
    limit?: number;
    onlySuccessful?: boolean;
  }
): Promise<ExecutionRecord[]>
```

Finds patterns matching the intent:
1. If `app` specified, start with that app's patterns
2. If `action` specified, intersect/filter by action
3. If no filters, use keyword matching from intent
4. Score candidates by keyword overlap + successCount
5. Return top N by score

### Categorization

Apps map to categories:
| Category | Apps |
|----------|------|
| media | Music, TV, Podcasts, Photos |
| files | Finder |
| communication | Mail, Messages, Contacts |
| productivity | Calendar, Reminders, Notes |
| system | System Events, System Preferences |
| other | Everything else |

### Action Extraction

Verbs extracted from scripts:
- create, make, new
- delete, remove, trash
- get, read, fetch, retrieve
- set, update, modify, change
- play, pause, stop, resume
- open, close, quit, activate
- move, copy, duplicate
- send, email, message
- add, append, insert
- search, find, locate
- list, show, display
- save, export, write

## Skill Loader (`src/learning/skill-loader.ts`)

### Skill Files

Markdown files in `~/.applescript-mcp/skills/`:
```
skills/
├── music.md
├── finder.md
├── safari.md
├── mail.md
├── reminders.md
├── calendar.md
├── notes.md
├── messages.md
├── contacts.md
└── photos.md
```

### Key Functions

#### getAppSkill

```typescript
async function getAppSkill(appName: string): Promise<string | null>
```

Returns full skill file content or null if not found.

#### listAvailableSkills

```typescript
async function listAvailableSkills(): Promise<string[]>
```

Returns list of available skill names.

#### getRelevantExamples

```typescript
async function getRelevantExamples(
  appName: string,
  intent: string
): Promise<string[]>
```

Extracts code blocks from skill file that match the intent:
1. Find all ```applescript blocks
2. Score by keyword overlap with intent
3. Also check surrounding context (text before code block)
4. Return top 3 matching examples

#### getQuickReference

```typescript
async function getQuickReference(appName: string): Promise<{
  gotchas: string[];
  commonPatterns: string[];
  troubleshooting: string[];
} | null>
```

Extracts structured data from skill file sections.

#### generateSkillContext

```typescript
async function generateSkillContext(
  appName: string,
  intent: string
): Promise<string>
```

Generates a context prompt with:
- Relevant working examples
- Important notes/gotchas
- Quick patterns

## Analyzer (`src/learning/analyzer.ts`)

### Error Types

```typescript
type ErrorType =
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
```

### Error Pattern Matching

Each error type has:
- `patterns`: Regex patterns to match
- `getCause`: Function to generate root cause message
- `getSuggestions`: Function to generate fix suggestions
- `getFix`: Optional function to auto-correct script

Example patterns:
| Error Type | Patterns |
|------------|----------|
| permission_denied | `not allowed`, `permission`, `access.*denied`, `(-1743)` |
| app_not_running | `application isn't running`, `not running`, `(-600)` |
| object_not_found | `can't get`, `doesn't exist`, `missing`, `(-1728)` |
| command_not_understood | `doesn't understand`, `(-1708)` |
| syntax_error | `syntax error`, `expected.*but found` |

### Key Functions

#### analyzeFailure

```typescript
async function analyzeFailure(
  script: string,
  errorMessage: string
): Promise<FailureAnalysis>
```

Returns:
```typescript
interface FailureAnalysis {
  errorType: ErrorType;
  rootCause: string;
  suggestions: string[];
  relatedSuccessfulPattern: string | null;  // From pattern store
  fixedScript: string | null;               // Auto-corrected if possible
  confidence: 'high' | 'medium' | 'low';
}
```

#### analyzeMusicFailure

Special handling for Music.app issues:

| Issue | Fix |
|-------|-----|
| Using "add" instead of "duplicate" | Replace with `duplicate...to` |
| Creating playlist with tracks | Split into create + duplicate |
| Search in wrong context | Use `search library playlist 1` |
| Using "songs" instead of "tracks" | Replace with "tracks" |
| No current track | Check player state first |

#### generateSmartErrorMessage

```typescript
async function generateSmartErrorMessage(
  script: string,
  rawError: string
): Promise<string>
```

Produces formatted error message with:
- Root cause explanation
- How to fix steps
- Auto-corrected script (if available)
- Similar successful pattern (if found)

## Integration

The learning system integrates with execution:

```
execute_applescript called
         |
         v
Script executes
         |
         v
logExecution records result
         |
         +-- success: increment successCount
         |
         +-- failure: can use analyzeFailure for smart error
```

The smart tools expose learning system functions:
- `get_workflow_pattern` -> findSimilarPatterns + getRelevantExamples
- `analyze_failure` -> analyzeFailure + generateSmartErrorMessage
- `get_app_skill` -> getAppSkill + getQuickReference
- `get_smart_suggestion` -> combines patterns + skills
- `get_learning_stats` -> getPatternStats + listAvailableSkills
