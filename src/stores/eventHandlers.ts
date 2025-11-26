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
  AUTHENTICATION_REQUIRED: (manager, event) => {
    if (event.connectionId) {
      manager.requestAuthReminder(event.connectionId as string, 'Authentication required');
    }
  },
  AUTHENTICATION_SUCCESS: (_manager, _event) => {
    // Auth success is usually handled via event bus, but we can trigger a step if needed
    // manager.authenticationSuccess(event.connectionId as string);
    // PraxisApplicationManager doesn't have authenticationSuccess exposed directly for this purpose
    // but it listens to event bus.
    // However, if this event comes from UI/Activation, we might want to ensure it propagates.
    // For now, let's assume activation.ts handles the logic and this is just for tracing/consistency.
  },
  AUTHENTICATION_FAILED: (_manager, _event) => {
    // Similar to success
  },
  WEBVIEW_READY: () => {
    // No direct mapping - handled at webview level
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
  CREATE_WORK_ITEM: () => {},
  CREATE_BRANCH: () => {},
  CREATE_PULL_REQUEST: () => {},
  SHOW_PULL_REQUESTS: () => {},
  SHOW_BUILD_STATUS: () => {},
  SELECT_TEAM: () => {},
  RESET_PREFERRED_REPOSITORIES: () => {},
  SELF_TEST_WEBVIEW: () => {},
  BULK_ASSIGN: () => {},
  GENERATE_COPILOT_PROMPT: () => {},
  SHOW_TIME_REPORT: () => {},
};
