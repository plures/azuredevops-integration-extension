import * as vscode from 'vscode';
import type { AzureDevOpsIntClient } from '../azureClient.js';
import type { WorkItemsProvider } from '../provider.js';

// Base FSM context types
export interface ExtensionContext {
  vscode: vscode.ExtensionContext;
  config: vscode.WorkspaceConfiguration;
  panel?: vscode.WebviewPanel;
  outputChannel: vscode.OutputChannel;
  isInitialized: boolean;
}

export interface ConnectionContext {
  connectionId?: string;
  client?: AzureDevOpsIntClient;
  provider?: WorkItemsProvider;
  lastError?: string;
  retryCount: number;
  maxRetries: number;
  isHealthy: boolean;
}

export interface TimerContext {
  workItemId?: number;
  workItemTitle?: string;
  startTime?: number;
  elapsedSeconds: number;
  isPaused: boolean;
  lastActivity: number;
  connectionInfo?: {
    id?: string;
    label?: string;
    organization?: string;
    project?: string;
  };
  inactivityTimeoutSec: number;
  defaultElapsedLimitHours: number;
  pomodoroEnabled: boolean;
  pomodoroCount: number;
}

export interface WebviewContext {
  panel?: vscode.WebviewPanel;
  workItems: any[];
  selectedItems: number[];
  isLoading: boolean;
  error?: string;
  currentView: 'list' | 'kanban';
  lastRefresh?: number;
}

// Event types for each machine (XState v5 style)
export type ExtensionEvent =
  | { type: 'ACTIVATE'; context: vscode.ExtensionContext }
  | { type: 'DEACTIVATE' }
  | { type: 'WEBVIEW_READY' }
  | { type: 'CONNECTION_ESTABLISHED'; connectionId: string; connectionState?: any }
  | { type: 'CONNECTION_FAILED'; error: string }
  | { type: 'ERROR'; error: Error };

export type ConnectionEvent =
  | { type: 'CONNECT'; connectionId: string }
  | { type: 'DISCONNECT' }
  | { type: 'AUTH_SUCCESS' }
  | { type: 'AUTH_FAILED'; error: string }
  | { type: 'RETRY' }
  | { type: 'RESET' }
  | { type: 'HEALTH_CHECK_OK' }
  | { type: 'HEALTH_CHECK_FAILED'; error: string };

export type TimerEvent =
  | { type: 'START'; workItemId: number; workItemTitle: string }
  | { type: 'PAUSE'; manual?: boolean }
  | { type: 'RESUME'; fromActivity?: boolean }
  | { type: 'STOP' }
  | { type: 'TICK' }
  | { type: 'ACTIVITY' }
  | { type: 'INACTIVITY_TIMEOUT' }
  | { type: 'POMODORO_BREAK' };

export type WebviewEvent =
  | { type: 'SHOW' }
  | { type: 'HIDE' }
  | { type: 'READY' }
  | { type: 'MESSAGE'; message: any }
  | { type: 'LOAD_WORK_ITEMS' }
  | { type: 'WORK_ITEMS_LOADED'; items: any[] }
  | { type: 'REFRESH' }
  | { type: 'ERROR'; error: string };

// State values for type safety
export type ExtensionState = 'idle' | 'activating' | 'active' | 'error';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export type TimerState = 'idle' | 'running' | 'paused';

export type WebviewState = 'closed' | 'opening' | 'loading' | 'ready' | 'loading_data' | 'error';

// Utility types for machine definitions
export interface MachineServices {
  [key: string]: (...args: any[]) => any;
}

export interface MachineActions {
  [key: string]: (...args: any[]) => any;
}

export interface MachineGuards {
  [key: string]: (...args: any[]) => boolean;
}

// Message routing types
export interface RoutedMessage {
  type: string;
  payload?: any;
  timestamp: number;
  source: 'webview' | 'extension' | 'timer' | 'connection';
}

export type MessageCategory = 'timer' | 'connection' | 'webview' | 'extension' | 'unknown';

// Legacy bridge types for backward compatibility
export interface LegacyTimerSnapshot {
  workItemId?: number;
  workItemTitle?: string;
  startTime?: number;
  elapsedSeconds: number;
  isPaused: boolean;
  isPomodoro?: boolean;
  pomodoroCount?: number;
}

export interface TimerStopResult {
  workItemId: number;
  startTime: number;
  endTime: number;
  duration: number;
  hoursDecimal: number;
  capApplied?: boolean;
  capLimitHours?: number;
}

// =================================================================
// NEW UNIFIED APPLICATION STATE FOR FSM-FIRST ARCHITECTURE
// =================================================================

/**
 * The complete, serializable context for the entire application.
 * This is the "source of truth" managed by the main FSM.
 */
export interface ApplicationContext {
  user: { name: string; email: string; imageUrl: string } | null;
  error: { message: string; details?: any } | null;
  activeTab: 'WID' | 'BROWSE' | 'SETTINGS';

  // Settings
  settings: { [key: string]: any };

  // Azure DevOps data
  organizations: any[];
  projects: any[];
  teams: any[];
  repositories: any[];
  branches: any[];
  pullRequests: any[];
  workItems: any[];

  // Drafts for work items
  drafts: { [key: number]: any };
  currentDraft: any | null;

  // Current selections
  currentOrganization: any | null;
  currentProject: any | null;
  currentTeam: any | null;
  currentRepository: any | null;
  currentBranch: any | null;
  currentPullRequest: any | null;
  currentWorkItem: any | null;

  // Detailed fields for the current work item being edited/viewed
  currentWorkItemType: string | null;
  currentWorkItemState: string | null;
  currentWorkItemAssignedTo: any | null;
  currentWorkItemIterationPath: string | null;
  currentWorkItemAreaPath: string | null;
  currentWorkItemTitle: string | null;
  currentWorkItemDescription: string | null;
  currentWorkItemReproSteps: string | null;
  currentWorkItemSystemInfo: string | null;
  currentWorkItemAcceptanceCriteria: string | null;
}

/**
 * The complete state object for the application, designed to be
 * synchronized from the extension to the webview.
 */
export interface ApplicationState {
  fsmState: string; // Represents the current state value of the FSM
  context: ApplicationContext;
}
