<!--
Module: src/webview/components/EmptyState.svelte
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
  interface Props {
    hasError: boolean;
    error?: {
      message: string;
      type: 'authentication' | 'network' | 'authorization' | 'server';
      recoverable: boolean;
      suggestedAction?: string;
    };
    onRetry?: () => void;
    onFixAuth?: () => void;
  }

  const { hasError, error, onRetry, onFixAuth }: Props = $props();

  function handleAction() {
    if (error?.type === 'authentication' && onFixAuth) {
      onFixAuth();
    } else if (onRetry) {
      onRetry();
    }
  }

  function getActionLabel(): string {
    if (error?.suggestedAction) {
      return error.suggestedAction;
    }
    if (error?.type === 'authentication') {
      return 'Re-authenticate';
    }
    return 'Retry';
  }
</script>

<div class="empty-state">
  {#if hasError && error}
    <div class="empty-state-content error">
      <div class="empty-state-icon">⚠️</div>
      <h3 class="empty-state-title">Unable to load work items</h3>
      <p class="empty-state-message">{error.message}</p>
      {#if error.recoverable}
        <button class="empty-state-action" onclick={handleAction}>
          {getActionLabel()}
        </button>
      {/if}
    </div>
  {:else}
    <div class="empty-state-content">
      <div class="empty-state-icon">📋</div>
      <h3 class="empty-state-title">No work items</h3>
      <p class="empty-state-message">Select a query or connection to view work items.</p>
    </div>
  {/if}
</div>

<style>
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    padding: 2rem;
  }

  .empty-state-content {
    text-align: center;
    max-width: 400px;
  }

  .empty-state-content.error {
    color: var(--vscode-errorForeground);
  }

  .empty-state-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.6;
  }

  .empty-state-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    color: var(--vscode-foreground);
  }

  .empty-state-message {
    font-size: 0.875rem;
    color: var(--vscode-descriptionForeground);
    margin: 0 0 1.5rem 0;
    line-height: 1.5;
  }

  .empty-state-action {
    padding: 0.5rem 1rem;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 3px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .empty-state-action:hover {
    background: var(--vscode-button-hoverBackground);
  }
</style>

