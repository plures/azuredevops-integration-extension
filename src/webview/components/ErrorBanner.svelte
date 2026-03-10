<!--
  Module: src/webview/components/ErrorBanner.svelte
  Owner: webview
  Reads: syncState from extension (ApplicationContext serialized)
  Writes: UI-only events; selection via selection writer factory (webview-owned)
  Receives: syncState, host broadcasts
  Emits: fsmEvent envelopes (Router handles stamping)
  Prohibitions: Do not import extension host modules; Do not define context types
  Rationale: Thin wrapper over design-dojo Alert for structured ADO error display.

  LLM-GUARD:
  - Use selection writer factory for selection updates
  - Do not route by connection here; let Router decide targets
-->
<script lang="ts">
  import Alert from '@ado-ext/ui-web/components/Alert.svelte';

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

  const alertType = $derived.by((): 'error' | 'warning' | 'info' => {
    if (error.type === 'authentication' || error.type === 'authorization') return 'warning';
    if (error.type === 'network') return 'info';
    return 'error';
  });

  const hint = $derived.by(() => {
    if (error.type === 'authentication') return 'Please update your credentials to continue.';
    if (error.type === 'network') return 'Check your internet connection and try again.';
    return undefined;
  });

  const actionLabel = $derived.by(() => {
    if (!error.recoverable) return undefined;
    if (error.suggestedAction) return error.suggestedAction;
    return error.type === 'authentication' ? 'Fix Authentication' : 'Retry';
  });

  function handleAction() {
    if (error.type === 'authentication' && onFixAuth) {
      onFixAuth();
    } else {
      onRetry?.();
    }
  }
</script>

{#if error}
  <Alert
    type={alertType}
    message={error.message}
    {hint}
    actionLabel={error.recoverable ? actionLabel : undefined}
    dismissible={!!onDismiss}
    onaction={handleAction}
    ondismiss={onDismiss}
  />
{/if}
