/* eslint-disable @typescript-eslint/no-unused-vars */
// Vanilla JavaScript implementation - reliable and framework-free
interface Window {
  vscode?: any;
  acquireVsCodeApi?: () => any;
}

// Initialize VS Code API
const vscode = (() => {
  try {
    return window.vscode || window.acquireVsCodeApi?.();
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
type AuthMethod = 'pat' | 'entra';

type ConnectionEntry = {
  id: string;
  label: string;
  organization?: string;
  project?: string;
  authMethod?: AuthMethod;
  baseUrl?: string;
  hasIdentityName?: boolean;
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

const DEFAULT_QUERY = 'My Activity';
const QUERY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'My Activity', label: 'My Activity' },
  { value: 'Assigned to me', label: 'Assigned to me' },
  { value: 'Following', label: 'Following' },
  { value: 'Mentioned', label: 'Mentioned' },
];
const DEFAULT_QUERY_KEY = '__default__';
const selectedQueryByConnection = new Map<string, string>();
selectedQueryByConnection.set(DEFAULT_QUERY_KEY, DEFAULT_QUERY);

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

type BranchContextState = {
  branchName?: string;
  branchRef?: string;
  repositoryId?: string;
  repositoryName?: string;
  remoteUrl?: string;
  lastUpdated?: number;
} | null;

const branchContextByConnection = new Map<string, BranchContextState>();
let activeBranchContext: BranchContextState = null;

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

function getQueryStorageKey(connectionId: string | null | undefined): string {
  if (typeof connectionId === 'string') {
    const trimmed = connectionId.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return DEFAULT_QUERY_KEY;
}

function normalizeQueryValue(raw: unknown): string {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return DEFAULT_QUERY;
}

function normalizeConnectionsList(raw: unknown): ConnectionEntry[] {
  if (!Array.isArray(raw)) return [];
  const results: ConnectionEntry[] = [];
  for (const entry of raw as unknown[]) {
    if (!entry || typeof entry !== 'object') continue;
    const candidate = entry as Record<string, unknown>;
    const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
    if (!id) continue;
    const label =
      typeof candidate.label === 'string' && candidate.label.trim().length > 0
        ? candidate.label.trim()
        : typeof candidate.project === 'string' && candidate.project.trim().length > 0
          ? candidate.project.trim()
          : id;
    const organization =
      typeof candidate.organization === 'string' && candidate.organization.trim().length > 0
        ? candidate.organization.trim()
        : undefined;
    const project =
      typeof candidate.project === 'string' && candidate.project.trim().length > 0
        ? candidate.project.trim()
        : undefined;
    const authMethod =
      candidate.authMethod === 'entra'
        ? 'entra'
        : candidate.authMethod === 'pat'
          ? 'pat'
          : undefined;
    const normalized: ConnectionEntry = {
      id,
      label,
      organization,
      project,
      authMethod,
    };
    results.push(normalized);
  }
  return results;
}

function cleanupRemovedConnections(validIds: Set<string>): void {
  Array.from(workItemsByConnection.keys()).forEach((id) => {
    if (!validIds.has(id)) {
      workItemsByConnection.delete(id);
      fallbackNotices.delete(id);
      typeOptionsByConnection.delete(id);
      filterStateByConnection.delete(id);
    }
  });

  Array.from(selectedQueryByConnection.keys()).forEach((key) => {
    if (key === DEFAULT_QUERY_KEY) return;
    if (!validIds.has(key)) {
      selectedQueryByConnection.delete(key);
    }
  });
}

function deriveActiveConnectionIdFromContext(
  list: ConnectionEntry[],
  tabView: any,
  fallbackActiveId: unknown
): string | null {
  const fromTab =
    typeof tabView?.connectionId === 'string' && tabView.connectionId.trim().length > 0
      ? tabView.connectionId.trim()
      : '';
  if (fromTab) return fromTab;
  const fallback =
    typeof fallbackActiveId === 'string' && fallbackActiveId.trim().length > 0
      ? fallbackActiveId.trim()
      : '';
  if (fallback) return fallback;
  return list.length > 0 ? list[0].id : null;
}

function readWorkItemNumericId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function findWorkItemById(collection: unknown[], targetId: number | null): any | null {
  if (!Array.isArray(collection) || targetId === null) {
    return null;
  }

  for (const candidate of collection) {
    if (!candidate || typeof candidate !== 'object') continue;
    const record = candidate as Record<string, unknown>;
    const directId = readWorkItemNumericId(record.id);
    if (directId !== null && directId === targetId) {
      return candidate;
    }
    const fields = record.fields;
    if (fields && typeof fields === 'object') {
      const fieldId = readWorkItemNumericId((fields as Record<string, unknown>)['System.Id']);
      if (fieldId !== null && fieldId === targetId) {
        return candidate;
      }
    }
  }

  return null;
}

function extractWorkItemTitleFromCandidate(candidate: any): string | undefined {
  if (!candidate || typeof candidate !== 'object') return undefined;
  const record = candidate as Record<string, unknown>;
  if (typeof record.title === 'string') {
    const trimmed = record.title.trim();
    if (trimmed.length > 0) return trimmed;
  }
  const fields = record.fields;
  if (fields && typeof fields === 'object') {
    const value = (fields as Record<string, unknown>)['System.Title'];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return undefined;
}

function normalizeTimerFromTabView(tabView: any, connectionId: string | null): any | null {
  if (!tabView || typeof tabView !== 'object') return null;
  const timer = tabView.timer;
  if (!timer || typeof timer !== 'object') return null;

  const timerRecord = timer as Record<string, unknown>;
  const workItemId = readWorkItemNumericId(timerRecord.workItemId);
  const elapsedSeconds =
    typeof timerRecord.elapsed === 'number'
      ? Number(timerRecord.elapsed)
      : typeof timerRecord.elapsedSeconds === 'number'
        ? Number(timerRecord.elapsedSeconds)
        : 0;
  const running = timerRecord.isRunning === true || timerRecord.running === true;
  const isActive = timerRecord.isActive === true || running;

  const sources: unknown[][] = [];
  if (Array.isArray(tabView.rawWorkItems)) {
    sources.push(tabView.rawWorkItems);
  }
  if (connectionId) {
    const cached = workItemsByConnection.get(connectionId);
    if (Array.isArray(cached)) {
      sources.push(cached);
    }
  }
  if (Array.isArray(tabView.workItems)) {
    sources.push(tabView.workItems);
  }

  const match =
    sources
      .map((collection) => findWorkItemById(collection, workItemId))
      .find((candidate) => candidate != null) ?? null;
  const resolvedTitle = match ? extractWorkItemTitleFromCandidate(match) : undefined;

  const normalized: Record<string, unknown> = { ...timerRecord };
  normalized.workItemId = workItemId;
  normalized.workItemTitle =
    typeof resolvedTitle === 'string' && resolvedTitle.trim().length > 0
      ? resolvedTitle.trim()
      : workItemId !== null
        ? `#${workItemId}`
        : '';
  normalized.elapsedSeconds = elapsedSeconds;
  normalized.duration =
    typeof timerRecord.duration === 'number' ? Number(timerRecord.duration) : elapsedSeconds;
  normalized.running = running;
  normalized.isRunning = running;
  normalized.isActive = isActive;
  normalized.elapsed = elapsedSeconds;

  return normalized;
}

function updateConnectionCache(
  connectionId: string | null,
  rawItems: any[],
  loading: boolean
): void {
  if (connectionId && (!loading || rawItems.length > 0)) {
    workItemsByConnection.set(connectionId, rawItems);
  }
}

function getCachedConnectionItems(connectionId: string | null): any[] {
  if (!connectionId) return [];
  return workItemsByConnection.get(connectionId) ?? [];
}

function handleConnectionWorkItems(
  connectionId: string | null,
  rawItems: any[],
  cachedItems: any[],
  loading: boolean
): void {
  if (connectionId) {
    if (rawItems.length > 0) {
      handleWorkItemsLoaded(
        rawItems,
        connectionId,
        {
          fromCache: false,
          query: getSelectedQueryForConnection(connectionId),
        },
        undefined
      );
      return;
    }

    if (!loading) {
      handleWorkItemsLoaded(
        [],
        connectionId,
        {
          fromCache: false,
          query: getSelectedQueryForConnection(connectionId),
        },
        undefined
      );
      return;
    }

    if (cachedItems.length > 0) {
      handleWorkItemsLoaded(
        cachedItems,
        connectionId,
        {
          fromCache: true,
          query: getSelectedQueryForConnection(connectionId),
        },
        undefined
      );
      return;
    }

    isLoading = true;
    showLoadingState();
    return;
  }

  if (rawItems.length > 0) {
    handleWorkItemsLoaded(rawItems, null, { fromCache: false }, undefined);
  }
}

function shouldRequestConnectionItems(
  connectionId: string | null,
  loading: boolean,
  rawItems: any[],
  cachedItems: any[]
): boolean {
  return Boolean(connectionId && !loading && rawItems.length === 0 && cachedItems.length === 0);
}

function applyTabContextToUi(tabView: any, connectionId: string | null): void {
  const normalizedConnectionId = normalizeConnectionId(connectionId ?? null);
  const rawItems = Array.isArray(tabView?.rawWorkItems) ? tabView.rawWorkItems : [];
  const status = tabView && typeof tabView === 'object' ? tabView.status : null;
  const loading = Boolean(status?.isLoading);

  updateConnectionCache(normalizedConnectionId, rawItems, loading);

  const cachedItems = getCachedConnectionItems(normalizedConnectionId);

  handleConnectionWorkItems(normalizedConnectionId, rawItems, cachedItems, loading);

  isLoading = loading;

  if (shouldRequestConnectionItems(normalizedConnectionId, loading, rawItems, cachedItems)) {
    requestWorkItems();
  }

  const timerPayload = normalizeTimerFromTabView(tabView, normalizedConnectionId);
  handleTimerUpdate(timerPayload);
}

function ensureQueryOption(value: string) {
  const select = elements.queryFilter;
  if (!select) return;
  for (let i = 0; i < select.options.length; i += 1) {
    if (select.options[i]?.value === value) {
      return;
    }
  }
  const option = document.createElement('option');
  option.value = value;
  option.textContent = value;
  select.appendChild(option);
}

function setSelectedQueryForConnection(
  connectionId: string | null | undefined,
  query: string | undefined
): string {
  const key = getQueryStorageKey(connectionId);
  const normalized = normalizeQueryValue(query);
  selectedQueryByConnection.set(key, normalized);
  if (key !== DEFAULT_QUERY_KEY) {
    selectedQueryByConnection.set(DEFAULT_QUERY_KEY, normalized);
  }
  return normalized;
}

function getSelectedQueryForConnection(connectionId: string | null | undefined): string {
  const key = getQueryStorageKey(connectionId);
  if (selectedQueryByConnection.has(key)) {
    return selectedQueryByConnection.get(key)!;
  }
  const fallback = selectedQueryByConnection.get(DEFAULT_QUERY_KEY) ?? DEFAULT_QUERY;
  selectedQueryByConnection.set(key, fallback);
  return fallback;
}

function applyQuerySelectionToUi(connectionId: string | null | undefined) {
  const select = elements.queryFilter;
  if (!select) return;
  const value = getSelectedQueryForConnection(connectionId);
  ensureQueryOption(value);
  select.value = value;
}

function initializeQueryDropdown() {
  const select = elements.queryFilter;
  if (!select) return;
  select.innerHTML = '';
  QUERY_OPTIONS.forEach(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  });
  const initial = getSelectedQueryForConnection(activeConnectionId);
  ensureQueryOption(initial);
  select.value = initial;
}

function handleQuerySelectionChange() {
  const select = elements.queryFilter;
  if (!select) return;
  const normalized = setSelectedQueryForConnection(activeConnectionId, select.value);
  ensureQueryOption(normalized);
  applyQuerySelectionToUi(activeConnectionId);
  isLoading = true;
  showLoadingState();
  postMessage({
    type: 'setQuery',
    query: normalized,
    connectionId: activeConnectionId ?? undefined,
  });
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

function resetFiltersToDefaults(): void {
  if (elements.searchInput) elements.searchInput.value = '';
  if (elements.sprintFilter) elements.sprintFilter.value = '';
  if (elements.typeFilter) elements.typeFilter.value = '';
  if (elements.assignedToFilter) elements.assignedToFilter.value = '';
  if (elements.excludeDone) elements.excludeDone.checked = false;
  if (elements.excludeClosed) elements.excludeClosed.checked = false;
  if (elements.excludeRemoved) elements.excludeRemoved.checked = false;
  if (elements.excludeInReview) elements.excludeInReview.checked = false;

  const connectionId = activeConnectionId;
  if (!connectionId) return;
  const state = getFilterStateForConnection(connectionId);
  Object.assign(state, getDefaultFilterState());
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
  queryFilter: null as HTMLSelectElement | null,
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
  generatePromptBtn: null as HTMLButtonElement | null,
};

function handleGenerateCopilotPrompt(rawId: number | null): void {
  const timerId = currentTimer ? Number(currentTimer.workItemId) : null;
  const workItemId =
    rawId ?? composeState?.workItemId ?? (Number.isFinite(timerId) ? timerId : null);
  const draft = elements.draftSummary ? elements.draftSummary.value : '';
  if (!workItemId) {
    console.warn('[webview] generateCopilotPrompt: no work item id available');
    setComposeStatus('No work item selected to generate prompt.');
    return;
  }
  setComposeStatus('Preparing Copilot prompt and copying to clipboard...');
  postMessage({ type: 'generateCopilotPrompt', workItemId, draftSummary: draft });
}

function handleComposeSubmit(): void {
  const draft = elements.draftSummary ? elements.draftSummary.value : '';
  const mode = composeState?.mode ?? (currentTimer ? 'timerStop' : null);
  const workItemId = composeState?.workItemId;

  if (!workItemId) {
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

  if (mode === 'addComment') {
    setComposeStatus(`Adding a comment to work item #${workItemId}...`);
  } else {
    setComposeStatus('Stopping timer and applying updates...');
  }

  const message: any = {
    type: 'submitComposeComment',
    workItemId,
    comment: draft,
    mode: mode || 'addComment',
  };

  if (mode === 'timerStop' && composeState) {
    message.timerData = (composeState as any).timerData;
    message.connectionInfo = (composeState as any).connectionInfo;
  }

  postMessage(message);
}

type ButtonActionPayload = {
  id: number | null;
  button: HTMLElement;
  event: MouseEvent;
};

function toggleSummaryPanel(): void {
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
}

function tryHandleStatusBadgeClick(event: MouseEvent): boolean {
  const statusBadge = (event.target as HTMLElement).closest('.status-badge');
  if (!statusBadge) return false;
  const status = statusBadge.getAttribute('data-status');
  if (!status) return false;
  filterByStatus(status);
  return true;
}

function tryHandleConnectionTabClick(event: MouseEvent): boolean {
  const connectionTab = (event.target as HTMLElement).closest('.connection-tab');
  if (!connectionTab) return false;
  const id = connectionTab.getAttribute('data-connection-id');
  if (!id) return false;
  selectConnection(id);
  return true;
}

function tryHandleWorkItemCardClick(event: MouseEvent): boolean {
  const workItemCard = (event.target as HTMLElement).closest('[data-action="selectWorkItem"]');
  if (!workItemCard) return false;
  if ((event.target as HTMLElement).closest('button')) return false;
  const idValue = workItemCard.getAttribute('data-id');
  if (!idValue) return false;
  const parsedId = Number.parseInt(idValue, 10);
  if (!Number.isFinite(parsedId)) return false;
  selectWorkItem(parsedId.toString());
  return true;
}

function handleToggleView(payload: ButtonActionPayload): void {
  console.log('[webview] toggleView clicked');
  const datasetView =
    payload.button.dataset.view || (payload.event.target as HTMLElement)?.dataset.view;
  const view = datasetView === 'kanban' ? 'kanban' : datasetView === 'list' ? 'list' : null;
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
}

function handleToggleKanban(): void {
  currentView = currentView === 'list' ? 'kanban' : 'list';
  updateViewToggle();
  if (currentView === 'kanban') {
    renderKanbanView();
  } else {
    renderWorkItems();
  }
}

function handleSearchAction(): void {
  const query = elements.searchInput?.value;
  if (query) {
    postMessage({ type: 'search', query });
  }
}

function handleStartTimer(id: number | null): void {
  const targetId =
    id ?? selectedWorkItemId ?? (currentTimer ? Number(currentTimer.workItemId) : null);
  if (targetId) {
    if (currentTimer && Number(currentTimer.workItemId) === Number(targetId)) {
      postMessage({ type: 'stopTimer' });
    } else {
      postMessage({ type: 'startTimer', workItemId: Number(targetId) });
    }
  } else {
    console.warn('[webview] startTimer requested but no work item is selected and no active timer');
  }
}

const buttonActionHandlers: Record<string, (payload: ButtonActionPayload) => void> = {
  refresh: () => requestWorkItems(),
  toggleSummary: () => toggleSummaryPanel(),
  generateCopilotPrompt: (payload) => handleGenerateCopilotPrompt(payload.id),
  stopAndApply: () => handleComposeSubmit(),
  submitCompose: () => handleComposeSubmit(),
  createWorkItem: () => postMessage({ type: 'createWorkItem' }),
  toggleView: (payload) => handleToggleView(payload),
  toggleKanban: () => handleToggleKanban(),
  search: () => handleSearchAction(),
  pauseTimer: () => postMessage({ type: 'pauseTimer' }),
  resumeTimer: () => postMessage({ type: 'resumeTimer' }),
  stopTimer: () => postMessage({ type: 'stopTimer' }),
  startTimer: (payload) => handleStartTimer(payload.id),
  createBranch: (payload) => {
    if (payload.id) postMessage({ type: 'createBranch', id: payload.id });
  },
  openInBrowser: (payload) => {
    if (payload.id) postMessage({ type: 'openInBrowser', id: payload.id });
  },
  copyId: (payload) => {
    if (payload.id) postMessage({ type: 'copyId', id: payload.id });
  },
  viewDetails: (payload) => {
    if (payload.id) postMessage({ type: 'viewWorkItem', workItemId: payload.id });
  },
  editWorkItem: (payload) => {
    if (payload.id) postMessage({ type: 'editWorkItemInEditor', workItemId: payload.id });
  },
  addComment: (payload) => {
    if (payload.id) handleAddComment(payload.id);
  },
};

function handleButtonAction(action: string | null, payload: ButtonActionPayload): void {
  if (!action) return;
  console.log('[webview] Button clicked:', action, 'id:', payload.id);
  const handler = buttonActionHandlers[action];
  if (handler) {
    handler(payload);
  }
}

function handleButtonClick(event: MouseEvent): void {
  const target = (event.target as HTMLElement).closest('button[data-action]');
  if (!(target instanceof HTMLElement)) return;
  const button = target as HTMLElement;
  event.stopPropagation();
  const idAttr = button.getAttribute('data-id');
  const payload: ButtonActionPayload = {
    id: idAttr ? parseInt(idAttr, 10) : null,
    button,
    event,
  };
  handleButtonAction(button.getAttribute('data-action'), payload);
}

function handleDocumentClick(event: MouseEvent): void {
  if (tryHandleStatusBadgeClick(event)) return;
  if (tryHandleConnectionTabClick(event)) return;
  if (tryHandleWorkItemCardClick(event)) return;
  handleButtonClick(event);
}

function handleDocumentChange(event: Event): void {
  const target = event.target as HTMLElement;
  const select = target.closest('select[data-action]');
  if (select) {
    if (select.getAttribute('data-action') === 'applyFilters') {
      applyFilters();
    }
    return;
  }

  const checkbox = target.closest('input[data-action]');
  if (checkbox && (checkbox as HTMLInputElement).type === 'checkbox') {
    if (checkbox.getAttribute('data-action') === 'applyFilters') {
      applyFilters();
    }
  }
}

function handleSearchInputKeypress(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    handleSearchAction();
  }
}

function bindFilterListeners(): void {
  elements.sprintFilter?.addEventListener('change', applyFilters);
  elements.typeFilter?.addEventListener('change', applyFilters);
  elements.assignedToFilter?.addEventListener('change', applyFilters);
  elements.queryFilter?.addEventListener('change', handleQuerySelectionChange);
}

function setupEventListeners(): void {
  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('change', handleDocumentChange);
  elements.searchInput?.addEventListener('keypress', handleSearchInputKeypress);
  bindFilterListeners();
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
  const filteredItems = workItems.filter((item) => getNormalizedState(item) === status);
  resetFiltersToDefaults();
  persistCurrentFilterState();
  renderWorkItemCards(filteredItems, { bannerHtml: '', showEmptyState: true });
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
  applyQuerySelectionToUi(trimmed);

  const cachedItems = workItemsByConnection.get(trimmed);
  const cachedFallback = fallbackNotices.get(trimmed) || null;
  fallbackNotice = cachedFallback;

  if (cachedItems) {
    isLoading = false;
    const cachedBranchContext = branchContextByConnection.get(trimmed) ?? null;
    handleWorkItemsLoaded(
      cachedItems,
      trimmed,
      {
        fromCache: true,
        query: getSelectedQueryForConnection(trimmed),
      },
      cachedBranchContext
    );
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

type WebviewMessage = Record<string, any> & { type?: string };
type WebviewMessageHandler = (message: WebviewMessage) => void;

function handleWorkItemsLoadedMessage(message: WebviewMessage): void {
  fallbackNotice = null;
  const normalizedConnection =
    normalizeConnectionId(message.connectionId) ?? activeConnectionId ?? null;
  const hasBranchContext = Object.prototype.hasOwnProperty.call(message, 'branchContext');
  let branchContextPayload: BranchContextState = null;
  if (hasBranchContext) {
    branchContextPayload = message.branchContext ?? null;
  } else if (normalizedConnection) {
    branchContextPayload = branchContextByConnection.get(normalizedConnection) ?? null;
  }
  if (normalizedConnection) {
    branchContextByConnection.set(normalizedConnection, branchContextPayload);
  }
  handleWorkItemsLoaded(
    message.workItems || [],
    normalizedConnection,
    {
      query: message.query,
    },
    branchContextPayload
  );
}

function handleWorkItemsFallbackMessage(message: WebviewMessage): void {
  handleWorkItemsFallback(message);
}

function handleCopilotPromptCopiedMessage(_message: WebviewMessage): void {
  setComposeStatus(
    'Copilot prompt copied to clipboard. Paste into Copilot chat to generate a comment.'
  );
  setTimeout(() => {
    setComposeStatus(null);
  }, 3500);
}

function handleStopAndApplyResultMessage(message: WebviewMessage): void {
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
}

function handleAddCommentResultMessage(message: WebviewMessage): void {
  const id = typeof message.workItemId === 'number' ? message.workItemId : null;
  if (message?.success === false) {
    const errorMessage =
      typeof message.error === 'string' && message.error.trim().length > 0
        ? message.error.trim()
        : 'Failed to add comment.';
    setComposeStatus(errorMessage);
    return;
  }
  if (id) {
    try {
      removeDraftForWorkItem(id);
    } catch (e) {
      console.warn('[webview] Failed to remove persisted draft after add comment', e);
    }
  }
  setComposeStatus('Comment added successfully.');
  setTimeout(() => {
    hideComposePanel({ clearDraft: true });
  }, 2000);
}

function handleShowComposeCommentMessage(message: WebviewMessage): void {
  const workItemId = typeof message.workItemId === 'number' ? message.workItemId : null;
  const mode = typeof message.mode === 'string' ? message.mode : 'addComment';
  let presetText = '';
  let statusMessage = '';

  if (mode === 'timerStop' && message.timerData) {
    const hours = Number(message.timerData.hoursDecimal || message.timerData.duration / 3600 || 0);
    if (composeState) {
      (composeState as any).timerData = message.timerData;
      (composeState as any).connectionInfo = message.connectionInfo;
    }
    presetText = `Worked approximately ${hours.toFixed(2)} hours. Summarize the key updates you completed.`;
    statusMessage = `Timer stopped. Review the comment and submit to apply time updates to work item #${workItemId}.`;
  } else {
    statusMessage = `Compose a comment for work item #${workItemId}.`;
  }

  showComposePanel({
    mode: mode as ComposeMode,
    workItemId,
    presetText,
    message: statusMessage,
    focus: true,
    expand: true,
  });
}

function handleComposeCommentResultMessage(message: WebviewMessage): void {
  const id = message.workItemId;
  const mode = message.mode;
  const success = message.success;

  if (!success) {
    const errorMessage =
      typeof message.error === 'string' && message.error.trim().length > 0
        ? message.error.trim()
        : `Failed to ${mode === 'timerStop' ? 'apply timer update' : 'add comment'}.`;
    setComposeStatus(errorMessage);
    return;
  }

  if (typeof id === 'number') {
    try {
      removeDraftForWorkItem(id);
    } catch (e) {
      console.warn('[webview] Failed to remove persisted draft after compose', e);
    }
  }

  if (mode === 'timerStop') {
    const hours = message.hours || 0;
    setComposeStatus(`Applied ${hours.toFixed(2)} hours and comment to work item #${id}.`);
  } else {
    setComposeStatus('Comment added successfully.');
  }

  setTimeout(() => {
    hideComposePanel({ clearDraft: true });
  }, 3000);
}

function handleWorkItemsErrorMessage(message: WebviewMessage): void {
  handleWorkItemsError(message.error);
}

function handleTimerUpdateMessage(message: WebviewMessage): void {
  handleTimerUpdate(message.timer);
}

function handleToggleKanbanViewMessage(_message: WebviewMessage): void {
  handleToggleKanbanView();
}

function handleSelfTestPingMessage(message: WebviewMessage): void {
  handleSelfTestPing(message.nonce);
}

function handleWorkItemTypeOptionsMessage(message: WebviewMessage): void {
  const connectionId = normalizeConnectionId(message.connectionId) ?? activeConnectionId;
  const incoming: string[] = Array.isArray(message.types)
    ? message.types
        .map((value: any) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value: string) => value.length > 0)
    : [];
  if (!connectionId) {
    return;
  }

  setTypeOptionsForConnection(connectionId, incoming, { merge: true });

  if (connectionId === activeConnectionId) {
    populateFilterDropdowns(connectionId);
    applyFilterStateToUi(connectionId);
    applyFilters();
  }
}

function handleConnectionsUpdateMessage(message: WebviewMessage): void {
  const list = normalizeConnectionsList(message.connections);
  connections = list;
  const validIds = new Set(list.map((conn) => conn.id));
  cleanupRemovedConnections(validIds);

  const nextActiveId =
    typeof message.activeConnectionId === 'string' && message.activeConnectionId.trim().length > 0
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
}

function handleContextUpdateMessage(message: WebviewMessage): void {
  console.log('[webview] Received contextUpdate - displaying based on current context', message);

  const contextPayload = message.context;
  if (!contextPayload || typeof contextPayload !== 'object') {
    console.warn('[webview] contextUpdate missing payload context', message);
    return;
  }

  const list = normalizeConnectionsList(contextPayload.connections);
  connections = list;

  const validIds = new Set(list.map((conn) => conn.id));
  cleanupRemovedConnections(validIds);

  const tabView = contextPayload.tab ?? null;
  const fallbackActiveId =
    typeof contextPayload.activeConnectionId === 'string'
      ? contextPayload.activeConnectionId
      : null;
  const nextActiveId = deriveActiveConnectionIdFromContext(list, tabView, fallbackActiveId);

  if (nextActiveId) {
    selectConnection(nextActiveId, { fromMessage: true });
  } else {
    activeConnectionId = null;
    workItems = [];
    fallbackNotice = null;
    renderConnectionTabs();
    renderWorkItems();
  }

  if (tabView) {
    applyTabContextToUi(tabView, nextActiveId ?? null);
  } else {
    isLoading = Boolean(contextPayload.isLoading);
    if (isLoading) {
      showLoadingState();
    } else {
      renderWorkItems();
    }
    const fallbackTimer = normalizeTimerFromTabView(contextPayload, nextActiveId ?? null);
    handleTimerUpdate(fallbackTimer);
  }
}

function handleFsmConnectionsUpdateMessage(message: WebviewMessage): void {
  console.log('[webview] ✅ Received FSM connections-update message', message);
  const list = normalizeConnectionsList(message.connections);
  connections = list;

  const validIds = new Set(list.map((conn) => conn.id));
  cleanupRemovedConnections(validIds);

  const nextActiveId = message.activeConnectionId || (list.length > 0 ? list[0].id : null);
  console.log(
    '[webview] FSM connections update - connections:',
    list.length,
    'activeId:',
    nextActiveId
  );

  if (list.length > 0 && nextActiveId) {
    selectConnection(nextActiveId, { fromMessage: true });

    const cachedItems = workItemsByConnection.get(nextActiveId);
    if (!cachedItems || cachedItems.length === 0) {
      console.log('[webview] FSM update - No cached work items, requesting data');
      workItems = [];
      renderWorkItems();
      requestWorkItems();
    }
  } else {
    activeConnectionId = null;
    workItems = [];
    fallbackNotice = null;
    renderConnectionTabs();
    renderWorkItems();
  }
}

function handleFsmWorkItemsUpdateMessage(message: WebviewMessage): void {
  console.log('[webview] ✅ Received FSM work-items-update message', message);

  const workItemsArray = Array.isArray(message.workItems) ? message.workItems : [];
  const connectionId = message.metadata?.connectionId || activeConnectionId;

  if (connectionId) {
    handleWorkItemsLoaded(
      workItemsArray,
      connectionId,
      {
        query: message.metadata?.query,
      },
      null
    );
  }
}

const messageHandlers: Record<string, WebviewMessageHandler> = {
  workItemsLoaded: handleWorkItemsLoadedMessage,
  workItemsFallback: handleWorkItemsFallbackMessage,
  copilotPromptCopied: handleCopilotPromptCopiedMessage,
  stopAndApplyResult: handleStopAndApplyResultMessage,
  addCommentResult: handleAddCommentResultMessage,
  showComposeComment: handleShowComposeCommentMessage,
  composeCommentResult: handleComposeCommentResultMessage,
  workItemsError: handleWorkItemsErrorMessage,
  timerUpdate: handleTimerUpdateMessage,
  toggleKanbanView: handleToggleKanbanViewMessage,
  selfTestPing: handleSelfTestPingMessage,
  workItemTypeOptions: handleWorkItemTypeOptionsMessage,
  connectionsUpdate: handleConnectionsUpdateMessage,
  contextUpdate: handleContextUpdateMessage,
  'connections-update': handleFsmConnectionsUpdateMessage,
  'work-items-update': handleFsmWorkItemsUpdateMessage,
};

function handleWindowMessage(event: MessageEvent<WebviewMessage>): void {
  const message = event.data;
  if (!message || typeof message !== 'object') return;

  const type = typeof message.type === 'string' ? message.type : '';
  const handler = messageHandlers[type];
  if (handler) {
    handler(message);
  } else {
    console.log('[webview] Unknown message type:', type);
  }
}

function setupMessageHandling() {
  window.addEventListener('message', handleWindowMessage);
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

function updateComposeButtonVisibility() {
  const generatePromptBtn = elements.generatePromptBtn;
  if (generatePromptBtn) {
    // Show Copilot button only for timer stops
    if (composeState?.mode === 'timerStop') {
      generatePromptBtn.style.display = '';
    } else {
      generatePromptBtn.style.display = 'none';
    }
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
  updateComposeButtonVisibility();

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
  updateComposeButtonVisibility();
  setComposeStatus(null);
  if (options?.clearDraft && elements.draftSummary) {
    elements.draftSummary.value = '';
  }
}

function requestContext() {
  console.log('[webview] Requesting initial context (connections, state) instead of work items');
  postMessage({
    type: 'requestContext',
  });
}

function requestWorkItems() {
  if (isLoading) return;

  isLoading = true;
  showLoadingState();
  const query = getSelectedQueryForConnection(activeConnectionId);
  postMessage({
    type: 'getWorkItems',
    query,
    connectionId: activeConnectionId ?? undefined,
  });
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
  options: { fromCache?: boolean; query?: string } = {},
  branchContext?: BranchContextState
) {
  const trimmedId = typeof connectionId === 'string' ? connectionId.trim() : '';
  const fromCache = options.fromCache === true;
  const incomingQuery =
    typeof options.query === 'string' && options.query.trim().length > 0
      ? options.query.trim()
      : undefined;

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
  let contextForConnection: BranchContextState = branchContext ?? null;
  if (branchContext !== undefined) {
    const keyToStore = trimmedId || connectionKey;
    if (keyToStore) {
      branchContextByConnection.set(keyToStore, branchContext ?? null);
    }
  } else if (connectionKey) {
    contextForConnection = branchContextByConnection.get(connectionKey) ?? null;
  }

  if (connectionKey) {
    setTypeOptionsForConnection(connectionKey, extractWorkItemTypes(items));
    if (incomingQuery) {
      setSelectedQueryForConnection(connectionKey, incomingQuery);
    } else if (!selectedQueryByConnection.has(getQueryStorageKey(connectionKey))) {
      setSelectedQueryForConnection(connectionKey, undefined);
    }
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
    activeBranchContext = contextForConnection;
    applyQuerySelectionToUi(activeConnectionId ?? null);
    populateFilterDropdowns(activeConnectionId ?? undefined);
    if (activeConnectionId) {
      applyFilterStateToUi(activeConnectionId);
    }
    renderWorkItems();
  }
}

function handleWorkItemsFallback(message: any) {
  const original = message?.originalQuery ? String(message.originalQuery) : 'Configured Query';
  const fallback = message?.fallbackQuery ? String(message.fallbackQuery) : 'My Activity';
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

const BRANCH_MATCH_LABELS: Record<string, string> = {
  exact: 'Exact repository branch',
  refOnly: 'Matching branch ref',
  name: 'Matching branch name',
};

function normalizeBranchDisplayName(meta: any): string {
  if (!meta) return '';
  const directName = typeof meta.branchName === 'string' ? meta.branchName.trim() : '';
  if (directName) return directName;
  const ref = typeof meta.refName === 'string' ? meta.refName.trim() : '';
  if (!ref) return '';
  const parts = ref.split('/');
  return parts[parts.length - 1] || ref;
}

function toTitleCase(value: string): string {
  if (!value) return '';
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

type BuildStatusMeta = {
  className: string;
  icon: string;
  label: string;
};

function getBuildStatusMeta(meta: any): BuildStatusMeta | null {
  if (!meta) return null;
  const build = meta.build;
  const status = typeof build?.status === 'string' ? build.status.toLowerCase() : '';
  const result = typeof build?.result === 'string' ? build.result.toLowerCase() : '';

  if (meta.hasActiveBuild || (!result && status && status !== 'completed')) {
    const label = status ? toTitleCase(status) : 'Running';
    return { className: 'branch-build-active', icon: '⏳', label };
  }

  if (!build) return null;

  switch (result) {
    case 'succeeded':
      return { className: 'branch-build-success', icon: '✅', label: 'Succeeded' };
    case 'failed':
      return { className: 'branch-build-failed', icon: '❌', label: 'Failed' };
    case 'canceled':
    case 'cancelled':
      return { className: 'branch-build-canceled', icon: '⛔', label: 'Canceled' };
    case 'partiallysucceeded':
      return { className: 'branch-build-warning', icon: '⚠️', label: 'Partial' };
    default:
      if (status === 'completed') {
        return {
          className: 'branch-build-completed',
          icon: 'ℹ️',
          label: toTitleCase(result || status),
        };
      }
      return null;
  }
}

function renderBranchBadge(meta: any): string {
  if (!meta || meta.isCurrentBranch !== true) return '';
  const branchName = normalizeBranchDisplayName(meta) || 'Current branch';
  const matchConfidence =
    typeof meta.matchConfidence === 'string' && meta.matchConfidence.trim().length > 0
      ? meta.matchConfidence.trim()
      : 'exact';
  const matchLabel = BRANCH_MATCH_LABELS[matchConfidence] || 'Branch link';
  const classes = ['branch-badge', `branch-match-${matchConfidence.toLowerCase()}`];
  if (meta.hasActiveBuild) {
    classes.push('branch-build-active');
  }

  const buildStatusMeta = getBuildStatusMeta(meta);
  const tooltipParts: string[] = [`Current branch: ${branchName}`, `Match: ${matchLabel}`];
  if (meta.repositoryName) {
    tooltipParts.push(`Repository: ${meta.repositoryName}`);
  }
  if (meta.refName && meta.refName !== branchName) {
    tooltipParts.push(`Ref: ${meta.refName}`);
  }
  if (buildStatusMeta) {
    const buildNumber =
      typeof meta.build?.buildNumber === 'string' && meta.build.buildNumber.trim().length > 0
        ? meta.build.buildNumber.trim()
        : meta.build?.id
          ? `#${meta.build.id}`
          : '';
    const buildLabel = buildNumber
      ? `${buildStatusMeta.label} ${buildNumber}`
      : buildStatusMeta.label;
    tooltipParts.push(`Latest build: ${buildLabel}`);
  }

  const tooltip = tooltipParts.join('\n');
  const buildHtml = buildStatusMeta
    ? `<span class="branch-build-indicator ${buildStatusMeta.className}">${buildStatusMeta.icon} ${escapeHtml(
        buildStatusMeta.label
      )}</span>`
    : '';

  return `
    <span class="${classes.join(' ')}" title="${escapeHtml(tooltip)}">
      <span class="branch-icon">🌿</span>
      <span class="branch-name">${escapeHtml(branchName)}</span>
      ${buildHtml}
    </span>
  `;
}

type RenderWorkItemOptions = {
  bannerHtml?: string;
  showEmptyState?: boolean;
};

function getWorkItemField(item: any, field: string): unknown {
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
      const value = item.assignedTo ?? item.fields?.['System.AssignedTo'];
      if (value && typeof value === 'object') {
        return value.displayName || value.uniqueName || value.name;
      }
      return value;
    }
    case 'System.Tags':
      if (item.tags) {
        return Array.isArray(item.tags) ? item.tags.join(';') : item.tags;
      }
      return item.fields?.['System.Tags'];
    case 'Microsoft.VSTS.Common.Priority':
      return item.priority ?? item.fields?.['Microsoft.VSTS.Common.Priority'];
    case 'System.IterationPath':
      return item.iterationPath ?? item.fields?.['System.IterationPath'];
    default:
      return item[field] ?? item.fields?.[field];
  }
}

function normalizeTags(tagsField: unknown): string[] {
  if (typeof tagsField === 'string') {
    return tagsField
      .split(';')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  if (Array.isArray(tagsField)) {
    return tagsField.map((tag) => String(tag).trim()).filter(Boolean);
  }
  return [];
}

function buildWorkItemCardHtml(item: any): string {
  const idRaw = getWorkItemField(item, 'System.Id');
  const id = typeof idRaw === 'number' ? idRaw : Number(idRaw);
  const safeId = Number.isFinite(id) ? id : Number(item?.id) || 0;
  const title = getWorkItemField(item, 'System.Title') || `Work Item #${safeId}`;
  const state = getWorkItemField(item, 'System.State') || 'Unknown';
  const type = getWorkItemField(item, 'System.WorkItemType') || 'Unknown';
  const assigned = getWorkItemField(item, 'System.AssignedTo') || 'Unassigned';
  const priority = getWorkItemField(item, 'Microsoft.VSTS.Common.Priority') || 2;
  const tags = normalizeTags(getWorkItemField(item, 'System.Tags'));
  const iterationPath = getWorkItemField(item, 'System.IterationPath') || '';
  const description = item.description || item.fields?.['System.Description'] || '';

  const isSelected = selectedWorkItemId === safeId;
  const typeIcon = getWorkItemTypeIcon(String(type));
  const priorityClass = getPriorityClass(Number(priority));
  const priorityIcon = getPriorityIcon(Number(priority));
  const stateClass = getStateClass(String(state));

  const hasActiveTimer = !!currentTimer && Number(currentTimer.workItemId) === Number(safeId);
  const timerDisplay = hasActiveTimer ? formatTimerDuration(currentTimer.elapsedSeconds || 0) : '';

  const descriptionSnippet = description
    ? `<div class="work-item-description">${escapeHtml(String(description).substring(0, 120))}${
        String(description).length > 120 ? '...' : ''
      }</div>`
    : '';

  const assigneeHtml =
    assigned && assigned !== 'Unassigned'
      ? `<div class="work-item-assignee"><span class="assignee-icon">👤</span><span>${escapeHtml(
          String(assigned)
        )}</span></div>`
      : '';

  const iterationHtml = iterationPath
    ? `<div class="work-item-iteration"><span class="iteration-icon">🔄</span><span>${escapeHtml(
        String(iterationPath).split('\\').pop() || String(iterationPath)
      )}</span></div>`
    : '';

  const tagsHtml =
    tags.length > 0
      ? `<div class="work-item-tags">${tags
          .slice(0, 3)
          .map((tag) => `<span class="work-item-tag">${escapeHtml(tag)}</span>`)
          .join('')}${
          tags.length > 3 ? `<span class="tag-overflow">+${tags.length - 3}</span>` : ''
        }</div>`
      : '';

  const timerIndicator = hasActiveTimer
    ? `<div class="timer-indicator" title="Timer running: ${timerDisplay}">⏱️ ${timerDisplay}</div>`
    : '';

  const timerButton = hasActiveTimer
    ? `<button class="action-btn timer-btn" data-action="stopTimer" data-id="${safeId}" title="Start/Stop Timer">⏹️</button>`
    : `<button class="action-btn timer-btn" data-action="startTimer" data-id="${safeId}" title="Start/Stop Timer">⏱️</button>`;

  return `
    <div class="work-item-card ${isSelected ? 'selected' : ''} ${stateClass} ${
      hasActiveTimer ? 'has-active-timer' : ''
    }" data-id="${safeId}" data-action="selectWorkItem">
      <div class="work-item-header">
        <div class="work-item-type-icon ${typeIcon.class}">${typeIcon.icon}</div>
        <div class="work-item-id">#${safeId}</div>
        ${timerIndicator}
        <div class="work-item-priority ${priorityClass}">${priorityIcon.icon} ${priorityIcon.label}</div>
      </div>
      <div class="work-item-content">
        <div class="work-item-title" title="${escapeHtml(String(title))}">${escapeHtml(
          String(title)
        )}</div>
        ${descriptionSnippet}
        <div class="work-item-details">
          <div class="work-item-meta-row">
            <span class="work-item-type">${escapeHtml(String(type))}</span>
            <span class="work-item-state state-${String(state)
              .toLowerCase()
              .replace(/\s+/g, '-')}">${escapeHtml(String(state))}</span>
          </div>
          ${assigneeHtml}
          ${iterationHtml}
          ${tagsHtml}
        </div>
      </div>
      <div class="work-item-actions">
        ${timerButton}
        <button class="action-btn comment-btn" data-action="addComment" data-id="${safeId}" title="Add Comment">💬</button>
        <button class="action-btn view-btn" data-action="viewDetails" data-id="${safeId}" title="View Details">👁️</button>
        <button class="action-btn edit-btn" data-action="editWorkItem" data-id="${safeId}" title="Edit">✏️</button>
      </div>
    </div>`;
}

function renderWorkItemCards(items: any[], options: RenderWorkItemOptions = {}): void {
  if (!elements.workItemsContainer) return;
  const { bannerHtml = '', showEmptyState = true } = options;

  if (items.length === 0) {
    const emptyHtml = showEmptyState
      ? `${bannerHtml}<div class="status-message">
            <div>No work items found</div>
            <div style="font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-top: 0.5rem;">Use the refresh button (🔄) in the header to reload work items</div>
          </div>`
      : bannerHtml;
    preserveScroll('y', () => {
      elements.workItemsContainer!.innerHTML = emptyHtml;
    });
    updateStatusOverview(items);
    return;
  }

  const html = items.map((item) => buildWorkItemCardHtml(item)).join('');
  preserveScroll('y', () => {
    elements.workItemsContainer!.innerHTML = `${bannerHtml}${html}`;
  });
  updateStatusOverview(items);
}

function buildFallbackBannerHtml(notice: FallbackNoticeData | null): string {
  if (!notice) return '';
  const original = escapeHtml(String(notice.originalQuery || 'Configured Query'));
  const fallback = escapeHtml(String(notice.fallbackQuery || 'My Activity'));
  const defaultQueryText = notice.defaultQuery
    ? ` (default query: ${escapeHtml(String(notice.defaultQuery))})`
    : '';
  const fetchedSnippet =
    typeof notice.fetchedCount === 'number' ? ` ${notice.fetchedCount} work items loaded.` : '';
  const activeConnection = activeConnectionId
    ? connections.find((conn) => conn.id === activeConnectionId)
    : null;
  const fallbackAuthMethod = activeConnection?.authMethod === 'entra' ? 'entra' : 'pat';
  const fallbackAuthDescription =
    fallbackAuthMethod === 'entra'
      ? 'the Microsoft Entra ID connection'
      : 'the saved Personal Access Token';
  const fallbackRemediation =
    fallbackAuthMethod === 'entra'
      ? "If this isn't you, sign out and sign in with the correct Microsoft Entra ID account under Azure DevOps Integration settings."
      : "If this isn't you, update the PAT under Azure DevOps Integration settings.";
  const identity = notice.fallbackIdentity;
  const assignees = Array.isArray(notice.assignees)
    ? notice.assignees.filter((value) => typeof value === 'string' && value.trim().length > 0)
    : [];
  let identityHtml = '';
  if (identity && (identity.displayName || identity.uniqueName || identity.id)) {
    const label = escapeHtml(
      identity.displayName || identity.uniqueName || identity.id || 'this connection'
    );
    identityHtml = `
        <div style="margin-top: 0.5rem; font-size: 0.85em; color: var(--vscode-descriptionForeground);">
          Results were loaded using ${fallbackAuthDescription} for <strong>${label}</strong>.
          ${escapeHtml(fallbackRemediation)}
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
  return `
      <div class="info-banner" style="margin: 0 0 0.75rem 0; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--vscode-inputValidationInfoBorder, rgba(0, 122, 204, 0.6)); background: var(--vscode-inputValidationInfoBackground, rgba(0, 122, 204, 0.1));">
        <div style="font-weight: 600;">Showing fallback results</div>
        <div style="margin-top: 0.25rem;">No work items matched <code>${original}</code>. Loaded <code>${fallback}</code> instead.${defaultQueryText}${fetchedSnippet}</div>
        <div style="margin-top: 0.5rem; font-size: 0.85em; color: var(--vscode-descriptionForeground);">
          Update <strong>Azure DevOps Integration › Default Query</strong> in settings to customize the default list.
        </div>
        ${identityHtml}
      </div>`;
}

function renderWorkItems() {
  const itemsToRender = getVisibleItems();
  console.log('[webview] renderWorkItems called, itemsToRender.length:', itemsToRender.length);
  if (!elements.workItemsContainer) return;
  const bannerHtml = buildFallbackBannerHtml(fallbackNotice);
  renderWorkItemCards(itemsToRender, { bannerHtml, showEmptyState: true });
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

const KANBAN_STATE_ORDER = [
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

function groupWorkItemsByState(items: any[]): Record<string, any[]> {
  return items.reduce<Record<string, any[]>>((groups, item) => {
    const rawState = getWorkItemField(item, 'System.State') ?? 'Unknown';
    const state = typeof rawState === 'string' ? rawState : String(rawState ?? 'Unknown');
    if (!groups[state]) groups[state] = [];
    groups[state].push(item);
    return groups;
  }, {});
}

function getOrderedKanbanStates(stateGroups: Record<string, any[]>): string[] {
  const prioritized = KANBAN_STATE_ORDER.filter((state) => stateGroups[state]);
  const extras = Object.keys(stateGroups).filter((state) => !prioritized.includes(state));
  return [...prioritized, ...extras];
}

function buildKanbanCardHtml(item: any): string {
  const idField = getWorkItemField(item, 'System.Id');
  const candidateId = typeof idField === 'number' ? idField : Number(idField);
  const id = Number.isFinite(candidateId) ? candidateId : Number(item?.id) || 0;
  const title = getWorkItemField(item, 'System.Title') || `Work Item #${id}`;
  const type = getWorkItemField(item, 'System.WorkItemType') || 'Unknown';
  const assigned = getWorkItemField(item, 'System.AssignedTo') || 'Unassigned';
  const priorityValue = Number(getWorkItemField(item, 'Microsoft.VSTS.Common.Priority') || 2);
  const tags = normalizeTags(getWorkItemField(item, 'System.Tags'));

  const isSelected = selectedWorkItemId === id;
  const typeIcon = getWorkItemTypeIcon(String(type));
  const priorityClass = getPriorityClass(priorityValue);
  const priorityIcon = getPriorityIcon(priorityValue);
  const hasActiveTimer = !!currentTimer && Number(currentTimer.workItemId) === Number(id);
  const timerDisplay = hasActiveTimer ? formatTimerDuration(currentTimer.elapsedSeconds || 0) : '';
  const shortAssigned =
    typeof assigned === 'string' && assigned.includes(' ') ? assigned.split(' ')[0] : assigned;

  const timerIndicator = hasActiveTimer
    ? `<div class="timer-indicator" title="Timer running: ${timerDisplay}">⏱️ ${timerDisplay}</div>`
    : '';
  const timerButton = hasActiveTimer
    ? `<button class="action-btn timer-btn" data-action="stopTimer" data-id="${id}" title="Start/Stop Timer">⏹️</button>`
    : `<button class="action-btn timer-btn" data-action="startTimer" data-id="${id}" title="Start/Stop Timer">⏱️</button>`;

  const assigneeHtml =
    assigned && assigned !== 'Unassigned'
      ? `<span class="work-item-assignee"><span class="assignee-icon">👤</span>${escapeHtml(
          String(shortAssigned)
        )}</span>`
      : '';

  const tagsHtml = tags.length
    ? `<div class="work-item-tags">${tags
        .slice(0, 2)
        .map((tag) => `<span class="work-item-tag">${escapeHtml(tag)}</span>`)
        .join(
          ''
        )}${tags.length > 2 ? `<span class="tag-overflow">+${tags.length - 2}</span>` : ''}</div>`
    : '';

  return `
    <div class="kanban-card ${isSelected ? 'selected' : ''} ${
      hasActiveTimer ? 'has-active-timer' : ''
    }" data-id="${id}" data-action="selectWorkItem">
      <div class="kanban-card-header">
        <div class="work-item-type-icon ${typeIcon.class}">${typeIcon.icon}</div>
        <div class="work-item-id">#${id}</div>
        ${timerIndicator}
        <div class="work-item-priority ${priorityClass}">${priorityIcon.icon} ${priorityIcon.label}</div>
      </div>
      <div class="kanban-card-content">
        <div class="work-item-title" title="${escapeHtml(String(title))}">${escapeHtml(
          String(title)
        )}</div>
        <div class="kanban-card-meta">
          <span class="work-item-type">${escapeHtml(String(type))}</span>
          ${assigneeHtml}
        </div>
        ${tagsHtml}
      </div>
      <div class="kanban-card-actions">
        ${timerButton}
        <button class="action-btn comment-btn" data-action="addComment" data-id="${id}" title="Add Comment">💬</button>
        <button class="action-btn edit-btn" data-action="editWorkItem" data-id="${id}" title="Edit">✏️</button>
        <button class="action-btn view-btn" data-action="viewDetails" data-id="${id}" title="View Details">👁️</button>
      </div>
    </div>`;
}

function buildKanbanColumnHtml(state: string, items: any[]): string {
  const stateClass = getStateClass(state);
  const cardsHtml = items.map((item) => buildKanbanCardHtml(item)).join('');
  return `
    <div class="kanban-column">
      <div class="kanban-column-header ${stateClass}">
        <h3>${escapeHtml(state)}</h3>
        <span class="item-count">${items.length}</span>
      </div>
      <div class="kanban-column-content">
        ${cardsHtml}
      </div>
    </div>`;
}

function renderKanbanView() {
  const itemsToRender = getVisibleItems();
  console.log('[webview] renderKanbanView called, itemsToRender.length:', itemsToRender.length);
  if (!elements.workItemsContainer) return;

  if (itemsToRender.length === 0) {
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

  const stateGroups = groupWorkItemsByState(itemsToRender);
  const orderedStates = getOrderedKanbanStates(stateGroups);
  const kanbanHtml = `
      <div class="kanban-board">
        ${orderedStates.map((state) => buildKanbanColumnHtml(state, stateGroups[state])).join('')}
      </div>
    `;

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

function init() {
  elements.searchInput = document.getElementById('searchInput') as HTMLInputElement;
  elements.statusOverview = document.getElementById('statusOverview');
  elements.connectionTabs = document.getElementById('connectionTabs');
  elements.sprintFilter = document.getElementById('sprintFilter') as HTMLSelectElement;
  elements.typeFilter = document.getElementById('typeFilter') as HTMLSelectElement;
  elements.queryFilter = document.getElementById('queryFilter') as HTMLSelectElement;
  elements.assignedToFilter = document.getElementById('assignedToFilter') as HTMLSelectElement;
  elements.excludeDone = document.getElementById('excludeDone') as HTMLInputElement;
  elements.excludeClosed = document.getElementById('excludeClosed') as HTMLInputElement;
  elements.excludeRemoved = document.getElementById('excludeRemoved') as HTMLInputElement;
  elements.excludeInReview = document.getElementById('excludeInReview') as HTMLInputElement;
  elements.workItemsContainer = document.getElementById('workItemsContainer');
  elements.timerContainer = document.getElementById('timerContainer');
  elements.timerDisplay = document.getElementById('timerDisplay');
  elements.timerInfo = document.getElementById('timerInfo');

  const startTimerBtn = document.getElementById('startTimerBtn') as HTMLButtonElement;
  const pauseTimerBtn = document.getElementById('pauseTimerBtn') as HTMLButtonElement;
  const stopTimerBtn = document.getElementById('stopTimerBtn') as HTMLButtonElement;

  (elements as any).startTimerBtn = startTimerBtn;
  (elements as any).pauseTimerBtn = pauseTimerBtn;
  (elements as any).stopTimerBtn = stopTimerBtn;
  elements.content = document.getElementById('content');

  elements.draftSummary = document.getElementById('draftSummary') as HTMLTextAreaElement;
  elements.summarySection = document.getElementById('summarySection');
  elements.summaryContainer = document.getElementById('summaryContainer');
  (elements as any).toggleSummaryBtn = document.getElementById(
    'toggleSummaryBtn'
  ) as HTMLButtonElement;
  elements.summaryStatus = document.getElementById('summaryStatus');
  elements.submitComposeBtn = document.getElementById('submitComposeBtn') as HTMLButtonElement;
  elements.generatePromptBtn = document.getElementById('generatePromptBtn') as HTMLButtonElement;

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

  initializeQueryDropdown();
  applyQuerySelectionToUi(activeConnectionId);

  setupEventListeners();
  setupMessageHandling();

  updateTimerVisibility(false);

  postMessage({ type: 'webviewReady' });
  requestWorkItems();
}

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
      eventType as any,
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
