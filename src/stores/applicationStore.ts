/**
 * Central Application Store - XState + Svelte Integration
 *
 * This is the single source of truth for application state.
 * It wraps the XState application machine in Svelte stores,
 * providing reactive state to components without message passing.
 */

import { readable, writable, derived, get } from 'svelte/store';
import { createActor, ActorRefFrom } from 'xstate';
import {
  applicationMachine,
  type ApplicationContext,
  type ApplicationEvent,
} from '../fsm/machines/applicationMachine.js';
import { setApplicationStoreBridge } from '../fsm/services/extensionHostBridge.js';

// ============================================================================
// CORE APPLICATION STATE STORE
// ============================================================================

/**
 * Creates the main application actor and wraps it in Svelte stores
 */
function createApplicationStore() {
  // Eagerly create and start the actor to avoid timing issues
  const applicationActor: ActorRefFrom<typeof applicationMachine> = createActor(applicationMachine);
  applicationActor.start();

  // Application State Store (reactive to FSM state)
  const applicationState = readable<{
    value: string;
    context: ApplicationContext;
    matches: (state: string) => boolean;
    can: (event: ApplicationEvent) => boolean;
  } | null>(null, (set) => {
    // Subscribe to state changes and update the store
    const subscription = applicationActor.subscribe((state) => {
      set({
        value: state.value as string,
        context: state.context,
        matches: (stateValue: string) => state.matches(stateValue),
        can: (event: ApplicationEvent) => state.can(event),
      });
    });

    return () => {
      subscription.unsubscribe();
      applicationActor?.stop();
    };
  });

  // Send events to the FSM
  function send(event: ApplicationEvent) {
    applicationActor.send(event);
  }

  return {
    applicationState,
    send,
    // Expose actor for debugging
    get actor() {
      return applicationActor;
    },
  };
}

// Create the singleton store instance
const applicationStore = createApplicationStore();

setApplicationStoreBridge({
  getActor: () => applicationStore.actor,
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
  activate: (context: any) => applicationStore.send({ type: 'ACTIVATE', context }),
  deactivate: () => applicationStore.send({ type: 'DEACTIVATE' }),

  // Connection Management
  loadConnections: (connections: any[]) =>
    applicationStore.send({ type: 'CONNECTIONS_LOADED', connections }),

  selectConnection: (connectionId: string) =>
    applicationStore.send({ type: 'CONNECTION_SELECTED', connectionId }),

  // Authentication
  requireAuthentication: (connectionId: string) =>
    applicationStore.send({ type: 'AUTHENTICATION_REQUIRED', connectionId }),

  authenticationSuccess: (connectionId: string) =>
    applicationStore.send({ type: 'AUTHENTICATION_SUCCESS', connectionId }),

  authenticationFailed: (connectionId: string, error: string) =>
    applicationStore.send({ type: 'AUTHENTICATION_FAILED', connectionId, error }),

  // UI Events
  webviewReady: () => applicationStore.send({ type: 'WEBVIEW_READY' }),

  webviewMessage: (message: any) => applicationStore.send({ type: 'WEBVIEW_MESSAGE', message }),

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
    const actor = applicationStore.actor;
    return actor ? actor.getSnapshot() : null;
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
