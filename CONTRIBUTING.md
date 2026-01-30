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

## Developer Documentation
For in-depth documentation see the [Project Documentation](.ushabti/docs/index.md).

