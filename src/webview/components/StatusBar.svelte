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

{#if timerState !== 'idle'}
  <div class="status-bar">
    <div class="status-section timer-active">
      <span class="label">Timer:</span>
      <span class="value">{timerState}</span>
    </div>
  </div>
{/if}

<style>
  .status-bar {
    display: flex;
    gap: 1rem;
    padding: 0.35rem 0.75rem;
    background: var(--vscode-statusBar-background);
    color: var(--vscode-statusBar-foreground);
    border-top: 1px solid var(--vscode-panel-border);
    font-size: 0.75rem;
    position: sticky;
    bottom: 0;
  }

  .status-section {
    display: flex;
    gap: 0.4rem;
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
