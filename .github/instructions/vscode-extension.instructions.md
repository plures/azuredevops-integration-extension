# Azure DevOps Integration Extension – Architecture Guardrails

## Core Product Intent

- Hydrate the application state (Facts) from persisted settings on activation; never start with an empty runtime when configuration exists.
- Represent every Azure DevOps connection as its own tab container. A tab owns all UI and state beneath it: authentication status, filters, timers, drafts, and history. Switching tabs hides all other tabs’ content and fully activates the selected connection.
- Deliver a low-friction cockpit for work items: fast filtering, intuitive time tracking, and focused comment composition.

## Architectural Principles (PRAXIS-FIRST)

- **Praxis-first flow:** All business logic moves through Praxis Rules and Flows. The extension host, webview, and data actors interact via Events and Facts.
- **Pure functions only:** Place business logic in pure functions (Rules). They accept Facts/Events, return new Facts, and never mutate shared state or touch VS Code APIs directly.
- **Facts are the source of truth:** Active connection, auth state, timers, filters, drafts, branch context—everything that matters lives inside the Praxis Fact store so it can be replayed and inspected.
- **Structured logging:** Use the Praxis logging system for every logworthy event. Remove ad-hoc console logging before commit.
- **Deterministic hydration:** Reuse normalized configuration values (URLs, IDs, auth metadata, preferences). Do not recompute or duplicate them.
- **Functional-first implementation:** Prefer functional code style. Compose behaviour from pure helpers that receive context and data rather than relying on mutation.

## Webview & Reactive UX

- Svelte v5 components read reactive stores derived from Praxis Facts. They do not issue side effects or reimplement business rules.
- Build each tab as a shell component that receives a connection-specific view model. Shells render work-item lists, timers, and notes for their connection only.
- Filters, searches, and sort controls dispatch intent Events. The Praxis engine interprets them and coordinates providers so host and webview stay synchronized.
- Authentication prompts and manual sign-in UI render solely inside the owning tab.

## Extension Host Responsibilities

- On activation: load settings, normalize connections, and send an `APP_BOOTSTRAP` event with hydrated facts to the engine.
- When a connection is selected: refresh providers, timers, and drafts for that connection, then post a single `CONNECTION_VIEW_STATE` message to the webview.
- Route every webview message through the Praxis engine. Example: `{ type: 'setActiveConnection', connectionId }` → `engine.dispatch({ type: 'SELECT_CONNECTION', connectionId })`.
- Keep data actors (work-item providers, timer persistence, auth handlers) thin and pure so Rules remain testable.

## Testing & Quality Gates

- Unit-test pure functions (Rules) for hydration logic, tab state projection, filter composition, and timer calculations.
- Maintain Praxis Schemas (PSF) and diagrams whenever logic changes.
- Add integration tests validating tab switching, auth reminders, filter application, timer flow, and comment drafting.
- Manual regression: start with multiple connections, switch tabs, authenticate, apply filters, and exercise timers before release.

## Change Workflow

1. **Plan** the Fact/Event updates and tab UX implications before editing.
2. **Implement** pure Rules, Praxis definitions, and Svelte components together to keep data flow coherent.
3. **Validate** with `npm test`, `npm run test:integration`, and a smoke run covering multi-connection scenarios.
4. **Document** updates to settings, Rules, or user workflows in the Praxis Schema, using principles of self documenting code. Update the big picture summaries in `docs/`, changelog, and the README as needed.

These guardrails keep the Praxis-driven, multi-connection experience coherent and ensure every tab delivers the focused productivity flow the extension promises.

## Continuous Learning

- Regularly consult the latest official references for the core stack: Git best practices, TypeScript docs, Svelte 5 guides, Praxis documentation, the VS Code Extension API, Azure DevOps documentation, and Agile development guidance. Keep instructions aligned with upstream changes.

## AI Assistant Operating Guidelines

- Track progress, preferences, and lessons learned while working; reuse them to speed up future iterations.
- Apply the **Critical Thinking Rule** before writing code:
  1.  **"Is this logic visualizable?"** - Can I draw this flow in CodeCanvas?
  2.  **"Is this a pure rule?"** - Does it just transform data, or does it have side effects?
  3.  **"Should this be in the Framework?"** - Is this a generic pattern that belongs in `praxis`?
  4.  **"Am I using Legacy Think?"** - Am I just adding `state: 'processing'` to a giant object, or am I defining a Rule?
- Enforce the **Critical Praxis Rules** in every change:
  - Business logic only flows through Praxis Rules/Flows.
  - All data passes through Facts for traceability.
  - Every helper is single-purpose, pure, and accepts context.
  - Use structured logging instead of ad-hoc console statements.
  - Capture errors through Error Facts with structured metadata.
- Prefer working through pure functions and Praxis actions rather than adding side effects in the webview or extension host.
- When modifying message contracts or logic flows, update both the source of truth (`docs/`, tests) and any dependent integration tests.
