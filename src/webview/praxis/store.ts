/**
 * Frontend Praxis Store
 *
 * Wraps the frontend engine in a Svelte store.
 */

import { createPraxisStore, createContextStore } from '@plures/praxis/svelte';
import { frontendEngine } from './frontendEngine.js';
import type { PraxisEvent } from '@plures/praxis';

// Create the main store (state + context)
const rawStore = createPraxisStore(frontendEngine);

// Wrap dispatch to forward to VS Code
const dispatchWithSync = (events: PraxisEvent[]) => {
  // 1. Update local engine (optimistic or for local-only logic)
  rawStore.dispatch(events);

  // 2. Send to Extension Host
  const vscode = (window as any).__vscodeApi;
  if (vscode) {
    vscode.postMessage({ type: 'PRAXIS_EVENT', events });
  } else {
    console.debug('[store] VS Code API not available, event not sent to backend', events);
  }
};

export const praxisStore = {
  subscribe: rawStore.subscribe,
  dispatch: dispatchWithSync,
};

// Create a context-only store for easier access in components
export const contextStore = createContextStore(frontendEngine);

// Export dispatch for convenience
export const dispatch = dispatchWithSync;
