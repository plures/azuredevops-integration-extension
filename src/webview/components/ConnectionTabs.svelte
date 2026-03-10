<!--
  Module: src/webview/components/ConnectionTabs.svelte
  Owner: webview
  Reads: syncState from extension (ApplicationContext serialized)
  Writes: UI-only events; selection via selection writer factory (webview-owned)
  Receives: syncState, host broadcasts
  Emits: fsmEvent envelopes (Router handles stamping)
  Prohibitions: Do not import extension host modules; Do not define context types
  Rationale: Svelte 5 runes component; delegates tab rendering to design-dojo TabBar.

  LLM-GUARD:
  - Use selection writer factory for selection updates
  - Do not route by connection here; let Router decide targets
-->
<script lang="ts">
  import TabBar from '@ado-ext/ui-web/components/TabBar.svelte';
  import { createSelectConnection, webviewOwner } from '../selection.writer.internal.js';

  interface Props {
    connections: Array<{ id: string; label?: string }>;
    activeConnectionId: string | undefined;
  }

  const { connections, activeConnectionId }: Props = $props();

  const vscode = (window as any).__vscodeApi;

  // Normalise connections into TabBar-compatible shape, sorted by label.
  const tabs = $derived(
    (connections || []).map((c) => ({ id: c.id, label: c.label || c.id }))
  );

  function handleSelect(id: string) {
    if (!vscode) return;
    const evt = createSelectConnection(webviewOwner, id);
    vscode.postMessage({ type: 'fsmEvent', event: evt });
  }
</script>

<TabBar
  {tabs}
  activeId={activeConnectionId ?? ''}
  aria-label="Project Connections"
  onselect={handleSelect}
/>
