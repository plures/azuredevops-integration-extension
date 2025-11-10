<!--
Module: src/webview/components/ConnectionView.svelte
Owner: webview
Reads: syncState from extension (ApplicationContext serialized)
Writes: UI-only events; selection via selection writer factory (webview-owned)
Receives: syncState, host broadcasts
Emits: fsmEvent envelopes (Router handles stamping)
Prohibitions: Do not import extension host modules; Do not define context types
Rationale: Per-connection UI component containing all connection-specific controls and views

LLM-GUARD:
- Use selection writer factory for selection updates
- Do not route by connection here; let Router decide targets
-->
<script lang="ts">
  import WorkItemList from './WorkItemList.svelte';
  import KanbanBoard from './KanbanBoard.svelte';
  import StatusBar from './StatusBar.svelte';
  
  interface Props {
    connection: { id: string; label?: string };
    isActive: boolean;
    query: string;
    workItems: any[];
    filters: any;
    viewMode: 'list' | 'kanban';
    context: any;
    matches: Record<string, boolean>;
    sendEvent: (event: any) => void;
  }
  
  const { connection, isActive, query, workItems, filters, viewMode, context, matches, sendEvent }: Props = $props();
  
  // Local query state (synced with context)
  let localQuery = $state(query);
  
  // Sync with context when it changes
  $effect(() => {
    if (query !== localQuery) {
      localQuery = query;
    }
  });
  
  function handleQueryChange(newQuery: string) {
    localQuery = newQuery;
    sendEvent({
      type: 'SET_CONNECTION_QUERY',
      connectionId: connection.id,
      query: newQuery,
    });
  }
  
  function handleFilterChange(newFilters: any) {
    sendEvent({
      type: 'SET_CONNECTION_FILTERS',
      connectionId: connection.id,
      filters: newFilters,
    });
  }
  
  function handleViewModeToggle() {
    const nextMode = viewMode === 'list' ? 'kanban' : 'list';
    sendEvent({
      type: 'SET_CONNECTION_VIEW_MODE',
      connectionId: connection.id,
      viewMode: nextMode,
    });
  }
</script>

<div
  class="connection-view"
  class:active={isActive}
  data-connection-id={connection.id}
>
  {#if isActive}
    <div class="connection-content">
      {#if viewMode === 'kanban'}
        <KanbanBoard {context} {sendEvent} />
      {:else}
        {@const contextWithWorkItems = { ...context, pendingWorkItems: { workItems, connectionId: connection.id } }}
        <WorkItemList 
          context={contextWithWorkItems} 
          {matches}
          {sendEvent}
          query={localQuery}
          onQueryChange={handleQueryChange}
        />
      {/if}
      
      <StatusBar {context} />
    </div>
  {/if}
</div>

<style>
  .connection-view {
    display: none; /* Hidden by default */
  }
  
  .connection-view.active {
    display: block; /* Visible when active */
  }
  
  .connection-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
</style>

