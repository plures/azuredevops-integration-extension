# Svelte UI Plan

This document outlines how we will extract and build a reusable Svelte UI for web and mobile, maximizing reuse of existing logic and components.

## Goals

- Reuse as much of the existing webview UI and TypeScript logic as possible
- Create a shared core package for logic (ADO client, timer, rate limiter, normalization)
- Stand up a SvelteKit app for web/PWA
- Wrap the web app for iOS/Android via Capacitor
- Keep the VS Code extension webview working using the same components
- Embrace local-first architecture: UI reads from local stores; sync runs in the background with deltas

## Proposed Monorepo Layout

- packages/
  - core/ — platform-agnostic TS logic (axios-based ADO client, timer, rate limiter, types)
  - ui-web/ — Svelte components (lists, filters, Kanban, timer HUD, dialogs)
- apps/
  - extension/ — current VS Code extension, imports packages/core and packages/ui-web
  - app-web/ — SvelteKit app (web/PWA), imports packages/ui-web and packages/core
  - app-mobile/ — Capacitor wrapper for iOS/Android pointing to SvelteKit build

## Extraction Steps

1. Core extraction (packages/core)

- Move: `src/azureClient.ts`, `src/timer.ts`, `src/rateLimiter.ts`, `src/workItemNormalize.ts`, shared types
- Add small interfaces for storage and logging; provide impls per app (extension, web, mobile)
- Ensure axios uses browser/RN-friendly adapter (default) and no Node-only APIs

1. Data core + stores

- Add repository interfaces, event bus, and sync engine contracts (local-first)
- Add UI-facing store skeletons (readable/writable + derived) subscribed to repo events

1. UI extraction (packages/ui-web)

- Move generic Svelte components from the webview
- Keep VS Code-specific message wiring inside apps/extension only; pass props/events instead

1. SvelteKit app (apps/app-web)

- Screens: Connect (org/project/PAT/OAuth), Work Items, Timer, Pull Requests, Time Report
- Storage: IndexedDB abstraction; configure base URL and PAT/OAuth
- PWA: add manifest, offline caching for shell

1. Mobile shell (apps/app-mobile)

- Capacitor project; use Secure Storage plugin for secrets
- Load the SvelteKit build; minimal lifecycle hooks

## Milestones

- M0: Data core contracts + mocked sync; Svelte store layer proves reactivity
- M1: ADO adapter read-only sync; extension reads from local stores (parity UI)
- M2: Outbox writes for timer stop flow and comments; optimistic updates
- M3: Mobile shell with offline cache and secure storage; end-to-end sync
- M4: Polish (OAuth optional), beta release

## Risks & Mitigations

- Background timers on mobile — compute elapsed from timestamps on resume; don’t rely on continuous background processing
- Secure secret storage — use VS Code SecretStorage (extension) and Capacitor Secure Storage (mobile)
- Network variability — reuse rate limiter and retry logic; allow config overrides

## Acceptance

- Same WI shapes across platforms
- Timer flows and stop proposal work end-to-end
- Packaged apps (web PWA and mobile) using shared code

## Migration path and feature flag

We will ship the Svelte-based UI behind a feature flag to avoid disrupting the stable extension UI while we validate parity.

- Setting name: `azureDevOpsIntegration.experimentalSvelteUI` (boolean, default `false`)
- Scope: User + Workspace settings; toggled at runtime (requires webview reload)
- Behavior: When `true`, the Work Items webview boots the store-backed Svelte UI; when `false`, it keeps the current UI.
- Telemetry: None by default; if `enableAnalytics` is on, we may emit a coarse "svelteUIEnabled" boolean for session counts (no PII).

Implementation notes (extension side):

- In `src/activation.ts`, when creating the webview HTML, branch by configuration to point at the new webview entry bundle.
- Keep the message contract stable. If new messages are needed, version them (e.g., `ui:svelte:<topic>`), and gate handlers by the same flag.
- Do not change timer/storage/runtime behavior outside the webview in the initial phase.

## Parity checklist (must-have before default-on)

- Work items:
  - Load My Work Items, Current Sprint (team-aware), All Active, Recently Updated
  - Search/filter by sprint, type, Assigned To; sort consistency with existing UI
- Work item details:
  - Open detail view, show fields used by stop flow (e.g., Completed/Remaining)
  - Draft notes are persisted per work item locally
- Timer:
  - Start/Pause/Resume/Stop from webview
  - Inactivity auto-pause/resume respected; 3.5h default elapsed cap applied on stop
  - Stop proposals generated and editable; optional Copilot summary comment
- PRs:
  - Show My Pull Requests; Create Pull Request flow starts with preferred repositories
- Time report:
  - Today/Week/Month/All time view parity

## Rollout stages

1. Internal: Feature flag default off. Manual opt-in. CI runs both old and new UI integration tests gated by the flag.
2. Canary: Default off; announce in README with instructions to opt in; gather feedback.
3. Default-on: Flip default to `true` for insiders builds; maintain the old UI behind a fallback flag for one minor version.
4. Remove legacy UI: After parity confidence and usage, remove the legacy UI code path.

## Tests mapping and coverage

Add or adapt tests to exercise both UI paths:

- Unit tests (stores and repo wiring):
  - Reactive store tests (already added) for filters and derived views
  - Repository event propagation → store updates
- Integration tests (webview roundtrip):
  - Add an integration test suite variant that launches the webview with `experimentalSvelteUI=true`
  - Verify message shapes for timer commands, queries, and stop flow
- Equivalence tests (golden flows):
  - A small set of flows (Start → Pause → Resume → Stop, Create WI, Create PR) run once with legacy UI and once with Svelte UI; assert same extension-side effects

Documentation updates:

- When we introduce the setting, add it under `package.json` contributes.configuration and document in README with a short callout.
