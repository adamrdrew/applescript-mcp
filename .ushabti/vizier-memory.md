# Vizier Memory

## Project Context

AppleScript MCP Server is an MCP (Model Context Protocol) server that enables LLM access to macOS AppleScript automation. It runs as a stdio-based server that clients like Claude Desktop and Claude Code connect to via JSON-RPC.

**Core Purpose**: Enable Claude to control macOS applications through AppleScript with safety analysis, pattern learning, and intelligent error handling.

**Target Users**: Experienced developers who understand macOS and AppleScript fundamentals.

## User Preferences

User introduced themselves as Adam.

## Project Structure

```
src/
├── index.ts              # MCP server entry point
├── types.ts              # Shared type definitions
├── apple/                # Low-level macOS integration
│   ├── executor.ts       # osascript/sdef execution
│   └── sdef-parser.ts    # Dictionary parsing
├── tools/                # MCP tool handlers (business logic)
│   ├── execute.ts        # Script execution with safety
│   ├── list-apps.ts      # App discovery
│   ├── get-dictionary.ts # Dictionary retrieval
│   ├── system-state.ts   # Mac state queries
│   ├── smart-tools.ts    # Pattern matching, analysis
│   └── discover.ts       # Capability discovery
└── learning/             # Intelligence layer
    ├── pattern-store.ts  # Execution history
    ├── skill-loader.ts   # App-specific guides
    └── analyzer.ts       # Error analysis
```

Runtime data stored in `~/.applescript-mcp/`:
- `learned-patterns.json` - Execution history
- `patterns-index.json` - Fast lookup indices
- `skills/` - App-specific markdown guides

## Architectural Principles

1. **Safety First**: Safety system analyzes scripts before execution (critical/high/medium/low risk levels)
2. **Learning System**: Execution history improves suggestions over time
3. **Token Efficiency**: MCP responses designed to be complete, actionable, and minimal
4. **Composition Over Inheritance**: Dependencies are injectable for testability
5. **No Runtime Dependencies**: Only @modelcontextprotocol/sdk and Node.js built-ins
6. **Testable Design**: Type guards validate input; mocks are injectable

## Key Technical Details

**TypeScript Configuration**: ES2022 target, NodeNext modules, strict mode, no `any` types allowed.

**Response Format**: All tools return `ToolResponse<T>` wrapper with `success: boolean`, optional `data?: T`, optional `error?: string`.

**Safety System**: Scripts analyzed against `DANGEROUS_PATTERNS` in `src/tools/execute.ts`:
- Critical risk (bulk deletes, empty trash) - blocked unless confirmed
- High risk (shell commands, system power) - warning, requires confirmation
- Medium risk (keystrokes, sending emails) - warning only

**Distribution**: Dual distribution as npm package (`applescript-mcp`) and Claude Code plugin.

**Version Synchronization**: `.claude-plugin/plugin.json` and `package.json` versions must remain in sync (per Law L24).

## Persistent Risks

No documented persistent risks at this time.

## Reference Library

### Languages

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [JavaScript (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- [AppleScript Language Guide](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/introduction/ASLR_intro.html)

### Frameworks

- [Model Context Protocol (MCP) Documentation](https://modelcontextprotocol.io/)
- [Node.js Documentation](https://nodejs.org/docs/latest/api/)

### Libraries

- [MCP SDK (@modelcontextprotocol/sdk)](https://github.com/modelcontextprotocol/typescript-sdk)

### Tools

- [npm Documentation](https://docs.npmjs.com/)
- [Git Documentation](https://git-scm.com/doc)
- [Vitest Testing Framework](https://vitest.dev/)