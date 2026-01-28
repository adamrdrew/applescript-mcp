# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
npm run build      # Compile TypeScript to dist/
npm run dev        # Watch mode for development
npm run typecheck  # Type check without emitting
npm test           # Run MCP server integration tests (requires build first)
npm start          # Run the server (requires build first)
```

## Architecture Overview

This is an MCP (Model Context Protocol) server that enables LLM access to macOS AppleScript automation. It runs as a stdio-based MCP server that clients like Claude Desktop connect to.

### Core Flow

1. **Entry Point** (`src/index.ts`): Creates MCP server, registers tools, handles JSON-RPC requests via stdio transport
2. **Tool Handlers**: Each tool in `src/tools/` processes requests and returns formatted responses
3. **AppleScript Execution** (`src/apple/executor.ts`): Wraps `osascript` for script execution and `sdef` for dictionary retrieval
4. **Safety Layer** (`src/tools/execute.ts`): Analyzes scripts for dangerous patterns before execution, blocks critical operations unless confirmed

### Key Modules

**Tools Layer** (`src/tools/`):
- `list-apps.ts` - Discovers scriptable applications via `osascript` query
- `get-dictionary.ts` - Parses SDEF XML into LLM-friendly documentation
- `execute.ts` - Script execution with safety analysis and enhanced error messages
- `system-state.ts` - Gets current Mac state (frontmost app, running apps, clipboard, etc.)
- `smart-tools.ts` - Workflow patterns, failure analysis, skill guides
- `discover.ts` - Context-aware capability discovery for users

**Learning System** (`src/learning/`):
- `pattern-store.ts` - Persists execution history to `~/.applescript-mcp/`, indexes by app/action/keywords
- `skill-loader.ts` - Loads app-specific markdown guides from `~/.applescript-mcp/skills/`
- `analyzer.ts` - Parses AppleScript errors into actionable fix suggestions

**Apple Integration** (`src/apple/`):
- `executor.ts` - Low-level `osascript` and `sdef` command execution
- `sdef-parser.ts` - Parses SDEF XML dictionaries into structured data

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

### Safety System

Scripts are analyzed against `DANGEROUS_PATTERNS` in `src/tools/execute.ts` before execution:
- `critical` risk (bulk deletes, empty trash, dangerous shell commands) - blocked unless `confirmedDangerous: true`
- `high` risk (shell commands, system power, quit all apps) - warning, requires confirmation
- `medium` risk (keystrokes, sending emails) - warning only

### Data Storage

Learned patterns and skills stored in `~/.applescript-mcp/`:
- `learned-patterns.json` - Execution history with success counts
- `patterns-index.json` - Fast lookup indices by app/action/keyword
- `skills/*.md` - App-specific guides with working examples

## Testing

The test script (`scripts/test-server.js`) spawns the server and verifies MCP protocol responses:
- Initialize handshake
- Tools listing
- Tool execution (discover_capabilities)

Run `npm run build && npm test` to verify server functionality.
