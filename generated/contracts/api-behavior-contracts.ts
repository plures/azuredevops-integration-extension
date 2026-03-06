// ⚠️  GENERATED FILE – do not edit manually.
// Source of truth: src/praxis/application/schema/index.ts
// Regenerate:      npm run derive
// Description:     API/event behavior contracts derived from the Praxis event and rule registry

/**
 * Map of every event tag to its (opaque) payload type.
 * Import and use as a discriminated union in adapters/providers.
 */
export interface ApplicationEventPayloads {
  /** Group: lifecycle */
  'ACTIVATE': unknown;
  /** Group: lifecycle */
  'ACTIVATION_COMPLETE': unknown;
  /** Group: lifecycle */
  'APP_ACTIVATION_FAILED': unknown;
  /** Group: lifecycle */
  'DEACTIVATE': unknown;
  /** Group: lifecycle */
  'DEACTIVATION_COMPLETE': unknown;
  /** Group: lifecycle */
  'RETRY': unknown;
  /** Group: lifecycle */
  'RESET': unknown;
  /** Group: connection */
  'CONNECTIONS_LOADED': unknown;
  /** Group: connection */
  'CONNECTION_SELECTED': unknown;
  /** Group: connection */
  'SELECT_CONNECTION': unknown;
  /** Group: connection */
  'CONNECTION_STATE_UPDATED': unknown;
  /** Group: connection */
  'REFRESH_DATA': unknown;
  /** Group: auth */
  'SIGN_IN_ENTRA': unknown;
  /** Group: auth */
  'SIGN_OUT_ENTRA': unknown;
  /** Group: auth */
  'AUTHENTICATION_SUCCESS': unknown;
  /** Group: auth */
  'AUTHENTICATION_FAILED': unknown;
  /** Group: auth */
  'AUTH_REMINDER_REQUESTED': unknown;
  /** Group: auth */
  'AUTH_REMINDER_CLEARED': unknown;
  /** Group: auth */
  'DEVICE_CODE_STARTED': unknown;
  /** Group: auth */
  'DEVICE_CODE_COMPLETED': unknown;
  /** Group: auth */
  'DEVICE_CODE_CANCELLED': unknown;
  /** Group: auth */
  'DEVICE_CODE_COPY_FAILED': unknown;
  /** Group: auth */
  'DEVICE_CODE_BROWSER_OPEN_FAILED': unknown;
  /** Group: auth */
  'DEVICE_CODE_SESSION_NOT_FOUND': unknown;
  /** Group: auth */
  'DEVICE_CODE_BROWSER_OPENED': unknown;
  /** Group: auth */
  'AUTH_CODE_FLOW_STARTED': unknown;
  /** Group: auth */
  'AUTH_CODE_FLOW_COMPLETED': unknown;
  /** Group: auth */
  'AUTH_CODE_FLOW_BROWSER_OPEN_FAILED': unknown;
  /** Group: auth */
  'AUTH_CODE_FLOW_BROWSER_OPENED': unknown;
  /** Group: auth */
  'AUTH_REDIRECT_RECEIVED': unknown;
  /** Group: workItem */
  'QUERY_CHANGED': unknown;
  /** Group: workItem */
  'VIEW_MODE_CHANGED': unknown;
  /** Group: workItem */
  'WORK_ITEMS_LOADED': unknown;
  /** Group: workItem */
  'WORK_ITEMS_ERROR': unknown;
  /** Group: workItem */
  'CREATE_WORK_ITEM': unknown;
  /** Group: workItem */
  'BULK_ASSIGN': unknown;
  /** Group: workItem */
  'GENERATE_COPILOT_PROMPT': unknown;
  /** Group: timer */
  'StartTimer': unknown;
  /** Group: timer */
  'PauseTimer': unknown;
  /** Group: timer */
  'StopTimer': unknown;
  /** Group: timer */
  'RequestTimerHistory': unknown;
  /** Group: timer */
  'TimerHistoryLoaded': unknown;
  /** Group: ui */
  'SyncState': unknown;
  /** Group: ui */
  'TOGGLE_DEBUG_VIEW': unknown;
  /** Group: ui */
  'OPEN_SETTINGS': unknown;
  /** Group: ui */
  'SELF_TEST_WEBVIEW': unknown;
  /** Group: ui */
  'WEBVIEW_READY': unknown;
  /** Group: ui */
  'APPLICATION_ERROR': unknown;
  /** Group: ui */
  'SHOW_TIME_REPORT': unknown;
  /** Group: ui */
  'SHOW_PULL_REQUESTS': unknown;
  /** Group: ui */
  'SHOW_BUILD_STATUS': unknown;
  /** Group: ui */
  'SELECT_TEAM': unknown;
  /** Group: ui */
  'RESET_PREFERRED_REPOSITORIES': unknown;
  /** Group: ui */
  'CREATE_BRANCH': unknown;
  /** Group: ui */
  'CREATE_PULL_REQUEST': unknown;
}

/** Union of all event tags. */
export type ApplicationEventTag = keyof ApplicationEventPayloads;

/**
 * Rule registry type — one entry per Praxis rule.
 * Useful for documentation tooling and runtime introspection.
 */
export interface ApplicationRuleRegistry {
  /** Triggers: ACTIVATE */
  'application.activate': { description: 'Activate the application' };
  /** Triggers: ACTIVATION_COMPLETE */
  'application.activationComplete': { description: 'Complete application activation' };
  /** Triggers: APP_ACTIVATION_FAILED */
  'application.activationFailed': { description: 'Handle activation failure' };
  /** Triggers: DEACTIVATE */
  'application.deactivate': { description: 'Begin application deactivation' };
  /** Triggers: DEACTIVATION_COMPLETE */
  'application.deactivationComplete': { description: 'Complete application deactivation' };
  /** Triggers: CONNECTIONS_LOADED */
  'connection.loaded': { description: 'Handle connections loaded from settings' };
  /** Triggers: CONNECTION_SELECTED, SELECT_CONNECTION */
  'connection.selected': { description: 'Handle connection selection' };
  /** Triggers: CONNECTION_STATE_UPDATED */
  'connection.stateUpdated': { description: 'Handle legacy connection state update' };
  /** Triggers: DEVICE_CODE_STARTED */
  'application.deviceCodeStarted': { description: 'Handle device code flow started' };
  /** Triggers: DEVICE_CODE_COMPLETED */
  'application.deviceCodeCompleted': { description: 'Handle device code flow completed' };
  /** Triggers: DEVICE_CODE_CANCELLED */
  'application.deviceCodeCancelled': { description: 'Handle device code flow cancelled' };
  /** Triggers: AUTH_CODE_FLOW_STARTED */
  'application.authCodeFlowStarted': { description: 'Handle authorization code flow with PKCE started' };
  /** Triggers: AUTH_CODE_FLOW_COMPLETED */
  'application.authCodeFlowCompleted': { description: 'Handle authorization code flow with PKCE completed' };
  /** Triggers: WORK_ITEMS_LOADED */
  'workItems.loaded': { description: 'Handle work items loaded' };
  /** Triggers: WORK_ITEMS_ERROR */
  'workItems.error': { description: 'Handle work items fetch error' };
  /** Triggers: QUERY_CHANGED */
  'workItems.queryChanged': { description: 'Handle query change' };
  /** Triggers: APPLICATION_ERROR */
  'application.error': { description: 'Handle application error' };
  /** Triggers: RETRY */
  'application.retry': { description: 'Retry after error' };
  /** Triggers: RESET */
  'application.reset': { description: 'Reset application state' };
  /** Triggers: TOGGLE_DEBUG_VIEW */
  'application.toggleDebugView': { description: 'Toggle debug view visibility' };
  /** Triggers: OPEN_SETTINGS */
  'application.openSettings': { description: 'Open extension settings' };
  /** Triggers: VIEW_MODE_CHANGED */
  'application.viewModeChanged': { description: 'Handle view mode change' };
  /** Triggers: REFRESH_DATA */
  'application.refreshData': { description: 'Handle data refresh request' };
  /** Triggers: AUTH_REMINDER_REQUESTED */
  'application.authReminderRequested': { description: 'Handle auth reminder requested' };
  /** Triggers: AUTH_REMINDER_CLEARED */
  'application.authReminderCleared': { description: 'Handle auth reminder cleared' };
  /** Triggers: StartTimer */
  'timer.start': { description: 'Start a work item timer' };
  /** Triggers: PauseTimer */
  'timer.pause': { description: 'Pause the running timer' };
  /** Triggers: StopTimer */
  'timer.stop': { description: 'Stop and record elapsed time' };
  /** Triggers: TimerHistoryLoaded */
  'timer.historyLoaded': { description: 'Load persisted timer history into context' };
  /** Triggers: SIGN_IN_ENTRA */
  'decision.auth.signIn': { description: 'Record decision when Entra sign-in is requested' };
  /** Triggers: SIGN_OUT_ENTRA */
  'decision.auth.signOut': { description: 'Record decision when Entra sign-out is requested' };
  /** Triggers: AUTHENTICATION_SUCCESS */
  'decision.auth.authSuccess': { description: 'Record decision when authentication succeeds' };
  /** Triggers: AUTHENTICATION_FAILED */
  'decision.auth.authFailed': { description: 'Record decision when authentication fails' };
  /** Triggers: DEVICE_CODE_STARTED */
  'decision.auth.deviceCodeStart': { description: 'Record decision when device code flow starts' };
  /** Triggers: DEVICE_CODE_COMPLETED */
  'decision.auth.deviceCodeComplete': { description: 'Record decision when device code flow completes' };
  /** Triggers: DEVICE_CODE_CANCELLED */
  'decision.auth.deviceCodeCancel': { description: 'Record decision when device code flow is cancelled' };
  /** Triggers: AUTH_CODE_FLOW_STARTED */
  'decision.auth.authCodeFlowStart': { description: 'Record decision when auth code flow starts' };
  /** Triggers: AUTH_CODE_FLOW_COMPLETED */
  'decision.auth.authCodeFlowComplete': { description: 'Record decision when auth code flow completes' };
  /** Triggers: CREATE_WORK_ITEM */
  'decision.operations.createWorkItem': { description: 'Record decision to create a work item' };
  /** Triggers: BULK_ASSIGN */
  'decision.operations.bulkAssign': { description: 'Record decision to bulk-assign work items' };
  /** Triggers: CREATE_BRANCH */
  'decision.operations.createBranch': { description: 'Record decision to create a branch' };
  /** Triggers: CREATE_PULL_REQUEST */
  'decision.operations.createPullRequest': { description: 'Record decision to create a pull request' };
  /** Triggers: SELECT_CONNECTION */
  'decision.operations.selectConnection': { description: 'Record decision to select a connection' };
  /** Triggers: GENERATE_COPILOT_PROMPT */
  'decision.operations.generateCopilotPrompt': { description: 'Record decision to generate a Copilot prompt' };
  /** Triggers: ACTIVATE */
  'decision.operations.activate': { description: 'Record decision to activate application' };
  /** Triggers: DEACTIVATE */
  'decision.operations.deactivate': { description: 'Record decision to deactivate application' };
}

/** Union of all rule IDs. */
export type ApplicationRuleId = keyof ApplicationRuleRegistry;
