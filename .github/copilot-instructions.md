- Prefer functional code style
- Use memory to track progress, preferences, and lessons learned
- Commit after each successful build/test cycle, especially immediately after fixing the current cycle error
- Keep commit messages short but meaningful (e.g., "Fix cycle in azure client helpers")

# CRITICAL FSM-FIRST DEVELOPMENT RULES (ALWAYS ENFORCE)

## Core Architectural Principles
1. **ALL business logic MUST flow through FSM state machines** - No direct function chains that bypass FSM
2. **Use FSM context for ALL data passing** - If data isn't in FSM context, it's not traced
3. **Single-purpose, pure functions only** - Each function does ONE thing, accepts FSM context as parameter
4. **Make the application traceable and replayable** - Every operation must be logged in FSM context
5. **Eliminate function chains that bypass FSM** - All logic flows through state machines for traceability

## Critical Thinking Rule (MANDATORY)
**BEFORE implementing any logic, ask these questions:**
1. **"Are we recreating existing logic?"** - Check if this already exists elsewhere
2. **"Should this be computed once and stored?"** - Don't recalculate the same thing repeatedly
3. **"Are we duplicating data/URLs/configs?"** - Consolidate related data into single sources
4. **"Can this break existing working functionality?"** - Don't fix what isn't broken
5. **"Is this the simplest solution?"** - Prefer reusing existing working code over rewriting

**Implementation Rule**: If configuration exists (like `apiBaseUrl`), use it directly. Don't reconstruct URLs that are already built and stored. Setup happens once, runtime uses stored values.

## Mandatory Implementation Patterns
- **Pure Functions**: All business logic functions must be in `src/fsm/functions/` and accept FSM context
- **FSM Logging**: Use `fsmLogger` with structured context, never manual console.log
- **Data Flow**: External data → FSM context → pure functions → FSM actions → state transitions
- **Error Handling**: All errors flow through FSM error states with structured logging
- **Testing**: Pure functions are easily testable, FSM machines have predictable state transitions

## Code Organization Rules
- `src/fsm/functions/`: Pure functions organized by domain (auth, azure, etc.)
- `src/fsm/machines/`: XState machines that orchestrate business logic
- `src/fsm/types.ts`: Shared FSM context and event types
- `src/fsm/logging.ts`: Structured logging system with FSMComponent enum

## ESLint Enforcement
- Automated rules prevent Promise chains, enforce pure function patterns
- Function length limits (20 lines max)
- Complexity limits to ensure single responsibility
- Side effect detection and prevention

## Migration Strategy
1. Convert existing functions to pure functions with FSM context
2. Route all business logic through appropriate FSM machines
3. Replace manual logging with structured FSM logging
4. Ensure all data flows through FSM context for traceability

**Reference**: See `docs/FSM_FIRST_DEVELOPMENT_RULES.md` for complete implementation details and examples.

# AI Agent Quick Start (copilot-instructions)

Purpose: give an AI agent the exact, repository-specific knowledge it needs to be immediately productive.

1. Big picture (read these first)

- `src/activation.ts` — extension lifecycle, command registration, and the high-level orchestration for timer + Copilot flows.
- `src/timer.ts` — timer state machine, cap enforcement (`defaultElapsedLimitHours`), persistence hooks and public setters.
- `src/webview/*` — UI, message handlers, and draft persistence (per‑work‑item localStorage). Look for message types like `generateCopilotPrompt` and `stopAndApply`.
- `src/azureClient.ts` — Azure DevOps REST client patterns, expected PAT scopes (Work Items Read/Write, Code Read/Write, Build Read).
- `media/webview/` — static webview assets (HTML/JS) referenced by the extension.
- `mcp-server/` — minimal JSON-RPC server and method surface (see `mcp-server/README.md` for env vars and supported methods).

2. Developer workflows & exact commands

- Install & enable hooks: `npm ci` then `npm run prepare` (this runs `husky install`).
- Full build (webview + extension): `npm run build:all`.
- Extension-only compile/watch: `npm run compile` and `npm run watch`.
  // No webview dev server; assets are committed. Edit `src/webview/*` and rebuild locally if needed.
- Run unit tests: `npm test` (Mocha + esbuild-based ESM loader); if you see "Unknown file extension '.ts'" run tests via Node ESM loader: `node --loader @esbuild-kit/esm-loader tests/<file>.ts`.
- Run integration tests (activation/webview): `npm run test:integration` — invoked with Node + ts-node ESM loader.
- Formatting & pre-commit: `npm run format` (prettier) and `npm run check-format`; Husky + lint‑staged run Prettier on staged files.

3. Project-specific conventions & gotchas

- **FSM-FIRST ARCHITECTURE**: All business logic MUST flow through FSM state machines with structured logging
- **PURE FUNCTIONS ONLY**: Business logic in `src/fsm/functions/` must be pure functions with FSM context parameters
- **NO FUNCTION CHAINS**: Never create function chains that bypass FSM - everything goes through state machines
- **STRUCTURED LOGGING**: Use `fsmLogger` with FSM context, never manual console.log - traceability is critical
- ESM-first project: `package.json` sets `type: "module"`. Scripts, configs and test runners may need ESM-aware invocation (see tests above).
  // No Vite build required on CI; Node 20.x remains the baseline runtime for esbuild and tests.
- Commitlint is ESM: `commitlint.config.mjs` is used; commit-msg husky hook calls it with `--config ./commitlint.config.mjs`.
- Webview ↔ Extension message contract is authoritative — update tests when changing shapes.
- Timer is intentionally capped by `azureDevOpsIntegration.defaultElapsedLimitHours` (default 3.5 hrs) — the cap is enforced in `src/timer.ts` and is persisted with timer state.

  3.1 Do NOT edit built artifacts (critical)

- Never modify built or generated files directly. Changes to built files are ignored or get overwritten and will not be respected in packaged VSIX builds.
  - Do not edit: `dist/**`, `media/webview/main.js`, or any other generated assets.
  - Do edit: source files under `src/**` (for webview logic, use `src/webview/*.ts`) and then rebuild.
- Webview changes: make edits in `src/webview/main.ts` (and related TS files) and run the build. The committed `media/webview/main.js` should be produced by the build, not hand‑edited.
- Rationale: manual edits to built JS may diverge from the source, get lost on the next build, and may not be included in the VSIX you install for testing.
- If you need to adjust behavior temporarily for debugging, keep it in source behind a clearly labeled flag, not by patching built output.

4. Integration points (what to check before changing)

- Azure DevOps REST: `src/azureClient.ts` (axios calls). Confirm PAT scope & rate-limiter settings in `activation.ts` when increasing parallelism.
- MCP server (`mcp-server/`): if you add new methods, update README and the JSON-RPC schema tests.
  // Webview: ensure filenames remain `index.html` and `main.js` in `media/webview/` to keep extension HTML simple.

5. Safe, concrete edit patterns for AI

- **Adding FSM-first business logic** (REQUIRED PATTERN):
  1. Create pure function in `src/fsm/functions/[domain]/` that accepts FSM context
  2. Add function to appropriate FSM machine as an actor or action
  3. Use `fsmLogger` with structured context for all logging
  4. Ensure data flows through FSM context for full traceability
- Adding a webview message handler:
  1. Add handler in `src/webview/main.ts`.
  2. Add a corresponding branch in `src/activation.ts` that responds to the message and unit test the roundtrip.
  3. Add an integration test in `tests/integration/` that runs the full webview roundtrip.
- Changing timer persistence/shape:
  - Update `src/timer.ts` persistence schema and add migration handling in `activation.ts` (there are established helpers for persisted state).

6. Tests and CI

- CI runs using Node 20.x (workflows updated accordingly). If you see crypto/hash errors during Vite builds, upgrade Node to 20+.
- Tests are run under ESM. Mocha is invoked via Node with ts-node ESM loader in `package.json` scripts (this is intentional to support TypeScript in ESM mode).
- Formatting check is enforced in CI (`npm run check-format`) — run locally before creating PRs.

7. Short checklist for any PR touching critical flows

- Run `npm ci` and `npm run prepare`.
- Run `npm run format` and `npm run check-format`.
- Run `npm test` and `npm run test:integration` locally (or in a debug environment).
- If you change webview message types, update unit + integration tests that assert message shapes.
- Document any new settings under `package.json` contributes.configuration and add a brief line in `README.md`.

If anything above is vague or you'd like a short example added (test invocation, common message shapes, or an example PR checklist), tell me which section to expand and I will update this document.
