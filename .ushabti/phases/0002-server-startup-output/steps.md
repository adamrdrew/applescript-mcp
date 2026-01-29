# Phase 0002: Steps

## S001: Create version utility module

**Intent:** Establish a testable, reusable mechanism for reading the package version.

**Work:**
- Create `src/version.ts` with a function to read version from package.json
- Use `import.meta.url` to resolve package.json path relative to the module (works regardless of cwd)
- Handle file read failures gracefully (return a fallback like "unknown")
- Export a typed interface for the result
- Avoid `any` types when parsing JSON

**Done when:**
- `src/version.ts` exists with an exported function
- Function returns version string or fallback
- `npm run typecheck` passes

---

## S002: Add unit tests for version utility

**Intent:** Verify the version reading logic handles success and failure cases.

**Work:**
- Create `src/version.test.ts`
- Test success case: returns version from valid package.json
- Test failure case: handles missing file gracefully (if injectable)
- Consider making file reading injectable for testability, or test via integration

**Done when:**
- Tests exist and pass
- Coverage includes success and error paths

---

## S003: Create startup banner function

**Intent:** Encapsulate the banner output logic for testability and clarity.

**Work:**
- Create a function (in `src/version.ts` or `src/startup.ts`) that formats the startup banner
- Accept version as a parameter (for testability)
- Return the formatted string (do not print directly)

**Done when:**
- Function exists and is exported
- Function returns properly formatted banner string

---

## S004: Add unit tests for banner formatting

**Intent:** Verify banner output matches specification exactly.

**Work:**
- Test that banner includes apple emoji, welcome message, version, and running message
- Test formatting with different version strings

**Done when:**
- Tests exist and pass
- Banner format matches acceptance criteria

---

## S005: Integrate startup banner into main()

**Intent:** Display the banner when the server starts.

**Work:**
- In `src/index.ts`, import the version and banner functions
- Call banner function before `server.connect()`
- Write output to `process.stderr` (not stdout, which is used by MCP protocol)

**Done when:**
- Starting the server displays the banner to stderr
- MCP protocol still functions (stdout not polluted)

---

## S006: Verify MCP protocol integrity

**Intent:** Confirm the startup output does not interfere with MCP communication.

**Work:**
- Run `npm run test:integration`
- Manually verify with a simple MCP client or Claude Desktop if possible

**Done when:**
- Integration tests pass
- Server responds correctly to MCP requests

---

## S007: Consider server config version sync

**Intent:** Evaluate whether the server config version should also use package.json.

**Work:**
- Review `createServer()` in `src/index.ts` line 236 where version is hardcoded
- Decide: sync this version with package.json, or leave as separate concern
- If syncing: update to use the version utility
- If not syncing: document the intentional difference in phase notes

**Done when:**
- Decision is made and implemented (or explicitly deferred)
- If changed, typecheck passes

---

## S008: Update documentation

**Intent:** Ensure docs reflect the new startup behavior.

**Work:**
- Update `.ushabti/docs/development.md` to mention startup banner
- Consider whether README needs update (startup output is now visible to users)
- Update release checklist if version is now read dynamically

**Done when:**
- Relevant docs are updated
- Documentation accurately describes current behavior

---

## S009: Final verification

**Intent:** Confirm all acceptance criteria are met.

**Work:**
- Run `npm run typecheck`
- Run `npm test`
- Run `npm run test:integration`
- Run `npm run build && npm start` and verify banner appears on stderr
- Verify version matches package.json

**Done when:**
- All checks pass
- All acceptance criteria verified
