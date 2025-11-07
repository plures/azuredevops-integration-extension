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
  const workItems = $derived(context?.workItems || context?.pendingWorkItems?.workItems || []);
  const hasWorkItems = $derived(workItems.length > 0);

  // Check if PAT error should be shown (only if it's for the active connection)
  const showPatError = $derived(
    workItemsError && workItemsErrorConnectionId === activeConnectionId
  );

  // Check if device code should be shown (only if session exists, not expired, for active connection, and work items NOT loaded)
  const showDeviceCode = $derived(
    deviceCodeSession &&
      !deviceCodeExpired &&
      deviceCodeSession.connectionId === activeConnectionId &&
      !hasWorkItems
  );

  // Get VS Code API instance
  const vscode = (window as any).__vscodeApi;

  function copyAndOpenDeviceCode() {
    if (!deviceCodeSession) return;
    // Delegate browser launch + clipboard to extension (webview sandbox limitations)
    vscode?.postMessage({
      type: 'openDeviceCodeBrowser',
      payload: { connectionId: deviceCodeSession.connectionId },
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
</script>

{#if showPatError}
  <!-- PAT Reauth Banner -->
  <div class="auth-reminder-banner error">
    <span class="auth-icon">⚠</span>
    <span class="auth-message">{workItemsError}</span>
    <button class="auth-action" onclick={handleRetry}>Retry</button>
    <button class="auth-action secondary" onclick={handleOpenSettings}>Settings</button>
  </div>
{:else if showDeviceCode}
  <!-- Entra Device Code Banner -->
  <div class="auth-reminder-banner warning">
    <span class="auth-icon">🔐</span>
    <span class="auth-message">
      Authentication Required: Enter code <strong>{deviceCodeSession.userCode}</strong> in your
      browser ({deviceCodeExpiresInMinutes}m left)
    </span>
    <button class="auth-action" onclick={copyAndOpenDeviceCode}>Copy & Open</button>
    <button class="auth-action secondary" onclick={handleCancelDeviceCode}>Cancel</button>
  </div>
{/if}

<style>
  .auth-reminder-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    color: var(--vscode-foreground);
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

  .auth-message {
    flex: 1;
    font-size: 0.9rem;
  }

  .auth-message strong {
    font-family: monospace;
    font-weight: 600;
  }

  .auth-action {
    padding: 0.35rem 0.7rem;
    font-size: 0.85rem;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 3px;
    cursor: pointer;
  }

  .auth-action:hover {
    background: var(--vscode-button-hoverBackground);
  }

  .auth-action.secondary {
    background: var(--vscode-button-secondaryBackground, var(--vscode-button-background));
    color: var(--vscode-button-secondaryForeground, var(--vscode-button-foreground));
  }

  .auth-action.secondary:hover {
    background: var(--vscode-button-secondaryHoverBackground, var(--vscode-button-hoverBackground));
  }
</style>

