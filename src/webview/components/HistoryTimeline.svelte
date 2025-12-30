<!--
Module: src/webview/components/HistoryTimeline.svelte
Owner: webview
Purpose: Visual timeline for navigating through state history
-->

<script lang="ts">
  import { history } from '../praxis/store.js';
  import { diffStates, formatDiff, getDiffSummary } from '../../debugging/stateDiff.js';
  import type { ApplicationEngineContext } from '../../praxis/application/engine.js';
  import type { HistoryEntry } from '@plures/praxis/svelte';
  
  let historyEntries = $state(history.getHistory());
  let currentIndex = $state(historyEntries.length - 1);
  let selectedIndex = $state<number | null>(null);
  let showDiff = $state(false);
  let diffFromIndex = $state<number | null>(null);
  
  // Update history when it changes
  $effect(() => {
    const interval = setInterval(() => {
      const newEntries = history.getHistory();
      if (newEntries.length !== historyEntries.length) {
        historyEntries = newEntries;
        currentIndex = historyEntries.length - 1;
      }
    }, 100);
    
    return () => clearInterval(interval);
  });
  
  function goToSnapshot(index: number) {
    if (history.goToHistory(index)) {
      currentIndex = index;
      selectedIndex = index;
    }
  }
  
  function compareSnapshots(index1: number, index2: number) {
    const entry1 = historyEntries[index1];
    const entry2 = historyEntries[index2];
    
    if (!entry1 || !entry2) return null;
    
    const diff = diffStates(
      entry1.state.context as ApplicationEngineContext,
      entry2.state.context as ApplicationEngineContext
    );
    
    return diff;
  }
  
  function showDiffBetween(index1: number, index2: number) {
    diffFromIndex = index1;
    selectedIndex = index2;
    showDiff = true;
  }
  
  function formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString();
  }
  
  function formatEventTag(tag: string): string {
    return tag
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim();
  }
  
  const selectedDiff = $derived.by(() => {
    if (!showDiff || diffFromIndex === null || selectedIndex === null) {
      return null;
    }
    return compareSnapshots(diffFromIndex, selectedIndex);
  });
</script>

<div class="history-timeline-container">
  <div class="timeline-header">
    <h3>State History Timeline</h3>
    <div class="timeline-controls">
      <button 
        class="control-button" 
        onclick={() => history.clearHistory()}
        title="Clear history"
      >
        Clear
      </button>
      <span class="history-count">
        {historyEntries.length} snapshots
      </span>
    </div>
  </div>
  
  <div class="timeline-entries">
    {#each historyEntries as entry, index}
      <div 
        class="timeline-entry" 
        class:active={index === currentIndex}
        class:selected={index === selectedIndex}
        onclick={() => goToSnapshot(index)}
        title="Click to jump to this snapshot"
      >
        <div class="entry-index">{index}</div>
        <div class="entry-content">
          <div class="entry-state">{entry.state.state}</div>
          {#if entry.label}
            <div class="entry-label">{entry.label}</div>
          {/if}
          {#if entry.events && entry.events.length > 0}
            <div class="entry-events">
              {#each entry.events.slice(0, 2) as event}
                <span class="event-tag">{formatEventTag(event.tag)}</span>
              {/each}
              {#if entry.events.length > 2}
                <span class="event-more">+{entry.events.length - 2} more</span>
              {/if}
            </div>
          {/if}
          <div class="entry-timestamp">{formatTimestamp(entry.timestamp)}</div>
        </div>
        <div class="entry-actions">
          {#if index > 0}
            <button 
              class="action-button"
              onclick={(e) => {
                e.stopPropagation();
                showDiffBetween(index - 1, index);
              }}
              title="Compare with previous"
            >
              Diff
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>
  
  {#if showDiff && selectedDiff && diffFromIndex !== null && selectedIndex !== null}
    <div class="diff-panel">
      <div class="diff-header">
        <h4>State Diff</h4>
        <button class="close-button" onclick={() => showDiff = false}>×</button>
      </div>
      <div class="diff-content">
        <div class="diff-summary">
          {getDiffSummary(selectedDiff)}
        </div>
        <pre class="diff-text">{formatDiff(selectedDiff)}</pre>
      </div>
    </div>
  {/if}
</div>

<style>
  .history-timeline-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
  }
  
  .timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--vscode-panel-border);
  }
  
  .timeline-header h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
  }
  
  .timeline-controls {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .control-button {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: 1px solid var(--vscode-button-border);
    border-radius: 2px;
    cursor: pointer;
  }
  
  .control-button:hover {
    background: var(--vscode-button-secondaryHoverBackground);
  }
  
  .history-count {
    font-size: 0.75rem;
    color: var(--vscode-descriptionForeground);
  }
  
  .timeline-entries {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }
  
  .timeline-entry {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem;
    margin-bottom: 0.25rem;
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .timeline-entry:hover {
    background: var(--vscode-list-hoverBackground);
  }
  
  .timeline-entry.active {
    border-color: var(--vscode-focusBorder);
    background: var(--vscode-list-activeSelectionBackground);
  }
  
  .timeline-entry.selected {
    border-color: var(--vscode-button-background);
  }
  
  .entry-index {
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    min-width: 2rem;
  }
  
  .entry-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .entry-state {
    font-weight: 600;
    color: var(--vscode-foreground);
  }
  
  .entry-label {
    font-size: 0.75rem;
    color: var(--vscode-descriptionForeground);
    font-style: italic;
  }
  
  .entry-events {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }
  
  .event-tag {
    font-size: 0.7rem;
    padding: 0.125rem 0.25rem;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border-radius: 2px;
  }
  
  .event-more {
    font-size: 0.7rem;
    color: var(--vscode-descriptionForeground);
  }
  
  .entry-timestamp {
    font-size: 0.7rem;
    color: var(--vscode-descriptionForeground);
  }
  
  .entry-actions {
    display: flex;
    gap: 0.25rem;
  }
  
  .action-button {
    padding: 0.125rem 0.5rem;
    font-size: 0.7rem;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: 1px solid var(--vscode-button-border);
    border-radius: 2px;
    cursor: pointer;
  }
  
  .action-button:hover {
    background: var(--vscode-button-secondaryHoverBackground);
  }
  
  .diff-panel {
    border-top: 1px solid var(--vscode-panel-border);
    max-height: 300px;
    display: flex;
    flex-direction: column;
  }
  
  .diff-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    background: var(--vscode-editor-background);
  }
  
  .diff-header h4 {
    margin: 0;
    font-size: 0.875rem;
  }
  
  .close-button {
    background: none;
    border: none;
    color: var(--vscode-foreground);
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .diff-content {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 1rem;
  }
  
  .diff-summary {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--vscode-foreground);
  }
  
  .diff-text {
    font-family: monospace;
    font-size: 0.75rem;
    white-space: pre-wrap;
    color: var(--vscode-foreground);
    margin: 0;
  }
</style>

