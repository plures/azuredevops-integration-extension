/**
 * Frontend Praxis Store
 *
 * Wraps the frontend engine in a Svelte store.
 */

import { createPraxisStore } from '@plures/praxis/svelte';
import { frontendEngine } from './frontendEngine.js';
import type { PraxisEvent } from '@plures/praxis';

// Create the main store (state + context)
const rawStore = createPraxisStore(frontendEngine);

// Wrap dispatch to forward to VS Code
const dispatchWithSync = (events: PraxisEvent[]) => {
  // 1. Update local engine (optimistic or for local-only logic)
  rawStore.dispatch(events);

  // 2. Send to Extension Host (but NOT SyncState events - those are one-way from extension)
  const hasSyncState = events.some((e: any) => e.tag === 'SyncState');
  if (hasSyncState) {
    // SyncState events are one-way from extension to webview, don't send them back
    return;
  }

  const vscode = (window as any).__vscodeApi;
  if (vscode) {
    vscode.postMessage({ type: 'PRAXIS_EVENT', events });
  } else {
    // VS Code API not available - this is expected in some contexts
  }
};

export const praxisStore = {
  subscribe: rawStore.subscribe,
  dispatch: dispatchWithSync,
};

// Export dispatch for convenience
export const dispatch = dispatchWithSync;
