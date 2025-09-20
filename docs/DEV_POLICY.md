Developer Policy & Onboarding

Purpose

- Centralize expectations for contributors: coding standards, testing, CI gating, commit message rules, and release processes.

Quick Setup

1. Node: Use Node v20.19.x or later (CI uses Node 20.x; Node 22.x also works). Ensure Vite-compatible Node version (>= 20.19).
2. Install: npm ci
3. Bootstrap dev hooks: npm run prepare
4. Start webview dev: npm run webview:dev
5. Run extension in debug: use the provided launch configurations in .vscode/launch.json

Code style & formatting

- Formatting: Prettier (project .prettierrc) — run via npm run format.
- Linting: ESLint configured for TypeScript and Svelte; run via npm run lint.
  - ESM-only: This repository is ESM-first (package.json sets type: "module"). Do not use CommonJS (require/module.exports). The linter enforces this. Tests and scripts must run under ESM loaders.
- EditorConfig: project .editorconfig enforces tabs/spaces and EOL.

Testing

- Unit tests: Mocha + Chai in tests/. Run via npm test.
- Integration tests: @vscode/test-electron (smoke tests for activation + webview round-trip). Will be run in CI for PRs.
- PRs must include tests for new logic or UI changes.

Commit & PR conventions

- Commit messages must follow Conventional Commits (enforced by commitlint): e.g. feat(scope): add something
- Pull requests should have clear description, tests, and an assigned reviewer. Please rebase on main and keep PRs small.

Pre-commit hooks

- Changes will be auto-formatted and lint-checked via husky + lint-staged before commit.

CI gating

- PRs must pass: build, webview build, unit tests, lint, and format checks before merging.
- The main branch should always be green.

Release process

- Use semantic-release or manual tagging to create releases. Release pipeline will create VSIX and publish to Marketplace only from tagged releases.

Security & dependencies

- Dependabot is enabled for automated dependency updates; run `npm audit` as part of the release checklist.

Developer tips

- Use the staged .delete for archival code; do not remove until tests and CI pass.
- If you need to change message contracts between extension and webview, update tests that assert message shapes first.

ESM-only policy

- The root package.json declares "type": "module". Prefer .ts and .mjs modules and native ESM imports/exports.
- Avoid CommonJS patterns (require, module.exports). ESLint will flag these with no-restricted-syntax.
- Test runners and helper scripts use ESM (see scripts/*.mjs and scripts/run-esm-tests-cmd.mjs).
- The MCP server is also ESM (mcp-server/package.json sets type: "module").
- Node version guidance: Node >= 20.19 for Vite builds; CI runs Node 20.x; Node 22.x is supported locally.
