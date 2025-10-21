/**
 * Context-Driven Webview Integration
 * 
 * Simple reactive approach that works with the ContextManager
 * from the extension side.
 */

import { writable, derived, type Writable, type Readable } from 'svelte/store';

// Types for context integration
type AuthMethod = 'pat' | 'entra' | undefined;

export interface TabWorkItemViewModel {
  id: number;
  title: string;
  type?: string;
  state?: string;
  assignedTo?: string;
}

export interface TabTimerViewModel {
  isActive: boolean;
  isRunning: boolean;
  workItemId: number | null;
  elapsed: number;
}

export interface TabStatusViewModel {
  isLoading: boolean;
  lastError?: string | null;
}

export interface TabAuthReminderViewModel {
  reason: string;
  detail?: string;
}

export interface TabViewModel {
  connectionId: string | null;
  label: string;
  organization?: string;
  project?: string;
  authMethod?: AuthMethod;
  isActive: boolean;
  workItems: TabWorkItemViewModel[];
  rawWorkItems?: unknown[];
  timer: TabTimerViewModel;
  status: TabStatusViewModel;
  authReminder: TabAuthReminderViewModel | null;
}

export interface ContextState {
  activeConnectionId: string | null;
  connections: Array<{
    id: string;
    label: string;
    organization?: string;
    project?: string;
    authMethod?: AuthMethod;
  }>;
  workItems: TabWorkItemViewModel[];
  timer: TabTimerViewModel;
  isLoading: boolean;
  authReminders?: Array<{
    connectionId: string;
    reason: string;
    detail?: string;
  }>;
  tab?: TabViewModel;
}

// ============================================================================
// CONTEXT STORES
// ============================================================================

// Main context store - updated from extension messages
export const contextState: Writable<ContextState | null> = writable(null);

// Derived stores for specific UI needs
export const connections: Readable<any[]> = derived(
  contextState, 
  ($state) => $state?.connections || []
);

export const activeConnection: Readable<any | null> = derived(
  [contextState], 
  ([$state]) => {
    if (!$state) return null;
    const targetId = $state.tab?.connectionId ?? $state.activeConnectionId;
    return $state.connections.find(c => c.id === targetId) || null;
  }
);

export const workItems: Readable<any[]> = derived(
  contextState,
  ($state) => $state?.tab?.workItems || $state?.workItems || []
);

export const timerState: Readable<any> = derived(
  contextState,
  ($state) => $state?.tab?.timer || $state?.timer || { isActive: false, isRunning: false, elapsed: 0 }
);

export const isLoading: Readable<boolean> = derived(
  contextState,
  ($state) => $state?.tab?.status?.isLoading ?? $state?.isLoading ?? false
);

// ============================================================================
// CONTEXT ACTIONS
// ============================================================================

export const contextActions = {
  switchConnection: (connectionId: string) => {
    console.log('[Webview Context] Switching connection to:', connectionId);
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'switchConnection',
        connectionId
      });
    }
  },

  startTimer: (workItemId: string) => {
    console.log('[Webview Context] Starting timer for:', workItemId);
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'startTimer',
        workItemId: parseInt(workItemId)
      });
    }
  },

  stopTimer: () => {
    console.log('[Webview Context] Stopping timer');
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'stopTimer'
      });
    }
  },

  refreshWorkItems: () => {
    console.log('[Webview Context] Refreshing work items');
    if (window.vscode) {
      window.vscode.postMessage({
        type: 'refreshWorkItems'
      });
    }
  }
};

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

// Listen for context updates from extension
function handleContextMessage(event: MessageEvent) {
  if (event.data?.type === 'contextUpdate') {
    console.log('[Webview Context] Received context update:', event.data.context);
    contextState.set(event.data.context);
  }
}

// Setup message listener
if (typeof window !== 'undefined') {
  window.addEventListener('message', handleContextMessage);
  
  // Request initial context
  if (window.vscode) {
    window.vscode.postMessage({ type: 'getContext' });
  }
}

// ============================================================================
// DEBUGGING
// ============================================================================

export const contextDebug = {
  getState: () => {
    let currentState: ContextState | null = null;
    const unsubscribe = contextState.subscribe(state => {
      currentState = state;
    });
    unsubscribe();
    return currentState;
  },
  
  logState: () => {
    console.log('[Context Debug] Current state:', contextDebug.getState());
  },
  
  testSwitchConnection: (connectionId: string) => {
    console.log('[Context Debug] Testing connection switch to:', connectionId);
    contextActions.switchConnection(connectionId);
  }
};

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).contextDebug = contextDebug;
  (window as any).contextActions = contextActions;
}

console.log('🌟 [Webview Context] Context-driven integration initialized');