<script lang="ts">
  export let context: any;
  export let sendEvent: (event: any) => void;
  $: columns = context?.kanbanColumns || [];
  function handleRefreshColumn() {
    sendEvent({ type: 'REFRESH_DATA' });
  }
</script>

<div class="kanban-board">
  {#if columns.length === 0}
    <div class="empty">No columns available – load work items or switch view.</div>
  {:else}
    <div class="columns">
      {#each columns as col (col.id)}
        <div class="column">
          <div class="column-header">
            <h3>{col.title}</h3>
            <span class="count">{col.itemIds.length}</span>
          </div>
          <div class="items">
            {#each col.itemIds as id (id)}
              <button
                type="button"
                class="kanban-item"
                aria-label={`Work item ${id}`}
                on:click={() => console.log('[Kanban] select', id)}>#{id}</button
              >
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .kanban-board {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .columns {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
  }
  .column {
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  h3 {
    margin: 0;
    font-size: 0.95rem;
  }
  .count {
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    padding: 0 0.4rem;
    border-radius: 1rem;
    font-size: 0.75rem;
  }
  .items {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .kanban-item {
    background: var(--vscode-list-inactiveSelectionBackground);
    padding: 0.4rem 0.5rem;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.8rem;
  }
  .kanban-item:hover {
    background: var(--vscode-list-hoverBackground);
  }
  .empty {
    text-align: center;
    padding: 1rem;
    font-style: italic;
    color: var(--vscode-descriptionForeground);
  }
</style>
