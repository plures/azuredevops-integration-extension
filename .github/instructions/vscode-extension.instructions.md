# Azure DevOps Integration Extension – Architecture Guardrails

## Core Product Intent
- Hydrate the FSM context from persisted settings on activation; never start with an empty runtime when configuration exists.
- Represent every Azure DevOps connection as its own tab container. A tab owns all UI and state beneath it: authentication status, filters, timers, drafts, and history. Switching tabs hides all other tabs’ content and fully activates the selected connection.
- Deliver a low-friction cockpit for work items: fast filtering, intuitive time tracking, and focused comment composition.

## Architectural Principles
- **FSM-first flow:** All business logic moves through XState machines. The extension host, webview, and data actors interact only via FSM events and actions.
- **Pure functions only:** Place business helpers in `src/fsm/functions/**`. They accept FSM context (plus payload), return new data, and never mutate shared state or touch VS Code APIs.
- **Context is the source of truth:** Active connection, auth state, timers, filters, drafts, branch context—everything that matters lives inside FSM context so it can be replayed and inspected.
- **Structured logging:** Use `fsmLogger` with `FSMComponent` metadata for every logworthy event. Remove ad-hoc console logging before commit.
- **Deterministic hydration:** Reuse normalized configuration values (URLs, IDs, auth metadata, preferences). Do not recompute or duplicate them.
- **Functional-first implementation:** Prefer functional code style. Compose behaviour from pure helpers that receive context and data rather than relying on mutation.

## Webview & Reactive UX
- Svelte v5 components read reactive stores derived from FSM context. They do not issue side effects or reimplement business rules.
- Build each tab as a shell component that receives a connection-specific view model. Shells render work-item lists, timers, and notes for their connection only.
- Filters, searches, and sort controls dispatch intent events. The FSM interprets them and coordinates providers so host and webview stay synchronized.
- Authentication prompts and manual sign-in UI render solely inside the owning tab.

## Extension Host Responsibilities
- On activation: load settings, normalize connections, and send an `APP_BOOTSTRAP` event with hydrated context to the FSM.
- When a connection is selected: refresh providers, timers, and drafts for that connection, then post a single `CONNECTION_VIEW_STATE` message to the webview.
- Route every webview message through the FSM. Example: `{ type: 'setActiveConnection', connectionId }` → `fsm.send({ type: 'SELECT_CONNECTION', connectionId })`.
- Keep data actors (work-item providers, timer persistence, auth handlers) thin and pure so FSM actions remain testable.

## Testing & Quality Gates
- Unit-test pure functions for hydration logic, tab state projection, filter composition, and timer calculations.
- Maintain FSM diagrams and documents (`docs/FSM_*.md`) whenever states or transitions change.
- Add integration tests validating tab switching, auth reminders, filter application, timer flow, and comment drafting.
- Manual regression: start with multiple connections, switch tabs, authenticate, apply filters, and exercise timers before release.

## Change Workflow
1. **Plan** the state/event updates and tab UX implications before editing.
2. **Implement** pure functions, FSM definitions, and Svelte components together to keep data flow coherent.
3. **Validate** with `npm test`, `npm run test:integration`, and a smoke run covering multi-connection scenarios.
4. **Document** updates to settings, FSM transitions, or user workflows in the FSM, using principles of self documenting code. Update the big picture summaries in `docs/`, changelog, and the README as needed.

These guardrails keep the FSM-driven, multi-connection experience coherent and ensure every tab delivers the focused productivity flow the extension promises.

## Continuous Learning
- Regularly consult the latest official references for the core stack: Git best practices, TypeScript docs, Svelte 5 guides, XState 5 manuals, the VS Code Extension API, Azure DevOps documentation, and Agile development guidance. Keep instructions aligned with upstream changes.

## AI Assistant Operating Guidelines
- Track progress, preferences, and lessons learned while working; reuse them to speed up future iterations.
- Apply the **Critical Thinking Rule** before writing code:
	1. Are we recreating existing logic?
	2. Should this be computed once and stored?
	3. Are we duplicating data, URLs, or configuration?
	4. Could the change break currently working behaviour?
	5. Is this the simplest solution that reuses proven code?
- Enforce the **Critical FSM Rules** in every change:
	- Business logic only flows through FSM state machines.
	- All data passes through FSM context for traceability.
	- Every helper lives in `src/fsm/functions/**`, is single-purpose, pure, and accepts context.
	- Use `fsmLogger` for structured logging instead of ad-hoc console statements.
	- Capture errors through FSM error states with structured metadata.
- Prefer working through pure functions and FSM actions rather than adding side effects in the webview or extension host.
- When modifying message contracts or FSM transitions, update both the source of truth (`docs/`, tests) and any dependent integration tests.

