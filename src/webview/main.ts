/* eslint-disable @typescript-eslint/no-unused-vars */
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

// Ensure all outbound messages go to the extension host via vscode.postMessage
function postMessage(msg: any) {
  try {
    if (vscode && typeof (vscode as any).postMessage === 'function') {
      (vscode as any).postMessage(msg);
      return;
    }
    if (
      typeof window !== 'undefined' &&
      (window as any).vscode &&
      typeof (window as any).vscode.postMessage === 'function'
    ) {
      (window as any).vscode.postMessage(msg);
      return;
    }
    console.warn('[webview] vscode.postMessage not available; message not sent', msg);
  } catch (err) {
    console.error('[webview] Error posting message to extension', err, msg);
  }
}

// State management
type ConnectionEntry = {
  id: string;
  label: string;
  organization?: string;
  project?: string;
};

let connections: ConnectionEntry[] = [];
let activeConnectionId: string | null = null;
const workItemsByConnection = new Map<string, any[]>();

let workItems: any[] = [];
let currentTimer: any = null;
let selectedWorkItemId: number | null = null;
let isLoading = false;
let currentView: 'list' | 'kanban' = 'list';
type FallbackNoticeData = {
  originalQuery: string;
  fallbackQuery: string;
  defaultQuery?: string;
  fetchedCount?: number;
  fallbackIdentity?: {
    id?: string;
    displayName?: string;
    uniqueName?: string;
  };
  assignees?: string[];
};

let fallbackNotice: FallbackNoticeData | null = null;
const fallbackNotices = new Map<string, FallbackNoticeData | null>();
const typeOptionsByConnection = new Map<string, string[]>();
let searchHaystackCache = new WeakMap<any, string>();

type FilterState = {
  search: string;
  sprint: string;
  type: string;
  assignedTo: string;
  excludeDone: boolean;
  excludeClosed: boolean;
  excludeRemoved: boolean;
  excludeInReview: boolean;
};

const filterStateByConnection = new Map<string, FilterState>();

function normalizeConnectionId(raw: unknown): string | null {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

function getDefaultFilterState(): FilterState {
  return {
    search: '',
    sprint: '',
    type: '',
    assignedTo: '',
    excludeDone: false,
    excludeClosed: false,
    excludeRemoved: false,
    excludeInReview: false,
  };
}

function getFilterStateForConnection(connectionId: string): FilterState {
  if (!filterStateByConnection.has(connectionId)) {
    filterStateByConnection.set(connectionId, getDefaultFilterState());
  }
  return filterStateByConnection.get(connectionId)!;
}

function setTypeOptionsForConnection(
  connectionId: string,
  values: string[],
  options: { merge?: boolean } = {}
) {
  const base = options.merge
    ? new Set<string>(typeOptionsByConnection.get(connectionId) ?? [])
    : new Set<string>();
  values.forEach((value) => {
    if (typeof value !== 'string') return;
    const trimmed = value.trim();
    if (trimmed.length === 0) return;
    base.add(trimmed);
  });
  typeOptionsByConnection.set(
    connectionId,
    Array.from(base).sort((a, b) => a.localeCompare(b))
  );
}

function getTypeOptionsForConnection(connectionId: string | null): string[] {
  if (!connectionId) return [];
  return typeOptionsByConnection.get(connectionId) ?? [];
}

function extractWorkItemTypes(items: any[]): string[] {
  if (!Array.isArray(items)) return [];
  const set = new Set<string>();
  items.forEach((item) => {
    const flattened = typeof item?.type === 'string' ? item.type : undefined;
    const fromFields =
      typeof item?.fields?.['System.WorkItemType'] === 'string'
        ? item.fields['System.WorkItemType']
        : undefined;
    const value = flattened ?? fromFields;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) set.add(trimmed);
    }
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function persistCurrentFilterState() {
  const connectionId = activeConnectionId;
  if (!connectionId) return;
  const state = getFilterStateForConnection(connectionId);
  state.search = elements.searchInput?.value ?? '';
  state.sprint = elements.sprintFilter?.value ?? '';
  state.type = elements.typeFilter?.value ?? '';
  state.assignedTo = elements.assignedToFilter?.value ?? '';
  state.excludeDone = !!elements.excludeDone?.checked;
  state.excludeClosed = !!elements.excludeClosed?.checked;
  state.excludeRemoved = !!elements.excludeRemoved?.checked;
  state.excludeInReview = !!elements.excludeInReview?.checked;
}

function applyFilterStateToUi(connectionId: string) {
  const state = getFilterStateForConnection(connectionId);
  if (elements.searchInput) {
    elements.searchInput.value = state.search;
  }

  const ensureSelectValue = (select: HTMLSelectElement | null, desired: string) => {
    if (!select) return '';
    const options = Array.from(select.options).map((option) => option.value);
    const value = desired && options.includes(desired) ? desired : '';
    select.value = value;
    return value;
  };

  state.sprint = ensureSelectValue(elements.sprintFilter, state.sprint);
  state.type = ensureSelectValue(elements.typeFilter, state.type);
  state.assignedTo = ensureSelectValue(elements.assignedToFilter, state.assignedTo);

  if (elements.excludeDone) elements.excludeDone.checked = state.excludeDone;
  if (elements.excludeClosed) elements.excludeClosed.checked = state.excludeClosed;
  if (elements.excludeRemoved) elements.excludeRemoved.checked = state.excludeRemoved;
  if (elements.excludeInReview) elements.excludeInReview.checked = state.excludeInReview;
}

type ComposeMode = 'timerStop' | 'addComment';

let composeState: { mode: ComposeMode; workItemId: number | null } | null = null;
let lastTimerSnapshot: any | null = null;

// DOM element references
const elements = {
  searchInput: null as HTMLInputElement | null,
  statusOverview: null as HTMLElement | null,
  connectionTabs: null as HTMLElement | null,
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
  // New summary editor elements
  draftSummary: null as HTMLTextAreaElement | null,
  summarySection: null as HTMLElement | null,
  summaryContainer: null as HTMLElement | null,
  toggleSummaryBtn: null as HTMLButtonElement | null,
  summaryStatus: null as HTMLElement | null,
  submitComposeBtn: null as HTMLButtonElement | null,
};

// Initialize the application
function init() {
  // Get DOM element references for new structure
  elements.searchInput = document.getElementById('searchInput') as HTMLInputElement;
  elements.statusOverview = document.getElementById('statusOverview');
  elements.connectionTabs = document.getElementById('connectionTabs');
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

  // New summary element references
  elements.draftSummary = document.getElementById('draftSummary') as HTMLTextAreaElement;
  elements.summarySection = document.getElementById('summarySection');
  elements.summaryContainer = document.getElementById('summaryContainer');
  (elements as any).toggleSummaryBtn = document.getElementById(
    'toggleSummaryBtn'
  ) as HTMLButtonElement;
  elements.summaryStatus = document.getElementById('summaryStatus');
  elements.submitComposeBtn = document.getElementById('submitComposeBtn') as HTMLButtonElement;

  if (elements.summarySection) elements.summarySection.setAttribute('hidden', '');
  if (elements.summaryContainer) elements.summaryContainer.setAttribute('hidden', '');
  const toggleBtn = (elements as any).toggleSummaryBtn as HTMLButtonElement | null;
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.textContent = 'Compose Comment ▾';
  }

  if (elements.connectionTabs) {
    elements.connectionTabs.setAttribute('hidden', '');
  }

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

    // Handle connection tab clicks
    const connectionTab = (e.target as HTMLElement).closest('.connection-tab');
    if (connectionTab) {
      const id = connectionTab.getAttribute('data-connection-id');
      if (id) selectConnection(id);
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
      case 'toggleSummary': {
        if (!composeState) return;
        const container = elements.summaryContainer;
        if (!container) return;
        const isHidden = container.hasAttribute('hidden');
        if (isHidden) {
          container.removeAttribute('hidden');
          updateComposeToggle(true);
        } else {
          container.setAttribute('hidden', '');
          updateComposeToggle(false);
        }
        break;
      }
      case 'generateCopilotPrompt': {
        // Use current timer's work item id when available; otherwise try button id
        const workItemId =
          id ?? composeState?.workItemId ?? (currentTimer ? currentTimer.workItemId : undefined);
        const draft = elements.draftSummary ? elements.draftSummary.value : '';
        if (!workItemId) {
          console.warn('[webview] generateCopilotPrompt: no work item id available');
          setComposeStatus('No work item selected to generate prompt.');
          return;
        }
        // Provide visual feedback
        setComposeStatus('Preparing Copilot prompt and copying to clipboard...');
        postMessage({ type: 'generateCopilotPrompt', workItemId, draftSummary: draft });
        break;
      }
      case 'submitCompose': {
        const draft = elements.draftSummary ? elements.draftSummary.value : '';
        const mode = composeState?.mode ?? (currentTimer ? 'timerStop' : null);
        if (mode === 'addComment') {
          const targetId = composeState?.workItemId;
          if (!targetId) {
            setComposeStatus('No work item selected to add a comment.');
            return;
          }
          if (!draft.trim()) {
            setComposeStatus('Write a comment before submitting.');
            if (elements.draftSummary) {
              requestAnimationFrame(() => elements.draftSummary?.focus());
            }
            return;
          }
          setComposeStatus(`Adding a comment to work item #${targetId}...`);
          postMessage({ type: 'addComment', workItemId: targetId, comment: draft });
        } else {
          setComposeStatus('Stopping timer and applying updates...');
          postMessage({ type: 'stopAndApply', comment: draft });
        }
        break;
      }
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
      case 'startTimer': {
        // Support toggle behavior everywhere the start button appears.
        // If an id is provided, use it; otherwise fall back to selected work item or current timer.
        const targetId =
          id ?? selectedWorkItemId ?? (currentTimer ? Number(currentTimer.workItemId) : null);
        if (targetId) {
          if (currentTimer && Number(currentTimer.workItemId) === Number(targetId)) {
            // Toggle: same item is running -> stop
            postMessage({ type: 'stopTimer' });
          } else {
            postMessage({ type: 'startTimer', workItemId: Number(targetId) });
          }
        } else {
          // No target available; optionally we could surface a hint here.
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

  // Directly wire filter dropdowns to apply filters (no data-action attribute in HTML)
  elements.sprintFilter?.addEventListener('change', applyFilters);
  elements.typeFilter?.addEventListener('change', applyFilters);
  elements.assignedToFilter?.addEventListener('change', applyFilters);
}

// Filter and render functions
function escapeHtml(input: any): string {
  const str = String(input ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function updateTimerVisibility(visible: boolean) {
  const el = elements.timerContainer as HTMLElement | null;
  if (!el) return;
  if (visible) {
    el.removeAttribute('hidden');
  } else {
    el.setAttribute('hidden', '');
  }
}

// Preserve scroll position across full re-renders.
function preserveScroll(
  axis: 'x' | 'y' | 'both',
  render: () => void,
  container: HTMLElement | null = elements.workItemsContainer
) {
  const el = container;
  if (!el) {
    render();
    return;
  }
  const prevLeft = el.scrollLeft;
  const prevTop = el.scrollTop;
  render();
  try {
    requestAnimationFrame(() => {
      if (axis === 'x' || axis === 'both') el.scrollLeft = prevLeft;
      if (axis === 'y' || axis === 'both') el.scrollTop = prevTop;
    });
  } catch {
    if (axis === 'x' || axis === 'both') el.scrollLeft = prevLeft;
    if (axis === 'y' || axis === 'both') el.scrollTop = prevTop;
  }
}

function selectWorkItem(id: string) {
  const num = parseInt(id, 10);
  if (!Number.isFinite(num)) return;
  selectedWorkItemId = num;
  // Highlight selection in UI
  document.querySelectorAll('[data-action="selectWorkItem"]').forEach((node) => {
    const el = node as HTMLElement;
    const nid = parseInt(el.getAttribute('data-id') || '0', 10);
    if (nid === num) el.classList.add('selected');
    else el.classList.remove('selected');
  });
  // Load persisted draft for selected work item if present
  try {
    const persisted = loadDraftForWorkItem(num);
    if (persisted !== null && elements.draftSummary) {
      elements.draftSummary.value = persisted;
    }
  } catch {
    // ignore draft load errors
  }
}

function handleAddComment(workItemId: number) {
  const id = Number(workItemId);
  if (!Number.isFinite(id) || id <= 0) return;
  showComposePanel({
    mode: 'addComment',
    workItemId: id,
    message: `Compose a comment for work item #${id}.`,
  });
}

function formatTimerDuration(seconds: number): string {
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
  const startBtn = (elements as any).startTimerBtn as HTMLButtonElement | null;
  const pauseBtn = (elements as any).pauseTimerBtn as HTMLButtonElement | null;
  const stopBtn = (elements as any).stopTimerBtn as HTMLButtonElement | null;
  const active = !!currentTimer && currentTimer.running !== false;
  if (startBtn) startBtn.disabled = active; // disable start while running
  if (pauseBtn) pauseBtn.disabled = !active; // enable pause while running
  if (stopBtn) stopBtn.disabled = !currentTimer; // enable stop when any timer exists
}

function handleToggleKanbanView() {
  currentView = currentView === 'list' ? 'kanban' : 'list';
  updateViewToggle();
  if (currentView === 'kanban') renderKanbanView();
  else renderWorkItems();
}

function handleSelfTestPing(nonce: string) {
  postMessage({ type: 'selfTestPong', nonce });
}

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
  persistCurrentFilterState();

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
          ${
            currentTimer && Number(currentTimer.workItemId) === Number(id)
              ? `<button class="action-btn timer-btn" data-action="stopTimer" data-id="${id}" title="Start/Stop Timer">⏹️</button>`
              : `<button class="action-btn timer-btn" data-action="startTimer" data-id="${id}" title="Start/Stop Timer">⏱️</button>`
          }
          <button class="action-btn view-btn" data-action="viewDetails" data-id="${id}" title="View Details">👁️</button>
          <button class="action-btn edit-btn" data-action="editWorkItem" data-id="${id}" title="Edit">✏️</button>
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

function renderConnectionTabs() {
  const container = elements.connectionTabs;
  if (!container) return;

  if (!connections.length) {
    container.innerHTML = '';
    container.setAttribute('hidden', '');
    return;
  }

  container.removeAttribute('hidden');
  const activeId = activeConnectionId;
  container.innerHTML = connections
    .map((conn) => {
      const id = conn.id;
      const label = escapeHtml(conn.label || conn.project || conn.organization || id);
      const isActive = id === activeId;
      const metaParts: string[] = [];
      if (conn.organization) metaParts.push(conn.organization);
      if (conn.project && conn.project !== conn.label) metaParts.push(conn.project);
      const metaText = metaParts.length ? escapeHtml(metaParts.join(' / ')) : '';
      const ariaSelected = isActive ? 'true' : 'false';
      const tabIndex = isActive ? '0' : '-1';
      return `
        <button
          class="connection-tab${isActive ? ' active' : ''}"
          role="tab"
          aria-selected="${ariaSelected}"
          tabindex="${tabIndex}"
          data-connection-id="${escapeHtml(id)}"
        >
          <span>${label}</span>
          ${metaText ? `<span class="connection-meta">${metaText}</span>` : ''}
        </button>
      `;
    })
    .join('');
}

function selectConnection(connectionId: string, options: { fromMessage?: boolean } = {}) {
  if (!connectionId || typeof connectionId !== 'string') return;
  const trimmed = connectionId.trim();
  if (!trimmed) return;
  const previousConnectionId = activeConnectionId;
  const changed = previousConnectionId !== trimmed;
  if (changed && previousConnectionId) {
    persistCurrentFilterState();
  }
  activeConnectionId = trimmed;
  getFilterStateForConnection(trimmed);
  renderConnectionTabs();

  const cachedItems = workItemsByConnection.get(trimmed);
  const cachedFallback = fallbackNotices.get(trimmed) || null;
  fallbackNotice = cachedFallback;

  if (cachedItems) {
    isLoading = false;
    handleWorkItemsLoaded(cachedItems, trimmed, { fromCache: true });
  } else if (changed) {
    isLoading = true;
    showLoadingState();
  } else if (cachedFallback) {
    isLoading = false;
    renderWorkItems();
  }

  if (!options.fromMessage) {
    postMessage({ type: 'setActiveConnection', connectionId: trimmed });
  }
}

function setupMessageHandling() {
  window.addEventListener('message', (event) => {
    const message = event.data;

    switch (message.type) {
      case 'workItemsLoaded':
        fallbackNotice = null;
        handleWorkItemsLoaded(message.workItems || [], message.connectionId);
        break;
      case 'workItemsFallback':
        handleWorkItemsFallback(message);
        break;
      case 'copilotPromptCopied': {
        const id = message.workItemId;
        setComposeStatus(
          'Copilot prompt copied to clipboard. Paste into Copilot chat to generate a comment.'
        );
        // Briefly show feedback then clear
        setTimeout(() => {
          setComposeStatus(null);
        }, 3500);
        break;
      }
      case 'stopAndApplyResult': {
        const id = message.workItemId;
        const hours = message.hours;
        setComposeStatus(`Applied ${hours.toFixed(2)} hours to work item #${id}.`);
        try {
          if (typeof id === 'number') removeDraftForWorkItem(id);
        } catch (e) {
          console.warn('[webview] Failed to remove persisted draft after apply', e);
        }
        setTimeout(() => {
          hideComposePanel({ clearDraft: true });
        }, 3500);
        break;
      }
      case 'addCommentResult': {
        const id = typeof message.workItemId === 'number' ? message.workItemId : null;
        if (message?.success === false) {
          const errorMessage =
            typeof message.error === 'string' && message.error.trim().length > 0
              ? message.error.trim()
              : 'Failed to add comment.';
          setComposeStatus(errorMessage);
          break;
        }
        if (id) {
          try {
            removeDraftForWorkItem(id);
          } catch (e) {
            console.warn('[webview] Failed to clear persisted draft after comment', e);
          }
        }
        setComposeStatus(id ? `Comment added to work item #${id}.` : 'Comment added successfully.');
        setTimeout(() => {
          hideComposePanel({ clearDraft: true });
        }, 3000);
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
      case 'workItemTypeOptions': {
        const connectionId = normalizeConnectionId(message.connectionId) ?? activeConnectionId;
        const incoming: string[] = Array.isArray(message.types)
          ? message.types
              .map((value: any) => (typeof value === 'string' ? value.trim() : ''))
              .filter((value: string) => value.length > 0)
          : [];

        if (!connectionId) {
          break;
        }

        setTypeOptionsForConnection(connectionId, incoming, { merge: true });

        if (connectionId === activeConnectionId) {
          populateFilterDropdowns(connectionId);
          applyFilterStateToUi(connectionId);
          applyFilters();
        }
        break;
      }
      case 'connectionsUpdate': {
        const list: ConnectionEntry[] = Array.isArray(message.connections)
          ? message.connections
              .map((entry: any) => {
                const id = typeof entry?.id === 'string' ? entry.id.trim() : '';
                if (!id) return null;
                const labelCandidate =
                  typeof entry?.label === 'string' && entry.label.trim().length > 0
                    ? entry.label.trim()
                    : typeof entry?.project === 'string' && entry.project.trim().length > 0
                      ? entry.project.trim()
                      : id;
                return {
                  id,
                  label: labelCandidate,
                  organization:
                    typeof entry?.organization === 'string' && entry.organization.trim().length > 0
                      ? entry.organization.trim()
                      : undefined,
                  project:
                    typeof entry?.project === 'string' && entry.project.trim().length > 0
                      ? entry.project.trim()
                      : undefined,
                } satisfies ConnectionEntry;
              })
              .filter((entry: ConnectionEntry | null): entry is ConnectionEntry => entry !== null)
          : [];

        connections = list;
        const validIds = new Set(list.map((conn) => conn.id));
        Array.from(workItemsByConnection.keys()).forEach((id) => {
          if (!validIds.has(id)) {
            workItemsByConnection.delete(id);
            fallbackNotices.delete(id);
            typeOptionsByConnection.delete(id);
            filterStateByConnection.delete(id);
          }
        });

        const nextActiveId =
          typeof message.activeConnectionId === 'string' &&
          message.activeConnectionId.trim().length > 0
            ? message.activeConnectionId.trim()
            : list.length > 0
              ? list[0].id
              : null;

        if (nextActiveId) {
          selectConnection(nextActiveId, { fromMessage: true });
        } else {
          activeConnectionId = null;
          workItems = [];
          fallbackNotice = null;
          renderConnectionTabs();
          renderWorkItems();
        }
        break;
      }
      default:
        console.log('[webview] Unknown message type:', message.type);
    }
  });
}

function getComposeSubmitLabel(mode: ComposeMode | null): string {
  return mode === 'addComment' ? 'Add Comment' : 'Stop & Apply';
}

function updateComposeToggle(expanded: boolean) {
  const toggleBtn = (elements as any).toggleSummaryBtn as HTMLButtonElement | null;
  if (!toggleBtn) return;
  toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  toggleBtn.textContent = expanded ? 'Compose Comment ▴' : 'Compose Comment ▾';
}

function updateComposeSubmitLabel() {
  if (elements.submitComposeBtn) {
    elements.submitComposeBtn.textContent = getComposeSubmitLabel(composeState?.mode ?? null);
  }
}

function setComposeStatus(message: string | null | undefined) {
  if (!elements.summaryStatus) return;
  if (typeof message === 'string' && message.trim().length > 0) {
    elements.summaryStatus.textContent = message;
  } else {
    elements.summaryStatus.textContent = '';
  }
}

type ShowComposeOptions = {
  mode: ComposeMode;
  workItemId?: number | null;
  presetText?: string;
  focus?: boolean;
  message?: string | null;
  expand?: boolean;
};

function showComposePanel(options: ShowComposeOptions) {
  composeState = {
    mode: options.mode,
    workItemId:
      typeof options.workItemId === 'number' && Number.isFinite(options.workItemId)
        ? options.workItemId
        : null,
  };

  if (elements.summarySection) {
    elements.summarySection.removeAttribute('hidden');
    (elements.summarySection as HTMLElement).dataset.mode = options.mode;
    if (composeState?.workItemId) {
      (elements.summarySection as HTMLElement).dataset.workItemId = String(composeState.workItemId);
    } else {
      delete (elements.summarySection as HTMLElement).dataset.workItemId;
    }
  }

  const expand = options.expand !== false;
  if (elements.summaryContainer) {
    if (expand) {
      elements.summaryContainer.removeAttribute('hidden');
    }
  }
  updateComposeToggle(expand);
  updateComposeSubmitLabel();

  const workItemId = composeState.workItemId;
  if (typeof workItemId === 'number' && Number.isFinite(workItemId)) {
    selectWorkItem(String(workItemId));
  }

  const textarea = elements.draftSummary;
  if (textarea) {
    let draftValue: string | null = null;
    if (typeof options.presetText === 'string') {
      draftValue = options.presetText;
    } else if (workItemId) {
      const persisted = loadDraftForWorkItem(workItemId);
      if (persisted !== null) {
        draftValue = persisted;
      }
    }
    textarea.value = draftValue ?? '';
    if (options.focus !== false) {
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      });
    }
  }

  setComposeStatus(options.message);
}

type HideComposeOptions = {
  clearDraft?: boolean;
};

function hideComposePanel(options?: HideComposeOptions) {
  composeState = null;
  if (elements.summaryContainer) {
    elements.summaryContainer.setAttribute('hidden', '');
  }
  if (elements.summarySection) {
    elements.summarySection.setAttribute('hidden', '');
    delete (elements.summarySection as HTMLElement).dataset.mode;
    delete (elements.summarySection as HTMLElement).dataset.workItemId;
  }
  updateComposeToggle(false);
  updateComposeSubmitLabel();
  setComposeStatus(null);
  if (options?.clearDraft && elements.draftSummary) {
    elements.draftSummary.value = '';
  }
}

function requestWorkItems() {
  if (isLoading) return;

  isLoading = true;
  showLoadingState();
  postMessage({ type: 'getWorkItems' });
}

function showLoadingState() {
  if (!elements.workItemsContainer) return;
  preserveScroll('both', () => {
    elements.workItemsContainer!.innerHTML = `
      <div class="loading">
        <div>Loading work items...</div>
      </div>
    `;
  });
}

function populateFilterDropdowns(connectionId?: string) {
  const targetConnectionId = connectionId ?? activeConnectionId;
  const itemsSource =
    targetConnectionId && targetConnectionId !== activeConnectionId
      ? (workItemsByConnection.get(targetConnectionId) ?? [])
      : workItems;

  if (elements.sprintFilter) {
    const sprints = new Set<string>();
    itemsSource.forEach((item) => {
      const path = (item.iterationPath || item.fields?.['System.IterationPath'] || '').toString();
      if (!path) return;
      const sprintName = path.split('\\').pop() || path;
      sprints.add(sprintName);
    });

    elements.sprintFilter.innerHTML =
      '<option value="">All Sprints</option>' +
      Array.from(sprints)
        .sort((a, b) => a.localeCompare(b))
        .map((sprint) => `<option value="${escapeHtml(sprint)}">${escapeHtml(sprint)}</option>`)
        .join('');
  }

  if (elements.typeFilter) {
    const types = new Set<string>();
    getTypeOptionsForConnection(targetConnectionId).forEach((type) => {
      if (typeof type === 'string' && type.trim().length > 0) types.add(type.trim());
    });
    itemsSource.forEach((item) => {
      const t = (item.type || item.fields?.['System.WorkItemType'] || '').toString();
      if (t.trim()) types.add(t.trim());
    });

    elements.typeFilter.innerHTML =
      '<option value="">All Types</option>' +
      Array.from(types)
        .sort((a, b) => a.localeCompare(b))
        .map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`)
        .join('');
  }

  if (elements.assignedToFilter) {
    const assignees = new Set<string>();
    itemsSource.forEach((item) => {
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
        .sort((a, b) => a.localeCompare(b))
        .map(
          (assignee) => `<option value="${escapeHtml(assignee)}">${escapeHtml(assignee)}</option>`
        )
        .join('');
  }
}

function handleWorkItemsLoaded(
  items: any[],
  connectionId?: string | null,
  options: { fromCache?: boolean } = {}
) {
  const trimmedId = typeof connectionId === 'string' ? connectionId.trim() : '';
  const fromCache = options.fromCache === true;

  if (trimmedId) {
    workItemsByConnection.set(trimmedId, items);
    if (!fromCache) {
      fallbackNotices.delete(trimmedId);
    }
  }

  if (!activeConnectionId && trimmedId) {
    activeConnectionId = trimmedId;
    renderConnectionTabs();
  }

  const targetId = trimmedId || activeConnectionId || null;
  const connectionKey = trimmedId || activeConnectionId || null;
  if (connectionKey) {
    setTypeOptionsForConnection(connectionKey, extractWorkItemTypes(items));
  }
  const shouldUpdateUi = !trimmedId || targetId === activeConnectionId || !activeConnectionId;

  if (shouldUpdateUi) {
    if (!activeConnectionId && targetId) {
      activeConnectionId = targetId;
      renderConnectionTabs();
    }
    searchHaystackCache = new WeakMap();
    workItems = items;
    isLoading = false;
    if (activeConnectionId) {
      fallbackNotice = fallbackNotices.get(activeConnectionId) || null;
    }
    populateFilterDropdowns(activeConnectionId ?? undefined);
    if (activeConnectionId) {
      applyFilterStateToUi(activeConnectionId);
    }
    renderWorkItems();
  }
}

function handleWorkItemsFallback(message: any) {
  const original = message?.originalQuery ? String(message.originalQuery) : 'Configured Query';
  const fallback = message?.fallbackQuery ? String(message.fallbackQuery) : 'My Work Items';
  const defaultQuery = message?.defaultQuery ? String(message.defaultQuery) : undefined;
  const fetchedCount =
    typeof message?.fetchedCount === 'number' ? Number(message.fetchedCount) : undefined;
  const identityMeta = message?.fallbackIdentity;
  let identity:
    | {
        id?: string;
        displayName?: string;
        uniqueName?: string;
      }
    | undefined;
  if (identityMeta && typeof identityMeta === 'object') {
    identity = {
      id: typeof identityMeta.id === 'string' ? identityMeta.id : undefined,
      displayName:
        typeof identityMeta.displayName === 'string' ? identityMeta.displayName : undefined,
      uniqueName: typeof identityMeta.uniqueName === 'string' ? identityMeta.uniqueName : undefined,
    };
  }
  const assignees = Array.isArray(message?.assignees)
    ? message.assignees
        .map((value: any) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value: string) => value.length > 0)
    : undefined;
  const notice: FallbackNoticeData = {
    originalQuery: original,
    fallbackQuery: fallback,
    defaultQuery,
    fetchedCount,
    fallbackIdentity: identity,
    assignees,
  };
  const connectionId = typeof message?.connectionId === 'string' ? message.connectionId.trim() : '';
  if (connectionId) {
    fallbackNotices.set(connectionId, notice);
    if (!activeConnectionId) {
      activeConnectionId = connectionId;
      renderConnectionTabs();
    }
    if (connectionId === activeConnectionId) {
      fallbackNotice = notice;
      renderWorkItems();
    }
  } else {
    fallbackNotice = notice;
    renderWorkItems();
  }
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

function buildSearchHaystack(item: any): string {
  const parts: string[] = [];
  const seenObjects = new WeakSet<object>();
  const maxDepth = 5;

  const pushString = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      parts.push(trimmed.toLowerCase());
    }
  };

  const visit = (value: any, depth = 0) => {
    if (value === null || value === undefined) return;

    if (typeof value === 'string') {
      pushString(value);
      return;
    }

    if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
      pushString(String(value));
      return;
    }

    if (value instanceof Date) {
      pushString(value.toISOString());
      return;
    }

    if (typeof value === 'symbol') {
      pushString(value.toString());
      return;
    }

    if (typeof value === 'object') {
      if (seenObjects.has(value)) return;
      seenObjects.add(value);

      if (depth >= maxDepth) return;

      if (Array.isArray(value)) {
        value.forEach((entry) => visit(entry, depth + 1));
        return;
      }

      const identityKeys = [
        'displayName',
        'uniqueName',
        'name',
        'fullName',
        'mailAddress',
        'email',
        'userPrincipalName',
        'upn',
        'descriptor',
        'text',
        'value',
        'title',
      ];

      identityKeys.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          visit((value as any)[key], depth + 1);
        }
      });

      Object.keys(value).forEach((key) => {
        if (key === '__proto__') return;
        visit((value as any)[key], depth + 1);
      });

      return;
    }
  };

  visit(item);

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function getSearchHaystack(item: any): string {
  if (!item || (typeof item !== 'object' && typeof item !== 'function')) {
    return typeof item === 'string' ? item.toLowerCase() : String(item ?? '').toLowerCase();
  }
  const cached = searchHaystackCache.get(item);
  if (cached) return cached;
  const haystack = buildSearchHaystack(item);
  searchHaystackCache.set(item, haystack);
  return haystack;
}

function getVisibleItems(): any[] {
  const q = (elements.searchInput?.value || '').trim().toLowerCase();
  const sprint = elements.sprintFilter?.value || '';
  const type = elements.typeFilter?.value || '';
  const assignee = elements.assignedToFilter?.value || '';
  const exDone = !!elements.excludeDone?.checked;
  const exClosed = !!elements.excludeClosed?.checked;
  const exRemoved = !!elements.excludeRemoved?.checked;
  const exReview = !!elements.excludeInReview?.checked;

  const excludedStates = new Set<string>([
    ...(exDone ? ['Done'] : []),
    ...(exClosed ? ['Closed'] : []),
    ...(exRemoved ? ['Removed'] : []),
    ...(exReview ? ['Code Review'] : []),
  ]);

  const byQuery = (item: any) => {
    if (!q) return true;
    const haystack = getSearchHaystack(item);
    return haystack.includes(q);
  };

  const bySprint = (item: any) => {
    if (!sprint) return true;
    const path = String(item.iterationPath ?? item.fields?.['System.IterationPath'] ?? '');
    const name = path.split('\\').pop() || path;
    return name === sprint;
  };

  const byType = (item: any) => {
    if (!type) return true;
    const t = String(item.type ?? item.fields?.['System.WorkItemType'] ?? '');
    return t === type;
  };

  const byAssignee = (item: any) => {
    if (!assignee) return true;
    let a = item.assignedTo ?? item.fields?.['System.AssignedTo'];
    if (a && typeof a === 'object') a = a.displayName || a.uniqueName || a.name;
    return String(a || '') === assignee;
  };

  const byState = (item: any) => {
    const s = getNormalizedState(item);
    return !excludedStates.has(s);
  };

  return workItems.filter(
    (it) => byQuery(it) && bySprint(it) && byType(it) && byAssignee(it) && byState(it)
  );
}

function applyFilters() {
  persistCurrentFilterState();
  if (currentView === 'kanban') renderKanbanView();
  else renderWorkItems();
}

function renderWorkItems() {
  const itemsToRender = getVisibleItems();
  console.log('[webview] renderWorkItems called, itemsToRender.length:', itemsToRender.length);
  if (!elements.workItemsContainer) return;
  const notice = fallbackNotice;
  let bannerHtml = '';
  if (notice) {
    const original = escapeHtml(String(notice.originalQuery || 'Configured Query'));
    const fallback = escapeHtml(String(notice.fallbackQuery || 'My Work Items'));
    const defaultQueryText = notice.defaultQuery
      ? ` (default query: ${escapeHtml(String(notice.defaultQuery))})`
      : '';
    const fetchedSnippet =
      typeof notice.fetchedCount === 'number' ? ` ${notice.fetchedCount} work items loaded.` : '';
    const identity = notice.fallbackIdentity;
    const assignees = Array.isArray(notice.assignees)
      ? notice.assignees.filter((value) => typeof value === 'string' && value.trim().length > 0)
      : [];
    let identityHtml = '';
    if (identity && (identity.displayName || identity.uniqueName || identity.id)) {
      const label = escapeHtml(
        identity.displayName || identity.uniqueName || identity.id || 'the PAT owner'
      );
      identityHtml = `
        <div style="margin-top: 0.5rem; font-size: 0.85em; color: var(--vscode-descriptionForeground);">
          Results were loaded using the saved Personal Access Token for <strong>${label}</strong>.
          If this isn't you, update the PAT under Azure DevOps Integration settings.
        </div>`;
    } else if (assignees.length > 0) {
      const preview = assignees
        .slice(0, 3)
        .map((value) => escapeHtml(value))
        .join(', ');
      const overflow = assignees.length > 3 ? ', …' : '';
      identityHtml = `
        <div style="margin-top: 0.5rem; font-size: 0.85em; color: var(--vscode-descriptionForeground);">
          Work items in these fallback results are assigned to: ${preview}${overflow}
        </div>`;
    }
    bannerHtml = `
      <div class="info-banner" style="margin: 0 0 0.75rem 0; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--vscode-inputValidationInfoBorder, rgba(0, 122, 204, 0.6)); background: var(--vscode-inputValidationInfoBackground, rgba(0, 122, 204, 0.1));">
        <div style="font-weight: 600;">Showing fallback results</div>
        <div style="margin-top: 0.25rem;">No work items matched <code>${original}</code>. Loaded <code>${fallback}</code> instead.${defaultQueryText}${fetchedSnippet}</div>
        <div style="margin-top: 0.5rem; font-size: 0.85em; color: var(--vscode-descriptionForeground);">
          Update <strong>Azure DevOps Integration › Default Query</strong> in settings to customize the default list.
        </div>
        ${identityHtml}
      </div>`;
  }
  if (itemsToRender.length === 0) {
    preserveScroll('y', () => {
      elements.workItemsContainer!.innerHTML = `
        ${bannerHtml}
        <div class="status-message">
          <div>No work items found</div>
          <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-top: 0.5rem;">Use the refresh button (🔄) in the header to reload work items</div>
        </div>`;
    });
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
      // areaPath not currently displayed
      const description = item.description || item.fields?.['System.Description'] || '';

      const isSelected = selectedWorkItemId === id;
      const typeIcon = getWorkItemTypeIcon(String(type));
      const priorityClass = getPriorityClass(Number(priority));
      const stateClass = getStateClass(String(state));

      // Check if timer is running on this work item
      const hasActiveTimer = !!currentTimer && Number(currentTimer.workItemId) === Number(id);
      const timerDisplay = hasActiveTimer
        ? formatTimerDuration(currentTimer.elapsedSeconds || 0)
        : '';

      return `
      <div class="work-item-card ${isSelected ? 'selected' : ''} ${stateClass} ${
        hasActiveTimer ? 'has-active-timer' : ''
      }" data-id="${id}" data-action="selectWorkItem">
        <div class="work-item-header">
          <div class="work-item-type-icon ${typeIcon.class}">${typeIcon.icon}</div>
          <div class="work-item-id">#${id}</div>
          ${
            hasActiveTimer
              ? `<div class="timer-indicator" title="Timer running: ${timerDisplay}">⏱️ ${timerDisplay}</div>`
              : ''
          }
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
          ${
            hasActiveTimer
              ? `<button class="action-btn timer-btn" data-action="stopTimer" data-id="${id}" title="Start/Stop Timer">⏹️</button>`
              : `<button class="action-btn timer-btn" data-action="startTimer" data-id="${id}" title="Start/Stop Timer">⏱️</button>`
          }
          <button class="action-btn comment-btn" data-action="addComment" data-id="${id}" title="Add Comment">💬</button>
          <button class="action-btn view-btn" data-action="viewDetails" data-id="${id}" title="View Details">👁️</button>
          <button class="action-btn edit-btn" data-action="editWorkItem" data-id="${id}" title="Edit">✏️</button>
        </div>
      </div>`;
    })
    .join('');

  preserveScroll('y', () => {
    elements.workItemsContainer!.innerHTML = `${bannerHtml}${html}`;
  });
  updateStatusOverview(itemsToRender);
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
  const itemsToRender = getVisibleItems();
  console.log('[webview] renderKanbanView called, itemsToRender.length:', itemsToRender.length);
  if (!elements.workItemsContainer) return;

  if (itemsToRender.length === 0) {
    // No board content, simple render
    elements.workItemsContainer!.innerHTML = `
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
  const stateGroups = itemsToRender.reduce(
    (groups: any, item) => {
      let state = getField(item, 'System.State') || 'Unknown';
      if (typeof state !== 'string') state = String(state ?? 'Unknown');
      if (!groups[state]) groups[state] = [];
      groups[state].push(item);
      return groups;
    },
    {} as Record<string, any[]>
  );

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

                  // Check if timer is running on this work item
                  const hasActiveTimer =
                    !!currentTimer && Number(currentTimer.workItemId) === Number(id);
                  const timerDisplay = hasActiveTimer
                    ? formatTimerDuration(currentTimer.elapsedSeconds || 0)
                    : '';

                  let shortAssigned = assignedTo;
                  if (typeof shortAssigned === 'string' && shortAssigned.includes(' '))
                    shortAssigned = shortAssigned.split(' ')[0];

                  return `
                  <div class="kanban-card ${isSelected ? 'selected' : ''} ${
                    hasActiveTimer ? 'has-active-timer' : ''
                  }" data-id="${id}" data-action="selectWorkItem">
                    <div class="kanban-card-header">
                      <div class="work-item-type-icon ${typeIcon.class}">${typeIcon.icon}</div>
                      <div class="work-item-id">#${id}</div>
                      ${
                        hasActiveTimer
                          ? `<div class="timer-indicator" title="Timer running: ${timerDisplay}">⏱️ ${timerDisplay}</div>`
                          : ''
                      }
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
                      ${
                        hasActiveTimer
                          ? `<button class="action-btn timer-btn" data-action="stopTimer" data-id="${id}" title="Start/Stop Timer">⏹️</button>`
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

  // Preserve horizontal scroll of the inner kanban board rather than the outer container
  const prevLeft =
    (elements.workItemsContainer!.querySelector('.kanban-board') as HTMLElement | null)
      ?.scrollLeft ?? 0;
  elements.workItemsContainer!.innerHTML = kanbanHtml;
  try {
    requestAnimationFrame(() => {
      const board = elements.workItemsContainer!.querySelector(
        '.kanban-board'
      ) as HTMLElement | null;
      if (board) board.scrollLeft = prevLeft;
    });
  } catch {
    const board = elements.workItemsContainer!.querySelector('.kanban-board') as HTMLElement | null;
    if (board) board.scrollLeft = prevLeft;
  }
  updateStatusOverview(itemsToRender);
}

function startTimerForWorkItem(id: number) {
  selectWorkItem(id.toString());
  postMessage({ type: 'startTimer', workItemId: id });
}

function viewWorkItemDetails(id: number) {
  postMessage({ type: 'viewWorkItem', workItemId: id });
}

function handleTimerUpdate(timer: any) {
  const previousTimer = currentTimer;
  currentTimer = timer;

  if (timer) {
    lastTimerSnapshot = timer;
    updateTimerDisplay();
    updateTimerButtonStates();
    // Re-render work items to show timer indicators
    if (currentView === 'kanban') {
      renderKanbanView();
    } else {
      renderWorkItems();
    }
    // Prefill draft summary with an editable suggestion when a timer is active
    try {
      const workItemId = timer.workItemId;
      const persisted = workItemId ? loadDraftForWorkItem(workItemId) : null;
      if (persisted && persisted.length > 0) {
        // Use persisted draft if present
        if (elements.draftSummary) elements.draftSummary.value = persisted;
      } else if (elements.draftSummary && elements.draftSummary.value.trim() === '') {
        const seconds = (timer.elapsedSeconds || 0) as number;
        const hours = seconds / 3600 || 0;
        const title = timer.workItemTitle || `#${timer.workItemId}`;
        elements.draftSummary.value = `Worked approximately ${hours.toFixed(
          2
        )} hours on ${title}. Provide a short summary of what you accomplished.`;
      }
    } catch (e) {
      console.warn('[webview] Failed to prefill summary', e);
    }
  } else {
    // Timer stopped - just update display and buttons
    updateTimerDisplay();
    updateTimerButtonStates();
    // Re-render work items to remove timer indicators
    if (currentView === 'kanban') {
      renderKanbanView();
    } else {
      renderWorkItems();
    }
    const snapshot = previousTimer || lastTimerSnapshot;
    lastTimerSnapshot = null;
    const id = snapshot && snapshot.workItemId ? Number(snapshot.workItemId) : null;
    if (id && Number.isFinite(id)) {
      let presetText: string | undefined;
      try {
        const persisted = loadDraftForWorkItem(id);
        if (persisted !== null) {
          presetText = persisted;
        }
      } catch {
        // ignore persistence failures
      }

      if (!presetText) {
        const seconds =
          typeof snapshot?.elapsedSeconds === 'number'
            ? snapshot.elapsedSeconds
            : typeof snapshot?.duration === 'number'
              ? snapshot.duration
              : 0;
        const hours = seconds / 3600 || 0;
        const title = snapshot?.workItemTitle || `#${snapshot?.workItemId || id}`;
        presetText = `Worked approximately ${hours.toFixed(
          2
        )} hours on ${title}. Summarize the key updates you completed.`;
      }

      showComposePanel({
        mode: 'timerStop',
        workItemId: id,
        presetText,
        message: `Timer stopped for work item #${id}. Review the comment and use Stop & Apply to post updates.`,
      });
    } else if (composeState?.mode === 'timerStop') {
      hideComposePanel();
    }
  }
}

// Save draft to localStorage
function saveDraftForWorkItem(workItemId: number, text: string) {
  try {
    localStorage.setItem(`azuredevops.draft.${workItemId}`, text || '');
    console.log('[webview] Saved draft for work item', workItemId);
  } catch (e) {
    console.warn('[webview] Failed to save draft to localStorage', e);
  }
}

// Load draft from localStorage
function loadDraftForWorkItem(workItemId: number): string | null {
  try {
    const v = localStorage.getItem(`azuredevops.draft.${workItemId}`);
    return v;
  } catch (e) {
    console.warn('[webview] Failed to load draft from localStorage', e);
    return null;
  }
}

// Remove draft from localStorage
function removeDraftForWorkItem(workItemId: number) {
  try {
    localStorage.removeItem(`azuredevops.draft.${workItemId}`);
    console.log('[webview] Removed draft for work item', workItemId);
  } catch (e) {
    console.warn('[webview] Failed to remove draft from localStorage', e);
  }
}

// Wire textarea change/input events to persist drafts
(function wireDraftAutosave() {
  // Defer until DOM ready
  const attemptWire = () => {
    if (!elements.draftSummary) return false;
    const ta = elements.draftSummary as HTMLTextAreaElement;

    // Save on input (fast) and on blur (ensure save)
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

// Load persisted draft when the timer updates (or selection changes)
// Extend existing handleTimerUpdate behavior to load persisted draft for the current work item
// Also attempt to load a persisted draft when a work item is selected (if selection flow exists)
// Listen for a custom message or selection; reuse existing selection flow if possible by reacting to selectedWorkItemId changes
(function watchSelectionLoadDraft() {
  // Since there's no centralized selection event, poll for changes to selectedWorkItemId and update when it changes
  let lastSelected: number | null = null;
  setInterval(() => {
    if (selectedWorkItemId && selectedWorkItemId !== lastSelected) {
      lastSelected = selectedWorkItemId;
      try {
        const persisted = loadDraftForWorkItem(selectedWorkItemId as number);
        if (persisted !== null && elements.draftSummary) {
          elements.draftSummary.value = persisted;
        }
      } catch (e) {
        // ignore
      }
    }
  }, 500);
})();

// When stop and apply succeeds we clear the persisted draft
// We already handle 'stopAndApplyResult' messages and clear the UI draft; also remove persisted value
(function hookClearOnApply() {
  // augment existing message handler behavior by observing messages posted to the window
  // The setupMessageHandling already handles 'stopAndApplyResult' and clears the UI; ensure persisted draft removed as well
  const originalHandler = window.addEventListener;
  // We don't override global listeners; instead ensure removal in the message branch above where we handle 'stopAndApplyResult'
})();

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

// Activity detection for timer auto-resume
(function setupActivityDetection() {
  let lastActivityTime = Date.now();
  let activityPingTimer: NodeJS.Timeout | undefined;

  // Throttle activity pings to avoid spamming the extension
  function sendActivityPing() {
    if (activityPingTimer) return; // Already scheduled

    activityPingTimer = setTimeout(() => {
      postMessage({ type: 'activity' });
      activityPingTimer = undefined;
    }, 500); // Send activity ping at most once every 500ms
  }

  // Events that indicate user activity
  const activityEvents = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart', 'focus'];

  // Add throttled event listeners
  activityEvents.forEach((eventType) => {
    document.addEventListener(
      eventType,
      () => {
        const now = Date.now();
        // Only send activity ping if enough time has passed since last activity
        if (now - lastActivityTime > 1000) {
          // Minimum 1 second between activities
          lastActivityTime = now;
          sendActivityPing();
        }
      },
      { passive: true }
    );
  });

  // Also send activity ping when the webview gains focus/visibility
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      sendActivityPing();
    }
  });

  // Send initial activity ping when webview loads
  sendActivityPing();
})();

// Start the app
startApp();
