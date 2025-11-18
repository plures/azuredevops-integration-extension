<!--
Module: apps/app-desktop/src/lib/components/ConnectionTabs.svelte
Tab interface for switching between multiple connections
-->
<script lang="ts">
  let { connections, activeConnectionId }: {
    connections: Array<{ id: string; label?: string }>;
    activeConnectionId: string | undefined;
  } = $props();
  
  function handleTabClick(connectionId: string) {
    const vscodeApi = (window as any).__vscodeApi;
    if (vscodeApi) {
      vscodeApi.postMessage({
        type: 'SELECT_CONNECTION',
        connectionId
      });
    }
  }
</script>

<div class="connection-tabs" role="tablist">
  {#each connections as connection (connection.id)}
    <button
      role="tab"
      class="tab"
      class:active={connection.id === activeConnectionId}
      aria-selected={connection.id === activeConnectionId}
      onclick={() => handleTabClick(connection.id)}
    >
      {connection.label || connection.id}
    </button>
  {/each}
</div>

<style>
  .connection-tabs {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 1rem;
    border-bottom: 1px solid #ccc;
  }
  
  @media (prefers-color-scheme: dark) {
    .connection-tabs {
      border-bottom-color: #555;
    }
  }
  
  .tab {
    padding: 0.5rem 1rem;
    border: none;
    background: transparent;
    color: #666;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }
  
  @media (prefers-color-scheme: dark) {
    .tab {
      color: #aaa;
    }
  }
  
  .tab:hover {
    color: #0078d4;
  }
  
  .tab.active {
    color: #0078d4;
    border-bottom-color: #0078d4;
    font-weight: 500;
  }
</style>
