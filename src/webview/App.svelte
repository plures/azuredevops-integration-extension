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
  $: context = snapshot.context;
  $: matches = snapshot.matches || {}; // Pre-computed state matches from extension
  
  // Debug snapshot reactivity
  $: {
    console.log('[AzureDevOpsInt][webview] App reactive - snapshot:', {
      hasSnapshot: !!snapshot,
      value: snapshot.value,
      hasMatches: !!matches,
      matchKeys: Object.keys(matches).filter(k => matches[k]),
      contextKeys: context ? Object.keys(context) : []
    });
  }
  
  // Get VS Code API instance (already acquired in main.ts)
  const vscode = (window as any).__vscodeApi;
  
  // Helper to send events back to extension
  function sendEvent(event: any) {
    if (vscode) {
      vscode.postMessage({ type: 'fsmEvent', event });
    }
  }
  
  // Use pre-computed state matches - no need for custom isInState() helper!
  $: isInactiveOrActivating = matches.inactive || matches.activating;
  $: isActivationFailed = matches.activation_failed;
  $: isActiveSetup = matches['active.setup'];
  $: isActiveReadyManaging = matches['active.ready.managingConnections'];
  $: isActiveReady = matches['active.ready'];
  $: isActive = matches.active;
  
  // Device code session reactive bindings
  $: deviceCodeSession = context?.deviceCodeSession;
  $: deviceCodeRemainingMs = deviceCodeSession
    ? Math.max(deviceCodeSession.expiresAt - Date.now(), 0)
    : 0;
  $: deviceCodeExpiresInMinutes = deviceCodeSession
    ? Math.ceil(deviceCodeRemainingMs / 60000)
    : 0;

  function copyAndOpenDeviceCode() {
    if (!deviceCodeSession) return;
    // Delegate browser launch + clipboard to extension (webview sandbox limitations)
    vscode?.postMessage({
      type: 'openDeviceCodeBrowser',
      payload: { connectionId: deviceCodeSession.connectionId }
    });
  }
  
  // Debug: log state changes
  $: {
    const debugInfo = {
      isInactiveOrActivating,
      isActivationFailed,
      isActiveSetup,
      isActiveReadyManaging,
      isActiveReady,
      isActive,
      activeMatches: Object.keys(matches).filter(k => matches[k])
    };
    console.log('[AzureDevOpsInt][webview] App state matching:', debugInfo);
  }
  
  onMount(() => {
    console.log('[AzureDevOpsInt][webview] App.svelte mounted');
    if (vscode) {
      vscode.postMessage({ type: 'webviewReady' });
    }
  });
</script>

<main>
  {#if isInactiveOrActivating}
    <div class="loading">
      <p>Initializing Azure DevOps Integration...</p>
    </div>
  {:else if isActivationFailed}
    <div class="error-container">
      <h2>Activation Failed</h2>
      <p>{context?.lastError?.message || 'Unknown error during activation'}</p>
      <button on:click={() => sendEvent({ type: 'RETRY' })}>Retry</button>
    </div>
  {:else if isActiveSetup}
    <div class="loading">
      <p>Loading connections...</p>
      {#if context?.connections?.length}
        <p>Found {context.connections.length} connection(s)</p>
      {/if}
      {#if deviceCodeSession}
        <div class="device-code-session setup">
          <p><strong>Authentication Required</strong></p>
          <p>Open the login page and enter the code below to continue.</p>
          <p>Code: <strong>{deviceCodeSession.userCode}</strong> ({deviceCodeExpiresInMinutes}m left)</p>
          <div class="actions">
            <button on:click={copyAndOpenDeviceCode}>Copy & Open Login</button>
            <button class="secondary" on:click={() => sendEvent({ type: 'SIGN_OUT_ENTRA', connectionId: deviceCodeSession.connectionId })}>Cancel</button>
          </div>
        </div>
      {/if}
    </div>
  {:else if isActiveReadyManaging}
    <Settings {context} {sendEvent} />
  {:else if isActiveReady || isActive}
    <!-- Main work items UI -->
    <div class="toolbar">
      <div class="left-group">
        <button on:click={() => sendEvent({ type: 'REFRESH_DATA' })}>Refresh</button>
        <button on:click={() => sendEvent({ type: 'MANAGE_CONNECTIONS' })}>Connections</button>
          {#if context?.connections?.length > 1}
            <!-- Connection tabs placeholder (Svelte 5 upgrade path) -->
            <div class="connection-tabs" role="tablist" aria-label="Project Connections">
              {#each context.connections as c}
                <button
                  role="tab"
                  aria-selected={c.id === context.activeConnectionId}
                  class={c.id === context.activeConnectionId ? 'tab active' : 'tab'}
                  on:click={() => sendEvent({ type: 'CONNECTION_SELECTED', connectionId: c.id })}
                >
                  {c.label || c.id}
                </button>
              {/each}
            </div>
          {/if}
      </div>
      <div class="right-group">
        <button on:click={() => sendEvent({ type: 'TOGGLE_VIEW' })}>
          {context?.viewMode === 'kanban' ? 'List View' : 'Kanban View'}
        </button>
        {#if deviceCodeSession}
          <div class="device-code-session">
            <span title={`Code expires at ${new Date(deviceCodeSession.expiresAt).toLocaleTimeString()}`}>
              Auth code: <strong>{deviceCodeSession.userCode}</strong>
              ({deviceCodeExpiresInMinutes}m left)
            </span>
            <button class="secondary" on:click={copyAndOpenDeviceCode}>Copy & Open</button>
            <button class="secondary" on:click={() => sendEvent({ type: 'SIGN_OUT_ENTRA', connectionId: deviceCodeSession.connectionId })}>Cancel</button>
          </div>
        {/if}
      </div>
    </div>
    {#if context?.viewMode === 'kanban'}
      <KanbanBoard {context} {sendEvent} />
    {:else}
      <WorkItemList {context} {sendEvent} />
    {/if}
    <StatusBar {context} {sendEvent} />
  {:else}
    <!-- Debug fallback for unrecognized states -->
    <div class="info">
      <h2>Azure DevOps Integration - Debug View</h2>
      <p><strong>Current State:</strong> {JSON.stringify(snapshot.value)}</p>
      <p><strong>Active Matches:</strong> {Object.keys(matches).filter(k => matches[k]).join(', ') || 'none'}</p>
      {#if context?.activeConnectionId}
        <p><strong>Active Connection:</strong> {context.activeConnectionId}</p>
      {/if}
      {#if context?.connections}
        <p><strong>Connections:</strong> {context.connections.length}</p>
      {/if}
      {#if context?.pendingWorkItems}
        <p><strong>Pending Work Items:</strong> {context.pendingWorkItems.workItems?.length || 0}</p>
      {/if}
      {#if context?.lastError}
        <div class="error">Error: {context.lastError?.message || context.lastError}</div>
        <button on:click={() => sendEvent({ type: 'RETRY' })}>Retry</button>
      {/if}
      <button on:click={() => sendEvent({ type: 'REFRESH_DATA' })}>Try Refresh</button>
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
  .device-code-session {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--vscode-editorWidget-background);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
    line-height: 1.2;
  }
  .device-code-session strong { font-family: monospace; }
  button.secondary {
    background: var(--vscode-button-secondaryBackground, var(--vscode-button-background));
    color: var(--vscode-button-secondaryForeground, var(--vscode-button-foreground));
  }
</style>
