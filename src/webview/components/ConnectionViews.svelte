<!--
Module: src/webview/components/ConnectionViews.svelte
Owner: webview
Reads: syncState from extension (ApplicationContext serialized)
Writes: UI-only events; selection via selection writer factory (webview-owned)
Receives: syncState, host broadcasts
Emits: fsmEvent envelopes (Router handles stamping)
Prohibitions: Do not import extension host modules; Do not define context types
Rationale: Container component for all connection-specific UI views

LLM-GUARD:
- Use selection writer factory for selection updates
- Do not route by connection here; let Router decide targets
-->
<script lang="ts">
  import ConnectionView from './ConnectionView.svelte';
  
  interface Props {
    connections: Array<{ id: string; label?: string }>;
    activeConnectionId: string | undefined;
    context: any;
    matches: Record<string, boolean>;
    sendEvent: (event: any) => void;
  }
  
  const { connections, activeConnectionId, context, matches, sendEvent }: Props = $props();
  
  // Derive per-connection data from context
  // Convert plain objects (from serialization) back to Maps for easier access
  const connectionQueries = $derived.by(() => {
    const queries = context?.connectionQueries;
    if (queries instanceof Map) return queries;
    if (queries && typeof queries === 'object') return new Map(Object.entries(queries));
    return new Map();
  });
  const connectionWorkItems = $derived.by(() => {
    const items = context?.connectionWorkItems;
    if (items instanceof Map) return items;
    if (items && typeof items === 'object') return new Map(Object.entries(items));
    return new Map();
  });
  const connectionFilters = $derived.by(() => {
    const filters = context?.connectionFilters;
    if (filters instanceof Map) return filters;
    if (filters && typeof filters === 'object') return new Map(Object.entries(filters));
    return new Map();
  });
  const connectionViewModes = $derived.by(() => {
    const modes = context?.connectionViewModes;
    if (modes instanceof Map) return modes;
    if (modes && typeof modes === 'object') return new Map(Object.entries(modes));
    return new Map();
  });
</script>

<div class="connection-views">
  {#each connections as connection (connection.id)}
    {@const isActive = connection.id === activeConnectionId}
    {@const query = connectionQueries.get(connection.id) || context?.activeQuery || 'My Activity'}
    {@const workItems = connectionWorkItems.get(connection.id) || []}
    {@const filters = connectionFilters.get(connection.id) || {}}
    {@const viewMode = connectionViewModes.get(connection.id) || context?.viewMode || 'list'}
    
    <ConnectionView
      {connection}
      {isActive}
      {query}
      {workItems}
      {filters}
      {viewMode}
      {context}
      {matches}
      {sendEvent}
    />
  {/each}
</div>

<style>
  .connection-views {
    display: flex;
    flex-direction: column;
  }
</style>

