<!--
Module: src/webview/components/StatusBar.svelte
Owner: webview
Reads: syncState from extension (ApplicationContext serialized)
Writes: UI-only events; selection via selection writer factory (webview-owned)
Receives: syncState, host broadcasts
Emits: fsmEvent envelopes (Router handles stamping)
Prohibitions: Do not import extension host modules; Do not define context types
Rationale: Svelte UI component; reacts to ApplicationContext and forwards intents

LLM-GUARD:
- Use selection writer factory for selection updates
- Do not route by connection here; let Router decide targets
-->
<script lang="ts">
  import ConnectionStatus from './ConnectionStatus.svelte';

  export let context: any;

  $: timerState = context?.timerActor?.state || 'idle';
  $: activeConnectionId = context?.activeConnectionId;
  $: connections = context?.connections || [];
  $: activeConnection = connections.find((c: any) => c.id === activeConnectionId);
  $: uiState = context?.ui;
  $: connectionHealth = uiState?.connectionHealth;
  $: refreshStatus = uiState?.refreshStatus;

  function formatConnectionLabel(conn: any): string {
    if (!conn) return 'No connection';
    return conn.label || `${conn.organization}/${conn.project}`;
  }
</script>

<div class="status-bar">
  {#if connectionHealth || refreshStatus}
    <ConnectionStatus {connectionHealth} {refreshStatus} />
  {/if}
  {#if timerState !== 'idle'}
    <div class="status-section timer-active">
      <span class="label">Timer:</span>
      <span class="value">{timerState}</span>
    </div>
  {/if}
</div>

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
