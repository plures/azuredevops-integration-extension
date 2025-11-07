import { mount } from 'svelte';
import App from './App.svelte';
import { applicationSnapshot } from './fsmSnapshotStore.js';

// This ensures that we only try to mount the Svelte app after the DOM is fully loaded.
// This is a critical step to prevent race conditions where the script runs before the
// target element (`svelte-root`) is available.

console.debug('[AzureDevOpsInt][webview] main.ts initialized');

// -------------------------------------------------------------
// Minimal Node `process` shim for browser (VS Code webview) context.
// Bundled dependencies reference process.env / arch / platform.
// We provide a safe subset to avoid ReferenceError without exposing
// privileged Node APIs.
// -------------------------------------------------------------
declare global {
  interface Window {
    process?: any;
  }
}
if (typeof (globalThis as any).process === 'undefined') {
  (globalThis as any).process = {
    env: {
      NODE_ENV: 'development',
      USE_TIMER_FSM: 'true',
      USE_CONNECTION_FSM: 'true',
      USE_WEBVIEW_FSM: 'true',
      USE_MESSAGE_ROUTER: 'true',
    },
    arch: '',
    platform: 'browser',
    version: '0.0.0-webview',
    nextTick: (cb: (...args: any[]) => void) => Promise.resolve().then(cb),
  };
  // Ensure identifier binding in module scope

  const _process = (globalThis as any).process;
  console.debug('[AzureDevOpsInt][webview] process shim installed');
}

// -------------------------------------------------------------
// FSM snapshot listener - minimal bridge
// The extension posts { type: 'syncState', payload: { fsmState, context }}
// We update a Svelte store so components can react without importing
// Node-bound FSM implementations.
// -------------------------------------------------------------
window.addEventListener('message', (event) => {
  const msg = event?.data;
  console.debug('[AzureDevOpsInt][webview] Received message:', {
    type: msg?.type,
    hasPayload: !!msg?.payload,
    hasError: !!msg?.error,
    connectionId: msg?.connectionId,
    fullMessage: msg,
  });
  if (msg?.type === 'syncState' && msg?.payload) {
    console.debug('[AzureDevOpsInt][webview] Processing syncState message:', {
      fsmState: msg.payload.fsmState,
      hasContext: !!msg.payload.context,
      hasMatches: !!msg.payload.matches,
      matches: msg.payload.matches,
    });
    try {
      applicationSnapshot.set({
        value: msg.payload.fsmState,
        context: msg.payload.context,
        matches: msg.payload.matches || {},
      });
      console.debug('[AzureDevOpsInt][webview] Successfully updated applicationSnapshot store');
    } catch (e) {
      console.debug('[AzureDevOpsInt][webview] Failed to apply FSM snapshot', e);
    }
  } else if (msg?.type === 'syncTimerState' && msg?.payload) {
    console.debug('[AzureDevOpsInt][webview] Processing syncTimerState message:', {
      hasPayload: !!msg.payload,
      hasContext: !!msg.payload.context,
      hasTimerState: !!msg.payload.context?.timerState,
    });
    try {
      // Update just the timer state in the existing snapshot
      const current = applicationSnapshot.peek();
      applicationSnapshot.set({
        ...current,
        context: {
          ...current.context,
          ...msg.payload.context,
        },
      });
      console.debug('[AzureDevOpsInt][webview] Successfully updated timer state in snapshot');
    } catch (e) {
      console.debug('[AzureDevOpsInt][webview] Failed to apply timer state update', e);
    }
  } else if (msg?.type === 'workItemsError') {
    // Handle work items error messages from provider
    console.debug('[AzureDevOpsInt][webview] Processing workItemsError message:', {
      error: msg.error,
      connectionId: msg.connectionId,
    });
    try {
      // Update context with error information
      const current = applicationSnapshot.peek();
      applicationSnapshot.set({
        ...current,
        context: {
          ...current.context,
          workItemsError: msg.error || 'Failed to load work items',
          workItemsErrorConnectionId: msg.connectionId,
        },
      });
      console.debug('[AzureDevOpsInt][webview] Successfully updated context with workItemsError');
    } catch (e) {
      console.debug('[AzureDevOpsInt][webview] Failed to apply workItemsError', e);
    }
  } else if (msg?.type === 'workItemsLoaded') {
    // Clear error when work items are successfully loaded
    try {
      const current = applicationSnapshot.peek();
      applicationSnapshot.set({
        ...current,
        context: {
          ...current.context,
          workItemsError: null,
          workItemsErrorConnectionId: null,
        },
      });
    } catch (e) {
      console.debug('[AzureDevOpsInt][webview] Failed to clear workItemsError', e);
    }
  }
});

// We prefer a stable dedicated root element but if it's missing (e.g. legacy HTML
// or experimental template differences) we fall back to creating one.
const PREFERRED_IDS = ['svelte-root', 'root', 'app'];

function findExistingMount(): HTMLElement | null {
  for (const id of PREFERRED_IDS) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}

function ensureMountTarget(): HTMLElement {
  const existing = findExistingMount();
  if (existing) return existing;
  // Create the preferred id to maintain consistency with activation.ts template
  const created = document.createElement('div');
  created.id = 'svelte-root';
  // Use first element child of body as insertion reference to keep predictable order
  if (document.body.firstChild) {
    document.body.insertBefore(created, document.body.firstChild);
  } else {
    document.body.appendChild(created);
  }
  console.debug('[AzureDevOpsInt][webview] Created missing mount element #svelte-root');
  return created;
}

window.addEventListener('DOMContentLoaded', () => {
  console.debug('[AzureDevOpsInt][webview] DOMContentLoaded: ensuring mount target');
  const root = ensureMountTarget();
  try {
    // Acquire VS Code API once and make it available globally
    let vscode: any;
    if (typeof acquireVsCodeApi === 'function') {
      vscode = acquireVsCodeApi();
      (window as any).__vscodeApi = vscode;
    }

    mount(App, { target: root });
    console.debug(
      '🟢 [AzureDevOpsInt][webview] Svelte component mounted successfully on #' + root.id
    );

    if (vscode) {
      vscode.postMessage({ type: 'ready' });
    }
  } catch (e) {
    console.debug('🔴 [AzureDevOpsInt][webview] Failed to mount Svelte component:', e);
  }
});

// Make sure acquireVsCodeApi is declared if it's used.
declare function acquireVsCodeApi(): any;
