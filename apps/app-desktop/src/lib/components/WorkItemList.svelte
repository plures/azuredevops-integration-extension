<!--
Module: apps/app-desktop/src/lib/components/WorkItemList.svelte
List view for work items
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  
  let { context, sendEvent }: { context: any; sendEvent: (event: any) => void } = $props();
  
  let workItems = $state<any[]>([]);
  let isLoading = $state(false);
  let errorMessage = $state('');
  let selectedWorkItemId = $state<number | null>(null);
  
  onMount(async () => {
    await loadWorkItems();
  });
  
  async function loadWorkItems() {
    isLoading = true;
    errorMessage = '';
    
    try {
      // In full implementation, this will call Azure DevOps API via platform adapter
      const items = await invoke('get_work_items');
      workItems = Array.isArray(items) ? items : [];
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[WorkItemList] Load error:', error);
    } finally {
      isLoading = false;
    }
  }
  
  function handleRefresh() {
    loadWorkItems();
  }
  
  function handleWorkItemClick(workItem: any) {
    selectedWorkItemId = workItem.id;
    sendEvent({ type: 'WORK_ITEM_SELECTED', workItemId: workItem.id });
  }
  
  function getStateColor(state: string): string {
    const lowerState = state?.toLowerCase() || '';
    if (lowerState === 'new') return '#0078d4';
    if (lowerState === 'active' || lowerState === 'in progress') return '#28a745';
    if (lowerState === 'resolved' || lowerState === 'done') return '#6c757d';
    if (lowerState === 'closed') return '#6c757d';
    return '#888';
  }
</script>

<div class="work-item-list">
  <div class="list-header">
    <h3>Work Items</h3>
    <button onclick={handleRefresh} disabled={isLoading} title="Refresh">
      {#if isLoading}
        <span class="spinner-small"></span>
      {:else}
        ↻
      {/if}
    </button>
  </div>
  
  {#if errorMessage}
    <div class="error-message" role="alert">
      {errorMessage}
    </div>
  {/if}
  
  {#if isLoading && workItems.length === 0}
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Loading work items...</p>
    </div>
  {:else if workItems.length === 0}
    <div class="empty-state">
      <p>No work items found</p>
      <p class="help-text">
        Configure your connection in Settings to see work items
      </p>
    </div>
  {:else}
    <div class="work-item-grid">
      {#each workItems as workItem (workItem.id)}
        <div
          class="work-item-card"
          class:selected={workItem.id === selectedWorkItemId}
          onclick={() => handleWorkItemClick(workItem)}
          role="button"
          tabindex="0"
        >
          <div class="work-item-header">
            <span class="work-item-id">#{workItem.id}</span>
            <span
              class="work-item-state"
              style="color: {getStateColor(workItem.state)}"
            >
              {workItem.state}
            </span>
          </div>
          <div class="work-item-title">{workItem.title}</div>
          <div class="work-item-meta">
            <span class="work-item-type">{workItem.type}</span>
            {#if workItem.assignedTo}
              <span class="work-item-assigned">@{workItem.assignedTo}</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .work-item-list {
    margin-top: 1rem;
  }
  
  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .list-header h3 {
    margin: 0;
    font-size: 1.25rem;
  }
  
  .list-header button {
    background: transparent;
    border: 1px solid #ccc;
    color: #0078d4;
    padding: 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1.25rem;
    line-height: 1;
    min-width: 36px;
    min-height: 36px;
  }
  
  @media (prefers-color-scheme: dark) {
    .list-header button {
      border-color: #555;
      color: #4da6ff;
    }
  }
  
  .list-header button:hover:not(:disabled) {
    background: rgba(0, 120, 212, 0.1);
  }
  
  .list-header button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .spinner-small {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(0, 120, 212, 0.2);
    border-top-color: #0078d4;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .loading-state {
    text-align: center;
    padding: 3rem 1rem;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    margin: 0 auto 1rem;
    border: 4px solid rgba(0, 120, 212, 0.1);
    border-top-color: #0078d4;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  .empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: #666;
  }
  
  @media (prefers-color-scheme: dark) {
    .empty-state {
      color: #aaa;
    }
  }
  
  .help-text {
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }
  
  .error-message {
    padding: 0.75rem;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 4px;
    color: #856404;
    margin-bottom: 1rem;
  }
  
  @media (prefers-color-scheme: dark) {
    .error-message {
      background: #4a3c00;
      border-color: #8a6d00;
      color: #ffd700;
    }
  }
  
  .work-item-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
  
  .work-item-card {
    padding: 1rem;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  @media (prefers-color-scheme: dark) {
    .work-item-card {
      background: #2d2d2d;
      border-color: #555;
    }
  }
  
  .work-item-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
  
  .work-item-card.selected {
    border-color: #0078d4;
    box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
  }
  
  .work-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .work-item-id {
    font-weight: 600;
    color: #0078d4;
  }
  
  .work-item-state {
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .work-item-title {
    font-size: 1rem;
    margin-bottom: 0.5rem;
    line-height: 1.4;
  }
  
  .work-item-meta {
    display: flex;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #666;
  }
  
  @media (prefers-color-scheme: dark) {
    .work-item-meta {
      color: #aaa;
    }
  }
  
  .work-item-type {
    padding: 0.25rem 0.5rem;
    background: #f3f3f3;
    border-radius: 3px;
  }
  
  @media (prefers-color-scheme: dark) {
    .work-item-type {
      background: #3a3a3a;
    }
  }
</style>
