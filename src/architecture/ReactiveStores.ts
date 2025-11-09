/**
 * Module: src/architecture/ReactiveStores.ts
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
 */
/**
 * Context-Driven Architecture - Reactive Stores
 *
 * Svelte stores that expose the shared application context reactively.
 * Components can subscribe to these stores and automatically re-render
 * when the context changes.
 */

import { writable, derived, type Readable } from 'svelte/store';
import {
  ApplicationContext,
  contextSelectors,
  type Connection,
  type WorkItem,
  type TimerState,
} from './ApplicationContext';

/**
 * Main application context store
 * This is updated by the XState actors and drives all reactive UI updates
 */
export const applicationContext = writable<ApplicationContext | null>(null);

/**
 * Derived stores that automatically compute display data
 * These update automatically when the context changes
 */

// Connection-related stores
export const connections = derived(applicationContext, ($context) => $context?.connections || []);

export const activeConnectionId = derived(
  applicationContext,
  ($context) => $context?.activeConnectionId || null
);

export const activeConnection = derived(applicationContext, ($context) =>
  $context ? contextSelectors.getActiveConnection($context) : null
);

export const connectionsNeedingAuth = derived(applicationContext, ($context) =>
  $context ? contextSelectors.getConnectionsNeedingAuth($context) : []
);

// Work item stores
export const activeWorkItems = derived(applicationContext, ($context) =>
  $context ? contextSelectors.getActiveWorkItems($context) : []
);

export const workItemsByConnection = derived(
  applicationContext,
  ($context) => $context?.workItemsByConnection || new Map()
);

// Loading state stores
export const isActiveConnectionLoading = derived(applicationContext, ($context) => {
  if (!$context?.activeConnectionId) return false;
  return contextSelectors.isConnectionLoading($context, $context.activeConnectionId);
});

export const loadingStates = derived(
  applicationContext,
  ($context) => $context?.loadingStates || new Map()
);

// Error state stores
export const activeConnectionError = derived(applicationContext, ($context) => {
  if (!$context?.activeConnectionId) return null;
  return contextSelectors.getConnectionError($context, $context.activeConnectionId);
});

// Timer stores
export const timerState = derived(
  applicationContext,
  ($context) =>
    $context?.timer || {
      isActive: false,
      isRunning: false,
      elapsed: 0,
    }
);

export const activeTimerWorkItem = derived(applicationContext, ($context) =>
  $context ? contextSelectors.getActiveTimerWorkItem($context) : null
);

// UI state stores
export const activeTab = derived(applicationContext, ($context) => $context?.activeTab || '');

export const kanbanView = derived(applicationContext, ($context) => $context?.kanbanView || false);

// Settings store
export const settings = derived(
  applicationContext,
  ($context) =>
    $context?.settings || {
      defaultQuery: 'My Activity',
      refreshInterval: 30000,
    }
);

/**
 * Tab-specific derived stores
 * These allow the UI to display data for any tab/connection independently
 */
export const createTabStore = (tabId: string) => ({
  workItems: derived(applicationContext, ($context) =>
    $context ? contextSelectors.getWorkItemsForTab($context, tabId) : []
  ),

  isLoading: derived(applicationContext, ($context) =>
    $context ? contextSelectors.isConnectionLoading($context, tabId) : false
  ),

  error: derived(applicationContext, ($context) =>
    $context ? contextSelectors.getConnectionError($context, tabId) : null
  ),

  connection: derived(
    applicationContext,
    ($context) => $context?.connections.find((c) => c.id === tabId) || null
  ),
});

/**
 * Context Actions Interface
 * This provides a clean way for components to trigger context updates
 */
export interface ContextActions {
  // Connection actions
  setActiveConnection: (connectionId: string) => void;
  setActiveTab: (tabId: string) => void;

  // Timer actions
  startTimer: (workItemId?: number) => void;
  stopTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;

  // UI actions
  toggleKanbanView: () => void;

  // Data actions
  refreshConnection: (connectionId: string) => void;
  refreshAllConnections: () => void;

  // Settings actions
  updateSettings: (settings: any) => void;
}

/**
 * Context actions implementation
 * These are provided by the application actor and update the shared context
 */
let contextUpdater: any = null;

export const setContextUpdater = (updater: any) => {
  contextUpdater = updater;
};

export const contextActions: ContextActions = {
  setActiveConnection: (connectionId: string) => {
    contextUpdater?.updateContext((context: ApplicationContext) => ({
      ...context,
      activeConnectionId: connectionId,
      activeTab: connectionId, // Sync tab with connection
    }));
  },

  setActiveTab: (tabId: string) => {
    contextUpdater?.updateContext((context: ApplicationContext) => ({
      ...context,
      activeTab: tabId,
      // Don't automatically change activeConnectionId - allow independent browsing
    }));
  },

  startTimer: (workItemId?: number) => {
    contextUpdater?.updateContext((context: ApplicationContext) => ({
      ...context,
      timer: {
        isActive: true,
        isRunning: true,
        workItemId,
        elapsed: 0,
        startTime: Date.now(),
      },
    }));
  },

  stopTimer: () => {
    contextUpdater?.updateContext((context: ApplicationContext) => ({
      ...context,
      timer: {
        ...context.timer,
        isActive: false,
        isRunning: false,
        startTime: undefined,
      },
    }));
  },

  pauseTimer: () => {
    contextUpdater?.updateContext((context: ApplicationContext) => ({
      ...context,
      timer: {
        ...context.timer,
        isRunning: false,
      },
    }));
  },

  resumeTimer: () => {
    contextUpdater?.updateContext((context: ApplicationContext) => ({
      ...context,
      timer: {
        ...context.timer,
        isRunning: true,
        startTime: Date.now() - context.timer.elapsed,
      },
    }));
  },

  toggleKanbanView: () => {
    contextUpdater?.updateContext((context: ApplicationContext) => ({
      ...context,
      kanbanView: !context.kanbanView,
    }));
  },

  refreshConnection: (connectionId: string) => {
    // Send message to data actor
    console.log('[ContextActions] Refresh connection:', connectionId);
  },

  refreshAllConnections: () => {
    // Send message to data actor
    console.log('[ContextActions] Refresh all connections');
  },

  updateSettings: (newSettings: any) => {
    contextUpdater?.updateContext((context: ApplicationContext) => ({
      ...context,
      settings: { ...context.settings, ...newSettings },
    }));
  },
};

/**
 * Debug utilities
 */
export const debugStores = {
  logContext: () => {
    let context: ApplicationContext | null = null;
    const unsubscribe = applicationContext.subscribe((c) => (context = c));
    console.log('[Debug] Current application context:', context);
    unsubscribe();
  },

  logActiveWorkItems: () => {
    let items: WorkItem[] = [];
    const unsubscribe = activeWorkItems.subscribe((i) => (items = i));
    console.log('[Debug] Active work items:', items);
    unsubscribe();
  },

  logConnections: () => {
    let conns: Connection[] = [];
    const unsubscribe = connections.subscribe((c) => (conns = c));
    console.log('[Debug] Connections:', conns);
    unsubscribe();
  },
};
