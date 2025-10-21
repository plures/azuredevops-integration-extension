# Architecture & Security Notes

This document captures implementation details that were trimmed from the main README for brevity.

## Webview architecture

- **Svelte-based UI** with static assets committed under `media/webview/` (e.g., `svelte-main.js`, `svelte.html`). This provides a modern, reactive UI with excellent developer experience.
- The webview and extension communicate via the VS Code `postMessage` bridge with a clear message contract (see `src/activation.ts` and `src/webview/svelte-main.ts`).
- **Single UI System**: Only Svelte UI is supported - no legacy fallback to ensure consistency and maintainability.

## ESM-first build

- The repo is ESM‑first (`"type": "module"`). The extension is bundled with esbuild to `dist/extension.cjs` and runs on VS Code’s Node 20 runtime.
- Unit tests run via the Mocha CLI with the ts-node ESM loader; integration tests run via `@vscode/test-electron`.

## Content Security Policy (CSP)

- Strict CSP: `default-src 'none'`; module scripts with a per‑load nonce; images limited to the webview origin and data URLs; styles from the webview origin.
- No remote network access from the webview.

## Rate limiting

- Azure DevOps REST calls are guarded by a token‑bucket rate limiter (`apiRatePerSecond`, `apiBurst` settings) and resilient retry logic.

## CI test-runner note

The CI job runs the project's tests via `npm test`, which uses an ESM wrapper (`scripts/run-esm-tests-cmd.mjs`) to launch the Mocha CLI with the ts-node ESM loader.

To ensure ESM + ts-node based tests don't leave Node running indefinitely on CI, the runner currently:

- Spawns the Mocha CLI with `--exit` so Mocha forces process termination when tests finish.
- Uses a watchdog (2-minute timeout) that kills the test process if it does not exit in a timely manner.

Why this exists

Some tests and helpers (especially when using ESM loaders and runtime helpers) can leave background timers or handles active which prevent the Node process from exiting cleanly. The `--exit` + watchdog approach prevents CI jobs from hanging while we track down and fix these leaks.

How to remove the forced-exit behavior

Once lingering handles are fixed and tests cleanly shut down, the `--exit` option and the watchdog can be removed from `scripts/run-esm-tests.mjs` (called by the cmd wrapper). See the `Root-cause lingering handles` TODO for follow-up steps.
