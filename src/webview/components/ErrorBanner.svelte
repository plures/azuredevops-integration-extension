<!--
Module: src/webview/components/ErrorBanner.svelte
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
    error: {
      message: string;
      type: 'authentication' | 'network' | 'authorization' | 'server';
      recoverable: boolean;
      suggestedAction?: string;
    };
    onRetry?: () => void;
    onFixAuth?: () => void;
    onDismiss?: () => void;
  }

  const { error, onRetry, onFixAuth, onDismiss }: Props = $props();

  function handleAction() {
    if (error.type === 'authentication' && onFixAuth) {
      onFixAuth();
    } else if (onRetry) {
      onRetry();
    }
  }

  function getActionLabel(): string {
    if (error.suggestedAction) {
      return error.suggestedAction;
    }
    if (error.type === 'authentication') {
      return 'Fix Authentication';
    }
    return 'Retry';
  }
</script>

{#if error}
  <div class="error-banner" role="alert">
    <div class="error-content">
      <span class="error-icon">⚠️</span>
      <div class="error-message">
        <strong>{error.message}</strong>
        {#if error.type === 'authentication'}
          <span class="error-hint">Please update your credentials to continue.</span>
        {:else if error.type === 'network'}
          <span class="error-hint">Check your internet connection and try again.</span>
        {/if}
      </div>
    </div>
    <div class="error-actions">
      {#if error.recoverable}
        <button class="action-button primary" onclick={handleAction}>
          {getActionLabel()}
        </button>
      {/if}
      {#if onDismiss}
        <button class="action-button secondary" onclick={onDismiss} title="Dismiss">
          ✕
        </button>
      {/if}
    </div>
  </div>
{/if}

<style>
  .error-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: var(--vscode-inputValidation-errorBackground);
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    color: var(--vscode-errorForeground);
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .error-content {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    flex: 1;
  }

  .error-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .error-message {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .error-message strong {
    font-weight: 600;
  }

  .error-hint {
    font-size: 0.875rem;
    opacity: 0.9;
  }

  .error-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-shrink: 0;
  }

  .action-button {
    padding: 0.375rem 0.75rem;
    border: 1px solid transparent;
    border-radius: 3px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .action-button.primary {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
  }

  .action-button.primary:hover {
    background: var(--vscode-button-hoverBackground);
  }

  .action-button.secondary {
    background: transparent;
    color: var(--vscode-foreground);
    border-color: var(--vscode-input-border);
    padding: 0.25rem 0.5rem;
    min-width: 1.5rem;
  }

  .action-button.secondary:hover {
    background: var(--vscode-list-hoverBackground);
  }
</style>

