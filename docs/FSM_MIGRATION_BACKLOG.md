# FSM Migration Backlog

This backlog captures the remaining legacy pathways that still bypass the application state machines. Each entry links the legacy surface to the target FSM-first implementation work that remains.

## Webview Message Handling

| Message Type                                                                                                | Current Handler                                  | Legacy Behaviors                                                                                     | FSM Target                                                                                                                                       | Notes                                                                                  |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `authReminderAction`                                                                                        | `applicationMachine.routeWebviewMessage`         | Routed through `handleAuthReminderAction` helper to update reminders and trigger FSM-driven sign-in. | [DONE] Covered by `tests/fsm/authReminderActions.test.ts`.                                                                                       | Pending reminder map now owned by FSM context.                                         |
| `requireAuthentication`                                                                                     | `applicationMachine.routeWebviewMessage`         | Manual webview auth requests fan into `planRequireAuthentication` and FSM sign-in flow.              | [DONE] Covered by `tests/fsm/requireAuthentication.test.ts`.                                                                                     | Legacy activation handler removed.                                                     |
| `bulkAssign`, `bulkMove`, `bulkAddTags`, `bulkDelete`                                                       | `handleLegacyMessage` (activation.ts pre-switch) | Requests selected IDs, prompts user via VS Code APIs, performs client updates with progress UI.      | Introduce `webviewBulkActionMachine` or dedicated actors invoked from `routeWebviewMessage`. Use pure helpers in `src/fsm/functions/workItems/`. | Requires splitting UI prompting (VS Code commands) from data mutation for testability. |
| `refresh`, `getWorkItems`, `setQuery`                                                                       | `handleLegacyMessage`                            | Calls provider directly, mutates legacy caches, posts snapshots.                                     | Replace with FSM events (`REFRESH_DATA`, `WEBVIEW_QUERY_CHANGED`) and let connection/timer machines emit work item snapshots.                    | Align with `syncDataToWebview` action already in `applicationMachine`.                 |
| `switchConnection`, `setActiveConnection`                                                                   | `handleLegacyMessage`                            | Calls `switchActiveConnectionLegacy`, manipulates `activeConnectionId`.                              | Route to `CONNECTION_SELECTED` event; move switching logic into connection FSM actors.                                                           | Needs bootstrap of provider caching via FSM context.                                   |
| Timer controls (`startTimer`, `pauseTimer`, `resumeTimer`, `stopTimer`, `showStopTimerOptions`, `activity`) | `handleLegacyMessage`                            | Delegates to `WorkItemTimer` singleton, manual telemetry/logging.                                    | Ensure `routeWebviewMessage` forwards to timer child actor exclusively; remove direct timer usage.                                               | Timer machine already interprets `timer:start` etc; align message types.               |
| Copilot compose (`generateCopilotPrompt`, `submitComposeComment`, `stopAndApply`)                           | `handleLegacyMessage`                            | Uses imperative helpers, direct Azure API calls and telemetry.                                       | Build dedicated FSM child machine for compose flow with pure helpers for prompt generation & draft persistence.                                  | Update integration tests to cover new events.                                          |
| Commenting (`addComment`)                                                                                   | `handleLegacyMessage`                            | Directly posts comment via provider, refreshes UI manually.                                          | Move to FSM action that orchestrates provider actor, leverages context logging.                                                                  | Ensure errors flow through FSM error states.                                           |
| Preferences (`uiPreferenceChanged`)                                                                         | `handleLegacyMessage`                            | Writes VS Code global state directly.                                                                | Build pure helper that returns new preferences; persist through FSM persistence actor.                                                           |
| Diagnostics (`webviewConsole`, `webviewRuntimeError`, `selfTestAck`, `selfTestPong`)                        | `handleLegacyMessage`                            | Logs output, toggles self-test promise.                                                              | Convert to FSM logging events with structured metadata.                                                                                          | Preserve self-test for smoke builds.                                                   |

## Command Registration Audit

| Command                                                   | Current Handler                    | Required FSM Flow                                                                          |
| --------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `azureDevOpsInt.addConnection` and manage/remove variants | Imperative code in `activation.ts` | Wrap in FSM events (`SETUP_START`, `SETUP_MANAGE_EXISTING`); re-use `setupMachine` actors. |
| Timer commands (`azureDevOpsInt.timer.start` etc.)        | Direct `WorkItemTimer` usage       | Ensure commands simply dispatch timer FSM events through `sendApplicationStoreEvent`.      |
| Copilot commands (`azureDevOpsInt.copilot.*`)             | Imperative host logic              | Design FSM child machine for Copilot to centralize state and prevent duplicate prompts.    |
| Diagnostics / cache commands                              | Manual logging + provider refresh  | Convert to FSM events that trigger diagnostics actors with structured logging.             |

## Service Layer Gaps

- `fsmSetupService.ts` still surfaces imperative VS Code dialogs. Extract dialog intent into FSM events and let services respond as actors.
- `ConnectionAdapter` directly manipulates providers; ensure it reads from FSM context, not global singletons.
- Timer persistence helpers in `timer.ts` rely on global state keys—migrate reads/writes into FSM persistence actor invoked during bootstrap and shutdown.

## Bootstrap & Hydration

1. **Persisted Context Inputs**: Gather connections, timer snapshots, drafts, and auth reminders. Emit a single `APP_BOOTSTRAP` event carrying this data.
2. **Context Normalization**: Replace ad-hoc initialization (e.g., `ensureConnectionsInitialized`, `ensureActiveConnection`) with pure functions returning updated FSM context and side-effect descriptors.
3. **Replay Support**: Ensure every bootstrap step logs via `fsmLogger` and can be replayed for debugging.

## Logging Consolidation

- Replace remaining `console.log` / `verbose` inside activation with `fsmLogger` entries referencing `FSMComponent.EXTENSION_HOST`.
- Add structured logging for webview lifecycle events (`webviewReady`, `webviewRuntimeError`).
- Ensure all error paths funnel into FSM error states for consistent reporting.

## Integration Test Backlog

| Scenario                                      | Files To Update                                            | Notes                                                                              |
| --------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Existing connection test flow (happy + retry) | `tests/integration/setupMachine.integration.test.ts` (new) | Build on unit coverage to validate UI/host round trip.                             |
| Auth reminder interaction                     | New integration harness                                    | Simulate `'authReminderAction'` messages and verify FSM state transitions/logging. |
| Bulk operations                               | Extend `tests/integration/workItemsProvider.test.ts`       | Once FSM-driven, verify progress + refresh events triggered correctly.             |
| Timer control via webview                     | `tests/integration/timerWebview.test.ts`                   | Cover start/pause/resume/stop messages routed through FSM.                         |

## Immediate Next Actions

1. Define FSM events for bulk work item operations and begin migrating progress UI into dedicated actors.
2. Document bootstrap payload contract (`docs/FSM_BOOTSTRAP_SCHEMA.md`) before wiring `APP_BOOTSTRAP` in activation.
3. Schedule a repository-wide `npm run format` once documentation owners approve automated formatting.

This backlog should be revisited after each migration increment. Update entries as logic moves from activation/services into FSM machines.
