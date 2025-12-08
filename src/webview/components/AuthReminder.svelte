<!--
Module: src/webview/components/AuthReminder.svelte
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
    context: any;
    sendEvent: (event: any) => void;
  }

  const { context, sendEvent }: Props = $props();

  // Device code session reactive bindings
  const deviceCodeSession = $derived(context?.deviceCodeSession);
  const deviceCodeRemainingMs = $derived(
    deviceCodeSession ? Math.max(deviceCodeSession.expiresAt - Date.now(), 0) : 0
  );
  const deviceCodeExpiresInMinutes = $derived(
    deviceCodeSession ? Math.ceil(deviceCodeRemainingMs / 60000) : 0
  );
  const deviceCodeExpired = $derived(
    deviceCodeSession ? deviceCodeRemainingMs <= 0 : true
  );

  // PAT error reactive bindings
  const workItemsError = $derived(context?.workItemsError);
  const workItemsErrorConnectionId = $derived(context?.workItemsErrorConnectionId);
  const activeConnectionId = $derived(context?.activeConnectionId);
  // const workItems = $derived(context?.workItems || context?.pendingWorkItems?.workItems || []);
  // const hasWorkItems = $derived(workItems.length > 0);

  // Get connection health error from UI state
  const uiState = $derived(context?.ui);
  const connectionHealth = $derived(uiState?.connectionHealth);
  const connectionHealthError = $derived(connectionHealth?.lastError);
  const hasConnectionHealthError = $derived(
    connectionHealth?.status === 'error' &&
    connectionHealthError &&
    connectionHealthError.type === 'authentication'
  );

  // Get active connection to check auth method
  const connections = $derived(context?.connections || []);
  const activeConnection = $derived(connections.find((c: any) => c.id === activeConnectionId));
  const isEntraAuth = $derived(activeConnection?.authMethod === 'entra');

  // Check if PAT error should be shown (only if it's for the active connection)
  const showPatError = $derived(
    workItemsError && 
    workItemsErrorConnectionId === activeConnectionId &&
    !isEntraAuth // Don't show PAT error for Entra connections
  );

  // Base flags (avoid circular derivations)
  const canShowDeviceCodeBase = $derived(
    deviceCodeSession &&
      !deviceCodeExpired &&
      deviceCodeSession.connectionId === activeConnectionId
  );
  const entraAuthErrorEligible = $derived(
    hasConnectionHealthError && !!activeConnectionId && isEntraAuth
  );

  // Final visibility flags - prioritize device code over error
  const showDeviceCode = $derived(Boolean(canShowDeviceCodeBase));
  const showEntraAuthError = $derived(Boolean(entraAuthErrorEligible && !showDeviceCode));

  function copyAndOpenDeviceCode() {
    if (!deviceCodeSession) return;
    // Delegate browser launch + clipboard to extension (webview sandbox limitations)
    sendEvent({
      type: 'OPEN_DEVICE_CODE_BROWSER',
      connectionId: deviceCodeSession.connectionId,
    });
  }

  function handleRetry() {
    sendEvent({ type: 'REFRESH_DATA' });
  }

  function handleOpenSettings() {
    sendEvent({ type: 'OPEN_SETTINGS' });
  }

  function handleCancelDeviceCode() {
    if (deviceCodeSession) {
      sendEvent({
        type: 'SIGN_OUT_ENTRA',
        connectionId: deviceCodeSession.connectionId,
      });
    }
  }

  function handleRetryEntraAuth() {
    if (activeConnectionId) {
      // Trigger re-authentication for the active connection
      // This will trigger the connection machine to start interactive auth
      sendEvent({ 
        type: 'AUTHENTICATION_REQUIRED', 
        connectionId: activeConnectionId 
      });
    }
  }
</script>

{#if showEntraAuthError}
  <!-- Entra Auth Failure Banner -->
  <div class="auth-reminder-banner error">
    <span class="auth-icon">⚠️</span>
    <div class="auth-message">
      <strong>Authentication Failed</strong>
      <span class="error-detail">
        {connectionHealthError?.message || 'Entra ID authentication failed. Device code flow completed but re-authentication failed.'}
      </span>
      {#if connectionHealthError?.suggestedAction}
        <span class="error-hint">Suggested: {connectionHealthError.suggestedAction}</span>
      {/if}
    </div>
    <div class="auth-actions">
      <button class="auth-action" onclick={handleRetryEntraAuth}>
        {connectionHealthError?.suggestedAction || 'Re-authenticate'}
      </button>
      <button class="auth-action secondary" onclick={handleOpenSettings}>Settings</button>
    </div>
  </div>
{:else if showPatError}
  <!-- PAT Reauth Banner -->
  <div class="auth-reminder-banner error">
    <span class="auth-icon">⚠</span>
    <span class="auth-message">{workItemsError}</span>
    <div class="auth-actions">
      <button class="auth-action" onclick={handleRetry}>Retry</button>
      <button class="auth-action secondary" onclick={handleOpenSettings}>Settings</button>
    </div>
  </div>
{:else if showDeviceCode}
  <!-- Entra Device Code Banner -->
  <div class="auth-reminder-banner warning">
    <span class="auth-icon">🔐</span>
    <div class="auth-message-container">
      <span class="auth-message">
        Authentication Required: Enter code <strong>{deviceCodeSession.userCode}</strong> in your
        browser ({deviceCodeExpiresInMinutes}m left)
      </span>
    </div>
    <div class="auth-actions">
      <button
        class="auth-action"
        onclick={copyAndOpenDeviceCode}
        title="Copy code and open browser"
        aria-label="Copy code and open browser"
      >
        <span class="codicon">📋</span>
      </button>
      <button
        class="auth-action secondary"
        onclick={handleCancelDeviceCode}
        title="Cancel authentication"
        aria-label="Cancel authentication"
      >
        <span class="codicon">✗</span>
      </button>
    </div>
  </div>
{/if}

<style>
  .auth-reminder-banner {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    color: var(--vscode-foreground);
    max-width: 100%;
    box-sizing: border-box;
  }

  .auth-reminder-banner.error {
    background: var(--vscode-inputValidation-errorBackground);
    border: 1px solid var(--vscode-inputValidation-errorBorder);
    color: var(--vscode-errorForeground);
  }

  .auth-reminder-banner.warning {
    background: var(--vscode-inputValidation-warningBackground);
    border: 1px solid var(--vscode-inputValidation-warningBorder);
    color: var(--vscode-foreground);
  }

  .auth-icon {
    font-size: 1.2rem;
    flex-shrink: 0;
  }

  .auth-message-container {
    flex: 1 1 0;
    min-width: 0;
    max-width: 100%;
  }

  .auth-message {
    font-size: 0.9rem;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  div.auth-message {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .auth-message strong {
    font-weight: 600;
    font-size: 0.95rem;
  }

  .error-detail {
    font-size: 0.85rem;
    opacity: 0.9;
  }

  .error-hint {
    font-size: 0.8rem;
    font-style: italic;
    opacity: 0.8;
    margin-top: 0.25rem;
  }

  .auth-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
    flex-wrap: wrap;
    align-items: center;
    flex-basis: auto;
  }

  /* Force buttons to wrap below text when space is limited */
  /* Stack vertically on smaller/medium screens to prevent overflow */
  @media (max-width: 800px) {
    .auth-reminder-banner {
      flex-direction: column;
      align-items: stretch;
    }

    .auth-message-container {
      width: 100%;
      max-width: 100%;
      margin-bottom: 0.5rem;
    }

    .auth-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }

  .auth-action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    margin: 0;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    color: var(--vscode-icon-foreground);
    transition: background-color 0.2s ease;
  }

  .auth-action:hover {
    background: var(--vscode-toolbar-hoverBackground);
  }

  .auth-action:active {
    background: var(--vscode-toolbar-activeBackground);
  }

  .auth-action .codicon {
    font-family: 'codicon';
    font-size: 16px;
    font-weight: normal;
    font-style: normal;
    line-height: 1;
    display: inline-block;
    text-decoration: none;
    text-rendering: auto;
    text-align: center;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    user-select: none;
  }

  .auth-action.secondary {
    opacity: 0.8;
  }

  .auth-action.secondary:hover {
    opacity: 1;
  }
</style>

