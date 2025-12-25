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

// This ensures that we only try to mount the Svelte app after the DOM is fully loaded.
// This is a critical step to prevent race conditions where the script runs before the
// target element (`svelte-root`) is available.

console.debug('[AzureDevOpsInt][webview] main.ts initialized');
postWebviewLog('script_start', {
  hasAcquireVsCodeApi: typeof acquireVsCodeApi === 'function',
  timestamp: Date.now(),
  readyState: document.readyState,
});

// Early lifecycle breadcrumbs to detect where execution stops
try {
  postWebviewLog('after_imports', { readyState: document.readyState });
  Promise.resolve().then(() => postWebviewLog('microtask', { readyState: document.readyState }));
  setTimeout(() => postWebviewLog('tick0', { readyState: document.readyState }), 0);
  postWebviewLog('after_breadcrumbs', { readyState: document.readyState });
} catch (err) {
  postWebviewLog('early_error', { message: (err as any)?.message ?? String(err) });
}

// Heartbeat: confirm module stays alive even if DOM events are missed
setTimeout(() => {
  postWebviewLog('heartbeat', { readyState: document.readyState });
  if (!mountAttempted) {
    tryBootstrap('timeout_heartbeat');
  }
}, 50);

// Continuous pulse to verify event loop and messaging stay alive
setInterval(() => {
  postWebviewLog('pulse', { readyState: document.readyState, attempted: mountAttempted });
  try {
    if (mountFailed) return;
    const target = rootRef || findExistingMount();
    if (target && !mounted) {
      target.innerText = `Waiting… attempted=${mountAttempted} mounted=${mounted}`;
    }
  } catch {
    // best-effort visual breadcrumb
  }
}, 500);

// Host log helper for diagnostics
let __vscodeApi: any = undefined;
function getVsCodeApi(): any | undefined {
  if (__vscodeApi) return __vscodeApi;
  try {
    if (typeof acquireVsCodeApi === 'function') {
      __vscodeApi = acquireVsCodeApi();
      (window as any).__vscodeApi = __vscodeApi;
      return __vscodeApi;
    }
  } catch {
    // best-effort; fallback to undefined
  }
  return __vscodeApi;
}

function postWebviewLog(message: string, meta?: Record<string, unknown>) {
  try {
    const vscode = getVsCodeApi();
    if (vscode) {
      __vscodeApi = vscode;
      vscode.postMessage({ type: 'webviewLog', message, meta });
    }
  } catch {
    // best-effort
  }
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
  // Ensure identifier binding in module scope

  console.debug('[AzureDevOpsInt][webview] process shim installed');
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

function logIncoming(msg: IncomingMessage | undefined) {
  console.debug('[AzureDevOpsInt][webview] Received message:', {
    type: msg?.type,
    hasContext: !!msg?.context,
    hasPayload: !!msg?.payload,
  });
  postWebviewLog('message', {
    type: msg?.type,
    hasContext: !!msg?.context,
    hasPayload: !!msg?.payload,
  });
}

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

  console.debug('[webview] Received UPDATE_STATE', msg.payload);
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
  frontendEngine.step([SyncStateEvent.create(enrichedContext)]);
  praxisStore.dispatch([SyncStateEvent.create(enrichedContext)] as any);
  applicationSnapshot.set({
    value: enrichedContext.applicationState,
    context: enrichedContext,
    matches: matches || {},
  });
}

window.addEventListener('message', (event) => {
  try {
    const msg: IncomingMessage = event?.data;
    logIncoming(msg);

    if (handlePartialUpdate(msg)) return;

    const { context, praxisState, matches } = extractSyncEnvelope(msg);
    if (!context) return;

    const connectionsLen = Array.isArray(context.connections) ? context.connections.length : 0;
    console.debug('[webview] Dispatching SyncState to engines', {
      hasConnections: connectionsLen > 0,
      connectionsLen,
      appState: praxisState,
    });

    const enrichedContext = buildEnrichedContext(context, praxisState);

    console.debug('[webview] Enriched context summary', {
      connectionsLen: enrichedContext.connections.length,
      activeConnectionId: enrichedContext.activeConnectionId,
      appState: enrichedContext.applicationState,
    });

    dispatchSyncToEngines(enrichedContext, matches);
  } catch (err) {
    console.debug('[AzureDevOpsInt][webview] message handler error', err);
    postWebviewLog('message_handler_error', { error: (err as any)?.message ?? String(err) });
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

let mountAttempted = false;
let mounted = false;
let rootRef: HTMLElement | null = null;
let mountFailed = false;

function tryBootstrap(reason: string) {
  if (mountAttempted) return;
  mountAttempted = true;
  postWebviewLog('bootstrap', { reason, readyState: document.readyState });

  console.debug('[AzureDevOpsInt][webview] bootstrapMount: ensuring mount target');
  postWebviewLog('dom_ready', { timestamp: Date.now(), readyState: document.readyState });
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

    postWebviewLog('mount_invoking', { target: root.id });
    mount(App, { target: root });
    console.debug(
      '🟢 [AzureDevOpsInt][webview] Svelte component mounted successfully on #' + root.id
    );
    postWebviewLog('mounted', { target: root.id });
    mounted = true;

    if (vscode) {
      vscode.postMessage({ type: 'webviewReady' });
      // Fallback: explicitly request latest context in case initial syncState was missed
      vscode.postMessage({ type: 'getContext' });
    }
  } catch (e) {
    const detail = describeError(e);
    mountFailed = true;
    console.debug('🔴 [AzureDevOpsInt][webview] Failed to mount Svelte component:', detail);
    postWebviewLog('mount_failed', detail as any);
    try {
      const escaped = (detail.message || String(e)).replace(/</g, '&lt;');
      const stack = detail.stack ? `<pre style="white-space:pre-wrap">${detail.stack}</pre>` : '';
      root.innerHTML = `<div style="padding:12px;color:var(--vscode-errorForeground,red);">Webview mount failed: ${escaped}${stack}</div>`;
    } catch {
      void 0;
    }
  }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  // DOMContentLoaded may have already fired by the time the module executes
  tryBootstrap('ready_state');
} else {
  window.addEventListener('DOMContentLoaded', () => tryBootstrap('dom_content_loaded'));
}

// Capture runtime errors to host for diagnosis
window.addEventListener('error', (event) => {
  postWebviewLog('error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  postWebviewLog('unhandledrejection', { reason: (event as any)?.reason });
});

// Catch any synchronous fatal errors after module load
try {
  // no-op; serves to keep try/catch near end of module in case of future additions
  void 0;
} catch (err) {
  postWebviewLog('fatal_sync_error', { message: (err as any)?.message ?? String(err) });
}

// If mount never completes, surface a visible hint in the DOM
setTimeout(() => {
  if (mounted) return;
  if (mountFailed) return; // preserve failure details
  const target = rootRef || findExistingMount();
  if (!target) return;
  if (mountAttempted) {
    target.innerHTML = `<div style="padding:12px;color:var(--vscode-descriptionForeground);">Webview did not finish mounting. Check logs for mount_failed/pulse.</div>`;
  } else {
    target.innerHTML = `<div style="padding:12px;color:var(--vscode-descriptionForeground);">Webview bootstrap not attempted.</div>`;
  }
}, 300);

// Make sure acquireVsCodeApi is declared if it's used.
declare function acquireVsCodeApi(): any;
