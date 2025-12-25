/**
 * Praxis Application Types
 *
 * Type definitions for the Application Orchestrator module.
 * This module coordinates all Praxis engines (Timer, Auth, Connection)
 * using a multi-engine architecture with event bus pattern.
 */

import type { PraxisTimerSnapshot } from '../timer/types.js';
import type { PraxisConnectionSnapshot, ProjectConnection } from '../connection/types.js';
import type { TraceEntry } from '../../logging/TraceLogger.js';

export interface PraxisClock {
  now(): number;
}

/**
 * Application orchestrator states
 */
export type PraxisApplicationState =
  | 'inactive'
  | 'activating'
  | 'active'
  | 'activation_error'
  | 'deactivating'
  | 'error_recovery';

/**
 * View modes for work item display
 */
export type ViewMode = 'list' | 'kanban' | 'board';

/**
 * Work item data structure
 */
export interface WorkItem {
  id: number;
  fields: Record<string, unknown>;
  _links?: Record<string, unknown>;
  url?: string;
}

/**
 * Kanban column configuration
 */
export interface KanbanColumn {
  id: string;
  name: string;
  items: WorkItem[];
}

/**
 * Device code session for OAuth device flow
 */
export interface DeviceCodeSession {
  connectionId: string;
  userCode: string;
  verificationUri: string;
  startedAt: number;
  expiresAt: number;
  expiresInSeconds: number;
}

/**
 * Auth code flow session for OAuth authorization code flow with PKCE
 */
export interface AuthCodeFlowSession {
  connectionId: string;
  authorizationUrl: string;
  startedAt: number;
  expiresAt: number;
  expiresInSeconds: number;
}

/**
 * Pending work items data
 */
export interface PendingWorkItems {
  workItems: WorkItem[];
  connectionId: string;
  query?: string;
  timestamp: number;
}

/**
 * UI State
 */
export interface UIState {
  statusMessage?: {
    text: string;
    type: 'info' | 'error' | 'warning' | 'success';
  };
  modal?: {
    type: string;
    workItemId?: number;
    mode?: string;
    [key: string]: unknown;
  };
  notification?: unknown;
  dialog?: unknown;
}

/**
 * Application context - shared data across all orchestrated engines
 */
export interface PraxisApplicationContext {
  clock: PraxisClock;
  // Application lifecycle
  isActivated: boolean;
  isDeactivating: boolean;

  // Connection management
  connections: ProjectConnection[];
  activeConnectionId?: string;
  activeQuery?: string;

  // Per-connection state tracking
  connectionStates: Map<string, PraxisConnectionSnapshot>;
  connectionQueries: Map<string, string>;
  connectionWorkItems: Map<string, WorkItem[]>;
  connectionFilters: Map<string, Record<string, unknown>>;
  connectionViewModes: Map<string, ViewMode>;

  // Work items
  pendingWorkItems?: PendingWorkItems;
  viewMode: ViewMode;
  kanbanColumns: KanbanColumn[];

  // Timer state (from timer engine)
  timerSnapshot?: PraxisTimerSnapshot;

  // Authentication reminders
  pendingAuthReminders: Map<string, { connectionId: string; reason: string; status: string }>;

  // Device code flow
  deviceCodeSession?: DeviceCodeSession;
  
  // Auth code flow (PKCE)
  authCodeFlowSession?: AuthCodeFlowSession;

  // Error handling
  lastError?: {
    message: string;
    stack?: string;
    connectionId?: string;
  };
  errorRecoveryAttempts: number;

  // Debug and UI flags
  debugLoggingEnabled: boolean;
  debugViewVisible: boolean;
  debugTraceLog?: TraceEntry[];
  ui?: UIState;
}

/**
 * Application snapshot for external consumers
 */
export interface PraxisApplicationSnapshot {
  state: PraxisApplicationState;
  isActivated: boolean;
  connections: ProjectConnection[];
  activeConnectionId?: string;
  hasActiveTimer: boolean;
  connectionCount: number;
  errorRecoveryAttempts: number;
  // Full context (needed for consumers expecting XState-like snapshots)
  context: PraxisApplicationContext;
}

/**
 * Event bus message types for cross-engine communication
 */
export type EventBusMessageType =
  | 'timer:started'
  | 'timer:stopped'
  | 'timer:paused'
  | 'timer:resumed'
  | 'auth:success'
  | 'auth:failed'
  | 'auth:logout'
  | 'connection:connected'
  | 'connection:disconnected'
  | 'connection:error'
  | 'app:activated'
  | 'app:deactivated'
  | 'app:error'
  | 'workitems:loaded'
  | 'workitems:error';

/**
 * Event bus message structure
 */
export interface EventBusMessage {
  type: EventBusMessageType;
  payload: Record<string, unknown>;
  timestamp: number;
  sourceEngine: 'timer' | 'auth' | 'connection' | 'application';
  connectionId?: string;
}

/**
 * Event bus subscriber callback
 */
export type EventBusSubscriber = (message: EventBusMessage) => void;

/**
 * Default application configuration
 */
export const DEFAULT_APPLICATION_CONFIG: Partial<PraxisApplicationContext> = {
  clock: { now: () => Date.now() },
  isActivated: false,
  isDeactivating: false,
  connections: [],
  connectionStates: new Map(),
  connectionQueries: new Map(),
  connectionWorkItems: new Map(),
  connectionFilters: new Map(),
  connectionViewModes: new Map(),
  pendingAuthReminders: new Map(),
  viewMode: 'list',
  kanbanColumns: [],
  errorRecoveryAttempts: 0,
  debugLoggingEnabled: false,
  debugViewVisible: false,
  debugTraceLog: [],
  ui: {
    notification: null,
    dialog: null,
  },
};
