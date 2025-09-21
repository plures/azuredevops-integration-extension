const vscode = (() => {
  try {
    return window.vscode || acquireVsCodeApi();
  } catch (e) {
    console.error('[webview] Failed to acquire VS Code API', e);
    return null;
  }
})();
function postMessage(msg) {
  try {
    if (vscode && typeof vscode.postMessage === 'function') {
      vscode.postMessage(msg);
      return;
    }
    if (
      typeof window !== 'undefined' &&
      window.vscode &&
      typeof window.vscode.postMessage === 'function'
    ) {
      window.vscode.postMessage(msg);
      return;
    }
    console.warn('[webview] vscode.postMessage not available; message not sent', msg);
  } catch (err) {
    console.error('[webview] Error posting message to extension', err, msg);
  }
}
let workItems = [];
let currentTimer = null;
let selectedWorkItemId = null;
let isLoading = false;
let currentView = 'list';
const elements = {
  searchInput: null,
  statusOverview: null,
  sprintFilter: null,
  typeFilter: null,
  assignedToFilter: null,
  excludeDone: null,
  excludeClosed: null,
  excludeRemoved: null,
  excludeInReview: null,
  workItemsContainer: null,
  timerContainer: null,
  timerDisplay: null,
  timerTask: null,
  content: null,
  timerInfo: null,
  startTimerBtn: null,
  pauseTimerBtn: null,
  stopTimerBtn: null,
  draftSummary: null,
  summaryContainer: null,
  toggleSummaryBtn: null,
  summaryStatus: null,
};
function init() {
  elements.searchInput = document.getElementById('searchInput');
  elements.statusOverview = document.getElementById('statusOverview');
  elements.sprintFilter = document.getElementById('sprintFilter');
  elements.typeFilter = document.getElementById('typeFilter');
  elements.assignedToFilter = document.getElementById('assignedToFilter');
  elements.excludeDone = document.getElementById('excludeDone');
  elements.excludeClosed = document.getElementById('excludeClosed');
  elements.excludeRemoved = document.getElementById('excludeRemoved');
  elements.excludeInReview = document.getElementById('excludeInReview');
  elements.workItemsContainer = document.getElementById('workItemsContainer');
  elements.timerContainer = document.getElementById('timerContainer');
  elements.timerDisplay = document.getElementById('timerDisplay');
  elements.timerInfo = document.getElementById('timerInfo');
  const startTimerBtn = document.getElementById('startTimerBtn');
  const pauseTimerBtn = document.getElementById('pauseTimerBtn');
  const stopTimerBtn = document.getElementById('stopTimerBtn');
  elements.startTimerBtn = startTimerBtn;
  elements.pauseTimerBtn = pauseTimerBtn;
  elements.stopTimerBtn = stopTimerBtn;
  elements.content = document.getElementById('content');
  elements.draftSummary = document.getElementById('draftSummary');
  elements.summaryContainer = document.getElementById('summaryContainer');
  elements.toggleSummaryBtn = document.getElementById('toggleSummaryBtn');
  elements.summaryStatus = document.getElementById('summaryStatus');
  if (!elements.workItemsContainer) {
    console.error('[webview] Critical: workItemsContainer element not found');
    return;
  }
  console.log('[webview] Initializing webview...');
  setupEventListeners();
  setupMessageHandling();
  console.log('[webview] Setting timer visibility to false during init');
  updateTimerVisibility(false);
  postMessage({ type: 'webviewReady' });
  requestWorkItems();
}
function setupEventListeners() {
  document.addEventListener('click', function (e) {
    const statusBadge = e.target.closest('.status-badge');
    if (statusBadge) {
      const status = statusBadge.getAttribute('data-status');
      if (status) {
        filterByStatus(status);
      }
      return;
    }
    const workItemCard = e.target.closest('[data-action="selectWorkItem"]');
    if (workItemCard && !e.target.closest('button')) {
      const id = parseInt(workItemCard.getAttribute('data-id') || '0');
      selectWorkItem(id.toString());
      return;
    }
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    e.stopPropagation();
    const action = button.getAttribute('data-action');
    const id = button.getAttribute('data-id')
      ? parseInt(button.getAttribute('data-id') || '0')
      : null;
    console.log('[webview] Button clicked:', action, 'id:', id);
    switch (action) {
      case 'refresh':
        requestWorkItems();
        break;
      case 'toggleSummary': {
        const container = elements.summaryContainer;
        const toggleBtn = elements.toggleSummaryBtn;
        if (!container) return;
        const isHidden = container.hasAttribute('hidden');
        if (isHidden) {
          container.removeAttribute('hidden');
          if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
          if (toggleBtn) toggleBtn.textContent = 'Compose Summary ▴';
        } else {
          container.setAttribute('hidden', '');
          if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
          if (toggleBtn) toggleBtn.textContent = 'Compose Summary ▾';
        }
        break;
      }
      case 'generateCopilotPrompt': {
        const workItemId = id || (currentTimer ? currentTimer.workItemId : undefined);
        const draft = elements.draftSummary ? elements.draftSummary.value : '';
        if (!workItemId) {
          console.warn('[webview] generateCopilotPrompt: no work item id available');
          if (elements.summaryStatus)
            elements.summaryStatus.textContent = 'No work item selected to generate prompt.';
          return;
        }
        if (elements.summaryStatus)
          elements.summaryStatus.textContent =
            'Preparing Copilot prompt and copying to clipboard...';
        postMessage({ type: 'generateCopilotPrompt', workItemId, draftSummary: draft });
        break;
      }
      case 'stopAndApply': {
        const draft = elements.draftSummary ? elements.draftSummary.value : '';
        if (elements.summaryStatus)
          elements.summaryStatus.textContent = 'Stopping timer and applying updates...';
        postMessage({ type: 'stopAndApply', comment: draft });
        break;
      }
      case 'createWorkItem':
        postMessage({ type: 'createWorkItem' });
        break;
      case 'toggleView': {
        console.log('[webview] toggleView clicked');
        const viewBtn = e.target;
        const view = viewBtn.dataset.view;
        console.log('[webview] View button clicked:', view, 'Current view:', currentView);
        if (view && view !== currentView) {
          currentView = view;
          updateViewToggle();
          console.log('[webview] Switching to view:', currentView);
          if (currentView === 'kanban') {
            renderKanbanView();
          } else {
            renderWorkItems();
          }
        }
        break;
      }
      case 'toggleKanban':
        currentView = currentView === 'list' ? 'kanban' : 'list';
        updateViewToggle();
        if (currentView === 'kanban') {
          renderKanbanView();
        } else {
          renderWorkItems();
        }
        break;
      case 'search': {
        const query = elements.searchInput?.value;
        if (query) {
          postMessage({ type: 'search', query });
        }
        break;
      }
      case 'pauseTimer':
        postMessage({ type: 'pauseTimer' });
        break;
      case 'resumeTimer':
        postMessage({ type: 'resumeTimer' });
        break;
      case 'stopTimer':
        postMessage({ type: 'stopTimer' });
        break;
      case 'startTimer': {
        const targetId =
          id ?? selectedWorkItemId ?? (currentTimer ? Number(currentTimer.workItemId) : null);
        if (targetId) {
          if (currentTimer && Number(currentTimer.workItemId) === Number(targetId)) {
            postMessage({ type: 'stopTimer' });
          } else {
            postMessage({ type: 'startTimer', workItemId: Number(targetId) });
          }
        } else {
          console.warn(
            '[webview] startTimer requested but no work item is selected and no active timer'
          );
        }
        break;
      }
      case 'createBranch':
        if (id) postMessage({ type: 'createBranch', id });
        break;
      case 'openInBrowser':
        if (id) postMessage({ type: 'openInBrowser', id });
        break;
      case 'copyId':
        if (id) postMessage({ type: 'copyId', id });
        break;
      case 'viewDetails':
        if (id) postMessage({ type: 'viewWorkItem', workItemId: id });
        break;
      case 'editWorkItem':
        if (id) postMessage({ type: 'editWorkItemInEditor', workItemId: id });
        break;
      case 'addComment':
        if (id) handleAddComment(id);
        break;
    }
  });
  document.addEventListener('change', function (e) {
    const target = e.target;
    const select = target.closest('select[data-action]');
    if (select) {
      const action = select.getAttribute('data-action');
      if (action === 'applyFilters') {
        applyFilters();
      }
      return;
    }
    const checkbox = target.closest('input[data-action]');
    if (checkbox && checkbox.type === 'checkbox') {
      const action = checkbox.getAttribute('data-action');
      if (action === 'applyFilters') {
        applyFilters();
      }
    }
  });
  elements.searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = elements.searchInput?.value;
      if (query) {
        postMessage({ type: 'search', query });
      }
    }
  });
  elements.sprintFilter?.addEventListener('change', applyFilters);
  elements.typeFilter?.addEventListener('change', applyFilters);
  elements.assignedToFilter?.addEventListener('change', applyFilters);
}
function escapeHtml(input) {
  const str = String(input ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function updateTimerVisibility(visible) {
  const el = elements.timerContainer;
  if (!el) return;
  if (visible) {
    el.removeAttribute('hidden');
  } else {
    el.setAttribute('hidden', '');
  }
}
function selectWorkItem(id) {
  const num = parseInt(id, 10);
  if (!Number.isFinite(num)) return;
  selectedWorkItemId = num;
  document.querySelectorAll('[data-action="selectWorkItem"]').forEach((node) => {
    const el = node;
    const nid = parseInt(el.getAttribute('data-id') || '0', 10);
    if (nid === num) el.classList.add('selected');
    else el.classList.remove('selected');
  });
  try {
    const persisted = loadDraftForWorkItem(num);
    if (persisted !== null && elements.draftSummary) {
      elements.draftSummary.value = persisted;
    }
  } catch {}
}
function handleAddComment(workItemId) {
  postMessage({ type: 'addComment', workItemId });
}
function formatTimerDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}`;
  }
  return `${m}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')}`;
}
function updateTimerDisplay() {
  const d = elements.timerDisplay;
  const info = elements.timerInfo;
  if (!d) return;
  if (!currentTimer) {
    d.textContent = '00:00:00';
    if (info) info.textContent = '';
    updateTimerVisibility(false);
    return;
  }
  const secs = Number(currentTimer.elapsedSeconds || 0);
  const h = Math.floor(secs / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((secs % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(secs % 60)
    .toString()
    .padStart(2, '0');
  d.textContent = `${h}:${m}:${s}`;
  if (info)
    info.textContent = currentTimer.workItemTitle
      ? `#${currentTimer.workItemId} · ${currentTimer.workItemTitle}`
      : `#${currentTimer.workItemId}`;
  updateTimerVisibility(true);
}
function updateTimerButtonStates() {
  const startBtn = elements.startTimerBtn;
  const pauseBtn = elements.pauseTimerBtn;
  const stopBtn = elements.stopTimerBtn;
  const active = !!currentTimer && currentTimer.running !== false;
  if (startBtn) startBtn.disabled = active;
  if (pauseBtn) pauseBtn.disabled = !active;
  if (stopBtn) stopBtn.disabled = !currentTimer;
}
function handleToggleKanbanView() {
  currentView = currentView === 'list' ? 'kanban' : 'list';
  updateViewToggle();
  if (currentView === 'kanban') renderKanbanView();
  else renderWorkItems();
}
function handleSelfTestPing(nonce) {
  postMessage({ type: 'selfTestPong', nonce });
}
function getNormalizedState(item) {
  if (!item) return 'Unknown';
  const raw =
    item.state ||
    item.fields?.['System.State'] ||
    item['System.State'] ||
    item.fields?.['System.State.name'];
  const rawStr = typeof raw === 'string' && raw.trim() ? raw.trim() : '';
  if (!rawStr) return 'Unknown';
  const map = {
    todo: 'To Do',
    'to do': 'To Do',
    new: 'New',
    active: 'Active',
    'in progress': 'In Progress',
    doing: 'In Progress',
    'doing ': 'In Progress',
    'code review': 'Code Review',
    testing: 'Testing',
    done: 'Done',
    resolved: 'Resolved',
    closed: 'Closed',
    removed: 'Removed',
  };
  const key = rawStr.toLowerCase();
  return map[key] || rawStr;
}
function filterByStatus(status) {
  const filteredItems = workItems.filter((item) => {
    const s = getNormalizedState(item);
    return s === status;
  });
  if (elements.searchInput) elements.searchInput.value = '';
  if (elements.sprintFilter) elements.sprintFilter.value = '';
  if (elements.typeFilter) elements.typeFilter.value = '';
  if (elements.assignedToFilter) elements.assignedToFilter.value = '';
  elements.workItemsContainer.innerHTML = filteredItems
    .map((item) => {
      const id = item.id;
      const title = item.title || `Work Item #${id}`;
      const state = item.state || 'Unknown';
      const type = item.type || 'Unknown';
      const assignedTo = item.assignedTo || 'Unassigned';
      const priority = item.priority || 2;
      const description = item.description || '';
      const tags = item.tags || [];
      const iterationPath = item.iterationPath || '';
      const isSelected = selectedWorkItemId === id;
      const typeIcon = getWorkItemTypeIcon(type);
      const priorityClass = getPriorityClass(priority);
      const stateClass = getStateClass(getNormalizedState(item));
      return `
      <div class="work-item-card ${isSelected ? 'selected' : ''} ${stateClass}" 
           data-id="${id}" 
           data-action="selectWorkItem">
        <div class="work-item-header">
          <div class="work-item-type-icon ${typeIcon.class}">
            ${typeIcon.icon}
          </div>
          <div class="work-item-id">#${id}</div>
          <div class="work-item-priority ${priorityClass}">
            ${getPriorityIcon(priority).icon} ${getPriorityIcon(priority).label}
          </div>
        </div>
        
        <div class="work-item-content">
          <div class="work-item-title" title="${escapeHtml(title)}">
            ${escapeHtml(title)}
          </div>
          
          ${
            description
              ? `
            <div class="work-item-description">
              ${escapeHtml(description.substring(0, 120))}${description.length > 120 ? '...' : ''}
            </div>
          `
              : ''
          }
          
          <div class="work-item-details">
            <div class="work-item-meta-row">
              <span class="work-item-type">${escapeHtml(type)}</span>
              <span class="work-item-state state-${state
                .toLowerCase()
                .replace(/\\s+/g, '-')}">${escapeHtml(state)}</span>
            </div>
            
            ${
              assignedTo !== 'Unassigned'
                ? `
              <div class="work-item-assignee">
                <span class="assignee-icon">👤</span>
                <span>${escapeHtml(assignedTo)}</span>
              </div>
            `
                : ''
            }
            
            ${
              iterationPath
                ? `
              <div class="work-item-iteration">
                <span class="iteration-icon">🔄</span>
                <span>${escapeHtml(iterationPath.split('\\\\').pop() || iterationPath)}</span>
              </div>
            `
                : ''
            }
            
            ${
              tags.length > 0
                ? `
              <div class="work-item-tags">
                ${tags
                  .slice(0, 3)
                  .map(
                    (tag) => `
                  <span class="tag">${escapeHtml(tag)}</span>
                `
                  )
                  .join('')}
                ${tags.length > 3 ? `<span class="tag-overflow">+${tags.length - 3}</span>` : ''}
              </div>
            `
                : ''
            }
          </div>
        </div>
        
        <div class="work-item-actions">
          <button class="action-btn timer-btn" data-action="startTimer" data-id="${id}" title="Start/Stop Timer">
            ⏱️
          </button>
          <button class="action-btn view-btn" data-action="viewDetails" data-id="${id}" title="View Details">
            👁️
          </button>
          <button class="action-btn edit-btn" data-action="editWorkItem" data-id="${id}" title="Edit">
            ✏️
          </button>
        </div>
      </div>
    `;
    })
    .join('');
  updateStatusOverview(filteredItems);
}
function updateStatusOverview(items = workItems) {
  if (!elements.statusOverview) return;
  const statusCounts = items.reduce((acc, item) => {
    const status = getNormalizedState(item);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  elements.statusOverview.innerHTML = Object.entries(statusCounts)
    .map(([status, count]) => {
      const stateClass = getStateClass(String(status));
      const rawTitle = status;
      return `
        <div class="status-badge ${stateClass}" data-status="${status}" title="${escapeHtml(String(rawTitle))}">
          <span class="status-name">${status}</span>
          <span class="status-count">${count}</span>
        </div>
      `;
    })
    .join('');
}
function setupMessageHandling() {
  window.addEventListener('message', (event) => {
    const message = event.data;
    switch (message.type) {
      case 'workItemsLoaded':
        handleWorkItemsLoaded(message.workItems || []);
        break;
      case 'copilotPromptCopied': {
        const id = message.workItemId;
        if (elements.summaryStatus)
          elements.summaryStatus.textContent =
            'Copilot prompt copied to clipboard. Paste into Copilot chat to generate a summary.';
        setTimeout(() => {
          if (elements.summaryStatus) elements.summaryStatus.textContent = '';
        }, 3500);
        break;
      }
      case 'stopAndApplyResult': {
        const id = message.workItemId;
        const hours = message.hours;
        if (elements.summaryStatus)
          elements.summaryStatus.textContent = `Applied ${hours.toFixed(2)} hours to work item #${id}.`;
        if (elements.draftSummary) elements.draftSummary.value = '';
        try {
          if (typeof id === 'number') removeDraftForWorkItem(id);
        } catch (e) {
          console.warn('[webview] Failed to remove persisted draft after apply', e);
        }
        setTimeout(() => {
          if (elements.summaryStatus) elements.summaryStatus.textContent = '';
        }, 4000);
        break;
      }
      case 'workItemsError':
        handleWorkItemsError(message.error);
        break;
      case 'timerUpdate':
        handleTimerUpdate(message.timer);
        break;
      case 'toggleKanbanView':
        handleToggleKanbanView();
        break;
      case 'selfTestPing':
        handleSelfTestPing(message.nonce);
        break;
      default:
        console.log('[webview] Unknown message type:', message.type);
    }
  });
}
function requestWorkItems() {
  if (isLoading) return;
  isLoading = true;
  showLoadingState();
  postMessage({ type: 'getWorkItems' });
}
function showLoadingState() {
  if (!elements.workItemsContainer) return;
  elements.workItemsContainer.innerHTML = `
    <div class="loading">
      <div>Loading work items...</div>
    </div>
  `;
}
function populateFilterDropdowns() {
  if (elements.sprintFilter) {
    const sprints = new Set();
    workItems.forEach((item) => {
      const path = (item.iterationPath || item.fields?.['System.IterationPath'] || '').toString();
      if (!path) return;
      const sprintName = path.split('\\').pop() || path;
      sprints.add(sprintName);
    });
    elements.sprintFilter.innerHTML =
      '<option value="">All Sprints</option>' +
      Array.from(sprints)
        .sort()
        .map((sprint) => `<option value="${escapeHtml(sprint)}">${escapeHtml(sprint)}</option>`)
        .join('');
  }
  if (elements.typeFilter) {
    const types = new Set();
    workItems.forEach((item) => {
      const t = (item.type || item.fields?.['System.WorkItemType'] || '').toString();
      if (t) types.add(t);
    });
    elements.typeFilter.innerHTML =
      '<option value="">All Types</option>' +
      Array.from(types)
        .sort()
        .map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`)
        .join('');
  }
  if (elements.assignedToFilter) {
    const assignees = new Set();
    workItems.forEach((item) => {
      let a = item.assignedTo ?? item.fields?.['System.AssignedTo'];
      if (a && typeof a === 'object') {
        a = (a.displayName || a.uniqueName || a.name || '').toString();
      }
      a = (a || '').toString();
      if (a && a !== 'Unassigned') assignees.add(a);
    });
    elements.assignedToFilter.innerHTML =
      '<option value="">All Assignees</option>' +
      Array.from(assignees)
        .sort()
        .map(
          (assignee) => `<option value="${escapeHtml(assignee)}">${escapeHtml(assignee)}</option>`
        )
        .join('');
  }
}
function handleWorkItemsLoaded(items) {
  console.log('[webview] handleWorkItemsLoaded called with', items.length, 'items:', items);
  isLoading = false;
  workItems = items;
  console.log('[webview] After assignment, workItems.length:', workItems.length);
  populateFilterDropdowns();
  renderWorkItems();
}
function handleWorkItemsError(error) {
  console.error('[webview] Work items error:', error);
  isLoading = false;
  if (!elements.workItemsContainer) return;
  elements.workItemsContainer.innerHTML = `
    <div class="error">
      <div><strong>Error loading work items:</strong></div>
      <div>${escapeHtml(error)}</div>
      <button class="btn" onclick="requestWorkItems()" style="margin-top: 0.5rem;">Retry</button>
    </div>
  `;
}
function getWorkItemTypeIcon(type) {
  const typeMap = {
    Bug: { icon: '🐛', class: 'type-bug' },
    Task: { icon: '📋', class: 'type-task' },
    'User Story': { icon: '📖', class: 'type-story' },
    Feature: { icon: '⭐', class: 'type-feature' },
    Epic: { icon: '🎯', class: 'type-epic' },
    Issue: { icon: '❗', class: 'type-issue' },
    'Test Case': { icon: '🧪', class: 'type-test' },
    'Product Backlog Item': { icon: '📄', class: 'type-pbi' },
  };
  return typeMap[type] || { icon: '📝', class: 'type-default' };
}
function getPriorityClass(priority) {
  if (priority === 1) return 'priority-1';
  if (priority === 2) return 'priority-2';
  if (priority === 3) return 'priority-3';
  if (priority === 4) return 'priority-4';
  return 'priority-default';
}
function getPriorityIcon(priority) {
  if (priority === 0) return { icon: '🔴', label: 'Critical' };
  if (priority === 1) return { icon: '🟡', label: 'High' };
  if (priority === 2) return { icon: '🟢', label: 'Medium' };
  if (priority === 3) return { icon: '🔵', label: 'Low' };
  if (priority === 4) return { icon: '🟣', label: 'Lowest' };
  return { icon: '🟢', label: 'Medium' };
}
function getStateClass(state) {
  const stateClassMap = {
    New: 'state-new',
    Active: 'state-active',
    Resolved: 'state-resolved',
    Closed: 'state-closed',
    Removed: 'state-removed',
    Done: 'state-done',
    'To Do': 'state-todo',
    Doing: 'state-doing',
    'In Progress': 'state-inprogress',
    'Code Review': 'state-review',
    Testing: 'state-testing',
  };
  return stateClassMap[state] || 'state-default';
}
function getVisibleItems() {
  const q = (elements.searchInput?.value || '').trim().toLowerCase();
  const sprint = elements.sprintFilter?.value || '';
  const type = elements.typeFilter?.value || '';
  const assignee = elements.assignedToFilter?.value || '';
  const exDone = !!elements.excludeDone?.checked;
  const exClosed = !!elements.excludeClosed?.checked;
  const exRemoved = !!elements.excludeRemoved?.checked;
  const exReview = !!elements.excludeInReview?.checked;
  const excludedStates = new Set([
    ...(exDone ? ['Done'] : []),
    ...(exClosed ? ['Closed'] : []),
    ...(exRemoved ? ['Removed'] : []),
    ...(exReview ? ['Code Review'] : []),
  ]);
  const byQuery = (item) => {
    if (!q) return true;
    const id = String(item.id ?? item.fields?.['System.Id'] ?? '');
    const title = String(item.title ?? item.fields?.['System.Title'] ?? '').toLowerCase();
    const tags = String(
      item.tags
        ? Array.isArray(item.tags)
          ? item.tags.join(';')
          : item.tags
        : item.fields?.['System.Tags'] || ''
    ).toLowerCase();
    return id.includes(q) || title.includes(q) || tags.includes(q);
  };
  const bySprint = (item) => {
    if (!sprint) return true;
    const path = String(item.iterationPath ?? item.fields?.['System.IterationPath'] ?? '');
    const name = path.split('\\').pop() || path;
    return name === sprint;
  };
  const byType = (item) => {
    if (!type) return true;
    const t = String(item.type ?? item.fields?.['System.WorkItemType'] ?? '');
    return t === type;
  };
  const byAssignee = (item) => {
    if (!assignee) return true;
    let a = item.assignedTo ?? item.fields?.['System.AssignedTo'];
    if (a && typeof a === 'object') a = a.displayName || a.uniqueName || a.name;
    return String(a || '') === assignee;
  };
  const byState = (item) => {
    const s = getNormalizedState(item);
    return !excludedStates.has(s);
  };
  return workItems.filter(
    (it) => byQuery(it) && bySprint(it) && byType(it) && byAssignee(it) && byState(it)
  );
}
function applyFilters() {
  if (currentView === 'kanban') renderKanbanView();
  else renderWorkItems();
}
function renderWorkItems() {
  const itemsToRender = getVisibleItems();
  console.log('[webview] renderWorkItems called, itemsToRender.length:', itemsToRender.length);
  if (!elements.workItemsContainer) return;
  if (itemsToRender.length === 0) {
    elements.workItemsContainer.innerHTML = `
      <div class="status-message">
        <div>No work items found</div>
        <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-top: 0.5rem;">Use the refresh button (🔄) in the header to reload work items</div>
      </div>`;
    return;
  }
  const getField = (item, field) => {
    if (item == null) return undefined;
    switch (field) {
      case 'System.Id':
        return item.id ?? item.fields?.['System.Id'];
      case 'System.Title':
        return item.title ?? item.fields?.['System.Title'];
      case 'System.State':
        return item.state ?? item.fields?.['System.State'];
      case 'System.WorkItemType':
        return item.type ?? item.fields?.['System.WorkItemType'];
      case 'System.AssignedTo': {
        const a = item.assignedTo || item.fields?.['System.AssignedTo'];
        if (a && typeof a === 'object') return a.displayName || a.uniqueName || a.name;
        return a;
      }
      case 'System.Tags':
        return item.tags
          ? Array.isArray(item.tags)
            ? item.tags.join(';')
            : item.tags
          : item.fields?.['System.Tags'];
      case 'Microsoft.VSTS.Common.Priority':
        return item.priority ?? item.fields?.['Microsoft.VSTS.Common.Priority'];
      default:
        return item[field] ?? item.fields?.[field];
    }
  };
  const html = itemsToRender
    .map((item) => {
      const idRaw = getField(item, 'System.Id');
      const id = typeof idRaw === 'number' ? idRaw : Number(idRaw);
      const title = getField(item, 'System.Title') || `Work Item #${id}`;
      const state = getField(item, 'System.State') || 'Unknown';
      const type = getField(item, 'System.WorkItemType') || 'Unknown';
      const assignedRaw = getField(item, 'System.AssignedTo');
      const assignedTo = assignedRaw || 'Unassigned';
      const priority = getField(item, 'Microsoft.VSTS.Common.Priority') || 2;
      const tagsField = getField(item, 'System.Tags');
      const tags =
        typeof tagsField === 'string'
          ? tagsField.split(';').filter(Boolean)
          : Array.isArray(tagsField)
            ? tagsField
            : [];
      const iterationPath = getField(item, 'System.IterationPath') || '';
      const description = item.description || item.fields?.['System.Description'] || '';
      const isSelected = selectedWorkItemId === id;
      const typeIcon = getWorkItemTypeIcon(String(type));
      const priorityClass = getPriorityClass(Number(priority));
      const stateClass = getStateClass(String(state));
      const hasActiveTimer = !!currentTimer && Number(currentTimer.workItemId) === Number(id);
      const timerDisplay = hasActiveTimer
        ? formatTimerDuration(currentTimer.elapsedSeconds || 0)
        : '';
      return `
      <div class="work-item-card ${isSelected ? 'selected' : ''} ${stateClass} ${hasActiveTimer ? 'has-active-timer' : ''}" data-id="${id}" data-action="selectWorkItem">
        <div class="work-item-header">
          <div class="work-item-type-icon ${typeIcon.class}">${typeIcon.icon}</div>
          <div class="work-item-id">#${id}</div>
          ${
            hasActiveTimer
              ? `<div class="timer-indicator" title="Timer running: ${timerDisplay}">⏱️ ${timerDisplay}</div>`
              : ''
          }
          <div class="work-item-priority ${priorityClass}">${getPriorityIcon(Number(priority)).icon} ${getPriorityIcon(Number(priority)).label}</div>
        </div>
        <div class="work-item-content">
          <div class="work-item-title" title="${escapeHtml(String(title))}">${escapeHtml(String(title))}</div>
          ${
            description
              ? `<div class="work-item-description">${escapeHtml(String(description).substring(0, 120))}${String(description).length > 120 ? '...' : ''}</div>`
              : ''
          }
          <div class="work-item-details">
            <div class="work-item-meta-row">
              <span class="work-item-type">${escapeHtml(String(type))}</span>
              <span class="work-item-state state-${String(state)
                .toLowerCase()
                .replace(/\s+/g, '-')}">${escapeHtml(String(state))}</span>
            </div>
            ${
              assignedTo && assignedTo !== 'Unassigned'
                ? `<div class="work-item-assignee"><span class="assignee-icon">👤</span><span>${escapeHtml(String(assignedTo))}</span></div>`
                : ''
            }
            ${
              iterationPath
                ? `<div class="work-item-iteration"><span class="iteration-icon">🔄</span><span>${escapeHtml(String(iterationPath).split('\\').pop() || String(iterationPath))}</span></div>`
                : ''
            }
            ${
              tags.length
                ? `<div class="work-item-tags">${tags
                    .slice(0, 3)
                    .map(
                      (t) => `<span class="work-item-tag">${escapeHtml(String(t).trim())}</span>`
                    )
                    .join(
                      ''
                    )}${tags.length > 3 ? `<span class="tag-overflow">+${tags.length - 3}</span>` : ''}</div>`
                : ''
            }
          </div>
        </div>
        <div class="work-item-actions">
          ${
            hasActiveTimer
              ? `<button class="action-btn timer-btn" data-action="startTimer" data-id="${id}" title="Start/Stop Timer">⏹️</button>`
              : `<button class="action-btn timer-btn" data-action="startTimer" data-id="${id}" title="Start/Stop Timer">⏱️</button>`
          }
          <button class="action-btn comment-btn" data-action="addComment" data-id="${id}" title="Add Comment">💬</button>
          <button class="action-btn view-btn" data-action="viewDetails" data-id="${id}" title="View Details">👁️</button>
          <button class="action-btn edit-btn" data-action="editWorkItem" data-id="${id}" title="Edit">✏️</button>
        </div>
      </div>`;
    })
    .join('');
  elements.workItemsContainer.innerHTML = html;
  updateStatusOverview(itemsToRender);
}
function updateViewToggle() {
  console.log('[webview] updateViewToggle called, currentView:', currentView);
  const viewToggleBtns = document.querySelectorAll('.view-toggle-btn');
  console.log('[webview] Found', viewToggleBtns.length, 'view toggle buttons');
  if (viewToggleBtns.length === 0) {
    console.log('[webview] No view toggle buttons found, relying on sidebar controls');
    return;
  }
  viewToggleBtns.forEach((btn) => {
    const btnView = btn.dataset.view;
    if (btnView === currentView) {
      btn.classList.add('active');
      console.log('[webview] Set active:', btnView);
    } else {
      btn.classList.remove('active');
    }
  });
}
function renderKanbanView() {
  const itemsToRender = getVisibleItems();
  console.log('[webview] renderKanbanView called, itemsToRender.length:', itemsToRender.length);
  if (!elements.workItemsContainer) return;
  if (itemsToRender.length === 0) {
    elements.workItemsContainer.innerHTML = `
      <div class="status-message">
        <div>No work items found</div>
        <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-top: 0.5rem;">
          Use the refresh button (🔄) in the header to reload work items
        </div>
      </div>
    `;
    return;
  }
  const getField = (item, field) => {
    if (item == null) return undefined;
    switch (field) {
      case 'System.Id':
        return item.id ?? item.fields?.['System.Id'];
      case 'System.Title':
        return item.title ?? item.fields?.['System.Title'];
      case 'System.State':
        return item.state ?? item.fields?.['System.State'];
      case 'System.WorkItemType':
        return item.type ?? item.fields?.['System.WorkItemType'];
      case 'System.AssignedTo': {
        const a = item.assignedTo || item.fields?.['System.AssignedTo'];
        if (a && typeof a === 'object') return a.displayName || a.uniqueName || a.name;
        return a;
      }
      case 'System.Tags':
        return item.tags
          ? Array.isArray(item.tags)
            ? item.tags.join(';')
            : item.tags
          : item.fields?.['System.Tags'];
      case 'Microsoft.VSTS.Common.Priority':
        return item.priority ?? item.fields?.['Microsoft.VSTS.Common.Priority'];
      default:
        return item[field] ?? item.fields?.[field];
    }
  };
  const stateGroups = itemsToRender.reduce((groups, item) => {
    let state = getField(item, 'System.State') || 'Unknown';
    if (typeof state !== 'string') state = String(state ?? 'Unknown');
    if (!groups[state]) groups[state] = [];
    groups[state].push(item);
    return groups;
  }, {});
  const stateOrder = [
    'New',
    'To Do',
    'Active',
    'In Progress',
    'Doing',
    'Code Review',
    'Testing',
    'Resolved',
    'Done',
    'Closed',
  ];
  const orderedStates = stateOrder.filter((state) => stateGroups[state]);
  Object.keys(stateGroups).forEach((state) => {
    if (!orderedStates.includes(state)) {
      orderedStates.push(state);
    }
  });
  const kanbanHtml = `
    <div class="kanban-board">
      ${orderedStates
        .map((state) => {
          const items = stateGroups[state];
          const stateClass = getStateClass(state);
          return `
          <div class="kanban-column">
            <div class="kanban-column-header ${stateClass}">
              <h3>${state}</h3>
              <span class="item-count">${items.length}</span>
            </div>
            <div class="kanban-column-content">
              ${items
                .map((item) => {
                  const idRaw = getField(item, 'System.Id');
                  const id = typeof idRaw === 'number' ? idRaw : Number(idRaw);
                  const title = getField(item, 'System.Title') || `Work Item #${id}`;
                  const type = getField(item, 'System.WorkItemType') || 'Unknown';
                  const assignedRaw = getField(item, 'System.AssignedTo');
                  const assignedTo = assignedRaw || 'Unassigned';
                  const priority = getField(item, 'Microsoft.VSTS.Common.Priority') || 2;
                  const tagsField = getField(item, 'System.Tags');
                  const tags =
                    typeof tagsField === 'string'
                      ? tagsField.split(';').filter(Boolean)
                      : Array.isArray(tagsField)
                        ? tagsField
                        : [];
                  const isSelected = selectedWorkItemId === id;
                  const typeIcon = getWorkItemTypeIcon(type);
                  const priorityClass = getPriorityClass(Number(priority));
                  const hasActiveTimer =
                    !!currentTimer && Number(currentTimer.workItemId) === Number(id);
                  const timerDisplay = hasActiveTimer
                    ? formatTimerDuration(currentTimer.elapsedSeconds || 0)
                    : '';
                  let shortAssigned = assignedTo;
                  if (typeof shortAssigned === 'string' && shortAssigned.includes(' '))
                    shortAssigned = shortAssigned.split(' ')[0];
                  return `
                  <div class="kanban-card ${isSelected ? 'selected' : ''} ${hasActiveTimer ? 'has-active-timer' : ''}" data-id="${id}" data-action="selectWorkItem">
                    <div class="kanban-card-header">
                      <div class="work-item-type-icon ${typeIcon.class}">${typeIcon.icon}</div>
                      <div class="work-item-id">#${id}</div>
                      ${
                        hasActiveTimer
                          ? `<div class="timer-indicator" title="Timer running: ${timerDisplay}">⏱️ ${timerDisplay}</div>`
                          : ''
                      }
                      <div class="work-item-priority ${priorityClass}">${getPriorityIcon(Number(priority)).icon} ${getPriorityIcon(Number(priority)).label}</div>
                    </div>
                    <div class="kanban-card-content">
                      <div class="work-item-title" title="${escapeHtml(String(title))}">${escapeHtml(String(title))}</div>
                      <div class="kanban-card-meta">
                        <span class="work-item-type">${escapeHtml(String(type))}</span>
                        ${
                          assignedTo && assignedTo !== 'Unassigned'
                            ? `<span class="work-item-assignee"><span class="assignee-icon">👤</span>${escapeHtml(String(shortAssigned))}</span>`
                            : ''
                        }
                      </div>
                      ${
                        tags.length
                          ? `<div class="work-item-tags">${tags
                              .slice(0, 2)
                              .map(
                                (t) =>
                                  `<span class="work-item-tag">${escapeHtml(String(t).trim())}</span>`
                              )
                              .join('')}${
                              tags.length > 2
                                ? `<span class="tag-overflow">+${tags.length - 2}</span>`
                                : ''
                            }</div>`
                          : ''
                      }
                    </div>
                    <div class="kanban-card-actions">
                      ${
                        hasActiveTimer
                          ? `<button class="action-btn timer-btn" data-action="startTimer" data-id="${id}" title="Start/Stop Timer">⏹️</button>`
                          : `<button class="action-btn timer-btn" data-action="startTimer" data-id="${id}" title="Start/Stop Timer">⏱️</button>`
                      }
                      <button class="action-btn comment-btn" data-action="addComment" data-id="${id}" title="Add Comment">💬</button>
                      <button class="action-btn edit-btn" data-action="editWorkItem" data-id="${id}" title="Edit">✏️</button>
                      <button class="action-btn view-btn" data-action="viewDetails" data-id="${id}" title="View Details">👁️</button>
                    </div>
                  </div>`;
                })
                .join('')}
            </div>
          </div>
        `;
        })
        .join('')}
    </div>
  `;
  elements.workItemsContainer.innerHTML = kanbanHtml;
  updateStatusOverview(itemsToRender);
}
function startTimerForWorkItem(id) {
  selectWorkItem(id.toString());
  postMessage({ type: 'startTimer', workItemId: id });
}
function viewWorkItemDetails(id) {
  postMessage({ type: 'viewWorkItem', workItemId: id });
}
function handleTimerUpdate(timer) {
  currentTimer = timer;
  if (timer) {
    updateTimerDisplay();
    updateTimerButtonStates();
    if (currentView === 'kanban') {
      renderKanbanView();
    } else {
      renderWorkItems();
    }
    try {
      const workItemId = timer.workItemId;
      const persisted = workItemId ? loadDraftForWorkItem(workItemId) : null;
      if (persisted && persisted.length > 0) {
        if (elements.draftSummary) elements.draftSummary.value = persisted;
      } else if (elements.draftSummary && elements.draftSummary.value.trim() === '') {
        const seconds = timer.elapsedSeconds || 0;
        const hours = seconds / 3600 || 0;
        const title = timer.workItemTitle || `#${timer.workItemId}`;
        elements.draftSummary.value = `Worked approximately ${hours.toFixed(2)} hours on ${title}. Provide a short summary of what you accomplished.`;
      }
    } catch (e) {
      console.warn('[webview] Failed to prefill summary', e);
    }
  } else {
    updateTimerDisplay();
    updateTimerButtonStates();
    if (currentView === 'kanban') {
      renderKanbanView();
    } else {
      renderWorkItems();
    }
  }
}
function saveDraftForWorkItem(workItemId, text) {
  try {
    localStorage.setItem(`azuredevops.draft.${workItemId}`, text || '');
    console.log('[webview] Saved draft for work item', workItemId);
  } catch (e) {
    console.warn('[webview] Failed to save draft to localStorage', e);
  }
}
function loadDraftForWorkItem(workItemId) {
  try {
    const v = localStorage.getItem(`azuredevops.draft.${workItemId}`);
    return v;
  } catch (e) {
    console.warn('[webview] Failed to load draft from localStorage', e);
    return null;
  }
}
function removeDraftForWorkItem(workItemId) {
  try {
    localStorage.removeItem(`azuredevops.draft.${workItemId}`);
    console.log('[webview] Removed draft for work item', workItemId);
  } catch (e) {
    console.warn('[webview] Failed to remove draft from localStorage', e);
  }
}
(function wireDraftAutosave() {
  const attemptWire = () => {
    if (!elements.draftSummary) return false;
    const ta = elements.draftSummary;
    ta.addEventListener('input', () => {
      const workItemId = currentTimer ? currentTimer.workItemId : selectedWorkItemId;
      if (!workItemId) return;
      saveDraftForWorkItem(workItemId, ta.value);
    });
    ta.addEventListener('blur', () => {
      const workItemId = currentTimer ? currentTimer.workItemId : selectedWorkItemId;
      if (!workItemId) return;
      saveDraftForWorkItem(workItemId, ta.value);
    });
    return true;
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(attemptWire, 0));
  } else {
    setTimeout(attemptWire, 0);
  }
})();
(function watchSelectionLoadDraft() {
  let lastSelected = null;
  setInterval(() => {
    if (selectedWorkItemId && selectedWorkItemId !== lastSelected) {
      lastSelected = selectedWorkItemId;
      try {
        const persisted = loadDraftForWorkItem(selectedWorkItemId);
        if (persisted !== null && elements.draftSummary) {
          elements.draftSummary.value = persisted;
        }
      } catch (e) {}
    }
  }, 500);
})();
(function hookClearOnApply() {
  const originalHandler = window.addEventListener;
})();
window.requestWorkItems = requestWorkItems;
const style = document.createElement('style');
style.textContent = `
  .work-item.selected {
    background: var(--vscode-list-activeSelectionBackground, #094771) !important;
    border-color: var(--vscode-list-activeSelectionForeground, #ffffff);
  }
`;
document.head.appendChild(style);
function startApp() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
(function setupActivityDetection() {
  let lastActivityTime = Date.now();
  let activityPingTimer;
  function sendActivityPing() {
    if (activityPingTimer) return;
    activityPingTimer = setTimeout(() => {
      postMessage({ type: 'activity' });
      activityPingTimer = undefined;
    }, 500);
  }
  const activityEvents = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart', 'focus'];
  activityEvents.forEach((eventType) => {
    document.addEventListener(
      eventType,
      () => {
        const now = Date.now();
        if (now - lastActivityTime > 1000) {
          lastActivityTime = now;
          sendActivityPing();
        }
      },
      { passive: true }
    );
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      sendActivityPing();
    }
  });
  sendActivityPing();
})();
startApp();
