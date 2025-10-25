<script lang="ts">
  /**
   * ConnectionTabs.svelte
   * Progressive enhancement component: currently uses classic Svelte reactivity.
   * When upgrading to Svelte 5, replace internal reactive state with:
   *   const $props = { connections, activeConnectionId };
   *   const $state = { selected: $props.activeConnectionId };
   *   const $derived = { ordered: () => $props.connections?.slice().sort(...) };
   *   $effect(() => { if ($state.selected && $state.selected !== $props.activeConnectionId) ... });
   */
  export let connections: Array<{ id: string; label?: string }> = [];
  export let activeConnectionId: string | undefined;
  const vscode = (window as any).__vscodeApi;

  // Classic Svelte reactive declarations
  let ordered = [] as typeof connections;
  $: ordered = (connections || []).slice().sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id));

  function select(id: string) {
    if (!vscode) return;
    vscode.postMessage({ type: 'fsmEvent', event: { type: 'CONNECTION_SELECTED', connectionId: id } });
  }
</script>

<div class="connection-tabs" role="tablist" aria-label="Project Connections">
  {#each ordered as c}
    <button
      role="tab"
      aria-selected={c.id === activeConnectionId}
      class={c.id === activeConnectionId ? 'tab active' : 'tab'}
      on:click={() => select(c.id)}
    >
      {c.label || c.id}
    </button>
  {/each}
</div>

<style>
  .connection-tabs { display: flex; gap: 0.25rem; align-items: center; }
  .tab { 
    background: var(--vscode-tab-inactiveBackground, var(--vscode-button-secondaryBackground));
    color: var(--vscode-foreground);
    border: 1px solid var(--vscode-tab-border, transparent);
    padding: 0.4rem 0.6rem; font-size: 0.75rem; line-height: 1; cursor: pointer; border-radius: 4px;
  }
  .tab.active, .tab:hover { 
    background: var(--vscode-tab-activeBackground, var(--vscode-button-background));
    color: var(--vscode-button-foreground); 
  }
</style>
