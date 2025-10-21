/**
 * Application FSM with Svelte 5 Universal Reactivity
 * 
 * This replaces manual FSM subscriptions with direct reactive state using
 * Svelte 5's universal reactivity (.svelte.ts files with runes).
 */

import { createMachine, createActor, type ActorRefFrom } from 'xstate';
// Commented out to avoid importing Node.js dependencies in webview bundle
// import { applicationMachine } from '../fsm/machines/applicationMachine.js';
import type { 
  WorkItem, 
  Connection, 
  FSMSnapshot, 
  ApplicationContext, 
  FSMActions,
  Selectors,
  DebugInterface 
} from './webview-types.js';
import { 
  instrument, 
  withTrace, 
  NDJSONLogSink, 
  createReactiveFSMBridge,
  createProductionInstrumentation,
  type LogSink 
} from './fsm-instrumentation.svelte.js';

// ============================================================================
// REACTIVE FSM PATTERN
// ============================================================================

// 1) Create a lightweight machine for webview (since applicationMachine is for extension)
const machine = createMachine({
  id: 'webviewMachine',
  initial: 'initializing',
  context: {
    connections: [],
    activeConnectionId: null,
    workItems: [],
    timerState: null,
    isLoading: false,
    lastError: null
  },
  states: {
    initializing: {
      on: {
        ACTIVATE: 'active',
        ERROR: 'error'
      }
    },
    active: {
      on: {
        DEACTIVATE: 'inactive',
        ERROR: 'error',
        CONNECTION_SELECTED: 'active',
        LOAD_WORK_ITEMS: 'active',
        START_TIMER: 'active',
        STOP_TIMER: 'active'
      }
    },
    inactive: {
      on: {
        ACTIVATE: 'active'
      }
    },
    error: {
      on: {
        RETRY: 'active',
        RESET: 'initializing'
      }
    }
  }
});

// 2) Start actor (non-reactive)
let actor: ActorRefFrom<typeof machine> | null = null;
let instrumentationCleanup: (() => void) | null = null;

// 3) Instrumentation setup
const logSink = new NDJSONLogSink(5000); // Keep last 5000 logs
const productionInstrumentation = createProductionInstrumentation({
  enabled: true,
  sampleRate: 0.1, // 10% sampling in production
  maxLogsPerSecond: 50,
  enableInProduction: false // Disable in production for now
});

// 4) Reactive snapshot container (export object, not reassigned primitive)
export const fsm = $state({
  snapshot: null as FSMSnapshot | null,
  isStarted: false,
  error: null as Error | null,
  instrumentationEnabled: productionInstrumentation.enabled
});

// 4) Safe APIs for external use
export function startFSM(extensionContext: any) {
  if (fsm.isStarted) {
    console.warn('[fsm.svelte] FSM already started');
    return;
  }

  try {
    actor = createActor(machine, {
      input: { extensionContext }
    });

    // Set up instrumentation before starting
    if (fsm.instrumentationEnabled) {
      instrumentationCleanup = instrument(actor, {
        sink: logSink.log,
        sessionId: crypto.randomUUID(),
        machineId: 'applicationMachine',
        enableContextDiff: true,
        enableTiming: true
      });
      
      console.log('[fsm.svelte] FSM instrumentation enabled');
    }

    // Keep snapshot in sync with reactive updates
    actor.subscribe((snapshot) => {
      fsm.snapshot = snapshot as unknown as FSMSnapshot;
    });

    actor.start();
    fsm.isStarted = true;
    fsm.error = null;
    
    console.log('[fsm.svelte] FSM started with reactive state and instrumentation');
  } catch (error) {
    fsm.error = error as Error;
    console.error('[fsm.svelte] Failed to start FSM:', error);
  }
}

export function stopFSM() {
  if (!actor || !fsm.isStarted) {
    console.warn('[fsm.svelte] FSM not started or already stopped');
    return;
  }

  try {
    // Clean up instrumentation first
    if (instrumentationCleanup) {
      instrumentationCleanup();
      instrumentationCleanup = null;
      console.log('[fsm.svelte] FSM instrumentation cleaned up');
    }

    actor.stop();
    actor = null;
    fsm.isStarted = false;
    fsm.snapshot = null;
    fsm.error = null;
    
    console.log('[fsm.svelte] FSM stopped and state cleared');
  } catch (error) {
    fsm.error = error as Error;
    console.error('[fsm.svelte] Error stopping FSM:', error);
  }
}

export function send(event: any) {
  if (!actor || !fsm.isStarted) {
    console.warn('[fsm.svelte] Cannot send event - FSM not started');
    return;
  }

  try {
    actor.send(event);
  } catch (error) {
    fsm.error = error as Error;
    console.error('[fsm.svelte] Error sending event:', error);
  }
}

export function getSnapshot() {
  return fsm.snapshot;
}

// ============================================================================
// REACTIVE DERIVED STATE (using $derived)
// ============================================================================

// Connection-related derived state
export function activeConnection(): Connection | null {
  if (!fsm.snapshot?.context?.connections || !fsm.snapshot?.context?.activeConnectionId) {
    return null;
  }
  const snapshot = fsm.snapshot;
  return (snapshot.context.connections as Connection[]).find(
    (conn: Connection) => conn.id === snapshot.context.activeConnectionId
  ) || null;
}

export function connectionStates(): Map<string, any> {
  // For webview machine, we'll use connections array instead
  const connections = fsm.snapshot?.context?.connections || [];
  const stateMap = new Map();
  connections.forEach((conn: any) => {
    stateMap.set(conn.id, { status: 'connected' });
  });
  return stateMap;
}

export function isInitializing(): boolean {
  return fsm.snapshot?.matches?.('initializing') ?? true;
}

export function isActivated(): boolean {
  return fsm.snapshot?.matches?.('active') ?? false;
}

export function isDeactivating(): boolean {
  return fsm.snapshot?.matches?.('inactive') ?? false;
}

// Work items and data state
export function workItems(): WorkItem[] {
  const activeConnId = fsm.snapshot?.context?.activeConnectionId;
  if (!activeConnId || !fsm.snapshot?.context?.workItemsByConnection) {
    return [];
  }
  return Array.from(fsm.snapshot.context.workItemsByConnection.get(activeConnId) || []) as WorkItem[];
}

export function isDataLoading(): boolean {
  const activeConnId = fsm.snapshot?.context?.activeConnectionId;
  if (!activeConnId || !fsm.snapshot?.context?.loadingStates) {
    return false;
  }
  return fsm.snapshot.context.loadingStates.get(activeConnId) || false;
}

// Auth state
export function pendingAuthReminders(): Map<string, any> {
  return fsm.snapshot?.context?.pendingAuthReminders as Map<string, any> || new Map();
}

export function hasAuthReminders(): boolean {
  const reminders = pendingAuthReminders();
  return reminders.size > 0;
}

// Timer state
export function timerState(): any {
  return fsm.snapshot?.context?.timerActor?.getSnapshot?.() || null;
}

export function isTimerRunning(): boolean {
  const timer = timerState();
  return timer?.matches?.('running') ?? false;
}

// UI state
export function currentState(): string {
  if (!fsm.snapshot) return 'unknown';
  return typeof fsm.snapshot.value === 'string' 
    ? fsm.snapshot.value 
    : JSON.stringify(fsm.snapshot.value);
}

export function webviewReady(): boolean {
  return fsm.snapshot?.matches?.('active') ?? false;
}

// ============================================================================
// REACTIVE EFFECTS (using $effect)
// ============================================================================

// Check if we're in a proper Svelte component context before creating effects
let fsmEffectsInitialized = false;

export function initializeFSMEffects() {
  if (fsmEffectsInitialized) return;
  fsmEffectsInitialized = true;

  // Effect to log state changes (development only)
  $effect(() => {
    if (fsm.snapshot) {
      console.log('[fsm.svelte] State changed:', {
        state: currentState(),
        activeConnectionId: fsm.snapshot.context?.activeConnectionId,
        workItemsCount: workItems().length,
        isDataLoading: isDataLoading(),
      });
    }
  });
}

// ============================================================================
// SELECTORS (functions that use derived state)
// ============================================================================

export const selectors: Selectors = {
  getConnectionById: (id: string): Connection | undefined => {
    const connections = fsm.snapshot?.context?.connections as Connection[] || [];
    return connections.find((conn: Connection) => conn.id === id);
  },

  getWorkItemById: (id: number): WorkItem | undefined => {
    return workItems().find((item: WorkItem) => item.id === id);
  },

  getWorkItemsByState: (state: string): WorkItem[] => {
    return workItems().filter((item: WorkItem) => item['System.State'] === state);
  },

  getActiveWorkItemId: (): number | undefined => {
    const timer = timerState();
    return timer?.context?.workItemId;
  },

  getConnectionState: (connectionId: string): any => {
    const states = connectionStates();
    return states.get(connectionId);
  },
};

// ============================================================================
// ACTIONS (send events to FSM)
// ============================================================================

export const actions: FSMActions = {
  // Extension lifecycle
  activate: () => send({ type: 'ACTIVATE' }),
  deactivate: () => send({ type: 'DEACTIVATE' }),

  // Required by FSMActions interface
  startConnection: (payload?: any) => send({ type: 'START_CONNECTION', ...payload }),
  stopConnection: () => send({ type: 'STOP_CONNECTION' }),

  // Connection management
  addConnection: (connection: Connection) => send({ type: 'ADD_CONNECTION', connection }),
  setActiveConnection: (connectionId: string) => send({ type: 'SET_ACTIVE_CONNECTION', connectionId }),
  removeConnection: (connectionId: string) => send({ type: 'REMOVE_CONNECTION', connectionId }),

  // Work items
  loadWorkItems: (connId?: string, query?: any) => 
    send({ type: 'LOAD_WORK_ITEMS', connectionId: connId, query }),
  workItemsLoaded: (payload?: any) =>
    send({ type: 'WORK_ITEMS_LOADED', ...payload }),

  // Timer
  startTimer: (workItemId?: string | number, title?: string) => 
    send({ type: 'START_TIMER', workItemId, title }),
  stopTimer: () => send({ type: 'STOP_TIMER' }),

  // Auth
  requireAuthentication: (connectionId: string) =>
    send({ type: 'REQUIRE_AUTHENTICATION', connectionId }),
  authenticationComplete: (connectionId: string) =>
    send({ type: 'AUTHENTICATION_COMPLETE', connectionId }),

  // Webview
  webviewReady: () => send({ type: 'WEBVIEW_READY' }),
  webviewClosed: () => send({ type: 'WEBVIEW_CLOSED' }),
};

// ============================================================================
// DEBUG UTILITIES
// ============================================================================

export const debug: DebugInterface = {
  getFullState: () => fsm,
  getContext: () => fsm.snapshot?.context,
  getCurrentState: () => currentState(),
  getSnapshot: () => getSnapshot(),
  
  // Subscribe to all state changes (for debugging)
  subscribe: (callback: (snapshot: FSMSnapshot) => void) => {
    // Use $effect to create a reactive subscription - only in component context
    try {
      $effect(() => {
        if (fsm.snapshot) {
          callback(fsm.snapshot);
        }
      });
    } catch (error) {
      console.warn('[fsm.svelte] Subscribe effect creation failed (not in component context):', error);
      // Fallback to direct subscription for non-component contexts
      return actor?.subscribe((snapshot: any) => callback(snapshot)) || { unsubscribe: () => {} };
    }
  },

  // Instrumentation debug API
  instrumentation: {
    exportLogs: () => logSink.export(),
    clearLogs: () => logSink.clear(),
    getLogCount: () => logSink.getLogCount(),
    toggleInstrumentation: () => {
      fsm.instrumentationEnabled = !fsm.instrumentationEnabled;
      console.log(`[fsm.svelte] Instrumentation ${fsm.instrumentationEnabled ? 'enabled' : 'disabled'}`);
    },
    getSamplingStats: () => productionInstrumentation.samplingStats,
    getRateLimitStats: () => productionInstrumentation.rateLimitStats,
    downloadLogs: () => {
      const logs = logSink.export();
      const blob = new Blob([logs], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fsm-logs-${new Date().toISOString().slice(0, 19)}.ndjson`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }
};