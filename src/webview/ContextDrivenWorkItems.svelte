<!--
  Context-Driven Work Items Component - Updated for Svelte 5 Universal Reactivity
  
  This component demonstrates the simplicity of the new reactive approach.
  It automatically updates when FSM state changes, no complex subscriptions needed.
-->

<script>
  import {
    fsm,
    connections,
    activeConnection,
    workItems,
    timerState,
    isDataLoading,
    actions as fsmActions,
  } from './fsm-webview.svelte.js';

  import { ui, filteredWorkItems, hasConnections, integrationActions } from './store.svelte.js';

  // Simple reactive statements - that's it!
  $: hasWorkItemsToShow = filteredWorkItems().length > 0;
  $: isTimerActive = timerState()?.matches?.('running') ?? false;

  // Event handlers just call reactive actions
  function handleTabClick(connectionId) {
    integrationActions.switchToConnection(connectionId);
  }

  function handleStartTimer(workItemId) {
    integrationActions.startTimerForWorkItem(workItemId);
  }

  function handleStopTimer() {
    fsmActions.stopTimer();
  }

  function handleRefresh() {
    integrationActions.loadWorkItems();
  }
</script>

<div class="context-driven-container">
  <header class="header">
    <h1>🌟 Context-Driven Work Items</h1>
    <p class="subtitle">Simple, reactive, and it works!</p>
  </header>

  <!-- Connection Tabs -->
  {#if hasConnections()}
    <div class="connection-tabs">
      <h3>Connections ({connections().length})</h3>
      <div class="tabs">
        {#each connections() as connection}
          <button
            class="tab"
            class:active={activeConnection()?.id === connection.id}
            onclick={() => handleTabClick(connection.id)}
          >
            {connection.name}
            {#if activeConnection()?.id === connection.id}
              <span class="active-indicator">●</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {:else}
    <div class="no-connections">
      <p>No connections configured</p>
    </div>
  {/if}

  <!-- Active Connection Info -->
  {#if activeConnection()}
    <div class="active-connection-info">
      <h3>Active Connection</h3>
      <div class="connection-details">
        <span class="org">{activeConnection().url}</span> /
        <span class="project">{activeConnection().project}</span>
      </div>
    </div>
  {/if}

  <!-- Timer Status -->
  {#if isTimerActive}
    <div class="timer-status" class:running={isTimerActive}>
      <div class="timer-info">
        <span class="status">
          Timer: {isTimerActive ? 'Running' : 'Stopped'}
        </span>
        <span class="elapsed">
          {Math.floor((timerState()?.context?.elapsed || 0) / 60)}:{String(
            (timerState()?.context?.elapsed || 0) % 60
          ).padStart(2, '0')}
        </span>
        <span class="work-item">#{timerState()?.context?.workItemId || 'None'}</span>
      </div>
      <button onclick={handleStopTimer} class="stop-btn">Stop</button>
    </div>
  {/if}

  <!-- Work Items -->
  <div class="work-items-section">
    <div class="section-header">
      <h3>Work Items</h3>
      <button onclick={handleRefresh} class="refresh-btn">🔄 Refresh</button>
    </div>

    {#if isDataLoading()}
      <div class="loading">
        <span class="spinner">⟳</span>
        Loading work items...
      </div>
    {:else if hasWorkItemsToShow}
      <div class="work-items">
        {#each filteredWorkItems() as item}
          <div class="work-item" class:timer-active={timerState()?.context?.workItemId === item.id}>
            <div class="item-header">
              <span class="item-id">#{item.id}</span>
              <span class="item-type">{item['System.WorkItemType']}</span>
              <span class="item-state">{item['System.State']}</span>
            </div>

            <div class="item-title">{item['System.Title']}</div>

            {#if item['System.AssignedTo']}
              <div class="item-assignee">👤 {item['System.AssignedTo'].displayName}</div>
            {/if}

            <div class="item-actions">
              {#if isTimerActive && timerState()?.context?.workItemId === item.id}
                <button onclick={handleStopTimer} class="timer-btn active">Stop Timer</button>
              {:else}
                <button
                  onclick={() => handleStartTimer(item.id)}
                  disabled={isTimerActive}
                  class="timer-btn"
                >
                  Start Timer
                </button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="no-work-items">
        <p>No work items found</p>
        <button onclick={handleRefresh} class="refresh-btn">🔄 Refresh</button>
      </div>
    {/if}
  </div>

  <!-- Debug Info -->
  <details class="debug-section">
    <summary>🔍 Debug Info</summary>
    <div class="debug-content">
      <p><strong>Active Connection:</strong> {activeConnection()?.id || 'None'}</p>
      <p><strong>Connection Count:</strong> {connections().length}</p>
      <p><strong>Work Items Count:</strong> {workItems().length}</p>
      <p><strong>Timer Active:</strong> {$timerState.isActive}</p>
      <p><strong>Loading:</strong> {$isLoading}</p>

      <button
        onclick={() =>
          console.log('Context state:', {
            connections: connections(),
            activeConnection: activeConnection(),
            workItems: workItems(),
            timer: $timerState,
          })}
      >
        Log State to Console
      </button>
    </div>
  </details>
</div>

<style>
  .context-driven-container {
    padding: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .header {
    margin-bottom: 24px;
    text-align: center;
  }

  .header h1 {
    margin: 0;
    color: #007acc;
    font-size: 24px;
  }

  .subtitle {
    margin: 8px 0 0 0;
    color: #666;
    font-style: italic;
  }

  .connection-tabs {
    margin-bottom: 20px;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .connection-tabs h3 {
    margin: 0 0 12px 0;
    color: #333;
  }

  .tabs {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .tab {
    padding: 8px 16px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .tab:hover {
    background: #e9ecef;
    border-color: #007acc;
  }

  .tab.active {
    background: #007acc;
    color: white;
    border-color: #007acc;
  }

  .active-indicator {
    color: #90ee90;
    font-size: 12px;
  }

  .no-connections {
    padding: 20px;
    text-align: center;
    color: #666;
    background: #f8f9fa;
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .active-connection-info {
    margin-bottom: 20px;
    padding: 12px;
    background: #e8f5e8;
    border-radius: 4px;
    border-left: 4px solid #28a745;
  }

  .active-connection-info h3 {
    margin: 0 0 8px 0;
    color: #155724;
  }

  .connection-details {
    font-family: monospace;
    color: #155724;
  }

  .org,
  .project {
    font-weight: bold;
  }

  .timer-status {
    margin-bottom: 20px;
    padding: 12px;
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .timer-status.running {
    background: #d1edff;
    border-color: #b3d9ff;
  }

  .timer-info {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .elapsed {
    font-family: monospace;
    font-size: 16px;
    font-weight: bold;
  }

  .work-item-id {
    color: #666;
  }

  .stop-btn {
    padding: 4px 12px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .work-items-section {
    margin-bottom: 20px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .section-header h3 {
    margin: 0;
  }

  .refresh-btn {
    padding: 6px 12px;
    background: #007acc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .refresh-btn:hover {
    background: #005a9e;
  }

  .loading {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 20px;
    justify-content: center;
    color: #666;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .work-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .work-item {
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 12px;
    background: white;
    transition: border-color 0.2s;
  }

  .work-item:hover {
    border-color: #007acc;
  }

  .work-item.timer-active {
    border-left: 4px solid #ff9500;
    background: #fff8f0;
  }

  .item-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .item-id {
    background: #e5e5e5;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: bold;
  }

  .item-type,
  .item-state {
    background: #007acc;
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 11px;
  }

  .item-title {
    font-weight: 600;
    margin-bottom: 8px;
    line-height: 1.3;
  }

  .item-assignee {
    font-size: 12px;
    color: #666;
    margin-bottom: 8px;
  }

  .item-actions {
    display: flex;
    gap: 8px;
  }

  .timer-btn {
    padding: 4px 12px;
    border: 1px solid #007acc;
    border-radius: 3px;
    background: white;
    color: #007acc;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
  }

  .timer-btn:hover:not(:disabled) {
    background: #007acc;
    color: white;
  }

  .timer-btn.active {
    background: #dc3545;
    color: white;
    border-color: #dc3545;
  }

  .timer-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .no-work-items {
    text-align: center;
    padding: 40px;
    color: #666;
  }

  .debug-section {
    margin-top: 24px;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #dee2e6;
  }

  .debug-section summary {
    cursor: pointer;
    font-weight: bold;
    color: #495057;
  }

  .debug-content {
    margin-top: 12px;
    font-size: 14px;
  }

  .debug-content p {
    margin: 4px 0;
  }

  .debug-content button {
    margin-top: 8px;
    padding: 4px 8px;
    font-size: 12px;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
  }

  button {
    font-family: inherit;
  }

  button:hover {
    opacity: 0.9;
  }
</style>
