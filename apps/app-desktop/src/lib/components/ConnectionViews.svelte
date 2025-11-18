<!--
Module: apps/app-desktop/src/lib/components/ConnectionViews.svelte
Container for connection-specific views
-->
<script lang="ts">
  import WorkItemList from './WorkItemList.svelte';
  
  let { connections, activeConnectionId, context, sendEvent }: {
    connections: Array<{ id: string; label?: string }>;
    activeConnectionId: string | undefined;
    context: any;
    matches: any;
    sendEvent: (event: any) => void;
  } = $props();
</script>

<div class="connection-views">
  {#if activeConnectionId}
    <WorkItemList {context} {sendEvent} />
  {:else}
    <div class="no-connection">
      <p>No active connection selected</p>
    </div>
  {/if}
</div>

<style>
  .connection-views {
    padding: 1rem 0;
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
