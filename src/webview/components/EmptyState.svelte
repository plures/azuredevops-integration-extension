<!--
  Module: src/webview/components/EmptyState.svelte
  Owner: webview
  Reads: syncState from extension (ApplicationContext serialized)
  Writes: UI-only events; selection via selection writer factory (webview-owned)
  Receives: syncState, host broadcasts
  Emits: fsmEvent envelopes (Router handles stamping)
  Prohibitions: Do not import extension host modules; Do not define context types
  Rationale: Thin wrapper over design-dojo EmptyState and Alert for ADO-specific empty/error UI.

  LLM-GUARD:
  - Use selection writer factory for selection updates
  - Do not route by connection here; let Router decide targets
-->
<script lang="ts">
  import DojoEmptyState from '@ado-ext/ui-web/components/EmptyState.svelte';
  import Alert from '@ado-ext/ui-web/components/Alert.svelte';

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

  const alertType = $derived.by((): 'error' | 'warning' | 'info' => {
    if (!error) return 'error';
    if (error.type === 'authentication' || error.type === 'authorization') return 'warning';
    if (error.type === 'network') return 'info';
    return 'error';
  });

  const actionLabel = $derived.by(() => {
    if (!error?.recoverable) return undefined;
    if (error.suggestedAction) return error.suggestedAction;
    return error.type === 'authentication' ? 'Re-authenticate' : 'Retry';
  });

  function handleAction() {
    if (error?.type === 'authentication' && onFixAuth) {
      onFixAuth();
    } else {
      onRetry?.();
    }
  }
</script>

{#if hasError && error}
  <Alert
    type={alertType}
    message={error.message}
    actionLabel={error.recoverable ? actionLabel : undefined}
    onaction={handleAction}
  />
{:else}
  <DojoEmptyState
    icon="📋"
    heading="No work items found"
    description="Select a query or refresh to view work items."
  />
{/if}
