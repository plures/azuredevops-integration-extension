<!-- ReactiveApp.svelte - Working Version Based on Step 4 Success -->
<script>
  console.log(
    '🟢 [ReactiveApp-Working] Component is being instantiated - using Step 4 proven pattern'
  );

  import { onMount } from 'svelte';

  // VS Code API (proven working from Step 2)
  const vscode = (() => {
    if (window.vscode) {
      console.log('[ReactiveApp-Working] Using globally available VS Code API');
      return window.vscode;
    } else if (window.acquireVsCodeApi) {
      console.log('[ReactiveApp-Working] Acquiring VS Code API for the first time');
      const api = window.acquireVsCodeApi();
      window.vscode = api;
      return api;
    } else {
      console.warn('[ReactiveApp-Working] No VS Code API available');
      return null;
    }
  })();

  // Simple toast replacement (proven working)
  function showToast(message, type = 'info') {
    console.log(`🍞 [Toast-${type}] ${message}`);
  }

  // Store imports - proven to work from our step-by-step testing
  import {
    fsm,
    connections,
    activeConnection,
    workItems,
    isDataLoading,
    isInitializing,
    isActivated,
    actions as fsmActions,
    selectors,
  } from './fsm-webview.svelte.ts';

  import {
    ui,
    filteredWorkItems,
    hasConnections,
    canShowWorkItems,
    uiActions,
    integrationActions,
    initializeStoreEffects,
  } from './store.svelte.ts';

  // Props using Svelte 5 syntax - simplified for working version
  let {
    onConnectionSelect = () => {},
    onTimerStart = () => {},
    onTimerStop = () => {},
    onTimerPause = () => {},
    onWorkItemMove = () => {},
    onWorkItemCreate = () => {},
    onRefreshData = () => {},
    onAuthResolve = (connectionId) => {
      console.log('🔐 [ReactiveApp-Working] Starting authentication for connection:', connectionId);
      if (vscode) {
        vscode.postMessage({
          type: 'manualSignIn',
          connectionId,
          timestamp: new Date().toISOString(),
        });
        showToast(`Starting authentication for ${connectionId}`, 'info');
      }
    },
    ...restProps
  } = $props();

  // Manual sign-in function (proven working)
  function triggerManualSignIn() {
    console.log('🚀 [ReactiveApp-Working] Manual sign-in triggered');

    if (vscode) {
      vscode.postMessage({
        type: 'manualSignIn',
        timestamp: new Date().toISOString(),
      });
      console.log('✅ [ReactiveApp-Working] Manual sign-in message sent via VS Code API');
      showToast('Manual sign-in initiated', 'success');
    } else {
      console.warn('⚠️ [ReactiveApp-Working] VS Code API not available for manual sign-in');
      showToast('VS Code API not available', 'error');
    }
  }

  // Initialize store effects (from original ReactiveApp)
  onMount(() => {
    console.log('🟢 [ReactiveApp-Working] Component mounted successfully');
    console.log('🔍 [ReactiveApp-Working] VS Code API available:', !!vscode);
    console.log('🔍 [ReactiveApp-Working] FSM state:', fsm);
    console.log('🔍 [ReactiveApp-Working] Connections:', connections);
    console.log('🔍 [ReactiveApp-Working] Active connection:', activeConnection);

    try {
      // Initialize store effects if available
      if (initializeStoreEffects) {
        initializeStoreEffects();
        console.log('🔄 [ReactiveApp-Working] Store effects initialized');
      }
    } catch (error) {
      console.error('❌ [ReactiveApp-Working] Store effects initialization failed:', error);
    }
  });
</script>

<!-- Working ReactiveApp template -->
<div class="reactive-app-container">
  <div
    class="debug-header"
    style="background: #006600; color: #ffffff; padding: 15px; margin: 10px; font-weight: bold; border: 2px solid #ffffff;"
  >
    🟢 REACTIVEAPP WORKING VERSION
    <br />Based on proven Step 4 pattern with full store integration
    <br />
    <button
      onclick={triggerManualSignIn}
      style="margin: 5px; padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer;"
    >
      🚀 Manual Sign In
    </button>
  </div>

  <div
    class="store-status"
    style="background: #333; color: #fff; padding: 10px; margin: 10px; border-radius: 4px;"
  >
    <h3>🔍 Store Status Debug</h3>
    <p><strong>FSM State:</strong> {fsm ? 'Available' : 'Not Available'}</p>
    <p><strong>Connections:</strong> {connections ? `${connections.length} found` : 'None'}</p>
    <p><strong>Active Connection:</strong> {activeConnection || 'None'}</p>
    <p><strong>Work Items:</strong> {workItems ? `${workItems.length} found` : 'None'}</p>
    <p><strong>Is Loading:</strong> {isDataLoading ? 'Yes' : 'No'}</p>
    <p><strong>Is Initializing:</strong> {isInitializing ? 'Yes' : 'No'}</p>
  </div>

  {#if !hasConnections}
    <div
      class="auth-reminder"
      style="background: #ffa500; color: #000; padding: 15px; margin: 10px; border-radius: 4px;"
    >
      <h3>🔐 Authentication Required</h3>
      <p>No Azure DevOps connections found. Please set up a connection first.</p>
      <button
        onclick={triggerManualSignIn}
        style="padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer;"
      >
        🚀 Setup Connection
      </button>
    </div>
  {:else}
    <div
      class="work-items-section"
      style="background: #f0f0f0; color: #000; padding: 15px; margin: 10px; border-radius: 4px;"
    >
      <h3>📋 Work Items ({filteredWorkItems ? filteredWorkItems.length : 0})</h3>
      {#if canShowWorkItems}
        {#each filteredWorkItems || [] as item}
          <div
            class="work-item"
            style="background: #fff; padding: 8px; margin: 5px 0; border: 1px solid #ccc; border-radius: 4px;"
          >
            <strong>#{item.id}</strong> - {item.title || 'No title'}
            <br /><small>{item.type || 'Unknown type'} | {item.state || 'Unknown state'}</small>
          </div>
        {/each}
      {:else}
        <p>Loading work items...</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .reactive-app-container {
    font-family: var(--vscode-font-family, 'Segoe UI', sans-serif);
    color: var(--vscode-editor-foreground, #d4d4d4);
    background: var(--vscode-editor-background, #1e1e1e);
    min-height: 100vh;
    padding: 10px;
  }

  button:hover {
    opacity: 0.8;
  }
</style>
