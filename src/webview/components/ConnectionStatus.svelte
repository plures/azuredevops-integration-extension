<!--
Module: src/webview/components/ConnectionStatus.svelte
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
  interface Props {
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

  const { connectionHealth, refreshStatus }: Props = $props();

  function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function getStatusColor(): string {
    if (!connectionHealth) return 'var(--vscode-descriptionForeground)';
    switch (connectionHealth.status) {
      case 'healthy':
        return 'var(--vscode-testing-iconPassed)';
      case 'error':
        return 'var(--vscode-errorForeground)';
      case 'warning':
        return 'var(--vscode-testing-iconQueued)';
      default:
        return 'var(--vscode-descriptionForeground)';
    }
  }

  function getStatusText(): string {
    if (!connectionHealth) return 'Unknown';
    switch (connectionHealth.status) {
      case 'healthy':
        return 'Connected';
      case 'error':
        return 'Connection Error';
      case 'warning':
        return 'Warning';
      default:
        return 'Unknown';
    }
  }

  function getRefreshStatusText(): string {
    if (!refreshStatus) return '';
    const timeAgo = formatTimeAgo(refreshStatus.lastAttempt);
    if (refreshStatus.success) {
      return `Last refresh: ${timeAgo}`;
    } else {
      return `Last refresh: Failed (${timeAgo})`;
    }
  }
</script>

<div class="connection-status">
  {#if connectionHealth}
    <div class="status-indicator" style="--status-color: {getStatusColor()}">
      <span class="status-dot"></span>
      <span class="status-text">{getStatusText()}</span>
    </div>
  {/if}
  {#if refreshStatus}
    <div class="refresh-status">
      <span class="refresh-icon">{refreshStatus.success ? '✓' : '✗'}</span>
      <span class="refresh-text">{getRefreshStatusText()}</span>
    </div>
  {/if}
</div>

<style>
  .connection-status {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.75rem;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--status-color);
    display: inline-block;
  }

  .status-text {
    color: var(--vscode-foreground);
    font-weight: 500;
  }

  .refresh-status {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: var(--vscode-descriptionForeground);
  }

  .refresh-icon {
    font-size: 0.875rem;
    opacity: 0.8;
  }

  .refresh-text {
    font-size: 0.75rem;
  }
</style>

