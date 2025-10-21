/**
 * Webview-only FSM Mock
 * 
 * This provides a simplified FSM interface for the webview without importing
 * Node.js dependencies. The real FSM runs in the extension host.
 */

import type { 
  WorkItem, 
  Connection, 
  FSMSnapshot, 
  ApplicationContext, 
  FSMActions,
  Selectors,
  DebugInterface 
} from './webview-types.js';

declare global {
  interface Window {
    vscode?: any;
    acquireVsCodeApi?: () => any;
  }
}

const vscodeApi = (() => {
  try {
    if (typeof window === 'undefined') return null;
    if (window.vscode && typeof window.vscode.postMessage === 'function') {
      return window.vscode;
    }
    if (typeof window.acquireVsCodeApi === 'function') {
      const api = window.acquireVsCodeApi();
      if (api && typeof api.postMessage === 'function') {
        window.vscode = api;
        return api;
      }
    }
  } catch (error) {
    console.warn('[webview-fsm] Failed to acquire VS Code API', error);
  }
  return null;
})();

function postMessageToExtension(message: Record<string, unknown>) {
  try {
    if (vscodeApi && typeof vscodeApi.postMessage === 'function') {
      vscodeApi.postMessage(message);
      return;
    }
    if (typeof window !== 'undefined' && window.parent?.postMessage) {
      // Fallback for browser-based testing harnesses
      window.parent.postMessage(message, '*');
    } else {
      console.warn('[webview-fsm] No messaging bridge available for extension message:', message);
    }
  } catch (error) {
    console.error('[webview-fsm] Failed to post message to extension', error, message);
  }
}

// Extended context interface for webview mock
interface WebviewApplicationContext extends ApplicationContext {
  connections?: Connection[];
  activeConnectionId?: string;
  workItemsByConnection?: Map<string, WorkItem[]>;
  timerActor?: any;
  loadingStates?: Map<string, boolean>;
  pendingAuthReminders?: Map<string, any>;
  connectionStateSummaries?: Array<{
    id: string;
    isConnected: boolean;
    hasClient: boolean;
    hasProvider: boolean;
    reauthInProgress: boolean;
  }>;
}

// Mock FSM state for webview using plain reactive objects
let currentState = $state({
  value: 'idle',
  context: {
    connectionId: undefined,
    isInitialized: false,
    connections: [],
    activeConnectionId: undefined,
    workItemsByConnection: new Map(),
    timerActor: null,
    loadingStates: new Map(),
    pendingAuthReminders: new Map(),
    connectionStateSummaries: []
  } as WebviewApplicationContext,
  matches: (state: string) => false,
  can: (eventType: string) => false
});

import { writable } from 'svelte/store';

// Global reactive state using Svelte stores for cross-module reactivity
export const globalConnectionsCount = writable(0);
export const globalConnectionsArray = writable<Connection[]>([]);

// Simple debug store to test cross-module reactivity
export const debugStore = writable('initial');

// Create a reactive trigger for connections updates
let connectionsVersion = $state(0);

// Create a reactive connections count for UI reactivity
let connectionsCount = $state(0);

// Mock error state
const errorState = $state<Error | null>(null);

// Mock work items state
let workItemsState = $state<WorkItem[]>([]);

// Mock connection state  
let connectionState = $state<Connection | undefined>(undefined);

// Mock loading states
let isDataLoadingState = $state(false);
let isInitializingState = $state(false); 
let isActivatedState = $state(false);

// Create FSM mock object that matches expected interface
const fsmMock = {
  // Make it callable to return snapshot
  __call: () => currentState as FSMSnapshot,
  
  // Provide snapshot property for direct access
  get snapshot() {
    return currentState as FSMSnapshot;
  },
  
  // Provide error property
  get error() {
    return errorState;
  },
  
  // Additional properties that might be expected
  matches: (state: string) => currentState.value === state || currentState.value.includes(state),
  can: (eventType: string) => true, // Mock always allows events
  send: (event: any) => console.log('[webview-fsm] Event sent:', event)
};

// Make fsm both callable and have properties - direct reactive access
export const fsm = Object.assign(() => {
  // Force reactivity by accessing the version
  const version = connectionsVersion;
  console.log('[webview-fsm] fsm() called with reactive version:', version, 'connections:', currentState.context.connections?.length || 0);
  return currentState as FSMSnapshot;
}, fsmMock);

// Other reactive exports
export const connections = () => {
  const version = connectionsVersion; // Make this function reactive
  const result = currentState.context.connections || [];
  console.log('[webview-fsm] connections() called with version:', version, 'count:', result.length);
  return result;
};

// Export reactive connections count for easier access
export const connectionsCount$ = () => connectionsCount;

export const workItems = () => workItemsState;
export const activeConnection = () => connectionState;
export const isDataLoading = () => isDataLoadingState;
export const isInitializing = () => isInitializingState;
export const isActivated = () => isActivatedState;

// Mock selectors object
export const selectors: Selectors = {
  getWorkItemById: (workItemId: string | number) => {
    const allItems = Array.from(currentState.context.workItemsByConnection?.values() || []).flat();
    return allItems.find((item: WorkItem) => item.id.toString() === workItemId.toString());
  },
  
  getConnectionById: (connectionId: string) => {
    return currentState.context.connections?.find((conn: Connection) => conn.id === connectionId);
  },
  
  getActiveConnection: () => {
    const activeId = currentState.context.activeConnectionId;
    if (!activeId) return null;
    return currentState.context.connections?.find((conn: Connection) => conn.id === activeId) || null;
  }
};

// Mock actions that send messages to extension
export const actions: FSMActions = {
  startConnection: (payload) => {
    console.log('[webview-fsm] Sending startConnection message', payload);
    postMessageToExtension({ type: 'startConnection', payload });
  },
  
  stopConnection: () => {
    console.log('[webview-fsm] Sending stopConnection message');
    postMessageToExtension({ type: 'stopConnection' });
  },
  
  loadWorkItems: (connId?: string, query?: any) => {
    console.log('[webview-fsm] Sending loadWorkItems message', { connId, query });
    postMessageToExtension({ type: 'getWorkItems', connectionId: connId, query });
  },
  
  startTimer: (workItemId?: string | number, title?: string) => {
    console.log('[webview-fsm] Sending startTimer message', { workItemId, title });
    postMessageToExtension({ type: 'startTimer', workItemId, title });
  },
  
  requireAuthentication: (connectionId: string) => {
    console.log('[webview-fsm] Sending requireAuthentication message', { connectionId });
    postMessageToExtension({ type: 'requireAuthentication', connectionId });
  },
  
  setActiveConnection: (connectionId: string) => {
    console.log('[webview-fsm] Sending setActiveConnection message', { connectionId });
    postMessageToExtension({ type: 'setActiveConnection', connectionId });
  }
};

// Mock start/stop functions
export function startFSM() {
  console.log('[webview-fsm] FSM start requested (mock)');
  currentState.value = 'running';
  return Promise.resolve();
}

export function stopFSM() {
  console.log('[webview-fsm] FSM stop requested (mock)');
  currentState.value = 'idle';
  return Promise.resolve();  
}

// Mock debug interface
export const debug: DebugInterface = {
  getSnapshot: () => currentState,
  subscribe: () => () => {}, // No-op unsubscribe
  send: (event: any) => console.log('[webview-fsm] Debug send:', event)
};

// Message handler to update webview state from extension
export function handleExtensionMessage(message: any) {
  if (message.type === 'fsm-state-update') {
    // Update webview state based on extension FSM state
    currentState.value = message.state?.value || 'idle';
    currentState.context = message.state?.context || { connectionId: undefined, isInitialized: false };
  }
  
  if (message.type === 'contextUpdate') {
    const contextPayload = message.context || {};
    const incomingConnections = Array.isArray(contextPayload.connections)
      ? contextPayload.connections
      : [];
    const activeConnectionId = typeof contextPayload.activeConnectionId === 'string'
      ? contextPayload.activeConnectionId
      : null;

    // Update connections and derived reactive helpers
    currentState.context.connections = incomingConnections;
    currentState.context.activeConnectionId = activeConnectionId || undefined;
    connectionsVersion++;
    connectionsCount = incomingConnections.length;
    globalConnectionsCount.set(connectionsCount);
    globalConnectionsArray.set([...incomingConnections]);

    if (activeConnectionId) {
      const activeConn = incomingConnections.find((conn: Connection) => conn.id === activeConnectionId);
      if (activeConn) {
        connectionState = activeConn;
      }
    }

    // Sync work items map for the active connection
    const incomingWorkItems = Array.isArray(contextPayload.workItems) ? contextPayload.workItems : [];
    if (!(currentState.context.workItemsByConnection instanceof Map)) {
      currentState.context.workItemsByConnection = new Map();
    }
    const workItemsMap = new Map(currentState.context.workItemsByConnection);
    if (activeConnectionId) {
      workItemsMap.set(activeConnectionId, incomingWorkItems);
      workItemsState = incomingWorkItems;
    } else {
      workItemsState = incomingWorkItems;
    }
    currentState.context.workItemsByConnection = workItemsMap;

    // Update loading state snapshot helpers
    isDataLoadingState = Boolean(contextPayload.isLoading);
    isInitializingState = false;
    isActivatedState = true;

    // Normalize auth reminders into the FSM mock context
    const authReminderEntries = Array.isArray(contextPayload.authReminders)
      ? contextPayload.authReminders
          .filter((reminder: any) => typeof reminder?.connectionId === 'string')
          .map((reminder: any) => [reminder.connectionId, reminder])
      : [];
    currentState.context.pendingAuthReminders = new Map(authReminderEntries);

    if (Array.isArray(contextPayload.connectionStateSummaries)) {
      currentState.context.connectionStateSummaries = [
        ...contextPayload.connectionStateSummaries,
      ];
    }

    // Force reactivity by cloning current state object
    currentState = {
      ...currentState,
      context: {
        ...currentState.context,
        connections: [...incomingConnections],
        workItemsByConnection: new Map(workItemsMap),
        pendingAuthReminders: new Map(authReminderEntries),
        activeConnectionId: activeConnectionId || undefined,
        connectionStateSummaries: Array.isArray(contextPayload.connectionStateSummaries)
          ? [...contextPayload.connectionStateSummaries]
          : currentState.context.connectionStateSummaries,
      },
    };

    return;
  }

  if (message.type === 'work-items-update') {
    workItemsState = message.workItems || [];
    console.log('[webview-fsm] Work items updated:', message.workItems?.length, 'from source:', message.source);
  }
  
  if (message.type === 'connections-update') {
    const oldConnections = currentState.context.connections?.length || 0;
    
    // Update the connections directly
    currentState.context.connections = message.connections || [];
    currentState.context.activeConnectionId = message.activeConnectionId;
    
    // Set the active connection object based on the activeConnectionId
    if (message.activeConnectionId && currentState.context.connections) {
      const activeConn = currentState.context.connections.find(
        (conn: Connection) => conn.id === message.activeConnectionId
      );
      if (activeConn) {
        connectionState = activeConn;
        console.log('[webview-fsm] Active connection set:', {
          id: activeConn.id,
          name: activeConn.name,
          url: activeConn.url
        });
      } else {
        console.warn('[webview-fsm] Active connection ID not found in connections list:', message.activeConnectionId);
      }
    }
    
    // Force reactivity by reassigning the entire currentState
    currentState = { ...currentState };
    
    // Increment the connections version to trigger reactive updates
    connectionsVersion++;
    
    // Update the reactive connections count
    connectionsCount = currentState.context.connections?.length || 0;
    
    // UPDATE GLOBAL REACTIVE STATE - THIS IS THE KEY FIX!
    globalConnectionsCount.set(connectionsCount);
    globalConnectionsArray.set([...(currentState.context.connections || [])]);
    
    // Update debug store to test reactivity
    debugStore.set(`updated-${connectionsCount}-${Date.now()}`);
    
    const newConnections = currentState.context.connections?.length || 0;
    console.log('[webview-fsm] Connections updated:', message.connections?.length, 'active:', message.activeConnectionId);
    console.log('[webview-fsm] Context state after update:', {
      oldCount: oldConnections,
      newCount: newConnections,
      contextConnections: currentState.context.connections?.length || 0,
      contextObject: typeof currentState.context,
      connectionsArray: Array.isArray(currentState.context.connections),
      stateReassigned: true,
      connectionsVersion: connectionsVersion,
      reactiveCount: connectionsCount,
      globalCountStore: 'updated via store.set()',
      globalArrayStore: 'updated via store.set()',
      debugStoreUpdated: true
    });
  }
  
  if (message.type === 'connection-update') {
    connectionState = message.connection;
  }
  
  if (message.type === 'loading-state-update') {
    isDataLoadingState = message.isDataLoading || false;
    isInitializingState = message.isInitializing || false; 
    isActivatedState = message.isActivated || false;
  }
  
  if (message.type === 'connectionSwitched') {
    console.log('🔗 [webview-fsm] Connection switched:', {
      newConnectionId: message.connectionId,
      connection: message.connection,
      oldActiveId: currentState.context.activeConnectionId
    });
    
    // Update the active connection in context
    if (currentState.context) {
      currentState.context.activeConnectionId = message.connectionId;
    }
    
    // This should trigger reactivity updates
    currentState = { ...currentState };
  }
  
  if (message.type === 'connectionSwitchFailed') {
    console.error('🔴 [webview-fsm] Connection switch failed:', {
      connectionId: message.connectionId,
      error: message.error
    });
  }

  if (message.type === 'auth-reminders-update') {
    // Convert auth reminders array back to Map
    const remindersMap = new Map();
    if (message.authReminders && Array.isArray(message.authReminders)) {
      message.authReminders.forEach((reminder: any) => {
        remindersMap.set(reminder.connectionId, reminder);
      });
    }
    currentState.context.pendingAuthReminders = remindersMap;
    console.log('[webview-fsm] Auth reminders updated:', remindersMap.size, 'pending');
  }
}

// Re-export initialization functions from the real FSM module
// Commented out to avoid importing Node.js dependencies in webview
// export { initializeFSMEffects } from './fsm.svelte.js';