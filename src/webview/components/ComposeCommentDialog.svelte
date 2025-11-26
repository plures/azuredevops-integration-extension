<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let workItemId: number;
  export let mode: string = 'addComment';

  let comment = '';
  let isSubmitting = false;

  const dispatch = createEventDispatcher();

  function cancel() {
    dispatch('cancel');
  }

  function submit() {
    if (!comment.trim()) return;
    isSubmitting = true;
    dispatch('submit', { workItemId, comment, mode });
  }
</script>

<div class="modal-overlay">
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <h3 id="modal-title">Add Comment to Work Item #{workItemId}</h3>
    
    <div class="content">
      <textarea
        bind:value={comment}
        placeholder="Type your comment here..."
        rows="5"
        disabled={isSubmitting}
      ></textarea>
    </div>

    <div class="actions">
      <button class="secondary" on:click={cancel} disabled={isSubmitting}>Cancel</button>
      <button class="primary" on:click={submit} disabled={isSubmitting || !comment.trim()}>
        {isSubmitting ? 'Submitting...' : 'Add Comment'}
      </button>
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background-color: var(--vscode-editor-background);
    border: 1px solid var(--vscode-widget-border);
    border-radius: 6px;
    padding: 20px;
    width: 500px;
    max-width: 90%;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
  }

  h3 {
    margin-top: 0;
    margin-bottom: 16px;
    color: var(--vscode-foreground);
  }

  textarea {
    width: 100%;
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 2px;
    padding: 8px;
    font-family: inherit;
    resize: vertical;
    box-sizing: border-box;
  }

  textarea:focus {
    outline: 1px solid var(--vscode-focusBorder);
    border-color: var(--vscode-focusBorder);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 16px;
  }

  button {
    padding: 6px 14px;
    border-radius: 2px;
    cursor: pointer;
    font-size: 13px;
    border: 1px solid transparent;
  }

  button.primary {
    background-color: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
  }

  button.primary:hover:not(:disabled) {
    background-color: var(--vscode-button-hoverBackground);
  }

  button.secondary {
    background-color: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
  }

  button.secondary:hover:not(:disabled) {
    background-color: var(--vscode-button-secondaryHoverBackground);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
