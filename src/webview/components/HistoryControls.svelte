<!--
Module: src/webview/components/HistoryControls.svelte
Owner: webview
Purpose: Undo/Redo controls using Praxis history engine
-->

<script lang="ts">
  import { history } from '../praxis/store.js';
  
  // Reactive state for undo/redo availability
  let canUndo = $state(history.canUndo());
  let canRedo = $state(history.canRedo());
  
  // Update availability when history changes
  $effect(() => {
    // Check availability periodically (could be improved with proper subscription)
    const interval = setInterval(() => {
      canUndo = history.canUndo();
      canRedo = history.canRedo();
    }, 100);
    
    return () => clearInterval(interval);
  });
  
  function handleUndo() {
    console.debug('[HistoryControls] Undo clicked');
    if (history.canUndo()) {
      const result = history.undo();
      console.debug('[HistoryControls] Undo result:', result);
      canUndo = history.canUndo();
      canRedo = history.canRedo();
    } else {
      console.debug('[HistoryControls] Cannot undo - no history');
    }
  }
  
  function handleRedo() {
    console.debug('[HistoryControls] Redo clicked');
    if (history.canRedo()) {
      const result = history.redo();
      console.debug('[HistoryControls] Redo result:', result);
      canUndo = history.canUndo();
      canRedo = history.canRedo();
    } else {
      console.debug('[HistoryControls] Cannot redo - at end of history');
    }
  }
</script>

<div class="history-controls">
  <button 
    class="history-button undo" 
    onclick={handleUndo}
    disabled={!canUndo}
    title="Undo last action (Ctrl+Z)"
  >
    ⟲ Undo
  </button>
  <button 
    class="history-button redo" 
    onclick={handleRedo}
    disabled={!canRedo}
    title="Redo last action (Ctrl+Shift+Z)"
  >
    ⟳ Redo
  </button>
</div>

<style>
  .history-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .history-button {
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
    border: 1px solid var(--vscode-button-border, transparent);
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    cursor: pointer;
    border-radius: 2px;
    transition: opacity 0.2s;
  }
  
  .history-button:hover:not(:disabled) {
    background: var(--vscode-button-secondaryHoverBackground);
  }
  
  .history-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>

