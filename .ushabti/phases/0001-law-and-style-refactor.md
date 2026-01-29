# Phase 0001: Law and Style Refactor

## Phase Overview

**Objective:** Bring the pre-existing AppleScript-MCP codebase into compliance with project governance (laws and style) without changing functionality or core logic.

**Principle:** Implementation may change, but behavior persists.

**Scope:**
- Refactor code to comply with all 23 laws
- Apply style guide conventions
- Establish comprehensive test coverage
- Verify documentation accuracy

---

## Phase Work Units

This phase is organized into 6 work units, each targeting a specific system or concern. Each unit follows the pattern: **Audit → Refactor → Test → Integrate**.

---

## Work Unit 1: Type System Audit and Enforcement

**Target:** Laws L01, L02, L03

### 1.1 Audit Tasks

- [ ] Run `npm run typecheck` to establish baseline
- [ ] Scan all source files for explicit `any` usage
- [ ] Scan for implicit `any` (parameters without types, inferred `any`)
- [ ] Verify `tsconfig.json` has all required strict options
- [ ] Identify type guards that need strengthening

### 1.2 Refactor Tasks

- [ ] Eliminate any discovered `any` types
- [ ] Add missing parameter types
- [ ] Strengthen type guards in `src/types.ts`
- [ ] Add type guards for remaining tool parameters (currently only 2 exist)
- [ ] Consider adding branded types for critical identifiers

### 1.3 Verification

- [ ] `npm run typecheck` passes with zero errors
- [ ] No `any` types in codebase (grep verification)

### Files in Scope

```
src/types.ts
src/index.ts (parameter validation)
src/tools/*.ts (handler parameter types)
src/learning/*.ts
src/apple/*.ts
```

---

## Work Unit 2: Apple Integration Layer

**Target:** Laws L04, L05, L07, L08, L18, L19; Style readability

### 2.1 Audit Tasks

- [ ] Review `src/apple/executor.ts` for testability
- [ ] Review `src/apple/sdef-parser.ts` for testability
- [ ] Identify hard-coded dependencies that should be injectable
- [ ] Assess function sizes and complexity
- [ ] Document public API surface

### 2.2 Refactor Tasks

**executor.ts:**
- [ ] Extract timeout constants to injectable configuration
- [ ] Make `execFileAsync` injectable for testing (allows mocking osascript)
- [ ] Split `parseAppleScriptError` into smaller pattern handlers
- [ ] Apply guard clause style to error handling
- [ ] Strengthen `ExecError` type guard

**sdef-parser.ts:**
- [ ] Review regex-based parsing for robustness
- [ ] Extract magic numbers/strings to named constants
- [ ] Consider injectable cache for testing
- [ ] Apply guard clause patterns

### 2.3 Test Tasks

Create `src/apple/__tests__/` directory with:

- [ ] `executor.test.ts`:
  - Success path: script executes, returns stdout
  - Error path: script fails, returns parsed error
  - Timeout path: script killed after timeout
  - File execution path
  - SDEF retrieval path (success and failure)
  - App path finding (multiple search locations)
  - Scriptability check

- [ ] `sdef-parser.test.ts`:
  - Parse valid SDEF XML
  - Parse SDEF with class extensions
  - Handle malformed XML gracefully
  - Cache behavior (hit, miss, expiry)
  - Format dictionary for LLM output

### 2.4 Verification

- [ ] All tests pass
- [ ] `npm run typecheck` passes
- [ ] Existing integration test still passes

---

## Work Unit 3: Tools Layer - Core Tools

**Target:** Laws L04, L05, L07, L08, L13, L14; Style patterns

### 3.1 Audit Tasks

- [ ] Review `execute.ts` for testability and style
- [ ] Review `list-apps.ts` for testability
- [ ] Review `get-dictionary.ts` for testability
- [ ] Review `system-state.ts` for testability
- [ ] Verify safety system coverage (L13, L14)
- [ ] Document all public exports

### 3.2 Refactor Tasks

**execute.ts:**
- [ ] Extract `DANGEROUS_PATTERNS` to separate patterns module (for easier extension)
- [ ] Make `runScript` (imported executor) injectable
- [ ] Break `enhanceErrorMessage` into smaller, focused functions
- [ ] Apply guard clause style to long conditionals
- [ ] Extract `ScriptBuilder` to separate utility module

**list-apps.ts:**
- [ ] Make file system operations injectable for testing
- [ ] Extract known-scriptable-apps list to data file

**get-dictionary.ts:**
- [ ] Make SDEF retrieval injectable
- [ ] Extract cache management to reusable pattern

**system-state.ts:**
- [ ] Make script execution injectable
- [ ] Consider extracting individual state getters for unit testing

### 3.3 Test Tasks

Create tests in `src/tools/__tests__/`:

- [ ] `execute.test.ts`:
  - Safety analysis: none, low, medium, high, critical patterns
  - Blocking behavior for high/critical without confirmation
  - Pass-through with confirmation
  - Error message enhancement for each error type
  - ScriptBuilder output correctness
  - Timeout clamping behavior

- [ ] `list-apps.test.ts`:
  - Returns sorted app list
  - Handles empty directory
  - Handles mixed scriptable/non-scriptable apps

- [ ] `get-dictionary.test.ts`:
  - Returns formatted dictionary
  - Handles app not found
  - Handles app with no dictionary
  - Cache behavior

- [ ] `system-state.test.ts`:
  - Returns complete state object
  - Handles individual component failures gracefully
  - Truncates long clipboard content

### 3.4 Verification

- [ ] All tests pass
- [ ] Safety system covers all deletion operations (L14)
- [ ] `npm run typecheck` passes

---

## Work Unit 4: Tools Layer - Smart Tools

**Target:** Laws L04, L05, L07, L08, L15, L16, L17

### 4.1 Audit Tasks

- [ ] Review `smart-tools.ts` for testability
- [ ] Review `discover.ts` for testability
- [ ] Assess response token efficiency (L15)
- [ ] Verify responses are complete and actionable (L16)
- [ ] Check for extraneous content (L17)

### 4.2 Refactor Tasks

**smart-tools.ts:**
- [ ] Make pattern store and skill loader injectable
- [ ] Extract formatting logic to separate functions
- [ ] Apply guard clause patterns
- [ ] Review and optimize response payloads

**discover.ts:**
- [ ] Make dependencies injectable
- [ ] Consider caching for capability lookups
- [ ] Optimize response sizes

### 4.3 Test Tasks

Create tests in `src/tools/__tests__/`:

- [ ] `smart-tools.test.ts`:
  - getWorkflowPattern: with/without filters, empty results
  - analyzeScriptFailure: various error types
  - getAppSkillGuide: found, not found
  - getSmartSuggestion: pattern-based, skill-based, generic
  - getLearningStats: with data, empty store

- [ ] `discover.test.ts`:
  - General capabilities (no app)
  - App-specific capabilities
  - Running apps prioritization
  - Failure suggestions
  - Success suggestions

### 4.4 Verification

- [ ] All tests pass
- [ ] Response sizes are appropriate (spot check)
- [ ] `npm run typecheck` passes

---

## Work Unit 5: Learning System

**Target:** Laws L04, L05, L07, L08, L14, L18, L19

### 5.1 Audit Tasks

- [ ] Review `pattern-store.ts` for testability
- [ ] Review `skill-loader.ts` for testability
- [ ] Review `analyzer.ts` for testability
- [ ] Verify no data deletion without safety (L14)
- [ ] Assess extensibility of pattern matching

### 5.2 Refactor Tasks

**pattern-store.ts:**
- [ ] Make file system operations injectable
- [ ] Make data directory configurable (for testing)
- [ ] Extract keyword/action extraction to pure functions
- [ ] Clear separation between IO and logic
- [ ] Review `clearPatterns` for safety implications

**skill-loader.ts:**
- [ ] Make file system injectable
- [ ] Make skills directory configurable
- [ ] Extract parsing logic to pure functions

**analyzer.ts:**
- [ ] Make pattern store injectable
- [ ] Extract error pattern definitions to data structure
- [ ] Make Music-specific analysis pluggable

### 5.3 Test Tasks

Create tests in `src/learning/__tests__/`:

- [ ] `pattern-store.test.ts`:
  - logExecution: new pattern, existing pattern update
  - findSimilarPatterns: by app, by action, by keyword, empty
  - getBestPattern: found, not found
  - getPatternStats: with data, empty
  - clearPatterns: clears cache and files

- [ ] `skill-loader.test.ts`:
  - getAppSkill: found, not found
  - listAvailableSkills: with skills, empty
  - getRelevantExamples: matches by intent
  - getQuickReference: parses sections correctly
  - generateSkillContext: combines examples and notes

- [ ] `analyzer.test.ts`:
  - analyzeFailure: each error type
  - generateSmartErrorMessage: formats correctly
  - Music-specific fixes

### 5.4 Verification

- [ ] All tests pass
- [ ] clearPatterns includes safety consideration (or document exemption)
- [ ] `npm run typecheck` passes

---

## Work Unit 6: Entry Point and Integration

**Target:** Laws L04, L05, L10, L11, L12; Full integration

### 6.1 Audit Tasks

- [ ] Review `src/index.ts` for testability
- [ ] Verify tool registration completeness
- [ ] Verify type guards cover all tool parameters
- [ ] Cross-reference README with actual functionality
- [ ] Cross-reference `.ushabti/docs/` with code

### 6.2 Refactor Tasks

**index.ts:**
- [ ] Extract tool definitions to separate `tools/definitions.ts`
- [ ] Extract handler logic to tool-specific modules (reduce switch size)
- [ ] Make server configuration injectable for testing
- [ ] Add missing type guards for all tool parameters

### 6.3 Test Tasks

- [ ] Expand `scripts/test-server.js` to cover all tools:
  - list_scriptable_apps
  - get_app_dictionary (with mock app)
  - execute_applescript (safe script)
  - validate_applescript
  - get_system_state
  - get_workflow_pattern
  - analyze_failure
  - get_app_skill
  - get_smart_suggestion
  - get_learning_stats
  - discover_capabilities (already tested)

- [ ] Create unit test for tool routing logic

### 6.4 Documentation Verification

- [ ] README accuracy check:
  - Installation instructions work
  - Configuration examples are correct
  - Tool descriptions match implementation

- [ ] `.ushabti/docs/` reconciliation:
  - `architecture.md` matches actual structure
  - `types.md` matches actual types
  - `tools.md` matches actual tools
  - `safety.md` matches actual patterns
  - `learning.md` matches actual behavior
  - `apple-integration.md` matches actual APIs
  - `development.md` instructions work

### 6.5 Verification

- [ ] All unit tests pass
- [ ] Integration test passes
- [ ] Documentation matches code
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] Manual smoke test with Claude Desktop

---

## Testing Infrastructure

### Test Framework Setup

Before Work Unit 2, establish testing infrastructure:

- [ ] Add test framework (vitest recommended for ESM compatibility)
- [ ] Configure test scripts in `package.json`
- [ ] Create test utilities for common mocking patterns
- [ ] Establish test file conventions

### Proposed package.json additions:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:integration": "node scripts/test-server.js"
  },
  "devDependencies": {
    "vitest": "^1.0.0"
  }
}
```

---

## Phase Completion Criteria

Per Laws L03, L22, L23, this phase is complete when:

1. [ ] `npm run typecheck` passes with zero errors
2. [ ] No `any` types in codebase
3. [ ] All public APIs have unit tests
4. [ ] All execution flows are covered by tests
5. [ ] Tests make meaningful assertions (not cargo cult)
6. [ ] Dependencies are injectable for testing
7. [ ] Documentation is reconciled with code
8. [ ] README is accurate and actionable
9. [ ] Safety system covers all deletion paths
10. [ ] `npm run build` succeeds
11. [ ] `npm test` succeeds (unit tests)
12. [ ] `npm run test:integration` succeeds

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| Refactoring breaks functionality | Integration tests run after each work unit |
| Test mocking becomes complex | Extract pure functions where possible; limit mock depth |
| Large PR becomes unwieldy | Each work unit can be a separate PR if needed |
| Documentation drift during refactor | Update docs as part of each work unit, final reconciliation in WU6 |

---

## Execution Order

Recommended sequence:

1. **Testing Infrastructure** - Establish framework first
2. **Work Unit 1: Type System** - Foundation for all other work
3. **Work Unit 2: Apple Integration** - Lowest dependency layer
4. **Work Unit 5: Learning System** - Depends on types only
5. **Work Unit 3: Core Tools** - Depends on Apple + Learning
6. **Work Unit 4: Smart Tools** - Depends on Learning
7. **Work Unit 6: Entry Point** - Depends on all tools

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-29 | Initial phase plan | Ushabti Scribe |
