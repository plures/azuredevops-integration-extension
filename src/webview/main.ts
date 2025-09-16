// Vanilla JavaScript implementation - reliable and framework-free

// Declare global types for VS Code webview context
declare global {
  interface Window {
    vscode?: any;
    acquireVsCodeApi?: () => any;
  }
  const acquireVsCodeApi: () => any;
}

// Initialize VS Code API
const vscode = (() => {
  try {
    return window.vscode || acquireVsCodeApi();
  } catch (e) {
    console.error('[webview] Failed to acquire VS Code API', e);
    return null;
  }
})();

// State management
let workItems: any[] = [];
let currentTimer: any = null;
let selectedWorkItemId: number | null = null;
let isLoading = false;
let currentView: 'list' | 'kanban' = 'list';

// DOM element references
const elements = {
  searchInput: null as HTMLInputElement | null,
  statusOverview: null as HTMLElement | null,
  sprintFilter: null as HTMLSelectElement | null,
  typeFilter: null as HTMLSelectElement | null,
  assignedToFilter: null as HTMLSelectElement | null,
  excludeDone: null as HTMLInputElement | null,
  excludeClosed: null as HTMLInputElement | null,
  excludeRemoved: null as HTMLInputElement | null,
  excludeInReview: null as HTMLInputElement | null,
  workItemsContainer: null as HTMLElement | null,
  timerContainer: null as HTMLElement | null,
  timerDisplay: null as HTMLElement | null,
  timerTask: null as HTMLElement | null,
  content: null as HTMLElement | null,
  timerInfo: null as HTMLElement | null,
  startTimerBtn: null as HTMLButtonElement | null,
  pauseTimerBtn: null as HTMLButtonElement | null,
  stopTimerBtn: null as HTMLButtonElement | null,
};

// Initialize the application
function init() {
  // Get DOM element references for new structure
  elements.searchInput = document.getElementById('searchInput') as HTMLInputElement;
  elements.statusOverview = document.getElementById('statusOverview');
  elements.sprintFilter = document.getElementById('sprintFilter') as HTMLSelectElement;
  elements.typeFilter = document.getElementById('typeFilter') as HTMLSelectElement;
  elements.assignedToFilter = document.getElementById('assignedToFilter') as HTMLSelectElement;
  elements.excludeDone = document.getElementById('excludeDone') as HTMLInputElement;
  elements.excludeClosed = document.getElementById('excludeClosed') as HTMLInputElement;
  elements.excludeRemoved = document.getElementById('excludeRemoved') as HTMLInputElement;
  elements.excludeInReview = document.getElementById('excludeInReview') as HTMLInputElement;
  elements.workItemsContainer = document.getElementById('workItemsContainer');
  elements.timerContainer = document.getElementById('timerContainer');
  elements.timerDisplay = document.getElementById('timerDisplay');
  elements.timerInfo = document.getElementById('timerInfo');

  // Timer button elements
  const startTimerBtn = document.getElementById('startTimerBtn') as HTMLButtonElement;
  const pauseTimerBtn = document.getElementById('pauseTimerBtn') as HTMLButtonElement;
  const stopTimerBtn = document.getElementById('stopTimerBtn') as HTMLButtonElement;

  (elements as any).startTimerBtn = startTimerBtn;
  (elements as any).pauseTimerBtn = pauseTimerBtn;
  (elements as any).stopTimerBtn = stopTimerBtn;
  // Note: 'content' element is not required in new layout
  elements.content = document.getElementById('content');

  if (!elements.workItemsContainer) {
    console.error('[webview] Critical: workItemsContainer element not found');
    return;
  }

  // Set up event listeners
  console.log('[webview] Initializing webview...');
  setupEventListeners();

  // Set up message handling
  setupMessageHandling();

  // Ensure timer is hidden initially
  console.log('[webview] Setting timer visibility to false during init');
  updateTimerVisibility(false);

  // Signal readiness to extension and request work items
  postMessage({ type: 'webviewReady' });
  requestWorkItems();
}

function setupEventListeners() {
  // Event delegation for all buttons and clickable elements (from original pattern)
  document.addEventListener('click', function (e) {
    // Handle status badge clicks
    const statusBadge = (e.target as HTMLElement).closest('.status-badge');
    if (statusBadge) {
      const status = statusBadge.getAttribute('data-status');
      if (status) {
        filterByStatus(status);
      }
      return;
    }

    // Handle work item card clicks
    const workItemCard = (e.target as HTMLElement).closest('[data-action="selectWorkItem"]');
    if (workItemCard && !(e.target as HTMLElement).closest('button')) {
      const id = parseInt(workItemCard.getAttribute('data-id') || '0');
      selectWorkItem(id.toString());
      return;
    }

    // Handle button clicks
    const button = (e.target as HTMLElement).closest('button[data-action]');
    if (!button) return;

    e.stopPropagation(); // Prevent bubbling to work item card

    const action = button.getAttribute('data-action');
    const id = button.getAttribute('data-id')
      ? parseInt(button.getAttribute('data-id') || '0')
      : null;

    console.log('[webview] Button clicked:', action, 'id:', id);

    switch (action) {
      case 'refresh':
        requestWorkItems();
        break;
      case 'createWorkItem':
        postMessage({ type: 'createWorkItem' });
        break;
      case 'toggleView': {
        console.log('[webview] toggleView clicked');
        const viewBtn = e.target as HTMLElement;
        const view = viewBtn.dataset.view as 'list' | 'kanban';
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
        // Legacy support - toggle between views
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
      case 'startTimer':
        if (id) postMessage({ type: 'startTimer', workItemId: id });
        break;
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
    }
  });

  // Event delegation for change events (filters)
  document.addEventListener('change', function (e) {
    const target = e.target as HTMLElement;

    // Handle select filters
    const select = target.closest('select[data-action]');
    if (select) {
      const action = select.getAttribute('data-action');
      if (action === 'applyFilters') {
        applyFilters();
      }
      return;
    }

    // Handle checkbox filters
    const checkbox = target.closest('input[data-action]');
    if (checkbox && (checkbox as HTMLInputElement).type === 'checkbox') {
      const action = checkbox.getAttribute('data-action');
      if (action === 'applyFilters') {
        applyFilters();
      }
    }
  });

  // Search input handler
  elements.searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = elements.searchInput?.value;
      if (query) {
        postMessage({ type: 'search', query });
      }
    }
  });
}

// Filter and render functions
// Normalize state value from different shapes of work item objects
function getNormalizedState(item: any): string {
  if (!item) return 'Unknown';
  const raw =
    item.state ||
    item.fields?.['System.State'] ||
    item['System.State'] ||
    item.fields?.['System.State.name'];
  const rawStr = typeof raw === 'string' && raw.trim() ? raw.trim() : '';
  if (!rawStr) return 'Unknown';

  // Map common synonyms/variants to canonical state names
  const map: { [k: string]: string } = {
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

function filterByStatus(status: string) {
  // Filter work items by status and re-render
  const filteredItems = workItems.filter((item) => {
    const s = getNormalizedState(item);
    return s === status;
  });

  // Clear other filters
  if (elements.searchInput) elements.searchInput.value = '';
  if (elements.sprintFilter) elements.sprintFilter.value = '';
  if (elements.typeFilter) elements.typeFilter.value = '';
  if (elements.assignedToFilter) elements.assignedToFilter.value = '';

  // Update the work items display
  elements.workItemsContainer!.innerHTML = filteredItems
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

      // Get work item type icon
      const typeIcon = getWorkItemTypeIcon(type);

      // Get priority class
      const priorityClass = getPriorityClass(priority);

      // Get state class
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
                    (tag: any) => `
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
          <button class="action-btn timer-btn" data-action="startTimer" data-id="${id}" title="Start Timer">
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

  // Update status overview to show only the filtered status
  updateStatusOverview(filteredItems);
}

function updateStatusOverview(items = workItems) {
  if (!elements.statusOverview) return;

  const statusCounts = items.reduce((acc: any, item) => {
    const status = getNormalizedState(item);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  elements.statusOverview.innerHTML = Object.entries(statusCounts)
    .map(([status, count]) => {
      const stateClass = getStateClass(String(status));
      // Show raw value as tooltip so authors can see original state strings
      const rawTitle = status;
      return `
        <div class="status-badge ${stateClass}" data-status="${status}" title="${escapeHtml(
        String(rawTitle)
      )}">
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
  // Populate sprint filter
  if (elements.sprintFilter) {
    const sprints = new Set<string>();
    workItems.forEach((item) => {
      if (item.iterationPath) {
        // Extract sprint name from iteration path
        const sprintName = item.iterationPath.split('\\').pop() || item.iterationPath;
        sprints.add(sprintName);
      }
    });

    elements.sprintFilter.innerHTML =
      '<option value="">All Sprints</option>' +
      Array.from(sprints)
        .sort()
        .map((sprint) => `<option value="${escapeHtml(sprint)}">${escapeHtml(sprint)}</option>`)
        .join('');
  }

  // Populate type filter
  if (elements.typeFilter) {
    const types = new Set<string>();
    workItems.forEach((item) => {
      if (item.type) types.add(item.type);
    });

    elements.typeFilter.innerHTML =
      '<option value="">All Types</option>' +
      Array.from(types)
        .sort()
        .map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`)
        .join('');
  }

  // Populate assignee filter
  if (elements.assignedToFilter) {
    const assignees = new Set<string>();
    workItems.forEach((item) => {
      if (item.assignedTo && item.assignedTo !== 'Unassigned') {
        assignees.add(item.assignedTo);
      }
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

function handleWorkItemsLoaded(items: any[]) {
  console.log('[webview] handleWorkItemsLoaded called with', items.length, 'items:', items);
  isLoading = false;
  workItems = items;
  console.log('[webview] After assignment, workItems.length:', workItems.length);
  populateFilterDropdowns();
  renderWorkItems();
}

function handleWorkItemsError(error: string) {
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

// Helper functions for work item rendering
function getWorkItemTypeIcon(type: string): { icon: string; class: string } {
  const typeMap: { [key: string]: { icon: string; class: string } } = {
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

function getPriorityClass(priority: number): string {
  if (priority === 1) return 'priority-1';
  if (priority === 2) return 'priority-2';
  if (priority === 3) return 'priority-3';
  if (priority === 4) return 'priority-4';
  return 'priority-default';
}

function getPriorityIcon(priority: number): { icon: string; label: string } {
  if (priority === 0) return { icon: '🔴', label: 'Critical' }; // Critical
  if (priority === 1) return { icon: '🟡', label: 'High' }; // High
  if (priority === 2) return { icon: '🟢', label: 'Medium' }; // Medium
  if (priority === 3) return { icon: '🔵', label: 'Low' }; // Low
  if (priority === 4) return { icon: '🟣', label: 'Lowest' }; // Lowest
  return { icon: '🟢', label: 'Medium' }; // Default
}

function getStateClass(state: string): string {
  const stateClassMap: { [key: string]: string } = {
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

function renderWorkItems() {
  console.log(
    '[webview] renderWorkItems called, workItems.length:',
    workItems.length,
    'workItems sample:',
    workItems[0]
  );
  if (!elements.workItemsContainer) return;
  if (workItems.length === 0) {
    elements.workItemsContainer.innerHTML = `
      <div class="status-message">
        <div>No work items found</div>
        <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-top: 0.5rem;">Use the refresh button (🔄) in the header to reload work items</div>
      </div>`;
    return;
  }

  // Normalized field accessor reused from kanban logic
  const getField = (item: any, field: string) => {
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

  const html = workItems
    .map((item) => {
      const id = getField(item, 'System.Id');
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
      // areaPath not currently displayed
      const description = item.description || item.fields?.['System.Description'] || '';

      const isSelected = selectedWorkItemId === id;
      const typeIcon = getWorkItemTypeIcon(String(type));
      const priorityClass = getPriorityClass(Number(priority));
      const stateClass = getStateClass(String(state));

      return `
      <div class="work-item-card ${
        isSelected ? 'selected' : ''
      } ${stateClass}" data-id="${id}" data-action="selectWorkItem">
        <div class="work-item-header">
          <div class="work-item-type-icon ${typeIcon.class}">${typeIcon.icon}</div>
          <div class="work-item-id">#${id}</div>
          <div class="work-item-priority ${priorityClass}">${
        getPriorityIcon(Number(priority)).icon
      } ${getPriorityIcon(Number(priority)).label}</div>
        </div>
        <div class="work-item-content">
          <div class="work-item-title" title="${escapeHtml(String(title))}">${escapeHtml(
        String(title)
      )}</div>
          ${
            description
              ? `<div class="work-item-description">${escapeHtml(
                  String(description).substring(0, 120)
                )}${String(description).length > 120 ? '...' : ''}</div>`
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
                ? `<div class="work-item-assignee"><span class="assignee-icon">👤</span><span>${escapeHtml(
                    String(assignedTo)
                  )}</span></div>`
                : ''
            }
            ${
              iterationPath
                ? `<div class="work-item-iteration"><span class="iteration-icon">🔄</span><span>${escapeHtml(
                    String(iterationPath).split('\\').pop() || String(iterationPath)
                  )}</span></div>`
                : ''
            }
            ${
              tags.length
                ? `<div class="work-item-tags">${tags
                    .slice(0, 3)
                    .map(
                      (t: any) =>
                        `<span class="work-item-tag">${escapeHtml(String(t).trim())}</span>`
                    )
                    .join('')}${
                    tags.length > 3 ? `<span class="tag-overflow">+${tags.length - 3}</span>` : ''
                  }</div>`
                : ''
            }
          </div>
        </div>
        <div class="work-item-actions">
          <button class="action-btn timer-btn" data-action="startTimer" data-id="${id}" title="Start Timer">⏱️</button>
          <button class="action-btn view-btn" data-action="viewDetails" data-id="${id}" title="View Details">👁️</button>
          <button class="action-btn edit-btn" data-action="editWorkItem" data-id="${id}" title="Edit">✏️</button>
        </div>
      </div>`;
    })
    .join('');

  elements.workItemsContainer.innerHTML = html;
  updateStatusOverview();
}

function updateViewToggle() {
  console.log('[webview] updateViewToggle called, currentView:', currentView);
  const viewToggleBtns = document.querySelectorAll('.view-toggle-btn');
  console.log('[webview] Found', viewToggleBtns.length, 'view toggle buttons');

  // Since we removed the header buttons, we'll rely on symbolic sidebar controls
  if (viewToggleBtns.length === 0) {
    console.log('[webview] No view toggle buttons found, relying on sidebar controls');
    return;
  }

  viewToggleBtns.forEach((btn) => {
    const btnView = (btn as HTMLElement).dataset.view;
    if (btnView === currentView) {
      btn.classList.add('active');
      console.log('[webview] Set active:', btnView);
    } else {
      btn.classList.remove('active');
    }
  });
}

function renderKanbanView() {
  console.log('[webview] renderKanbanView called, workItems.length:', workItems.length);
  if (!elements.workItemsContainer) return;

  if (workItems.length === 0) {
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

  // Helper to normalize field access (supports flattened or original Azure DevOps shape)
  const getField = (item: any, field: string) => {
    if (item == null) return undefined;
    // flattened mapping first
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
        // flattened assignedTo is already a displayName string
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

  // Build grouping by normalized state
  const stateGroups = workItems.reduce((groups: any, item) => {
    let state = getField(item, 'System.State') || 'Unknown';
    if (typeof state !== 'string') state = String(state ?? 'Unknown');
    if (!groups[state]) groups[state] = [];
    groups[state].push(item);
    return groups;
  }, {} as Record<string, any[]>);

  // Define common states order
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

  // Add any additional states not in the predefined order
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
                .map((item: any) => {
                  const id = getField(item, 'System.Id');
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

                  let shortAssigned = assignedTo;
                  if (typeof shortAssigned === 'string' && shortAssigned.includes(' '))
                    shortAssigned = shortAssigned.split(' ')[0];

                  return `
                  <div class="kanban-card ${
                    isSelected ? 'selected' : ''
                  }" data-id="${id}" data-action="selectWorkItem">
                    <div class="kanban-card-header">
                      <div class="work-item-type-icon ${typeIcon.class}">${typeIcon.icon}</div>
                      <div class="work-item-id">#${id}</div>
                      <div class="work-item-priority ${priorityClass}">${
                    getPriorityIcon(Number(priority)).icon
                  } ${getPriorityIcon(Number(priority)).label}</div>
                    </div>
                    <div class="kanban-card-content">
                      <div class="work-item-title" title="${escapeHtml(
                        String(title)
                      )}">${escapeHtml(String(title))}</div>
                      <div class="kanban-card-meta">
                        <span class="work-item-type">${escapeHtml(String(type))}</span>
                        ${
                          assignedTo && assignedTo !== 'Unassigned'
                            ? `<span class="work-item-assignee"><span class="assignee-icon">👤</span>${escapeHtml(
                                String(shortAssigned)
                              )}</span>`
                            : ''
                        }
                      </div>
                      ${
                        tags.length
                          ? `<div class="work-item-tags">${tags
                              .slice(0, 2)
                              .map(
                                (t: any) =>
                                  `<span class="work-item-tag">${escapeHtml(
                                    String(t).trim()
                                  )}</span>`
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
                      <button class="action-btn timer-btn" data-action="startTimer" data-id="${id}" title="Start Timer">⏱️</button>
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
  updateStatusOverview();
}

function startTimerForWorkItem(id: number) {
  selectWorkItem(id.toString());
  postMessage({ type: 'startTimer', workItemId: id });
}

function viewWorkItemDetails(id: number) {
  postMessage({ type: 'viewWorkItem', workItemId: id });
}

function handleTimerUpdate(timer: any) {
  currentTimer = timer;

  if (timer) {
    updateTimerDisplay();
    updateTimerButtonStates();
  } else {
    // Timer stopped - just update display and buttons
    updateTimerDisplay();
    updateTimerButtonStates();
  }
}

function updateTimerDisplay() {
  if (!currentTimer) {
    if (elements.timerDisplay) elements.timerDisplay.textContent = '00:00:00';
    if (elements.timerInfo) elements.timerInfo.textContent = 'No active timer';
    return;
  }

  const seconds = currentTimer.elapsedSeconds || 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const timeString = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  if (elements.timerDisplay) elements.timerDisplay.textContent = timeString;

  const workItemTitle = currentTimer.workItemTitle || `#${currentTimer.workItemId}`;
  const status = currentTimer.isPaused ? ' (Paused)' : '';
  if (elements.timerInfo) elements.timerInfo.textContent = `${workItemTitle}${status}`;
}

function updateTimerButtonStates() {
  const hasActiveTimer = currentTimer !== null;
  const timerRunning = hasActiveTimer && !currentTimer.isPaused;

  if ((elements as any).startTimerBtn) (elements as any).startTimerBtn.disabled = hasActiveTimer;
  if ((elements as any).pauseTimerBtn) (elements as any).pauseTimerBtn.disabled = !timerRunning;
  if ((elements as any).stopTimerBtn) (elements as any).stopTimerBtn.disabled = !hasActiveTimer;

  // Show/hide timer section based on timer state
  updateTimerVisibility(hasActiveTimer);
}

function updateTimerVisibility(show: boolean) {
  console.log('[webview] updateTimerVisibility called with show:', show);
  const timerColumn = document.getElementById('timerColumn');
  if (!timerColumn) {
    console.warn('[webview] Timer column not found');
    return;
  }

  if (show) {
    // Show timer section
    timerColumn.style.display = 'flex';
    timerColumn.classList.remove('timer-hidden');
    timerColumn.classList.add('timer-visible');
    console.log('[webview] Timer shown - display:', timerColumn.style.display);
  } else {
    // Hide timer section with animation
    timerColumn.classList.remove('timer-visible');
    timerColumn.classList.add('timer-hidden');

    // Hide completely after animation
    setTimeout(() => {
      if (!currentTimer) {
        // Only hide if timer is still not active
        timerColumn.style.display = 'none';
        timerColumn.classList.remove('timer-hidden');
        console.log('[webview] Timer hidden - display:', timerColumn.style.display);
      }
    }, 300);
  }
}

function handleSelfTestPing(nonce: string) {
  const signature = `items:${workItems.length};timer:${currentTimer ? '1' : '0'}`;
  postMessage({ type: 'selfTestAck', nonce, signature });
}

function handleToggleKanbanView() {
  console.log('[webview] handleToggleKanbanView called, current view:', currentView);
  // Toggle between list and kanban views
  currentView = currentView === 'list' ? 'kanban' : 'list';
  updateViewToggle();

  if (currentView === 'kanban') {
    renderKanbanView();
  } else {
    renderWorkItems();
  }
}

function postMessage(message: any) {
  if (vscode) {
    vscode.postMessage(message);
  } else {
    console.warn('[webview] Cannot post message - VS Code API not available');
  }
}

function escapeHtml(unsafe: any): string {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Make functions globally available for onclick handlers
(window as any).requestWorkItems = requestWorkItems;

// Add selected state styling
const style = document.createElement('style');
style.textContent = `
  .work-item.selected {
    background: var(--vscode-list-activeSelectionBackground, #094771) !important;
    border-color: var(--vscode-list-activeSelectionForeground, #ffffff);
  }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
function startApp() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

// Start the app
startApp();
