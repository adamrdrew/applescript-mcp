# Development Guide

## Overview

This guide covers building, testing, and extending the AppleScript MCP server.

## Build Commands

```bash
npm run build      # Compile TypeScript to dist/
npm run dev        # Watch mode for development
npm run typecheck  # Type check without emitting
npm test           # Run integration tests (requires build first)
npm start          # Run the server (requires build first)
npm run clean      # Remove dist/
```

## Project Structure

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
├── package.json
├── tsconfig.json
└── CLAUDE.md                 # AI assistant instructions
```

## TypeScript Configuration

Key compiler settings in `tsconfig.json`:

```json
{
  "target": "ES2022",
  "module": "NodeNext",
  "moduleResolution": "NodeNext",
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true
}
```

**Important:**
- `noUncheckedIndexedAccess`: Array access returns `T | undefined` - always check before use
- `exactOptionalPropertyTypes`: Optional properties require explicit `| undefined` if they can be undefined
- Use `.js` extensions in imports (ESM requirement)

## Adding a New Tool

### 1. Define the tool in `src/index.ts`

Add to the `tools` array:

```typescript
{
  name: 'my_new_tool',
  description: 'What this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param1: {
        type: 'string',
        description: 'First parameter',
      },
    },
    required: ['param1'],
  },
},
```

### 2. Add the handler in the switch statement

```typescript
case 'my_new_tool': {
  const param1 = (args as { param1?: string })?.param1;
  if (typeof param1 !== 'string') {
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: false, error: '"param1" required' }) }],
      isError: true,
    };
  }

  const result = await myNewToolHandler(param1);
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    isError: !result.success,
  };
}
```

### 3. Implement the handler

Create a function in the appropriate module or create a new file in `src/tools/`:

```typescript
import type { ToolResponse } from '../types.js';

interface MyToolResult {
  // Define result structure
}

export async function myNewToolHandler(
  param1: string
): Promise<ToolResponse<MyToolResult>> {
  try {
    // Implementation
    return {
      success: true,
      data: { /* result */ },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### 4. Add type guard (optional)

If the tool has multiple parameters, add a type guard in `src/types.ts`:

```typescript
export interface MyToolParams {
  param1: string;
  param2?: number;
}

export function isMyToolParams(value: unknown): value is MyToolParams {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj['param1'] !== 'string') return false;
  if (obj['param2'] !== undefined && typeof obj['param2'] !== 'number') return false;
  return true;
}
```

## Testing

### Run Tests

```bash
npm run build && npm test
```

### Test Script Overview

`scripts/test-server.js` tests:
1. MCP initialize handshake
2. Server info (name, version)
3. Capabilities (tools enabled)
4. Tools list (expected tools present)
5. Tool execution (discover_capabilities)

### Adding Tests

Add test cases to `scripts/test-server.js`:

```javascript
// Test N: Your new test
output = '';
log('\n', 'Testing my_new_tool...');
sendRequest(server, 'tools/call', {
  name: 'my_new_tool',
  arguments: { param1: 'test value' },
}, N);

await new Promise(r => setTimeout(r, 500));

const myResponse = parseResponses(output).find(r => r.id === N);
if (myResponse && myResponse.result?.content) {
  const content = myResponse.result.content[0]?.text || '';
  if (content.includes('expected_output')) {
    success('my_new_tool: Works correctly');
    testsPassed++;
  } else {
    fail('my_new_tool: Unexpected output');
    testsFailed++;
  }
}
```

## Debugging

### Run with verbose output

```bash
node dist/index.js 2>&1 | tee server.log
```

### Test individual scripts

```bash
osascript -e 'tell application "Finder" to get name of startup disk'
```

### Check SDEF availability

```bash
sdef /Applications/Music.app | head -20
```

## Common Issues

### "sdef: command not found" or Xcode errors

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

### Permission errors

Enable in System Settings > Privacy & Security:
- Automation (for controlling apps)
- Accessibility (for keystrokes)
- Full Disk Access (for file operations)

### Module resolution errors

Ensure imports use `.js` extensions:
```typescript
import { foo } from './bar.js';  // Correct
import { foo } from './bar';     // Wrong
```

## Dependencies

### Runtime

- `@modelcontextprotocol/sdk`: MCP server SDK

### Development

- `typescript`: Compiler
- `@types/node`: Node.js type definitions

## Configuration Files

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json`:

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

### Claude Code (global)

`~/.claude/settings.json`:

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

### Claude Code (project)

`.mcp.json` in project root:

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

## Release Checklist

1. Update version in `package.json`
2. Update version in `src/index.ts` (server version)
3. Run `npm run build`
4. Run `npm test`
5. Test manually with Claude Desktop
6. Commit and tag
