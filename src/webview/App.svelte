<!--
Module: src/webview/App.svelte
Owner: webview
Reads: syncState from extension (ApplicationContext serialized)
Writes: UI-only events; selection via selection writer factory (webview-owned)
Receives: syncState, host broadcasts
Emits: appEvent envelopes (Router handles stamping)
Prohibitions: Do not import extension host modules; Do not define context types
Rationale: Svelte UI component; reacts to ApplicationContext and forwards intents

LLM-GUARD:
- Use selection writer factory for selection updates
- Do not route by connection here; let Router decide targets
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { webviewStore } from './praxis/webview/store.js';
  // import Settings from './components/Settings.svelte';
  import ConnectionTabs from './components/ConnectionTabs.svelte';
  import ConnectionViews from './components/ConnectionViews.svelte';
  import AuthReminder from './components/AuthReminder.svelte';
  import WebviewHeader from './components/WebviewHeader.svelte';
  import Notification from './components/Notification.svelte';
  import ComposeCommentDialog from './components/ComposeCommentDialog.svelte';
  
  // ConnectionViews component uses export let syntax for proper TypeScript inference

  console.debug('[webview] App.svelte initializing');

  // Reactive Praxis state from webview store
  let currentState = $state(get(webviewStore) as any);
  
  // Subscribe to store updates
  $effect(() => {
    const unsubscribe = webviewStore.subscribe((value) => {
      console.debug('[webview] App store update', { 
        hasConnections: value.context.app.connections?.length > 0 
      });
      currentState = value;
    });
    return unsubscribe;
  });
  
  const appContext = $derived(currentState.context.app);
  // const uiContext = $derived(currentState.context.ui);

  // Debug snapshot reactivity
  $effect(() => {
    console.debug('[AzureDevOpsInt][webview] App reactive - context:', {
      appState: appContext?.applicationState,
      connections: appContext?.connections?.length,
      activeConnectionId: appContext?.activeConnectionId,
      viewMode: appContext?.viewMode,
    });
  });

  // Get VS Code API instance (already acquired in main.ts)
  const vscode = (window as any).__vscodeApi;

  // Helper to send events back to extension
  function sendEvent(event: any) {
    if (vscode) {
      vscode.postMessage({ type: 'appEvent', event });
    }
  }

  // Context-based state derivation
  const hasConnections = $derived((appContext?.connections?.length || 0) > 0);
  const isActivating = $derived(appContext?.applicationState === 'activating' || appContext?.applicationState === 'initializing');
  const isActivationFailed = $derived(appContext?.applicationState === 'activation_error' || appContext?.lastError);
  
  // Typed derived values for ConnectionViews props
  const connectionsArray: Array<{ id: string; label?: string }> = $derived(
    appContext?.connections || []
  );
  const activeId: string | undefined = $derived(appContext?.activeConnectionId);

  onMount(() => {
    console.debug('[AzureDevOpsInt][webview] App.svelte mounted');
    if (vscode) {
      vscode.postMessage({ type: 'webviewReady' });
    }
  });

  // Toggle debug view - handled locally in Svelte, just notify FSM of change
  let localDebugViewVisible = $state(false);
  
  // Sync with context when it changes
  $effect(() => {
    if (appContext?.debugViewVisible !== undefined) {
      localDebugViewVisible = appContext.debugViewVisible;
    }
  });
  
  function toggleDebugView() {
    localDebugViewVisible = !localDebugViewVisible;
    sendEvent({ type: 'TOGGLE_DEBUG_VIEW' });
  }

  // Expose function globally so it can be called from message handlers if needed
  (window as any).__toggleDebugView = toggleDebugView;

</script>

<main>
  {#if hasConnections}
    <!-- Main work items UI -->
    <WebviewHeader context={appContext} {sendEvent} />
    
    {#if connectionsArray.length > 1}
      <ConnectionTabs
        connections={appContext.connections}
        activeConnectionId={appContext.activeConnectionId}
      />
    {:else if activeId}
      <div class="single-connection-header">
        <span class="single-connection-label" title="Active Connection">
          {connectionsArray.find((c) => c.id === activeId)?.label || activeId}
        </span>
      </div>
    {/if}

    <!-- Error Banner for existing connections -->
    {#if isActivationFailed}
      <div class="error-banner">
        <span class="codicon codicon-error"></span>
        <span>{appContext?.lastError?.message || 'Connection Error'}</span>
        <button class="retry-btn" onclick={() => sendEvent({ type: 'RETRY' })}>Retry</button>
      </div>
    {/if}

    <ConnectionViews
      connections={connectionsArray}
      activeConnectionId={activeId}
      context={appContext}
      matches={{}} 
      {sendEvent}
    />
    
    <AuthReminder context={appContext} {sendEvent} />
    {#if appContext?.debugLoggingEnabled && localDebugViewVisible}
      <div class="debug-panel" role="region" aria-label="Debug View">
        <h3>Debug View</h3>
        <pre class="debug-json">{JSON.stringify(
            {
              appState: appContext.applicationState,
              activeConnectionId: appContext.activeConnectionId,
              viewMode: appContext.viewMode,
            },
            null,
            2
          )}</pre>
      </div>
    {/if}

    <!-- Global UI Components -->
    {#if appContext?.ui?.statusMessage}
      <Notification
        message={appContext.ui.statusMessage.text}
        type={appContext.ui.statusMessage.type}
        on:dismiss={() => sendEvent({ type: 'DISMISS_NOTIFICATION' })}
      />
    {/if}

    {#if appContext?.ui?.modal?.type === 'composeComment'}
      <ComposeCommentDialog
        workItemId={appContext.ui.modal.workItemId}
        mode={appContext.ui.modal.mode}
        on:cancel={() => sendEvent({ type: 'DISMISS_DIALOG' })}
        on:submit={(event) => sendEvent({ type: 'SUBMIT_COMMENT', ...event.detail })}
      />
    {/if}

  {:else}
    <!-- No connections state -->
    {#if isActivating}
      <div class="loading">
        <p>Initializing Azure DevOps Integration...</p>
        <p class="sub-text">Loading connections...</p>
      </div>
    {:else if isActivationFailed}
      <div class="error-container">
        <h2>Activation Failed</h2>
        <p>{appContext?.lastError?.message || 'Unknown error during activation'}</p>
        <button onclick={() => sendEvent({ type: 'RETRY' })}>Retry</button>
      </div>
    {:else}
      <div class="empty-state">
        <p>No connections configured.</p>
        <button onclick={() => sendEvent({ type: 'OPEN_SETTINGS' })}>Configure Connections</button>
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
  .error-banner {
    background-color: var(--vscode-inputValidation-errorBackground);
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    color: var(--vscode-foreground);
    padding: 0.5rem;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-radius: 2px;
  }
  .retry-btn {
    margin-left: auto;
    padding: 2px 8px;
    font-size: 0.8em;
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
