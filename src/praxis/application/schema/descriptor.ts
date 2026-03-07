/* eslint-disable max-lines */
/**
 * Praxis Application Schema Descriptor
 *
 * Pure-data description of the application's Facts, Events, and Rules.
 * This file has **zero runtime dependencies** so it can be imported by the
 * derivation generator CLI without pulling in the @plures/praxis → Svelte
 * dependency chain.
 *
 * It mirrors the shape of `schema/index.ts` but uses plain strings instead
 * of live `defineFact`/`defineEvent` objects.  The derive script reads this
 * file; application code uses `schema/index.ts` which wraps these strings
 * with the real Praxis primitives.
 *
 * ⚠️  Keep this file in sync with `schema/index.ts`, `facts.ts`, and the
 *     rules under `rules/`.  Running `npm run derive` will fail with a type
 *     error if a tag is removed without also removing it here.
 */

// ─── Fact descriptor ─────────────────────────────────────────────────────────

export interface FactDescriptor {
  tag: string;
  description?: string;
}

export const FACT_DESCRIPTORS: readonly FactDescriptor[] = [
  { tag: 'ApplicationState', description: 'Current lifecycle state of the application' },
  { tag: 'IsActivated', description: 'Whether the application has completed activation' },
  { tag: 'IsDeactivating', description: 'Whether the application is shutting down' },
  { tag: 'Connections', description: 'List of configured Azure DevOps project connections' },
  { tag: 'ActiveConnectionId', description: 'ID of the currently selected connection' },
  { tag: 'ActiveQuery', description: 'Current work-item query string' },
  { tag: 'ViewMode', description: 'UI view mode (list | kanban | board)' },
  { tag: 'PendingWorkItems', description: 'Work items awaiting assignment' },
  { tag: 'DeviceCodeSession', description: 'Active OAuth device-code session' },
  { tag: 'AuthCodeFlowSession', description: 'Active OAuth authorization-code session' },
  { tag: 'ErrorRecoveryAttempts', description: 'Number of consecutive error-recovery retries' },
  { tag: 'LastError', description: 'Most recent error payload' },
  { tag: 'DebugLoggingEnabled', description: 'Whether verbose debug logging is active' },
  { tag: 'DebugViewVisible', description: 'Whether the debug panel is shown in the UI' },
] as const;

// ─── Event descriptor ─────────────────────────────────────────────────────────

export interface EventDescriptor {
  tag: string;
  group: EventGroup;
  description?: string;
}

export type EventGroup = 'lifecycle' | 'connection' | 'auth' | 'workItem' | 'timer' | 'ui';

export const EVENT_DESCRIPTORS: readonly EventDescriptor[] = [
  // Lifecycle
  { tag: 'ACTIVATE', group: 'lifecycle', description: 'Start application activation' },
  {
    tag: 'ACTIVATION_COMPLETE',
    group: 'lifecycle',
    description: 'Activation finished successfully',
  },
  { tag: 'APP_ACTIVATION_FAILED', group: 'lifecycle', description: 'Activation failed with error' },
  { tag: 'DEACTIVATE', group: 'lifecycle', description: 'Begin application shutdown' },
  {
    tag: 'DEACTIVATION_COMPLETE',
    group: 'lifecycle',
    description: 'Shutdown finished successfully',
  },
  { tag: 'RETRY', group: 'lifecycle', description: 'Retry after an error' },
  { tag: 'RESET', group: 'lifecycle', description: 'Reset all runtime state to defaults' },
  // Connection
  {
    tag: 'CONNECTIONS_LOADED',
    group: 'connection',
    description: 'Connections hydrated from settings',
  },
  { tag: 'CONNECTION_SELECTED', group: 'connection', description: 'User chose a connection tab' },
  { tag: 'SELECT_CONNECTION', group: 'connection', description: 'Alias – select a connection' },
  {
    tag: 'CONNECTION_STATE_UPDATED',
    group: 'connection',
    description: 'Legacy bridge – connection state changed',
  },
  {
    tag: 'REFRESH_DATA',
    group: 'connection',
    description: 'Reload work items from Azure DevOps',
  },
  // Auth
  { tag: 'SIGN_IN_ENTRA', group: 'auth', description: 'User requests Entra ID sign-in' },
  { tag: 'SIGN_OUT_ENTRA', group: 'auth', description: 'User requests Entra ID sign-out' },
  { tag: 'AUTHENTICATION_SUCCESS', group: 'auth', description: 'Authentication succeeded' },
  { tag: 'AUTHENTICATION_FAILED', group: 'auth', description: 'Authentication failed' },
  { tag: 'AUTH_REMINDER_REQUESTED', group: 'auth', description: 'Auth reminder shown to user' },
  { tag: 'AUTH_REMINDER_CLEARED', group: 'auth', description: 'Auth reminder dismissed' },
  { tag: 'DEVICE_CODE_STARTED', group: 'auth', description: 'Device-code flow initiated' },
  { tag: 'DEVICE_CODE_COMPLETED', group: 'auth', description: 'Device-code flow completed' },
  { tag: 'DEVICE_CODE_CANCELLED', group: 'auth', description: 'Device-code flow cancelled' },
  { tag: 'DEVICE_CODE_COPY_FAILED', group: 'auth', description: 'Failed to copy device code' },
  {
    tag: 'DEVICE_CODE_BROWSER_OPEN_FAILED',
    group: 'auth',
    description: 'Failed to open browser for device code',
  },
  {
    tag: 'DEVICE_CODE_SESSION_NOT_FOUND',
    group: 'auth',
    description: 'Device-code session missing',
  },
  {
    tag: 'DEVICE_CODE_BROWSER_OPENED',
    group: 'auth',
    description: 'Browser opened for device code',
  },
  {
    tag: 'AUTH_CODE_FLOW_STARTED',
    group: 'auth',
    description: 'Authorization-code with PKCE flow initiated',
  },
  {
    tag: 'AUTH_CODE_FLOW_COMPLETED',
    group: 'auth',
    description: 'Authorization-code flow completed',
  },
  {
    tag: 'AUTH_CODE_FLOW_BROWSER_OPEN_FAILED',
    group: 'auth',
    description: 'Failed to open browser for auth-code flow',
  },
  {
    tag: 'AUTH_CODE_FLOW_BROWSER_OPENED',
    group: 'auth',
    description: 'Browser opened for auth-code flow',
  },
  {
    tag: 'AUTH_REDIRECT_RECEIVED',
    group: 'auth',
    description: 'OAuth redirect received with authorization code',
  },
  // Work items
  { tag: 'QUERY_CHANGED', group: 'workItem', description: 'Work-item search query changed' },
  { tag: 'VIEW_MODE_CHANGED', group: 'workItem', description: 'Work-item view mode changed' },
  { tag: 'WORK_ITEMS_LOADED', group: 'workItem', description: 'Work items loaded from API' },
  { tag: 'WORK_ITEMS_ERROR', group: 'workItem', description: 'Work-item fetch encountered error' },
  { tag: 'CREATE_WORK_ITEM', group: 'workItem', description: 'User requested work-item creation' },
  { tag: 'BULK_ASSIGN', group: 'workItem', description: 'Bulk-assign work items to user' },
  {
    tag: 'GENERATE_COPILOT_PROMPT',
    group: 'workItem',
    description: 'Generate Copilot prompt for work item',
  },
  // Timer
  { tag: 'StartTimer', group: 'timer', description: 'Start timing a work item' },
  { tag: 'PauseTimer', group: 'timer', description: 'Pause the active timer' },
  { tag: 'StopTimer', group: 'timer', description: 'Stop and record elapsed time' },
  {
    tag: 'RequestTimerHistory',
    group: 'timer',
    description: 'Request timer history from persistence',
  },
  { tag: 'TimerHistoryLoaded', group: 'timer', description: 'Timer history loaded from storage' },
  // UI / misc
  { tag: 'SyncState', group: 'ui', description: 'Sync state from webview to engine' },
  { tag: 'TOGGLE_DEBUG_VIEW', group: 'ui', description: 'Toggle debug panel visibility' },
  { tag: 'OPEN_SETTINGS', group: 'ui', description: 'Open extension settings page' },
  { tag: 'SELF_TEST_WEBVIEW', group: 'ui', description: 'Run webview self-diagnostics' },
  { tag: 'WEBVIEW_READY', group: 'ui', description: 'Webview finished bootstrapping' },
  { tag: 'APPLICATION_ERROR', group: 'ui', description: 'Unrecoverable application error' },
  { tag: 'SHOW_TIME_REPORT', group: 'ui', description: 'Show time tracking report' },
  { tag: 'SHOW_PULL_REQUESTS', group: 'ui', description: 'Open pull request list' },
  { tag: 'SHOW_BUILD_STATUS', group: 'ui', description: 'Open build status panel' },
  { tag: 'SELECT_TEAM', group: 'ui', description: 'Select Azure DevOps team' },
  {
    tag: 'RESET_PREFERRED_REPOSITORIES',
    group: 'ui',
    description: 'Clear preferred repository selection',
  },
  { tag: 'CREATE_BRANCH', group: 'ui', description: 'Create a new Git branch' },
  { tag: 'CREATE_PULL_REQUEST', group: 'ui', description: 'Create a new pull request' },
] as const;

// ─── Rule descriptor ──────────────────────────────────────────────────────────

export interface RuleDescriptor {
  id: string;
  description: string;
  triggers: readonly string[];
  transition?: { from: string | readonly string[]; to: string };
}

export const RULE_DESCRIPTORS: readonly RuleDescriptor[] = [
  // Lifecycle
  {
    id: 'application.activate',
    description: 'Activate the application',
    triggers: ['ACTIVATE'],
    transition: { from: 'inactive', to: 'activating' },
  },
  {
    id: 'application.activationComplete',
    description: 'Complete application activation',
    triggers: ['ACTIVATION_COMPLETE'],
    transition: { from: 'activating', to: 'active' },
  },
  {
    id: 'application.activationFailed',
    description: 'Handle activation failure',
    triggers: ['APP_ACTIVATION_FAILED'],
    transition: { from: 'activating', to: 'activation_error' },
  },
  {
    id: 'application.deactivate',
    description: 'Begin application deactivation',
    triggers: ['DEACTIVATE'],
    transition: { from: 'active', to: 'deactivating' },
  },
  {
    id: 'application.deactivationComplete',
    description: 'Complete application deactivation',
    triggers: ['DEACTIVATION_COMPLETE'],
    transition: { from: 'deactivating', to: 'inactive' },
  },
  // Connection
  {
    id: 'connection.loaded',
    description: 'Handle connections loaded from settings',
    triggers: ['CONNECTIONS_LOADED'],
  },
  {
    id: 'connection.selected',
    description: 'Handle connection selection',
    triggers: ['CONNECTION_SELECTED', 'SELECT_CONNECTION'],
  },
  {
    id: 'connection.stateUpdated',
    description: 'Handle legacy connection state update',
    triggers: ['CONNECTION_STATE_UPDATED'],
  },
  // Auth
  {
    id: 'application.deviceCodeStarted',
    description: 'Handle device code flow started',
    triggers: ['DEVICE_CODE_STARTED'],
  },
  {
    id: 'application.deviceCodeCompleted',
    description: 'Handle device code flow completed',
    triggers: ['DEVICE_CODE_COMPLETED'],
  },
  {
    id: 'application.deviceCodeCancelled',
    description: 'Handle device code flow cancelled',
    triggers: ['DEVICE_CODE_CANCELLED'],
  },
  {
    id: 'application.authCodeFlowStarted',
    description: 'Handle authorization code flow with PKCE started',
    triggers: ['AUTH_CODE_FLOW_STARTED'],
  },
  {
    id: 'application.authCodeFlowCompleted',
    description: 'Handle authorization code flow with PKCE completed',
    triggers: ['AUTH_CODE_FLOW_COMPLETED'],
  },
  // Work items
  {
    id: 'workItems.loaded',
    description: 'Handle work items loaded',
    triggers: ['WORK_ITEMS_LOADED'],
  },
  {
    id: 'workItems.error',
    description: 'Handle work items fetch error',
    triggers: ['WORK_ITEMS_ERROR'],
  },
  {
    id: 'workItems.queryChanged',
    description: 'Handle query change',
    triggers: ['QUERY_CHANGED'],
  },
  // Misc / UI
  {
    id: 'application.error',
    description: 'Handle application error',
    triggers: ['APPLICATION_ERROR'],
  },
  {
    id: 'application.retry',
    description: 'Retry after error',
    triggers: ['RETRY'],
    transition: { from: ['error_recovery', 'activation_error'], to: 'active' },
  },
  {
    id: 'application.reset',
    description: 'Reset application state',
    triggers: ['RESET'],
    transition: { from: '*', to: 'inactive' },
  },
  {
    id: 'application.toggleDebugView',
    description: 'Toggle debug view visibility',
    triggers: ['TOGGLE_DEBUG_VIEW'],
  },
  {
    id: 'application.openSettings',
    description: 'Open extension settings',
    triggers: ['OPEN_SETTINGS'],
  },
  {
    id: 'application.viewModeChanged',
    description: 'Handle view mode change',
    triggers: ['VIEW_MODE_CHANGED'],
  },
  {
    id: 'application.refreshData',
    description: 'Handle data refresh request',
    triggers: ['REFRESH_DATA'],
  },
  {
    id: 'application.authReminderRequested',
    description: 'Handle auth reminder requested',
    triggers: ['AUTH_REMINDER_REQUESTED'],
  },
  {
    id: 'application.authReminderCleared',
    description: 'Handle auth reminder cleared',
    triggers: ['AUTH_REMINDER_CLEARED'],
  },
  // Timer
  {
    id: 'timer.start',
    description: 'Start a work item timer',
    triggers: ['StartTimer'],
  },
  {
    id: 'timer.pause',
    description: 'Pause the running timer',
    triggers: ['PauseTimer'],
  },
  {
    id: 'timer.stop',
    description: 'Stop and record elapsed time',
    triggers: ['StopTimer'],
  },
  {
    id: 'timer.historyLoaded',
    description: 'Load persisted timer history into context',
    triggers: ['TimerHistoryLoaded'],
  },
  // Decision ledger – auth
  {
    id: 'decision.auth.signIn',
    description: 'Record decision when Entra sign-in is requested',
    triggers: ['SIGN_IN_ENTRA'],
  },
  {
    id: 'decision.auth.signOut',
    description: 'Record decision when Entra sign-out is requested',
    triggers: ['SIGN_OUT_ENTRA'],
  },
  {
    id: 'decision.auth.authSuccess',
    description: 'Record decision when authentication succeeds',
    triggers: ['AUTHENTICATION_SUCCESS'],
  },
  {
    id: 'decision.auth.authFailed',
    description: 'Record decision when authentication fails',
    triggers: ['AUTHENTICATION_FAILED'],
  },
  {
    id: 'decision.auth.deviceCodeStart',
    description: 'Record decision when device code flow starts',
    triggers: ['DEVICE_CODE_STARTED'],
  },
  {
    id: 'decision.auth.deviceCodeComplete',
    description: 'Record decision when device code flow completes',
    triggers: ['DEVICE_CODE_COMPLETED'],
  },
  {
    id: 'decision.auth.deviceCodeCancel',
    description: 'Record decision when device code flow is cancelled',
    triggers: ['DEVICE_CODE_CANCELLED'],
  },
  {
    id: 'decision.auth.authCodeFlowStart',
    description: 'Record decision when auth code flow starts',
    triggers: ['AUTH_CODE_FLOW_STARTED'],
  },
  {
    id: 'decision.auth.authCodeFlowComplete',
    description: 'Record decision when auth code flow completes',
    triggers: ['AUTH_CODE_FLOW_COMPLETED'],
  },
  // Decision ledger – operations
  {
    id: 'decision.operations.createWorkItem',
    description: 'Record decision to create a work item',
    triggers: ['CREATE_WORK_ITEM'],
  },
  {
    id: 'decision.operations.bulkAssign',
    description: 'Record decision to bulk-assign work items',
    triggers: ['BULK_ASSIGN'],
  },
  {
    id: 'decision.operations.createBranch',
    description: 'Record decision to create a branch',
    triggers: ['CREATE_BRANCH'],
  },
  {
    id: 'decision.operations.createPullRequest',
    description: 'Record decision to create a pull request',
    triggers: ['CREATE_PULL_REQUEST'],
  },
  {
    id: 'decision.operations.selectConnection',
    description: 'Record decision to select a connection',
    triggers: ['SELECT_CONNECTION'],
  },
  {
    id: 'decision.operations.generateCopilotPrompt',
    description: 'Record decision to generate a Copilot prompt',
    triggers: ['GENERATE_COPILOT_PROMPT'],
  },
  {
    id: 'decision.operations.activate',
    description: 'Record decision to activate application',
    triggers: ['ACTIVATE'],
  },
  {
    id: 'decision.operations.deactivate',
    description: 'Record decision to deactivate application',
    triggers: ['DEACTIVATE'],
  },
] as const;

// ─── Assembled descriptor ─────────────────────────────────────────────────────

/**
 * Lightweight, zero-dependency schema descriptor.
 * Consumed by the derivation generator (`npm run derive`).
 */
export const schemaDescriptor = {
  facts: FACT_DESCRIPTORS,
  events: EVENT_DESCRIPTORS,
  rules: RULE_DESCRIPTORS,
} as const;

export type SchemaDescriptor = typeof schemaDescriptor;
