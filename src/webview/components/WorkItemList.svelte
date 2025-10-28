<script lang="ts">
  export let context: any;
  export let sendEvent: (event: any) => void;

  $: workItems = context?.pendingWorkItems?.workItems || [];
  $: activeConnectionId = context?.activeConnectionId;
  $: connections = context?.connections || [];
  $: activeConnection = connections.find((c: any) => c.id === activeConnectionId);
  $: timerState = context?.timerState;

  // Filters
  let filterText = '';
  let typeFilter = '';
  let stateFilter = 'all';
  let sortKey = 'updated-desc';

  // Extract available types and states from work items
  $: availableTypes = [
    ...new Set(workItems.map((w: any) => w.fields?.['System.WorkItemType']).filter(Boolean)),
  ];
  $: availableStates = [
    ...new Set(
      workItems.map((w: any) => normalizeState(w.fields?.['System.State'])).filter(Boolean)
    ),
  ];

  // Filter and sort work items
  $: filteredItems = workItems
    .filter((item: any) => {
      const title = (item.fields?.['System.Title'] || '').toLowerCase();
      const matchesText = !filterText || title.includes(filterText.toLowerCase());
      const matchesType = !typeFilter || item.fields?.['System.WorkItemType'] === typeFilter;
      const itemState = normalizeState(item.fields?.['System.State']);
      const matchesState = stateFilter === 'all' || itemState === stateFilter;
      return matchesText && matchesType && matchesState;
    })
    .sort((a: any, b: any) => {
      switch (sortKey) {
        case 'id-asc':
          return Number(a.id) - Number(b.id);
        case 'id-desc':
          return Number(b.id) - Number(a.id);
        case 'title-asc':
          return (a.fields?.['System.Title'] || '').localeCompare(b.fields?.['System.Title'] || '');
        case 'updated-desc':
        default:
          return (
            new Date(b.fields?.['System.ChangedDate'] || 0).getTime() -
            new Date(a.fields?.['System.ChangedDate'] || 0).getTime()
          );
      }
    });

  function normalizeState(raw: string): string {
    if (!raw) return 'new';
    const s = String(raw).toLowerCase().trim().replace(/\s+/g, '-');
    if (['new', 'to-do', 'todo', 'proposed'].includes(s)) return 'new';
    if (s === 'active') return 'active';
    if (['in-progress', 'inprogress', 'doing'].includes(s)) return 'inprogress';
    if (['review', 'code-review', 'testing'].includes(s)) return 'review';
    if (s === 'resolved') return 'resolved';
    if (s === 'done') return 'done';
    if (['closed', 'completed'].includes(s)) return 'closed';
    return 'new';
  }

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

  function handleRefresh() {
    sendEvent({ type: 'REFRESH_DATA' });
  }

  function handleOpenItem(id: number) {
    sendEvent({ type: 'OPEN_WORK_ITEM', workItemId: id });
  }
  
  function handleStartTimer(item: any, event: Event) {
    event.stopPropagation();  // Prevent card click
    sendEvent({ type: 'START_TIMER_INTERACTIVE', workItemId: item.id, workItemTitle: item.fields?.['System.Title'] });
  }
  
  function handleEditItem(item: any, event: Event) {
    event.stopPropagation();
    sendEvent({ type: 'EDIT_WORK_ITEM', workItemId: item.id });
  }
  
  function handleOpenInBrowser(item: any, event: Event) {
    event.stopPropagation();
    sendEvent({ type: 'OPEN_IN_BROWSER', workItemId: item.id });
  }
  
  function handleCreateBranch(item: any, event: Event) {
    event.stopPropagation();
    sendEvent({ type: 'CREATE_BRANCH', workItemId: item.id });
  }

  function formatElapsedTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }
</script>

<div class="work-item-list">
  {#if !activeConnectionId}
    <div class="empty-state">
      <p>No active connection selected.</p>
      <p class="hint">Configure a connection in settings to get started.</p>
    </div>
  {:else}
    <!-- Filters Bar -->
    <div class="filters-bar">
      <input
        type="text"
        placeholder="Filter by title..."
        bind:value={filterText}
        class="filter-input"
      />
      <select bind:value={typeFilter} class="filter-select">
        <option value="">All Types</option>
        {#each availableTypes as type}
          <option value={type}>{type}</option>
        {/each}
      </select>
      <select bind:value={stateFilter} class="filter-select">
        <option value="all">All States</option>
        {#each availableStates as state}
          <option value={state}>{state}</option>
        {/each}
      </select>
      <select bind:value={sortKey} class="filter-select">
        <option value="updated-desc">Updated ↓</option>
        <option value="id-desc">ID ↓</option>
        <option value="id-asc">ID ↑</option>
        <option value="title-asc">Title A→Z</option>
      </select>
    </div>

    {#if filteredItems.length === 0 && workItems.length > 0}
      <div class="empty-state">
        <p>No items match your filters.</p>
        <button on:click={() => { filterText=''; typeFilter=''; stateFilter='all'; }}>Clear Filters</button>
      </div>
    {:else}
      <div class="items-container">
        {#each filteredItems as item (item.id)}
          <div
            class="work-item-card"
            on:click={() => handleOpenItem(item.id)}
            on:keydown
            role="button"
            tabindex="0"
          >
            <div class="card-header">
              <span class="type-icon"
                >{getWorkItemTypeIcon(item.fields?.['System.WorkItemType'])}</span
              >
              <span class="item-id">#{item.id}</span>
              <span
                class="priority {getPriorityClass(item.fields?.['Microsoft.VSTS.Common.Priority'])}"
              >
                P{item.fields?.['Microsoft.VSTS.Common.Priority'] || '3'}
              </span>
            </div>

            <div class="card-body">
              <div class="item-title">
                {item.fields?.['System.Title'] || `Work Item #${item.id}`}
              </div>

              <div class="item-meta">
                <span class="meta-badge type">{item.fields?.['System.WorkItemType'] || 'Task'}</span
                >
                <span
                  class="meta-badge state state-{normalizeState(item.fields?.['System.State'])}"
                >
                  {item.fields?.['System.State'] || 'New'}
                </span>
                {#if item.fields?.['System.AssignedTo']}
                  <span class="meta-badge assignee">
                    {item.fields['System.AssignedTo'].displayName ||
                      item.fields['System.AssignedTo']}
                  </span>
                {/if}
                {#if timerState?.workItemId === item.id}
                  <span class="meta-badge timer-badge" title="Timer Active">
                    <span class="codicon">⏱</span>
                    {formatElapsedTime(timerState.elapsedSeconds)}
                  </span>
                {/if}
              </div>
              
              <!-- Action Buttons -->
              <div class="item-actions">
                <button 
                  class="action-btn primary" 
                  on:click={(e) => handleStartTimer(item, e)}
                  title="Start Timer"
                >
                  <span class="codicon">▶</span>
                  Timer
                </button>
                <button 
                  class="action-btn" 
                  on:click={(e) => handleEditItem(item, e)}
                  title="Edit Work Item"
                >
                  <span class="codicon">✎</span>
                  Edit
                </button>
                <button 
                  class="action-btn" 
                  on:click={(e) => handleCreateBranch(item, e)}
                  title="Create Branch"
                >
                  <span class="codicon">⎇</span>
                  Branch
                </button>
                <button 
                  class="action-btn" 
                  on:click={(e) => handleOpenInBrowser(item, e)}
                  title="Open in Azure DevOps"
                >
                  <span class="codicon">🌐</span>
                  Open
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .work-item-list {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 0.75rem;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    text-align: center;
    color: var(--vscode-descriptionForeground);
    gap: 1rem;
  }

  .empty-state .hint {
    font-size: 0.85rem;
    opacity: 0.8;
  }

  .filters-bar {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem 0;
    flex-wrap: wrap;
  }

  .filter-input,
  .filter-select {
    padding: 0.4rem 0.6rem;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    font-size: 0.85rem;
    font-family: var(--vscode-font-family);
  }

  .filter-input {
    flex: 1;
    min-width: 150px;
  }

  .filter-input:focus,
  .filter-select:focus {
    outline: none;
    border-color: var(--vscode-focusBorder);
  }

  button {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    padding: 0.4rem 0.8rem;
    cursor: pointer;
    font-size: 0.85rem;
    border-radius: 3px;
    font-family: var(--vscode-font-family);
  }

  button:hover {
    background: var(--vscode-button-hoverBackground);
  }

  .primary-btn {
    background: var(--vscode-button-background);
    padding: 0.5rem 1rem;
  }

  .items-container {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .work-item-card {
    display: flex;
    flex-direction: column;
    padding: 0.75rem;
    background: var(--vscode-list-inactiveSelectionBackground);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .work-item-card:hover {
    background: var(--vscode-list-hoverBackground);
    border-color: var(--vscode-focusBorder);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .type-icon {
    font-family: 'codicon';
    font-size: 1rem;
    color: var(--vscode-textLink-foreground);
  }

  .item-id {
    font-size: 0.75rem;
    font-weight: 600;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    padding: 0.15rem 0.4rem;
    border-radius: 8px;
  }

  .priority {
    margin-left: auto;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.15rem 0.35rem;
    border-radius: 4px;
  }

  .priority-1 {
    background: rgba(209, 52, 56, 0.2);
    color: #d13438;
  }

  .priority-2 {
    background: rgba(255, 140, 0, 0.2);
    color: #ff8c00;
  }

  .priority-3 {
    background: rgba(0, 120, 212, 0.15);
    color: #0078d4;
  }

  .priority-4 {
    background: rgba(128, 128, 128, 0.15);
    color: #808080;
  }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .item-title {
    font-size: 0.95rem;
    font-weight: 500;
    line-height: 1.3;
    color: var(--vscode-foreground);
  }

  .item-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    font-size: 0.75rem;
  }

  .meta-badge {
    padding: 0.2rem 0.5rem;
    border-radius: 10px;
    font-size: 0.7rem;
    font-weight: 500;
  }

  .meta-badge.type {
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
  }

  .meta-badge.state {
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .state-new {
    background: rgba(0, 120, 212, 0.15);
    color: #0078d4;
  }

  .state-active,
  .state-inprogress {
    background: rgba(255, 140, 0, 0.2);
    color: #ff8c00;
  }

  .state-review {
    background: rgba(92, 45, 145, 0.2);
    color: #5c2d91;
  }

  .state-resolved,
  .state-done,
  .state-closed {
    background: rgba(16, 124, 16, 0.2);
    color: #107c10;
  }

  .meta-badge.assignee {
    background: rgba(92, 45, 145, 0.15);
    color: var(--vscode-foreground);
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .meta-badge.timer-badge {
    background: rgba(0, 120, 212, 0.25);
    color: #0078d4;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-weight: 600;
    animation: pulse 2s ease-in-out infinite;
  }

  .timer-badge .codicon {
    font-size: 0.9rem;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }
  
  /* Action Buttons */
  .item-actions {
    display: flex;
    gap: 0.4rem;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--vscode-panel-border);
    opacity: 0;
    transition: opacity 0.2s ease;
  }
  
  .work-item-card:hover .item-actions {
    opacity: 1;
  }
  
  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.35rem 0.6rem;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: 1px solid var(--vscode-button-border, transparent);
    border-radius: 3px;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  
  .action-btn:hover {
    background: var(--vscode-button-secondaryHoverBackground);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .action-btn:active {
    transform: translateY(0);
  }
  
  .action-btn.primary {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
  }
  
  .action-btn.primary:hover {
    background: var(--vscode-button-hoverBackground);
  }
  
  .action-btn .codicon {
    font-size: 0.9rem;
    line-height: 1;
  }
</style>
