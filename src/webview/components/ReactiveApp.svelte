<script lang="ts">
  import { appState } from '../store.svelte.js';

  declare function acquireVsCodeApi(): any;
  const vscode = acquireVsCodeApi();

  // All UI actions now simply post a message to the extension FSM
  function postEvent(type: string, payload: any = {}) {
    vscode.postMessage({ type, payload });
  }

  // Derived values from the central appState
  let workItems = $derived(appState.context.workItems ?? []);
  let connectionsList = $derived(
    appState.context.organizations.flatMap((org) => org.projects.flatMap((p) => p.connections)) ??
      []
  );
  let currentConnection = $derived(
    appState.context.currentProject?.connections.find(
      (c) => c.id === appState.context.currentOrganization?.id
    ) ?? null
  );
  let workItemCount = $derived(workItems.length);
  let hasItems = $derived(workItemCount > 0);
  let isLoading = $derived(appState.fsmState.includes('loading'));
  let errorMsg = $derived(appState.context.error?.message ?? '');

  // Local UI state
  let kanbanView = $state(false);
  let selectedItems = $state(new Set());

  function handleConnectionChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    postEvent('SELECT_CONNECTION', { connectionId: target.value });
  }

  function handleQueryChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    postEvent('SELECT_QUERY', { query: target.value });
  }

  function handleStartTimer(workItemId: number) {
    postEvent('START_TIMER', { workItemId });
  }

  function handleStopTimer() {
    postEvent('STOP_TIMER');
  }

  function handleItemAction(action: string, item: any) {
    switch (action) {
      case 'start':
        handleStartTimer(item.id);
        break;
      case 'view':
        postEvent('VIEW_ITEM', { itemId: item.id });
        break;
      case 'edit':
        postEvent('EDIT_ITEM', { itemId: item.id });
        break;
    }
  }

  function onRefreshData() {
    postEvent('REFRESH_DATA');
  }

  function onWorkItemCreate() {
    postEvent('CREATE_WORK_ITEM');
  }

  function onRetry() {
    postEvent('RETRY');
  }

  function toggleKanbanView() {
    kanbanView = !kanbanView;
  }

  function toggleItemSelection(id: number) {
    if (selectedItems.has(id)) {
      selectedItems.delete(id);
    } else {
      selectedItems.add(id);
    }
    selectedItems = new Set(selectedItems);
  }

  function clearSelection() {
    selectedItems.clear();
    selectedItems = new Set();
  }

  // Kanban helpers
  function normalizeState(raw: string) {
    if (!raw) return 'new';
    const s = String(raw).toLowerCase().trim().replace(/\s+/g, '-');
    if (['new', 'to-do', 'todo', 'proposed'].includes(s)) return 'new';
    if (['active', 'in-progress', 'inprogress', 'doing'].includes(s)) return 'inprogress';
    if (['resolved', 'done', 'closed', 'completed'].includes(s)) return 'closed';
    return s;
  }

  function getWorkItemTypeIcon(type: string) {
    const t = String(type || '').toLowerCase();
    if (t.includes('bug')) return '🐞';
    if (t.includes('task')) return '✅';
    if (t.includes('story')) return '📖';
    if (t.includes('feature')) return '🚀';
    if (t.includes('epic')) return '🏔️';
    return '📄';
  }

  function getPriorityClass(priority: number) {
    const p = Number(priority) || 3;
    if (p === 1) return 'priority-1';
    if (p === 2) return 'priority-2';
    if (p === 3) return 'priority-3';
    if (p === 4) return 'priority-4';
    return 'priority-3';
  }
</script>

<div class="pane">
  <!-- Connection Tabs -->
  {#if connectionsList && connectionsList.length > 1}
    <div class="connection-tabs" role="tablist" aria-label="Project connections">
      {#each connectionsList as connection}
        <button
          class="connection-tab"
          class:active={connection.id === currentConnection?.id}
          on:click={() => postEvent('SELECT_CONNECTION', { connectionId: connection.id })}
          role="tab"
          aria-selected={connection.id === currentConnection?.id}
          title={connection.label}
        >
          {connection.label}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Main Header -->
  <div class="pane-header" role="toolbar" aria-label="Work Items actions">
    <span style="font-weight:600;">Work Items</span>
    {#if isLoading}
      <span class="spinner" role="status" aria-label="Loading" title="Loading"></span>
    {/if}
    <span class="count">{workItemCount}</span>

    <span class="actions" style="margin-left:auto;">
      <button on:click={onRefreshData} title="Refresh work items (R)" aria-label="Refresh">
        <span class="codicon codicon-refresh"></span>
      </button>
      <button on:click={toggleKanbanView} title="Toggle view (V)" aria-label="Toggle Kanban view">
        <span class="codicon codicon-{kanbanView ? 'list-unordered' : 'organization'}"></span>
      </button>
      <button
        on:click={onWorkItemCreate}
        title="Create work item"
        aria-label="Create new work item"
      >
        <span class="codicon codicon-add"></span>
      </button>
      {#if selectedItems.size > 0}
        <button
          on:click={clearSelection}
          title="Clear selection (Esc)"
          aria-label="Clear selection"
        >
          <span class="codicon codicon-close"></span>
          {selectedItems.size}
        </button>
      {/if}
    </span>
  </div>

  <!-- Work Items Content -->
  <div class="pane-body">
    {#if errorMsg}
      <div class="error-banner" role="alert">
        <div>{errorMsg}</div>
        <button on:click={onRetry}>Retry</button>
      </div>
    {:else if isLoading}
      <div class="loading">
        <span class="spinner" role="status" aria-label="Loading"></span> Loading work items…
      </div>
    {:else if !hasItems}
      <div class="empty">
        <div>No work items to display.</div>
        <button on:click={onRefreshData}>Refresh</button>
      </div>
    {:else if kanbanView}
      <!-- Kanban Board View -->
      <div class="kanban-board" aria-label="Kanban board">
        <div class="kanban-column">
          <div class="kanban-column-header">
            <h3>Work Items</h3>
            <span class="item-count">{workItemCount}</span>
          </div>
          <div class="kanban-column-content">
            {#each workItems as item}
              <div
                class="work-item-card kanban-card {selectedItems.has(Number(item.id))
                  ? 'selected'
                  : ''}"
              >
                <div class="work-item-header">
                  <input
                    type="checkbox"
                    class="work-item-checkbox"
                    checked={selectedItems.has(Number(item.id))}
                    on:click={() => toggleItemSelection(Number(item.id))}
                    aria-label="Select work item #{item.id}"
                  />
                  <span class="work-item-type-icon"
                    >{getWorkItemTypeIcon(item.fields?.['System.WorkItemType'])}</span
                  >
                  <span class="work-item-id">#{item.id}</span>
                </div>

                <div class="work-item-content">
                  <div class="work-item-title">
                    {item.fields?.['System.Title'] || `Work Item #${item.id}`}
                  </div>
                  <div class="work-item-meta">
                    <span class="work-item-type"
                      >{item.fields?.['System.WorkItemType'] || 'Task'}</span
                    >
                    <span
                      class="work-item-state state-{normalizeState(item.fields?.['System.State'])}"
                    >
                      {item.fields?.['System.State'] || 'New'}
                    </span>
                  </div>
                </div>

                <div class="work-item-actions">
                  <button
                    class="action-btn start compact"
                    on:click={() => handleItemAction('start', item)}
                    title="Start timer"
                    aria-label={`Start timer for #${item.id}`}
                  >
                    <span class="codicon codicon-play" aria-hidden="true"></span>
                  </button>
                  <button
                    class="action-btn view compact"
                    on:click={() => handleItemAction('view', item)}
                    title="View"
                    aria-label={`View work item #${item.id}`}
                  >
                    <span class="codicon codicon-eye" aria-hidden="true"></span>
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {:else}
      <!-- List View -->
      <div class="items" aria-label="Work items">
        {#each workItems as item, index}
          <div
            class="work-item-card {selectedItems.has(Number(item.id)) ? 'selected' : ''}"
            tabindex="0"
            role="button"
            data-index={index}
            aria-label={`Work item #${item.id}: ${item.fields?.['System.Title']} - use action buttons to interact`}
          >
            <div class="work-item-header">
              <input
                type="checkbox"
                class="work-item-checkbox"
                checked={selectedItems.has(Number(item.id))}
                on:click={() => toggleItemSelection(Number(item.id))}
                aria-label="Select work item #{item.id}"
              />
              <span class="work-item-type-icon"
                >{getWorkItemTypeIcon(item.fields?.['System.WorkItemType'])}</span
              >
              <span class="work-item-id">#{item.id}</span>
              <span
                class="work-item-priority {getPriorityClass(
                  item.fields?.['Microsoft.VSTS.Common.Priority']
                )}"
              >
                {item.fields?.['Microsoft.VSTS.Common.Priority'] || '3'}
              </span>
            </div>

            <div class="work-item-content">
              <div class="work-item-title">
                {item.fields?.['System.Title'] || `Work Item #${item.id}`}
              </div>
              <div class="work-item-meta">
                <span class="work-item-type">{item.fields?.['System.WorkItemType'] || 'Task'}</span>
                <span class="work-item-state state-{normalizeState(item.fields?.['System.State'])}">
                  {item.fields?.['System.State'] || 'New'}
                </span>
                <span class="work-item-assignee">
                  {#if item.fields?.['System.AssignedTo']}
                    <span class="codicon codicon-account" aria-hidden="true"></span>
                    {item.fields['System.AssignedTo'].displayName ||
                      item.fields['System.AssignedTo']}
                  {:else}
                    <span class="codicon codicon-account" aria-hidden="true"></span> Unassigned
                  {/if}
                </span>
              </div>
            </div>

            <div class="work-item-actions">
              <button
                class="action-btn start"
                on:click={() => handleItemAction('start', item)}
                title="Start timer"
                aria-label={`Start timer for #${item.id}`}
              >
                <span class="codicon codicon-play" aria-hidden="true"></span> Start
              </button>
              <button
                class="action-btn view"
                on:click={() => handleItemAction('view', item)}
                title="View in browser"
                aria-label={`View work item #${item.id}`}
              >
                <span class="codicon codicon-eye" aria-hidden="true"></span> View
              </button>
              <button
                class="action-btn edit"
                on:click={() => handleItemAction('edit', item)}
                title="Edit work item"
                aria-label={`Edit work item #${item.id}`}
              >
                <span class="codicon codicon-edit" aria-hidden="true"></span> Edit
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  /* Import existing styles from App.svelte but adapt for Svelte 5 */
  .pane {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    font-family: var(--vscode-font-family);
  }

  .connection-tabs {
    display: flex;
    background: var(--vscode-tab-inactiveBackground);
    border-bottom: 1px solid var(--vscode-editorWidget-border);
    overflow-x: auto;
    flex-shrink: 0;
  }

  .connection-tab {
    padding: 8px 16px;
    background: var(--vscode-tab-inactiveBackground);
    color: var(--vscode-tab-inactiveForeground);
    border: none;
    border-right: 1px solid var(--vscode-editorWidget-border);
    cursor: pointer;
    font-size: 13px;
    font-family: var(--vscode-font-family);
    white-space: nowrap;
    transition: all 0.2s ease;
  }

  .connection-tab:hover {
    background: var(--vscode-tab-hoverBackground);
    color: var(--vscode-tab-hoverForeground);
  }

  .connection-tab.active {
    background: var(--vscode-tab-activeBackground);
    color: var(--vscode-tab-activeForeground);
    border-bottom: 2px solid var(--vscode-tab-activeBorder, #0078d4);
  }

  .auth-reminders {
    margin: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .auth-reminder {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 12px 14px;
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 6px;
    background: var(--vscode-editorWidget-background);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  }

  .auth-reminder-icon {
    font-size: 20px;
    line-height: 1;
    margin-top: 2px;
  }

  .auth-reminder-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .auth-reminder-title {
    font-weight: 600;
    font-size: 13px;
  }

  .auth-reminder-detail {
    font-size: 12px;
    line-height: 1.4;
    color: var(--vscode-editor-foreground);
    opacity: 0.9;
  }

  .auth-reminder-actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .manual-signin {
    margin: 12px;
  }

  .manual-signin-card {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 16px;
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 6px;
    background: var(--vscode-editorWidget-background);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .manual-signin-icon {
    font-size: 24px;
    line-height: 1;
    opacity: 0.8;
  }

  .manual-signin-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .manual-signin-title {
    font-weight: 600;
    font-size: 14px;
    color: var(--vscode-editor-foreground);
  }

  .manual-signin-message {
    font-size: 12px;
    line-height: 1.4;
    color: var(--vscode-editor-foreground);
    opacity: 0.8;
  }

  .manual-signin-actions {
    display: flex;
    align-items: center;
  }

  .init-status {
    padding: 12px;
    background: var(--vscode-editorWidget-background);
    border-bottom: 1px solid var(--vscode-editorWidget-border);
  }

  .init-progress {
    width: 100%;
    height: 4px;
    background: var(--vscode-editorWidget-border);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .init-progress-bar {
    height: 100%;
    background: #0078d4;
    transition: width 0.3s ease;
  }

  .init-message {
    font-size: 12px;
    color: var(--vscode-foreground);
  }

  .query-header {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid var(--vscode-editorWidget-border);
    background: var(--vscode-editorGroupHeader-tabsBackground);
  }

  .query-selector-container {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 300px;
    max-width: 500px;
    width: 100%;
  }

  .query-selector-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-foreground);
  }

  .query-selector {
    font-size: 13px;
    padding: 6px 8px;
    border: 1px solid var(--vscode-input-border);
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border-radius: 3px;
  }

  .query-description {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.3;
    opacity: 0.8;
  }

  .pane-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--vscode-editorWidget-border);
    background: var(--vscode-editorGroupHeader-tabsBackground);
    color: var(--vscode-editor-foreground);
  }

  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid var(--vscode-editorWidget-border);
    border-top-color: #0078d4;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    display: inline-block;
    margin-left: 6px;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .muted {
    opacity: 0.7;
  }

  .count {
    margin-left: auto;
    opacity: 0.85;
  }

  .actions {
    display: inline-flex;
    gap: 6px;
  }

  button {
    font-size: 11px;
    padding: 4px 8px;
    color: var(--vscode-button-foreground);
    background: #0078d4;
    border: 1px solid transparent;
    border-radius: 3px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--vscode-font-family);
  }

  button:hover {
    background: #106ebe;
  }

  button[disabled] {
    opacity: 0.5;
    cursor: default;
  }

  .pane-body {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .error-banner {
    margin: 8px;
    padding: 12px;
    border: 2px solid #d13438;
    border-radius: 4px;
    background: rgba(209, 52, 56, 0.15);
    color: #d13438;
    font-weight: 500;
    font-size: 12px;
  }

  .loading {
    padding: 20px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
  }

  .empty {
    padding: 20px;
    font-size: 14px;
    opacity: 0.7;
    text-align: center;
  }

  .items {
    padding: 8px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .kanban-board {
    padding: 8px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    gap: 12px;
  }

  .kanban-column {
    min-width: 300px;
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    max-height: 100%;
  }

  .kanban-column-header {
    padding: 12px;
    border-bottom: 1px solid var(--vscode-editorWidget-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .kanban-column-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
  }

  .item-count {
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
  }

  .kanban-column-content {
    padding: 8px;
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .work-item-card {
    display: flex;
    flex-direction: column;
    padding: 12px;
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 4px;
    background: var(--vscode-editor-background);
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
  }

  .work-item-card:hover {
    background: var(--vscode-list-hoverBackground);
    border-color: #0078d4;
    box-shadow: 0 2px 8px rgba(0, 120, 212, 0.1);
  }

  .work-item-card.has-active-timer {
    border-left: 3px solid #ff8c00;
  }

  .work-item-card.focused {
    outline: 2px solid var(--vscode-focusBorder);
    outline-offset: 2px;
    background: var(--vscode-list-activeSelectionBackground);
    border-color: var(--vscode-focusBorder);
  }

  .work-item-card.selected {
    background: var(--vscode-list-selectionBackground);
    border-color: var(--vscode-list-selectionBackground);
  }

  .work-item-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .work-item-checkbox {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: #0078d4;
  }

  .work-item-type-icon {
    font-family: 'codicon';
    font-size: 16px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    flex-shrink: 0;
    color: #0078d4;
  }

  .work-item-id {
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
  }

  .work-item-priority {
    margin-left: auto;
    font-size: 14px;
    font-weight: 600;
  }

  .priority-1 {
    color: #d13438;
  }
  .priority-2 {
    color: #ff8c00;
  }
  .priority-3 {
    color: #0078d4;
  }
  .priority-4 {
    color: #666;
  }

  .timer-indicator {
    background: rgba(255, 140, 0, 0.2);
    color: #ff8c00;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    border: 1px solid rgba(255, 140, 0, 0.3);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .work-item-content {
    flex: 1;
    margin-bottom: 8px;
  }

  .work-item-title {
    font-weight: 600;
    font-size: 14px;
    line-height: 1.3;
    margin-bottom: 6px;
    color: var(--vscode-editor-foreground);
  }

  .work-item-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    font-size: 11px;
    margin-bottom: 8px;
  }

  .work-item-type {
    padding: 2px 6px;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border-radius: 10px;
    font-size: 10px;
    font-weight: 500;
  }

  .work-item-state {
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 500;
    text-transform: uppercase;
  }

  .state-new {
    background: rgba(0, 120, 212, 0.2);
    color: #0078d4;
  }
  .state-active,
  .state-inprogress {
    background: rgba(255, 140, 0, 0.2);
    color: #ff8c00;
  }
  .state-resolved,
  .state-done,
  .state-closed {
    background: rgba(16, 124, 16, 0.2);
    color: #107c10;
  }
  .state-removed {
    background: rgba(209, 52, 56, 0.2);
    color: #d13438;
  }

  .work-item-actions {
    display: flex;
    gap: 4px;
    align-items: center;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .work-item-card:hover .work-item-actions {
    opacity: 1;
  }

  .action-btn {
    padding: 6px 8px;
    background: var(--vscode-button-secondaryBackground);
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 3px;
    cursor: pointer;
    font-size: 11px;
    transition: all 0.1s ease;
    color: var(--vscode-button-secondaryForeground);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .action-btn:hover {
    background: var(--vscode-button-secondaryHoverBackground);
    border-color: #0078d4;
  }

  .action-btn.start {
    background: #107c10;
    color: white;
    border-color: #107c10;
  }

  .action-btn.stop {
    background: #d13438;
    color: white;
    border-color: #d13438;
  }

  .action-btn.compact {
    padding: 4px 6px;
  }

  .debug-panel {
    padding: 8px 12px;
    background: var(--vscode-editorWidget-background);
    border-top: 1px solid var(--vscode-editorWidget-border);
    display: flex;
    gap: 12px;
    align-items: center;
    font-size: 11px;
  }

  .debug-info {
    opacity: 0.7;
    font-family: monospace;
  }

  /* Responsive adjustments */
  @media (max-width: 600px) {
    .connection-tabs {
      flex-wrap: wrap;
    }

    .kanban-board {
      flex-direction: column;
    }

    .kanban-column {
      min-width: unset;
      width: 100%;
    }
  }
</style>
