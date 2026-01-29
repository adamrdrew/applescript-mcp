# Surveyor Working Document

## Observations

### MCP Server Core

- **Type:** system
- **Location:** `/Users/adam/Development/applescript-mcp/src/index.ts`
- **Purpose:** Entry point that creates the MCP server, registers all tools, handles JSON-RPC requests via stdio transport
- **Key files:** `src/index.ts`
- **Dependencies:** MCP SDK (`@modelcontextprotocol/sdk`), all tool modules, learning system modules

### Type System

- **Type:** abstraction
- **Location:** `/Users/adam/Development/applescript-mcp/src/types.ts`
- **Purpose:** TypeScript interfaces and type guards for all tool operations
- **Key files:** `src/types.ts`
- **Dependencies:** None (foundational)

### Apple Integration Layer

- **Type:** subsystem
- **Location:** `/Users/adam/Development/applescript-mcp/src/apple/`
- **Purpose:** Low-level macOS AppleScript integration via `osascript` and `sdef` commands
- **Key files:** `executor.ts` (script execution, app path finding), `sdef-parser.ts` (SDEF XML parsing, dictionary formatting)
- **Dependencies:** Node.js child_process, types.ts

### Tools Layer

- **Type:** subsystem
- **Location:** `/Users/adam/Development/applescript-mcp/src/tools/`
- **Purpose:** MCP tool implementations exposed to LLM clients
- **Key files:**
  - `list-apps.ts` - List scriptable applications
  - `get-dictionary.ts` - Get app dictionaries with examples
  - `execute.ts` - Execute scripts with safety analysis
  - `system-state.ts` - Get current Mac state
  - `smart-tools.ts` - Learning-powered tools
  - `discover.ts` - Capability discovery
- **Dependencies:** Apple integration layer, learning system, types.ts

### Safety System

- **Type:** abstraction
- **Location:** `/Users/adam/Development/applescript-mcp/src/tools/execute.ts`
- **Purpose:** Analyze scripts for dangerous operations, block/warn on risky patterns
- **Key files:** `src/tools/execute.ts` (DANGEROUS_PATTERNS array, analyzeScriptSafety function)
- **Dependencies:** Apple executor

### Learning System

- **Type:** subsystem
- **Location:** `/Users/adam/Development/applescript-mcp/src/learning/`
- **Purpose:** Persistent pattern storage, skill file loading, failure analysis
- **Key files:**
  - `pattern-store.ts` - Execution history storage and indexing
  - `skill-loader.ts` - Load app-specific skill guides
  - `analyzer.ts` - Error parsing and fix suggestions
- **Dependencies:** Node.js fs, types.ts

### User Data Storage

- **Type:** utility
- **Location:** `~/.applescript-mcp/`
- **Purpose:** Persistent storage for learned patterns and skill files
- **Key files:**
  - `learned-patterns.json` - Execution history
  - `patterns-index.json` - Fast lookup indices
  - `skills/*.md` - App-specific skill guides
- **Dependencies:** Created by learning system at runtime

### Test Infrastructure

- **Type:** utility
- **Location:** `/Users/adam/Development/applescript-mcp/scripts/`
- **Purpose:** MCP protocol integration tests
- **Key files:** `test-server.js`
- **Dependencies:** Compiled dist/index.js

## Plan

### Step 1: Architecture Overview

- **Status:** complete
- **Target doc:** architecture.md
- **Covers:** Overall system architecture, data flow, MCP protocol integration, component relationships
- **Notes:** Foundational document that explains how all pieces fit together

### Step 2: Type System Reference

- **Status:** complete
- **Target doc:** types.md
- **Covers:** All TypeScript interfaces, type guards, response formats
- **Notes:** Reference document for understanding data structures

### Step 3: Apple Integration Guide

- **Status:** complete
- **Target doc:** apple-integration.md
- **Covers:** Executor module, SDEF parser, osascript/sdef command usage, app path resolution
- **Notes:** Core macOS integration layer

### Step 4: Tools Reference

- **Status:** complete
- **Target doc:** tools.md
- **Covers:** All MCP tools, their parameters, return types, usage patterns
- **Notes:** Primary API reference for the server

### Step 5: Safety System

- **Status:** complete
- **Target doc:** safety.md
- **Covers:** Safety analysis, dangerous patterns, risk levels, confirmation flow
- **Notes:** Critical for understanding how the server protects users

### Step 6: Learning System

- **Status:** complete
- **Target doc:** learning.md
- **Covers:** Pattern storage, indexing, skill files, failure analysis
- **Notes:** Intelligence layer that improves over time

### Step 7: Development Guide

- **Status:** complete
- **Target doc:** development.md
- **Covers:** Build commands, testing, project structure, adding new tools
- **Notes:** Practical guide for contributors
