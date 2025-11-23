<!--
Module: src/webview/components/Settings.svelte
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
  export let context: any;
  export let sendEvent: (event: any) => void;

  $: connections = context?.connections || [];
  $: activeConnectionId = context?.activeConnectionId;

  function handleAddConnection() {
    sendEvent({ type: 'ADD_CONNECTION' });
  }

  function handleEditConnection(connectionId: string) {
    sendEvent({ type: 'EDIT_CONNECTION', connectionId });
  }

  function handleDeleteConnection(connectionId: string) {
    sendEvent({ type: 'CONFIRM_DELETE_CONNECTION', connectionId });
  }

  import { createSelectConnection, webviewOwner } from '../selection.writer.internal.js';
  function handleSelectConnection(connectionId: string) {
    const evt = createSelectConnection(webviewOwner, connectionId);
    // Maintain compatibility with existing sendEvent wrapper: forward fsmEvent envelope
    sendEvent && sendEvent({ type: 'fsmEvent', event: evt });
  }

  function handleBack() {
    sendEvent({ type: 'CANCEL_CONNECTION_MANAGEMENT' });
  }
</script>

<div class="settings">
  <div class="header">
    <h2>Manage Connections</h2>
    <button onclick={handleBack}>Back</button>
  </div>

  <div class="content">
    {#if connections.length === 0}
      <div class="info">
        <p>No connections configured.</p>
        <button onclick={handleAddConnection}>Add Connection</button>
      </div>
    {:else}
      <div class="connections">
        {#each connections as conn (conn.id)}
          <div class="connection" class:active={conn.id === activeConnectionId}>
            <div class="connection-info">
              <div class="connection-label">
                {conn.label || `${conn.organization}/${conn.project}`}
              </div>
              <div class="connection-details">
                {conn.organization} / {conn.project}
              </div>
              {#if conn.authMethod}
                <div class="connection-auth">Auth: {conn.authMethod}</div>
              {/if}
            </div>
            <div class="connection-actions">
              {#if conn.id !== activeConnectionId}
                <button onclick={() => handleSelectConnection(conn.id)}>Activate</button>
              {/if}
              <button onclick={() => handleEditConnection(conn.id)}>Edit</button>
              <button onclick={() => handleDeleteConnection(conn.id)} class="danger">Delete</button
              >
            </div>
          </div>
        {/each}
      </div>
      <div class="footer">
        <button onclick={handleAddConnection}>Add Connection</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .settings {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--vscode-panel-border);
  }

  h2 {
    margin: 0;
    font-size: 1.2rem;
  }

  button {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    padding: 0.4rem 0.8rem;
    cursor: pointer;
    font-size: 0.9rem;
  }

  button:hover {
    background: var(--vscode-button-hoverBackground);
  }

  button.danger {
    background: var(--vscode-inputValidation-errorBackground);
  }

  button.danger:hover {
    background: var(--vscode-inputValidation-errorBorder);
  }

  .content {
    padding: 1rem 0;
  }

  .info {
    padding: 2rem;
    text-align: center;
    color: var(--vscode-descriptionForeground);
  }

  .connections {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .connection {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--vscode-list-inactiveSelectionBackground);
    border: 1px solid var(--vscode-panel-border);
  }

  .connection.active {
    border-color: var(--vscode-focusBorder);
    background: var(--vscode-list-activeSelectionBackground);
  }

  .connection-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .connection-label {
    font-weight: bold;
    font-size: 1rem;
  }

  .connection-details {
    color: var(--vscode-descriptionForeground);
    font-size: 0.9rem;
  }

  .connection-auth {
    color: var(--vscode-descriptionForeground);
    font-size: 0.85rem;
  }

  .connection-actions {
    display: flex;
    gap: 0.5rem;
  }

  .footer {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--vscode-panel-border);
  }
</style>
