<!-- DebugApp.svelte - Simple test component -->
<script>
  import { onMount } from 'svelte';

  let mounted = $state(false);
  let timestamp = $state('');

  onMount(() => {
    mounted = true;
    timestamp = new Date().toISOString();
    console.log('[DebugApp] Component mounted successfully');
  });
</script>

<div
  style="padding: 20px; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); font-family: var(--vscode-font-family);"
>
  <h1>🎉 Webview Debug Test</h1>

  <div style="margin: 10px 0;">
    <strong>Status:</strong>
    {mounted ? '✅ Mounted' : '⏳ Loading...'}
  </div>

  <div style="margin: 10px 0;">
    <strong>Timestamp:</strong>
    {timestamp}
  </div>

  <div style="margin: 10px 0;">
    <strong>Svelte Version:</strong> 5.x (Runes)
  </div>

  <div style="margin: 10px 0;">
    <strong>Integration:</strong> FSM + Svelte 5 + VS Code
  </div>

  <button
    style="padding: 8px 16px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer;"
    onclick={() => {
      console.log('[DebugApp] Test button clicked');
      window.vscode?.postMessage({ type: 'debug', message: 'Webview is working!' });
    }}
  >
    Test VS Code Communication
  </button>

  <div
    style="margin-top: 20px; padding: 10px; background: rgba(0,120,212,0.1); border-left: 3px solid var(--vscode-button-background);"
  >
    <strong>✅ If you can see this, the webview is loading correctly!</strong>
    <br />
    Next step: Check browser console for any JS errors.
  </div>
</div>
