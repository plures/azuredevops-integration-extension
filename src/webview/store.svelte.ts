/**
 * Webview Reactive State with Svelte 5 Universal Reactivity
 * 
 * This replaces traditional Svelte stores with direct reactive state
 * using Svelte 5's universal reactivity pattern.
 */

import { fsm, actions, selectors, connectionsCount$ } from './fsm-webview.svelte.js';
import type { Connection, TimerSnapshot, WorkItem } from './types.js';

// ============================================================================
// REACTIVE WEBVIEW STATE
// ============================================================================

// Direct reactive state (not a store, just reactive objects)
export const ui = $state({
  // Tab management
  activeTab: 'work-items' as 'work-items' | 'timer' | 'connections',
  previousTab: null as string | null,

  // Loading states
  isLoadingWorkItems: false,
  isLoadingConnections: false,

  // UI preferences
  viewMode: 'list' as 'list' | 'kanban',
  sortBy: 'Created Date' as string,
  sortDirection: 'desc' as 'asc' | 'desc',
  
  // Filters
  selectedStates: [] as string[],
  searchQuery: '',
  assignedToMe: false,

  // Modal/dialog states
  showConnectionDialog: false,
  showWorkItemDialog: false,
  showTimerDialog: false,

  // Selected items
  selectedWorkItemId: null as number | null,
  selectedConnectionId: null as string | null,

  // Error states
  lastError: null as Error | null,
  errorMessage: '',
});

// Draft state for forms (persisted to browser localStorage)
export const draft = $state({
  // Connection form
  connection: {
    url: '',
    personalAccessToken: '',
    project: '',
    name: '',
  },

  // Work item form  
  workItem: {
    title: '',
    description: '',
    type: 'Task',
    state: 'New',
    assignedTo: '',
  },

  // Timer form
  timer: {
    workItemId: null as number | null,
    title: '',
    description: '',
  },
});

// ============================================================================
// DERIVED STATE (computed from FSM and UI state)
// ============================================================================

// Connection-related derived state
export function connections(): Connection[] {
  const snapshot = fsm();
  const result = (snapshot?.context?.connections as Connection[]) || [];
  console.log('[store] connections() called:', {
    snapshotExists: !!snapshot,
    contextExists: !!snapshot?.context,
    connectionsExists: !!snapshot?.context?.connections,
    connectionsLength: result.length,
    connectionsData: result,
    snapshotValue: snapshot?.value
  });
  return result;
}

export function activeConnection(): Connection | null {
  const snapshot = fsm();
  const activeId = snapshot?.context?.activeConnectionId;
  if (!activeId) return null;
  return connections().find((conn: Connection) => conn.id === activeId) || null;
}

export function hasConnections(): boolean {
  const count = connectionsCount$(); // Use reactive connections count
  console.log('[store] hasConnections() called with reactive count:', count);
  return count > 0;
}

// Work items derived state
export function allWorkItems(): WorkItem[] {
  const snapshot = fsm();
  const activeConnId = snapshot?.context?.activeConnectionId;
  if (!activeConnId || !snapshot?.context?.workItemsByConnection) {
    return [];
  }
  return Array.from(snapshot.context.workItemsByConnection.get(activeConnId) || []) as WorkItem[];
}

const applySearchFilter = (items: WorkItem[], query: string): WorkItem[] => {
  const trimmed = query.trim();
  if (!trimmed) return items;
  const q = trimmed.toLowerCase();
  return items.filter((item: WorkItem) =>
    item['System.Title']?.toLowerCase().includes(q) ||
    item['System.Description']?.toLowerCase().includes(q) ||
    item.id.toString().includes(q)
  );
};

const applyStateFilter = (items: WorkItem[], states: string[]): WorkItem[] => {
  if (states.length === 0) return items;
  return items.filter((item: WorkItem) => states.includes(item['System.State'] || ''));
};

const applyAssignedToMeFilter = (items: WorkItem[]): WorkItem[] => {
  if (!ui.assignedToMe) return items;
  const current = activeConnection()?.currentUser;
  if (!current) return items;
  return items.filter((item: WorkItem) => item['System.AssignedTo']?.uniqueName === current.uniqueName);
};

const sortWorkItems = (
  items: WorkItem[],
  sortBy: string,
  direction: 'asc' | 'desc'
): WorkItem[] => {
  const sorted = [...items];
  sorted.sort((a: WorkItem, b: WorkItem) => {
    let aVal: unknown = (a as Record<string, unknown>)[sortBy] ?? '';
    let bVal: unknown = (b as Record<string, unknown>)[sortBy] ?? '';

    if (sortBy.includes('Date')) {
      aVal = new Date(String(aVal)).getTime();
      bVal = new Date(String(bVal)).getTime();
    }

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'asc' ? aVal - bVal : bVal - aVal;
    }

    const comparison = String(aVal).localeCompare(String(bVal));
    return direction === 'asc' ? comparison : -comparison;
  });
  return sorted;
};

export function filteredWorkItems(): WorkItem[] {
  const initial = allWorkItems();
  const afterSearch = applySearchFilter(initial, ui.searchQuery);
  const afterState = applyStateFilter(afterSearch, ui.selectedStates);
  const afterAssignment = applyAssignedToMeFilter(afterState);
  return sortWorkItems(afterAssignment, ui.sortBy, ui.sortDirection);
}

export function workItemStates(): string[] {
  const states = new Set<string>();
  allWorkItems().forEach((item: WorkItem) => {
    if (item['System.State']) {
      states.add(item['System.State']);
    }
  });
  return Array.from(states).sort();
}

// Timer derived state
export function timerState(): TimerSnapshot | null {
  const snapshot = fsm();
  return snapshot?.context?.timerActor?.getSnapshot?.() || null;
}

export function isTimerRunning(): boolean {
  const timer = timerState();
  return timer?.matches?.('running') ?? false;
}

export function activeWorkItem(): WorkItem | null {
  const timer = timerState();
  const workItemId = timer?.context?.workItemId;
  if (!workItemId) return null;
  const item = selectors.getWorkItemById(workItemId);
  return (item && typeof item === 'object' && 'id' in item) ? item as WorkItem : null;
}

export function timerElapsed(): number {
  const timer = timerState();
  return timer?.context?.elapsed || 0;
}

// Auth and loading states
export function isDataLoading(): boolean {
  const snapshot = fsm();
  const activeConnId = snapshot?.context?.activeConnectionId;
  if (!activeConnId || !snapshot?.context?.loadingStates) {
    return false;
  }
  return snapshot.context.loadingStates.get(activeConnId) || false;
}

export function hasAuthReminders(): boolean {
  const snapshot = fsm();
  const reminders = snapshot?.context?.pendingAuthReminders || new Map();
  return reminders.size > 0;
}

// Tab and UI state
export function canShowTimer(): boolean {
  return hasConnections() && ui.activeTab === 'timer';
}

export function canShowWorkItems(): boolean {
  return hasConnections() && ui.activeTab === 'work-items';
}

export function showEmptyState(): boolean {
  return !hasConnections() || (ui.activeTab === 'work-items' && filteredWorkItems().length === 0);
}

// ============================================================================
// REACTIVE EFFECTS
// ============================================================================

// Check if we're in a proper Svelte component context before creating effects
let effectsInitialized = false;

const syncUiWithFSM = (): void => {
  $effect(() => {
    const snapshot = fsm();
    if (!snapshot) return;

    ui.isLoadingWorkItems = isDataLoading();
    ui.isLoadingConnections = snapshot.matches?.('connections.loading') ?? false;

    if (!fsm.error) {
      ui.lastError = null;
      ui.errorMessage = '';
      return;
    }

    ui.lastError = fsm.error;
    ui.errorMessage = fsm.error.message;
  });
};

const persistDrafts = (): void => {
  $effect(() => {
    try {
      localStorage.setItem('azuredevops-drafts', JSON.stringify(draft));
    } catch (error) {
      console.warn('[webviewStore] Failed to persist drafts:', error);
    }
  });
};

const restoreDrafts = (): void => {
  $effect(() => {
    try {
      const stored = localStorage.getItem('azuredevops-drafts');
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.assign(draft, parsed);
      }
    } catch (error) {
      console.warn('[webviewStore] Failed to restore drafts:', error);
    }
  });
};

export function initializeStoreEffects(): void {
  if (effectsInitialized) return;
  effectsInitialized = true;
  syncUiWithFSM();
  persistDrafts();
  restoreDrafts();
}

// ============================================================================
// ACTIONS (UI state mutations)
// ============================================================================

export const uiActions = {
  // Tab management
  setActiveTab: (tab: typeof ui.activeTab) => {
    ui.previousTab = ui.activeTab;
    ui.activeTab = tab;
  },

  goToPreviousTab: () => {
    if (ui.previousTab) {
      const temp = ui.activeTab;
      ui.activeTab = ui.previousTab as typeof ui.activeTab;
      ui.previousTab = temp;
    }
  },

  // Work items filters and view
  setSearchQuery: (query: string) => {
    ui.searchQuery = query;
  },

  setSelectedStates: (states: string[]) => {
    ui.selectedStates = states;
  },

  toggleState: (state: string) => {
    const index = ui.selectedStates.indexOf(state);
    if (index >= 0) {
      ui.selectedStates.splice(index, 1);
    } else {
      ui.selectedStates.push(state);
    }
  },

  setSortBy: (field: string) => {
    if (ui.sortBy === field) {
      ui.sortDirection = ui.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      ui.sortBy = field;
      ui.sortDirection = 'asc';
    }
  },

  setViewMode: (mode: typeof ui.viewMode) => {
    ui.viewMode = mode;
  },

  toggleAssignedToMe: () => {
    ui.assignedToMe = !ui.assignedToMe;
  },

  // Selection
  selectWorkItem: (id: number | null) => {
    ui.selectedWorkItemId = id;
  },

  selectConnection: (id: string | null) => {
    ui.selectedConnectionId = id;
  },

  // Dialogs
  showConnectionDialog: (show: boolean = true) => {
    ui.showConnectionDialog = show;
  },

  showWorkItemDialog: (show: boolean = true) => {
    ui.showWorkItemDialog = show;
  },

  showTimerDialog: (show: boolean = true) => {
    ui.showTimerDialog = show;
  },

  // Error handling
  clearError: () => {
    ui.lastError = null;
    ui.errorMessage = '';
  },

  setError: (error: Error | string) => {
    ui.lastError = error instanceof Error ? error : new Error(error);
    ui.errorMessage = ui.lastError.message;
  },

  // Draft management
  updateConnectionDraft: (updates: Partial<typeof draft.connection>) => {
    Object.assign(draft.connection, updates);
  },

  updateWorkItemDraft: (updates: Partial<typeof draft.workItem>) => {
    Object.assign(draft.workItem, updates);
  },

  updateTimerDraft: (updates: Partial<typeof draft.timer>) => {
    Object.assign(draft.timer, updates);
  },

  clearConnectionDraft: () => {
    draft.connection = {
      url: '',
      personalAccessToken: '',
      project: '',
      name: '',
    };
  },

  clearWorkItemDraft: () => {
    draft.workItem = {
      title: '',
      description: '',
      type: 'Task',
      state: 'New',
      assignedTo: '',
    };
  },

  clearTimerDraft: () => {
    draft.timer = {
      workItemId: null,
      title: '',
      description: '',
    };
  },
};

// ============================================================================
// INTEGRATION ACTIONS (combine UI and FSM actions)
// ============================================================================

export const integrationActions = {
  // Create new connection
  createConnection: () => {
    if (!draft.connection.url || !draft.connection.personalAccessToken) {
      uiActions.setError('URL and Personal Access Token are required');
      return;
    }

    const connection = {
      id: `conn-${Date.now()}`,
      ...draft.connection,
    };

    actions.addConnection(connection);
    uiActions.clearConnectionDraft();
    uiActions.showConnectionDialog(false);
  },

  // Load work items with current filters
  loadWorkItems: () => {
    const snapshot = fsm();
    const connId = snapshot?.context?.activeConnectionId;
    if (!connId) {
      uiActions.setError('No active connection');
      return;
    }

    // Build query from current filters
    let query = '';
    if (ui.selectedStates.length > 0) {
      query += `[System.State] IN (${ui.selectedStates.map(s => `'${s}'`).join(', ')})`;
    }
    if (ui.assignedToMe) {
      const currentUser = activeConnection()?.currentUser;
      if (currentUser) {
        if (query) query += ' AND ';
        query += `[System.AssignedTo] = '${currentUser.uniqueName}'`;
      }
    }

    actions.loadWorkItems(connId, query);
  },

  // Start timer for selected work item
  startTimerForWorkItem: (workItemId: number) => {
    const workItem = selectors.getWorkItemById(workItemId) as WorkItem | undefined;
    if (!workItem || !workItem['System.Title']) {
      uiActions.setError('Work item not found');
      return;
    }

    actions.startTimer(workItemId, workItem['System.Title']);
    uiActions.setActiveTab('timer');
  },

  // Switch to connection and load its data
  switchToConnection: (connectionId: string) => {
    actions.setActiveConnection(connectionId);
    // Load work items after switching will be handled by FSM effect
  },
};

// ============================================================================
// DEBUG UTILITIES
// ============================================================================

export const debug = {
  ui: () => ui,
  draft: () => draft,
  derived: {
    connections: () => connections(),
    activeConnection: () => activeConnection(),
    filteredWorkItems: () => filteredWorkItems(),
    timerState: () => timerState(),
    isDataLoading: () => isDataLoading(),
  },
  actions: { ...uiActions, ...integrationActions },
  clearAll: () => {
    // Reset UI state
    ui.activeTab = 'work-items';
    ui.previousTab = null;
    ui.isLoadingWorkItems = false;
    ui.isLoadingConnections = false;
    ui.selectedStates = [];
    ui.searchQuery = '';
    ui.assignedToMe = false;
    ui.selectedWorkItemId = null;
    ui.selectedConnectionId = null;
    uiActions.clearError();

    // Clear drafts
    uiActions.clearConnectionDraft();
    uiActions.clearWorkItemDraft();
    uiActions.clearTimerDraft();

    console.log('[webviewStore] All state cleared');
  },
};