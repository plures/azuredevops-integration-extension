<script lang="ts">
  export let context: any;
  export let sendEvent: (event: any) => void;
  
  $: timerState = context?.timerActor?.state || 'idle';
  $: activeConnectionId = context?.activeConnectionId;
  $: connections = context?.connections || [];
  $: activeConnection = connections.find((c: any) => c.id === activeConnectionId);
  
  function formatConnectionLabel(conn: any): string {
    if (!conn) return 'No connection';
    return conn.label || `${conn.organization}/${conn.project}`;
  }
</script>

<div class="status-bar">
  <div class="status-section">
    <span class="label">Connection:</span>
    <span class="value">{formatConnectionLabel(activeConnection)}</span>
  </div>
  
  {#if timerState !== 'idle'}
    <div class="status-section timer-active">
      <span class="label">Timer:</span>
      <span class="value">{timerState}</span>
    </div>
  {/if}
  
  <div class="status-section">
    <span class="label">State:</span>
    <span class="value">{typeof context?.fsmState === 'string' ? context.fsmState : JSON.stringify(context?.fsmState)}</span>
  </div>
</div>

<style>
  .status-bar {
    display: flex;
    gap: 2rem;
    padding: 0.5rem 1rem;
    background: var(--vscode-statusBar-background);
    color: var(--vscode-statusBar-foreground);
    border-top: 1px solid var(--vscode-panel-border);
    font-size: 0.85rem;
    position: sticky;
    bottom: 0;
  }
  
  .status-section {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  
  .label {
    opacity: 0.8;
  }
  
  .value {
    font-weight: 500;
  }
  
  .timer-active {
    color: var(--vscode-statusBarItem-prominentForeground);
    background: var(--vscode-statusBarItem-prominentBackground);
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
  }
</style>
