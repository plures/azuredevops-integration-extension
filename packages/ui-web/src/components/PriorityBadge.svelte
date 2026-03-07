<!--
  design-dojo PriorityBadge
  Renders a colour-coded badge for an Azure DevOps work item priority (1–4).
-->
<script lang="ts">
  const PRIORITY_LABELS: Record<number, string> = {
    1: 'Critical',
    2: 'High',
    3: 'Medium',
    4: 'Low',
  };

  interface Props {
    priority: number | string;
    showLabel?: boolean;
  }

  const { priority, showLabel = true }: Props = $props();

  const p = $derived(Number(priority) || 3);
  const clamped = $derived(p >= 1 && p <= 4 ? p : 3);
  const label = $derived(PRIORITY_LABELS[clamped] ?? 'Medium');
</script>

<span
  class="dojo-priority-badge dojo-priority-badge--p{clamped}"
  title="Priority {clamped}: {label}"
>
  <span class="dojo-priority-badge__num" aria-hidden="true">P{clamped}</span>
  {#if showLabel}
    <span class="dojo-priority-badge__label">{label}</span>
  {/if}
</span>

<style>
  .dojo-priority-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.2em;
    padding: 0.1em 0.45em;
    font-size: var(--text-size-xs);
    font-weight: 600;
    border-radius: var(--radius-pill);
    white-space: nowrap;
  }

  .dojo-priority-badge__label {
    display: inline-block;
    max-width: 6ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dojo-priority-badge--p1 {
    background: var(--ado-priority-1-bg);
    color: var(--ado-priority-1-fg);
  }
  .dojo-priority-badge--p2 {
    background: var(--ado-priority-2-bg);
    color: var(--ado-priority-2-fg);
  }
  .dojo-priority-badge--p3 {
    background: var(--ado-priority-3-bg);
    color: var(--ado-priority-3-fg);
  }
  .dojo-priority-badge--p4 {
    background: var(--ado-priority-4-bg);
    color: var(--ado-priority-4-fg);
  }
</style>
