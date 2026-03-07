<!--
  design-dojo Alert
  Inline banner for error, warning, info, and success messages.
  Replaces bespoke ErrorBanner and inline error divs.
-->
<script lang="ts">
  interface Props {
    type: 'error' | 'warning' | 'info' | 'success';
    message: string;
    hint?: string;
    /** Label for the primary action button (if any). */
    actionLabel?: string;
    /** Whether a dismiss button is shown. */
    dismissible?: boolean;
    onaction?: () => void;
    ondismiss?: () => void;
  }

  const {
    type,
    message,
    hint,
    actionLabel,
    dismissible = false,
    onaction,
    ondismiss,
  }: Props = $props();

  const iconMap: Record<string, string> = {
    error: '⚠',
    warning: '⚠',
    info: 'ℹ',
    success: '✓',
  };

  const icon = $derived(iconMap[type] ?? 'ℹ');
</script>

<div class="dojo-alert dojo-alert--{type}" role="alert">
  <div class="dojo-alert__body">
    <span class="dojo-alert__icon" aria-hidden="true">{icon}</span>
    <div class="dojo-alert__text">
      <span class="dojo-alert__message">{message}</span>
      {#if hint}
        <span class="dojo-alert__hint">{hint}</span>
      {/if}
    </div>
  </div>
  <div class="dojo-alert__actions">
    {#if actionLabel && onaction}
      <button type="button" class="dojo-alert__btn dojo-alert__btn--action" onclick={onaction}>
        {actionLabel}
      </button>
    {/if}
    {#if dismissible && ondismiss}
      <button
        type="button"
        class="dojo-alert__btn dojo-alert__btn--dismiss"
        onclick={ondismiss}
        aria-label="Dismiss"
        title="Dismiss"
      >
        ✕
      </button>
    {/if}
  </div>
</div>

<style>
  .dojo-alert {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-2);
    font-size: var(--text-size-sm);
  }

  .dojo-alert__body {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    flex: 1;
    min-width: 0;
  }

  .dojo-alert__icon {
    flex-shrink: 0;
    font-size: 1rem;
    line-height: 1.2;
  }

  .dojo-alert__text {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }

  .dojo-alert__message {
    font-weight: 600;
  }

  .dojo-alert__hint {
    opacity: 0.85;
    font-size: var(--text-size-xs);
  }

  .dojo-alert__actions {
    display: flex;
    gap: var(--space-1);
    align-items: center;
    flex-shrink: 0;
  }

  .dojo-alert__btn {
    padding: 0.15rem 0.5rem;
    font-size: var(--text-size-xs);
    border-radius: var(--radius-sm);
    cursor: pointer;
    background: transparent;
    transition: background var(--motion-speed-normal) var(--motion-easing);
  }
  .dojo-alert__btn:focus-visible {
    outline: 1px solid var(--color-border-focus);
    outline-offset: 1px;
  }

  /* ── type variants ── */
  .dojo-alert--error {
    background: var(--color-danger-bg);
    border: 1px solid var(--color-danger-border);
    color: var(--color-danger-fg);
  }
  .dojo-alert--error .dojo-alert__btn {
    border: 1px solid var(--color-danger-border);
    color: var(--color-danger-fg);
  }
  .dojo-alert--error .dojo-alert__btn:hover {
    background: var(--color-danger-border);
  }

  .dojo-alert--warning {
    background: var(--color-warning-bg);
    border: 1px solid var(--color-warning-border);
    color: var(--color-warning-fg);
  }
  .dojo-alert--warning .dojo-alert__btn {
    border: 1px solid var(--color-warning-border);
    color: var(--color-warning-fg);
  }
  .dojo-alert--warning .dojo-alert__btn:hover {
    background: var(--color-warning-border);
  }

  .dojo-alert--info {
    background: var(--color-info-bg);
    border: 1px solid var(--color-info-border);
    color: var(--color-info-fg);
  }
  .dojo-alert--info .dojo-alert__btn {
    border: 1px solid var(--color-info-border);
    color: var(--color-info-fg);
  }
  .dojo-alert--info .dojo-alert__btn:hover {
    background: var(--color-info-border);
  }

  .dojo-alert--success {
    background: var(--color-success-bg);
    border: 1px solid var(--color-success-border);
    color: var(--color-success-fg);
  }
  .dojo-alert--success .dojo-alert__btn {
    border: 1px solid var(--color-success-border);
    color: var(--color-success-fg);
  }
  .dojo-alert--success .dojo-alert__btn:hover {
    background: var(--color-success-border);
  }
</style>
