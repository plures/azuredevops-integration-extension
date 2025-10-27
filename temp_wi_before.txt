<script lang="ts">
  export let context: any;
  export let sendEvent: (event: any) => void;
  
  $: workItems = context?.pendingWorkItems?.workItems || [];
  $: activeConnectionId = context?.activeConnectionId;
  $: connections = context?.connections || [];
  
  function handleRefresh() {
    sendEvent({ type: 'REFRESH_DATA' });
  }
  
  function handleManageConnections() {
    sendEvent({ type: 'MANAGE_CONNECTIONS' });
  }
  
  function handleSelectWorkItem(workItem: any) {
    // Future: send work item selection event
    console.log('[WorkItemList] Selected:', workItem);
  }
</script>

<div class="work-item-list">
  <div class="header">
    <h2>Work Items</h2>
    <div class="actions">
      <button on:click={handleRefresh}>Refresh</button>
      <button on:click={handleManageConnections}>Manage Connections</button>
    </div>
  </div>
  
  {#if !activeConnectionId}
    <div class="info">
      <p>No active connection selected.</p>
      <button on:click={handleManageConnections}>Set up connection</button>
    </div>
  {:else if workItems.length === 0}
    <div class="info">
      <p>No work items loaded. Click Refresh to load work items.</p>
    </div>
  {:else}
    <div class="items">
      {#each workItems as item (item.id)}
        <div class="work-item" on:click={() => handleSelectWorkItem(item)} on:keydown>
          <div class="work-item-id">#{item.id}</div>
          <div class="work-item-title">{item.fields?.['System.Title'] || 'Untitled'}</div>
          <div class="work-item-type">{item.fields?.['System.WorkItemType'] || 'Unknown'}</div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .work-item-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--vscode-panel-border);
  }
  
  h2 {
    margin: 0;
    font-size: 1.2rem;
  }
  
  .actions {
    display: flex;
    gap: 0.5rem;
  }
  
  button {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    padding: 0.4rem 0.8rem;
    cursor: pointer;
    font-size: 0.9rem;
  }
  
  button:hover {
    background: var(--vscode-button-hoverBackground);
  }
  
  .info {
    padding: 2rem;
    text-align: center;
    color: var(--vscode-descriptionForeground);
  }
  
  .items {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .work-item {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 1rem;
    padding: 0.8rem;
    background: var(--vscode-list-inactiveSelectionBackground);
    border: 1px solid var(--vscode-panel-border);
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .work-item:hover {
    background: var(--vscode-list-hoverBackground);
  }
  
  .work-item-id {
    font-weight: bold;
    color: var(--vscode-textLink-foreground);
  }
  
  .work-item-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .work-item-type {
    color: var(--vscode-descriptionForeground);
    font-size: 0.9rem;
  }
</style>
