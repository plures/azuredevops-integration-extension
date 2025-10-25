<script lang="ts">
  import { onMount } from 'svelte';
  import { applicationSnapshot } from './fsmSnapshotStore.js';
  import WorkItemList from './components/WorkItemList.svelte';
  import Settings from './components/Settings.svelte';
  import StatusBar from './components/StatusBar.svelte';
  import KanbanBoard from './components/KanbanBoard.svelte';
  
  console.log('[webview] App.svelte initializing');
  
  // Reactive FSM state derived from snapshot store
  $: snapshot = $applicationSnapshot;
  $: fsmState = snapshot.value;
  $: context = snapshot.context;
  
  // Get VS Code API instance (already acquired in main.ts)
  const vscode = (window as any).__vscodeApi;
  
  // Helper to send events back to extension
  function sendEvent(event: any) {
    if (vscode) {
      vscode.postMessage({ type: 'fsmEvent', event });
    }
  }
  
  // State pattern matching helpers (mimics XState matches)
  function isInState(path: string): boolean {
    if (typeof fsmState === 'string') {
      return fsmState === path || fsmState.startsWith(path + '.');
    }
    if (typeof fsmState === 'object' && fsmState !== null) {
      // Handle nested state objects like { active: { ready: 'idle' } }
      const parts = path.split('.');
      let current: any = fsmState;
      for (const part of parts) {
        if (typeof current === 'object' && part in current) {
          current = current[part];
        } else {
          return false;
        }
      }
      return true;
    }
    return false;
  }
  
  onMount(() => {
    console.log('[webview] App.svelte mounted');
    if (vscode) {
      vscode.postMessage({ type: 'webviewReady' });
    }
  });
</script>

<main>
  {#if isInState('inactive') || isInState('activating')}
    <div class="loading">
      <p>Initializing Azure DevOps Integration...</p>
    </div>
  {:else if isInState('activation_failed')}
    <div class="error-container">
      <h2>Activation Failed</h2>
      <p>{context?.lastError?.message || 'Unknown error during activation'}</p>
      <button on:click={() => sendEvent({ type: 'RETRY' })}>Retry</button>
    </div>
  {:else if isInState('active.setup')}
    <div class="loading">
      <p>Loading connections...</p>
      {#if context?.connections?.length}
        <p>Found {context.connections.length} connection(s)</p>
      {/if}
    </div>
  {:else if isInState('active.ready.managingConnections')}
    <Settings {context} {sendEvent} />
  {:else if isInState('active.ready')}
    <div class="toolbar">
      <div class="left-group">
        <button on:click={() => sendEvent({ type: 'REFRESH_DATA' })}>Refresh</button>
        <button on:click={() => sendEvent({ type: 'MANAGE_CONNECTIONS' })}>Connections</button>
      </div>
      <div class="right-group">
        <button on:click={() => sendEvent({ type: 'TOGGLE_VIEW' })}>
          {context?.viewMode === 'kanban' ? 'List View' : 'Kanban View'}
        </button>
      </div>
    </div>
    {#if context?.viewMode === 'kanban'}
      <KanbanBoard {context} {sendEvent} />
    {:else}
      <WorkItemList {context} {sendEvent} />
    {/if}
    <StatusBar {context} {sendEvent} />
  {:else}
    <div class="info">
      <h2>Azure DevOps Integration</h2>
      <p>State: {JSON.stringify(fsmState)}</p>
      {#if context?.activeConnectionId}
        <p>Active Connection: {context.activeConnectionId}</p>
      {/if}
      {#if context?.lastError}
        <div class="error">Error: {context.lastError?.message || context.lastError}</div>
        <button on:click={() => sendEvent({ type: 'RETRY' })}>Retry</button>
      {/if}
    </div>
  {/if}
</main>
<style>
  main { 
    padding: 1rem; 
    font-family: var(--vscode-font-family, sans-serif);
    color: var(--vscode-foreground);
  }
  .loading {
    text-align: center;
    padding: 2rem;
  }
  .error-container, .error {
    color: var(--vscode-errorForeground);
    padding: 1rem;
    margin: 1rem 0;
  }
  .info {
    padding: 1rem;
  }
  button {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    padding: 0.5rem 1rem;
    cursor: pointer;
    margin-top: 0.5rem;
  }
  button:hover {
    background: var(--vscode-button-hoverBackground);
  }
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    gap: 1rem;
  }
  .left-group, .right-group { display: flex; gap: 0.5rem; }
</style>
