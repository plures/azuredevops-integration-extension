<!-- ReactiveApp Step 3: Add simplified store imports -->
<script>
  console.log('🟢 [ReactiveApp-Step3] Component is being instantiated');

  import { onMount } from 'svelte';

  // VS Code API (working from Step 2)
  const vscode = (() => {
    if (window.vscode) {
      console.log('[ReactiveApp-Step3] Using globally available VS Code API');
      return window.vscode;
    } else if (window.acquireVsCodeApi) {
      console.log('[ReactiveApp-Step3] Acquiring VS Code API for the first time');
      const api = window.acquireVsCodeApi();
      window.vscode = api;
      return api;
    } else {
      console.warn('[ReactiveApp-Step3] No VS Code API available');
      return null;
    }
  })();

  // Step 3: Try to import just ONE store to see if stores are the problem
  // This import will cause the store_invalid_shape error if stores are the problem
  import { ui } from './store.svelte.ts';

  let storeImportError = null;

  try {
    console.log('[ReactiveApp-Step3] Store imported successfully');
    console.log('[ReactiveApp-Step3] UI store state:', ui);
  } catch (error) {
    console.error('[ReactiveApp-Step3] Store access failed:', error);
    storeImportError = error;
  }

  function triggerManualSignIn() {
    console.log('🚀 [ReactiveApp-Step3] Manual sign-in triggered');

    if (vscode) {
      vscode.postMessage({
        type: 'manualSignIn',
        timestamp: new Date().toISOString(),
      });
      console.log('✅ [ReactiveApp-Step3] Manual sign-in message sent via VS Code API');
    } else {
      console.warn('⚠️ [ReactiveApp-Step3] VS Code API not available for manual sign-in');
    }
  }

  onMount(() => {
    console.log('🟢 [ReactiveApp-Step3] Component mounted successfully');
    console.log('🔍 [ReactiveApp-Step3] VS Code API available:', !!vscode);
    console.log('🔍 [ReactiveApp-Step3] Store import error:', storeImportError);
  });
</script>

<!-- Step 3 template with store import testing -->
<div
  style="background: #9900cc; color: #ffffff; padding: 20px; margin: 10px; font-weight: bold; border: 3px solid #ffffff;"
>
  🟢 REACTIVEAPP STEP 3: STORE IMPORT TESTING
  <br />This tests whether store imports are causing the initialization error.
  <br />
  <button onclick={triggerManualSignIn}>🚀 Manual Sign In (Step 3)</button>
  <br />
  {#if storeImportError}
    <div style="background: #cc0000; padding: 10px; margin: 10px 0;">
      ❌ Store Import Error: {storeImportError.message}
    </div>
  {:else}
    <div style="background: #009900; padding: 10px; margin: 10px 0;">
      ✅ No store import errors detected
    </div>
  {/if}
</div>
