<!--
Module: src/webview/components/WorkItemList.svelte
Owner: webview
Reads: syncState from extension (ApplicationContext serialized)
Writes: UI-only events; selection via selection writer factory (webview-owned)
Receives: syncState, host broadcasts
Emits: appEvent envelopes (Router handles stamping)
Prohibitions: Do not import extension host modules; Do not define context types
Rationale: Svelte UI component; reacts to ApplicationContext and forwards intents

LLM-GUARD:
- Use selection writer factory for selection updates
- Do not route by connection here; let Router decide targets
-->
<script lang="ts">
  import Dropdown from './Dropdown.svelte';
  import ErrorBanner from './ErrorBanner.svelte';
  import EmptyState from './EmptyState.svelte';

  interface Props {
    context: any;
    sendEvent: (event: any) => void;
    matches?: Record<string, boolean>;
    query?: string;
    onQueryChange?: (query: string) => void;
  }

  const { context, sendEvent, query: propQuery, onQueryChange }: Props = $props();

  // NOTE: Loading state is managed centrally by the FSM through ui.loading.workItems
  // The FSM sets this when entering loadingData state (query changes, refresh, etc.)

  const activeConnectionId = $derived(context?.activeConnectionId);
  
  // Query selector
  const predefinedQueries = [
    'My Activity',
    'Assigned to me',
    'Recently Updated',
    'Created By Me',
    'All Active',
    'All Work Items', // Includes closed/completed items
  ];
  const currentQuery = $derived(propQuery || context?.activeQuery || predefinedQueries[0]);
  
  // CRITICAL: Filter work items to only show those for the active connection
  // This ensures work items from one connection are never shown when another connection's tab is selected
  const allWorkItems = $derived(context?.pendingWorkItems?.workItems || context?.workItems || []);
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
  const timerState = $derived(context?.timerState);
  const workItemsError = $derived(context?.workItemsError);
  const workItemsErrorConnectionId = $derived(context?.workItemsErrorConnectionId);
  const showError = $derived(workItemsError && workItemsErrorConnectionId === activeConnectionId);
  
  // Get UI state from FSM - loading state is managed centrally in FSM
  const uiState = $derived(context?.ui);
  const connectionHealth = $derived(uiState?.connectionHealth);
  const hasConnectionError = $derived(connectionHealth?.status === 'error' && connectionHealth?.lastError);
  const connectionError = $derived(connectionHealth?.lastError);
  
  // FSM-MANAGED LOADING STATE - Read from FSM context, never set locally
  // The FSM sets ui.loading.workItems when entering loadingData state
  // and clears it when exiting (via entry/exit actions)
  const showLoading = $derived(uiState?.loading?.workItems === true);

  // Force reactivity every second to update timer display
  let tick = $state(0);
  setInterval(() => {
    tick = (tick + 1) % 1000;
  }, 1000);

  // Compute elapsed time from startTime
  const timerElapsedSeconds = $derived.by(() => {
    // Trigger recomputation on tick
   

    if (!timerState?.startTime) return 0;

    const stopTime = timerState.stopTime;
    const now = stopTime || Date.now();
    const elapsed = Math.floor((now - timerState.startTime) / 1000);

    return Math.max(0, elapsed);
  });

  // Filters
  let filterText = $state('');
  let typeFilter = $state('');
  let stateFilter = $state('all');
  let sortKey = $state('updated-desc');

  // Extract available types and states from work items
  const availableTypes = $derived([
    ...new Set(workItems.map((w: any) => w.fields?.['System.WorkItemType']).filter(Boolean) as string[]),
  ]);
  const availableStates = $derived([
    ...new Set(
      workItems.map((w: any) => normalizeState(w.fields?.['System.State'])).filter(Boolean) as string[]
    ),
  ]);

  // Filter and sort work items
  const filteredItems = $derived(
    workItems
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
            return (a.fields?.['System.Title'] || '').localeCompare(
              b.fields?.['System.Title'] || ''
            );
          case 'updated-desc':
          default:
            return (
              new Date(b.fields?.['System.ChangedDate'] || 0).getTime() -
              new Date(a.fields?.['System.ChangedDate'] || 0).getTime()
            );
        }
      })
  );

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

  
  function handleStartTimer(item: any, event: Event) {
    event.stopPropagation();

    // Toggle: if timer is running on this item, stop it; otherwise start it
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

  // State for timer display preferences
  let displayTimerSeconds = $state(true);
  let timerHoverStart = $state(0);

  function formatElapsedTime(seconds: number, forceShowSeconds: boolean = true): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    // Show seconds for first 30 seconds, or when forced, or when recently hovered
    const showSeconds =
      forceShowSeconds &&
      (seconds < 30 ||
        displayTimerSeconds ||
        (timerHoverStart > 0 && Date.now() - timerHoverStart < 30000));

    if (hours > 0) {
      return showSeconds
        ? `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        : `${hours}:${String(mins).padStart(2, '0')}`;
    }
    // Always show MM:SS format, even for 0:00
    return showSeconds ? `${mins}:${String(secs).padStart(2, '0')}` : `${mins}m`;
  }

  function handleTimerMouseEnter() {
    timerHoverStart = Date.now();
  }

  function handleTimerMouseLeave() {
    // Keep showing seconds for another 30 seconds after hover ends
    setTimeout(() => {
      timerHoverStart = 0;
    }, 30000);
  }
</script>

<div class="work-item-list" style="position: relative;">
  {#if !activeConnectionId}
    <div class="empty-state">
      <p>No active connection selected.</p>
      <p class="hint">Configure a connection in settings to get started.</p>
    </div>
  {:else}
    <!-- Query Selector -->
    {#if onQueryChange}
      <div class="query-selector-bar">
        <label for="query-select" class="query-label">Query:</label>
        <Dropdown
          value={currentQuery}
          options={predefinedQueries.map((q) => ({ value: q, label: q }))}
          onChange={(value) => {
            // Send query change - FSM will set loading state automatically
            if (onQueryChange) {
              onQueryChange(value);
            }
          }}
          class="query-select"
        />
      </div>
    {/if}
    
    <!-- Filters Bar -->
    <div class="filters-bar">
      <input
        type="text"
        placeholder="Filter by title..."
        bind:value={filterText}
        class="filter-input"
      />
      <Dropdown
        value={typeFilter}
        options={[
          { value: '', label: 'All Types' },
          ...availableTypes.map((type: string) => ({ value: type, label: type })),
        ]}
        onChange={(value) => {
          typeFilter = value;
        }}
      />
      <Dropdown
        value={stateFilter}
        options={[
          { value: 'all', label: 'All States' },
          ...availableStates.map((state: string) => ({ value: state, label: state })),
        ]}
        onChange={(value) => {
          stateFilter = value;
        }}
      />
      <Dropdown
        value={sortKey}
        options={[
          { value: 'updated-desc', label: 'Updated ↓' },
          { value: 'id-desc', label: 'ID ↓' },
          { value: 'id-asc', label: 'ID ↑' },
          { value: 'title-asc', label: 'Title A→Z' },
        ]}
        onChange={(value) => {
          sortKey = value;
        }}
      />
    </div>

    {#if showLoading}
      {#if workItems.length === 0}
        <!-- Full loading indicator when no work items exist -->
        <div class="loading-indicator">
          <div class="loading-spinner"></div>
          <p>Loading work items...</p>
        </div>
      {:else}
        <!-- Discrete loading spinner - positioned absolutely to not affect layout -->
        <div class="loading-spinner-container">
          <div class="loading-spinner small"></div>
        </div>
      {/if}
    {/if}
    {#if hasConnectionError && connectionError}
      <ErrorBanner
        error={connectionError.type === 'authentication'
          ? { ...connectionError, suggestedAction: 'Change auth / start new sign-in' }
          : connectionError}
        onRetry={() => sendEvent({ type: 'REFRESH_DATA' })}
        onFixAuth={() => sendEvent({ type: 'RESET_AUTH', connectionId: activeConnectionId })}
        onDismiss={() => {
          // Dismiss handled by FSM clearing error state
        }}
      />
    {/if}
    {#if (hasConnectionError || showError) && workItems.length === 0 && !showLoading}
      <EmptyState
        hasError={true}
        error={connectionError || (showError ? {
          message: workItemsError || 'Unable to load work items',
          type: 'authentication' as const,
          recoverable: true,
          suggestedAction: 'Change auth / start new sign-in',
        } : undefined)}
        onRetry={() => sendEvent({ type: 'REFRESH_DATA' })}
        onFixAuth={() => sendEvent({ type: 'RESET_AUTH', connectionId: activeConnectionId })}
      />
    {:else if filteredItems.length === 0 && workItems.length > 0}
      <div class="empty-state">
        <p>No items match your filters.</p>
        <button
          onclick={() => {
            filterText = '';
            typeFilter = '';
            stateFilter = 'all';
          }}>Clear Filters</button
        >
      </div>
    {:else}
      <div class="items-container">
        {#each filteredItems as item (item.id)}
          <div class="work-item-card">
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
                  <span
                    class="meta-badge timer-badge"
                    title="Timer Active"
                    role="button"
                    tabindex="0"
                    onmouseenter={handleTimerMouseEnter}
                    onmouseleave={handleTimerMouseLeave}
                  >
                    <span class="codicon">⏱</span>
                    {formatElapsedTime(timerElapsedSeconds)}
                  </span>
                {/if}
              </div>

              <!-- Action Buttons -->
              <div class="item-actions">
                <button
                  class="action-btn primary"
                  onclick={(e) => handleStartTimer(item, e)}
                  title={timerState?.workItemId === item.id ? 'Stop Timer' : 'Start Timer'}
                  aria-label={timerState?.workItemId === item.id ? 'Stop Timer' : 'Start Timer'}
                >
                  <span class="codicon">{timerState?.workItemId === item.id ? '⏹' : '▶'}</span>
                </button>
                <button
                  class="action-btn"
                  onclick={(e) => handleEditItem(item, e)}
                  title="Edit Work Item"
                  aria-label="Edit Work Item"
                >
                  <span class="codicon">✎</span>
                </button>
                <button
                  class="action-btn"
                  onclick={(e) => handleCreateBranch(item, e)}
                  title="Create Branch"
                  aria-label="Create Branch"
                >
                  <span class="codicon">⎇</span>
                </button>
                <button
                  class="action-btn"
                  onclick={(e) => handleOpenInBrowser(item, e)}
                  title="Open in Azure DevOps"
                  aria-label="Open in Azure DevOps"
                >
                  <span class="codicon">🌐</span>
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


  .empty-state-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .loading-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    gap: 1rem;
    color: var(--vscode-descriptionForeground);
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--vscode-panel-border);
    border-top-color: var(--vscode-textLink-foreground);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .loading-spinner.small {
    width: 16px;
    height: 16px;
    border-width: 2px;
  }

  .loading-spinner-container {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    pointer-events: none;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .query-selector-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
    border-top: 1px solid var(--vscode-panel-border, var(--vscode-input-border));
  }
  
  .query-label {
    font-size: 0.75rem;
    color: var(--vscode-foreground);
    white-space: nowrap;
    font-weight: 500;
  }
  
  .query-selector-bar :global(.query-select) {
    min-width: 150px;
  }
  
  .filters-bar {
    display: flex;
    gap: 0.5rem;
    padding: 0.5rem 0;
    flex-wrap: wrap;
  }

  .filter-input {
    padding: 0.4rem 0.6rem;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
    font-size: 0.85rem;
    font-family: var(--vscode-font-family);
    flex: 1;
    min-width: 150px;
  }

  .filter-input:focus {
    outline: none;
    border-color: var(--vscode-focusBorder);
  }

  /* Custom dropdown component styling */
  .filters-bar :global(.custom-dropdown) {
    min-width: 120px;
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
    0%,
    100% {
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
