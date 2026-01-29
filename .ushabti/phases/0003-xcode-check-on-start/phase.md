# Phase 0003: Xcode Check on Start

## Intent

The AppleScript MCP Server depends on Xcode for the `sdef` command, which retrieves application scripting dictionaries. Without Xcode installed, the `get_app_dictionary` tool fails silently or with a confusing error, leaving users unable to discover what applications can do.

This Phase adds a startup check that verifies Xcode is installed before the server begins accepting requests. If Xcode is missing, the server exits immediately with a clear, actionable error message and a direct link to install Xcode from the Mac App Store.

## Scope

### In Scope

- Detect whether Xcode is installed at server startup
- Exit with a helpful error message if Xcode is not installed
- Include the Mac App Store link: https://apps.apple.com/us/app/xcode/id497799835?mt=12
- Display error message to stderr (consistent with startup banner)
- Exit with a non-zero exit code on failure

### Out of Scope

- Checking if Xcode Command Line Tools are installed (full Xcode is required for `sdef`)
- Checking if Xcode is properly selected via `xcode-select`
- Runtime re-checking of Xcode availability
- Prompting users to install Xcode interactively
- Checking other system requirements (permissions, macOS version, etc.)

## Constraints

**Protocol Constraint:**
All human-readable output MUST be written to stderr to avoid corrupting the MCP stdio protocol.

**Relevant Laws:**
- L01 (TypeScript Type Rigor): Check function must be properly typed
- L02 (No Any Types): No `any` when detecting Xcode
- L04 (Public API Test Coverage): If the check function is exported, it needs tests
- L05 (Execution Flow Coverage): Tests must cover both Xcode-present and Xcode-absent scenarios
- L07 (Testable Design): Xcode detection should be injectable for testing
- L10 (Documentation Accuracy): Update docs if startup behavior changes
- L21 (Builder Docs Usage): Consult and update docs as needed

**Relevant Style:**
- Prefer standard library (use child_process or fs for detection)
- Composition and dependency injection for testability
- Guard clauses for early exit
- Error messages are actionable with clear fix instructions

## Acceptance Criteria

1. When Xcode is not installed, the server writes an error message to stderr that includes:
   - A clear statement that Xcode is required
   - The Mac App Store link: https://apps.apple.com/us/app/xcode/id497799835?mt=12
   - Brief explanation of why Xcode is needed (for `sdef` command)

2. When Xcode is not installed, the server exits with a non-zero exit code.

3. When Xcode is installed, the server starts normally (startup banner displays, server runs).

4. The check happens before the server begins accepting MCP requests.

5. Output is written to stderr, not stdout.

6. Type checking passes (`npm run typecheck`).

7. The Xcode check function is testable (dependencies injectable) and has tests covering:
   - Xcode present: check passes
   - Xcode absent: check fails with expected error

8. Documentation updated to reflect the new startup requirement.

## Risks / Notes

**Detection Strategy:**
The recommended approach is to check for the existence of `/Applications/Xcode.app`. This is the canonical location and what `sdef` depends on. Checking if `sdef` itself works requires calling it, which may be slower and conflate "Xcode missing" with other errors.

**xcode-select Consideration:**
Even with Xcode installed, `sdef` may fail if the developer tools path is not set correctly. This Phase explicitly scopes out checking `xcode-select` configuration. A future Phase could add this check if users report issues.

**Error Message Tone:**
The error should be helpful, not alarming. Users encountering this are likely new to the tool and need guidance, not a wall of technical details.

**Exit Code:**
Using exit code 1 is standard for general errors. Consider whether a more specific exit code is warranted, but 1 is conventional and sufficient.
