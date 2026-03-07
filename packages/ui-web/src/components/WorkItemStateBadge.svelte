<!--
  design-dojo WorkItemStateBadge
  Renders a colour-coded badge for an Azure DevOps work item state.
  Maps well-known state names to semantic token colours.
-->
<script lang="ts">
  interface Props {
    state: string;
  }

  const { state }: Props = $props();

  const normalised = $derived((state || '').toLowerCase().trim());

  /** Map normalised state names to a CSS class suffix. */
  const stateClass = $derived.by(() => {
    if (
      normalised === 'new' ||
      normalised === 'proposed' ||
      normalised === 'to do'
    ) {
      return 'new';
    }
    if (
      normalised === 'active' ||
      normalised === 'in progress' ||
      normalised === 'committed'
    ) {
      return 'active';
    }
    if (normalised === 'resolved' || normalised === 'done') {
      return 'resolved';
    }
    if (normalised === 'closed' || normalised === 'completed') {
      return 'closed';
    }
    if (normalised === 'removed') {
      return 'removed';
    }
    return 'default';
  });
</script>

<span class="dojo-state-badge dojo-state-badge--{stateClass}">
  {state}
</span>

<style>
  .dojo-state-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.1em 0.45em;
    font-size: var(--text-size-xs);
    font-weight: 500;
    border-radius: var(--radius-pill);
    white-space: nowrap;
  }

  .dojo-state-badge--new {
    background: var(--ado-state-new-bg);
    color: var(--ado-state-new-fg);
  }
  .dojo-state-badge--active {
    background: var(--ado-state-active-bg);
    color: var(--ado-state-active-fg);
  }
  .dojo-state-badge--resolved {
    background: var(--ado-state-resolved-bg);
    color: var(--ado-state-resolved-fg);
  }
  .dojo-state-badge--closed {
    background: var(--ado-state-closed-bg);
    color: var(--ado-state-closed-fg);
  }
  .dojo-state-badge--removed {
    background: var(--ado-state-removed-bg);
    color: var(--ado-state-removed-fg);
  }
  .dojo-state-badge--default {
    background: var(--color-surface-raised);
    color: var(--color-text-subtle);
  }
</style>
