/**
 * TypeScript type definitions for reactive stores
 */

// ============================================================================
// AZURE DEVOPS TYPES
// ============================================================================

export interface WorkItem {
  id: number;
  rev?: number;
  url?: string;
  fields?: Record<string, any>;
  
  // Common System fields
  'System.Id'?: number;
  'System.Title'?: string;
  'System.State'?: string;
  'System.WorkItemType'?: string;
  'System.AssignedTo'?: {
    displayName: string;
    uniqueName: string;
    id: string;
    imageUrl?: string;
  };
  'System.CreatedDate'?: string;
  'System.ChangedDate'?: string;
  'System.Description'?: string;
  'System.IterationPath'?: string;
  'System.AreaPath'?: string;
  'System.Tags'?: string;
  
  // Common VSTS fields
  'Microsoft.VSTS.Common.Priority'?: number;
  'Microsoft.VSTS.Common.Severity'?: string;
  'Microsoft.VSTS.Common.ValueArea'?: string;
  
  // Relations
  relations?: Array<{
    rel: string;
    url: string;
    attributes?: Record<string, any>;
  }>;
  
  // Allow for additional dynamic fields
  [key: string]: any;
}

export interface Connection {
  id: string;
  name: string;
  url: string;
  personalAccessToken: string;
  project: string;
  isActive?: boolean;
  currentUser?: {
    displayName: string;
    uniqueName: string;
    id: string;
    imageUrl?: string;
  };
  lastUsed?: string;
  isValid?: boolean;
  errorMessage?: string;
}

export interface TimerSnapshot {
  value: string | object;
  context: {
    workItemId?: number;
    workItemTitle?: string;
    elapsed?: number;
    startTime?: number;
    lastActivity?: number;
    elapsedBeforePause?: number;
    isActivityDetected?: boolean;
  };
  matches?: (state: string) => boolean;
  can?: (event: any) => boolean;
}

export interface AuthReminder {
  connectionId: string;
  timestamp: number;
  reason: string;
  attempts: number;
}

// ============================================================================
// FSM CONTEXT TYPES
// ============================================================================

export interface ApplicationContext {
  // Extension lifecycle
  extensionContext?: any;
  isActivated: boolean;
  isDeactivating: boolean;
  
  // Connection management
  connections: Connection[];
  activeConnectionId?: string;
  connectionStates: Map<string, any>;
  
  // Work items
  workItemsByConnection: Map<string, Set<WorkItem>>;
  loadingStates: Map<string, boolean>;
  
  // Authentication
  pendingAuthReminders: Map<string, AuthReminder>;
  
  // Timer
  timerActor?: any;
  
  // UI state
  webviewReady: boolean;
  uiError: boolean;
  isDataLoading: boolean;
  isDataSynced: boolean;
  dataError: boolean;
  lastError?: Error;
  isInErrorRecovery: boolean;
}

export interface FSMSnapshot {
  value: string | object;
  context: ApplicationContext;
  matches: (state: string) => boolean;
  can: (event: any) => boolean;
  event?: any;
  nextEvents?: string[];
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export type TabType = 'work-items' | 'timer' | 'connections';
export type ViewMode = 'list' | 'kanban';
export type SortDirection = 'asc' | 'desc';

export interface UIState {
  // Tab management
  activeTab: TabType;
  previousTab: string | null;

  // Loading states
  isLoadingWorkItems: boolean;
  isLoadingConnections: boolean;

  // UI preferences
  viewMode: ViewMode;
  sortBy: string;
  sortDirection: SortDirection;
  
  // Filters
  selectedStates: string[];
  searchQuery: string;
  assignedToMe: boolean;

  // Modal/dialog states
  showConnectionDialog: boolean;
  showWorkItemDialog: boolean;
  showTimerDialog: boolean;

  // Selected items
  selectedWorkItemId: number | null;
  selectedConnectionId: string | null;

  // Error states
  lastError: Error | null;
  errorMessage: string;
}

export interface DraftState {
  // Connection form
  connection: {
    url: string;
    personalAccessToken: string;
    project: string;
    name: string;
  };

  // Work item form  
  workItem: {
    title: string;
    description: string;
    type: string;
    state: string;
    assignedTo: string;
  };

  // Timer form
  timer: {
    workItemId: number | null;
    title: string;
    description: string;
  };
}

// ============================================================================
// ACTION TYPES
// ============================================================================

export interface FSMActions {
  // Extension lifecycle
  activate: () => void;
  deactivate: () => void;

  // Connection management
  addConnection: (connection: Connection) => void;
  setActiveConnection: (connectionId: string) => void;
  removeConnection: (connectionId: string) => void;

  // Work items
  loadWorkItems: (connectionId: string, query: string) => void;
  workItemsLoaded: (workItems: WorkItem[], connectionId: string, query: string) => void;

  // Timer
  startTimer: (workItemId: number, title: string) => void;
  stopTimer: () => void;

  // Auth
  requireAuthentication: (connectionId: string) => void;
  authenticationComplete: (connectionId: string) => void;

  // Webview
  webviewReady: () => void;
  webviewClosed: () => void;
}

export interface UIActions {
  // Tab management
  setActiveTab: (tab: TabType) => void;
  goToPreviousTab: () => void;

  // Work items filters and view
  setSearchQuery: (query: string) => void;
  setSelectedStates: (states: string[]) => void;
  toggleState: (state: string) => void;
  setSortBy: (field: string) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleAssignedToMe: () => void;

  // Selection
  selectWorkItem: (id: number | null) => void;
  selectConnection: (id: string | null) => void;

  // Dialogs
  showConnectionDialog: (show?: boolean) => void;
  showWorkItemDialog: (show?: boolean) => void;
  showTimerDialog: (show?: boolean) => void;

  // Error handling
  clearError: () => void;
  setError: (error: Error | string) => void;

  // Draft management
  updateConnectionDraft: (updates: Partial<DraftState['connection']>) => void;
  updateWorkItemDraft: (updates: Partial<DraftState['workItem']>) => void;
  updateTimerDraft: (updates: Partial<DraftState['timer']>) => void;
  clearConnectionDraft: () => void;
  clearWorkItemDraft: () => void;
  clearTimerDraft: () => void;
}

// ============================================================================
// SELECTOR TYPES
// ============================================================================

export interface Selectors {
  getConnectionById: (id: string) => Connection | undefined;
  getWorkItemById: (id: number) => WorkItem | undefined;
  getWorkItemsByState: (state: string) => WorkItem[];
  getActiveWorkItemId: () => number | undefined;
  getConnectionState: (connectionId: string) => any;
}

// ============================================================================
// DEBUG TYPES
// ============================================================================

export interface DebugInterface {
  getFullState: () => any;
  getContext: () => ApplicationContext | undefined;
  getCurrentState: () => string;
  getSnapshot: () => FSMSnapshot | null;
  subscribe: (callback: (snapshot: FSMSnapshot) => void) => void;
  instrumentation: {
    exportLogs: () => string;
    clearLogs: () => void;
    getLogCount: () => number;
    toggleInstrumentation: () => void;
    getSamplingStats: () => any;
    getRateLimitStats: () => any;
    downloadLogs: () => void;
  };
}