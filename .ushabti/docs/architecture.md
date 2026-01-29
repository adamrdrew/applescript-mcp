# Architecture Overview

## Overview

AppleScript MCP Server is a Model Context Protocol (MCP) server that provides LLM access to macOS AppleScript automation. It runs as a stdio-based server that MCP clients (like Claude Desktop or Claude Code) connect to for executing AppleScript commands on macOS.

## System Architecture

```
+------------------+     JSON-RPC/stdio     +-------------------+
|   MCP Client     | <------------------->  |   MCP Server      |
| (Claude Desktop) |                        |   (index.ts)      |
+------------------+                        +-------------------+
                                                    |
                                                    v
                                            +---------------+
                                            |  Tools Layer  |
                                            +---------------+
                                            /       |       \
                                           v        v        v
                                    +--------+ +--------+ +--------+
                                    | Apple  | |Learning| |Discover|
                                    |Integr. | |System  | |        |
                                    +--------+ +--------+ +--------+
                                         |          |
                                         v          v
                                    +--------+ +----------------+
                                    |osascript| |~/.applescript-|
                                    |  sdef   | |     mcp/      |
                                    +--------+ +----------------+
```

## Core Components

### Entry Point (`src/index.ts`)

The main server file creates an MCP Server instance and registers all tools. It:

1. Creates the MCP server with stdio transport
2. Registers tool definitions with JSON Schema input specifications
3. Handles `tools/list` and `tools/call` JSON-RPC requests
4. Routes tool calls to appropriate handler functions
5. Manages graceful shutdown on SIGINT/SIGTERM

### Tools Layer (`src/tools/`)

Each tool module exports functions that handle specific MCP tool requests:

| Tool | Module | Purpose |
|------|--------|---------|
| `list_scriptable_apps` | `list-apps.ts` | Discover scriptable applications |
| `get_app_dictionary` | `get-dictionary.ts` | Get app scripting dictionaries |
| `execute_applescript` | `execute.ts` | Run scripts with safety analysis |
| `validate_applescript` | `execute.ts` | Validate syntax without execution |
| `get_system_state` | `system-state.ts` | Get current Mac state |
| `get_workflow_pattern` | `smart-tools.ts` | Find similar successful patterns |
| `analyze_failure` | `smart-tools.ts` | Analyze script failures |
| `get_app_skill` | `smart-tools.ts` | Get app-specific guides |
| `get_smart_suggestion` | `smart-tools.ts` | Get intelligent script suggestions |
| `get_learning_stats` | `smart-tools.ts` | Get learning system statistics |
| `discover_capabilities` | `discover.ts` | Show available capabilities |

### Apple Integration (`src/apple/`)

Low-level macOS integration:

- **executor.ts**: Wraps `osascript` for script execution and `sdef` for dictionary retrieval
- **sdef-parser.ts**: Parses SDEF XML into structured dictionaries with LLM-friendly formatting

### Learning System (`src/learning/`)

Intelligence layer that improves over time:

- **pattern-store.ts**: Persists execution history to `~/.applescript-mcp/`
- **skill-loader.ts**: Loads app-specific markdown guides from `~/.applescript-mcp/skills/`
- **analyzer.ts**: Parses AppleScript errors into actionable fix suggestions

## Data Flow

### Tool Execution Flow

```
1. MCP Client sends tools/call request
           |
           v
2. index.ts routes to handler based on tool name
           |
           v
3. Tool handler validates parameters (type guards)
           |
           v
4. Handler calls appropriate subsystem:
   - Apple integration for script execution
   - Learning system for pattern matching
   - Discover module for capability info
           |
           v
5. Subsystem returns ToolResponse<T>
           |
           v
6. Handler formats response as MCP content
           |
           v
7. index.ts sends JSON-RPC response
```

### Script Execution Flow

```
1. execute_applescript tool called with script
           |
           v
2. Safety analysis runs (analyzeScriptSafety)
           |
           v
3. If critical/high risk, block or require confirmation
           |
           v
4. Call osascript via executor.ts
           |
           v
5. Log execution to pattern store
           |
           v
6. If failed, generate smart error message
           |
           v
7. Return result with safety analysis attached
```

## Response Format

All tool responses use `ToolResponse<T>`:

```typescript
interface ToolResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

MCP responses include content array:

```typescript
{
  content: [{ type: 'text', text: '...' }],
  isError?: boolean
}
```

## File Structure

```
applescript-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── types.ts              # TypeScript interfaces
│   ├── tools/                # Tool implementations
│   │   ├── list-apps.ts
│   │   ├── get-dictionary.ts
│   │   ├── execute.ts
│   │   ├── system-state.ts
│   │   ├── smart-tools.ts
│   │   └── discover.ts
│   ├── learning/             # Learning system
│   │   ├── pattern-store.ts
│   │   ├── skill-loader.ts
│   │   └── analyzer.ts
│   └── apple/                # Apple integration
│       ├── executor.ts
│       └── sdef-parser.ts
├── scripts/
│   └── test-server.js        # Integration tests
├── dist/                     # Compiled output
└── package.json
```

## Runtime Data

User data stored in `~/.applescript-mcp/`:

```
~/.applescript-mcp/
├── learned-patterns.json     # Execution history
├── patterns-index.json       # Fast lookup indices
└── skills/                   # App-specific skill guides
    ├── music.md
    ├── finder.md
    └── ...
```

## Dependencies

- **@modelcontextprotocol/sdk**: MCP server SDK
- **Node.js built-ins**: child_process, fs/promises, os, path

No external runtime dependencies beyond the MCP SDK.
