/**
 * Svelte 5 + Universal Reactivity Entry Point
 * 
 * This uses the new .svelte.ts reactive patterns with FSM integration.
 * Components now reactively respond to FSM state changes through universal reactivity.
 */

import { mount } from 'svelte';
import { contextState, type ContextState } from './contextIntegration.js';
import { handleExtensionMessage } from './fsm-webview.svelte.js';
import { integrationActions } from './store.svelte.js';
// import MinimalReactiveApp from './MinimalReactiveApp.svelte';
// import ReactiveApp from './ReactiveApp-Step1.svelte';
// import ReactiveApp from './ReactiveApp-Step2.svelte';
// import ReactiveApp from './ReactiveApp-Step3.svelte';
// import ReactiveApp from './ReactiveApp-Step4.svelte';
// import ReactiveApp from './ReactiveApp.svelte';
// @ts-expect-error Svelte component resolved by bundler during webview build
import ReactiveApp from './ReactiveApp.svelte';

// Simplified imports - comment out complex store dependencies for now
// import { 
//   fsm,
//   actions as fsmActions,
//   startFSM,
//   stopFSM,
//   activeConnection,
//   workItems,
//   isDataLoading,
//   isInitializing,
//   isActivated,
//   debug as fsmDebug,
//   handleExtensionMessage
// } from './fsm-webview.svelte.ts';

// import { 
//   ui,
//   connections,
//   uiActions,
//   integrationActions,
//   debug as storeDebug
// } from './store.svelte.ts';

// ============================================================================
// VS CODE API SETUP
// ============================================================================

declare global {
  interface Window {
    vscode?: any;
    acquireVsCodeApi?: () => any;
  }
}

// Use the globally set VS Code API
const vscode = (() => {
  if ((window as any).vscode) {
    console.log('[reactive-main] Using globally available VS Code API');
    return (window as any).vscode;
  } else if (window.acquireVsCodeApi) {
    console.log('[reactive-main] Acquiring VS Code API...');
    const api = window.acquireVsCodeApi();
    (window as any).vscode = api; // Store globally for reuse
    return api;
  } else {
    console.warn('[reactive-main] No VS Code API available');
    return null;
  }
})();

function postMessage(message: any) {
  try {
    if (vscode && typeof vscode.postMessage === 'function') {
      vscode.postMessage(message);
      console.log('[reactive-main] ✅ Message sent via VS Code API:', message.type);
    } else {
      console.warn('[reactive-main] VS Code API not available, trying context bridge for:', message.type);
      
      // Use context bridge for connection switching and timer control
      if (message.type === 'switchConnection' && message.connectionId) {
        if ((window as any).__EXTENSION_CONTEXT_MANAGER__) {
          (window as any).__EXTENSION_CONTEXT_MANAGER__.applyAction('setActiveConnection', message.connectionId);
          console.log('[reactive-main] ✅ Connection switch via context bridge:', message.connectionId);
        } else {
          console.error('[reactive-main] Context bridge not available for connection switching');
        }
      } else if (message.type === 'startTimer') {
        if ((window as any).__EXTENSION_CONTEXT_MANAGER__) {
          (window as any).__EXTENSION_CONTEXT_MANAGER__.applyAction('startTimer');
          console.log('[reactive-main] ✅ Timer start via context bridge');
        }
      } else if (message.type === 'stopTimer') {
        if ((window as any).__EXTENSION_CONTEXT_MANAGER__) {
          (window as any).__EXTENSION_CONTEXT_MANAGER__.applyAction('stopTimer');
          console.log('[reactive-main] ✅ Timer stop via context bridge');
        }
      } else {
        console.warn('[reactive-main] No fallback available for message type:', message.type);
      }
    }
  } catch (error) {
    console.error('[reactive-main] Failed to post message:', error, message);
  }
}

// ============================================================================
// FSM INITIALIZATION AND MESSAGING BRIDGE
// ============================================================================

/**
 * Initialize the application with simplified setup.
 * This bypasses complex store dependencies for now.
 */
let unsubscribeContext: (() => void) | null = null;
let lastContextDigest = '';

type LegacyConnectionEntry = {
  id: string;
  label: string;
  name: string;
  organization?: string;
  project?: string;
  authMethod?: string;
  url?: string;
};

function toLegacyConnection(entry: any): LegacyConnectionEntry | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  if (!id) {
    return null;
  }
  const label =
    typeof record.label === 'string' && record.label.trim().length > 0
      ? record.label.trim()
      : typeof record.project === 'string' && record.project.trim().length > 0
        ? record.project.trim()
        : id;
  const organization =
    typeof record.organization === 'string' && record.organization.trim().length > 0
      ? record.organization.trim()
      : undefined;
  const project =
    typeof record.project === 'string' && record.project.trim().length > 0
      ? record.project.trim()
      : undefined;
  const authMethod =
    record.authMethod === 'entra'
      ? 'entra'
      : record.authMethod === 'pat'
        ? 'pat'
        : undefined;
  const url = typeof record.baseUrl === 'string' ? record.baseUrl : undefined;

  return {
    id,
    label,
    name: label,
    organization,
    project,
    authMethod,
    url,
  } satisfies LegacyConnectionEntry;
}

function readNumericId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function inferWorkItemIdentifier(item: unknown): number | null {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const record = item as Record<string, unknown>;
  const direct = readNumericId(record.id);
  if (direct !== null) {
    return direct;
  }
  if (record.fields && typeof record.fields === 'object') {
    return readNumericId((record.fields as Record<string, unknown>)['System.Id']);
  }
  return null;
}

function digestContext(context: ContextState): string {
  try {
    const connectionIds = Array.isArray(context.connections)
      ? context.connections.map((entry) => (typeof entry?.id === 'string' ? entry.id : ''))
      : [];
    const activeConnectionId =
      (typeof context.tab?.connectionId === 'string' && context.tab.connectionId) ||
      (typeof context.activeConnectionId === 'string' ? context.activeConnectionId : null);
    const workItemIds = Array.isArray(context.tab?.rawWorkItems)
      ? context.tab.rawWorkItems
          .map((item) => inferWorkItemIdentifier(item))
          .filter((id): id is number => typeof id === 'number')
      : [];
    const timerFingerprint = context.tab?.timer
      ? {
          isActive: Boolean(context.tab.timer.isActive),
          workItemId: context.tab.timer.workItemId ?? null,
          elapsed: context.tab.timer.elapsed ?? 0,
        }
      : null;
    const authReminderKeys = Array.isArray(context.authReminders)
      ? context.authReminders.map((reminder) =>
          `${reminder.connectionId ?? ''}:${reminder.reason ?? ''}:${reminder.detail ?? ''}`
        )
      : [];
    const tabReminderKey = context.tab?.authReminder
      ? `${context.tab.connectionId ?? activeConnectionId ?? ''}:${context.tab.authReminder.reason ?? ''}:${context.tab.authReminder.detail ?? ''}`
      : null;
    return JSON.stringify({
      connectionIds,
      activeConnectionId,
      workItemIds,
      timerFingerprint,
      authReminderKeys,
      tabReminderKey,
    });
  } catch (error) {
    console.warn('[reactive-main] Failed to compute context digest', error);
    return String(Date.now());
  }
}

function hydrateLegacyStoresFromContext(context: ContextState): void {
  if (!context) {
    return;
  }

  const digest = digestContext(context);
  if (digest === lastContextDigest) {
    return;
  }
  lastContextDigest = digest;

  const connections = Array.isArray(context.connections)
    ? context.connections.map(toLegacyConnection).filter((entry): entry is LegacyConnectionEntry => entry !== null)
    : [];

  const activeConnectionId =
    (typeof context.tab?.connectionId === 'string' && context.tab.connectionId.trim().length > 0
      ? context.tab.connectionId.trim()
      : null) ||
    (typeof context.activeConnectionId === 'string' && context.activeConnectionId.trim().length > 0
      ? context.activeConnectionId.trim()
      : connections.length > 0
        ? connections[0]!.id
        : null);

  handleExtensionMessage({
    type: 'connections-update',
    connections,
    activeConnectionId,
  });

  const workItems = Array.isArray(context.tab?.rawWorkItems)
    ? context.tab.rawWorkItems
    : Array.isArray(context.workItems)
      ? context.workItems
      : [];

  handleExtensionMessage({
    type: 'work-items-update',
    workItems,
    connectionId: activeConnectionId ?? undefined,
    metadata: {
      connectionId: activeConnectionId ?? undefined,
      source: 'context-bridge',
    },
  });

  handleExtensionMessage({
    type: 'loading-state-update',
    isDataLoading: Boolean(context.tab?.status?.isLoading ?? context.isLoading),
    isInitializing: false,
    isActivated: true,
  });

  const reminderMap = new Map<string, {
    connectionId: string;
    reason?: string;
    detail?: string;
    label: string;
  }>();

  const ensureReminder = (connectionId: string | null | undefined, reason?: string, detail?: string) => {
    if (!connectionId) {
      return;
    }
    const normalizedId = connectionId.trim();
    if (!normalizedId) {
      return;
    }
    const userFacingLabel = connections.find((connection) => connection.id === normalizedId)?.label ?? normalizedId;
    reminderMap.set(normalizedId, {
      connectionId: normalizedId,
      reason,
      detail,
      label: userFacingLabel,
    });
  };

  if (Array.isArray(context.authReminders)) {
    for (const reminder of context.authReminders) {
      ensureReminder(reminder?.connectionId, reminder?.reason, reminder?.detail);
    }
  }

  if (context.tab?.authReminder) {
    ensureReminder(context.tab.connectionId ?? activeConnectionId, context.tab.authReminder.reason, context.tab.authReminder.detail);
  }

  const authRemindersPayload = Array.from(reminderMap.values()).map((reminder) => ({
    connectionId: reminder.connectionId,
    reason: reminder.reason,
    detail: reminder.detail,
    label: reminder.label,
  }));

  handleExtensionMessage({
    type: 'auth-reminders-update',
    authReminders: authRemindersPayload,
  });
}

function processExtensionMessage(message: any): void {
  if (!message || typeof message !== 'object') {
    return;
  }
  const type = message.type;
  console.log('[reactive-main] Received message:', type, message);

  if (type === 'contextUpdate') {
    const context = message.context as ContextState | undefined;
    if (context) {
      contextState.set(context);
      hydrateLegacyStoresFromContext(context);
    }
    return;
  }

  handleExtensionMessage(message);
}

function initializeApplication() {
  // Simplified initialization - comment out complex FSM for debugging
  // startFSM();
  
  // Handle direct store update messages only
  window.addEventListener('message', (event) => {
    processExtensionMessage(event.data);
  });

  if (typeof contextState?.subscribe === 'function') {
    unsubscribeContext = contextState.subscribe((state) => {
      if (state) {
        hydrateLegacyStoresFromContext(state);
      }
    });
  }
  
  // Notify that webview is ready
  console.log('[reactive-main] Webview ready - using simplified setup');
  
  // Log webview initialization with mock data
  console.log('[reactive-main] Application initialized with simplified setup', {
    isInitializing: false,
    isActivated: true,
    connectionsCount: 0,
  });
  
  // Request initial data
  postMessage({ type: 'ready' });
}

// ============================================================================
// SVELTE COMPONENT SETUP
// ============================================================================

/**
 * Mount the reactive Svelte app.
 * The app will automatically respond to FSM state changes through direct store subscriptions.
 */
function mountReactiveApp() {
  console.log('🔵 [reactive-main] mountReactiveApp called');
  
  const target = document.getElementById('svelte-root');
  
  if (!target) {
    throw new Error('Could not find svelte-root element');
  }
  
  console.log('🔵 [reactive-main] Found svelte-root element, mounting ReactiveApp...');

  // Debug initial state with mock data
  console.log('[reactive-main] Reactive state at mount time (simplified):', {
    workItemsCount: 0,
    isDataLoading: false,
    isInitializing: false,
    connectionsCount: 0,
  });

  console.log('[reactive-main] Mounting ReactiveApp based on proven pattern');
  
  // Mount the component for debugging
  const app = mount(ReactiveApp, {
    target,
    props: {
      onConnectionSelect: integrationActions.switchToConnection,
      onRefreshData: integrationActions.loadWorkItems,
      onTimerStart: integrationActions.startTimerForWorkItem,
    },
  });

  // Debug reactive state changes (no manual subscriptions needed with universal reactivity)
  console.log('[reactive-main] ✅ App mounted successfully with universal reactivity');
  
  return app;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Boot sequence:
 * 1. Initialize FSM
 * 2. Mount reactive Svelte app
 * 3. FSM handles all state transitions
 * 4. Components react to state changes automatically
 */
try {
  console.log('🔵 [reactive-main] Starting initialization...');
  
  initializeApplication();
  console.log('🔵 [reactive-main] Application initialized, mounting ReactiveApp...');
  
  const app = mountReactiveApp();
  console.log('🟢 [reactive-main] ReactiveApp component mounted and running (fixed version)');
  
  console.log('[reactive-main] Reactive webview successfully initialized');
  
  // Export for debugging (simplified)
  (window as any).__REACTIVE_APP__ = {
    app,
    // integrationActions,
    // uiActions,
    // fsmDebug,
    // storeDebug
  };
  
} catch (error) {
  console.error('❌ [reactive-main] Failed to initialize reactive webview:', error);
  
  // Fallback error display
  const root = document.getElementById('svelte-root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 20px; color: var(--vscode-errorForeground);">
        <h2>Initialization Error</h2>
        <p>Failed to load the reactive interface: ${error instanceof Error ? error.message : String(error)}</p>
        <button onclick="window.location.reload()">Retry</button>
      </div>
    `;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (unsubscribeContext) {
      try {
        unsubscribeContext();
      } catch (error) {
        console.warn('[reactive-main] Failed to unsubscribe context listener', error);
      }
      unsubscribeContext = null;
    }
  });
}