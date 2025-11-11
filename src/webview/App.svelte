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
  import { get } from 'svelte/store';
  import { applicationSnapshot, type ApplicationSnapshot } from './fsmSnapshotStore.js';
  import Settings from './components/Settings.svelte';
  import ConnectionTabs from './components/ConnectionTabs.svelte';
  import ConnectionViews from './components/ConnectionViews.svelte';
  import AuthReminder from './components/AuthReminder.svelte';
  import WebviewHeader from './components/WebviewHeader.svelte';
  
  // ConnectionViews component uses export let syntax for proper TypeScript inference

  console.debug('[webview] App.svelte initializing');

  // Reactive FSM state from snapshot store (subscribe reactively in Svelte 5 runes)
  let snapshot = $state<ApplicationSnapshot>(get(applicationSnapshot));
  
  // Subscribe to store updates
  $effect(() => {
    const unsubscribe = applicationSnapshot.subscribe((value) => {
      snapshot = value;
    });
    return unsubscribe;
  });
  
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

  // Typed derived values for ConnectionViews props
  // Explicitly typed to ensure TypeScript inference works correctly
  const connectionsArray: Array<{ id: string; label?: string }> = $derived(
    context?.connections || []
  );
  const activeId: string | undefined = $derived(context?.activeConnectionId);


  


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

  // Expose function globally so it can be called from message handlers if needed
  (window as any).__toggleDebugView = toggleDebugView;

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
    <WebviewHeader {context} {sendEvent} />
    {#if context?.connections?.length > 1}
      <ConnectionTabs
        connections={context.connections}
        activeConnectionId={context.activeConnectionId}
      />
    {:else if context?.activeConnectionId}
      <div class="single-connection-header">
        <span class="single-connection-label" title="Active Connection">
          {context.connections?.find((c: { id: string; label?: string }) => c.id === context.activeConnectionId)?.label ||
            context.activeConnectionId}
        </span>
      </div>
    {/if}

  <ConnectionViews
    connections={connectionsArray}
    activeConnectionId={activeId}
    context={context}
    {matches}
    {sendEvent}
  />
    
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
  .single-connection-header {
    padding: 0.5rem 0;
    margin-bottom: 0.5rem;
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
</style>
