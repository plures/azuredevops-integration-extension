/**
 * Context-Driven Architecture - Application Context
 *
 * Single source of truth that all actors observe and update.
 * No direct actor-to-actor communication needed.
 */

export interface Connection {
  id: string;
  label: string;
  organization: string;
  project: string;
  authState: 'authenticated' | 'unauthenticated' | 'pending';
}

export interface WorkItem {
  id: number;
  title: string;
  state: string;
  type: string;
  assignedTo?: string;
  connectionId: string;
}

export interface TimerState {
  isActive: boolean;
  isRunning: boolean;
  workItemId?: number;
  elapsed: number;
  startTime?: number;
}

export interface Settings {
  defaultQuery: string;
  refreshInterval: number;
  openAIApiKey?: string;
}

/**
 * Centralized Application Context
 * All actors observe and update this context independently
 */
export interface ApplicationContext {
  // Connection Management
  connections: Connection[];
  activeConnectionId: string | null;

  // Data Storage (by connection)
  workItemsByConnection: Map<string, WorkItem[]>;
  loadingStates: Map<string, boolean>;
  errorStates: Map<string, string | null>;

  // Query State (by connection)
  queriesByConnection: Map<string, string>;

  // UI State
  activeTab: string;
  kanbanView: boolean;

  // Timer State
  timer: TimerState;

  // Application Settings
  settings: Settings;

  // Initialization State
  isInitialized: boolean;
}

/**
 * Context Actions - Pure functions that update context
 * These are the only way to modify the application context
 */
export const contextActions = {
  // Connection Actions
  addConnection: (context: ApplicationContext, connection: Connection): ApplicationContext => ({
    ...context,
    connections: [...context.connections, connection],
    activeConnectionId: context.activeConnectionId || connection.id,
    activeTab: context.activeTab || connection.id,
  }),

  removeConnection: (context: ApplicationContext, connectionId: string): ApplicationContext => {
    const newConnections = context.connections.filter((c) => c.id !== connectionId);
    const newWorkItems = new Map(context.workItemsByConnection);
    const newLoadingStates = new Map(context.loadingStates);
    const newErrorStates = new Map(context.errorStates);
    const newQueries = new Map(context.queriesByConnection);

    newWorkItems.delete(connectionId);
    newLoadingStates.delete(connectionId);
    newErrorStates.delete(connectionId);
    newQueries.delete(connectionId);

    return {
      ...context,
      connections: newConnections,
      workItemsByConnection: newWorkItems,
      loadingStates: newLoadingStates,
      errorStates: newErrorStates,
      queriesByConnection: newQueries,
      activeConnectionId:
        context.activeConnectionId === connectionId
          ? newConnections[0]?.id || null
          : context.activeConnectionId,
      activeTab:
        context.activeTab === connectionId ? newConnections[0]?.id || '' : context.activeTab,
    };
  },

  setActiveConnection: (context: ApplicationContext, connectionId: string): ApplicationContext => ({
    ...context,
    activeConnectionId: connectionId,
    activeTab: connectionId,
  }),

  // Data Actions
  setWorkItems: (
    context: ApplicationContext,
    connectionId: string,
    workItems: WorkItem[]
  ): ApplicationContext => {
    const newWorkItems = new Map(context.workItemsByConnection);
    newWorkItems.set(connectionId, workItems);

    return {
      ...context,
      workItemsByConnection: newWorkItems,
    };
  },

  setLoading: (
    context: ApplicationContext,
    connectionId: string,
    isLoading: boolean
  ): ApplicationContext => {
    const newLoadingStates = new Map(context.loadingStates);
    newLoadingStates.set(connectionId, isLoading);

    return {
      ...context,
      loadingStates: newLoadingStates,
    };
  },

  setError: (
    context: ApplicationContext,
    connectionId: string,
    error: string | null
  ): ApplicationContext => {
    const newErrorStates = new Map(context.errorStates);
    newErrorStates.set(connectionId, error);

    return {
      ...context,
      errorStates: newErrorStates,
    };
  },

  // Timer Actions
  startTimer: (context: ApplicationContext, workItemId?: number): ApplicationContext => ({
    ...context,
    timer: {
      isActive: true,
      isRunning: true,
      workItemId,
      elapsed: 0,
      startTime: Date.now(),
    },
  }),

  stopTimer: (context: ApplicationContext): ApplicationContext => ({
    ...context,
    timer: {
      ...context.timer,
      isActive: false,
      isRunning: false,
      startTime: undefined,
    },
  }),

  // Settings Actions
  updateSettings: (
    context: ApplicationContext,
    settings: Partial<Settings>
  ): ApplicationContext => ({
    ...context,
    settings: { ...context.settings, ...settings },
  }),

  // UI Actions
  setActiveTab: (context: ApplicationContext, tabId: string): ApplicationContext => ({
    ...context,
    activeTab: tabId,
    // Don't automatically change activeConnectionId - let user browse tabs independently
  }),

  toggleKanbanView: (context: ApplicationContext): ApplicationContext => ({
    ...context,
    kanbanView: !context.kanbanView,
  }),
};

/**
 * Context Selectors - Pure functions to derive state
 */
export const contextSelectors = {
  getActiveConnection: (context: ApplicationContext): Connection | null =>
    context.connections.find((c) => c.id === context.activeConnectionId) || null,

  getActiveWorkItems: (context: ApplicationContext): WorkItem[] =>
    context.workItemsByConnection.get(context.activeConnectionId || '') || [],

  getWorkItemsForTab: (context: ApplicationContext, tabId: string): WorkItem[] =>
    context.workItemsByConnection.get(tabId) || [],

  isConnectionLoading: (context: ApplicationContext, connectionId: string): boolean =>
    context.loadingStates.get(connectionId) || false,

  getConnectionError: (context: ApplicationContext, connectionId: string): string | null =>
    context.errorStates.get(connectionId) || null,

  getConnectionsNeedingAuth: (context: ApplicationContext): Connection[] =>
    context.connections.filter((c) => c.authState === 'unauthenticated'),

  getActiveTimerWorkItem: (context: ApplicationContext): WorkItem | null => {
    if (!context.timer.isActive || !context.timer.workItemId) return null;

    // Find work item across all connections
    for (const workItems of context.workItemsByConnection.values()) {
      const item = workItems.find((wi) => wi.id === context.timer.workItemId);
      if (item) return item;
    }
    return null;
  },
};

/**
 * Initial Context State
 */
export const createInitialContext = (): ApplicationContext => ({
  connections: [],
  activeConnectionId: null,
  workItemsByConnection: new Map(),
  loadingStates: new Map(),
  errorStates: new Map(),
  queriesByConnection: new Map(),
  activeTab: '',
  kanbanView: false,
  timer: {
    isActive: false,
    isRunning: false,
    elapsed: 0,
  },
  settings: {
    defaultQuery: 'My Activity',
    refreshInterval: 30000, // 30 seconds
  },
  isInitialized: false,
});
