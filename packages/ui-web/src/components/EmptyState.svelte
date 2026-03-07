<!--
  design-dojo EmptyState
  Centred empty state with icon, heading and optional action.
-->
<script lang="ts">
  interface Props {
    icon?: string;
    heading: string;
    description?: string;
    actionLabel?: string;
    onaction?: () => void;
  }

  const { icon = '○', heading, description, actionLabel, onaction }: Props = $props();
</script>

<div class="dojo-empty-state" role="status">
  {#if icon}
    <span class="dojo-empty-state__icon" aria-hidden="true">{icon}</span>
  {/if}
  <p class="dojo-empty-state__heading">{heading}</p>
  {#if description}
    <p class="dojo-empty-state__description">{description}</p>
  {/if}
  {#if actionLabel && onaction}
    <button class="dojo-empty-state__btn" onclick={onaction}>
      {actionLabel}
    </button>
  {/if}
</div>

<style>
  .dojo-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-8) var(--space-4);
    text-align: center;
    color: var(--color-text-subtle);
  }

  .dojo-empty-state__icon {
    font-size: 2rem;
    opacity: 0.5;
    display: block;
    margin-bottom: var(--space-1);
  }

  .dojo-empty-state__heading {
    margin: 0;
    font-size: var(--text-size-md);
    font-weight: 500;
    color: var(--color-text-default);
  }

  .dojo-empty-state__description {
    margin: 0;
    font-size: var(--text-size-sm);
    max-width: 28ch;
    line-height: 1.5;
  }

  .dojo-empty-state__btn {
    margin-top: var(--space-2);
    padding: 0.35rem 0.75rem;
    font-size: var(--text-size-sm);
    background: var(--color-action-primary-bg);
    color: var(--color-action-primary-fg);
    border: 1px solid var(--color-action-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background var(--motion-speed-normal) var(--motion-easing);
  }
  .dojo-empty-state__btn:hover {
    background: var(--color-action-primary-hover-bg);
  }
  .dojo-empty-state__btn:focus-visible {
    outline: 1px solid var(--color-border-focus);
    outline-offset: 1px;
  }
</style>
