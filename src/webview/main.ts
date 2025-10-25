import { mount } from 'svelte';
import App from './App.svelte';
import { applicationSnapshot } from './fsmSnapshotStore.js';

// This ensures that we only try to mount the Svelte app after the DOM is fully loaded.
// This is a critical step to prevent race conditions where the script runs before the
// target element (`svelte-root`) is available.

console.log('[webview] main.ts initialized');

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

  var process = (globalThis as any).process;
  console.log('[webview] process shim installed');
}

// -------------------------------------------------------------
// FSM snapshot listener - minimal bridge
// The extension posts { type: 'syncState', payload: { fsmState, context }}
// We update a Svelte store so components can react without importing
// Node-bound FSM implementations.
// -------------------------------------------------------------
window.addEventListener('message', (event) => {
  const msg = event?.data;
  console.log('[webview] Received message:', { type: msg?.type, hasPayload: !!msg?.payload });
  if (msg?.type === 'syncState' && msg?.payload) {
    console.log('[webview] Processing syncState message:', {
      fsmState: msg.payload.fsmState,
      hasContext: !!msg.payload.context,
    });
    try {
      applicationSnapshot.set({ value: msg.payload.fsmState, context: msg.payload.context });
      console.log('[webview] Successfully updated applicationSnapshot store');
    } catch (e) {
      console.error('[webview] Failed to apply FSM snapshot', e);
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
  console.log('[webview] Created missing mount element #svelte-root');
  return created;
}

window.addEventListener('DOMContentLoaded', () => {
  console.log('[webview] DOMContentLoaded: ensuring mount target');
  const root = ensureMountTarget();
  try {
    // Acquire VS Code API once and make it available globally
    let vscode: any;
    if (typeof acquireVsCodeApi === 'function') {
      vscode = acquireVsCodeApi();
      (window as any).__vscodeApi = vscode;
    }

    mount(App, { target: root });
    console.log('🟢 [webview] Svelte component mounted successfully on #' + root.id);

    if (vscode) {
      vscode.postMessage({ type: 'ready' });
    }
  } catch (e) {
    console.error('🔴 [webview] Failed to mount Svelte component:', e);
  }
});

// Make sure acquireVsCodeApi is declared if it's used.
declare function acquireVsCodeApi(): any;
