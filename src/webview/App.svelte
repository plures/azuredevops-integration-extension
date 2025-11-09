<!--
Module: src/webview/App.svelte
Owner: webview
Reads: syncState from extension (ApplicationContext serialized)
Writes: UI-only events; selection via selection writer factory (webview-owned)
Receives: syncState, host broadcasts
Emits: fsmEvent envelopes (Router handles stamping)
Prohibitions: Do not import extension host modules; Do not define context types
Rationale: Svelte UI component; reacts to ApplicationContext and forwards intents

LLM-GUARD:
- Use selection writer factory for selection updates
- Do not route by connection here; let Router decide targets
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { applicationSnapshot } from './fsmSnapshotStore.js';
  import WorkItemList from './components/WorkItemList.svelte';
  import Settings from './components/Settings.svelte';
  import StatusBar from './components/StatusBar.svelte';
  import KanbanBoard from './components/KanbanBoard.svelte';
  import ConnectionTabs from './components/ConnectionTabs.svelte';
  import AuthReminder from './components/AuthReminder.svelte';
  import Dropdown from './components/Dropdown.svelte';

  console.debug('[webview] App.svelte initializing');

  // Reactive FSM state derived from snapshot store
  const snapshot = $derived($applicationSnapshot);
  const context = $derived(snapshot.context);
  const matches = $derived(snapshot.matches || {}); // Pre-computed state matches from extension

  // Debug snapshot reactivity
  $effect(() => {
    console.debug('[AzureDevOpsInt][webview] App reactive - snapshot:', {
      hasSnapshot: !!snapshot,
      value: snapshot.value,
      hasMatches: !!matches,
      matchKeys: Object.keys(matches).filter((k) => matches[k]),
      contextKeys: context ? Object.keys(context) : [],
      hasPendingWorkItems: !!context?.pendingWorkItems,
      workItemsCount: context?.pendingWorkItems?.workItems?.length || 0,
      viewMode: context?.viewMode,
    });
  });

  // Get VS Code API instance (already acquired in main.ts)
  const vscode = (window as any).__vscodeApi;

  // Helper to send events back to extension
  function sendEvent(event: any) {
    if (vscode) {
      vscode.postMessage({ type: 'fsmEvent', event });
    }
  }

  // Use pre-computed state matches - no need for custom isInState() helper!
  const isInactiveOrActivating = $derived(matches.inactive || matches.activating);
  const isActivationFailed = $derived(matches.activation_failed);
  const isActiveSetup = $derived(matches['active.setup']);
  const isActiveReadyManaging = $derived(matches['active.ready.managingConnections']);
  const isActiveReady = $derived(matches['active.ready']);
  const isActive = $derived(matches.active);


  // Query selector support (replaces internal toolbar controls)
  const predefinedQueries = [
    'My Activity',
    'Assigned to me', // Lowercase 't' to match azureClient.ts case statement
    'Recently Updated',
    'Created By Me',
  ];
  const contextActiveQuery = $derived(context?.activeQuery || predefinedQueries[0]);
  let localActiveQuery = $state(predefinedQueries[0]);
  
  // Sync local query with context when it changes
  $effect(() => {
    const nextQuery = contextActiveQuery;
    if (nextQuery && nextQuery !== localActiveQuery) {
      localActiveQuery = nextQuery;
    }
  });
  


  // Debug: log state changes
  $effect(() => {
    const debugInfo = {
      isInactiveOrActivating,
      isActivationFailed,
      isActiveSetup,
      isActiveReadyManaging,
      isActiveReady,
      isActive,
      activeMatches: Object.keys(matches).filter((k) => matches[k]),
    };
    console.debug('[AzureDevOpsInt][webview] App state matching:', debugInfo);
  });

  onMount(() => {
    console.debug('[AzureDevOpsInt][webview] App.svelte mounted');
    if (vscode) {
      vscode.postMessage({ type: 'webviewReady' });
    }
  });

  // Toggle debug view - handled locally in Svelte, just notify FSM of change
  let localDebugViewVisible = $state(false);
  
  // Sync with context when it changes (FSM is source of truth for initial state)
  $effect(() => {
    if (context?.debugViewVisible !== undefined) {
      localDebugViewVisible = context.debugViewVisible;
    }
  });
  
  function toggleDebugView() {
    localDebugViewVisible = !localDebugViewVisible;
    // Notify FSM of the change (but don't wait for it - Svelte controls display)
    if (vscode) {
      vscode.postMessage({ 
        type: 'TOGGLE_DEBUG_VIEW',
        debugViewVisible: localDebugViewVisible 
      });
    }
  }
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
      <button onclick={() => sendEvent({ type: 'RETRY' })}>Retry</button>
    </div>
  {:else if isActiveSetup}
    <div class="loading">
      <p>Loading connections...</p>
      {#if context?.connections?.length}
        <p>Found {context.connections.length} connection(s)</p>
      {/if}
      <AuthReminder {context} {sendEvent} />
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
          <Dropdown
            value={localActiveQuery}
            options={predefinedQueries.map((q) => ({ value: q, label: q }))}
            onChange={(value) => {
              localActiveQuery = value;
              if (value && value !== context?.activeQuery) {
                sendEvent({ type: 'SET_QUERY', query: value });
              }
            }}
            class="query-select"
          />
        </div>
        <!-- Internal actions removed; rely on VS Code view/title menu commands -->
      </div>
      <!-- Removed visible live count to reduce extraneous text; accessible output disabled intentionally -->
    </div>
    <AuthReminder {context} {sendEvent} />
    {#if context?.debugLoggingEnabled && localDebugViewVisible}
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
      <WorkItemList {context} {sendEvent} {matches} />
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
  .error-container {
    color: var(--vscode-errorForeground);
    padding: 1rem;
    margin: 1rem 0;
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
  .left-group {
    display: flex;
    gap: 0.5rem;
    align-items: center;
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
  .query-select {
    padding: 0.35rem 0.55rem;
    font-size: 0.7rem;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
  }
  .query-select:focus {
    outline: 1px solid var(--vscode-focusBorder);
  }
</style>
