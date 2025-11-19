<!--
Module: apps/app-desktop/src/lib/components/ConnectionViews.svelte
Container for connection-specific views with view mode switching
-->
<script lang="ts">
  import WorkItemList from './WorkItemList.svelte';
  import KanbanBoard from './KanbanBoard.svelte';
  
  let { connections, activeConnectionId, context, sendEvent }: {
    connections: Array<{ id: string; label?: string }>;
    activeConnectionId: string | undefined;
    context: any;
    matches: any;
    sendEvent: (event: any) => void;
  } = $props();
  
  // Get current view mode from context (default to 'list')
  const viewMode = $derived(context?.viewMode || 'list');
</script>

<div class="connection-views">
  {#if activeConnectionId}
    {#if viewMode === 'kanban'}
      <KanbanBoard {context} {sendEvent} />
    {:else}
      <WorkItemList {context} {sendEvent} />
    {/if}
  {:else}
    <div class="no-connection">
      <p>No active connection selected</p>
    </div>
  {/if}
</div>

<style>
  .connection-views {
    padding: 1rem 0;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  .no-connection {
    text-align: center;
    padding: 2rem;
    color: #666;
  }
  
  @media (prefers-color-scheme: dark) {
    .no-connection {
      color: #aaa;
    }
  }
</style>
