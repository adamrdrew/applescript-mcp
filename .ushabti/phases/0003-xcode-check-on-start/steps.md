# Phase 0003: Xcode Check on Start — Steps

## S001: Create Xcode check module

**Intent:** Provide a dedicated, testable module for Xcode detection, following the pattern established by `version.ts`.

**Work:**
- Create `src/xcode-check.ts`
- Implement `checkXcodeInstalled()` function that checks for `/Applications/Xcode.app`
- Make file system access injectable for testing (similar to `getPackageVersion` pattern)
- Return a result indicating presence/absence (not throwing)

**Done when:** The module exists, exports `checkXcodeInstalled()`, and compiles without errors.

---

## S002: Implement error message formatting

**Intent:** Provide a clear, actionable error message that helps users understand what to do.

**Work:**
- Add `formatXcodeMissingError()` function to `src/xcode-check.ts`
- Message must include:
  - Statement that Xcode is required
  - Why it is needed (for dictionary retrieval via `sdef`)
  - Mac App Store link: https://apps.apple.com/us/app/xcode/id497799835?mt=12
- Follow error message style conventions (actionable, not alarming)

**Done when:** Function exists and returns the complete error message string.

---

## S003: Integrate check into server startup

**Intent:** Ensure the Xcode check runs before the server accepts connections.

**Work:**
- Modify `src/index.ts` `main()` function
- After version reading and before banner display, check for Xcode
- If check fails:
  - Write error message to stderr
  - Exit with code 1
- If check passes, continue normal startup

**Done when:** Server startup includes the check and exits appropriately when Xcode is missing.

---

## S004: Write unit tests for xcode-check module

**Intent:** Verify the check function works correctly for both scenarios.

**Work:**
- Create test file for `xcode-check.ts` (location per project test conventions)
- Test case: Xcode present (injected file system returns exists)
- Test case: Xcode absent (injected file system returns not exists)
- Test case: Error message contains required elements (link, explanation)

**Done when:** Tests exist and pass, covering both present and absent scenarios.

---

## S005: Write integration test for startup behavior

**Intent:** Verify end-to-end behavior when Xcode is missing.

**Work:**
- Add or extend integration test in `scripts/`
- Test that server exits with non-zero code when Xcode check fails
- Test that error output includes expected message fragments
- Note: May require test harness modification to simulate missing Xcode

**Done when:** Integration test verifies startup fails correctly when Xcode is absent.

---

## S006: Verify normal startup still works

**Intent:** Ensure the change does not break the happy path.

**Work:**
- Run `npm run build && npm test` on a machine with Xcode installed
- Verify server starts normally and passes existing integration tests
- Verify startup banner still displays

**Done when:** Existing tests pass and server starts correctly with Xcode present.

---

## S007: Update documentation

**Intent:** Ensure docs reflect the new startup requirement.

**Work:**
- Update `.ushabti/docs/development.md` or relevant docs file
- Document the Xcode requirement as a startup prerequisite
- Document the error message users will see if Xcode is missing
- Verify `.ushabti/docs/apple-integration.md` already mentions Xcode requirement (it does); add cross-reference if needed

**Done when:** Docs accurately describe the startup check behavior and Xcode requirement.

---

## S008: Type check and final verification

**Intent:** Ensure the Phase meets all acceptance criteria.

**Work:**
- Run `npm run typecheck` — must pass
- Run `npm run build` — must succeed
- Run `npm test` — all tests must pass
- Manually verify error message output on a system without Xcode (if available) or via unit test output review

**Done when:** All verification steps pass and acceptance criteria are met.
