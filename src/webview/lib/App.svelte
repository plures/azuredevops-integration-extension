<script lang="ts" context="module">
  // Type declaration for VS Code webview API acquisition helper
  // (Only for TypeScript type checking; runtime provided by VS Code environment)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  declare const acquireVsCodeApi: undefined | (()=>any);
</script>

<script lang="ts">
  import WorkItems from './components/WorkItems.svelte';
  import Timer from './components/Timer.svelte';

  // VS Code webview messaging bridge (bootstrap sets window.vscode once)
  const vscode: any = (window as any).vscode || (typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined);

  let workItems: any[] = [];
  let kanbanView = false;
  let timer: any = undefined;

  function handleMessage(event: MessageEvent) {
    const msg = event.data;
    switch(msg?.type) {
      case 'workItemsLoaded':
        workItems = msg.workItems || [];
        kanbanView = !!msg.kanbanView;
        break;
      case 'timerUpdate':
        timer = msg.timer;
        break;
      case 'restoreFilters':
        // TODO: integrate filters UI
        break;
      case 'selfTestPing': {
        const signature = `items:${workItems.length};timer:${timer? '1':'0'}`;
        vscode?.postMessage({ type: 'selfTestAck', nonce: msg.nonce, signature });
        break;
      }
    }
  }
  window.addEventListener('message', handleMessage);

  console.log('[webview] App script loaded');
  // Handshake so extension can resend state if initial messages were missed
  setTimeout(()=>{ vscode?.postMessage({ type: 'webviewReady' }); }, 0);

  function refresh() { vscode?.postMessage({ type: 'refresh' }); }
  function startTimer(item: any) { vscode?.postMessage({ type: 'startTimer', id: item.fields?.['System.Id'] }); }
</script>

<style>
  :global(body) {
    margin: 0;
    font-family: var(--vscode-font-family, sans-serif);
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
  }
  header { display:flex; gap:.5rem; align-items:center; padding:.5rem 1rem; border-bottom:1px solid var(--vscode-editorWidget-border); }
  button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border:none; padding: .4rem .8rem; cursor:pointer; }
  button:hover { background: var(--vscode-button-hoverBackground); }
  main { display:flex; gap:1rem; padding:1rem; }
    .column { flex: 1; min-width: 0; }
    .column.narrow { max-width: 280px; }
    .app-title { flex: 1; margin: 0; }
</style>

<header>
    <h3 class="app-title">Azure DevOps</h3>
  <button on:click={refresh}>Refresh</button>
</header>
<main>
  <div class="column">
    <WorkItems {workItems} {kanbanView} on:startTimer={(e:any)=>startTimer(e.detail)} />
  </div>
    <div class="column narrow">
    <Timer {timer} />
  </div>
</main>
