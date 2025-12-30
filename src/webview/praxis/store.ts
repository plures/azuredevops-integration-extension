/**
 * Frontend Praxis Store
 *
 * Wraps the frontend engine in a Svelte store with history/undo-redo support.
 * 
 * Uses Praxis v1.2.0 features:
 * - createPraxisStore for reactive subscriptions
 * - History tracking for undo/redo (via createHistoryEngine)
 * 
 * IMPORTANT: The history engine tracks state snapshots, but undo/redo needs to
 * actually restore the engine state. We implement this by restoring the context
 * from history entries using engine.updateContext().
 */

import { createPraxisStore, createHistoryEngine } from '@plures/praxis/svelte';
import { frontendEngine } from './frontendEngine.js';
import type { PraxisEvent } from '@plures/praxis';
import type { ApplicationEngineContext } from '../../praxis/application/engine.js';

// Create history-enabled engine wrapper for undo/redo support
// This tracks state snapshots for time-travel debugging
const historyEngine = createHistoryEngine(frontendEngine, {
  maxHistorySize: 50, // Keep last 50 state snapshots
});

// Create the main store using the history engine's engine (they're the same)
// Use historyEngine.dispatch to ensure events are tracked in history
const rawStore = createPraxisStore(historyEngine.engine);

// Wrap dispatch to forward to VS Code and track history
// Use historyEngine.dispatch which handles both step() and history tracking
const dispatchWithSync = (events: PraxisEvent[], label?: string) => {
  // 1. Dispatch through history engine (handles both step and history tracking)
  historyEngine.dispatch(events, label);
  
  // Update history index (history grows, so we're always at the end after dispatch)
  const historyEntries = historyEngine.getHistory();
  currentHistoryIndex = historyEntries.length - 1;
  
  // Notify test recorder if recording
  if (typeof (window as any).__historyTestRecorder !== 'undefined') {
    const recorder = (window as any).__historyTestRecorder;
    if (recorder && typeof recorder.recordEvent === 'function') {
      for (const event of events) {
        recorder.recordEvent(event, label);
      }
    }
  }

  // Note: rawStore.dispatch is not needed here because historyEngine.dispatch
  // already calls engine.step(), and rawStore subscribes to the same engine

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

// Track current history index for undo/redo
let currentHistoryIndex = 0;

// Initialize history index
const initHistory = () => {
  const historyEntries = historyEngine.getHistory();
  if (historyEntries.length > 0) {
    currentHistoryIndex = historyEntries.length - 1;
  }
};
initHistory();

// Export history/undo-redo functionality with actual state restoration
// IMPORTANT: createHistoryEngine's undo/redo only navigates history but doesn't restore state.
// We need to manually restore the engine context from history entries using updateContext.
export const history = {
  undo: () => {
    if (!historyEngine.canUndo()) {
      console.debug('[History] Cannot undo - no history available');
      return false;
    }
    
    const historyEntries = historyEngine.getHistory();
    if (currentHistoryIndex > 0) {
      currentHistoryIndex--;
      const entry = historyEntries[currentHistoryIndex];
      
      if (entry && entry.state && entry.state.context) {
        // Restore the context from the history entry
        // Check if engine supports updateContext (ReactiveLogicEngine does)
        if (typeof (frontendEngine as any).updateContext === 'function') {
          (frontendEngine as any).updateContext(entry.state.context as ApplicationEngineContext);
          console.debug('[History] Undo: Restored state from history entry', { 
            index: currentHistoryIndex,
            state: entry.state.state,
          });
          return true;
        } else {
          console.warn('[History] Engine does not support updateContext - cannot restore state');
        }
      }
    }
    return false;
  },
  redo: () => {
    if (!historyEngine.canRedo()) {
      console.debug('[History] Cannot redo - at end of history');
      return false;
    }
    
    const historyEntries = historyEngine.getHistory();
    if (currentHistoryIndex < historyEntries.length - 1) {
      currentHistoryIndex++;
      const entry = historyEntries[currentHistoryIndex];
      
      if (entry && entry.state && entry.state.context) {
        // Restore the context from the history entry
        if (typeof (frontendEngine as any).updateContext === 'function') {
          (frontendEngine as any).updateContext(entry.state.context as ApplicationEngineContext);
          console.debug('[History] Redo: Restored state from history entry', { 
            index: currentHistoryIndex,
            state: entry.state.state,
          });
          return true;
        } else {
          console.warn('[History] Engine does not support updateContext - cannot restore state');
        }
      }
    }
    return false;
  },
  canUndo: () => currentHistoryIndex > 0,
  canRedo: () => {
    const historyEntries = historyEngine.getHistory();
    return currentHistoryIndex < historyEntries.length - 1;
  },
  getHistory: () => historyEngine.getHistory(),
  goToHistory: (index: number) => {
    const historyEntries = historyEngine.getHistory();
    if (index >= 0 && index < historyEntries.length) {
      const entry = historyEntries[index];
      if (entry && entry.state && entry.state.context) {
        currentHistoryIndex = index;
        if (typeof (frontendEngine as any).updateContext === 'function') {
          (frontendEngine as any).updateContext(entry.state.context as ApplicationEngineContext);
          console.debug('[History] Go to history entry', { index });
          return true;
        }
      }
    }
    return false;
  },
  clearHistory: () => {
    historyEngine.clearHistory();
    currentHistoryIndex = 0;
    initHistory();
  },
};
