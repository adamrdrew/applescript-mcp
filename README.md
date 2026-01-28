# AppleScript MCP Server

A Model Context Protocol (MCP) server that provides LLM access to macOS AppleScript automation. This server enables AI assistants to discover scriptable applications, understand their capabilities through AppleScript dictionaries, and execute automation scripts safely.

## Features

- **List Scriptable Apps**: Discover all applications on your Mac that support AppleScript automation
- **Get App Dictionaries**: Retrieve comprehensive, LLM-friendly documentation with **examples** for each app
- **Execute Scripts**: Run AppleScript code with proper error handling and timeout support
- **Validate Scripts**: Check script syntax before execution
- **Safety Analysis**: Automatic detection of dangerous operations (bulk deletes, system commands, etc.)
- **Helpful Errors**: Error messages that explain what went wrong and how to fix it
- **Learning System**: Remembers successful patterns and suggests fixes based on past executions
- **Smart Suggestions**: Context-aware script recommendations based on learned patterns and skill files
- **Capability Discovery**: Shows what's possible based on currently running apps

## Requirements

- **macOS** (AppleScript is a macOS-only technology)
- **Node.js** 18 or later
- **Xcode** (full installation, not just Command Line Tools)

### Why Xcode?

The server uses the `sdef` command to retrieve AppleScript dictionaries from applications. This command requires Xcode to be installed and selected as the active developer directory.

To verify your setup:
```bash
sdef /System/Applications/Notes.app | head -5
```

If you see XML output, you're good. If you get an error about Xcode, install Xcode from the App Store and run:
```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

## Installation

```bash
# Clone or download this repository
cd applescript-mcp

# Install dependencies
npm install

# Build the TypeScript
npm run build
```

## Usage

### Configuring with Claude Code

**Option 1: Global (all projects)**

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "applescript": {
      "command": "node",
      "args": ["/path/to/applescript-mcp/dist/index.js"]
    }
  }
}
```

**Option 2: Single project**

Add a `.mcp.json` file to your project root:

```json
{
  "mcpServers": {
    "applescript": {
      "command": "node",
      "args": ["/path/to/applescript-mcp/dist/index.js"]
    }
  }
}
```

Alternatively, add to `.claude/settings.local.json` in your project (same format as above).

After configuring, restart Claude Code or run `/mcp` to verify the server is connected.

### Configuring with Claude Desktop

Add this to your Claude Desktop configuration file (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "applescript": {
      "command": "node",
      "args": ["/path/to/applescript-mcp/dist/index.js"]
    }
  }
}
```

### Running Standalone

```bash
npm start
```

## Available Tools

### `list_scriptable_apps`

Returns a list of all applications on the system that support AppleScript.

**Parameters**: None

**Example Response**:
```json
{
  "success": true,
  "data": {
    "apps": ["Finder", "Mail", "Safari", "Calendar", "Notes", "Music", ...]
  }
}
```

### `get_app_dictionary`

Retrieves the AppleScript dictionary for an application with examples and detailed documentation.

**Parameters**:
- `app` (string, required): The application name (e.g., "Finder", "Safari")

**Returns**: A comprehensive guide including:
- Quick start examples
- Key commands with syntax and usage examples
- Key classes with property tables
- Complete reference of all commands, classes, and enumerations
- Tips for using the dictionary

### `execute_applescript`

Executes an AppleScript script with **safety analysis** and **learning**.

**Parameters**:
- `script` (string, required): The AppleScript code to execute
- `intent` (string, optional): Natural language description of what this script does (used for learning)
- `timeout` (number, optional): Timeout in milliseconds (default: 30000, max: 300000)
- `confirmedDangerous` (boolean, optional): Set to true to execute high-risk scripts

**Learning**: Executions are automatically logged to improve future suggestions. Pass an `intent` to help the learning system understand what you're trying to accomplish.

**Safety Levels**:
| Risk Level | Behavior | Example Operations |
|------------|----------|-------------------|
| None/Low | Executes normally | Get properties, display dialogs |
| Medium | Warning in response | Keystrokes, sending emails |
| High | Blocked until confirmed | Shell commands, quit all apps |
| Critical | Blocked until confirmed | Delete all files, empty trash |

**Example - Safe Script**:
```json
{
  "script": "tell application \"Finder\" to get name of startup disk"
}
```

**Example - Dangerous Script (blocked)**:
```json
{
  "script": "tell application \"Finder\" to delete every file of desktop"
}
```
Returns an error with safety warnings. To execute anyway:
```json
{
  "script": "tell application \"Finder\" to delete every file of desktop",
  "confirmedDangerous": true
}
```

### `validate_applescript`

Checks syntax AND analyzes safety without executing.

**Parameters**:
- `script` (string, required): The AppleScript code to validate

**Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "errors": [],
    "safetyAnalysis": {
      "safe": true,
      "risk": "none",
      "warnings": [],
      "requiresConfirmation": false
    }
  }
}
```

### `get_system_state`

Gets the current state of the Mac for context-aware automation.

**Parameters**: None

**Returns**: Frontmost app, running apps, Finder selection, clipboard contents, volume level, currently playing music, open Safari tabs.

## Learning System

The server includes a learning system that improves over time by remembering what works.

### How It Works

1. **Pattern Storage**: Every script execution is logged to `~/.applescript-mcp/learned-patterns.json` with its intent, success/failure status, and result
2. **Indexing**: Patterns are indexed by app, action type (create, delete, play, etc.), and keywords for fast retrieval
3. **Success Tracking**: Successful patterns accumulate a success count, making them more likely to be suggested
4. **Skill Files**: App-specific markdown guides in `~/.applescript-mcp/skills/` provide curated examples and gotchas

### Learning Tools

### `get_workflow_pattern`

Find similar AppleScript patterns that have worked before.

**Parameters**:
- `intent` (string, required): What you want to accomplish (e.g., "create a playlist")
- `app` (string, optional): Filter by app name
- `action` (string, optional): Filter by action type (create, delete, get, play, etc.)

**Returns**: Matching patterns from history with success counts, plus relevant examples from skill files.

### `analyze_failure`

Analyze why an AppleScript failed and get actionable fix suggestions.

**Parameters**:
- `script` (string, required): The AppleScript that failed
- `error` (string, required): The error message

**Returns**: Root cause analysis, specific fixes, and sometimes auto-corrected scripts. Includes Music.app-specific error handling.

### `get_app_skill`

Get the skill guide for an app with working examples and common gotchas.

**Parameters**:
- `app` (string, required): The app name (e.g., "Music", "Finder")

**Returns**: Curated examples, troubleshooting tips, and correct patterns. Available for: Music, Finder, Safari, Mail, Reminders, Calendar, Notes, Messages, Contacts, Photos.

### `get_smart_suggestion`

Get an intelligent script suggestion based on learned patterns and skills.

**Parameters**:
- `app` (string, required): The target app
- `intent` (string, required): What you want to do in natural language

**Returns**: Best script approach with confidence level and warnings.

### `get_learning_stats`

Get statistics about the learning system.

**Parameters**: None

**Returns**: Total patterns, success rates, patterns by app/category, and available skill files.

### `discover_capabilities`

Show what Mac automation is possible, prioritized by currently running apps.

**Parameters**:
- `app` (string, optional): Get detailed capabilities for a specific app

**Returns**: Context-aware overview of capabilities with example prompts to try.

## Safety Features

The server automatically detects and blocks dangerous operations:

| Pattern | Risk Level | What It Catches |
|---------|------------|-----------------|
| `delete every file/folder` | Critical | Bulk file deletion |
| `empty trash` | Critical | Permanent deletion |
| `delete every event/reminder/note` | Critical | Bulk data deletion |
| `do shell script` | High | Shell command execution |
| `shutdown/restart/sleep` | High | System power commands |
| `quit every application` | High | Mass app termination |
| `keystroke` / `key code` | Medium | Keyboard simulation |
| `send` (email) | Medium | Sending messages |

## Error Messages

The server provides actionable error messages:

**Permission Denied**:
```
❌ Automation permission denied for Safari.

HOW TO FIX:
1. Open System Settings
2. Go to Privacy & Security → Automation
3. Find your terminal app (Terminal, iTerm, etc.)
4. Enable the toggle for "Safari"
5. You may need to restart your terminal
```

**App Not Running**:
```
❌ Keynote is not running.

HOW TO FIX:
1. Launch Keynote manually, OR
2. Add 'activate' before your command:
   tell application "Keynote"
     activate
     -- your commands here
   end tell
```

## Example Workflows

### Workflow 1: Discover and Automate

```
1. list_scriptable_apps → Find that "Music" is scriptable
2. get_app_dictionary("Music") → See available commands with examples
3. validate_applescript("tell app \"Music\" to get current track")
4. execute_applescript("tell app \"Music\" to get name of current track")
```

### Workflow 2: Safe Bulk Operations

```
1. Write script: "tell app \"Finder\" to delete every file of folder \"Temp\""
2. validate_applescript → See it's flagged as "critical" risk
3. Review the warning, decide if it's what you want
4. execute_applescript with confirmedDangerous: true
```

## Permissions

AppleScript automation requires permissions in System Settings:

1. **Privacy & Security → Automation**: Required for controlling apps
2. **Privacy & Security → Accessibility**: Required for keystroke/UI automation
3. **Privacy & Security → Full Disk Access**: Required for some file operations

## Development

```bash
npm run dev      # Watch mode
npm run typecheck # Type checking only
npm run build    # Production build
```

## Project Structure

```
applescript-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── types.ts              # TypeScript interfaces
│   ├── tools/
│   │   ├── list-apps.ts      # List scriptable applications
│   │   ├── get-dictionary.ts # Get app dictionaries
│   │   ├── execute.ts        # Execute with safety checks
│   │   ├── system-state.ts   # Get current Mac state
│   │   ├── smart-tools.ts    # Learning-powered tools
│   │   └── discover.ts       # Capability discovery
│   ├── learning/
│   │   ├── pattern-store.ts  # Execution history & indexing
│   │   ├── skill-loader.ts   # Load app skill files
│   │   └── analyzer.ts       # Error analysis & fix suggestions
│   └── apple/
│       ├── sdef-parser.ts    # Parse sdef XML with examples
│       └── executor.ts       # osascript wrapper
├── package.json
├── tsconfig.json
└── README.md

~/.applescript-mcp/           # User data directory
├── learned-patterns.json     # Execution history
├── patterns-index.json       # Fast lookup indices
└── skills/                   # App-specific skill files (*.md)
```


