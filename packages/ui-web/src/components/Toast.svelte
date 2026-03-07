<!--
  design-dojo Toast
  Animated toast notification that auto-dismisses.
  Replaces bespoke Notification.svelte.
-->
<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    type?: 'success' | 'error' | 'info' | 'warning';
    message: string;
    /** Auto-dismiss after this many milliseconds (0 = never). Defaults to 5000 for success/info. */
    duration?: number;
    ondismiss?: () => void;
  }

  const { type = 'info', message, duration, ondismiss }: Props = $props();

  const bgMap: Record<string, string> = {
    success: 'var(--color-success-fg)',
    error: 'var(--color-danger-fg)',
    info: 'var(--color-info-fg)',
    warning: 'var(--color-warning-fg)',
  };

  const bg = $derived(bgMap[type] ?? bgMap.info);

  const autoDismissMs = $derived(
    duration !== undefined ? duration : type === 'success' || type === 'info' ? 5000 : 0
  );

  function dismiss() {
    ondismiss?.();
  }

  onMount(() => {
    if (autoDismissMs > 0) {
      const timer = setTimeout(dismiss, autoDismissMs);
      return () => clearTimeout(timer);
    }
    return undefined;
  });
</script>

<div
  class="dojo-toast dojo-toast--{type}"
  style="--_toast-bg: {bg}"
  role="alert"
  aria-live="polite"
>
  <span class="dojo-toast__message">{message}</span>
  <button
    type="button"
    class="dojo-toast__close"
    onclick={dismiss}
    aria-label="Dismiss notification"
    title="Dismiss"
  >
    ×
  </button>
</div>

<style>
  .dojo-toast {
    position: fixed;
    bottom: 1.25rem;
    right: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: 0.75rem 1rem;
    border-radius: var(--radius-lg);
    min-width: 18rem;
    max-width: 25rem;
    box-shadow: var(--shadow-md);
    z-index: 1000;
    background: var(--_toast-bg, var(--color-info-fg));
    color: #fff;
    font-size: var(--text-size-sm);
    animation: dojo-toast-in var(--motion-speed-slow) var(--motion-easing);
  }

  @keyframes dojo-toast-in {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .dojo-toast__message {
    flex: 1;
  }

  .dojo-toast__close {
    background: none;
    border: none;
    color: inherit;
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    opacity: 0.85;
    transition: opacity var(--motion-speed-fast);
  }
  .dojo-toast__close:hover {
    opacity: 1;
  }
  .dojo-toast__close:focus-visible {
    outline: 1px solid rgba(255, 255, 255, 0.8);
    outline-offset: 1px;
    border-radius: var(--radius-sm);
  }
</style>
