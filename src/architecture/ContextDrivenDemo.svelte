<!--
  Context-Driven Architecture - Demo Component
  
  This component demonstrates how simple the UI becomes when using
  context-driven architecture with reactive stores.
  
  Key principles:
  1. Component only displays data from stores
  2. User interactions trigger context actions
  3. No direct communication with actors or complex state management
  4. Tab switching is just changing which data to display
-->

<script>
  import {
    connections,
    activeTab,
    activeConnection,
    activeWorkItems,
    timerState,
    isActiveConnectionLoading,
    createTabStore,
    contextActions,
  } from '../architecture/ReactiveStores';

  // Tab-specific stores are created dynamically
  $: tabStores = $connections.reduce((stores, conn) => {
    stores[conn.id] = createTabStore(conn.id);
    return stores;
  }, {});

  // Display data for the active tab
  $: currentTabData = tabStores[$activeTab];
  $: displayWorkItems = currentTabData ? currentTabData.workItems : activeWorkItems;
  $: displayLoading = currentTabData ? currentTabData.isLoading : isActiveConnectionLoading;

  // Event handlers - just call context actions
  const handleTabClick = (connectionId) => {
    contextActions.setActiveTab(connectionId);
  };

  const handleStartTimer = (workItemId) => {
    contextActions.startTimer(workItemId);
  };

  const handleStopTimer = () => {
    contextActions.stopTimer();
  };

  const handleRefresh = () => {
    if ($activeConnection) {
      contextActions.refreshConnection($activeConnection.id);
    }
  };

  const handleToggleView = () => {
    contextActions.toggleKanbanView();
  };
</script>

<!-- Connection Tabs -->
{#if $connections.length > 1}
  <div class="connection-tabs">
    {#each $connections as connection}
      <button
        class="tab"
        class:active={connection.id === $activeTab}
        on:click={() => handleTabClick(connection.id)}
      >
        {connection.label}

        <!-- Show work item count for this tab -->
        {#if tabStores[connection.id]}
          <span class="count">
            {$tabStores[connection.id].workItems.length}
          </span>
        {/if}

        <!-- Show loading indicator -->
        {#if tabStores[connection.id] && $tabStores[connection.id].isLoading}
          <span class="loading">⟳</span>
        {/if}
      </button>
    {/each}
  </div>
{/if}

<!-- Main Content -->
<div class="main-content">
  <!-- Header with actions -->
  <div class="header">
    <h2>Work Items</h2>

    {#if $activeConnection}
      <span class="connection-info">
        {$activeConnection.organization} / {$activeConnection.project}
      </span>
    {/if}

    <div class="actions">
      <button on:click={handleRefresh}> Refresh </button>
      <button on:click={handleToggleView}> Toggle View </button>
    </div>
  </div>

  <!-- Timer Info -->
  {#if $timerState.isActive}
    <div class="timer-info">
      <span class="timer-status">
        Timer: {$timerState.isRunning ? 'Running' : 'Paused'}
      </span>
      <span class="elapsed">
        {Math.floor($timerState.elapsed / 60000)}:{String(
          Math.floor(($timerState.elapsed % 60000) / 1000)
        ).padStart(2, '0')}
      </span>
      <button on:click={handleStopTimer}>Stop</button>
    </div>
  {/if}

  <!-- Work Items Display -->
  {#if $displayLoading}
    <div class="loading-state">
      <span class="spinner">⟳</span>
      Loading work items...
    </div>
  {:else if $displayWorkItems.length > 0}
    <div class="work-items">
      {#each $displayWorkItems as item}
        <div class="work-item" class:timer-active={$timerState.workItemId === item.id}>
          <div class="item-header">
            <span class="item-id">#{item.id}</span>
            <span class="item-type">{item.type}</span>
            <span class="item-state">{item.state}</span>
          </div>

          <div class="item-title">{item.title}</div>

          {#if item.assignedTo}
            <div class="item-assignee">👤 {item.assignedTo}</div>
          {/if}

          <div class="item-actions">
            {#if $timerState.isActive && $timerState.workItemId === item.id}
              <button on:click={handleStopTimer}>Stop Timer</button>
            {:else}
              <button on:click={() => handleStartTimer(item.id)} disabled={$timerState.isActive}>
                Start Timer
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty-state">
      <p>No work items found</p>
      <button on:click={handleRefresh}>Refresh</button>
    </div>
  {/if}
</div>

<style>
  .connection-tabs {
    display: flex;
    border-bottom: 1px solid #ddd;
    background: #f5f5f5;
  }

  .tab {
    padding: 8px 16px;
    border: none;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: background-color 0.2s;
  }

  .tab:hover {
    background: #e5e5e5;
  }

  .tab.active {
    background: white;
    border-bottom: 2px solid #007acc;
  }

  .count {
    background: #007acc;
    color: white;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: bold;
  }

  .loading {
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

  .main-content {
    padding: 16px;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #eee;
  }

  .connection-info {
    color: #666;
    font-size: 14px;
  }

  .actions {
    margin-left: auto;
    display: flex;
    gap: 8px;
  }

  .timer-info {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    padding: 8px 12px;
    border-radius: 4px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .timer-status {
    font-weight: bold;
  }

  .elapsed {
    font-family: monospace;
    font-size: 16px;
  }

  .loading-state {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 20px;
    justify-content: center;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  .work-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .work-item {
    border: 1px solid #ddd;
    border-radius: 4px;
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

  .empty-state {
    text-align: center;
    padding: 40px;
    color: #666;
  }

  button {
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 3px;
    background: white;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
  }

  button:hover:not(:disabled) {
    background: #f0f0f0;
    border-color: #007acc;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
