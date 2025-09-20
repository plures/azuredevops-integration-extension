- Prefer functional code style
- Use memory to track progress, preferences, and lessons learned

# AI Agent Quick Start (copilot-instructions)

Purpose: give an AI agent the exact, repository-specific knowledge it needs to be immediately productive.

1. Big picture (read these first)

- `src/activation.ts` — extension lifecycle, command registration, and the high-level orchestration for timer + Copilot flows.
- `src/timer.ts` — timer state machine, cap enforcement (`defaultElapsedLimitHours`), persistence hooks and public setters.
- `src/webview/*` — UI, message handlers, and draft persistence (per‑work‑item localStorage). Look for message types like `generateCopilotPrompt` and `stopAndApply`.
- `src/azureClient.ts` — Azure DevOps REST client patterns, expected PAT scopes (Work Items Read/Write, Code Read/Write, Build Read).
- `vite.webview.config.ts` & `webview/` — Vite build inputs and where webview assets are emitted (`media/webview`).
- `mcp-server/` — MCP tools protocol server over stdio (initialize → tools/list → tools/call). See `mcp-server/README.md` for env vars, supported tools, and legacy JSON‑RPC compatibility.

2. Developer workflows & exact commands

- Install & enable hooks: `npm ci` then `npm run prepare` (this runs `husky install`).
- Full build (webview + extension): `npm run build:all`.
- Extension-only compile/watch: `npm run compile` and `npm run watch`.
- Webview dev server (hot reload): `npm --prefix webview-svelte run dev` (run in parallel with extension watch).
- Run unit tests: `npm test` (Mocha + ts-node ESM loader); if you see "Unknown file extension '.ts'" run tests via Node ESM loader: `node --loader ts-node/esm tests/<file>.ts`.
- Run integration tests (activation/webview): `npm run test:integration` — invoked with Node + ts-node ESM loader.
- Formatting & pre-commit: `npm run format` (prettier) and `npm run check-format`; Husky + lint‑staged run Prettier on staged files.

3. Project-specific conventions & gotchas

- ESM-first project: `package.json` sets `type: "module"`. Scripts, configs and test runners use ESM. Avoid CommonJS (`require`, `module.exports`). Use Node >= 20.19 (CI uses Node 20.x; Node 22.x works too).
- Vite requires Node >= 20.19 for webview builds — CI and dev machines should use Node 20.x.
- Commitlint is ESM: `commitlint.config.mjs` is used; commit-msg husky hook calls it with `--config ./commitlint.config.mjs`.
- Webview ↔ Extension message contract is authoritative — update tests when changing shapes.
- Timer is intentionally capped by `azureDevOpsIntegration.defaultElapsedLimitHours` (default 3.5 hrs) — the cap is enforced in `src/timer.ts` and is persisted with timer state.

4. Integration points (what to check before changing)

- Azure DevOps REST: `src/azureClient.ts` (axios calls). Confirm PAT scope & rate-limiter settings in `activation.ts` when increasing parallelism.
- MCP server (`mcp-server/`): if you add new methods, update README and the JSON-RPC schema tests.
- Webview build: changes to `vite.webview.config.ts` affect output filenames and webview HTML references in the extension.

5. Safe, concrete edit patterns for AI

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
