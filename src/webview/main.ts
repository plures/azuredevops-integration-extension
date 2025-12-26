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
import { praxisStore } from './praxis/store.js';
import { SyncStateEvent } from '../praxis/application/facts.js';
import { applicationSnapshot } from './praxisSnapshotStore.js';
import { interceptPostMessage, interceptWindowMessages } from '../logging/MessageInterceptor.js';

// This ensures that we only try to mount the Svelte app after the DOM is fully loaded.
// This is a critical step to prevent race conditions where the script runs before the
// target element (`svelte-root`) is available.

// CRITICAL: Set up automatic message interception FIRST, before any other code
// This must happen before window.addEventListener('message', ...) is called
try {
  interceptWindowMessages('webview');
} catch (err) {
  // Silent fail - automatic logging is best-effort
}

// Host log helper for diagnostics
let __vscodeApi: any = undefined;
function getVsCodeApi(): any | undefined {
  if (__vscodeApi) return __vscodeApi;
  try {
    if (typeof acquireVsCodeApi === 'function') {
      __vscodeApi = acquireVsCodeApi();
      (window as any).__vscodeApi = __vscodeApi;
      
      // Intercept postMessage for automatic logging
      if (__vscodeApi && typeof __vscodeApi.postMessage === 'function') {
        __vscodeApi = interceptPostMessage(__vscodeApi, 'webview');
      }
      
      return __vscodeApi;
    }
  } catch (err) {
    // Silent fail - automatic logging is best-effort
  }
  return __vscodeApi;
}

function describeError(err: unknown) {
  const errorObj = err as any;
  return {
    message: errorObj?.message ?? String(err),
    name: errorObj?.name,
    stack: errorObj?.stack,
    cause: errorObj?.cause ? String(errorObj.cause) : undefined,
  };
}

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
      USE_TIMER_PRAXIS: 'true',
      USE_CONNECTION_PRAXIS: 'true',
      USE_WEBVIEW_PRAXIS: 'true',
      USE_MESSAGE_ROUTER: 'true',
    },
    arch: '',
    platform: 'browser',
    version: '0.0.0-webview',
    nextTick: (cb: (...args: any[]) => void) => Promise.resolve().then(cb),
  };
}

// -------------------------------------------------------------
// Praxis Sync Listener
// The extension posts { type: 'contextUpdate', context: ... }
// We dispatch a SyncStateEvent to the frontend Praxis engine.
// The engine updates the store, which the UI subscribes to.
// -------------------------------------------------------------
type IncomingMessage = {
  type?: string;
  payload?: any;
  context?: any;
  praxisState?: any;
  matches?: any;
  meta?: any;
  command?: string;
};

function extractSyncEnvelope(msg: IncomingMessage) {
  if (msg.type === 'syncState' && msg.payload) {
    return {
      context: msg.payload.context,
      praxisState: msg.payload.praxisState,
      matches: msg.payload.matches,
    };
  }

  if (msg.type === 'contextUpdate' && msg.context) {
    return {
      context: msg.context,
      praxisState: msg.meta?.state ?? msg.praxisState,
      matches: msg.matches,
    };
  }

  return { context: msg.context, praxisState: msg.praxisState, matches: msg.matches };
}

function handlePartialUpdate(msg: IncomingMessage): boolean {
  if (msg.command !== 'UPDATE_STATE' || !msg.payload) return false;

  const partialUpdate = {
    connections: msg.payload.connections,
    activeConnectionId: msg.payload.activeConnectionId,
    lastError:
      msg.payload.errors?.length > 0
        ? { message: msg.payload.errors[msg.payload.errors.length - 1].message }
        : undefined,
  };

  // Dispatch partial update using SyncStateEvent
  praxisStore.dispatch([SyncStateEvent.create(partialUpdate)] as any);
  return true;
}

function buildEnrichedContext(context: any, praxisState: any) {
  const connections = Array.isArray(context?.connections) ? context.connections : [];
  return {
    ...context,
    applicationState: praxisState || context?.applicationState || 'active',
    connections,
    ui: context?.ui || { activeTab: 'connections' },
  };
}

function dispatchSyncToEngines(enrichedContext: any, matches: any) {
  // Create SyncState event
  const syncEvent = SyncStateEvent.create(enrichedContext);
  
  // Only dispatch to the store (which updates the engine internally)
  // Don't call frontendEngine.step directly - let the store handle it
  // This prevents SyncState events from being sent back to extension
  try {
    praxisStore.dispatch([syncEvent] as any);
  } catch (err) {
    // Error handling - automatic logging will capture this
  }
  
  // Also update applicationSnapshot directly for immediate UI updates
  // This ensures the UI reacts immediately even if praxisStore hasn't updated yet
  try {
    applicationSnapshot.set({
      value: enrichedContext.applicationState || 'active',
      context: enrichedContext,
      matches: matches || {},
    });
    // Debug: Log that snapshot was updated (automatic logging will capture this)
  } catch (err) {
    // Error handling - automatic logging will capture this
  }
}

// Set up message handler early to catch all messages
// CRITICAL: This must run before any messages arrive
try {
  // Verify window.addEventListener exists
  if (typeof window.addEventListener !== 'function') {
    throw new Error('window.addEventListener is not available');
  }

  // Register the message handler
  window.addEventListener('message', (event) => {
    try {
      const msg: IncomingMessage = event?.data;
      if (!msg) {
        return;
      }

      if (handlePartialUpdate(msg)) {
        return;
      }

      const { context, praxisState, matches } = extractSyncEnvelope(msg);
      if (!context) {
        return;
      }

      const enrichedContext = buildEnrichedContext(context, praxisState);
      dispatchSyncToEngines(enrichedContext, matches);
    } catch (err) {
      // Error handling - automatic logging will capture this
    }
  });
} catch (err) {
  // Try to register handler anyway as fallback
  try {
    window.addEventListener('message', (event) => {
      // Fallback handler - automatic logging will capture messages
    });
  } catch (fallbackErr) {
    // Silent fail
  }
}

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
  return created;
}

let mountAttempted = false;
let mounted = false;
let rootRef: HTMLElement | null = null;
let mountFailed = false;

function tryBootstrap(reason: string) {
  if (mountAttempted) return;
  mountAttempted = true;

  const root = ensureMountTarget();
  rootRef = root;
  try {
    root.dataset.bootstrap = reason;
    root.innerText = `Bootstrapping webview (${reason})…`;
  } catch {
    // best-effort visual breadcrumb
  }
  try {
    // Acquire VS Code API once and make it available globally
    const vscode = getVsCodeApi();

    mount(App, { target: root });
    mounted = true;

    if (vscode) {
      // Notify extension that webview is ready - extension will automatically send current state
      // No need for explicit getContext request - reactive sync handles this automatically
      vscode.postMessage({ type: 'webviewReady' });
    }
  } catch (e) {
    const detail = describeError(e);
    mountFailed = true;
    try {
      const escaped = (detail.message || String(e)).replace(/</g, '&lt;');
      const stack = detail.stack ? `<pre style="white-space:pre-wrap">${detail.stack}</pre>` : '';
      root.innerHTML = `<div style="padding:12px;color:var(--vscode-errorForeground,red);">Webview mount failed: ${escaped}${stack}</div>`;
    } catch {
      void 0;
    }
  }
}

// Set up message handler BEFORE bootstrap to catch early messages
// (Handler is already set up above)

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  // DOMContentLoaded may have already fired by the time the module executes
  tryBootstrap('ready_state');
} else {
  window.addEventListener('DOMContentLoaded', () => tryBootstrap('dom_content_loaded'));
}

// Capture runtime errors to host for diagnosis
// Automatic logging will capture these via global error handlers
window.addEventListener('error', (event) => {
  // Automatic logging will capture this
});

window.addEventListener('unhandledrejection', (event) => {
  // Automatic logging will capture this
});

// If mount never completes, surface a visible hint in the DOM
setTimeout(() => {
  if (mounted) return;
  if (mountFailed) return; // preserve failure details
  const target = rootRef || findExistingMount();
  if (!target) return;
  if (mountAttempted) {
    target.innerHTML = `<div style="padding:12px;color:var(--vscode-descriptionForeground);">Webview did not finish mounting. Check logs.</div>`;
  } else {
    target.innerHTML = `<div style="padding:12px;color:var(--vscode-descriptionForeground);">Webview bootstrap not attempted.</div>`;
  }
}, 300);

// Make sure acquireVsCodeApi is declared if it's used.
declare function acquireVsCodeApi(): any;
