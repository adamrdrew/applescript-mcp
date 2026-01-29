# Project Laws

## Preamble

These laws define the non-negotiable invariants for the AppleScript MCP Server project. They apply to all Phases, implementations, and refactors. Compliance is verified during Overseer review before any Phase can be marked complete.

Laws use RFC 2119 language: MUST, MUST NOT, SHOULD, SHOULD NOT, MAY.

---

## Laws

### L01 — TypeScript Type Rigor

- **Rule:** The project MUST use TypeScript. The type system MUST be used rigorously to prevent bugs at compile time.
- **Rationale:** Static typing catches errors early and documents intent. Rigorous use maximizes these benefits.
- **Enforcement:** Code review verifies types are precise and meaningful, not merely satisfying the compiler.
- **Exceptions:** None.

---

### L02 — No Any Types

- **Rule:** The `any` type MUST NOT be used, whether explicit or implicit. The `noImplicitAny` compiler flag MUST be enabled.
- **Rationale:** `any` defeats the type system and allows bugs to escape detection.
- **Enforcement:** `tsc --noEmit` must pass. Code review rejects any use of `any`. The `tsconfig.json` must have `"noImplicitAny": true`.
- **Exceptions:** None.

---

### L03 — Type Checks at Phase Boundaries

- **Rule:** `tsc` type checks MUST pass when transitioning between Phases and when verifying work.
- **Rationale:** Type errors must not accumulate or be deferred.
- **Enforcement:** Overseer runs `npm run typecheck` before approving Phase completion.
- **Exceptions:** None.

---

### L04 — Public API Test Coverage

- **Rule:** Every public API MUST have tests. Public API includes: (a) MCP tool handlers exposed to clients, and (b) any exported function or class from a module.
- **Rationale:** Public APIs are contracts. Untested contracts are unverified promises.
- **Enforcement:** Code review verifies test existence. New public APIs without tests are rejected.
- **Exceptions:** None.

---

### L05 — Execution Flow Coverage

- **Rule:** Tests for public APIs MUST cover every possible execution flow, including success paths, error paths, and edge cases.
- **Rationale:** Partial coverage leaves bugs undetected.
- **Enforcement:** Code review assesses whether all branches and conditions are exercised.
- **Exceptions:** None.

---

### L06 — Private Methods Do Not Require Tests

- **Rule:** Private methods (non-exported, internal implementation) do not require direct tests.
- **Rationale:** Private methods are tested indirectly through public API tests. Direct testing couples tests to implementation details.
- **Enforcement:** Code review does not require tests for private methods.
- **Exceptions:** None.

---

### L07 — Testable Design

- **Rule:** Classes and types MUST be designed for testability using dependency injection and composition.
- **Rationale:** Hard-wired dependencies make code untestable without integration-level complexity.
- **Enforcement:** Code review verifies that dependencies can be injected and mocked.
- **Exceptions:** None.

---

### L08 — Test Boundary Integrity

- **Rule:** Tests MUST operate within correct boundaries. Mocks MUST be easily injectable to test only the intended boundary.
- **Rationale:** Tests that cross boundaries become integration tests, which are slower and harder to diagnose.
- **Enforcement:** Code review verifies mock injection points exist and are used appropriately.
- **Exceptions:** None.

---

### L09 — No Cargo Cult Testing

- **Rule:** Tests MUST verify logic effectively. Tests MUST NOT exist merely for coverage metrics or appearance.
- **Rationale:** Tests that do not assert meaningful behavior waste effort and create false confidence.
- **Enforcement:** Code review assesses whether tests make meaningful assertions about behavior.
- **Exceptions:** None.

---

### L10 — Documentation Accuracy

- **Rule:** Documentation MUST be kept accurate and up-to-date at all times. Changes to public APIs (MCP tools and exported functions/classes) that are not reflected in documentation are invalid.
- **Rationale:** Stale documentation misleads users and developers.
- **Enforcement:** Overseer verifies documentation reflects code changes before Phase completion.
- **Exceptions:** Private/internal implementation changes do not require documentation updates.

---

### L11 — README as User Gateway

- **Rule:** The README MUST be the primary user gateway. It MUST contain clear, accurate, actionable information on usage, installation, and operation. It MUST be approachable for new users and complete for veteran users.
- **Rationale:** The README is often the first thing users see. Poor README quality blocks adoption.
- **Enforcement:** Code review assesses README clarity, accuracy, and completeness when user-facing changes occur.
- **Exceptions:** None.

---

### L12 — README Depth and Linking

- **Rule:** The README SHOULD NOT contain developer-level implementation depth. It MUST link to `.ushabti/docs` for developer documentation.
- **Rationale:** Keeping user and developer documentation separate maintains clarity for both audiences.
- **Enforcement:** Code review verifies README links to `.ushabti/docs` and does not duplicate developer content.
- **Exceptions:** None.

---

### L13 — Safety System Investment

- **Rule:** The project MUST invest in safety systems to prevent users and agents from destroying data without sufficient warning and confirmation.
- **Rationale:** This project provides inherently dangerous capabilities (macOS automation). Safety is a core responsibility.
- **Enforcement:** Code review assesses whether new features consider safety implications.
- **Exceptions:** None.

---

### L14 — Delete Operation Vetting

- **Rule:** Any operation or behavior that can delete data of any kind MUST be vetted by the safety system. This applies to all code paths, not just AppleScript execution (e.g., pattern store cleanup, file operations).
- **Rationale:** Data loss is irreversible. All deletion paths must be guarded.
- **Enforcement:** Code review verifies that any new deletion capability integrates with the safety system or has equivalent protections.
- **Exceptions:** None.

---

### L15 — Token Efficiency

- **Rule:** MCP server responses MUST be designed with token efficiency in mind. Tokens are costly.
- **Rationale:** LLM context windows are finite and token usage has direct cost implications.
- **Enforcement:** Code review assesses response payload size and information density.
- **Exceptions:** None.

---

### L16 — Complete Actionable Output

- **Rule:** MCP responses MUST provide complete, actionable output required for each response type.
- **Rationale:** Incomplete responses force additional round-trips, wasting tokens and time.
- **Enforcement:** Code review verifies responses contain all information needed for the next action.
- **Exceptions:** None.

---

### L17 — No Extraneous Response Content

- **Rule:** MCP responses MUST be clear of extraneous clutter.
- **Rationale:** Unnecessary content wastes tokens and obscures important information.
- **Enforcement:** Code review assesses whether response content can be reduced without losing utility.
- **Exceptions:** None.

---

### L18 — Extensible Design

- **Rule:** All code MUST be designed to be extended, maintained, and to grow.
- **Rationale:** Software that cannot evolve becomes legacy.
- **Enforcement:** Code review assesses whether new code follows extensibility patterns.
- **Exceptions:** None.

---

### L19 — Composition and Dependency Injection

- **Rule:** Code MUST use composition and dependency injection for extensibility and testability.
- **Rationale:** Inheritance and hard-wired dependencies create rigid, untestable code.
- **Enforcement:** Code review verifies composition patterns and injectable dependencies.
- **Exceptions:** None.

---

### L20 — Scribe Docs Consultation

- **Rule:** Scribe MUST consult `.ushabti/docs` to inform Phase planning. Understanding documented systems is prerequisite to coherent planning.
- **Rationale:** Planning without understanding existing architecture leads to incoherent or conflicting designs.
- **Enforcement:** Scribe Phase output must reference relevant docs where applicable.
- **Exceptions:** None.

---

### L21 — Builder Docs Usage and Maintenance

- **Rule:** Builder MUST consult `.ushabti/docs` during implementation and MUST update docs when code changes affect documented systems.
- **Rationale:** Docs are both a resource and a maintenance responsibility.
- **Enforcement:** Overseer verifies docs are updated alongside code changes.
- **Exceptions:** Changes that do not affect documented systems do not require doc updates.

---

### L22 — Overseer Docs Reconciliation

- **Rule:** Overseer MUST verify that docs are reconciled with code changes before declaring a Phase complete.
- **Rationale:** Stale docs are defects.
- **Enforcement:** Phase completion checklist includes docs reconciliation.
- **Exceptions:** None.

---

### L23 — Phase Completion Requires Docs Reconciliation

- **Rule:** A Phase MUST NOT be marked GREEN/complete until docs are reconciled with the code work performed during that Phase.
- **Rationale:** Deferred documentation becomes forgotten documentation.
- **Enforcement:** Overseer blocks Phase completion until docs are verified current.
- **Exceptions:** None.

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-01-29 | Initial inscription of 23 laws | Ushabti Lawgiver |
