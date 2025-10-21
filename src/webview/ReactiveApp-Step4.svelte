<!-- ReactiveApp Step 4: Add FSM store imports -->
<script>
  console.log('🟢 [ReactiveApp-Step4] Component is being instantiated');

  import { onMount } from 'svelte';

  // VS Code API (working from Step 2)
  const vscode = (() => {
    if (window.vscode) {
      console.log('[ReactiveApp-Step4] Using globally available VS Code API');
      return window.vscode;
    } else if (window.acquireVsCodeApi) {
      console.log('[ReactiveApp-Step4] Acquiring VS Code API for the first time');
      const api = window.acquireVsCodeApi();
      window.vscode = api;
      return api;
    } else {
      console.warn('[ReactiveApp-Step4] No VS Code API available');
      return null;
    }
  })();

  // Step 3: UI store import (working)
  import { ui } from './store.svelte.ts';

  // Step 4: Try FSM store imports - these might be causing the store_invalid_shape error
  import {
    fsm,
    connections,
    activeConnection,
    workItems,
    isDataLoading,
    isInitializing,
  } from './fsm-webview.svelte.ts';

  let fsmImportError = null;

  try {
    console.log('[ReactiveApp-Step4] FSM stores imported successfully');
    console.log('[ReactiveApp-Step4] FSM state:', fsm);
    console.log('[ReactiveApp-Step4] Connections count:', connections?.length || 'undefined');
    console.log('[ReactiveApp-Step4] Active connection:', activeConnection);
  } catch (error) {
    console.error('[ReactiveApp-Step4] FSM store access failed:', error);
    fsmImportError = error;
  }

  function triggerManualSignIn() {
    console.log('🚀 [ReactiveApp-Step4] Manual sign-in triggered');

    if (vscode) {
      vscode.postMessage({
        type: 'manualSignIn',
        timestamp: new Date().toISOString(),
      });
      console.log('✅ [ReactiveApp-Step4] Manual sign-in message sent via VS Code API');
    } else {
      console.warn('⚠️ [ReactiveApp-Step4] VS Code API not available for manual sign-in');
    }
  }

  onMount(() => {
    console.log('🟢 [ReactiveApp-Step4] Component mounted successfully');
    console.log('🔍 [ReactiveApp-Step4] VS Code API available:', !!vscode);
    console.log('🔍 [ReactiveApp-Step4] FSM import error:', fsmImportError);
  });
</script>

<!-- Step 4 template with FSM import testing -->
<div
  style="background: #cc3300; color: #ffffff; padding: 20px; margin: 10px; font-weight: bold; border: 3px solid #ffffff;"
>
  🟢 REACTIVEAPP STEP 4: FSM STORE IMPORT TESTING
  <br />This tests whether FSM store imports are causing the initialization error.
  <br />
  <button onclick={triggerManualSignIn}>🚀 Manual Sign In (Step 4)</button>
  <br />
  {#if fsmImportError}
    <div style="background: #cc0000; padding: 10px; margin: 10px 0;">
      ❌ FSM Import Error: {fsmImportError.message}
    </div>
  {:else}
    <div style="background: #009900; padding: 10px; margin: 10px 0;">
      ✅ No FSM import errors detected
    </div>
  {/if}
</div>
