<script lang="ts">
  import { toasts, removeToast } from './toastStore';
  interface Props {
    ariaLabel?: string;
  }

  let { ariaLabel = 'Notifications' }: Props = $props();
</script>

<div class="toast-region" role="region" aria-live="polite" aria-label={ariaLabel}>
  {#each $toasts as t (t.id)}
    <div class="toast {t.type}" role="status">
      <div class="msg">{t.message}</div>
      <button
        class="close"
        title="Dismiss"
        aria-label="Dismiss notification"
        onclick={() => removeToast(t.id)}>&times;</button
      >
    </div>
  {/each}
</div>

<style>
  .toast-region {
    position: fixed;
    bottom: 12px;
    right: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 1000;
    max-width: 360px;
    pointer-events: none; /* allow clicks to underlying except inside toast */
  }
  .toast {
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-editorWidget-border);
    padding: 10px 12px 10px 14px;
    border-left: 4px solid var(--vscode-editorWidget-border);
    border-radius: 6px;
    color: var(--vscode-editor-foreground);
    font-size: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    display: flex;
    align-items: flex-start;
    gap: 10px;
    pointer-events: auto;
    animation: fadeIn 160ms ease;
  }
  .toast.info {
    border-left-color: var(--ado-blue);
  }
  .toast.success {
    border-left-color: var(--state-resolved);
  }
  .toast.warning {
    border-left-color: var(--ado-orange);
  }
  .toast.error {
    border-left-color: var(--ado-red);
  }
  .toast .msg {
    flex: 1;
    line-height: 1.3;
  }
  .toast button.close {
    border: none;
    background: transparent;
    color: var(--vscode-editor-foreground);
    cursor: pointer;
    font-size: 14px;
    padding: 0 4px;
    line-height: 1;
    border-radius: 3px;
  }
  .toast button.close:hover {
    background: var(--vscode-toolbar-hoverBackground);
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
