<!--
  design-dojo Badge
  Inline coloured label for state, type, category, etc.
  Variants: default | success | warning | danger | info | muted
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
    size?: 'sm' | 'md';
    children: Snippet;
  }

  const { variant = 'default', size = 'sm', children }: Props = $props();
</script>

<span class="dojo-badge dojo-badge--{variant} dojo-badge--{size}">
  {@render children()}
</span>

<style>
  .dojo-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.2em;
    font-weight: 500;
    border-radius: var(--radius-pill);
    white-space: nowrap;
  }

  /* ── sizes ── */
  .dojo-badge--sm {
    padding: 0.1em 0.5em;
    font-size: var(--text-size-xs);
  }
  .dojo-badge--md {
    padding: 0.2em 0.6em;
    font-size: var(--text-size-sm);
  }

  /* ── variants ── */
  .dojo-badge--default {
    background: var(--color-badge-bg);
    color: var(--color-badge-fg);
  }
  .dojo-badge--success {
    background: var(--color-success-bg);
    color: var(--color-success-fg);
    border: 1px solid var(--color-success-border);
  }
  .dojo-badge--warning {
    background: var(--color-warning-bg);
    color: var(--color-warning-fg);
    border: 1px solid var(--color-warning-border);
  }
  .dojo-badge--danger {
    background: var(--color-danger-bg);
    color: var(--color-danger-fg);
    border: 1px solid var(--color-danger-border);
  }
  .dojo-badge--info {
    background: var(--color-info-bg);
    color: var(--color-info-fg);
    border: 1px solid var(--color-info-border);
  }
  .dojo-badge--muted {
    background: var(--color-surface-raised);
    color: var(--color-text-subtle);
  }
</style>
