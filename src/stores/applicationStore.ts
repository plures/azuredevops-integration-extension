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
import { createPraxisStore, createContextStore, createDerivedStore } from '@plures/praxis/svelte';
import { PraxisApplicationManager } from '../praxis/application/manager.js';
import type { ProjectConnection } from '../praxis/connection/types.js';
import type { PraxisApplicationContext } from '../praxis/application/types.js';
import { setApplicationStoreBridge } from '../services/extensionHostBridge.js';
import { eventHandlers, type ApplicationEvent } from './eventHandlers.js';
import { createComponentLogger, Component } from '../logging/ComponentLogger.js';

const logger = createComponentLogger(Component.APPLICATION, 'applicationStore');

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
// STORE CREATION HELPERS
// ============================================================================

/**
 * Create state wrapper object for legacy compatibility
 */
function createStateWrapper(
  appState: string,
  appData: ApplicationContext
): {
  value: string;
  context: ApplicationContext;
  matches: (state: string) => boolean;
  can: (event: ApplicationEvent) => boolean;
} {
  return {
    value: appState,
    context: appData,
    matches: (stateValue: string) => {
      if (appState === stateValue) return true;
      if (appState.includes(stateValue)) return true;
      // Map legacy states
      if (stateValue === 'activation_failed' && appState === 'activation_error') return true;
      return false;
    },
    can: (_event: ApplicationEvent) => true, // Praxis handles validation internally
  };
}

/**
 * Create derived stores for optimized state access
 */
function createDerivedStores(engine: any) {
  return {
    connections: createDerivedStore(engine, (ctx) => ctx.connections || []),
    activeConnectionId: createDerivedStore(engine, (ctx) => ctx.activeConnectionId),
    connectionStates: createDerivedStore(engine, (ctx) => ctx.connectionStates || new Map()),
    pendingAuthReminders: createDerivedStore(
      engine,
      (ctx) => ctx.pendingAuthReminders || new Map()
    ),
    isActivated: createDerivedStore(engine, (ctx) => ctx.isActivated ?? false),
    isDeactivating: createDerivedStore(engine, (ctx) => ctx.isDeactivating ?? false),
    lastError: createDerivedStore(engine, (ctx) => ctx.lastError),
  };
}

// ============================================================================
// CORE APPLICATION STATE STORE
// ============================================================================

/**
 * Creates the main application manager and wraps it in Svelte stores
 *
 * Uses Praxis unified Svelte integration (@plures/praxis/svelte) for reactive subscriptions
 * instead of polling, providing better performance and following Praxis best practices.
 *
 * The integration provides:
 * - Proper reactive subscriptions (no polling overhead)
 * - Automatic cleanup and subscription management
 * - Type-safe store access
 * - Better performance through event-driven updates
 */
function createApplicationStore() {
  // Create and start the Praxis application manager
  const applicationManager = PraxisApplicationManager.getInstance();
  applicationManager.start();

  // Get the underlying engine for the unified integration
  const engine = applicationManager.getEngine();

  // Create reactive stores using Praxis unified integration
  const praxisStore = createPraxisStore(engine);
  const contextStore = createContextStore(engine);
  const derivedStores = createDerivedStores(engine);

  // Current state wrapper that bridges Praxis store to our expected interface
  const currentState = writable<{
    value: string;
    context: ApplicationContext;
    matches: (state: string) => boolean;
    can: (event: ApplicationEvent) => boolean;
  } | null>(null);

  // Subscribe to manager's internal subscription system
  const managerUnsubscribe = applicationManager.subscribe(() => {
    const appState = applicationManager.getApplicationState();
    const appData = applicationManager.getContext() as unknown as ApplicationContext;
    currentState.set(createStateWrapper(appState, appData));
  });

  // Subscribe to Praxis store for completeness
  const praxisUnsubscribe = praxisStore.subscribe((praxisState) => {
    if (!praxisState) {
      currentState.set(null);
      return;
    }
    const appState = applicationManager.getApplicationState();
    const appData = applicationManager.getContext() as unknown as ApplicationContext;
    currentState.set(createStateWrapper(appState, appData));
  });

  // Application State Store (readable wrapper)
  const applicationState = readable<{
    value: string;
    context: ApplicationContext;
    matches: (state: string) => boolean;
    can: (event: ApplicationEvent) => boolean;
  } | null>(null, (set) => {
    const unsubscribe = currentState.subscribe(set);
    return () => {
      unsubscribe();
      praxisUnsubscribe();
      managerUnsubscribe();
      applicationManager.stop();
    };
  });

  return {
    applicationState,
    send: (event: ApplicationEvent) => handleApplicationEvent(applicationManager, event),
    get actor() {
      return applicationManager;
    },
    get praxisStore() {
      return praxisStore;
    },
    get contextStore() {
      return contextStore;
    },
    get derivedStores() {
      return derivedStores;
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
// Use Praxis derived stores for better performance
export const isActivated = applicationStore.derivedStores.isActivated;

export const isInitializing = derived(
  applicationStore.applicationState,
  ($state) => $state?.matches('activating') ?? false
);

export const isDeactivating = applicationStore.derivedStores.isDeactivating;

// Connection Management State
// Use Praxis derived stores for better performance
export const connections = applicationStore.derivedStores.connections;

export const activeConnectionId = applicationStore.derivedStores.activeConnectionId;

export const connectionStates = applicationStore.derivedStores.connectionStates;

// Authentication State
export const pendingAuthReminders = applicationStore.derivedStores.pendingAuthReminders;

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
// Use Praxis derived store for better performance
export const lastError = applicationStore.derivedStores.lastError;

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
        vscodeApi.postMessage({ type: 'appEvent', event: evt });
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
