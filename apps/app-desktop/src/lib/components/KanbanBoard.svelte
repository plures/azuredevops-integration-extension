<!--
Module: apps/app-desktop/src/lib/components/KanbanBoard.svelte
Kanban board view for work items
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { fetchWorkItems } from '$lib/azureService';
  
  let { context, sendEvent }: { context: any; sendEvent: (event: any) => void } = $props();
  
  let workItems = $state<any[]>([]);
  let isLoading = $state(false);
  let errorMessage = $state('');
  let selectedWorkItemId = $state<number | null>(null);
  
  // Default columns for Kanban board
  const columns = [
    { id: 'new', title: 'New', states: ['New', 'To Do', 'Proposed'] },
    { id: 'active', title: 'Active', states: ['Active', 'In Progress', 'Doing'] },
    { id: 'review', title: 'Review', states: ['Review', 'Testing', 'Code Review'] },
    { id: 'resolved', title: 'Resolved', states: ['Resolved'] },
    { id: 'done', title: 'Done', states: ['Done', 'Closed', 'Completed'] },
  ];
  
  onMount(async () => {
    await loadWorkItems();
  });
  
  async function loadWorkItems() {
    isLoading = true;
    errorMessage = '';
    
    try {
      const activeConnectionId = context?.activeConnectionId;
      if (!activeConnectionId) {
        throw new Error('No active connection');
      }
      
      const connections = await invoke('get_connections');
      const activeConnection = Array.isArray(connections) 
        ? connections.find((c: any) => c.id === activeConnectionId)
        : null;
        
      if (!activeConnection) {
        throw new Error('Active connection not found');
      }
      
      const token = await invoke('get_token', { connectionId: activeConnectionId });
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const items = await fetchWorkItems(activeConnection, token as string);
      workItems = Array.isArray(items) ? items : [];
      
      console.log(`[KanbanBoard] Loaded ${workItems.length} work items`);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[KanbanBoard] Load error:', error);
      workItems = [];
    } finally {
      isLoading = false;
    }
  }
  
  function handleRefresh() {
    loadWorkItems();
  }
  
  // Helper to extract field values
  function getField(workItem: any, fieldName: string): any {
    return workItem.fields?.[fieldName] || workItem[fieldName.replace('System.', '').toLowerCase()];
  }
  
  function getWorkItemId(workItem: any): number {
    return workItem.id || workItem.fields?.['System.Id'] || 0;
  }
  
  function getWorkItemTitle(workItem: any): string {
    return getField(workItem, 'System.Title') || 'Untitled';
  }
  
  function getWorkItemState(workItem: any): string {
    return getField(workItem, 'System.State') || 'New';
  }
  
  function getWorkItemType(workItem: any): string {
    return getField(workItem, 'System.WorkItemType') || 'Unknown';
  }
  
  function getWorkItemAssignee(workItem: any): string | null {
    const assignedTo = getField(workItem, 'System.AssignedTo');
    if (!assignedTo) return null;
    
    if (typeof assignedTo === 'object' && assignedTo.displayName) {
      return assignedTo.displayName;
    }
    
    return String(assignedTo);
  }
  
  // Group work items by column
  function getItemsForColumn(column: any): any[] {
    return workItems.filter(item => {
      const state = getWorkItemState(item);
      return column.states.some((s: string) => 
        state.toLowerCase().includes(s.toLowerCase())
      );
    });
  }
  
  function handleItemClick(workItem: any) {
    const id = getWorkItemId(workItem);
    selectedWorkItemId = id;
    sendEvent({ type: 'WORK_ITEM_SELECTED', workItemId: id });
  }
  
  function getTypeColor(type: string): string {
    const t = type.toLowerCase();
    if (t.includes('bug')) return '#e81123';
    if (t.includes('task')) return '#0078d4';
    if (t.includes('story')) return '#00bcf2';
    if (t.includes('feature')) return '#8764b8';
    if (t.includes('epic')) return '#ff8c00';
    return '#666';
  }
</script>

<div class="kanban-board">
  <div class="board-header">
    <h3>Kanban Board</h3>
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
  {:else}
    <div class="board-columns">
      {#each columns as column (column.id)}
        {@const columnItems = getItemsForColumn(column)}
        <div class="board-column">
          <div class="column-header">
            <h4>{column.title}</h4>
            <span class="item-count">{columnItems.length}</span>
          </div>
          <div class="column-items">
            {#each columnItems as item (getWorkItemId(item))}
              <div
                class="kanban-card"
                class:selected={getWorkItemId(item) === selectedWorkItemId}
                onclick={() => handleItemClick(item)}
                role="button"
                tabindex="0"
                onkeydown={(e) => e.key === 'Enter' && handleItemClick(item)}
              >
                <div class="card-header">
                  <span class="card-id">#{getWorkItemId(item)}</span>
                  <span 
                    class="card-type"
                    style="background-color: {getTypeColor(getWorkItemType(item))}"
                  >
                    {getWorkItemType(item)}
                  </span>
                </div>
                <div class="card-title">{getWorkItemTitle(item)}</div>
                {#if getWorkItemAssignee(item)}
                  <div class="card-assignee">
                    <span class="assignee-avatar">{getWorkItemAssignee(item)?.charAt(0).toUpperCase()}</span>
                    <span class="assignee-name">{getWorkItemAssignee(item)}</span>
                  </div>
                {/if}
              </div>
            {/each}
            {#if columnItems.length === 0}
              <div class="empty-column">No items</div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .kanban-board {
    padding: 1rem;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .board-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .board-header h3 {
    margin: 0;
    font-size: 1.25rem;
  }
  
  .board-header button {
    background: transparent;
    border: 1px solid #ccc;
    color: #0078d4;
    padding: 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1.125rem;
    min-width: 36px;
    min-height: 36px;
  }
  
  @media (prefers-color-scheme: dark) {
    .board-header button {
      border-color: #555;
      color: #4da6ff;
    }
  }
  
  .board-header button:hover:not(:disabled) {
    background: rgba(0, 120, 212, 0.1);
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
  
  .board-columns {
    display: flex;
    gap: 1rem;
    overflow-x: auto;
    flex: 1;
    padding-bottom: 1rem;
  }
  
  .board-column {
    flex: 0 0 280px;
    display: flex;
    flex-direction: column;
    background: #f5f5f5;
    border-radius: 8px;
    padding: 0.75rem;
    min-height: 400px;
  }
  
  @media (prefers-color-scheme: dark) {
    .board-column {
      background: #2d2d2d;
    }
  }
  
  .column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #ddd;
  }
  
  @media (prefers-color-scheme: dark) {
    .column-header {
      border-bottom-color: #444;
    }
  }
  
  .column-header h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }
  
  .item-count {
    background: #0078d4;
    color: white;
    padding: 0.125rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  .column-items {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overflow-y: auto;
    flex: 1;
  }
  
  .kanban-card {
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  @media (prefers-color-scheme: dark) {
    .kanban-card {
      background: #1e1e1e;
      border-color: #444;
    }
  }
  
  .kanban-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }
  
  .kanban-card.selected {
    border-color: #0078d4;
    box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.3);
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .card-id {
    font-weight: 600;
    color: #0078d4;
    font-size: 0.75rem;
  }
  
  .card-type {
    font-size: 0.625rem;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    color: white;
    font-weight: 500;
    text-transform: uppercase;
  }
  
  .card-title {
    font-size: 0.875rem;
    line-height: 1.4;
    margin-bottom: 0.5rem;
  }
  
  .card-assignee {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: #666;
  }
  
  @media (prefers-color-scheme: dark) {
    .card-assignee {
      color: #aaa;
    }
  }
  
  .assignee-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #0078d4;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.625rem;
    font-weight: 600;
  }
  
  .assignee-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .empty-column {
    text-align: center;
    padding: 2rem 1rem;
    color: #999;
    font-size: 0.875rem;
  }
</style>
