<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let type: 'success' | 'error' | 'info' | 'warning' = 'info';
  export let message: string;

  const dispatch = createEventDispatcher();

  function dismiss() {
    dispatch('dismiss');
  }

  // Auto-dismiss after 5 seconds for success/info
  if (type === 'success' || type === 'info') {
    setTimeout(dismiss, 5000);
  }
</script>

<div class="notification {type}" role="alert">
  <span class="message">{message}</span>
  <button class="close-btn" on:click={dismiss} aria-label="Close">×</button>
</div>

<style>
  .notification {
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 300px;
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  }

  .success {
    background-color: var(--vscode-notificationsInfoIcon-foreground, #3794ff);
    color: white;
  }

  .error {
    background-color: var(--vscode-notificationsErrorIcon-foreground, #f14c4c);
    color: white;
  }

  .info {
    background-color: var(--vscode-notificationsInfoIcon-foreground, #3794ff);
    color: white;
  }

  .warning {
    background-color: var(--vscode-notificationsWarningIcon-foreground, #cca700);
    color: white;
  }

  .message {
    flex-grow: 1;
    margin-right: 12px;
  }

  .close-btn {
    background: none;
    border: none;
    color: inherit;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    opacity: 0.8;
  }

  .close-btn:hover {
    opacity: 1;
  }

  @keyframes slideIn {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>
