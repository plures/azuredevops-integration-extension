# VS Code Extension Development Best Practices

## Foundation and Project Setup

- **Start with a clear contract:** Decide which VS Code surfaces you need (commands, views, webviews, notebooks) and outline activation events and contribution points early. Keep activation lazy; prefer `onCommand`, `onView`, or `workspaceContains` over wildcard activation.
- **Organize source cleanly:** Separate extension host code (for example `src/`), webviews (`src/webview/`), tests (`tests/`), and build scripts (`scripts/`). Generated output belongs in `dist/` or `out/`; never hand-edit compiled assets.
- **Choose one module system:** Commit to ESM or CJS. For modern tooling, use `"type": "module"` and ensure test runners/build scripts invoke Node with the appropriate loader (e.g., `node --loader ts-node/esm`).
- **Automate bootstrap:** Document `npm ci` and `npm run prepare` in the README. Ship husky + lint-staged hooks so formatting and linting run automatically.

## Architecture and Activation

- **Keep `activate` slim:** Treat the entrypoint as orchestration. Register commands, initialize singleton services (clients, timers, caches), and push disposables into the shared extension context.
- **Modularize services:** Encapsulate external clients, persistence, and long-lived processes in dedicated classes with minimal APIs.
- **Manage state intentionally:** Use `workspaceState` for project-level persistence, `globalState` for user preferences, and fall back to lightweight databases/files only when necessary.
- **Mind performance budgets:** Keep activation under ~100 ms. Defer heavy work until explicitly triggered and yield to the event loop when doing multi-step initialization.

## Commands, Views, and Message Contracts

- **Command hygiene:** Validate arguments, guard against concurrent invocations, and use `try/finally` to end progress indicators cleanly.
- **Tree and data views:** Back views with models that support incremental refresh. Cache last-known data and debounce remote fetches to respect rate limits.
- **Typed message contracts:** For webviews or long-running tasks, define TypeScript interfaces for request/response payloads. Version payloads if they might evolve and use discriminated unions to keep both sides type-safe.

## Webviews and UI

- **Bundle webviews:** Author UI in TypeScript/Svelte/React and bundle with esbuild or Vite into a single JS/CSS pair served via `webview.asWebviewUri`.
- **Harden security:** Apply strict CSP (`default-src 'none'; img-src ...; script-src 'nonce-...'; style-src ...`). Avoid inline scripts, `eval`, and unsanitized HTML. Validate every inbound message.
- **Persist responsibly:** Use `localStorage` or IndexedDB inside the webview for drafts. Synchronize durable decisions back to the extension through structured messages.
- **Honor accessibility:** Follow VS Code design language, ensure keyboard navigation, add ARIA labels, and manage focus explicitly.

## Tooling, Build, and Tests

- **Standardize build scripts:** Provide `npm run compile` for extension host code, `npm run build:webview` for webviews, and `npm run build:all` for CI packaging.
- **Keep TypeScript strict:** Enable `noImplicitAny`, `strictNullChecks`, and `exactOptionalPropertyTypes`. Use dedicated `tsconfig` overrides for tests instead of weakening production settings.
- **Layered testing:**
  - Unit tests (Mocha/Jest) for services, parsers, and state machines.
  - Integration tests with VS Code’s Extension Test Runner for activation, commands, and view wiring.
  - Webview tests via Playwright or jsdom when UI logic becomes complex.
- **Track coverage:** Use `nyc`/`c8` to monitor coverage, enforce thresholds, and publish HTML reports for reviewers.

## Telemetry, Logging, and Diagnostics

- **Define telemetry schemas:** Document event names, properties, and measurements. Respect user consent by checking `isTelemetryEnabled`.
- **Centralize logging:** Use a shared `OutputChannel`, annotate logs with feature area and log level, and throttle repetitive messages.
- **Surface actionable errors:** Wrap async commands in `try/catch`, show friendly error notifications, and include next steps (e.g., open developer tools, share logs).
- **Ship diagnostics tools:** Provide scripts to gather logs, reproduce issues, or validate setup (`scripts/diagnose-*.ts`).

## Security and Privacy

- **Guard secrets:** Store tokens in `vscode.SecretStorage`. Scope external API keys and never persist them in plaintext.
- **Sanitize content:** Clean HTML before injecting into webviews (DOMPurify or equivalent). Reject unexpected message payloads.
- **Least privilege:** Request only the contributions and capabilities you truly need. Document external services in the README.
- **Maintain dependencies:** Lock versions, run `npm audit`, and respond quickly to advisories.

## Release Engineering

- **Follow semver:** Update `CHANGELOG.md` and user-facing docs for every release. Communicate breaking changes clearly.
- **Automate packaging:** Use `vsce package` (or `@vscode/vsce`) in CI to produce VSIX artifacts; sign binaries if distributing outside the Marketplace.
- **Validate in CI:** Run formatting, linting, unit, integration, and packaging steps before publishing. Include smoke tests that launch the extension headless.
- **Feature flags enable agility:** Gate risky or experimental features behind settings so they can ship iteratively.

## Collaboration and Process

- **Document contributions:** Maintain `CONTRIBUTING.md`, an architecture overview, and quick-start instructions (debug profiles, common scripts).
- **Design reviews:** Share message schemas, telemetry plans, and UX mockups before building.
- **Disciplined issue triage:** Label bugs vs. features, capture repro steps, include extension + VS Code versions, and track SLA.
- **Retrospectives:** After each significant release, note successes, pain points, and automation opportunities.

## Continuous Improvement

- **Close the feedback loop:** Offer feedback commands, watch Marketplace reviews, and instrument usage (with consent) to detect churn.
- **Monitor performance:** Profile activation and webview load times periodically; track regressions with simple dashboards.
- **Experiment carefully:** Adopt proposed APIs behind guards; fall back gracefully if APIs change.
- **Treat docs as code:** Review documentation changes like any PR to keep onboarding material fresh.
