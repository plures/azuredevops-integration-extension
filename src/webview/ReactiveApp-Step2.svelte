<!-- ReactiveApp Step 2: Add VS Code API integration -->
<script>
  console.log('🟢 [ReactiveApp-Step2] Component is being instantiated');

  import { onMount } from 'svelte';

  // Add VS Code API - using plain JavaScript to avoid TypeScript issues
  const vscode = (() => {
    if (window.vscode) {
      console.log('[ReactiveApp-Step2] Using globally available VS Code API');
      return window.vscode;
    } else if (window.acquireVsCodeApi) {
      console.log('[ReactiveApp-Step2] Acquiring VS Code API for the first time');
      const api = window.acquireVsCodeApi();
      window.vscode = api;
      return api;
    } else {
      console.warn('[ReactiveApp-Step2] No VS Code API available');
      return null;
    }
  })();

  function triggerManualSignIn() {
    console.log('🚀 [ReactiveApp-Step2] Manual sign-in triggered');

    if (vscode) {
      vscode.postMessage({
        type: 'manualSignIn',
        timestamp: new Date().toISOString(),
      });
      console.log('✅ [ReactiveApp-Step2] Manual sign-in message sent via VS Code API');
    } else {
      console.warn('⚠️ [ReactiveApp-Step2] VS Code API not available for manual sign-in');
    }
  }

  onMount(() => {
    console.log('🟢 [ReactiveApp-Step2] Component mounted successfully');
    console.log('🔍 [ReactiveApp-Step2] VS Code API available:', !!vscode);
  });
</script>

<!-- Step 2 template with VS Code API integration -->
<div
  style="background: #cc6600; color: #ffffff; padding: 20px; margin: 10px; font-weight: bold; border: 3px solid #ffffff;"
>
  🟢 REACTIVEAPP STEP 2: VS CODE API INTEGRATION
  <br />This adds VS Code API integration like the original ReactiveApp.
  <br />
  <button onclick={triggerManualSignIn}>🚀 Manual Sign In (Step 2)</button>
  <br />
  <small>Check console for VS Code API availability and message sending</small>
</div>
