<!--
Module: src/webview/components/WebviewHeader.svelte
Owner: webview
Purpose: Custom header with action buttons matching VS Code header functionality
-->
<script lang="ts">
  interface Props {
    context?: any;
    sendEvent?: (event: any) => void;
  }
  
  const { context, sendEvent }: Props = $props();
  
  // Refresh button state for animation
  let isRefreshing = $state(false);
  
  function handleRefresh() {
    isRefreshing = true;
    // Send REFRESH_DATA message to extension
    sendEvent?.({ type: 'REFRESH_DATA' });
    // Reset animation state after 500ms
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
</script>

<header class="webview-header">
  <div class="header-actions">
    <!-- Toggle Kanban View -->
    <button
      class="header-btn"
      onclick={handleToggleKanban}
      title="Toggle Kanban View"
      aria-label="Toggle Kanban View"
    >
      <span class="codicon">⚏</span>
    </button>
    
    <!-- Refresh Work Items -->
    <button
      class="header-btn {isRefreshing ? 'refreshing' : ''}"
      onclick={handleRefresh}
      title="Refresh Work Items (R)"
      aria-label="Refresh Work Items"
    >
      <span class="codicon">↻</span>
    </button>
    
    <!-- Create Work Item -->
    <button
      class="header-btn"
      onclick={handleCreateWorkItem}
      title="Create Work Item"
      aria-label="Create Work Item"
    >
      <span class="codicon">＋</span>
    </button>
    
    <!-- Setup/Manage Connections -->
    <button
      class="header-btn"
      onclick={handleSetup}
      title="Setup or Manage Connections"
      aria-label="Setup or Manage Connections"
    >
      <span class="codicon">⚙</span>
    </button>
    
    <!-- Toggle Debug View (conditional) -->
    {#if showDebugButton}
      <button
        class="header-btn"
        onclick={handleToggleDebug}
        title="Toggle Debug View"
        aria-label="Toggle Debug View"
      >
        <span class="codicon">🐛</span>
      </button>
    {/if}
  </div>
</header>

<style>
  .webview-header {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-bottom: 1px solid var(--vscode-panel-border);
    background: transparent;
  }
  
  .header-actions {
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }
  
  .header-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    margin: 0;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    color: var(--vscode-icon-foreground);
    transition: background-color 0.2s ease;
  }
  
  .header-btn:hover {
    background: var(--vscode-toolbar-hoverBackground);
  }
  
  .header-btn:active {
    background: var(--vscode-toolbar-activeBackground);
  }
  
  .header-btn .codicon {
    font-family: 'codicon';
    font-size: 16px;
    font-weight: normal;
    font-style: normal;
    line-height: 1;
    display: inline-block;
    text-decoration: none;
    text-rendering: auto;
    text-align: center;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    user-select: none;
  }
  
  /* Refresh animation */
  .header-btn.refreshing .codicon {
    animation: spin 500ms ease-in-out;
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>

