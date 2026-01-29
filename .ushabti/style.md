# Project Style Guide

## Purpose

This style guide defines how we build the AppleScript MCP Server. It complements the laws in `.ushabti/laws.md` (which define non-negotiable invariants) by establishing conventions, patterns, and expectations that promote consistency, clarity, and maintainability.

These conventions define the workmanship of the system.

---

## Core Philosophy: Code as User Interface

Code is an abstraction designed for humans, not machines. Computers would be happy with binary. Code is an affordance—a user interface for developers. Therefore:

- **We write code that is meant to be read.**
- Code should be clear and understandable above all else.
- We write not just for now, but for the future.
- We write **humane code**.

### The Humane Code Test

We have done our job if a Python, Ruby, Go, or Swift programmer can read our code and say:

> "Yeah, OK, I see what this is doing."

---

## Project Structure

```
applescript-mcp/
├── src/
│   ├── index.ts           # Entry point, MCP server setup
│   ├── types.ts           # Shared type definitions
│   ├── apple/             # Low-level macOS integration
│   │   ├── executor.ts    # osascript execution
│   │   └── sdef-parser.ts # Dictionary parsing
│   ├── tools/             # MCP tool handlers
│   │   ├── execute.ts     # Script execution with safety
│   │   ├── list-apps.ts   # App discovery
│   │   ├── get-dictionary.ts
│   │   ├── system-state.ts
│   │   ├── smart-tools.ts
│   │   └── discover.ts
│   └── learning/          # Pattern learning system
│       ├── pattern-store.ts
│       ├── skill-loader.ts
│       └── analyzer.ts
├── dist/                  # Compiled output (not in source control)
├── scripts/               # Development and test scripts
├── .ushabti/              # Project governance
│   ├── laws.md            # Non-negotiable invariants
│   ├── style.md           # This file
│   └── docs/              # Developer documentation
└── README.md              # User-facing documentation
```

### Module Boundaries

- **`src/apple/`**: Low-level macOS integration. No business logic. Pure execution and parsing.
- **`src/tools/`**: MCP tool handlers. Each file exports handlers for related tools. Contains business logic.
- **`src/learning/`**: Pattern storage, skill loading, error analysis. Isolated from tool handlers.
- **`src/types.ts`**: Shared type definitions. No runtime code except type guards.

### Ownership Expectations

- New MCP tools belong in `src/tools/`.
- New macOS integration belongs in `src/apple/`.
- Learning system extensions belong in `src/learning/`.
- Type definitions shared across modules belong in `src/types.ts`.

---

## Language and Tooling Conventions

### TypeScript

- **Version**: ES2022 target, NodeNext modules
- **Strict mode**: Always enabled. See `tsconfig.json` for full options.
- **No `any`**: Per Law L02, `any` types are forbidden.

### Build Tools

- `npm run build` — Compile TypeScript to `dist/`
- `npm run dev` — Watch mode for development
- `npm run typecheck` — Type check without emitting
- `npm test` — Run integration tests (requires build first)

### Dependencies

- Prefer standard library over third-party packages.
- Each new dependency requires justification.
- Keep `dependencies` minimal; development tools go in `devDependencies`.

---

## Readability Principles

### Naming

- Names say what they do, and do what they say.
- Longer names are better if they bring clarity.
- Avoid abbreviations unless universally understood (e.g., `url`, `id`).

**Preferred:**
```typescript
function analyzeScriptSafety(script: string): SafetyAnalysis
function enhanceErrorMessage(error: string, script: string): string
const DEFAULT_TIMEOUT = 30000;
```

**Avoid:**
```typescript
function analyze(s: string): SafetyAnalysis  // What are we analyzing?
function enhance(e: string, s: string): string  // Enhance what?
const TO = 30000;  // What is TO?
```

### Method Length

- Methods do one thing.
- If a method does multiple things, extract helper functions.
- Prefer many small, well-named functions over few large ones.

### Conditionality

- Limit conditional logic in favor of good design patterns.
- Prefer early returns over deeply nested conditionals.
- Use guard clauses to handle edge cases first.

**Preferred:**
```typescript
function processResult(result: Result | undefined): string {
  if (!result) {
    return 'No result';
  }

  if (!result.success) {
    return `Error: ${result.error}`;
  }

  return result.data;
}
```

**Avoid:**
```typescript
function processResult(result: Result | undefined): string {
  if (result) {
    if (result.success) {
      return result.data;
    } else {
      return `Error: ${result.error}`;
    }
  } else {
    return 'No result';
  }
}
```

### Side Effects

- Minimize side effects.
- Document side effects when they exist.
- Prefer pure functions where possible.

---

## Architectural Patterns

### Preferred

**Composition and Dependency Injection** (per Law L19)
```typescript
// Good: Dependencies are injectable
export async function executeAppleScript(
  script: string,
  timeout: number,
  options?: ExecuteOptions
): Promise<ToolResponse<ExecuteResult>>

// The executor can be injected for testing
```

**Type Guards for Runtime Validation**
```typescript
export function isExecuteParams(value: unknown): value is ExecuteParams {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj['script'] === 'string';
}
```

**Standard Response Wrapper**
```typescript
interface ToolResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

**Builder Pattern for Complex Construction**
```typescript
export const ScriptBuilder = {
  tell(appName: string, commands: string | string[]): string,
  activate(appName: string): string,
  dialog(message: string, options?: DialogOptions): string,
};
```

### Discouraged

**Deep Inheritance Hierarchies**
- Use composition over inheritance.
- Prefer interfaces and protocols for polymorphism.

**Magic Strings and Numbers**
- Extract constants with meaningful names.
- Use enums or union types for fixed sets of values.

**Regex When String Manipulation Suffices**
- Prefer standard string methods (`includes`, `startsWith`, `split`) over regex.
- Regex is acceptable when pattern matching is genuinely required (e.g., safety analysis).
- When regex is used, add a comment explaining the pattern.

**Language-Specific Arcana**
- Avoid deep TypeScript/JavaScript tricks that obscure meaning.
- Bias towards patterns that are language-independent.
- If a Python developer would not understand it, reconsider.

---

## Testing Strategy

Per Laws L04-L09, testing is rigorous but focused.

### What Must Be Tested

- Every public API (MCP tool handlers, exported functions and classes).
- Every execution flow: success paths, error paths, edge cases.

### What Does Not Require Tests

- Private/internal methods (tested indirectly through public API tests).
- Type definitions (validated by the compiler).

### Where Tests Live

- Test files in `scripts/` for integration tests.
- Unit tests alongside source files or in a `__tests__` directory (when added).

### Testing Principles

- Tests verify logic effectively—no cargo cult testing (Law L09).
- Mocks are easily injectable (Laws L07, L08).
- Tests operate within correct boundaries.

### Acceptable Tradeoffs

- Integration tests are acceptable for MCP protocol verification.
- Complex macOS interactions may require manual verification.

---

## Error Handling and Observability

### Error Messages

- Error messages are actionable.
- Include context: what failed, why, and how to fix it.
- Use the `enhanceErrorMessage` pattern for user-facing errors.

**Example from the codebase:**
```typescript
return `❌ ${appName} is not running.

HOW TO FIX:
1. Launch ${appName} manually, OR
2. Add 'activate' before your command:
   tell application "${appName}"
     activate
     -- your commands here
   end tell`;
```

### Logging

- Minimal logging in library code.
- Errors propagate via return values, not thrown exceptions (where practical).
- Use `ToolResponse` wrapper for consistent error handling.

---

## Performance and Resource Use

### Token Efficiency (per Laws L15-L17)

- MCP responses are designed for token efficiency.
- Avoid extraneous content in responses.
- Provide complete, actionable output—no incomplete responses that require follow-up.

### Timeout Handling

- Use bounded timeouts for external operations.
- Validate timeout values within acceptable ranges.
- Document timeout expectations.

### Common Pitfalls

- Large dictionary responses can consume significant tokens—consider filtering.
- Pattern learning stores data in `~/.applescript-mcp/`; manage storage growth.

---

## Review Checklist

Before code is considered complete, verify:

### Readability
- [ ] Names say what they do
- [ ] Methods are short and single-purpose
- [ ] Code is understandable without deep TypeScript knowledge
- [ ] A developer unfamiliar with the codebase can follow the logic

### Type Safety
- [ ] No `any` types (Law L02)
- [ ] Types are precise and meaningful
- [ ] Type guards validate external input

### Testing
- [ ] Public APIs have tests (Law L04)
- [ ] All execution flows are covered (Law L05)
- [ ] Tests make meaningful assertions (Law L09)

### Documentation
- [ ] Public API changes are documented (Law L10)
- [ ] README updated for user-facing changes (Law L11)
- [ ] Developer docs in `.ushabti/docs/` updated (Laws L21-L23)

### Safety
- [ ] Deletion operations are vetted (Law L14)
- [ ] New features consider safety implications (Law L13)

### Response Quality
- [ ] MCP responses are token-efficient (Law L15)
- [ ] Responses are complete and actionable (Law L16)
- [ ] No extraneous content (Law L17)

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-29 | Initial style guide creation | Ushabti Artisan |
