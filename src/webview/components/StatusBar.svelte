<!--
Module: src/webview/components/StatusBar.svelte
Owner: webview
Reads: syncState from extension (ApplicationContext serialized)
Writes: UI-only events; selection via selection writer factory (webview-owned)
Receives: syncState, host broadcasts
Emits: appEvent envelopes (Router handles stamping)
Prohibitions: Do not import extension host modules; Do not define context types
Rationale: Svelte UI component; reacts to ApplicationContext and forwards intents

LLM-GUARD:
- Use selection writer factory for selection updates
- Do not route by connection here; let Router decide targets
-->
<script lang="ts">
  import ConnectionStatus from './ConnectionStatus.svelte';

  interface Connection {
    id: string;
    label?: string;
    organization?: string;
    project?: string;
  }

  interface TimerActor {
    state?: string;
  }

  interface UIState {
    connectionHealth?: {
      status: 'healthy' | 'error' | 'warning' | 'unknown';
      lastSuccess?: number;
      lastFailure?: number;
    };
    refreshStatus?: {
      lastAttempt: number;
      success: boolean;
      error?: string;
      nextAutoRefresh?: number;
    };
  }

  interface Context {
    timerActor?: TimerActor;
    activeConnectionId?: string;
    connections?: Connection[];
    ui?: UIState;
  }

  interface Props {
    context: Context;
  }

  const { context }: Props = $props();

  // Use $derived instead of $: reactive statements (Svelte 5 best practice)
  const timerState = $derived(context?.timerActor?.state || 'idle');
  const activeConnectionId = $derived(context?.activeConnectionId);
  const connections = $derived(context?.connections || []);
  const activeConnection = $derived.by(() =>
    connections.find((c) => c.id === activeConnectionId)
  );
  const uiState = $derived(context?.ui);
  const connectionHealth = $derived(uiState?.connectionHealth);
  const refreshStatus = $derived(uiState?.refreshStatus);

  function formatConnectionLabel(conn: Connection | undefined): string {
    if (!conn) return 'No connection';
    if (conn.label) return conn.label;
    if (conn.organization && conn.project) {
      return `${conn.organization}/${conn.project}`;
    }
    return conn.id;
  }
</script>

<div class="status-bar">
  {#if activeConnection}
    <div class="status-section connection-info">
      <span class="label">Connection:</span>
      <span class="value">{formatConnectionLabel(activeConnection)}</span>
    </div>
  {/if}
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

  .connection-info {
    color: var(--vscode-foreground);
  }

  .timer-active {
    color: var(--vscode-statusBarItem-prominentForeground);
    background: var(--vscode-statusBarItem-prominentBackground);
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
  }
</style>
