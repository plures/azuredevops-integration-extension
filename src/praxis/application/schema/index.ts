/**
 * Praxis Application Schema
 *
 * Machine-readable registry of all Facts, Events, and Rules for the
 * Application Orchestrator.  This file is the **single source of truth**
 * consumed by the derivation generator (`npm run derive`) to produce
 * downstream artifacts (UI state contracts, API contracts, test scaffolds,
 * and runbooks).
 *
 * ⚠️  DO NOT edit the `generated/` directory manually.
 *     Run `npm run derive` to regenerate derived artifacts from this schema.
 */

import * as appFacts from '../facts.js';
import { applicationRules } from '../rules/index.js';
import { RequestTimerHistoryEvent, TimerHistoryLoadedEvent } from '../features/timer.js';

// ============================================================================
// Event group definitions
// ============================================================================

/**
 * Named groupings used to organise events in documentation and contracts.
 * Each group lists the event tags that belong to it.
 */
export const EVENT_GROUPS = {
  lifecycle: [
    { tag: 'ACTIVATE' },
    { tag: 'ACTIVATION_COMPLETE' },
    { tag: 'APP_ACTIVATION_FAILED' },
    { tag: 'DEACTIVATE' },
    { tag: 'DEACTIVATION_COMPLETE' },
    { tag: 'RETRY' },
    { tag: 'RESET' },
  ],
  connection: [
    { tag: 'CONNECTIONS_LOADED' },
    { tag: 'CONNECTION_SELECTED' },
    { tag: 'SELECT_CONNECTION' },
    { tag: 'CONNECTION_STATE_UPDATED' },
    { tag: 'REFRESH_DATA' },
  ],
  auth: [
    { tag: 'SIGN_IN_ENTRA' },
    { tag: 'SIGN_OUT_ENTRA' },
    { tag: 'AUTHENTICATION_SUCCESS' },
    { tag: 'AUTHENTICATION_FAILED' },
    { tag: 'AUTH_REMINDER_REQUESTED' },
    { tag: 'AUTH_REMINDER_CLEARED' },
    { tag: 'DEVICE_CODE_STARTED' },
    { tag: 'DEVICE_CODE_COMPLETED' },
    { tag: 'DEVICE_CODE_CANCELLED' },
    { tag: 'DEVICE_CODE_COPY_FAILED' },
    { tag: 'DEVICE_CODE_BROWSER_OPEN_FAILED' },
    { tag: 'DEVICE_CODE_SESSION_NOT_FOUND' },
    { tag: 'DEVICE_CODE_BROWSER_OPENED' },
    { tag: 'AUTH_CODE_FLOW_STARTED' },
    { tag: 'AUTH_CODE_FLOW_COMPLETED' },
    { tag: 'AUTH_CODE_FLOW_BROWSER_OPEN_FAILED' },
    { tag: 'AUTH_CODE_FLOW_BROWSER_OPENED' },
    { tag: 'AUTH_REDIRECT_RECEIVED' },
  ],
  workItem: [
    { tag: 'QUERY_CHANGED' },
    { tag: 'VIEW_MODE_CHANGED' },
    { tag: 'WORK_ITEMS_LOADED' },
    { tag: 'WORK_ITEMS_ERROR' },
    { tag: 'CREATE_WORK_ITEM' },
    { tag: 'BULK_ASSIGN' },
    { tag: 'GENERATE_COPILOT_PROMPT' },
  ],
  timer: [
    { tag: 'StartTimer' },
    { tag: 'PauseTimer' },
    { tag: 'StopTimer' },
    { tag: 'RequestTimerHistory' },
    { tag: 'TimerHistoryLoaded' },
  ],
  ui: [
    { tag: 'SyncState' },
    { tag: 'TOGGLE_DEBUG_VIEW' },
    { tag: 'OPEN_SETTINGS' },
    { tag: 'SELF_TEST_WEBVIEW' },
    { tag: 'WEBVIEW_READY' },
    { tag: 'APPLICATION_ERROR' },
    { tag: 'SHOW_TIME_REPORT' },
    { tag: 'SHOW_PULL_REQUESTS' },
    { tag: 'SHOW_BUILD_STATUS' },
    { tag: 'SELECT_TEAM' },
    { tag: 'RESET_PREFERRED_REPOSITORIES' },
    { tag: 'CREATE_BRANCH' },
    { tag: 'CREATE_PULL_REQUEST' },
  ],
} as const satisfies Record<string, ReadonlyArray<{ tag: string }>>;

export type EventGroup = keyof typeof EVENT_GROUPS;

// ============================================================================
// Fact registry
// ============================================================================

/**
 * All fact definitions for the application engine.
 * A Fact represents a piece of reactive state.
 */
const applicationFacts = [
  appFacts.ApplicationStateFact,
  appFacts.IsActivatedFact,
  appFacts.IsDeactivatingFact,
  appFacts.ConnectionsFact,
  appFacts.ActiveConnectionIdFact,
  appFacts.ActiveQueryFact,
  appFacts.ViewModeFact,
  appFacts.PendingWorkItemsFact,
  appFacts.DeviceCodeSessionFact,
  appFacts.AuthCodeFlowSessionFact,
  appFacts.ErrorRecoveryAttemptsFact,
  appFacts.LastErrorFact,
  appFacts.DebugLoggingEnabledFact,
  appFacts.DebugViewVisibleFact,
];

// ============================================================================
// Event registry
// ============================================================================

/**
 * All event definitions for the application engine.
 * An Event is an immutable trigger that causes rules to run.
 */
const applicationEvents = [
  // Lifecycle
  appFacts.ActivateEvent,
  appFacts.ActivationCompleteEvent,
  appFacts.ActivationFailedEvent,
  appFacts.DeactivateEvent,
  appFacts.DeactivationCompleteEvent,
  appFacts.RetryApplicationEvent,
  appFacts.ResetApplicationEvent,
  // Connection
  appFacts.ConnectionsLoadedEvent,
  appFacts.ConnectionSelectedEvent,
  appFacts.SelectConnectionEvent,
  appFacts.ConnectionStateUpdatedEvent,
  appFacts.RefreshDataEvent,
  // Auth
  appFacts.SignInEntraEvent,
  appFacts.SignOutEntraEvent,
  appFacts.AuthenticationSuccessEvent,
  appFacts.AuthenticationFailedEvent,
  appFacts.AuthReminderRequestedEvent,
  appFacts.AuthReminderClearedEvent,
  appFacts.DeviceCodeStartedAppEvent,
  appFacts.DeviceCodeCompletedAppEvent,
  appFacts.DeviceCodeCancelledEvent,
  appFacts.DeviceCodeCopyFailedEvent,
  appFacts.DeviceCodeBrowserOpenFailedEvent,
  appFacts.DeviceCodeSessionNotFoundEvent,
  appFacts.DeviceCodeBrowserOpenedEvent,
  appFacts.AuthCodeFlowStartedAppEvent,
  appFacts.AuthCodeFlowCompletedAppEvent,
  appFacts.AuthCodeFlowBrowserOpenFailedEvent,
  appFacts.AuthCodeFlowBrowserOpenedEvent,
  appFacts.AuthRedirectReceivedAppEvent,
  // Work items
  appFacts.QueryChangedEvent,
  appFacts.ViewModeChangedEvent,
  appFacts.WorkItemsLoadedEvent,
  appFacts.WorkItemsErrorEvent,
  appFacts.CreateWorkItemEvent,
  appFacts.BulkAssignEvent,
  appFacts.GenerateCopilotPromptEvent,
  // Timer
  appFacts.StartTimerEvent,
  appFacts.PauseTimerEvent,
  appFacts.StopTimerEvent,
  RequestTimerHistoryEvent,
  TimerHistoryLoadedEvent,
  // UI / misc
  appFacts.SyncStateEvent,
  appFacts.ToggleDebugViewEvent,
  appFacts.OpenSettingsEvent,
  appFacts.SelfTestWebviewEvent,
  appFacts.WebviewReadyEvent,
  appFacts.ApplicationErrorEvent,
  appFacts.ShowTimeReportEvent,
  appFacts.ShowPullRequestsEvent,
  appFacts.ShowBuildStatusEvent,
  appFacts.SelectTeamEvent,
  appFacts.ResetPreferredRepositoriesEvent,
  appFacts.CreateBranchEvent,
  appFacts.CreatePullRequestEvent,
];

// ============================================================================
// Assembled schema
// ============================================================================

/**
 * The complete, machine-readable application schema.
 *
 * Consumed by:
 *  - `scripts/praxis-schema.ts`  (`npm run praxis:schema`)
 *  - `scripts/derive.ts`         (`npm run derive`)
 */
export const applicationSchema = {
  facts: applicationFacts,
  events: applicationEvents,
  rules: applicationRules,
  eventGroups: EVENT_GROUPS,
} as const;

export type ApplicationSchema = typeof applicationSchema;
