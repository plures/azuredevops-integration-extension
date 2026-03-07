<!--
  design-dojo Button
  Variants: primary | secondary | ghost | danger
  Sizes:    sm | md | lg
  Supports: disabled, loading, type (submit/button/reset)
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    type?: 'button' | 'submit' | 'reset';
    'aria-label'?: string;
    'aria-pressed'?: boolean;
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
  }

  const {
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    type = 'button',
    'aria-label': ariaLabel,
    'aria-pressed': ariaPressed,
    onclick,
    children,
  }: Props = $props();
</script>

<button
  class="dojo-btn dojo-btn--{variant} dojo-btn--{size}"
  class:dojo-btn--loading={loading}
  {type}
  disabled={disabled || loading}
  aria-label={ariaLabel}
  aria-pressed={ariaPressed}
  aria-busy={loading || undefined}
  {onclick}
>
  {#if loading}
    <span class="dojo-btn__spinner" aria-hidden="true"></span>
  {/if}
  {@render children()}
</button>

<style>
  .dojo-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    font-family: var(--text-font-family);
    font-weight: 500;
    border: 1px solid var(--color-action-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition:
      background var(--motion-speed-normal) var(--motion-easing),
      border-color var(--motion-speed-normal) var(--motion-easing),
      color var(--motion-speed-normal) var(--motion-easing);
    white-space: nowrap;
    user-select: none;
    position: relative;
  }

  /* ── sizes ── */
  .dojo-btn--sm {
    padding: 0.2rem 0.5rem;
    font-size: var(--text-size-sm);
  }
  .dojo-btn--md {
    padding: 0.35rem 0.75rem;
    font-size: var(--text-size-md);
  }
  .dojo-btn--lg {
    padding: 0.5rem 1rem;
    font-size: var(--text-size-base);
  }

  /* ── variants ── */
  .dojo-btn--primary {
    background: var(--color-action-primary-bg);
    color: var(--color-action-primary-fg);
  }
  .dojo-btn--primary:hover:not(:disabled) {
    background: var(--color-action-primary-hover-bg);
  }

  .dojo-btn--secondary {
    background: var(--color-action-secondary-bg);
    color: var(--color-action-secondary-fg);
  }
  .dojo-btn--secondary:hover:not(:disabled) {
    background: var(--color-action-secondary-hover-bg);
  }

  .dojo-btn--ghost {
    background: transparent;
    color: var(--color-text-default);
    border-color: transparent;
  }
  .dojo-btn--ghost:hover:not(:disabled) {
    background: var(--color-action-ghost-hover-bg);
  }
  .dojo-btn--ghost:active:not(:disabled) {
    background: var(--color-action-ghost-active-bg);
  }

  .dojo-btn--danger {
    background: var(--color-danger-bg);
    color: var(--color-danger-fg);
    border-color: var(--color-danger-border);
  }
  .dojo-btn--danger:hover:not(:disabled) {
    background: var(--color-danger-fg);
    color: #fff;
  }

  /* ── states ── */
  .dojo-btn:focus-visible {
    outline: 1px solid var(--color-border-focus);
    outline-offset: 1px;
  }
  .dojo-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ── spinner ── */
  .dojo-btn__spinner {
    display: inline-block;
    width: 0.8em;
    height: 0.8em;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: var(--radius-pill);
    animation: dojo-spin 0.6s linear infinite;
  }
  @keyframes dojo-spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
