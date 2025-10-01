<script>
  import { createEventDispatcher } from 'svelte';
  import Toasts from './Toasts.svelte';
  const dispatch = createEventDispatcher();
  export let workItemCount = 0;
  // Optional subtitle (removed legacy 'Svelte flag on' marker)
  export let subtitle = '';
  export let hasItems = false;
  export let timerActive = false;
  export let timerRunning = false;
  export let timerElapsedLabel = '';
  export let activeId = 0; // 0 means none
  export let activeTitle = '';
  export let items = [];
  export let kanbanView = false;
  export let loading = false;
  export let errorMsg = '';
  // Filters / sort
  export let filterText = '';
  export let typeFilter = '';
  export let stateFilter = 'all'; // one of 'all', columnDefs keys
  export let sortKey = 'updated-desc'; // 'updated-desc' | 'id-desc' | 'id-asc' | 'title-asc'
  export let availableStates = []; // dynamic list of normalized state keys
  export let availableTypes = [];
  // Query selector
  export let selectedQuery = 'My Activity';
  export let queryDescription = '';
  export let summaryDraft = '';
  export let summaryStatus = '';
  export let summaryProvider = 'builtin';
  export let summaryBusy = false;
  export let summaryTargetId = 0;
  export let summaryWorkItemId = 0;

  // Connections
  export let connections = [];
  export let activeConnectionId = undefined;

  function onRefresh() {
    dispatch('refresh');
  }
  function onOpenFirst() {
    if (hasItems) dispatch('openFirst');
  }
  function onStartTimer() {
    if (hasItems && !timerActive) dispatch('startTimer');
  }
  function onStopTimer() {
    if (timerActive) dispatch('stopTimer');
  }
  function onOpenActive() {
    if (timerActive && activeId) dispatch('openActive', { id: activeId });
  }
  function onCreate() {
    dispatch('createWorkItem');
  }
  function onToggleKanban() {
    dispatch('toggleKanban');
  }
  function onFilterInput(e) {
    dispatch('filtersChanged', {
      filterText: e.target.value,
      typeFilter,
      stateFilter,
      sortKey,
    });
  }
  function onStateFilterChange(e) {
    dispatch('filtersChanged', {
      filterText,
      typeFilter,
      stateFilter: e.target.value,
      sortKey,
    });
  }
  function onTypeFilterChange(e) {
    dispatch('filtersChanged', {
      filterText,
      typeFilter: e.target.value,
      stateFilter,
      sortKey,
    });
  }
  function onSortChange(e) {
    dispatch('filtersChanged', {
      filterText,
      typeFilter,
      stateFilter,
      sortKey: e.target.value,
    });
  }
  function onSummaryInput(e) {
    dispatch('summaryDraftChanged', { value: e.target.value });
  }
  function onSummaryBlur(e) {
    dispatch('summaryDraftBlur', { value: e.target.value });
  }
  function onGenerateSummary() {
    dispatch('generateSummary');
  }
  function onStopAndApplySummary() {
    dispatch('stopAndApplySummary');
  }
  function onCancelSummary() {
    dispatch('cancelSummary');
  }
  function onQueryChange(e) {
    dispatch('queryChanged', { query: e.target.value });
  }
  function onConnectionChange(e) {
    dispatch('connectionChanged', { connectionId: e.target.value });
  }

  // Query options
  const queryOptions = [
    {
      value: 'My Activity',
      label: 'My Activity',
      description: "Work items I've created, assigned to, or recently changed",
    },
    {
      value: 'My Work Items',
      label: 'My Work Items',
      description: 'Work items currently assigned to me',
    },
    {
      value: 'Assigned to me',
      label: 'Assigned to me',
      description: 'Work items currently assigned to me',
    },
    {
      value: 'Current Sprint',
      label: 'Current Sprint',
      description: 'Work items in the current iteration',
    },
    {
      value: 'All Active',
      label: 'All Active',
      description: 'All active work items in the project',
    },
    {
      value: 'Recently Updated',
      label: 'Recently Updated',
      description: 'Work items updated in the last 14 days',
    },
    { value: 'Following', label: 'Following', description: "Work items I'm following" },
    { value: 'Mentioned', label: 'Mentioned', description: "Work items where I've been mentioned" },
  ];

  $: summaryButtonLabel =
    summaryProvider === 'openai' ? 'Generate AI Summary' : 'Copy Copilot Prompt';
  $: summaryHelperText =
    summaryProvider === 'openai'
      ? 'Creates an OpenAI summary and copies it to your clipboard.'
      : 'Copies a Copilot-ready prompt to your clipboard.';
  $: summaryGenerateDisabled = summaryBusy || !summaryTargetId;
  $: summaryApplyDisabled = summaryBusy || !timerActive;
  $: summaryAreaDisabled = !summaryTargetId;

  // DnD helpers
  let draggingId = null;
  function handleDragStart(ev, it) {
    draggingId = it.id;
    try {
      ev.dataTransfer?.setData('text/plain', String(it.id));
    } catch {}
    ev.dataTransfer && (ev.dataTransfer.effectAllowed = 'move');
  }
  function allowDrop(ev) {
    ev.preventDefault();
  }
  function handleDrop(ev, colKey) {
    ev.preventDefault();
    const txt = ev.dataTransfer?.getData('text/plain');
    const id = Number(txt || draggingId);
    draggingId = null;
    if (!id) return;
    // Compute best guess target state label to send to extension
    const label = bucketLabels[colKey] || colKey;
    dispatch('moveItem', { id, target: colKey, targetState: label });
  }

  // --- Kanban helpers ---
  // We’ll group items by their actual state but map similar states to buckets for ordering
  const bucketOrder = [
    'new',
    'approved',
    'committed',
    'active',
    'inprogress',
    'review',
    'resolved',
    'done',
    'closed',
    'removed',
  ];
  const bucketLabels = {
    new: 'New',
    approved: 'Approved',
    committed: 'Committed',
    active: 'Active',
    inprogress: 'In Progress',
    review: 'Review/Testing',
    resolved: 'Resolved',
    done: 'Done',
    closed: 'Closed',
    removed: 'Removed',
  };

  function normalizeState(raw) {
    if (!raw) return 'todo';
    const s = String(raw).toLowerCase().trim().replace(/\s+/g, '-');
    if (s === 'new' || s === 'to-do' || s === 'todo' || s === 'proposed') return 'new';
    if (s === 'approved') return 'approved';
    if (s === 'committed') return 'committed';
    if (s === 'active') return 'active';
    if (s === 'in-progress' || s === 'inprogress' || s === 'doing') return 'inprogress';
    if (s === 'review' || s === 'code-review' || s === 'testing') return 'review';
    if (s === 'resolved') return 'resolved';
    if (s === 'done') return 'done';
    if (s === 'closed' || s === 'completed') return 'closed';
    if (s === 'removed') return 'removed';
    return 'new';
  }

  function getWorkItemTypeIcon(type) {
    const t = String(type || '').toLowerCase();
    if (t.includes('bug')) return '\uf41d'; // bug icon
    if (t.includes('task')) return '\uf0f7'; // task icon
    if (t.includes('story') || t.includes('user story')) return '\uf413'; // book icon
    if (t.includes('feature')) return '\uf0e7'; // star icon
    if (t.includes('epic')) return '\uf0f2'; // layers icon
    return '\uf0c5'; // default work item icon
  }

  function getPriorityClass(priority) {
    const p = Number(priority) || 3;
    if (p === 1) return 'priority-1';
    if (p === 2) return 'priority-2';
    if (p === 3) return 'priority-3';
    if (p === 4) return 'priority-4';
    return 'priority-3';
  }

  function extractDescription(it) {
    const raw = it?.fields?.['System.Description'];
    if (!raw || typeof raw !== 'string') return '';
    // Strip HTML tags & collapse whitespace
    const text = raw
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ') // collapse
      .trim();
    const max = 120;
    if (text.length <= max) return text;
    return text.slice(0, max).trimEnd() + '…';
  }

  $: kanbanGroups = (() => {
    // Derive buckets present from items
    const present = new Set(bucketOrder);
    const groups = Object.fromEntries(bucketOrder.map((k) => [k, []]));
    (items || []).forEach((it) => {
      const norm = normalizeState(it?.fields?.['System.State']);
      if (!present.has(norm)) present.add(norm);
      (groups[norm] || groups['new']).push(it);
    });
    return groups;
  })();

  $: columnDefs = bucketOrder
    .filter(
      (k) =>
        (kanbanGroups[k] || []).length > 0 ||
        ['new', 'active', 'inprogress', 'review', 'done'].includes(k)
    )
    .map((k) => ({ key: k, label: bucketLabels[k] || k }));
</script>

<div class="pane">
  <!-- Connection Tabs (only show if multiple connections) -->
  {#if connections && connections.length > 1}
    <div class="connection-tabs" role="tablist" aria-label="Project connections">
      {#each connections as connection}
        <button
          class="connection-tab"
          class:active={connection.id === activeConnectionId}
          on:click={() => dispatch('connectionChanged', { connectionId: connection.id })}
          role="tab"
          aria-selected={connection.id === activeConnectionId}
          aria-label={`Switch to ${connection.label}`}
          title={`${connection.organization}/${connection.project}`}
        >
          {connection.label}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Query Selector Row -->
  <div class="query-header" role="toolbar" aria-label="Query selection">
    <div class="query-selector-container">
      <label for="querySelect" class="query-selector-label">Query</label>
      <select
        id="querySelect"
        class="query-selector"
        bind:value={selectedQuery}
        on:change={onQueryChange}
        title="Select a query to filter work items"
        aria-label="Select query"
      >
        {#each queryOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      {#if queryDescription}
        <div class="query-description">{queryDescription}</div>
      {/if}
    </div>
  </div>

  <!-- Main Controls Row -->
  <div class="pane-header" role="toolbar" aria-label="Work Items actions">
    <span style="font-weight:600;">Work Items</span>
    {#if subtitle}
      <span class="muted">({subtitle})</span>
    {/if}
    {#if loading}
      <span class="spinner" role="status" aria-label="Loading" title="Loading"></span>
    {/if}
    <span class="count">{workItemCount}</span>
    {#if timerActive}
      <span class="muted"
        >• {timerRunning ? 'Running' : 'Paused'}
        {#if timerElapsedLabel}({timerElapsedLabel}){/if}</span
      >
      {#if activeId}
        <button
          on:click={onOpenActive}
          title={activeTitle || 'Open active work item'}
          aria-label={`Open active work item #${activeId}`}>#{activeId}</button
        >
      {/if}
    {/if}
    <span class="actions" style="margin-left:auto;">
      <span class="filters" aria-label="Filters and sort">
        <input
          placeholder="Filter..."
          value={filterText}
          on:input={onFilterInput}
          aria-label="Filter work items"
        />
        <select
          on:change={onTypeFilterChange}
          bind:value={typeFilter}
          aria-label="Filter by work item type"
        >
          <option value="">All types</option>
          {#if availableTypes && availableTypes.length}
            {#each availableTypes as typeName}
              <option value={typeName}>{typeName}</option>
            {/each}
          {/if}
        </select>
        <select
          on:change={onStateFilterChange}
          bind:value={stateFilter}
          aria-label="Filter by state"
        >
          <option value="all">All</option>
          {#if availableStates && availableStates.length}
            {#each availableStates as s}
              <option value={s}>{bucketLabels[s] || s}</option>
            {/each}
          {:else}
            {#each columnDefs as c}
              <option value={c.key}>{c.label}</option>
            {/each}
          {/if}
        </select>
        <select on:change={onSortChange} bind:value={sortKey} aria-label="Sort items">
          <option value="updated-desc">Updated ↓</option>
          <option value="id-desc">ID ↓</option>
          <option value="id-asc">ID ↑</option>
          <option value="title-asc">Title A→Z</option>
        </select>
      </span>
    </span>
  </div>

  <div class="pane-body">
    {#if errorMsg}
      <div class="error-banner" role="alert">{errorMsg}</div>
    {/if}
    {#if loading}
      <div class="loading">
        <span class="spinner" role="status" aria-label="Loading"></span> Loading work items…
      </div>
    {:else if kanbanView}
      <div class="kanban-board" aria-label="Kanban board">
        {#each columnDefs as col}
          <div
            class="kanban-column state-{col.key}"
            on:dragover={allowDrop}
            on:drop={(e) => handleDrop(e, col.key)}
            role="listbox"
            tabindex="0"
            aria-label={`${col.label} column - drop items here`}
          >
            <div class="kanban-column-header">
              <h3>{col.label}</h3>
              <span class="item-count">{kanbanGroups[col.key]?.length || 0}</span>
            </div>
            <div class="kanban-column-content">
              {#if kanbanGroups[col.key]?.length}
                {#each kanbanGroups[col.key] as it}
                  <div
                    class="work-item-card kanban-card state-{normalizeState(
                      it.fields?.['System.State']
                    )} {timerActive && activeId === Number(it.id) ? 'has-active-timer' : ''}"
                    tabindex="0"
                    draggable="true"
                    on:dragstart={(e) => handleDragStart(e, it)}
                    on:keydown={(e) => {
                      if (
                        kanbanView &&
                        (e.ctrlKey || e.metaKey) &&
                        (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
                      ) {
                        e.preventDefault();
                        const currentKey = normalizeState(it.fields?.['System.State']);
                        const idx = columnDefs.findIndex((c) => c.key === currentKey);
                        if (idx !== -1) {
                          const nextIdx = e.key === 'ArrowLeft' ? idx - 1 : idx + 1;
                          const target = columnDefs[nextIdx];
                          if (target) {
                            const label = target.label || target.key;
                            dispatch('moveItem', {
                              id: it.id,
                              target: target.key,
                              targetState: label,
                            });
                          }
                        }
                      }
                    }}
                    role="button"
                    aria-label={`Work item #${it.id}: ${it.fields?.['System.Title']} - use action buttons to interact`}
                  >
                    <div class="work-item-header">
                      <span class="work-item-type-icon"
                        >{getWorkItemTypeIcon(it.fields?.['System.WorkItemType'])}</span
                      >
                      <span class="work-item-id">#{it.id}</span>
                      {#if timerActive && activeId === Number(it.id)}
                        <span class="timer-indicator"
                          ><span class="codicon codicon-clock" aria-hidden="true"></span>
                          {timerElapsedLabel}</span
                        >
                      {/if}
                      <span
                        class="work-item-priority {getPriorityClass(
                          it.fields?.['Microsoft.VSTS.Common.Priority']
                        )}"
                      >
                        {it.fields?.['Microsoft.VSTS.Common.Priority'] || '3'}
                      </span>
                    </div>

                    <div class="work-item-content">
                      <div class="work-item-title">
                        {it.fields?.['System.Title'] || `Work Item #${it.id}`}
                      </div>
                      {#if extractDescription(it)}
                        <div class="work-item-desc" title={extractDescription(it)}>
                          {extractDescription(it)}
                        </div>
                      {/if}

                      <!-- Summary Composer for this work item -->
                      {#if summaryWorkItemId === Number(it.id)}
                        <div class="work-item-summary">
                          <div class="summary-header">
                            <div class="summary-context">
                              <span class="summary-target-label">Comment</span>
                              <span class="summary-provider-badge"
                                >{summaryProvider === 'openai' ? 'OpenAI' : 'Copilot'}</span
                              >
                              {#if timerActive && activeId === Number(it.id)}
                                <span class="summary-target-timer"
                                  >{timerRunning ? 'Running' : 'Paused'}
                                  {#if timerElapsedLabel}
                                    ({timerElapsedLabel})
                                  {/if}</span
                                >
                              {/if}
                            </div>
                            <div class="summary-header-actions">
                              {#if summaryBusy}
                                <span
                                  class="spinner inline"
                                  role="status"
                                  aria-label="Generating summary"
                                ></span>
                              {/if}
                              <button
                                class="action-btn cancel compact"
                                on:click|preventDefault={onCancelSummary}
                                title="Cancel"
                                aria-label="Cancel"
                              >
                                <span class="codicon codicon-close" aria-hidden="true"></span>
                              </button>
                            </div>
                          </div>
                          <textarea
                            class="summary-textarea"
                            placeholder="Draft a concise update for this work item…"
                            value={summaryDraft}
                            on:input={onSummaryInput}
                            on:blur={onSummaryBlur}
                            rows="3"
                            disabled={summaryAreaDisabled}
                          ></textarea>
                          <div class="summary-actions">
                            <div class="summary-buttons">
                              <button
                                class="action-btn summary-generate"
                                on:click|preventDefault={onGenerateSummary}
                                title={summaryButtonLabel}
                                aria-label={summaryButtonLabel}
                                disabled={summaryGenerateDisabled}
                              >
                                <span class="codicon codicon-rocket" aria-hidden="true"></span>
                                {summaryButtonLabel}
                              </button>
                              {#if timerActive && activeId === Number(it.id)}
                                <button
                                  class="action-btn summary-apply"
                                  on:click|preventDefault={onStopAndApplySummary}
                                  title="Stop timer and apply time entry with this summary"
                                  aria-label="Stop timer and apply time entry with this summary"
                                  disabled={summaryApplyDisabled}
                                >
                                  <span class="codicon codicon-check" aria-hidden="true"></span>
                                  Stop &amp; Apply
                                </button>
                              {:else}
                                <button
                                  class="action-btn summary-apply"
                                  on:click|preventDefault={() =>
                                    dispatch('applySummary', { workItemId: it.id })}
                                  title="Apply summary as comment"
                                  aria-label="Apply summary as comment"
                                  disabled={summaryBusy || !summaryDraft.trim()}
                                >
                                  <span class="codicon codicon-check" aria-hidden="true"></span>
                                  Apply
                                </button>
                              {/if}
                            </div>
                            <div class="summary-helper">{summaryHelperText}</div>
                          </div>
                          {#if summaryStatus}
                            <div class="summary-status" aria-live="polite">{summaryStatus}</div>
                          {/if}
                        </div>
                      {/if}

                      <div class="work-item-meta">
                        <span class="work-item-type"
                          >{it.fields?.['System.WorkItemType'] || 'Task'}</span
                        >
                        {#if it.fields?.['System.AssignedTo']}
                          <span class="work-item-assignee">
                            <span class="codicon codicon-account" aria-hidden="true"></span>
                            {it.fields['System.AssignedTo'].displayName ||
                              it.fields['System.AssignedTo']}
                          </span>
                        {/if}
                      </div>
                    </div>

                    <div class="work-item-actions">
                      {#if timerActive && activeId === Number(it.id)}
                        <button
                          class="action-btn stop compact"
                          on:click|stopPropagation={() => dispatch('stopTimer')}
                          title="Stop timer"
                          aria-label={`Stop timer for #${it.id}`}
                        >
                          <span class="codicon codicon-debug-stop" aria-hidden="true"></span>
                        </button>
                      {:else}
                        <button
                          class="action-btn start compact"
                          on:click|stopPropagation={() => dispatch('startItem', { id: it.id })}
                          title="Start timer"
                          aria-label={`Start timer for #${it.id}`}
                          disabled={timerActive}
                        >
                          <span class="codicon codicon-play" aria-hidden="true"></span>
                        </button>
                      {/if}
                      <button
                        class="action-btn view compact"
                        on:click|stopPropagation={() => dispatch('openItem', { id: it.id })}
                        title="View"
                        aria-label={`View work item #${it.id}`}
                      >
                        <span class="codicon codicon-eye" aria-hidden="true"></span>
                      </button>
                      <button
                        class="action-btn edit compact"
                        on:click|stopPropagation={() => dispatch('editItem', { id: it.id })}
                        title="Edit"
                        aria-label={`Edit work item #${it.id}`}
                      >
                        <span class="codicon codicon-edit" aria-hidden="true"></span>
                      </button>
                      <button
                        class="action-btn comment compact"
                        on:click|stopPropagation={() => dispatch('commentItem', { id: it.id })}
                        title="Comment"
                        aria-label={`Add comment to #${it.id}`}
                      >
                        <span class="codicon codicon-comment" aria-hidden="true"></span>
                      </button>
                    </div>
                  </div>
                {/each}
              {:else}
                <div class="empty">No items</div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {:else if items && items.length}
      <div class="items" aria-label="Work items">
        {#each items.slice(0, 50) as it}
          <div
            class="work-item-card {timerActive && activeId === Number(it.id)
              ? 'has-active-timer'
              : ''}"
            tabindex="0"
            role="button"
            aria-label={`Work item #${it.id}: ${it.fields?.['System.Title']} - use action buttons to interact`}
          >
            <div class="work-item-header">
              <span class="work-item-type-icon"
                >{getWorkItemTypeIcon(it.fields?.['System.WorkItemType'])}</span
              >
              <span class="work-item-id">#{it.id}</span>
              {#if timerActive && activeId === Number(it.id)}
                <span class="timer-indicator"
                  ><span class="codicon codicon-clock" aria-hidden="true"></span>
                  {timerElapsedLabel}</span
                >
              {/if}
              <span
                class="work-item-priority {getPriorityClass(
                  it.fields?.['Microsoft.VSTS.Common.Priority']
                )}"
              >
                {it.fields?.['Microsoft.VSTS.Common.Priority'] || '3'}
              </span>
            </div>

            <div class="work-item-content">
              <div class="work-item-title">
                {it.fields?.['System.Title'] || `Work Item #${it.id}`}
              </div>
              {#if extractDescription(it)}
                <div class="work-item-desc" title={extractDescription(it)}>
                  {extractDescription(it)}
                </div>
              {/if}

              <!-- Summary Composer for this work item -->
              {#if summaryWorkItemId === Number(it.id)}
                <div class="work-item-summary">
                  <div class="summary-header">
                    <div class="summary-context">
                      <span class="summary-target-label">Comment</span>
                      <span class="summary-provider-badge"
                        >{summaryProvider === 'openai' ? 'OpenAI' : 'Copilot'}</span
                      >
                      {#if timerActive && activeId === Number(it.id)}
                        <span class="summary-target-timer"
                          >{timerRunning ? 'Running' : 'Paused'}
                          {#if timerElapsedLabel}
                            ({timerElapsedLabel})
                          {/if}</span
                        >
                      {/if}
                    </div>
                    <div class="summary-header-actions">
                      {#if summaryBusy}
                        <span class="spinner inline" role="status" aria-label="Generating summary"
                        ></span>
                      {/if}
                      <button
                        class="action-btn cancel compact"
                        on:click|preventDefault={onCancelSummary}
                        title="Cancel"
                        aria-label="Cancel"
                      >
                        <span class="codicon codicon-close" aria-hidden="true"></span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    class="summary-textarea"
                    placeholder="Draft a concise update for this work item…"
                    value={summaryDraft}
                    on:input={onSummaryInput}
                    on:blur={onSummaryBlur}
                    rows="3"
                    disabled={summaryAreaDisabled}
                  ></textarea>
                  <div class="summary-actions">
                    <div class="summary-buttons">
                      <button
                        class="action-btn summary-generate"
                        on:click|preventDefault={onGenerateSummary}
                        title={summaryButtonLabel}
                        aria-label={summaryButtonLabel}
                        disabled={summaryGenerateDisabled}
                      >
                        <span class="codicon codicon-rocket" aria-hidden="true"></span>
                        {summaryButtonLabel}
                      </button>
                      {#if timerActive && activeId === Number(it.id)}
                        <button
                          class="action-btn summary-apply"
                          on:click|preventDefault={onStopAndApplySummary}
                          title="Stop timer and apply time entry with this summary"
                          aria-label="Stop timer and apply time entry with this summary"
                          disabled={summaryApplyDisabled}
                        >
                          <span class="codicon codicon-check" aria-hidden="true"></span>
                          Stop &amp; Apply
                        </button>
                      {:else}
                        <button
                          class="action-btn summary-apply"
                          on:click|preventDefault={() =>
                            dispatch('applySummary', { workItemId: it.id })}
                          title="Apply summary as comment"
                          aria-label="Apply summary as comment"
                          disabled={summaryBusy || !summaryDraft.trim()}
                        >
                          <span class="codicon codicon-check" aria-hidden="true"></span>
                          Apply
                        </button>
                      {/if}
                    </div>
                    <div class="summary-helper">{summaryHelperText}</div>
                  </div>
                  {#if summaryStatus}
                    <div class="summary-status" aria-live="polite">{summaryStatus}</div>
                  {/if}
                </div>
              {/if}

              <div class="work-item-meta">
                <span class="work-item-type">{it.fields?.['System.WorkItemType'] || 'Task'}</span>
                <span class="work-item-state state-{normalizeState(it.fields?.['System.State'])}"
                  >{it.fields?.['System.State'] || 'New'}</span
                >
                <span class="work-item-assignee">
                  {#if it.fields?.['System.AssignedTo']}
                    <span class="codicon codicon-account" aria-hidden="true"></span>
                    {it.fields['System.AssignedTo'].displayName || it.fields['System.AssignedTo']}
                  {:else}
                    <span class="codicon codicon-account" aria-hidden="true"></span> Unassigned
                  {/if}
                </span>
              </div>
            </div>

            <div class="work-item-actions">
              {#if timerActive && activeId === Number(it.id)}
                <button
                  class="action-btn stop"
                  on:click|stopPropagation={() => dispatch('stopTimer')}
                  title="Stop timer"
                  aria-label={`Stop timer for #${it.id}`}
                >
                  <span class="codicon codicon-debug-stop" aria-hidden="true"></span> Stop
                </button>
              {:else}
                <button
                  class="action-btn start"
                  on:click|stopPropagation={() => dispatch('startItem', { id: it.id })}
                  title="Start timer"
                  aria-label={`Start timer for #${it.id}`}
                  disabled={timerActive}
                >
                  <span class="codicon codicon-play" aria-hidden="true"></span> Start
                </button>
              {/if}
              <button
                class="action-btn view"
                on:click|stopPropagation={() => dispatch('openItem', { id: it.id })}
                title="View in browser"
                aria-label={`View work item #${it.id}`}
              >
                <span class="codicon codicon-eye" aria-hidden="true"></span> View
              </button>
              <button
                class="action-btn edit"
                on:click|stopPropagation={() => dispatch('editItem', { id: it.id })}
                title="Edit work item"
                aria-label={`Edit work item #${it.id}`}
              >
                <span class="codicon codicon-edit" aria-hidden="true"></span> Edit
              </button>
              <button
                class="action-btn comment"
                on:click|stopPropagation={() => dispatch('commentItem', { id: it.id })}
                title="Add comment"
                aria-label={`Add comment to #${it.id}`}
              >
                <span class="codicon codicon-comment" aria-hidden="true"></span> Comment
              </button>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty">No work items to display.</div>
    {/if}
  </div>
  <Toasts ariaLabel="Work item notifications" />
</div>

<style>
  .pane {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    font-family: var(--vscode-font-family);
  }

  /* Connection Tabs */
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
    border-bottom: 2px solid var(--vscode-tab-activeBorder, var(--ado-blue));
  }

  .connection-tab:focus {
    outline: 1px solid var(--vscode-focusBorder);
    outline-offset: -1px;
  }

  .query-header {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid var(--vscode-editorWidget-border);
    background: var(--vscode-editorGroupHeader-tabsBackground);
    flex-shrink: 0;
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
    flex-shrink: 0;
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
  .filters {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    margin-left: 8px;
    flex-wrap: wrap;
  }

  /* Query Selector Styles */
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
    margin-bottom: 2px;
  }

  .query-selector {
    font-size: 13px;
    padding: 6px 8px;
    border: 1px solid var(--vscode-input-border);
    background-color: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border-radius: 3px;
    transition: border-color 0.2s ease;
  }

  .query-selector:focus {
    outline: none;
    border-color: var(--vscode-focusBorder);
    box-shadow: 0 0 0 1px var(--vscode-focusBorder);
  }

  .query-selector:hover {
    border-color: var(--vscode-inputOption-hoverBorder);
  }

  .query-description {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.3;
    margin-top: 2px;
    min-height: 14px;
    opacity: 0.8;
  }
  .filters input,
  .filters select {
    font-size: 11px;
    padding: 4px 8px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 3px;
  }

  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid var(--vscode-editorWidget-border);
    border-top-color: var(--ado-blue);
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

  button {
    font-size: 11px;
    padding: 4px 8px;
    color: var(--vscode-button-foreground);
    background: var(--ado-blue);
    border: 1px solid transparent;
    border-radius: 3px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--vscode-font-family);
  }

  button:hover {
    background: var(--ado-blue-light);
  }
  button[disabled] {
    opacity: 0.5;
    cursor: default;
    filter: grayscale(0.2);
  }

  .pane-body {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .work-item-summary {
    margin: 8px 0;
    padding: 8px;
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 4px;
    background: var(--vscode-editorWidget-background);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .summary-panel {
    margin: 12px;
    padding: 12px;
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 6px;
    background: var(--vscode-editorWidget-background);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .summary-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .summary-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .summary-context {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    flex-wrap: wrap;
  }
  .summary-target-label {
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 10px;
    color: var(--vscode-descriptionForeground, #888);
  }
  .summary-target-value {
    font-weight: 600;
    color: var(--vscode-editor-foreground);
    background: rgba(0, 120, 212, 0.12);
    padding: 2px 6px;
    border-radius: 12px;
  }
  .summary-provider-badge {
    font-size: 10px;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 10px;
    background: rgba(92, 45, 145, 0.2);
    color: var(--ado-purple);
    font-weight: 600;
  }
  .summary-target-timer {
    font-size: 10px;
    color: var(--ado-orange);
    background: rgba(255, 140, 0, 0.18);
    padding: 2px 6px;
    border-radius: 10px;
    border: 1px solid rgba(255, 140, 0, 0.35);
  }
  .summary-textarea {
    width: 100%;
    min-height: 120px;
    resize: vertical;
    padding: 8px;
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    font-size: 12px;
    font-family: var(--vscode-font-family);
  }
  .summary-textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .summary-actions {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .summary-buttons {
    display: inline-flex;
    gap: 8px;
  }
  .summary-helper {
    font-size: 11px;
    opacity: 0.75;
    max-width: 320px;
  }
  .summary-generate {
    background: var(--ado-blue);
    color: #fff;
    border-color: var(--ado-blue);
  }
  .summary-generate:hover {
    background: var(--ado-blue-light);
  }
  .summary-apply {
    background: var(--ado-green);
    color: #fff;
    border-color: var(--ado-green);
  }
  .summary-apply:hover {
    background: rgba(16, 124, 16, 0.85);
  }
  .summary-status,
  .summary-status-inline {
    font-size: 11px;
    background: rgba(0, 120, 212, 0.12);
    color: var(--ado-blue);
    border-radius: 4px;
    padding: 6px 8px;
    margin-top: 2px;
  }
  .summary-status-inline {
    margin: 8px 12px 0 12px;
  }
  .spinner.inline {
    width: 10px;
    height: 10px;
    border-width: 2px;
  }

  .empty {
    padding: 20px;
    font-size: 14px;
    opacity: 0.7;
    text-align: center;
  }

  .loading {
    padding: 20px;
    font-size: 14px;
    opacity: 0.9;
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
  }

  .error-banner {
    margin: 8px;
    padding: 8px;
    border: 1px solid var(--ado-red);
    background: rgba(209, 52, 56, 0.1);
    color: var(--ado-red);
    border-radius: 4px;
    font-size: 12px;
  }

  /* Work Item Cards */
  .items {
    padding: 8px;
    overflow-y: auto;
    flex: 1;
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
    border-color: var(--ado-blue);
    box-shadow: 0 2px 8px rgba(0, 120, 212, 0.1);
  }

  .work-item-card.has-active-timer {
    border-left: 3px solid var(--ado-orange);
  }

  .work-item-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
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
    color: var(--ado-blue);
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
    color: var(--ado-red);
  }
  .priority-2 {
    color: var(--ado-orange);
  }
  .priority-3 {
    color: var(--ado-blue);
  }
  .priority-4 {
    color: var(--ado-gray);
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

  .work-item-desc {
    font-size: 11px;
    line-height: 1.3;
    margin-bottom: 6px;
    opacity: 0.75;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-word;
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

  .state-todo,
  .state-new {
    background: rgba(0, 120, 212, 0.2);
    color: var(--state-new);
  }
  .state-active,
  .state-inprogress,
  .state-doing {
    background: rgba(255, 140, 0, 0.2);
    color: var(--state-active);
  }
  .state-resolved,
  .state-done,
  .state-closed {
    background: rgba(16, 124, 16, 0.2);
    color: var(--state-resolved);
  }
  .state-removed {
    background: rgba(209, 52, 56, 0.2);
    color: var(--state-removed);
  }
  .state-review {
    background: rgba(92, 45, 145, 0.2);
    color: var(--ado-purple);
  }

  .timer-indicator {
    background: rgba(255, 140, 0, 0.2);
    color: var(--ado-orange);
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
    font-family: 'codicon';
  }

  .action-btn:hover {
    background: var(--vscode-button-secondaryHoverBackground);
    border-color: var(--ado-blue);
  }

  .action-btn.start {
    background: var(--ado-green);
    color: white;
    border-color: var(--ado-green);
  }
  .action-btn.start:hover {
    background: rgba(16, 124, 16, 0.8);
  }

  .action-btn.stop {
    background: var(--ado-red);
    color: white;
    border-color: var(--ado-red);
  }
  .action-btn.stop:hover {
    background: rgba(209, 52, 56, 0.8);
  }

  .action-btn.view {
    background: var(--ado-blue);
    color: white;
    border-color: var(--ado-blue);
  }
  .action-btn.view:hover {
    background: var(--ado-blue-light);
  }

  .action-btn.edit {
    background: var(--ado-purple);
    color: white;
    border-color: var(--ado-purple);
  }
  .action-btn.edit:hover {
    background: rgba(92, 45, 145, 0.8);
  }

  .action-btn.comment {
    background: var(--ado-gray);
    color: white;
    border-color: var(--ado-gray);
  }
  .action-btn.comment:hover {
    background: var(--ado-gray-light);
  }

  .action-btn.cancel {
    background: #dc3545;
    color: white;
    border-color: #dc3545;
  }

  .action-btn.cancel:hover {
    background: #c82333;
    border-color: #bd2130;
  }

  /* Kanban styles */
  .kanban-board {
    display: flex;
    gap: 12px;
    padding: 8px;
    overflow-x: auto;
    flex: 1;
  }

  .kanban-column {
    min-width: 280px;
    max-width: 320px;
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 6px;
    background: var(--vscode-editorWidget-background);
    display: flex;
    flex-direction: column;
  }

  .kanban-column-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--vscode-editorWidget-border);
    background: var(--vscode-editorGroupHeader-tabsBackground);
    border-top: 3px solid transparent;
  }

  .kanban-column-header h3 {
    font-size: 13px;
    font-weight: 600;
    margin: 0;
  }

  .item-count {
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
  }

  .kanban-column-content {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    flex: 1;
  }

  .kanban-card {
    border: 1px solid var(--vscode-editorWidget-border);
    border-radius: 6px;
    padding: 10px;
    background: var(--vscode-editor-background);
    border-left: 3px solid transparent;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .kanban-card:hover {
    background: var(--vscode-list-hoverBackground);
    border-color: var(--ado-blue);
  }

  .kanban-card .title {
    font-weight: 600;
    margin-bottom: 4px;
    color: var(--vscode-editor-foreground);
    font-size: 13px;
  }

  .kanban-card .meta {
    font-size: 11px;
    opacity: 0.8;
    margin-bottom: 6px;
  }

  .kanban-card .actions {
    display: inline-flex;
    gap: 4px;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .kanban-card:hover .actions {
    opacity: 1;
  }

  /* Column header accents by state */
  .kanban-column.state-todo .kanban-column-header {
    border-top-color: var(--state-new);
  }
  .kanban-column.state-active .kanban-column-header {
    border-top-color: var(--state-active);
  }
  .kanban-column.state-inprogress .kanban-column-header {
    border-top-color: var(--state-active);
  }
  .kanban-column.state-review .kanban-column-header {
    border-top-color: var(--ado-purple);
  }
  .kanban-column.state-resolved .kanban-column-header {
    border-top-color: var(--state-resolved);
  }
  .kanban-column.state-done .kanban-column-header {
    border-top-color: var(--state-resolved);
  }
  .kanban-column.state-removed .kanban-column-header {
    border-top-color: var(--state-removed);
  }

  /* Card accents by state */
  .kanban-card.state-todo {
    border-left-color: var(--state-new);
  }
  .kanban-card.state-active {
    border-left-color: var(--state-active);
  }
  .kanban-card.state-inprogress {
    border-left-color: var(--state-active);
  }
  .kanban-card.state-review {
    border-left-color: var(--ado-purple);
  }
  .kanban-card.state-resolved {
    border-left-color: var(--state-resolved);
  }
  .kanban-card.state-done {
    border-left-color: var(--state-resolved);
  }
  .kanban-card.state-removed {
    border-left-color: var(--state-removed);
  }

  /* Compact action buttons for kanban view */
  .action-btn.compact {
    min-width: 28px;
    padding: 4px 6px;
    font-size: 12px;
  }

  .kanban-card .work-item-actions {
    justify-content: center;
    gap: 4px;
  }

  .kanban-card .work-item-header {
    margin-bottom: 6px;
  }

  .kanban-card .work-item-content {
    margin-bottom: 8px;
  }

  /* Timer indicator adjustments for kanban */
  .kanban-card .timer-indicator {
    font-size: 10px;
    margin-left: auto;
  }
</style>
