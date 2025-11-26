<!--
Module: apps/app-desktop/src/lib/components/App.svelte
Main application component for Tauri desktop app
Adapted from src/webview/App.svelte for desktop environment
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { initializeFsm, getFsmManager, type FsmSnapshot } from '$lib/fsm-integration';
  // Dynamic invoke import guarded for browser runtime
  // Non-throwing initial stub; replaced if Tauri is available
  let invoke: (<T>(cmd: string, args?: any) => Promise<T>) = async () => undefined as any;
  if ((window as any).__TAURI__) {
    import('@tauri-apps/api/core').then(m => { invoke = m.invoke as any; }).catch(() => {});
  }
  import Settings from './Settings.svelte';
  import ConnectionTabs from './ConnectionTabs.svelte';
  import ConnectionViews from './ConnectionViews.svelte';
  import AuthReminder from './AuthReminder.svelte';
  import WebviewHeader from './WebviewHeader.svelte';
  
  // Get platform adapter (should be set up in main route)
  const vscodeApi = (window as any).__vscodeApi;
  
  // Application state - managed by Praxis
  let appState = $state<string>('initializing');
  let connections = $state<Array<{ id: string; label?: string }>>([]);
  let activeConnectionId = $state<string | undefined>(undefined);
  let lastError = $state<{ message: string } | undefined>(undefined);
  let viewMode = $state<'list' | 'kanban'>('list');
  let debugViewVisible = $state(false);
  
  // Matches function from Praxis
  let matches = $state<(state: string) => boolean>(() => false);

  // Context for child components
  const context = $derived({
    connections,
    activeConnectionId,
    lastError,
    viewMode,
    debugViewVisible,
    debugLoggingEnabled: true,
  });
  
  // Helper to send events
  function sendEvent(event: any) {
    console.log('[Desktop App] Event:', event);
    
    // Handle view mode toggle locally (optional, can be handled by FSM)
    if (event.type === 'TOGGLE_VIEW_MODE') {
      // FSM handles this via TOGGLE_VIEW
      getFsmManager().send({ type: 'TOGGLE_VIEW' });
      return;
    }
    
    if (event.type === 'CLOSE_SETTINGS') {
      // If we have connections, we are ready
      // But FSM should handle state transitions.
      // We might need to trigger a state check or just let FSM handle it.
      // For now, just reload connections which might trigger state update
      getFsmManager().reloadConnections();
      return;
    }

    // Forward to FSM
    getFsmManager().send(event);
  }
  
  // Computed state flags using matches function
  const isInactiveOrActivating = $derived(matches('inactive') || matches('activating'));
  const isActivationFailed = $derived(matches('error_recovery'));
  const isActiveSetup = $derived(matches('active.setup') || (matches('active') && connections.length === 0));
  const isActiveReadyManaging = $derived(matches('active.ready.managingConnections'));
  const isActiveReady = $derived(matches('active.ready'));
  const isActive = $derived(matches('active'));
  
  function toggleDebugView() {
    debugViewVisible = !debugViewVisible;
    getFsmManager().send({ type: 'TOGGLE_DEBUG_VIEW' });
  }
  
  // Initialize app
  onMount(() => {
    (async () => {
      console.log('[Desktop App] App.svelte mounted');
      
      // Initialize FSM
      const manager = await initializeFsm();
      
      const unsubscribe = manager.subscribe((snapshot: FsmSnapshot) => {
          appState = snapshot.value;
          connections = snapshot.context.connections || [];
          activeConnectionId = snapshot.context.activeConnectionId;
          lastError = snapshot.context.lastError;
          viewMode = snapshot.context.viewMode || 'list';
          debugViewVisible = snapshot.context.debugViewVisible || false;
          matches = snapshot.matches;
      });

      return () => {
          unsubscribe();
          manager.stop();
      };
    })();
  });
  
  // Expose toggle for keyboard shortcut
  (window as any).__toggleDebugView = toggleDebugView;
</script>

<main>
  {#if isInactiveOrActivating}
    <div class="loading">
      <div class="spinner"></div>
      <p>Initializing Azure DevOps Integration...</p>
    </div>
  {:else if isActivationFailed}
    <div class="error-container">
      <h2>Activation Failed</h2>
      <p>{lastError?.message || 'Unknown error during activation'}</p>
      <button onclick={() => { getFsmManager().send({ type: 'RETRY' }); }}>Retry</button>
    </div>
  {:else if isActiveSetup}
    <div class="setup-container">
      <h2>Welcome to Azure DevOps Integration</h2>
      <p>Let's set up your first connection</p>
      <Settings {context} {sendEvent} />
      <AuthReminder {context} {sendEvent} />
    </div>
  {:else if isActiveReadyManaging}
    <Settings {context} {sendEvent} />
  {:else if isActiveReady || isActive}
    <!-- Main work items UI -->
    <WebviewHeader {context} {sendEvent} />
    
    {#if connections.length > 1}
      <ConnectionTabs
        {connections}
        {activeConnectionId}
      />
    {:else if activeConnectionId}
      <div class="single-connection-header">
        <span class="single-connection-label" title="Active Connection">
          {connections.find(c => c.id === activeConnectionId)?.label || activeConnectionId}
        </span>
      </div>
    {/if}

    <ConnectionViews
      {connections}
      {activeConnectionId}
      {context}
      {matches}
      {sendEvent}
    />
    
    <AuthReminder {context} {sendEvent} />
    
    {#if debugViewVisible}
      <div class="debug-panel" role="region" aria-label="Debug View">
        <h3>Debug View</h3>
        <button onclick={toggleDebugView}>Close</button>
        <pre class="debug-json">{JSON.stringify(
          {
            state: appState,
            activeConnectionId,
            viewMode,
            connectionsCount: connections.length,
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
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    color: #0f0f0f;
    background-color: #f6f6f6;
    min-height: 100vh;
  }
  
  @media (prefers-color-scheme: dark) {
    main {
      color: #f6f6f6;
      background-color: #1a1a1a;
    }
  }
  
  .loading {
    text-align: center;
    padding: 4rem 2rem;
  }
  
  .spinner {
    width: 40px;
    height: 40px;
    margin: 0 auto 1rem;
    border: 4px solid rgba(0, 120, 212, 0.1);
    border-top-color: #0078d4;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .setup-container {
    max-width: 600px;
    margin: 2rem auto;
    padding: 2rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  @media (prefers-color-scheme: dark) {
    .setup-container {
      background: #2d2d2d;
    }
  }
  
  .error-container {
    max-width: 600px;
    margin: 2rem auto;
    padding: 2rem;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 8px;
    color: #856404;
  }
  
  @media (prefers-color-scheme: dark) {
    .error-container {
      background: #4a3c00;
      border-color: #8a6d00;
      color: #ffd700;
    }
  }
  
  button {
    background: #0078d4;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
    margin-top: 0.5rem;
  }
  
  button:hover {
    background: #106ebe;
  }
  
  button:active {
    background: #005a9e;
  }
  
  .single-connection-header {
    padding: 0.5rem 0;
    margin-bottom: 0.5rem;
  }
  
  .single-connection-label {
    font-size: 0.875rem;
    padding: 0.5rem 0.75rem;
    background: #e8f4f8;
    border: 1px solid #0078d4;
    border-radius: 4px;
    color: #0078d4;
    display: inline-block;
  }
  
  @media (prefers-color-scheme: dark) {
    .single-connection-label {
      background: #1e3a52;
      color: #4da6ff;
    }
  }
  
  .debug-panel {
    margin: 1rem 0;
    padding: 1rem;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    max-height: 300px;
    overflow: auto;
    font-size: 0.75rem;
  }
  
  @media (prefers-color-scheme: dark) {
    .debug-panel {
      background: #2d2d2d;
      border-color: #555;
    }
  }
  
  .debug-panel h3 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
  }
  
  .debug-json {
    margin: 0;
    font-family: 'Courier New', monospace;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
