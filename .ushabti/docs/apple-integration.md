# Apple Integration Guide

## Overview

The Apple integration layer (`src/apple/`) provides low-level access to macOS AppleScript via the `osascript` and `sdef` command-line tools. This is the foundation that all script execution and dictionary retrieval builds upon.

## Executor Module (`src/apple/executor.ts`)

### Script Execution

#### executeAppleScript

```typescript
async function executeAppleScript(
  script: string,
  timeout: number = 30000
): Promise<ToolResponse<ExecuteResponse>>
```

Executes an AppleScript string using `osascript -e`.

**Parameters:**
- `script`: AppleScript code to execute
- `timeout`: Maximum execution time (1000-300000ms, default 30000)

**Returns:** `ToolResponse<ExecuteResponse>` with stdout, stderr, exitCode

**Implementation:**
- Uses `execFile` with promisified async wrapper
- Clamps timeout between 1000ms and 300000ms
- Max buffer: 10MB
- Parses osascript error messages into readable format

#### executeAppleScriptFile

```typescript
async function executeAppleScriptFile(
  filePath: string,
  timeout: number = 30000
): Promise<ToolResponse<ExecuteResponse>>
```

Executes a compiled or text AppleScript file.

### Dictionary Retrieval

#### getSdef

```typescript
async function getSdef(appPath: string): Promise<ToolResponse<string>>
```

Retrieves the SDEF (Scripting Definition) XML for an application.

**Parameters:**
- `appPath`: Full path to the .app bundle (e.g., `/Applications/Music.app`)

**Returns:** Raw SDEF XML string

**Notes:**
- Requires Xcode to be installed (not just Command Line Tools)
- Max buffer: 50MB (some dictionaries are large)
- Timeout: 30 seconds

### Application Discovery

#### findAppPath

```typescript
async function findAppPath(appName: string): Promise<string | null>
```

Finds the full path to an application by name.

**Search order:**
1. `/Applications`
2. `/System/Applications`
3. `/System/Applications/Utilities`
4. `~/Applications`
5. `/Applications/Utilities`
6. Spotlight via `mdfind` (fallback)
7. Case-insensitive `ls` scan (last resort)

**Input handling:**
- Appends `.app` if not present
- Handles case-insensitive matching

#### isScriptable

```typescript
async function isScriptable(appPath: string): Promise<boolean>
```

Checks if an application supports AppleScript by attempting to retrieve its SDEF.

### Error Parsing

The `parseAppleScriptError` function extracts meaningful error messages from osascript stderr:

```typescript
function parseAppleScriptError(stderr: string): string | null
```

Patterns matched:
- `execution error: (.+) \(-?\d+\)$`
- `syntax error: (.+)$`
- `(.+): execution error: (.+)$`

## SDEF Parser Module (`src/apple/sdef-parser.ts`)

### Parsing Functions

#### parseSdef

```typescript
function parseSdef(xml: string, appName: string): AppleScriptDictionary
```

Parses SDEF XML into structured `AppleScriptDictionary`.

**Implementation:**
- Uses regex-based parsing (not DOM parser)
- Handles class-extension elements that extend existing classes
- Decodes XML entities

#### getCachedDictionary

```typescript
function getCachedDictionary(
  appPath: string,
  appName: string,
  sdefXml: string
): AppleScriptDictionary
```

Returns cached dictionary or parses fresh. Cache TTL: 1 hour.

### Formatting Functions

#### formatDictionaryForLLM

```typescript
function formatDictionaryForLLM(dict: AppleScriptDictionary): string
```

Formats a dictionary as a comprehensive, LLM-friendly markdown guide.

**Output sections:**
1. Quick Start Examples - basic tell block structure
2. Key Commands - top 8 commands with syntax, parameters, examples
3. Key Classes - top 5 classes with property tables
4. Complete Reference - all suites, commands, classes, enumerations
5. Tips for Using This Dictionary

#### generateCommandExample

Generates example AppleScript code for a command with placeholder values:

| Type | Placeholder |
|------|-------------|
| text/string | `"your text here"` |
| integer/number | `1` |
| boolean | `true` |
| file | `file "path/to/file"` |
| folder | `folder "path/to/folder"` |
| list | `{item1, item2}` |
| record | `{key:value}` |
| date | `current date` |
| specifier/reference | `someObject` |
| other | `<type>` |

### Cache Management

#### clearCache

```typescript
function clearCache(): void
```

Clears the in-memory dictionary cache.

## macOS Requirements

### Xcode Requirement

The `sdef` command requires Xcode to be installed and selected:

```bash
# Check if sdef works
sdef /System/Applications/Notes.app | head -5

# If not, install Xcode and run:
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

### Permissions

AppleScript automation requires permissions in System Settings:

| Permission | Purpose | Location |
|------------|---------|----------|
| Automation | Control other apps | Privacy & Security > Automation |
| Accessibility | Keystrokes, UI automation | Privacy & Security > Accessibility |
| Full Disk Access | Some file operations | Privacy & Security > Full Disk Access |

## Command Line Tools Used

| Command | Purpose | Buffer Size |
|---------|---------|-------------|
| `osascript -e "script"` | Execute AppleScript | 10MB |
| `osascript filepath` | Execute script file | 10MB |
| `sdef /path/to/App.app` | Get SDEF dictionary | 50MB |
| `mdfind` | Spotlight search for apps | default |
| `test -d` | Check directory exists | n/a |
| `ls` | List directory contents | default |
