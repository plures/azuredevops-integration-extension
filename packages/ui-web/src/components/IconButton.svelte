<!--
  design-dojo IconButton
  An accessible icon-only button.
  aria-label is REQUIRED for accessibility.
-->
<script lang="ts">
  interface Props {
    'aria-label': string;
    title?: string;
    disabled?: boolean;
    active?: boolean;
    type?: 'button' | 'submit' | 'reset';
    onclick?: (e: MouseEvent) => void;
    /** The icon character / codicon glyph to render. */
    icon: string;
  }

  const {
    'aria-label': ariaLabel,
    title,
    disabled = false,
    active = false,
    type = 'button',
    onclick,
    icon,
  }: Props = $props();
</script>

<button
  class="dojo-icon-btn"
  class:dojo-icon-btn--active={active}
  {type}
  {disabled}
  aria-label={ariaLabel}
  aria-pressed={active || undefined}
  title={title ?? ariaLabel}
  {onclick}
>
  <span class="dojo-icon-btn__icon" aria-hidden="true">{icon}</span>
</button>

<style>
  .dojo-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    margin: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;
    color: var(--vscode-icon-foreground, var(--color-text-default));
    transition:
      background var(--motion-speed-normal) var(--motion-easing),
      color var(--motion-speed-normal) var(--motion-easing),
      border-color var(--motion-speed-normal) var(--motion-easing);
  }

  .dojo-icon-btn:hover:not(:disabled) {
    background: var(--color-action-ghost-hover-bg);
  }

  .dojo-icon-btn:active:not(:disabled) {
    background: var(--color-action-ghost-active-bg);
  }

  .dojo-icon-btn--active {
    background: var(--color-action-ghost-hover-bg);
    color: var(--color-text-link);
    border-color: var(--color-border-focus);
  }

  .dojo-icon-btn:focus-visible {
    outline: 1px solid var(--color-border-focus);
    outline-offset: 1px;
  }

  .dojo-icon-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .dojo-icon-btn__icon {
    font-size: 1rem;
    line-height: 1;
    display: block;
  }
</style>
