/**
 * Module: src/stores/applicationStore.ts
 * Owner: application
 * Reads: (document)
 * Writes: (document)
 * Receives: (document)
 * Emits: (document)
 * Prohibitions: Do not mutate ApplicationContext directly; Do not define new *Context types
 * Rationale: (document)
 *
 * LLM-GUARD:
 * - Follow ownership boundaries; route events to Router; do not add UI logic here
 *
 * This module now uses Praxis logic engine instead of XState.
 */
/**
 * Central Application Store - Praxis + Svelte Integration
 *
 * This is the single source of truth for application state.
 * It wraps the Praxis application manager in Svelte stores,
 * providing reactive state to components without message passing.
 */

import { readable, writable, derived } from 'svelte/store';
import { PraxisApplicationManager } from '../praxis/application/manager.js';
import type { ProjectConnection } from '../praxis/connection/types.js';
import type { PraxisApplicationContext } from '../praxis/application/types.js';
import { setApplicationStoreBridge } from '../fsm/services/extensionHostBridge.js';
import { eventHandlers, type ApplicationEvent } from './eventHandlers.js';
import { createComponentLogger, FSMComponent } from '../fsm/logging/FSMLogger.js';

const logger = createComponentLogger(FSMComponent.APPLICATION, 'applicationStore');

// ============================================================================
// TYPE DEFINITIONS FOR COMPATIBILITY
// ============================================================================

// Use PraxisApplicationContext directly instead of local interface
type ApplicationContext = PraxisApplicationContext;

// ============================================================================
// EVENT HANDLING HELPER
// ============================================================================

/**
 * Handle application events by dispatching to the appropriate manager method.
 * Separated to reduce complexity in the main send function.
 */
function handleApplicationEvent(manager: PraxisApplicationManager, event: ApplicationEvent): void {
  const handler = eventHandlers[event.type];
  if (handler) {
    handler(manager, event);
  } else {
    // Log unknown event types in debug mode for development
    logger.warn(
      `[applicationStore] Unknown event type: ${event.type}`,
      { event: event.type },
      event
    );
  }
}

// ============================================================================
// CORE APPLICATION STATE STORE
// ============================================================================

/**
 * Creates the main application manager and wraps it in Svelte stores
 */
function createApplicationStore() {
  // Create and start the Praxis application manager
  const applicationManager = new PraxisApplicationManager();
  applicationManager.start();

  // Current state store (updated via polling since Praxis doesn't have built-in subscriptions)
  const currentState = writable<{
    value: string;
    context: ApplicationContext;
    matches: (state: string) => boolean;
    can: (event: ApplicationEvent) => boolean;
  } | null>(null);

  // Poll for state changes (similar to how we handled it in ConnectionFSMManager)
  let lastSnapshot = '';

  const pollInterval = setInterval(() => {
    const appState = applicationManager.getApplicationState();
    const appData = applicationManager.getContext();

    // Create a fingerprint of the state to detect changes
    // We include key UI-driving properties to avoid redundant updates
    const currentSnapshot = JSON.stringify({
      state: appState,
      activeConnectionId: appData.activeConnectionId,
      activeQuery: appData.activeQuery,
      viewMode: appData.viewMode,
      isActivated: appData.isActivated,
      isDeactivating: appData.isDeactivating,
      connectionsLen: appData.connections.length,
      // Check map sizes to detect data changes
      workItemsMapSize: appData.connectionWorkItems.size,
      statesMapSize: appData.connectionStates.size,
      // Check specific work items count for active connection
      activeWorkItemsLen: appData.activeConnectionId
        ? appData.connectionWorkItems.get(appData.activeConnectionId)?.length
        : 0,
      // Check last error to ensure error states are propagated
      lastError: appData.lastError ? appData.lastError.message : null,
    });

    if (currentSnapshot !== lastSnapshot) {
      lastSnapshot = currentSnapshot;

      currentState.set({
        value: appState,
        context: appData,
        matches: (stateValue: string) => appState === stateValue || appState.includes(stateValue),
        can: (_event: ApplicationEvent) => true, // Praxis handles validation internally
      });
    }
  }, 100);

  // Application State Store (readable wrapper)
  const applicationState = readable<{
    value: string;
    context: ApplicationContext;
    matches: (state: string) => boolean;
    can: (event: ApplicationEvent) => boolean;
  } | null>(null, (set) => {
    // Subscribe to the writable store
    const unsubscribe = currentState.subscribe(set);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
      applicationManager.stop();
    };
  });

  // Send events to the application manager
  function send(event: ApplicationEvent) {
    // Map XState event types to Praxis manager methods
    handleApplicationEvent(applicationManager, event);
  }

  return {
    applicationState,
    send,
    // Expose manager for debugging
    get actor() {
      return applicationManager;
    },
  };
}

// Create the singleton store instance
const applicationStore = createApplicationStore();

// Create a bridge actor that mimics XState actor but delegates to Praxis manager + Svelte store
const bridgeActor = {
  // Delegate Praxis methods to the manager
  getApplicationState: () => applicationStore.actor.getApplicationState(),
  getContext: () => applicationStore.actor.getContext(),
  getSnapshot: () => applicationStore.actor.getSnapshot(),
  start: () => applicationStore.actor.start(),
  stop: () => applicationStore.actor.stop(),

  // Implement XState-compatible subscribe using the Svelte store
  subscribe: (callback: (snapshot: any) => void) => {
    const unsubscribe = applicationStore.applicationState.subscribe((state) => {
      if (state) {
        callback(state);
      }
    });
    return { unsubscribe };
  },

  // Delegate send
  send: (event: any) => applicationStore.send(event as ApplicationEvent),
};

setApplicationStoreBridge({
  getActor: () => bridgeActor as unknown,
  send: (event) => applicationStore.send(event as ApplicationEvent),
});

// ============================================================================
// DERIVED REACTIVE STATE STORES
// ============================================================================

// Extension Lifecycle State
export const isActivated = derived(
  applicationStore.applicationState,
  ($state) => $state?.context.isActivated ?? false
);

export const isInitializing = derived(
  applicationStore.applicationState,
  ($state) => $state?.matches('activating') ?? false
);

export const isDeactivating = derived(
  applicationStore.applicationState,
  ($state) => $state?.context.isDeactivating ?? false
);

// Connection Management State
export const connections = derived(
  applicationStore.applicationState,
  ($state) => $state?.context.connections ?? []
);

export const activeConnectionId = derived(
  applicationStore.applicationState,
  ($state) => $state?.context.activeConnectionId
);

export const connectionStates = derived(
  applicationStore.applicationState,
  ($state) => $state?.context.connectionStates ?? new Map()
);

// Authentication State
export const pendingAuthReminders = derived(
  applicationStore.applicationState,
  ($state) => $state?.context.pendingAuthReminders ?? new Map()
);

// UI State
export const webviewReady = derived(
  applicationStore.applicationState,
  ($state) => $state?.matches('active.ui.ready') ?? false
);

export const uiError = derived(
  applicationStore.applicationState,
  ($state) => $state?.matches('active.ui.ui_error') ?? false
);

// Data Sync State
export const isDataLoading = derived(
  applicationStore.applicationState,
  ($state) => $state?.matches('active.data.loading') ?? false
);

export const isDataSynced = derived(
  applicationStore.applicationState,
  ($state) => $state?.matches('active.data.synced') ?? false
);

export const dataError = derived(
  applicationStore.applicationState,
  ($state) => $state?.matches('active.data.sync_error') ?? false
);

// Error State
export const lastError = derived(
  applicationStore.applicationState,
  ($state) => $state?.context.lastError
);

export const isInErrorRecovery = derived(
  applicationStore.applicationState,
  ($state) => $state?.matches('error_recovery') ?? false
);

// ============================================================================
// ACTIONS (FSM Event DISPATCHERS)
// ============================================================================

/**
 * Pure functions that dispatch events to the FSM
 * These replace the large monolithic functions
 */
export const actions = {
  // Extension Lifecycle
  activate: (context: unknown) => applicationStore.send({ type: 'ACTIVATE', context }),
  deactivate: () => applicationStore.send({ type: 'DEACTIVATE' }),

  // Connection Management
  loadConnections: (connections: ProjectConnection[]) =>
    applicationStore.send({ type: 'CONNECTIONS_LOADED', connections }),

  selectConnection: async (connectionId: string) => {
    // Prefer webview-owned selection via writer factory; fall back to FSM event if not available
    const vscodeApi = (globalThis as any).__vscodeApi || (globalThis as any).acquireVsCodeApi?.();
    if (vscodeApi && typeof vscodeApi.postMessage === 'function') {
      try {
        const mod = await import('../webview/selection.writer.internal.js');
        const evt = mod.createSelectConnection(mod.webviewOwner, connectionId);
        vscodeApi.postMessage({ type: 'fsmEvent', event: evt });
        return;
      } catch {
        // fall through to FSM event
      }
    }
    applicationStore.send({ type: 'CONNECTION_SELECTED', connectionId });
  },

  // Authentication
  requireAuthentication: (connectionId: string) =>
    applicationStore.send({ type: 'AUTHENTICATION_REQUIRED', connectionId }),

  authenticationSuccess: (connectionId: string) =>
    applicationStore.send({ type: 'AUTHENTICATION_SUCCESS', connectionId }),

  authenticationFailed: (connectionId: string, error: string) =>
    applicationStore.send({ type: 'AUTHENTICATION_FAILED', connectionId, error }),

  // UI Events
  webviewReady: () => applicationStore.send({ type: 'WEBVIEW_READY' }),

  webviewMessage: (message: unknown) => applicationStore.send({ type: 'WEBVIEW_MESSAGE', message }),

  // Error Handling
  reportError: (error: Error) => applicationStore.send({ type: 'ERROR', error }),
  retry: () => applicationStore.send({ type: 'RETRY' }),
  reset: () => applicationStore.send({ type: 'RESET' }),
};

// ============================================================================
// STATE SELECTORS (COMPUTED VALUES)
// ============================================================================

/**
 * Pure computed values derived from the state
 * These replace complex state calculations in components
 */
export const selectors = {
  // Get initialization status with detailed sub-state
  getInitializationStatus: derived(applicationStore.applicationState, ($state) => {
    if (!$state) return { phase: 'inactive', progress: 0 };

    if ($state.matches('inactive')) {
      return { phase: 'inactive', progress: 0 };
    }
    if ($state.matches('activating')) {
      return { phase: 'activating', progress: 25 };
    }
    if ($state.matches('active.ui.initializing')) {
      return { phase: 'ui-setup', progress: 50 };
    }
    if ($state.matches('active.ui.ready') && !$state.matches('active.data.synced')) {
      return { phase: 'loading-data', progress: 75 };
    }
    if ($state.matches('active.data.synced')) {
      return { phase: 'ready', progress: 100 };
    }

    return { phase: 'unknown', progress: 0 };
  }),

  // Get connection by ID
  getConnectionById: (connectionId: string) =>
    derived([connections, connectionStates], ([$connections, $connectionStates]) => {
      const config = $connections.find((c) => c.id === connectionId);
      const state = $connectionStates.get(connectionId);
      return config ? { ...config, state } : null;
    }),

  // Get auth reminders as array
  getAuthRemindersArray: derived(pendingAuthReminders, ($reminders) =>
    Array.from($reminders.values())
  ),

  // Check if can perform actions
  canActivate: derived(
    applicationStore.applicationState,
    ($state) => $state?.can({ type: 'ACTIVATE', context: null }) ?? false
  ),

  canDeactivate: derived(
    applicationStore.applicationState,
    ($state) => $state?.can({ type: 'DEACTIVATE' }) ?? false
  ),

  canRetry: derived(
    applicationStore.applicationState,
    ($state) => $state?.can({ type: 'RETRY' }) ?? false
  ),
};

// ============================================================================
// DEBUGGING AND DEVELOPMENT
// ============================================================================

// Development helpers (renamed to avoid export conflicts)
export const storeDebug = {
  // Get current state snapshot
  getSnapshot: () => {
    const manager = applicationStore.actor as PraxisApplicationManager;
    return manager
      ? {
          value: manager.getApplicationState(),
          context: manager.getContext(),
        }
      : null;
  },

  // Get state as string for logging
  getStateString: () => {
    const snapshot = storeDebug.getSnapshot();
    return snapshot ? JSON.stringify(snapshot.value) : 'not-started';
  },

  // Send arbitrary event (for testing)
  send: (event: ApplicationEvent) => applicationStore.send(event),

  // Get full context (for debugging)
  getContext: () => {
    const snapshot = storeDebug.getSnapshot();
    return snapshot ? snapshot.context : null;
  },
};

// Export the main application state and actions
export { applicationStore };
export const applicationState = applicationStore.applicationState;

// Re-export debug utilities (renamed to avoid conflicts)
export { storeDebug as debug };

export default applicationStore;
