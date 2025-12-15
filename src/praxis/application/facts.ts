/**
 * Praxis Application Facts and Events
 *
 * Defines the facts (state) and events for the Application Orchestrator.
 */

import { defineFact, defineEvent } from '@plures/praxis';
import type { ProjectConnection } from '../connection/types.js';
import type { ViewMode, WorkItem, DeviceCodeSession, PendingWorkItems } from './types.js';

import { StartTimerEvent, PauseTimerEvent, StopTimerEvent } from './features/timer.js';

// ============================================================================
// Application State Facts
// ============================================================================

/**
 * Application state fact
 */
export const ApplicationStateFact = defineFact<
  'ApplicationState',
  'inactive' | 'activating' | 'active' | 'activation_error' | 'deactivating'
>('ApplicationState');

/**
 * Application activated fact
 */
export const IsActivatedFact = defineFact<'IsActivated', boolean>('IsActivated');

/**
 * Application deactivating fact
 */
export const IsDeactivatingFact = defineFact<'IsDeactivating', boolean>('IsDeactivating');

/**
 * Connections fact
 */
export const ConnectionsFact = defineFact<'Connections', ProjectConnection[]>('Connections');

/**
 * Active connection ID fact
 */
export const ActiveConnectionIdFact = defineFact<'ActiveConnectionId', string | undefined>(
  'ActiveConnectionId'
);

/**
 * Active query fact
 */
export const ActiveQueryFact = defineFact<'ActiveQuery', string | undefined>('ActiveQuery');

/**
 * View mode fact
 */
export const ViewModeFact = defineFact<'ViewMode', ViewMode>('ViewMode');

/**
 * Pending work items fact
 */
export const PendingWorkItemsFact = defineFact<'PendingWorkItems', PendingWorkItems | undefined>(
  'PendingWorkItems'
);

/**
 * Device code session fact
 */
export const DeviceCodeSessionFact = defineFact<'DeviceCodeSession', DeviceCodeSession | undefined>(
  'DeviceCodeSession'
);

/**
 * Error recovery attempts fact
 */
export const ErrorRecoveryAttemptsFact = defineFact<'ErrorRecoveryAttempts', number>(
  'ErrorRecoveryAttempts'
);

/**
 * Last error fact
 */
export const LastErrorFact = defineFact<
  'LastError',
  { message: string; stack?: string; connectionId?: string } | undefined
>('LastError');

/**
 * Debug logging enabled fact
 */
export const DebugLoggingEnabledFact = defineFact<'DebugLoggingEnabled', boolean>(
  'DebugLoggingEnabled'
);

/**
 * Debug view visible fact
 */
export const DebugViewVisibleFact = defineFact<'DebugViewVisible', boolean>('DebugViewVisible');

// ============================================================================
// Application Events
// ============================================================================

/**
 * Activate application event
 */
export const ActivateEvent = defineEvent<'ACTIVATE', { extensionContext?: unknown }>('ACTIVATE');

/**
 * Activation complete event
 */
export const ActivationCompleteEvent = defineEvent<'ACTIVATION_COMPLETE', Record<string, never>>(
  'ACTIVATION_COMPLETE'
);

/**
 * Activation failed event
 */
export const ActivationFailedEvent = defineEvent<'APP_ACTIVATION_FAILED', { error: string }>(
  'APP_ACTIVATION_FAILED'
);

/**
 * Deactivate application event
 */
export const DeactivateEvent = defineEvent<'DEACTIVATE', Record<string, never>>('DEACTIVATE');

/**
 * Deactivation complete event
 */
export const DeactivationCompleteEvent = defineEvent<
  'DEACTIVATION_COMPLETE',
  Record<string, never>
>('DEACTIVATION_COMPLETE');

/**
 * Connections loaded event
 */
export const ConnectionsLoadedEvent = defineEvent<
  'CONNECTIONS_LOADED',
  { connections: ProjectConnection[] }
>('CONNECTIONS_LOADED');

/**
 * Connection selected event
 */
export const ConnectionSelectedEvent = defineEvent<'CONNECTION_SELECTED', { connectionId: string }>(
  'CONNECTION_SELECTED'
);

/**
 * Select connection event (alias for consistency with existing code)
 */
export const SelectConnectionEvent = defineEvent<'SELECT_CONNECTION', { connectionId: string }>(
  'SELECT_CONNECTION'
);

/**
 * Query changed event
 */
export const QueryChangedEvent = defineEvent<
  'QUERY_CHANGED',
  { query: string; connectionId?: string }
>('QUERY_CHANGED');

/**
 * View mode changed event
 */
export const ViewModeChangedEvent = defineEvent<'VIEW_MODE_CHANGED', { viewMode: ViewMode }>(
  'VIEW_MODE_CHANGED'
);

/**
 * Work items loaded event
 */
export const WorkItemsLoadedEvent = defineEvent<
  'WORK_ITEMS_LOADED',
  { workItems: WorkItem[]; connectionId: string; query?: string }
>('WORK_ITEMS_LOADED');

/**
 * Work items error event
 */
export const WorkItemsErrorEvent = defineEvent<
  'WORK_ITEMS_ERROR',
  { error: string; connectionId: string }
>('WORK_ITEMS_ERROR');

/**
 * Refresh data event
 */
export const RefreshDataEvent = defineEvent<'REFRESH_DATA', { connectionId?: string }>(
  'REFRESH_DATA'
);

/**
 * Connection state updated (legacy bridge) event
 */
export const ConnectionStateUpdatedEvent = defineEvent<
  'CONNECTION_STATE_UPDATED',
  { connectionId: string; state: any }
>('CONNECTION_STATE_UPDATED');

/**
 * Device code started event
 */
export const DeviceCodeStartedAppEvent = defineEvent<
  'DEVICE_CODE_STARTED',
  {
    connectionId: string;
    userCode: string;
    verificationUri: string;
    expiresInSeconds: number;
  }
>('DEVICE_CODE_STARTED');

/**
 * Device code completed event
 */
export const DeviceCodeCompletedAppEvent = defineEvent<
  'DEVICE_CODE_COMPLETED',
  { connectionId: string }
>('DEVICE_CODE_COMPLETED');

/**
 * Device code cancelled event
 */
export const DeviceCodeCancelledEvent = defineEvent<
  'DEVICE_CODE_CANCELLED',
  { connectionId: string }
>('DEVICE_CODE_CANCELLED');

/**
 * Webview/application state synchronization event (webview → Praxis)
 */
export const SyncStateEvent = defineEvent<'SyncState', any>('SyncState');

/**
 * Application error event
 */
export const ApplicationErrorEvent = defineEvent<
  'APPLICATION_ERROR',
  { error: string; connectionId?: string }
>('APPLICATION_ERROR');

/**
 * Retry event
 */
export const RetryApplicationEvent = defineEvent<'RETRY', Record<string, never>>('RETRY');

/**
 * Reset event
 */
export const ResetApplicationEvent = defineEvent<'RESET', Record<string, never>>('RESET');

/**
 * Toggle debug view event
 */
export const ToggleDebugViewEvent = defineEvent<
  'TOGGLE_DEBUG_VIEW',
  { debugViewVisible?: boolean }
>('TOGGLE_DEBUG_VIEW');

/**
 * Open settings event
 */
export const OpenSettingsEvent = defineEvent<'OPEN_SETTINGS', Record<string, never>>(
  'OPEN_SETTINGS'
);

/**
 * Authentication reminder requested event
 */
export const AuthReminderRequestedEvent = defineEvent<
  'AUTH_REMINDER_REQUESTED',
  { connectionId: string; reason: string; detail?: string }
>('AUTH_REMINDER_REQUESTED');

/**
 * Authentication reminder cleared event
 */
export const AuthReminderClearedEvent = defineEvent<
  'AUTH_REMINDER_CLEARED',
  { connectionId: string }
>('AUTH_REMINDER_CLEARED');

/**
 * Sign in with Entra event
 */
export const SignInEntraEvent = defineEvent<
  'SIGN_IN_ENTRA',
  { connectionId: string; forceInteractive?: boolean }
>('SIGN_IN_ENTRA');

/**
 * Sign out Entra event
 */
export const SignOutEntraEvent = defineEvent<'SIGN_OUT_ENTRA', { connectionId: string }>(
  'SIGN_OUT_ENTRA'
);

/**
 * Authentication success event
 */
export const AuthenticationSuccessEvent = defineEvent<
  'AUTHENTICATION_SUCCESS',
  { connectionId: string }
>('AUTHENTICATION_SUCCESS');

/**
 * Authentication failed event
 */
export const AuthenticationFailedEvent = defineEvent<
  'AUTHENTICATION_FAILED',
  { connectionId: string; error: string }
>('AUTHENTICATION_FAILED');

/**
 * Create work item event
 */
export const CreateWorkItemEvent = defineEvent<'CREATE_WORK_ITEM', { connectionId: string }>(
  'CREATE_WORK_ITEM'
);

/**
 * Create branch event
 */
export const CreateBranchEvent = defineEvent<
  'CREATE_BRANCH',
  { connectionId: string; workItemId?: number }
>('CREATE_BRANCH');

/**
 * Create pull request event
 */
export const CreatePullRequestEvent = defineEvent<
  'CREATE_PULL_REQUEST',
  { connectionId: string; workItemId?: number }
>('CREATE_PULL_REQUEST');

/**
 * Show pull requests event
 */
export const ShowPullRequestsEvent = defineEvent<'SHOW_PULL_REQUESTS', { connectionId: string }>(
  'SHOW_PULL_REQUESTS'
);

/**
 * Show build status event
 */
export const ShowBuildStatusEvent = defineEvent<'SHOW_BUILD_STATUS', { connectionId: string }>(
  'SHOW_BUILD_STATUS'
);

/**
 * Select team event
 */
export const SelectTeamEvent = defineEvent<'SELECT_TEAM', { connectionId: string }>('SELECT_TEAM');

/**
 * Reset preferred repositories event
 */
export const ResetPreferredRepositoriesEvent = defineEvent<
  'RESET_PREFERRED_REPOSITORIES',
  { connectionId: string }
>('RESET_PREFERRED_REPOSITORIES');

/**
 * Self test webview event
 */
export const SelfTestWebviewEvent = defineEvent<'SELF_TEST_WEBVIEW', Record<string, never>>(
  'SELF_TEST_WEBVIEW'
);

/**
 * Bulk assign event
 */
export const BulkAssignEvent = defineEvent<
  'BULK_ASSIGN',
  { connectionId: string; workItemIds: number[] }
>('BULK_ASSIGN');

/**
 * Generate Copilot prompt event
 */
export const GenerateCopilotPromptEvent = defineEvent<
  'GENERATE_COPILOT_PROMPT',
  { connectionId: string; workItemId: number }
>('GENERATE_COPILOT_PROMPT');

/**
 * Show time report event
 */
export const ShowTimeReportEvent = defineEvent<'SHOW_TIME_REPORT', { connectionId: string }>(
  'SHOW_TIME_REPORT'
);

/**
 * Webview ready event
 */
export const WebviewReadyEvent = defineEvent<'WEBVIEW_READY', Record<string, never>>(
  'WEBVIEW_READY'
);

/**
 * Union type of all application events
 */
export type PraxisApplicationEvent =
  | ReturnType<typeof ActivateEvent.create>
  | ReturnType<typeof ActivationCompleteEvent.create>
  | ReturnType<typeof ActivationFailedEvent.create>
  | ReturnType<typeof DeactivateEvent.create>
  | ReturnType<typeof DeactivationCompleteEvent.create>
  | ReturnType<typeof ConnectionsLoadedEvent.create>
  | ReturnType<typeof ConnectionSelectedEvent.create>
  | ReturnType<typeof SelectConnectionEvent.create>
  | ReturnType<typeof QueryChangedEvent.create>
  | ReturnType<typeof ViewModeChangedEvent.create>
  | ReturnType<typeof WorkItemsLoadedEvent.create>
  | ReturnType<typeof WorkItemsErrorEvent.create>
  | ReturnType<typeof RefreshDataEvent.create>
  | ReturnType<typeof ConnectionStateUpdatedEvent.create>
  | ReturnType<typeof DeviceCodeStartedAppEvent.create>
  | ReturnType<typeof DeviceCodeCompletedAppEvent.create>
  | ReturnType<typeof DeviceCodeCancelledEvent.create>
  | ReturnType<typeof SyncStateEvent.create>
  | ReturnType<typeof ApplicationErrorEvent.create>
  | ReturnType<typeof RetryApplicationEvent.create>
  | ReturnType<typeof ResetApplicationEvent.create>
  | ReturnType<typeof ToggleDebugViewEvent.create>
  | ReturnType<typeof OpenSettingsEvent.create>
  | ReturnType<typeof AuthReminderRequestedEvent.create>
  | ReturnType<typeof AuthReminderClearedEvent.create>
  | ReturnType<typeof SignInEntraEvent.create>
  | ReturnType<typeof SignOutEntraEvent.create>
  | ReturnType<typeof AuthenticationSuccessEvent.create>
  | ReturnType<typeof AuthenticationFailedEvent.create>
  | ReturnType<typeof CreateWorkItemEvent.create>
  | ReturnType<typeof CreateBranchEvent.create>
  | ReturnType<typeof CreatePullRequestEvent.create>
  | ReturnType<typeof ShowPullRequestsEvent.create>
  | ReturnType<typeof ShowBuildStatusEvent.create>
  | ReturnType<typeof SelectTeamEvent.create>
  | ReturnType<typeof ResetPreferredRepositoriesEvent.create>
  | ReturnType<typeof SelfTestWebviewEvent.create>
  | ReturnType<typeof BulkAssignEvent.create>
  | ReturnType<typeof GenerateCopilotPromptEvent.create>
  | ReturnType<typeof ShowTimeReportEvent.create>
  | ReturnType<typeof WebviewReadyEvent.create>
  | ReturnType<typeof StartTimerEvent.create>
  | ReturnType<typeof PauseTimerEvent.create>
  | ReturnType<typeof StopTimerEvent.create>;
