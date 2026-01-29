# Phase 0002: Server Startup Output

## Intent

Users currently receive no feedback when starting the AppleScript MCP server via npx—just a blank line. They cannot tell if the server is running or if something has silently failed.

This Phase adds a human-readable startup message that confirms the server is running and displays the current version.

## Scope

### In Scope

- Display a startup banner when the server starts
- Read version dynamically from package.json (single source of truth)
- Ensure output does not interfere with MCP protocol (must use stderr, not stdout)

### Out of Scope

- Logging infrastructure or log levels
- Startup configuration options
- Version display in other contexts (e.g., --version flag)
- Changes to MCP tool behavior or responses

## Constraints

**Critical Protocol Constraint:**
The MCP server uses stdio transport. The server communicates with clients via stdin/stdout using JSON-RPC. Any human-readable output MUST be written to **stderr** to avoid corrupting the protocol stream.

**Relevant Laws:**
- L01 (TypeScript Type Rigor): Version reading must be properly typed
- L02 (No Any Types): No `any` when parsing package.json
- L04 (Public API Test Coverage): If version reading is exported, it needs tests
- L07 (Testable Design): Version reading should be injectable for testing
- L10 (Documentation Accuracy): Update development.md if startup behavior changes
- L21 (Builder Docs Usage): Consult and update docs as needed

**Relevant Style:**
- Prefer standard library over third-party packages (use fs/path for reading package.json)
- Composition and dependency injection for testability

## Acceptance Criteria

1. When the server starts, it writes the following to stderr:
   ```
   🍎 Welcome to AppleScript MCP
   Version <version>

   ✅ Server now running...
   ```
   Where `<version>` is read from package.json at runtime.

2. The version is read dynamically from package.json—not hardcoded.

3. Output is written to stderr, not stdout.

4. The MCP protocol continues to function correctly (integration tests pass).

5. Type checking passes (`npm run typecheck`).

6. If a public function is introduced for version reading, it has tests covering success and failure cases.

## Risks / Notes

**Version Sync Observation:**
Currently the version appears in three places:
- `package.json` (line 3): `"version": "2.1.0"`
- `src/index.ts` (line 236): `version: '2.1.0'` in server config

The user requested reading from package.json for the banner. Consider whether the server config version should also be sourced from package.json for consistency. This may be in scope or explicitly deferred—clarify with Builder or handle as a follow-up Phase.

**Emoji Usage:**
The requested output includes emojis. This is startup feedback for humans (on stderr), not MCP response content, so it does not conflict with L17 (no extraneous content in MCP responses).

**Package.json Resolution:**
The package.json path must be resolved relative to the module location, not the current working directory, since npx may run from any directory.
