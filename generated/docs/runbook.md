<!-- ⚠️  GENERATED FILE – do not edit manually. -->
<!-- Source of truth: src/praxis/application/schema/index.ts -->
<!-- Regenerate:      npm run derive -->

# Praxis Application Runbook

_Auto-generated from the Praxis rule registry. Do not edit manually._

## Overview

This runbook is derived directly from the Praxis schema.  
Any behaviour change **must** start with a change to the Praxis logic; this
document will then be regenerated automatically.

## Facts (14)

Facts represent reactive application state.

| Tag                     |
| ----------------------- |
| `ApplicationState`      |
| `IsActivated`           |
| `IsDeactivating`        |
| `Connections`           |
| `ActiveConnectionId`    |
| `ActiveQuery`           |
| `ViewMode`              |
| `PendingWorkItems`      |
| `DeviceCodeSession`     |
| `AuthCodeFlowSession`   |
| `ErrorRecoveryAttempts` |
| `LastError`             |
| `DebugLoggingEnabled`   |
| `DebugViewVisible`      |

## Events (55)

Events are immutable triggers that cause rules to execute.

| Tag                                  | Group      |
| ------------------------------------ | ---------- |
| `ACTIVATE`                           | lifecycle  |
| `ACTIVATION_COMPLETE`                | lifecycle  |
| `APP_ACTIVATION_FAILED`              | lifecycle  |
| `DEACTIVATE`                         | lifecycle  |
| `DEACTIVATION_COMPLETE`              | lifecycle  |
| `RETRY`                              | lifecycle  |
| `RESET`                              | lifecycle  |
| `CONNECTIONS_LOADED`                 | connection |
| `CONNECTION_SELECTED`                | connection |
| `SELECT_CONNECTION`                  | connection |
| `CONNECTION_STATE_UPDATED`           | connection |
| `REFRESH_DATA`                       | connection |
| `SIGN_IN_ENTRA`                      | auth       |
| `SIGN_OUT_ENTRA`                     | auth       |
| `AUTHENTICATION_SUCCESS`             | auth       |
| `AUTHENTICATION_FAILED`              | auth       |
| `AUTH_REMINDER_REQUESTED`            | auth       |
| `AUTH_REMINDER_CLEARED`              | auth       |
| `DEVICE_CODE_STARTED`                | auth       |
| `DEVICE_CODE_COMPLETED`              | auth       |
| `DEVICE_CODE_CANCELLED`              | auth       |
| `DEVICE_CODE_COPY_FAILED`            | auth       |
| `DEVICE_CODE_BROWSER_OPEN_FAILED`    | auth       |
| `DEVICE_CODE_SESSION_NOT_FOUND`      | auth       |
| `DEVICE_CODE_BROWSER_OPENED`         | auth       |
| `AUTH_CODE_FLOW_STARTED`             | auth       |
| `AUTH_CODE_FLOW_COMPLETED`           | auth       |
| `AUTH_CODE_FLOW_BROWSER_OPEN_FAILED` | auth       |
| `AUTH_CODE_FLOW_BROWSER_OPENED`      | auth       |
| `AUTH_REDIRECT_RECEIVED`             | auth       |
| `QUERY_CHANGED`                      | workItem   |
| `VIEW_MODE_CHANGED`                  | workItem   |
| `WORK_ITEMS_LOADED`                  | workItem   |
| `WORK_ITEMS_ERROR`                   | workItem   |
| `CREATE_WORK_ITEM`                   | workItem   |
| `BULK_ASSIGN`                        | workItem   |
| `GENERATE_COPILOT_PROMPT`            | workItem   |
| `StartTimer`                         | timer      |
| `PauseTimer`                         | timer      |
| `StopTimer`                          | timer      |
| `RequestTimerHistory`                | timer      |
| `TimerHistoryLoaded`                 | timer      |
| `SyncState`                          | ui         |
| `TOGGLE_DEBUG_VIEW`                  | ui         |
| `OPEN_SETTINGS`                      | ui         |
| `SELF_TEST_WEBVIEW`                  | ui         |
| `WEBVIEW_READY`                      | ui         |
| `APPLICATION_ERROR`                  | ui         |
| `SHOW_TIME_REPORT`                   | ui         |
| `SHOW_PULL_REQUESTS`                 | ui         |
| `SHOW_BUILD_STATUS`                  | ui         |
| `SELECT_TEAM`                        | ui         |
| `RESET_PREFERRED_REPOSITORIES`       | ui         |
| `CREATE_BRANCH`                      | ui         |
| `CREATE_PULL_REQUEST`                | ui         |

## Rules (46)

Rules are pure functions that react to events and update facts.

| Rule ID                                     | Description                                        | Triggers                                   |
| ------------------------------------------- | -------------------------------------------------- | ------------------------------------------ |
| `application.activate`                      | Activate the application                           | `ACTIVATE`                                 |
| `application.activationComplete`            | Complete application activation                    | `ACTIVATION_COMPLETE`                      |
| `application.activationFailed`              | Handle activation failure                          | `APP_ACTIVATION_FAILED`                    |
| `application.deactivate`                    | Begin application deactivation                     | `DEACTIVATE`                               |
| `application.deactivationComplete`          | Complete application deactivation                  | `DEACTIVATION_COMPLETE`                    |
| `connection.loaded`                         | Handle connections loaded from settings            | `CONNECTIONS_LOADED`                       |
| `connection.selected`                       | Handle connection selection                        | `CONNECTION_SELECTED`, `SELECT_CONNECTION` |
| `connection.stateUpdated`                   | Handle legacy connection state update              | `CONNECTION_STATE_UPDATED`                 |
| `application.deviceCodeStarted`             | Handle device code flow started                    | `DEVICE_CODE_STARTED`                      |
| `application.deviceCodeCompleted`           | Handle device code flow completed                  | `DEVICE_CODE_COMPLETED`                    |
| `application.deviceCodeCancelled`           | Handle device code flow cancelled                  | `DEVICE_CODE_CANCELLED`                    |
| `application.authCodeFlowStarted`           | Handle authorization code flow with PKCE started   | `AUTH_CODE_FLOW_STARTED`                   |
| `application.authCodeFlowCompleted`         | Handle authorization code flow with PKCE completed | `AUTH_CODE_FLOW_COMPLETED`                 |
| `workItems.loaded`                          | Handle work items loaded                           | `WORK_ITEMS_LOADED`                        |
| `workItems.error`                           | Handle work items fetch error                      | `WORK_ITEMS_ERROR`                         |
| `workItems.queryChanged`                    | Handle query change                                | `QUERY_CHANGED`                            |
| `application.error`                         | Handle application error                           | `APPLICATION_ERROR`                        |
| `application.retry`                         | Retry after error                                  | `RETRY`                                    |
| `application.reset`                         | Reset application state                            | `RESET`                                    |
| `application.toggleDebugView`               | Toggle debug view visibility                       | `TOGGLE_DEBUG_VIEW`                        |
| `application.openSettings`                  | Open extension settings                            | `OPEN_SETTINGS`                            |
| `application.viewModeChanged`               | Handle view mode change                            | `VIEW_MODE_CHANGED`                        |
| `application.refreshData`                   | Handle data refresh request                        | `REFRESH_DATA`                             |
| `application.authReminderRequested`         | Handle auth reminder requested                     | `AUTH_REMINDER_REQUESTED`                  |
| `application.authReminderCleared`           | Handle auth reminder cleared                       | `AUTH_REMINDER_CLEARED`                    |
| `timer.start`                               | Start a work item timer                            | `StartTimer`                               |
| `timer.pause`                               | Pause the running timer                            | `PauseTimer`                               |
| `timer.stop`                                | Stop and record elapsed time                       | `StopTimer`                                |
| `timer.historyLoaded`                       | Load persisted timer history into context          | `TimerHistoryLoaded`                       |
| `decision.auth.signIn`                      | Record decision when Entra sign-in is requested    | `SIGN_IN_ENTRA`                            |
| `decision.auth.signOut`                     | Record decision when Entra sign-out is requested   | `SIGN_OUT_ENTRA`                           |
| `decision.auth.authSuccess`                 | Record decision when authentication succeeds       | `AUTHENTICATION_SUCCESS`                   |
| `decision.auth.authFailed`                  | Record decision when authentication fails          | `AUTHENTICATION_FAILED`                    |
| `decision.auth.deviceCodeStart`             | Record decision when device code flow starts       | `DEVICE_CODE_STARTED`                      |
| `decision.auth.deviceCodeComplete`          | Record decision when device code flow completes    | `DEVICE_CODE_COMPLETED`                    |
| `decision.auth.deviceCodeCancel`            | Record decision when device code flow is cancelled | `DEVICE_CODE_CANCELLED`                    |
| `decision.auth.authCodeFlowStart`           | Record decision when auth code flow starts         | `AUTH_CODE_FLOW_STARTED`                   |
| `decision.auth.authCodeFlowComplete`        | Record decision when auth code flow completes      | `AUTH_CODE_FLOW_COMPLETED`                 |
| `decision.operations.createWorkItem`        | Record decision to create a work item              | `CREATE_WORK_ITEM`                         |
| `decision.operations.bulkAssign`            | Record decision to bulk-assign work items          | `BULK_ASSIGN`                              |
| `decision.operations.createBranch`          | Record decision to create a branch                 | `CREATE_BRANCH`                            |
| `decision.operations.createPullRequest`     | Record decision to create a pull request           | `CREATE_PULL_REQUEST`                      |
| `decision.operations.selectConnection`      | Record decision to select a connection             | `SELECT_CONNECTION`                        |
| `decision.operations.generateCopilotPrompt` | Record decision to generate a Copilot prompt       | `GENERATE_COPILOT_PROMPT`                  |
| `decision.operations.activate`              | Record decision to activate application            | `ACTIVATE`                                 |
| `decision.operations.deactivate`            | Record decision to deactivate application          | `DEACTIVATE`                               |
