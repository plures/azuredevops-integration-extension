<!--
  Module: src/webview/components/WebviewHeader.svelte
  Owner: webview
  Purpose: Custom header with action buttons using design-dojo IconButton components.
-->
<script lang="ts">
  import IconButton from '@ado-ext/ui-web/components/IconButton.svelte';

  interface Props {
    context?: any;
    sendEvent?: (event: any) => void;
  }

  const { context, sendEvent }: Props = $props();

  // Refresh button state for animation
  let isRefreshing = $state(false);

  function handleRefresh() {
    isRefreshing = true;
    sendEvent?.({ type: 'REFRESH_DATA' });
    setTimeout(() => {
      isRefreshing = false;
    }, 500);
  }

  function handleToggleKanban() {
    sendEvent?.({ type: 'TOGGLE_VIEW' });
  }

  function handleCreateWorkItem() {
    sendEvent?.({ type: 'CREATE_WORK_ITEM' });
  }

  function handleSetup() {
    sendEvent?.({ type: 'MANAGE_CONNECTIONS' });
  }

  function handleToggleDebug() {
    sendEvent?.({ type: 'TOGGLE_DEBUG_VIEW' });
  }

  // Show debug button only if debug logging is enabled
  const showDebugButton = $derived(context?.debugLoggingEnabled === true);
  const isKanban = $derived(context?.viewMode === 'kanban');
</script>

<header class="webview-header">
  <div class="header-actions">
    <IconButton
      icon="⚏"
      aria-label="Toggle Kanban View"
      title="Toggle Kanban View"
      active={isKanban}
      onclick={handleToggleKanban}
    />

    <span class:refreshing={isRefreshing} class="refresh-wrapper">
      <IconButton
        icon="↻"
        aria-label="Refresh Work Items"
        title="Refresh Work Items (R)"
        onclick={handleRefresh}
      />
    </span>

    <IconButton
      icon="＋"
      aria-label="Create Work Item"
      title="Create Work Item"
      onclick={handleCreateWorkItem}
    />

    <IconButton
      icon="⚙"
      aria-label="Setup or Manage Connections"
      title="Setup or Manage Connections"
      onclick={handleSetup}
    />

    {#if showDebugButton}
      <IconButton
        icon="🐛"
        aria-label="Toggle Debug View"
        title="Toggle Debug View"
        onclick={handleToggleDebug}
      />
    {/if}
  </div>
</header>

<style>
  .webview-header {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-bottom: 1px solid var(--color-border-strong);
    background: transparent;
  }

  .header-actions {
    display: flex;
    gap: var(--space-1);
    align-items: center;
  }

  /* Refresh animation wrapper */
  .refresh-wrapper.refreshing :global(.dojo-icon-btn__icon) {
    animation: dojo-header-spin 0.5s ease-in-out;
  }

  @keyframes dojo-header-spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
