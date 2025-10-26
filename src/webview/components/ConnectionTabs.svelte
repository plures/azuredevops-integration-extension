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
  $: ordered = (connections || [])
    .slice()
    .sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id));

  // Track selected index for keyboard navigation
  $: selectedIndex = ordered.findIndex((c) => c.id === activeConnectionId);
  let tabRefs: HTMLButtonElement[] = [];

  // Svelte action to capture element refs (bind:this requires identifier)
  function tabRef(node: HTMLButtonElement, i: number) {
    tabRefs[i] = node;
    return {
      update(newIndex: number) {
        tabRefs[newIndex] = node;
      },
      destroy() {
        tabRefs[i] = undefined as any;
      },
    };
  }

  function select(id: string) {
    if (!vscode) return;
    vscode.postMessage({
      type: 'fsmEvent',
      event: { type: 'CONNECTION_SELECTED', connectionId: id },
    });
  }

  function focusIndex(i: number) {
    const target = tabRefs[i];
    if (target) {
      // Delay focus to allow Svelte selection re-render
      setTimeout(() => target.focus(), 0);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!ordered.length) return;
    const key = e.key;
    let nextIndex = selectedIndex < 0 ? 0 : selectedIndex;
    const last = ordered.length - 1;
    if (key === 'ArrowRight' || key === 'ArrowDown') {
      nextIndex = (selectedIndex + 1) % ordered.length;
    } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      nextIndex = (selectedIndex - 1 + ordered.length) % ordered.length;
    } else if (key === 'Home') {
      nextIndex = 0;
    } else if (key === 'End') {
      nextIndex = last;
    } else {
      return; // Unhandled key
    }
    e.preventDefault();
    const target = ordered[nextIndex];
    if (target) {
      select(target.id);
      focusIndex(nextIndex);
    }
  }
</script>

<div
  class="connection-tabs tab-bar"
  role="tablist"
  aria-label="Project Connections"
  aria-orientation="horizontal"
  on:keydown={handleKeydown}
>
  {#each ordered as c, i}
    <button
      role="tab"
      aria-selected={c.id === activeConnectionId}
      tabindex={c.id === activeConnectionId ? 0 : -1}
      class={c.id === activeConnectionId ? 'connection-tab tab active' : 'connection-tab tab'}
      on:click={() => select(c.id)}
      use:tabRef={i}
    >
      {c.label || c.id}
    </button>
  {/each}
</div>

<style>
  .tab-bar {
    display: flex;
    gap: 0.25rem;
    align-items: flex-end;
    padding: 0 0.25rem;
    background: var(--vscode-editorWidget-background);
    border-bottom: 1px solid var(--vscode-editorWidget-border, var(--vscode-input-border));
  }
  .tab,
  .connection-tab {
    position: relative;
    background: transparent;
    color: var(--vscode-tab-inactiveForeground, var(--vscode-foreground));
    border: none;
    padding: 0.45rem 0.75rem 0.35rem;
    font-size: 0.75rem;
    line-height: 1;
    cursor: pointer;
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    display: inline-flex;
    align-items: center;
    transition:
      color 0.15s ease,
      background 0.15s ease;
  }
  .tab:hover,
  .connection-tab:hover {
    color: var(--vscode-tab-hoverForeground, var(--vscode-foreground));
    background: var(--vscode-tab-hoverBackground, rgba(255, 255, 255, 0.05));
  }
  .tab.active,
  .connection-tab.active {
    background: var(--vscode-tab-activeBackground, var(--vscode-editor-background));
    color: var(--vscode-tab-activeForeground, var(--vscode-foreground));
  }
  .tab.active::after,
  .connection-tab.active::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2px;
    background: var(--vscode-focusBorder);
    border-radius: 1px;
  }
  .tab:focus,
  .connection-tab:focus {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: -1px;
  }
  /* Provide subtle separators between non-active tabs */
  .tab:not(.active)::before,
  .connection-tab:not(.active)::before {
    content: '';
    position: absolute;
    right: 0;
    top: 25%;
    bottom: 25%;
    width: 1px;
    background: var(--vscode-editorWidget-border, var(--vscode-input-border));
  }
  .tab:last-child::before,
  .connection-tab:last-child::before {
    display: none;
  }
</style>
