# Contributing to AppleScript MCP

This guide covers development setup, architecture, and how to contribute.

## Development Setup

### Prerequisites

- macOS
- Node.js 18+
- Xcode (full installation, not just Command Line Tools)
- [Claude Code](https://claude.ai/code) (recommended for development)

### Ushabti Agentic Development Framework

This project uses [Ushabti](https://github.com/adamrdrew/ushabti), an agentic development framework for Claude Code. Ushabti provides structured workflows, documentation generation, and development phases that help maintain code quality and consistency.

The `.ushabti/` directory contains:
- `laws.md` — Project rules and constraints
- `style.md` — Code style guidelines
- `docs/` — Generated documentation (architecture, types, tools, safety, learning system)
- `phases/` — Development phase definitions

If you're contributing with Claude Code, Ushabti's agents will automatically have access to project context and guidelines. This helps ensure contributions follow established patterns.

### Getting Started

```bash
# Clone the repository
git clone https://github.com/adamrdrew/applescript-mcp.git
cd applescript-mcp

# Install dependencies
npm install

# Build
npm run build

# Run the server
npm start
```

### Development Commands

```bash
npm run build      # Compile TypeScript to dist/
npm run dev        # Watch mode - rebuilds on changes
npm run typecheck  # Type check without emitting
npm test           # Run integration tests (requires build first)
npm start          # Run the server
```

## Running from Source

### With Claude Code

**Global configuration** (all projects):

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

**Per-project configuration**:

Add `.mcp.json` to your project root:

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

Or add to `.claude/settings.local.json` in your project (same format).

After configuring, restart Claude Code or run `/mcp` to verify the connection.

### With Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "applescript-mcp": {
      "command": "node",
      "args": ["/path/to/applescript-mcp/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop after saving.

### Standalone

```bash
npm start
```

The server runs on stdin/stdout using the MCP protocol. You'll see:

```
🍎 Welcome to AppleScript MCP
Version X.Y.Z

✅ Server now running...
```

## Architecture

### Core Flow

1. **Entry Point** (`src/index.ts`): Creates MCP server, registers tools, handles JSON-RPC via stdio
2. **Tool Handlers** (`src/tools/`): Process requests and return formatted responses
3. **AppleScript Execution** (`src/apple/executor.ts`): Wraps `osascript` and `sdef` commands
4. **Safety Layer** (`src/tools/execute.ts`): Analyzes scripts for dangerous patterns before execution

### Project Structure

```
applescript-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── version.ts            # Version reading and startup banner
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
│       ├── sdef-parser.ts    # Parse SDEF XML with examples
│       └── executor.ts       # osascript wrapper
├── scripts/
│   └── test-server.js        # Integration test script
├── package.json
├── tsconfig.json
└── README.md
```

### Key Modules

**Tools Layer** (`src/tools/`):
- `list-apps.ts` — Discovers scriptable applications via `osascript`
- `get-dictionary.ts` — Parses SDEF XML into LLM-friendly documentation
- `execute.ts` — Script execution with safety analysis and enhanced errors
- `system-state.ts` — Gets Mac state (frontmost app, running apps, clipboard, etc.)
- `smart-tools.ts` — Workflow patterns, failure analysis, skill guides
- `discover.ts` — Context-aware capability discovery

**Learning System** (`src/learning/`):
- `pattern-store.ts` — Persists execution history to `~/.applescript-mcp/`
- `skill-loader.ts` — Loads app-specific markdown guides from `~/.applescript-mcp/skills/`
- `analyzer.ts` — Parses AppleScript errors into actionable fix suggestions

**Apple Integration** (`src/apple/`):
- `executor.ts` — Low-level `osascript` and `sdef` command execution
- `sdef-parser.ts` — Parses SDEF XML dictionaries into structured data

### Type System

All tool responses use `ToolResponse<T>` wrapper from `src/types.ts`:

```typescript
interface ToolResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

Type guards (`isExecuteParams`, `isGetDictionaryParams`) validate incoming tool arguments.

### Data Storage

User data is stored in `~/.applescript-mcp/`:

```
~/.applescript-mcp/
├── learned-patterns.json     # Execution history
├── patterns-index.json       # Fast lookup indices
└── skills/                   # App-specific skill files (*.md)
```

## Available Tools (API Reference)

### `list_scriptable_apps`

Returns all applications that support AppleScript.

**Parameters**: None

**Response**:
```json
{
  "success": true,
  "data": {
    "apps": ["Finder", "Mail", "Safari", "Calendar", "Notes", "Music"]
  }
}
```

### `get_app_dictionary`

Retrieves the AppleScript dictionary for an application.

**Parameters**:
- `app` (string, required): Application name (e.g., "Finder", "Safari")

**Response**: Comprehensive guide including quick start examples, key commands with syntax, classes with properties, and complete reference.

### `execute_applescript`

Executes an AppleScript with safety analysis and learning.

**Parameters**:
- `script` (string, required): AppleScript code to execute
- `intent` (string, optional): Natural language description (used for learning)
- `timeout` (number, optional): Timeout in ms (default: 30000, max: 300000)
- `confirmedDangerous` (boolean, optional): Set true to execute high-risk scripts

**Safety Levels**:

| Risk | Behavior | Examples |
|------|----------|----------|
| None/Low | Executes normally | Get properties, display dialogs |
| Medium | Warning in response | Keystrokes, sending emails |
| High | Blocked until confirmed | Shell commands, quit all apps |
| Critical | Blocked until confirmed | Delete all files, empty trash |

### `validate_applescript`

Checks syntax and analyzes safety without executing.

**Parameters**:
- `script` (string, required): AppleScript code to validate

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

Gets current Mac state for context-aware automation.

**Parameters**: None

**Returns**: Frontmost app, running apps, Finder selection, clipboard, volume, playing music, Safari tabs.

### `get_workflow_pattern`

Find similar AppleScript patterns that have worked before.

**Parameters**:
- `intent` (string, required): What you want to accomplish
- `app` (string, optional): Filter by app
- `action` (string, optional): Filter by action type (create, delete, get, play, etc.)

### `analyze_failure`

Analyze why an AppleScript failed and get fix suggestions.

**Parameters**:
- `script` (string, required): The failed script
- `error` (string, required): The error message

**Returns**: Root cause, specific fixes, sometimes auto-corrected scripts.

### `get_app_skill`

Get the skill guide for an app with working examples.

**Parameters**:
- `app` (string, required): App name (e.g., "Music", "Finder")

**Returns**: Curated examples, troubleshooting tips, correct patterns.

### `get_smart_suggestion`

Get an intelligent script suggestion based on learned patterns.

**Parameters**:
- `app` (string, required): Target app
- `intent` (string, required): What you want to do

**Returns**: Best script approach with confidence level and warnings.

### `get_learning_stats`

Get statistics about the learning system.

**Parameters**: None

**Returns**: Total patterns, success rates, patterns by app/category, available skill files.

### `discover_capabilities`

Show what automation is possible, prioritized by running apps.

**Parameters**:
- `app` (string, optional): Get detailed capabilities for a specific app

**Returns**: Context-aware overview with example prompts.

## Safety System

Scripts are analyzed against `DANGEROUS_PATTERNS` in `src/tools/execute.ts`:

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

Critical and high-risk scripts are blocked unless `confirmedDangerous: true` is passed.

## Testing

The test script (`scripts/test-server.js`) spawns the server and verifies MCP protocol responses:

1. Initialize handshake
2. Tools listing
3. Tool execution (discover_capabilities)

```bash
npm run build && npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b my-feature`
3. Make your changes
4. Run tests: `npm run build && npm test`
5. Submit a pull request

### Code Style

- TypeScript strict mode
- All tool responses use `ToolResponse<T>` wrapper
- Type guards for parameter validation
- Actionable error messages with "HOW TO FIX" sections

### Adding a New Tool

1. Create handler in `src/tools/`
2. Export from `src/tools/index.ts`
3. Register in `src/index.ts` tools list
4. Add type guard if needed in `src/types.ts`
5. Document in this file

## License

MIT
