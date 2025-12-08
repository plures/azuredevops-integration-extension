/**
 * Module: Webview Main
 * Owner: webview
 * Reads: syncState messages from extension; ApplicationContext (serialized)
 * Writes: UI-only events; selection via selection writer factory (webview-owned)
 * Receives: syncState, commands from extension
 * Emits: appEvent wrapper messages to activation (Router handles stamping)
 * Prohibitions: Do not import extension host modules; Do not define context types
 * Rationale: Webview bootstrap and message bridge for UI
 *
 * LLM-GUARD:
 * - Use selection writer factory to change selection
 * - Forward UI events to Router; do not route by connection here
 */
import { mount } from 'svelte';
import App from './App.svelte';
import { frontendEngine } from './praxis/frontendEngine.js';
import { webviewEngine } from './praxis/webview/engine.js';
import { SyncStateEvent } from '../praxis/application/rules/syncRules.js';
import { SyncAppStateEvent } from './praxis/webview/facts.js';
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

  console.debug('[AzureDevOpsInt][webview] process shim installed');
}

// -------------------------------------------------------------
// Praxis Sync Listener
// The extension posts { type: 'contextUpdate', context: ... }
// We dispatch a SyncStateEvent to the frontend Praxis engine.
// The engine updates the store, which the UI subscribes to.
// -------------------------------------------------------------
window.addEventListener('message', (event) => {
  const msg = event?.data;
  console.debug('[AzureDevOpsInt][webview] Received message:', {
    type: msg?.type,
    hasContext: !!msg?.context,
    hasPayload: !!msg?.payload,
  });

  let context = msg?.context;
  let fsmState = msg?.fsmState;
  let matches = msg?.matches;

  if (msg?.type === 'syncState' && msg?.payload) {
    context = msg.payload.context;
    fsmState = msg.payload.fsmState;
    matches = msg.payload.matches;
  }

  // Handle new Praxis Reactive State
  if (msg?.command === 'UPDATE_STATE' && msg?.payload) {
    console.debug('[webview] Received UPDATE_STATE', msg.payload);
    // Map the new props to the legacy context structure for now
    // so that existing components continue to work
    context = {
      ...context, // Keep existing context if any
      connections: msg.payload.connections,
      activeConnectionId: msg.payload.activeConnectionId,
      // Map other props as needed
    };
    // Force update
  }

  if (context) {
    console.debug('[webview] Dispatching SyncState to engines', {
      hasConnections: context.connections?.length > 0,
      appState: fsmState,
    });

    // Enrich context with FSM state to match ApplicationEngineContext structure
    // The serialized context from activation.ts is flat and missing applicationState
    const enrichedContext = {
      ...context,
      applicationState: fsmState || 'active',
      // Ensure connections is an array
      connections: Array.isArray(context.connections) ? context.connections : [],
    };

    // Dispatch to Praxis engine
    frontendEngine.step([SyncStateEvent.create(context)]);
    webviewEngine.step([SyncAppStateEvent.create(enrichedContext)]);

    // Update the snapshot store for the UI
    applicationSnapshot.set({
      value: fsmState || 'active',
      context: context,
      matches: matches || {},
    });
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
      vscode.postMessage({ type: 'webviewReady' });
    }
  } catch (e) {
    console.debug('🔴 [AzureDevOpsInt][webview] Failed to mount Svelte component:', e);
  }
});

// Make sure acquireVsCodeApi is declared if it's used.
declare function acquireVsCodeApi(): any;
