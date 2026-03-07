<!--
  design-dojo TabBar
  Keyboard-accessible tab navigation.
  Follows WAI-ARIA Authoring Practices for Tabs pattern.
-->
<script lang="ts">
  interface TabItem {
    id: string;
    label: string;
  }

  interface Props {
    tabs: TabItem[];
    activeId: string;
    'aria-label'?: string;
    onselect: (id: string) => void;
  }

  const {
    tabs,
    activeId,
    'aria-label': ariaLabel = 'Tabs',
    onselect,
  }: Props = $props();

  const sortedTabs = $derived(
    (tabs || []).slice().sort((a, b) => a.label.localeCompare(b.label))
  );

  const selectedIndex = $derived(sortedTabs.findIndex((t) => t.id === activeId));

  let tabRefs: HTMLButtonElement[] = $state([]);

  function focusAt(index: number) {
    const el = tabRefs[index];
    if (el) setTimeout(() => el.focus(), 0);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!sortedTabs.length) return;
    const last = sortedTabs.length - 1;
    let next = selectedIndex < 0 ? 0 : selectedIndex;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (selectedIndex + 1) % sortedTabs.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (selectedIndex - 1 + sortedTabs.length) % sortedTabs.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }

    e.preventDefault();
    const target = sortedTabs[next];
    if (target) {
      onselect(target.id);
      focusAt(next);
    }
  }
</script>

<div
  class="dojo-tab-bar"
  role="tablist"
  aria-label={ariaLabel}
  aria-orientation="horizontal"
  onkeydown={handleKeydown}
>
  {#each sortedTabs as tab, i}
    {@const isActive = tab.id === activeId}
    <button
      role="tab"
      aria-selected={isActive}
      tabindex={isActive ? 0 : -1}
      class="dojo-tab"
      class:dojo-tab--active={isActive}
      onclick={() => onselect(tab.id)}
      bind:this={tabRefs[i]}
    >
      {tab.label}
    </button>
  {/each}
</div>

<style>
  .dojo-tab-bar {
    display: flex;
    gap: var(--space-1);
    align-items: flex-end;
    padding: 0 var(--space-1);
    background: var(--color-tab-bar-bg);
    border-bottom: 1px solid var(--color-tab-bar-border);
  }

  .dojo-tab {
    position: relative;
    background: transparent;
    color: var(--color-tab-inactive-fg);
    border: none;
    padding: 0.45rem 0.75rem 0.35rem;
    font-size: var(--text-size-sm);
    font-family: var(--text-font-family);
    line-height: 1;
    cursor: pointer;
    border-top-left-radius: var(--radius-md);
    border-top-right-radius: var(--radius-md);
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    transition:
      color var(--motion-speed-normal) var(--motion-easing),
      background var(--motion-speed-normal) var(--motion-easing);
    white-space: nowrap;
  }

  .dojo-tab:hover {
    color: var(--color-tab-hover-fg);
    background: var(--color-tab-hover-bg);
  }

  .dojo-tab--active {
    background: var(--color-tab-active-bg);
    color: var(--color-tab-active-fg);
  }

  /* Active indicator bar */
  .dojo-tab--active::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 2px;
    background: var(--color-tab-active-border);
    border-radius: 1px;
  }

  .dojo-tab:focus-visible {
    outline: 1px solid var(--color-border-focus);
    outline-offset: -1px;
  }

  /* Subtle separator between inactive tabs */
  .dojo-tab:not(.dojo-tab--active)::before {
    content: '';
    position: absolute;
    right: 0;
    top: 25%;
    bottom: 25%;
    width: 1px;
    background: var(--color-tab-bar-border);
  }
  .dojo-tab:last-child::before {
    display: none;
  }
</style>
