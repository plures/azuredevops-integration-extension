import { PraxisApplicationManager } from '../praxis/application/manager.js';

export interface ApplicationEvent {
  type: string;
  [key: string]: unknown;
}

export const eventHandlers: Record<
  string,
  (manager: PraxisApplicationManager, event: ApplicationEvent) => void
> = {
  ACTIVATE: (manager) => manager.activate(),
  ACTIVATION_COMPLETE: (manager) => manager.activationComplete(),
  DEACTIVATE: (manager) => manager.deactivate(),
  EXTENSION_DEACTIVATED: (manager) => manager.deactivate(),
  CONNECTIONS_LOADED: (manager, event) => {
    if (event.connections && Array.isArray(event.connections)) {
      manager.loadConnections(event.connections as any[]);
    }
  },
  CONNECTION_SELECTED: (manager, event) => {
    if (event.connectionId) {
      manager.selectConnection(event.connectionId as string);
    }
  },
  SELECT_CONNECTION: (manager, event) => {
    if (event.connectionId) {
      manager.selectConnection(event.connectionId as string);
    }
  },
  AUTHENTICATION_REQUIRED: (manager, event) => {
    if (event.connectionId) {
      manager.requestAuthReminder(event.connectionId as string, 'Authentication required');
    }
  },
  AUTHENTICATION_SUCCESS: (manager, event) => {
    if (event.connectionId) {
      manager.authenticationSuccess(event.connectionId as string);
    }
  },
  AUTHENTICATION_FAILED: (manager, event) => {
    if (event.connectionId && event.error) {
      manager.authenticationFailed(event.connectionId as string, event.error as string);
    }
  },
  AUTH_REMINDER_CLEARED: (manager, event) => {
    if (event.connectionId) {
      manager.clearAuthReminder(event.connectionId as string);
    }
  },
  CONNECTION_ESTABLISHED: (manager, event) => {
    if (event.connectionId) {
      if (event.connectionState) {
        manager.updateConnectionState(event.connectionId as string, event.connectionState);
      }
      manager.selectConnection(event.connectionId as string);
      manager.refreshData(event.connectionId as string);
    }
  },
  WEBVIEW_READY: (manager) => {
    manager.webviewReady();
  },
  UPDATE_WEBVIEW_PANEL: (_manager, _event) => {
    // Webview panel is managed externally in the new architecture
    // We handle this event to suppress warnings from activation.ts
  },
  ERROR: (manager, event) => {
    if (event.error) {
      const err = event.error as Error;
      manager.reportError(err.message);
    }
  },
  RETRY: (manager) => manager.retry(),
  RESET: (manager) => manager.reset(),
  REFRESH_DATA: (manager, event) => manager.refreshData(event.connectionId as string),
  SIGN_IN_ENTRA: (manager, event) =>
    manager.signInEntra(event.connectionId as string, event.forceInteractive as boolean),
  SIGN_OUT_ENTRA: (manager, event) => manager.signOutEntra(event.connectionId as string),
  WORK_ITEMS_LOADED: (manager, event) => {
    const connectionId =
      typeof event.connectionId === 'string'
        ? (event.connectionId as string)
        : manager.getContext().activeConnectionId;

    if (!connectionId) {
      return;
    }

    const workItems = Array.isArray(event.workItems) ? (event.workItems as any[]) : [];
    const query = typeof event.query === 'string' ? (event.query as string) : undefined;

    manager.workItemsLoaded(workItems, connectionId, query);

    if (event.kanbanView === true) {
      manager.setViewMode('kanban');
    }
  },

  WORK_ITEMS_ERROR: (manager, event) => {
    const connectionId =
      typeof event.connectionId === 'string'
        ? (event.connectionId as string)
        : manager.getContext().activeConnectionId;

    if (!connectionId) {
      return;
    }

    const error = typeof event.error === 'string' ? (event.error as string) : 'Unknown error';
    manager.workItemsError(error, connectionId);
  },

  COMMENT_RESULT: (manager, event) => {
    if (event.success === false) {
      const errorMessage =
        typeof event.error === 'string' ? (event.error as string) : 'Comment operation failed';
      manager.reportError(errorMessage, event.connectionId as string | undefined);
    }
    // Success cases are handled upstream (webview/UI). No-op to avoid warning noise.
  },
  TOGGLE_DEBUG_VIEW: (manager) => manager.toggleDebugView(),
  TOGGLE_VIEW: (manager) => manager.toggleViewMode(),
  PAUSE_TIMER: (manager) => manager.pauseTimer(),
  RESUME_TIMER: (manager) => manager.resumeTimer(),
  STOP_TIMER: (manager) => manager.stopTimer(),
  START_TIMER: (manager, event) => {
    if (event.workItemId && event.title) {
      manager.startTimer(event.workItemId as number, event.title as string);
    }
  },
  // UI Events handled by activation.ts or webview, but passed through for tracing
  CREATE_WORK_ITEM: (manager, event) => {
    if (event.connectionId) {
      manager.createWorkItem(event.connectionId as string);
    }
  },
  CREATE_BRANCH: (manager, event) => {
    if (event.connectionId) {
      manager.createBranch(event.connectionId as string, event.workItemId as number);
    }
  },
  CREATE_PULL_REQUEST: (manager, event) => {
    if (event.connectionId) {
      manager.createPullRequest(event.connectionId as string, event.workItemId as number);
    }
  },
  SHOW_PULL_REQUESTS: (manager, event) => {
    if (event.connectionId) {
      manager.showPullRequests(event.connectionId as string);
    }
  },
  SHOW_BUILD_STATUS: (manager, event) => {
    if (event.connectionId) {
      manager.showBuildStatus(event.connectionId as string);
    }
  },
  SELECT_TEAM: (manager, event) => {
    if (event.connectionId) {
      manager.selectTeam(event.connectionId as string);
    }
  },
  RESET_PREFERRED_REPOSITORIES: (manager, event) => {
    if (event.connectionId) {
      manager.resetPreferredRepositories(event.connectionId as string);
    }
  },
  SELF_TEST_WEBVIEW: (manager) => {
    manager.selfTestWebview();
  },
  BULK_ASSIGN: (manager, event) => {
    if (event.connectionId && Array.isArray(event.workItemIds)) {
      manager.bulkAssign(event.connectionId as string, event.workItemIds as number[]);
    }
  },
  GENERATE_COPILOT_PROMPT: (manager, event) => {
    if (event.connectionId && event.workItemId) {
      manager.generateCopilotPrompt(event.connectionId as string, event.workItemId as number);
    }
  },
  SHOW_TIME_REPORT: (manager, event) => {
    if (event.connectionId) {
      manager.showTimeReport(event.connectionId as string);
    }
  },
  SET_CONNECTION_QUERY: (manager, event) => {
    if (event.query && typeof event.query === 'string') {
      manager.setQuery(event.query, event.connectionId as string);
    }
  },
  RESET_AUTH: (manager, event) => {
    // Reset auth: sign out and then open settings for reconfiguration
    const connectionId = typeof event.connectionId === 'string' ? event.connectionId : manager.getContext().activeConnectionId;
    if (connectionId) {
      // Sign out first to clear auth state
      manager.signOutEntra(connectionId);
    }
    // Note: Opening settings is handled in activation.ts message handler
    // This allows the user to reconfigure auth (choose PAT or Entra, etc.)
  },
  OPEN_SETTINGS: (_manager, _event) => {
    // Opening settings is handled directly in activation.ts message handler
    // This is a no-op here to prevent "Unknown event type" warnings
  },
};
