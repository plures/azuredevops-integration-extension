<!--
Module: src/webview/components/KanbanBoard.svelte
Owner: webview
Reads: syncState from extension (ApplicationContext serialized)
Writes: UI-only events; selection via selection writer factory (webview-owned)
Receives: syncState, host broadcasts
Emits: fsmEvent envelopes (Router handles stamping)
Prohibitions: Do not import extension host modules; Do not define context types
Rationale: Svelte UI component; reacts to ApplicationContext and forwards intents

LLM-GUARD:
- Use selection writer factory for selection updates
- Do not route by connection here; let Router decide targets
-->
<script lang="ts">
  interface Props {
    context: any;
    sendEvent: (event: any) => void;
  }

  const { context, sendEvent }: Props = $props();

  // CRITICAL: Filter work items to only show those for the active connection
  // This ensures work items from one connection are never shown when another connection's tab is selected
  const activeConnectionId = $derived(context?.activeConnectionId);
  const allWorkItems = $derived(context?.workItems || context?.pendingWorkItems?.workItems || []);
  const pendingWorkItemsConnectionId = $derived(context?.pendingWorkItems?.connectionId);
  const workItems = $derived.by(() => {
    // If pendingWorkItems has a connectionId, filter by it
    if (pendingWorkItemsConnectionId) {
      // Only show work items if they belong to the active connection
      if (pendingWorkItemsConnectionId === activeConnectionId) {
        return allWorkItems;
      }
      // If pendingWorkItems is for a different connection, return empty array
      return [];
    }
    // Fallback: if no connectionId in pendingWorkItems, only show if activeConnectionId matches
    // This is a safety check - ideally all work items should have connectionId
    return activeConnectionId ? allWorkItems : [];
  });
  
  const columns = $derived(context?.kanbanColumns || []);
  const timerState = $derived(context?.timerState);

  // Create a map of work items by ID for quick lookup
  const workItemsMap = $derived.by(() => {
    const map = new Map();
    workItems.forEach((item: any) => {
      if (item?.id) {
        map.set(String(item.id), item);
      }
    });
    return map;
  });

  // Helper functions (same as WorkItemList)
  function getWorkItemTypeIcon(type: string): string {
    const t = String(type || '').toLowerCase();
    if (t.includes('bug')) return '\uf41d';
    if (t.includes('task')) return '\uf0f7';
    if (t.includes('story') || t.includes('user story')) return '\uf413';
    if (t.includes('feature')) return '\uf0e7';
    if (t.includes('epic')) return '\uf0f2';
    return '\uf0c5';
  }

  function getPriorityClass(priority: any): string {
    const p = Number(priority) || 3;
    if (p === 1) return 'priority-1';
    if (p === 2) return 'priority-2';
    if (p === 3) return 'priority-3';
    if (p === 4) return 'priority-4';
    return 'priority-3';
  }

  function handleItemClick(item: any, event: Event) {
    event.stopPropagation();
    // Open work item in browser or show details
    sendEvent({ type: 'OPEN_IN_BROWSER', workItemId: item.id });
  }

  function handleStartTimer(item: any, event: Event) {
    event.stopPropagation();
    if (timerState?.workItemId === item.id && timerState?.state !== 'idle') {
      sendEvent({ type: 'STOP_TIMER' });
    } else {
      sendEvent({
        type: 'START_TIMER_INTERACTIVE',
        workItemId: item.id,
        workItemTitle: item.fields?.['System.Title'],
      });
    }
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
              {@const item = workItemsMap.get(String(id))}
              {#if item}
                <div
                  class="kanban-item"
                  role="button"
                  tabindex="0"
                  onclick={(e) => handleItemClick(item, e)}
                  onkeydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleItemClick(item, e);
                    }
                  }}
                >
                  <div class="kanban-item-header">
                    <span class="type-icon">{getWorkItemTypeIcon(item.fields?.['System.WorkItemType'])}</span>
                    <span class="item-id">#{item.id}</span>
                    <span class="priority {getPriorityClass(item.fields?.['Microsoft.VSTS.Common.Priority'])}">
                      P{item.fields?.['Microsoft.VSTS.Common.Priority'] || '3'}
                    </span>
                  </div>
                  <div class="kanban-item-title">
                    {item.fields?.['System.Title'] || `Work Item #${item.id}`}
                  </div>
                  <div class="kanban-item-meta">
                    <span class="meta-badge type">{item.fields?.['System.WorkItemType'] || 'Task'}</span>
                    {#if item.fields?.['System.AssignedTo']}
                      <span class="meta-badge assignee">
                        {item.fields['System.AssignedTo'].displayName || item.fields['System.AssignedTo']}
                      </span>
                    {/if}
                    {#if timerState?.workItemId === item.id}
                      <span class="meta-badge timer-badge" title="Timer Active">⏱</span>
                    {/if}
                  </div>
                  <div class="kanban-item-actions">
                    <button
                      class="action-btn"
                      onclick={(e) => handleStartTimer(item, e)}
                      title={timerState?.workItemId === item.id ? 'Stop Timer' : 'Start Timer'}
                    >
                      <span class="codicon">{timerState?.workItemId === item.id ? '⏹' : '▶'}</span>
                    </button>
                    <button
                      class="action-btn"
                      onclick={(e) => { e.stopPropagation(); sendEvent({ type: 'OPEN_IN_BROWSER', workItemId: item.id }); }}
                      title="Open in Azure DevOps"
                    >
                      <span class="codicon">🌐</span>
                    </button>
                  </div>
                </div>
              {:else}
                <!-- Fallback if work item not found -->
                <div class="kanban-item kanban-item-placeholder">
                  <span>#{id}</span>
                </div>
              {/if}
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
    border: 1px solid var(--vscode-panel-border);
    padding: 0.6rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    transition: background 0.15s ease;
  }
  .kanban-item:hover {
    background: var(--vscode-list-hoverBackground);
    border-color: var(--vscode-focusBorder);
  }
  .kanban-item-header {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
  }
  .type-icon {
    font-family: 'codicon';
    font-size: 0.9rem;
    color: var(--vscode-icon-foreground);
  }
  .item-id {
    font-weight: 600;
    color: var(--vscode-textLink-foreground);
  }
  .priority {
    margin-left: auto;
    padding: 0.1rem 0.3rem;
    border-radius: 2px;
    font-size: 0.7rem;
    font-weight: 500;
  }
  .priority.priority-1 {
    background: var(--vscode-inputValidation-errorBackground);
    color: var(--vscode-inputValidation-errorForeground);
  }
  .priority.priority-2 {
    background: var(--vscode-inputValidation-warningBackground);
    color: var(--vscode-inputValidation-warningForeground);
  }
  .priority.priority-3,
  .priority.priority-4 {
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
  }
  .kanban-item-title {
    font-weight: 500;
    color: var(--vscode-foreground);
    line-height: 1.3;
    word-wrap: break-word;
  }
  .kanban-item-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    font-size: 0.75rem;
  }
  .meta-badge {
    padding: 0.15rem 0.4rem;
    border-radius: 2px;
    font-size: 0.7rem;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
  }
  .meta-badge.type {
    background: var(--vscode-textPreformat-background);
    color: var(--vscode-textPreformat-foreground);
  }
  .meta-badge.assignee {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
  }
  .meta-badge.timer-badge {
    background: var(--vscode-progressBar-background);
    color: var(--vscode-badge-foreground);
  }
  .kanban-item-actions {
    display: flex;
    gap: 0.3rem;
    margin-top: 0.2rem;
  }
  .action-btn {
    background: transparent;
    border: 1px solid var(--vscode-button-border, transparent);
    color: var(--vscode-foreground);
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s ease;
  }
  .action-btn:hover {
    background: var(--vscode-button-hoverBackground, var(--vscode-list-hoverBackground));
  }
  .action-btn .codicon {
    font-family: 'codicon';
    font-size: 0.85rem;
  }
  .kanban-item-placeholder {
    opacity: 0.5;
    font-style: italic;
    text-align: center;
  }
  .empty {
    text-align: center;
    padding: 1rem;
    font-style: italic;
    color: var(--vscode-descriptionForeground);
  }
</style>
