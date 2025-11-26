/**
 * Module: src/fsm/machines/applicationTypes.ts
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

import type { ExtensionContext } from 'vscode';
import type {
  ProjectConnection,
  AuthReminderReason,
  AuthReminderState,
  ConnectionContext as ConnectionState,
} from '../../features/connection/types.js';

export type { ProjectConnection, AuthReminderReason, AuthReminderState, ConnectionState };

/**
 * UI state for deterministic rendering.
 * Components should render based on this state, not derive UI from machine states.
 * Follows migration instructions for rune-first helpers.
 */
export type UIState = {
  /**
   * Primary action buttons with labels and loading states
   */
  buttons?: {
    refreshData?: {
      label: string;
      loading?: boolean;
      disabled?: boolean;
    };
    toggleView?: {
      label: string;
      icon?: string;
    };
    manageConnections?: {
      label: string;
    };
  };
  /**
   * Status messages to display in UI
   */
  statusMessage?: {
    text: string;
    type: 'info' | 'warning' | 'error' | 'success';
  };
  /**
   * Loading states for different UI sections
   */
  loading?: {
    connections?: boolean;
    workItems?: boolean;
    authentication?: boolean;
  };
  /**
   * Modal/dialog states
   */
  modal?: {
    type: 'deviceCode' | 'error' | 'settings' | 'composeComment' | null;
    title?: string;
    message?: string;
    actions?: Array<{ label: string; action: string }>;
    // Additional fields for specific modals
    workItemId?: number;
    mode?: string; // e.g., 'reply'
  };
  /**
   * Connection health and error state
   */
  connectionHealth?: {
    status: 'healthy' | 'error' | 'warning' | 'unknown';
    lastSuccess?: number; // timestamp
    lastFailure?: number; // timestamp
    lastError?: {
      message: string;
      type: 'authentication' | 'network' | 'authorization' | 'server' | 'unknown';
      recoverable: boolean;
      suggestedAction?: string;
    };
  };
  /**
   * Refresh status
   */
  refreshStatus?: {
    lastAttempt: number; // timestamp
    success: boolean;
    error?: string;
    nextAutoRefresh?: number; // timestamp
  };
};

export type ApplicationContext = {
  isActivated: boolean;
  isDeactivating: boolean;
  connections: ProjectConnection[];
  activeConnectionId?: string;
  /** Active WIQL or logical query name selected by user (legacy - use connectionQueries) */
  activeQuery?: string;
  connectionStates: Map<string, ConnectionState>;
  pendingAuthReminders: Map<string, AuthReminderState>;
  extensionContext?: ExtensionContext;
  webviewPanel?: any;
  timerActor?: any; // Actor<typeof timerMachine>;
  connectionActors: Map<string, any>;
  authActors: Map<string, any>; // Actor<typeof authMachine>>;
  dataActor?: any; // Actor<typeof dataMachine>;
  webviewActor?: any;
  /** Legacy work items storage - use connectionWorkItems instead */
  pendingWorkItems?: {
    workItems: any[];
    connectionId?: string;
    query?: string;
  };
  /** Per-connection query selection */
  connectionQueries: Map<string, string>;
  /** Per-connection work items */
  connectionWorkItems: Map<string, any[]>;
  /** Per-connection filter state */
  connectionFilters: Map<string, Record<string, any>>;
  /** Per-connection view mode (list/kanban) */
  connectionViewModes: Map<string, 'list' | 'kanban'>;
  /** Available work item types for the active connection */
  workItemTypes?: string[];
  timerState?: {
    state: string;
    workItemId?: number;
    workItemTitle?: string;
    startTime?: number;
    stopTime?: number;
    pausedAt?: number;
  };
  lastError?: Error;
  errorRecoveryAttempts: number;
  /** Legacy view mode - use connectionViewModes instead */
  viewMode: 'list' | 'kanban';
  kanbanColumns?: { id: string; title: string; itemIds: number[] }[];
  /** Active device code authentication session (if any) */
  deviceCodeSession?: {
    connectionId: string;
    userCode: string;
    verificationUri: string;
    expiresInSeconds: number;
    startedAt: number;
    expiresAt: number;
  };
  /** Whether verbose debug logging is enabled (copied from configuration at activation) */
  debugLoggingEnabled?: boolean;
  /** Whether the webview debug panel is currently visible */
  debugViewVisible?: boolean;
  /**
   * Deterministic UI state for webview rendering.
   * Webviews should render based on this, not derive UI from machine states.
   * Supports rune-first helpers and optimistic updates.
   */
  ui?: UIState;
};

export type ApplicationEvent =
  | { type: 'ACTIVATE'; context: ExtensionContext }
  | { type: 'DEACTIVATE' }
  | { type: 'CONNECTIONS_LOADED'; connections: ProjectConnection[] }
  | { type: 'CONNECTION_SELECTED'; connectionId: string }
  | { type: 'CONNECTION_ESTABLISHED'; connectionId: string; connectionState?: any }
  | { type: 'REFRESH_DATA' }
  | {
      type: 'WORK_ITEMS_LOADED';
      workItems: any[];
      connectionId?: string;
      query?: string;
      types?: string[];
    }
  | { type: 'AUTHENTICATION_REQUIRED'; connectionId: string }
  | { type: 'AUTHENTICATION_SUCCESS'; connectionId: string; token: string }
  | { type: 'AUTHENTICATION_FAILED'; connectionId: string; error: string }
  | {
      type: 'DEVICE_CODE_SESSION_STARTED';
      connectionId: string;
      userCode: string;
      verificationUri: string;
      expiresInSeconds: number;
      startedAt: number;
    }
  | { type: 'AUTH_REMINDER_SET'; connectionId: string; reminder: AuthReminderState }
  | { type: 'AUTH_REMINDER_CLEARED'; connectionId: string }
  | { type: 'AUTH_REMINDER_DISMISSED'; connectionId: string; snoozeUntil?: number }
  | {
      type: 'AUTH_REMINDER_REQUESTED';
      connectionId: string;
      reason: AuthReminderReason;
      detail?: string;
    }
  | { type: 'WEBVIEW_READY' }
  | { type: 'SHOW_WEBVIEW' }
  | { type: 'WEBVIEW_MESSAGE'; message: any }
  | { type: 'UPDATE_WEBVIEW_PANEL'; webviewPanel: any }
  | { type: 'ERROR'; error: Error }
  | { type: 'RETRY' }
  | { type: 'RESET' }
  | { type: 'TOGGLE_VIEW'; view?: 'list' | 'kanban' }
  | { type: 'TOGGLE_DEBUG_VIEW' }
  | { type: 'SET_QUERY'; query: string }
  // Per-connection state events
  | { type: 'SET_CONNECTION_QUERY'; connectionId: string; query: string }
  | { type: 'SET_CONNECTION_WORK_ITEMS'; connectionId: string; workItems: any[] }
  | { type: 'SET_CONNECTION_FILTERS'; connectionId: string; filters: Record<string, any> }
  | { type: 'SET_CONNECTION_VIEW_MODE'; connectionId: string; viewMode: 'list' | 'kanban' }
  | { type: 'SELECT_CONNECTION'; connectionId: string }
  // Work Item Action Events
  | { type: 'START_TIMER_INTERACTIVE'; workItemId?: number; workItemTitle?: string }
  | { type: 'STOP_TIMER' }
  | { type: 'TIMER_STATE_CHANGED'; timerState: any }
  | { type: 'CREATE_WORK_ITEM' }
  | { type: 'EDIT_WORK_ITEM'; workItemId: number }
  | { type: 'OPEN_IN_BROWSER'; workItemId: number }
  | { type: 'CREATE_BRANCH'; workItemId: number }
  | { type: 'OPEN_WORK_ITEM'; workItemId: number }
  | { type: 'SHOW_COMPOSE_COMMENT'; workItemId: number; mode?: string }
  | { type: 'COMMENT_RESULT'; success: boolean; message?: string; error?: string }
  | { type: 'DISMISS_NOTIFICATION' }
  | { type: 'DISMISS_DIALOG' }
  // Connection Management Events
  | { type: 'MANAGE_CONNECTIONS' }
  | { type: 'ADD_CONNECTION' }
  | { type: 'EDIT_CONNECTION'; connectionId: string }
  | { type: 'SAVE_CONNECTION'; connection: ProjectConnection }
  | { type: 'DELETE_CONNECTION'; connectionId: string }
  | { type: 'CONFIRM_DELETE_CONNECTION'; connectionId: string }
  | { type: 'CANCEL_CONNECTION_MANAGEMENT' }
  // Events from child auth machines
  | { type: 'AUTH_SNAPSHOT'; snapshot: any }
  | { type: 'AUTH_ERROR'; error: any }
  // Events from child data machines
  | { type: 'DATA_SNAPSHOT'; snapshot: any }
  | { type: 'DATA_ERROR'; error: any };
