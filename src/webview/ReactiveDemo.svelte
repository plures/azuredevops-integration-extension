<!--
  Demo Component: Svelte 5 Universal Reactivity with FSM
  
  This shows how to use the new .svelte.ts reactive patterns in a
  Svelte 5 component. Notice how clean and direct the reactivity is!
-->

<script lang="ts">
  import {
    // FSM reactive state
    fsm,
    actions,
    selectors,
    isActivated,
    connections,
    activeConnection,
    workItems,
    isTimerRunning,
    timerState,
    timerElapsed,
    debug,
  } from './fsm-webview.svelte.js';

  import {
    // UI reactive state
    ui,
    draft,
    uiActions,
    integrationActions,
    filteredWorkItems,
    workItemStates,
    hasConnections,
    canShowWorkItems,
    isDataLoading,
  } from './store.svelte.js';

  // Component-local reactive state using $state
  let selectedItems = $state(new Set<number>());
  let showDebugInfo = $state(false);

  // Derived state using $derived
  const hasSelectedItems = $derived(() => selectedItems.size > 0);
  const selectedCount = $derived(() => selectedItems.size);

  // Component effects using $effect
  $effect(() => {
    console.log('[DemoComponent] FSM state changed:', {
      isActivated: isActivated(),
      connectionsCount: connections().length,
      workItemsCount: workItems().length,
      isTimerRunning: isTimerRunning(),
    });
  });

  // Effect that runs when work items change
  $effect(() => {
    if (filteredWorkItems().length > 0) {
      console.log('[DemoComponent] Work items loaded:', filteredWorkItems().length);
    }
  });

  // Action handlers
  function handleSelectItem(id: number) {
    if (selectedItems.has(id)) {
      selectedItems.delete(id);
    } else {
      selectedItems.add(id);
    }
    // Note: Set mutation triggers reactivity automatically
  }

  function handleStartTimer(workItemId: number) {
    integrationActions.startTimerForWorkItem(workItemId);
  }

  function handleCreateConnection() {
    // Update draft data (reactive)
    uiActions.updateConnectionDraft({
      name: 'Demo Connection',
      url: 'https://dev.azure.com/myorg',
      project: 'MyProject',
    });

    // Show dialog
    uiActions.showConnectionDialog(true);
  }

  function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
</script>

<div class="demo-container">
  <h2>🚀 Svelte 5 Universal Reactivity Demo</h2>

  <!-- FSM Status Display -->
  <div class="status-section">
    <h3>FSM Status</h3>
    <div class="status-grid">
      <div class="status-item">
        <strong>Activated:</strong>
        <span class:active={isActivated()}>{isActivated() ? 'Yes' : 'No'}</span>
      </div>
      <div class="status-item">
        <strong>Connections:</strong>
        <span>{connections().length}</span>
      </div>
      <div class="status-item">
        <strong>Active Connection:</strong>
        <span>{activeConnection()?.name || 'None'}</span>
      </div>
      <div class="status-item">
        <strong>Work Items:</strong>
        <span>{workItems().length}</span>
      </div>
      <div class="status-item">
        <strong>Timer Running:</strong>
        <span class:active={isTimerRunning()}>{isTimerRunning() ? 'Yes' : 'No'}</span>
      </div>
      {#if isTimerRunning()}
        <div class="status-item">
          <strong>Timer Elapsed:</strong>
          <span class="timer-display">{formatTime(timerElapsed())}</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- UI State Display -->
  <div class="ui-section">
    <h3>UI State</h3>
    <div class="ui-controls">
      <label>
        Active Tab:
        <select bind:value={ui.activeTab}>
          <option value="work-items">Work Items</option>
          <option value="timer">Timer</option>
          <option value="connections">Connections</option>
        </select>
      </label>

      <label>
        Search:
        <input type="text" bind:value={ui.searchQuery} placeholder="Search work items..." />
      </label>

      <label>
        <input type="checkbox" bind:checked={ui.assignedToMe} />
        Assigned to me only
      </label>
    </div>
  </div>

  <!-- Work Items List -->
  {#if canShowWorkItems()}
    <div class="work-items-section">
      <h3>Work Items ({filteredWorkItems().length})</h3>

      {#if isDataLoading()}
        <div class="loading">Loading work items...</div>
      {:else if filteredWorkItems().length === 0}
        <div class="empty-state">
          No work items found.
          <button onclick={integrationActions.loadWorkItems}> Load Work Items </button>
        </div>
      {:else}
        <div class="work-items-grid">
          {#each filteredWorkItems() as item (item.id)}
            <div class="work-item-card" class:selected={selectedItems.has(item.id)}>
              <div class="work-item-header">
                <span class="work-item-id">#{item.id}</span>
                <span class="work-item-type">{item['System.WorkItemType']}</span>
                <span class="work-item-state">{item['System.State']}</span>
              </div>
              <div class="work-item-title">{item['System.Title']}</div>
              <div class="work-item-actions">
                <button
                  onclick={() => handleSelectItem(item.id)}
                  class:selected={selectedItems.has(item.id)}
                >
                  {selectedItems.has(item.id) ? 'Deselect' : 'Select'}
                </button>
                <button onclick={() => handleStartTimer(item.id)} disabled={isTimerRunning()}>
                  Start Timer
                </button>
              </div>
            </div>
          {/each}
        </div>

        {#if hasSelectedItems}
          <div class="selection-summary">
            Selected {selectedCount} item{selectedCount !== 1 ? 's' : ''}
          </div>
        {/if}
      {/if}
    </div>
  {:else}
    <div class="no-connections">
      <h3>No Connections</h3>
      <p>Add a connection to get started.</p>
      <button onclick={handleCreateConnection}> Add Connection </button>
    </div>
  {/if}

  <!-- Actions Section -->
  <div class="actions-section">
    <h3>Actions</h3>
    <div class="action-buttons">
      <button onclick={actions.activate} disabled={isActivated()}> Activate Extension </button>
      <button onclick={actions.webviewReady}> Mark Webview Ready </button>
      <button onclick={() => (showDebugInfo = !showDebugInfo)}> Toggle Debug Info </button>
      {#if isTimerRunning()}
        <button onclick={actions.stopTimer} class="stop-timer"> Stop Timer </button>
      {/if}
    </div>
  </div>

  <!-- Debug Section -->
  {#if showDebugInfo}
    <div class="debug-section">
      <h3>Debug Information</h3>
      <div class="debug-content">
        <h4>FSM State:</h4>
        <pre>{JSON.stringify(debug.getFullState(), null, 2)}</pre>

        <h4>UI State:</h4>
        <pre>{JSON.stringify(ui, null, 2)}</pre>

        <h4>Draft State:</h4>
        <pre>{JSON.stringify(draft, null, 2)}</pre>
      </div>
    </div>
  {/if}
</div>

<style>
  .demo-container {
    padding: 1rem;
    max-width: 1200px;
    margin: 0 auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  }

  .status-section,
  .ui-section,
  .work-items-section,
  .actions-section,
  .debug-section {
    margin-bottom: 2rem;
    padding: 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #fafafa;
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .status-item {
    padding: 0.5rem;
    background: white;
    border-radius: 4px;
    border: 1px solid #ddd;
  }

  .status-item strong {
    display: block;
    color: #666;
    font-size: 0.9em;
    margin-bottom: 0.25rem;
  }

  .status-item span.active {
    color: #22c55e;
    font-weight: bold;
  }

  .timer-display {
    font-family: 'Courier New', monospace;
    font-weight: bold;
    color: #3b82f6;
  }

  .ui-controls {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-top: 1rem;
  }

  .ui-controls label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .ui-controls input,
  .ui-controls select {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .work-items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .work-item-card {
    padding: 1rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  .work-item-card:hover {
    border-color: #3b82f6;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
  }

  .work-item-card.selected {
    border-color: #22c55e;
    background: #f0fdf4;
  }

  .work-item-header {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .work-item-id {
    font-weight: bold;
    color: #3b82f6;
  }

  .work-item-type,
  .work-item-state {
    padding: 0.125rem 0.5rem;
    background: #e5e7eb;
    border-radius: 12px;
    font-size: 0.75rem;
  }

  .work-item-title {
    font-weight: 500;
    margin-bottom: 1rem;
    line-height: 1.4;
  }

  .work-item-actions {
    display: flex;
    gap: 0.5rem;
  }

  .work-item-actions button {
    padding: 0.375rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s ease;
  }

  .work-item-actions button:hover {
    background: #f3f4f6;
  }

  .work-item-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .work-item-actions button.selected {
    background: #22c55e;
    color: white;
    border-color: #22c55e;
  }

  .selection-summary {
    margin-top: 1rem;
    padding: 0.5rem;
    background: #dbeafe;
    border-radius: 4px;
    color: #1e40af;
    font-weight: 500;
  }

  .action-buttons {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-top: 1rem;
  }

  .action-buttons button {
    padding: 0.75rem 1.5rem;
    border: 1px solid #3b82f6;
    border-radius: 6px;
    background: #3b82f6;
    color: white;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .action-buttons button:hover {
    background: #2563eb;
    border-color: #2563eb;
  }

  .action-buttons button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .action-buttons button.stop-timer {
    background: #ef4444;
    border-color: #ef4444;
  }

  .action-buttons button.stop-timer:hover {
    background: #dc2626;
    border-color: #dc2626;
  }

  .loading,
  .empty-state,
  .no-connections {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }

  .debug-content {
    max-height: 400px;
    overflow-y: auto;
  }

  .debug-content pre {
    background: #1f2937;
    color: #f9fafb;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.875rem;
    margin: 0.5rem 0;
  }

  .debug-content h4 {
    margin: 1rem 0 0.5rem 0;
    color: #374151;
  }

  .debug-content h4:first-child {
    margin-top: 0;
  }
</style>
