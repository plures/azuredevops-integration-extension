<script lang="ts">
  import { onMount } from 'svelte';
  import { applicationSnapshot } from './fsmSnapshotStore.js';
  import WorkItemList from './components/WorkItemList.svelte';
  import Settings from './components/Settings.svelte';
  import StatusBar from './components/StatusBar.svelte';
  import KanbanBoard from './components/KanbanBoard.svelte';
  import ConnectionTabs from './components/ConnectionTabs.svelte';

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
      matchKeys: Object.keys(matches).filter((k) => matches[k]),
      contextKeys: context ? Object.keys(context) : [],
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
  $: deviceCodeExpiresInMinutes = deviceCodeSession ? Math.ceil(deviceCodeRemainingMs / 60000) : 0;

  // Query selector support (replaces internal toolbar controls)
  const predefinedQueries = [
    'My Activity',
    'Assigned To Me',
    'Recently Updated',
    'Created By Me'
  ];
  $: activeQuery = context?.activeQuery || predefinedQueries[0];
  function handleQueryChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    const next = target.value.trim();
    if (next && next !== context?.activeQuery) {
      sendEvent({ type: 'SET_QUERY', query: next });
    }
  }

  function copyAndOpenDeviceCode() {
    if (!deviceCodeSession) return;
    // Delegate browser launch + clipboard to extension (webview sandbox limitations)
    vscode?.postMessage({
      type: 'openDeviceCodeBrowser',
      payload: { connectionId: deviceCodeSession.connectionId },
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
      activeMatches: Object.keys(matches).filter((k) => matches[k]),
    };
    console.log('[AzureDevOpsInt][webview] App state matching:', debugInfo);
  }

  onMount(() => {
    console.log('[AzureDevOpsInt][webview] App.svelte mounted');
    if (vscode) {
      vscode.postMessage({ type: 'webviewReady' });
    }
  });

  // (Removed internal toolbar button handlers per request)
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
          <p>
            Code: <strong>{deviceCodeSession.userCode}</strong> ({deviceCodeExpiresInMinutes}m left)
          </p>
          <div class="actions">
            <button on:click={copyAndOpenDeviceCode}>Copy & Open Login</button>
            <button
              class="secondary"
              on:click={() =>
                sendEvent({ type: 'SIGN_OUT_ENTRA', connectionId: deviceCodeSession.connectionId })}
              >Cancel</button
            >
          </div>
        </div>
      {/if}
    </div>
  {:else if isActiveReadyManaging}
    <Settings {context} {sendEvent} />
  {:else if isActiveReady || isActive}
    <!-- Main work items UI -->
    <div class="header-stack">
      <div class="toolbar primary-row">
        <div class="left-group">
          {#if context?.connections?.length > 1}
            <ConnectionTabs
              connections={context.connections}
              activeConnectionId={context.activeConnectionId}
            />
          {:else if context?.activeConnectionId}
            <span class="single-connection-label" title="Active Connection">
              {context.connections?.find((c) => c.id === context.activeConnectionId)?.label ||
                context.activeConnectionId}
            </span>
          {/if}
          <select class="query-select" bind:value={activeQuery} on:change={handleQueryChange} title="Work Item Query">
            {#each predefinedQueries as q}
              <option value={q}>{q}</option>
            {/each}
          </select>
        </div>
        <!-- Internal actions removed; rely on VS Code view/title menu commands -->
        <div class="right-group">
          {#if deviceCodeSession}
            <div class="device-code-session" data-auth-code>
              <span
                title={`Code expires at ${new Date(deviceCodeSession.expiresAt).toLocaleTimeString()}`}
              >
                Auth code: <strong>{deviceCodeSession.userCode}</strong>
                ({deviceCodeExpiresInMinutes}m left)
              </span>
              <button class="secondary" on:click={copyAndOpenDeviceCode}>Copy & Open</button>
              <button
                class="secondary"
                on:click={() =>
                  sendEvent({
                    type: 'SIGN_OUT_ENTRA',
                    connectionId: deviceCodeSession.connectionId,
                  })}>Cancel</button
              >
            </div>
          {/if}
        </div>
      </div>
      <!-- Removed visible live count to reduce extraneous text; accessible output disabled intentionally -->
    </div>
    {#if context?.debugLoggingEnabled && context?.debugViewVisible}
      <div class="debug-panel" role="region" aria-label="Debug View">
        <h3>Debug View</h3>
        <pre class="debug-json">{JSON.stringify(
            {
              state: snapshot.value,
              matches: Object.keys(matches).filter((k) => matches[k]),
              activeConnectionId: context?.activeConnectionId,
              viewMode: context?.viewMode,
            },
            null,
            2
          )}</pre>
      </div>
    {/if}
    {#if context?.viewMode === 'kanban'}
      <KanbanBoard {context} {sendEvent} />
    {:else}
      <WorkItemList {context} {sendEvent} />
    {/if}
    <StatusBar {context} {sendEvent} />
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
  .error-container,
  .error {
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
    padding: 0.5rem 0.25rem 0.5rem 0.5rem;
    border-bottom: 1px solid var(--vscode-panel-border, var(--vscode-input-border));
    background: var(--vscode-editorWidget-background);
  }
  .header-stack {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .primary-row {
    margin-bottom: 0;
  }
  .left-group,
  .right-group {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .actions-group { display: none; }
  .toolbar-btn {
    background: var(--vscode-button-secondaryBackground, var(--vscode-button-background));
    color: var(--vscode-button-secondaryForeground, var(--vscode-button-foreground));
    border: 1px solid var(--vscode-panel-border, var(--vscode-input-border));
    padding: 0.35rem 0.6rem;
    font-size: 0.7rem;
    line-height: 1;
    border-radius: 3px;
    cursor: pointer;
  }
  .toolbar-btn:hover {
    background: var(--vscode-button-hoverBackground);
  }
  .toolbar-btn.active,
  .toolbar-btn[aria-pressed='true'] {
    background: var(--vscode-button-background);
    border-color: var(--vscode-focusBorder);
    box-shadow: 0 0 0 1px var(--vscode-focusBorder);
  }
  .debug-panel {
    margin: 0.5rem 0 0.75rem;
    padding: 0.5rem;
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-panel-border, var(--vscode-input-border));
    border-radius: 4px;
    max-height: 300px;
    overflow: auto;
    font-size: 0.65rem;
  }
  .debug-panel h3 {
    margin: 0 0 0.4rem;
    font-size: 0.75rem;
  }
  .debug-json {
    margin: 0;
    font-family: monospace;
    white-space: pre-wrap;
  }
  .single-connection-label {
    font-size: 0.75rem;
    padding: 0.35rem 0.55rem;
    background: var(--vscode-tab-activeBackground);
    border: 1px solid var(--vscode-tab-activeBorder, var(--vscode-focusBorder));
    border-radius: 4px;
    color: var(--vscode-tab-activeForeground);
  }
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
  .device-code-session strong {
    font-family: monospace;
  }
  button.secondary {
    background: var(--vscode-button-secondaryBackground, var(--vscode-button-background));
    color: var(--vscode-button-secondaryForeground, var(--vscode-button-foreground));
  }
  .workitem-count-badge { display: none; }
  .query-select {
    padding: 0.35rem 0.55rem;
    font-size: 0.7rem;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
  }
  .query-select:focus { outline: 1px solid var(--vscode-focusBorder); }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }
</style>
