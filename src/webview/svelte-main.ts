/*
  Svelte webview entry:
  - Bridges VS Code messaging
  - Mounts App.svelte banner
  - Acknowledges self-test
  - Requests work items on boot
*/
// @ts-ignore - handled by esbuild svelte plugin
import App from './App.svelte';
import { addToast } from './toastStore.js';

type AuthMethod = 'pat' | 'entra';

type AuthReminder = {
  connectionId: string;
  label: string;
  message: string;
  detail?: string;
  reason?: string;
  authMethod?: AuthMethod;
};

declare global {
  interface Window {
    vscode?: any;
    acquireVsCodeApi?: () => any;
  }
}

// Acquire VS Code API
const vscode = (() => {
  try {
    return (window as any).vscode || (window as any).acquireVsCodeApi?.();
  } catch (e) {
    console.error('[svelte-main] Failed to acquire VS Code API', e);
    return null;
  }
})();

function postMessage(msg: any) {
  try {
    if (vscode && typeof (vscode as any).postMessage === 'function') {
      (vscode as any).postMessage(msg);
      return;
    }
    if ((window as any).vscode && typeof (window as any).vscode.postMessage === 'function') {
      (window as any).vscode.postMessage(msg);
      return;
    }
  } catch (err) {
    console.error('[svelte-main] postMessage error', err, msg);
  }
}

// Mount Svelte app
let app: App | null = null as any;
let workItemCount = 0;
let lastWorkItems: any[] = [];
let timerActive = false;
let timerRunning = false;
let activeId: number = 0;
let activeTitle = '';
let elapsedSeconds: number = 0;
let timerElapsedLabel: string = '';
let itemsForView: any[] = [];
let kanbanView = false;
let loading = false; // Don't show loading until a query actually starts
let initializing = true; // True until first message from extension
let errorMsg: string = '';
let filterText = '';
let typeFilter = '';
let stateFilter: string = 'all';
let sortKey: string = 'updated-desc';
let normalizedQuery = '';
let selectedQuery = 'My Activity';
let queryDescription = '';
// Selection tracking for bulk operations
let selectedWorkItemIds = new Set<number>();
// Track optimistic moves so we can revert on failure
const pendingMoves = new Map<number, { prevState: string }>();
// Available normalized states (for filter dropdown)
let stateOptions: string[] = [];
let typeOptions: string[] = [];
const typeOptionHints = new Set<string>();
let searchHaystackCache = new WeakMap<any, string>();
let summaryDraft = '';
let summaryStatus = '';
let summaryProvider: 'builtin' | 'openai' = 'builtin';
let summaryBusy = false;
let summaryWorkItemId: number | null = null;
let _summaryTargetTitle = '';
let summaryBusyTimer: ReturnType<typeof setTimeout> | undefined;
let summaryStatusTimer: ReturnType<typeof setTimeout> | undefined;

// Store timer stop data for submission
let _timerStopData: any = null;
let _timerConnectionInfo: any = null;

const authReminderMap = new Map<string, AuthReminder>();
let authReminders: AuthReminder[] = [];

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
  { value: 'All Active', label: 'All Active', description: 'All active work items in the project' },
  {
    value: 'Recently Updated',
    label: 'Recently Updated',
    description: 'Work items updated in the last 14 days',
  },
  { value: 'Following', label: 'Following', description: "Work items I'm following" },
  { value: 'Mentioned', label: 'Mentioned', description: "Work items where I've been mentioned" },
];

// Connections state
let connections: Array<{
  id: string;
  label: string;
  organization: string;
  project: string;
  baseUrl?: string; // For on-premises detection
  hasIdentityName?: boolean; // Flag indicating if identity is configured
}> = [];
let activeConnectionId: string | undefined;

// Per-connection state storage
type ConnectionState = {
  filterText: string;
  typeFilter: string;
  stateFilter: string;
  sortKey: string;
  selectedQuery: string;
  kanbanView: boolean;
};

const connectionStateMap = new Map<string, ConnectionState>();

function getDefaultConnectionState(): ConnectionState {
  return {
    filterText: '',
    typeFilter: '',
    stateFilter: 'all',
    sortKey: 'updated-desc',
    selectedQuery: 'My Activity',
    kanbanView: false,
  };
}

function saveConnectionState(connectionId: string) {
  if (!connectionId) return;
  connectionStateMap.set(connectionId, {
    filterText,
    typeFilter,
    stateFilter,
    sortKey,
    selectedQuery,
    kanbanView,
  });
  // Persist to localStorage
  try {
    localStorage.setItem(
      `azuredevops.connectionState.${connectionId}`,
      JSON.stringify(connectionStateMap.get(connectionId))
    );
  } catch (e) {
    console.warn('[svelte-main] Failed to persist connection state', e);
  }
}

function loadConnectionState(connectionId: string) {
  if (!connectionId) return getDefaultConnectionState();

  // Check in-memory cache first
  let state = connectionStateMap.get(connectionId);
  if (state) return state;

  // Try to load from localStorage
  try {
    const stored = localStorage.getItem(`azuredevops.connectionState.${connectionId}`);
    if (stored) {
      state = JSON.parse(stored) as ConnectionState;
      connectionStateMap.set(connectionId, state);
      return state;
    }
  } catch (e) {
    console.warn('[svelte-main] Failed to load connection state from localStorage', e);
  }

  // Return defaults
  const defaultState = getDefaultConnectionState();
  connectionStateMap.set(connectionId, defaultState);
  return defaultState;
}

function applyConnectionState(connectionId: string) {
  const state = loadConnectionState(connectionId);
  filterText = state.filterText;
  typeFilter = state.typeFilter;
  stateFilter = state.stateFilter;
  sortKey = state.sortKey;
  selectedQuery = state.selectedQuery;
  kanbanView = state.kanbanView;

  // Update query description
  const queryOption = queryOptions.find((option) => option.value === selectedQuery);
  queryDescription = queryOption?.description || '';
}

// Initialize kanbanView from persisted webview state if available
try {
  const st =
    vscode && typeof (vscode as any).getState === 'function' ? (vscode as any).getState() : null;
  if (st && typeof st.kanbanView === 'boolean') kanbanView = !!st.kanbanView;
  if (st && typeof st.typeFilter === 'string') typeFilter = st.typeFilter;
  // Don't restore summaryWorkItemId on initialization - only show summary when explicitly triggered
  // if (st && typeof st.summaryWorkItemId === 'number') {
  //   summaryWorkItemId = st.summaryWorkItemId || null;
  // }
  // Don't restore summaryWorkItemId on initialization - only show summary when explicitly triggered
  // if (st && typeof st.summaryWorkItemId === 'number') {
  //   summaryWorkItemId = st.summaryWorkItemId || null;
  // }
} catch (e) {
  console.warn('[svelte-main] Unable to read persisted state', e);
}

function getAppProps() {
  return {
    workItemCount,
    subtitle: '',
    hasItems: itemsForView.length > 0,
    timerActive,
    timerRunning,
    timerElapsedLabel,
    activeId,
    activeTitle,
    items: itemsForView,
    kanbanView,
    loading,
    initializing,
    errorMsg,
    filterText,
    typeFilter,
    stateFilter,
    sortKey,
    availableStates: stateOptions,
    availableTypes: typeOptions,
    selectedQuery,
    queryDescription,
    summaryDraft,
    summaryStatus,
    summaryProvider,
    summaryBusy,
    summaryTargetId: summaryWorkItemId ?? 0,
    summaryWorkItemId: summaryWorkItemId ?? 0,
    connections,
    activeConnectionId,
    selectedItems: selectedWorkItemIds,
    authReminders,
  };
}

function syncApp() {
  ensureApp();
  (app as any).$set(getAppProps());
}

function persistViewState(extra?: Record<string, unknown>) {
  // Save current connection state if we have an active connection
  if (activeConnectionId) {
    saveConnectionState(activeConnectionId);
  }

  // Also save to global state for backward compatibility
  try {
    if (!vscode || typeof (vscode as any).setState !== 'function') return;
    const prev =
      (typeof (vscode as any).getState === 'function' && (vscode as any).getState()) || {};
    (vscode as any).setState({
      ...prev,
      kanbanView,
      filterText,
      typeFilter,
      stateFilter,
      sortKey,
      summaryWorkItemId,
      activeConnectionId,
      ...extra,
    });
  } catch (e) {
    console.warn('[svelte-main] Unable to persist view state', e);
  }
}
function ensureApp() {
  if (app) return app;
  const root = document.createElement('div');
  root.id = 'svelte-root';
  const container = document.body || document.documentElement;
  container.insertBefore(root, container.firstChild);
  app = new App({
    target: root,
    props: getAppProps(),
  });
  // Hook up UI events
  (app as any).$on('refresh', () => {
    loading = true;
    errorMsg = '';
    syncApp();
    postMessage({ type: 'refresh' });
  });
  (app as any).$on('openFirst', () => {
    const first = (lastWorkItems || [])[0];
    if (first)
      postMessage({
        type: 'viewWorkItem',
        workItemId: Number(first.id || first.fields?.['System.Id']),
      });
    if (first) {
      const id = Number(first.id || first.fields?.['System.Id']);
      setSummaryTarget(id, { ensureOpen: true });
      syncApp();
    }
  });
  (app as any).$on('startTimer', () => {
    const first = (lastWorkItems || [])[0];
    if (first)
      postMessage({
        type: 'startTimer',
        workItemId: Number(first.id || first.fields?.['System.Id']),
      });
  });
  (app as any).$on('stopTimer', () => postMessage({ type: 'showStopTimerOptions' }));
  (app as any).$on('openActive', (ev: any) => {
    const id = ev?.detail?.id ?? activeId;
    if (id != null) {
      postMessage({ type: 'viewWorkItem', workItemId: Number(id) });
      setSummaryTarget(Number(id), { ensureOpen: true });
      syncApp();
    }
  });
  (app as any).$on('openItem', (ev: any) => {
    const id = Number(ev?.detail?.id);
    if (id) {
      postMessage({ type: 'viewWorkItem', workItemId: id });
      setSummaryTarget(id, { ensureOpen: false });
      syncApp();
    }
  });
  (app as any).$on('startItem', (ev: any) => {
    const id = Number(ev?.detail?.id);
    if (id) {
      postMessage({ type: 'startTimer', workItemId: id });
      setSummaryTarget(id, { ensureOpen: true });
      syncApp();
    }
  });
  (app as any).$on('editItem', (ev: any) => {
    const id = Number(ev?.detail?.id);
    if (id) {
      postMessage({ type: 'editWorkItemInEditor', workItemId: id });
      setSummaryTarget(id, { ensureOpen: false });
      syncApp();
    }
  });
  (app as any).$on('commentItem', (ev: any) => {
    const id = Number(ev?.detail?.id);
    if (id) {
      postMessage({ type: 'addComment', workItemId: id });
      setSummaryTarget(id, { ensureOpen: true });
      syncApp();
    }
  });
  (app as any).$on('createWorkItem', () => postMessage({ type: 'createWorkItem' }));
  (app as any).$on('cancelSummary', () => {
    summaryWorkItemId = null;
    summaryDraft = '';
    summaryStatus = '';
    persistViewState();
    syncApp();
  });
  (app as any).$on('applySummary', (ev: any) => {
    const workItemId = Number(ev?.detail?.workItemId);
    if (workItemId && summaryDraft.trim()) {
      postMessage({ type: 'addComment', workItemId, comment: summaryDraft.trim() });
      summaryWorkItemId = null;
      summaryDraft = '';
      summaryStatus = 'Comment added successfully';
      persistViewState();
      syncApp();
      // Clear status after a delay
      setTimeout(() => {
        summaryStatus = '';
        syncApp();
      }, 3000);
    }
  });
  (app as any).$on('cancelSummary', () => {
    summaryWorkItemId = null;
    summaryDraft = '';
    summaryStatus = '';
    persistViewState();
    syncApp();
  });
  (app as any).$on('applySummary', (ev: any) => {
    const workItemId = Number(ev?.detail?.workItemId);
    if (workItemId && summaryDraft.trim()) {
      postMessage({ type: 'addComment', workItemId, comment: summaryDraft.trim() });
      summaryWorkItemId = null;
      summaryDraft = '';
      summaryStatus = 'Comment added successfully';
      persistViewState();
      syncApp();
      // Clear status after a delay
      setTimeout(() => {
        summaryStatus = '';
        syncApp();
      }, 3000);
    }
  });
  (app as any).$on('toggleKanban', () => {
    kanbanView = !kanbanView;
    persistViewState();
    syncApp();
    // Send to extension for global persistence
    postMessage({
      type: 'uiPreferenceChanged',
      preferences: { kanbanView, filterText, typeFilter, stateFilter, sortKey },
    });
  });
  (app as any).$on('filtersChanged', (ev: any) => {
    filterText = String(ev?.detail?.filterText ?? filterText);
    typeFilter = String(ev?.detail?.typeFilter ?? typeFilter);
    stateFilter = String(ev?.detail?.stateFilter ?? stateFilter);
    sortKey = String(ev?.detail?.sortKey ?? sortKey);
    recomputeItemsForView();
    persistViewState();
    syncApp();
    // Send to extension for global persistence
    postMessage({
      type: 'uiPreferenceChanged',
      preferences: { kanbanView, filterText, typeFilter, stateFilter, sortKey },
    });
  });
  (app as any).$on('queryChanged', (ev: any) => {
    const { query } = ev.detail || {};
    if (query && query !== selectedQuery) {
      selectedQuery = query;
      // Update query description
      const queryOption = queryOptions.find((option) => option.value === query);
      queryDescription = queryOption?.description || '';

      // Save state for current connection
      if (activeConnectionId) {
        saveConnectionState(activeConnectionId);
      }

      // Show loading state immediately when query changes
      loading = true;
      errorMsg = '';
      syncApp();
      // Send query change to extension
      postMessage({ type: 'setQuery', query });
    }
  });
  (app as any).$on('connectionChanged', (ev: any) => {
    const { connectionId } = ev.detail || {};
    if (connectionId && connectionId !== activeConnectionId) {
      // Save current connection's state before switching
      if (activeConnectionId) {
        saveConnectionState(activeConnectionId);
      }

      // Apply the new connection's state
      applyConnectionState(connectionId);

      loading = true;
      errorMsg = '';
      syncApp();
      // Send connection change to extension
      postMessage({ type: 'switchConnection', connectionId });
    }
  });
  (app as any).$on('selectionChanged', (ev: any) => {
    const { selectedIds } = ev.detail || {};
    if (Array.isArray(selectedIds)) {
      selectedWorkItemIds = new Set(selectedIds.map((id: any) => Number(id)));
    }
  });
  (app as any).$on('bulkAssign', () => {
    postMessage({ type: 'bulkAssign' });
  });
  (app as any).$on('bulkMove', () => {
    postMessage({ type: 'bulkMove' });
  });
  (app as any).$on('bulkAddTags', () => {
    postMessage({ type: 'bulkAddTags' });
  });
  (app as any).$on('bulkDelete', () => {
    postMessage({ type: 'bulkDelete' });
  });
  (app as any).$on('moveItem', (ev: any) => {
    const id = Number(ev?.detail?.id);
    const target = String(ev?.detail?.target || '');
    if (!id || !target) return;
    // optimistic update: change state field and re-group
    const found = (lastWorkItems || []).find((w: any) => Number(w.id) === id);
    if (found) {
      if (!found.fields) found.fields = {};
      // map target column key back to a friendly label for immediate UI; server will apply real state
      const mapping: any = {
        new: 'To Do',
        active: 'Active',
        inprogress: 'In Progress',
        review: 'Review',
        resolved: 'Resolved',
        done: 'Done',
        removed: 'Removed',
      };
      // Save previous state for potential revert
      const prevState = String(found.fields['System.State'] || '');
      pendingMoves.set(id, { prevState });
      found.fields['System.State'] = mapping[target] || 'Active';
      recomputeItemsForView();
      syncApp();
    }
    postMessage({ type: 'moveWorkItem', id, target });
  });
  const onDraftChange = (value: string) => {
    summaryDraft = value;
    if (summaryWorkItemId) saveDraftForWorkItem(summaryWorkItemId, summaryDraft);
    syncApp();
  };
  (app as any).$on('summaryDraftChanged', (ev: any) => {
    onDraftChange(String(ev?.detail?.value ?? ''));
  });
  (app as any).$on('summaryDraftBlur', (ev: any) => {
    onDraftChange(String(ev?.detail?.value ?? ''));
  });
  (app as any).$on('generateSummary', () => {
    _attemptSummaryGeneration();
  });
  (app as any).$on('stopAndApplySummary', () => {
    _attemptStopAndApply();
  });
  (app as any).$on('authReminderAction', (ev: any) => {
    const connectionId =
      typeof ev?.detail?.connectionId === 'string' ? ev.detail.connectionId.trim() : '';
    const action = typeof ev?.detail?.action === 'string' ? ev.detail.action : '';
    if (!connectionId || !action) return;
    postMessage({ type: 'authReminderAction', connectionId, action });
    if (action === 'dismiss' || action === 'signIn') {
      if (authReminderMap.delete(connectionId)) {
        authReminders = Array.from(authReminderMap.values());
        syncApp();
      }
    }
  });
  return app;
}

function findWorkItemById(id: number) {
  const target = Number(id);
  return (lastWorkItems || []).find((w: any) => Number(w.id || w.fields?.['System.Id']) === target);
}

function getWorkItemTitle(id: number): string {
  const match = findWorkItemById(id);
  if (match) return String(match.fields?.['System.Title'] || `#${id}`);
  if (activeId === id && activeTitle) return activeTitle;
  return `Work Item #${id}`;
}

function saveDraftForWorkItem(workItemId: number, text: string) {
  try {
    localStorage.setItem(`azuredevops.draft.${workItemId}`, text || '');
  } catch (e) {
    console.warn('[svelte-main] Failed to save draft to localStorage', e);
  }
}

function loadDraftForWorkItem(workItemId: number): string | null {
  try {
    return localStorage.getItem(`azuredevops.draft.${workItemId}`);
  } catch (e) {
    console.warn('[svelte-main] Failed to load draft from localStorage', e);
    return null;
  }
}

function removeDraftForWorkItem(workItemId: number) {
  try {
    localStorage.removeItem(`azuredevops.draft.${workItemId}`);
  } catch (e) {
    console.warn('[svelte-main] Failed to remove draft from localStorage', e);
  }
}

function setSummaryTarget(
  workItemId: number,
  options: { ensureOpen?: boolean; refreshDraft?: boolean } = {}
) {
  const id = Number(workItemId);
  if (!Number.isFinite(id) || id <= 0) return;
  const changed = summaryWorkItemId !== id;

  // Only set summaryWorkItemId if ensureOpen is true
  if (options.ensureOpen && changed) {
    summaryWorkItemId = id;
    // Update the title from the work item
    const item = findWorkItemById(id);
    if (item) {
      _summaryTargetTitle = getWorkItemTitle(id);
    }
  }

  const shouldRefresh = options.refreshDraft ?? changed;
  if (shouldRefresh) {
    const persisted = loadDraftForWorkItem(id);
    if (persisted !== null) {
      summaryDraft = persisted;
    } else if (!summaryDraft || changed) {
      summaryDraft = '';
    }
  }
  if (changed || shouldRefresh) {
    if (changed || shouldRefresh) {
      persistViewState();
    }
  }
}

function setSummaryBusy(busy: boolean) {
  if (summaryBusyTimer) {
    try {
      clearTimeout(summaryBusyTimer);
    } catch {
      /* ignore */
    }
    summaryBusyTimer = undefined;
  }
  summaryBusy = busy;
  if (busy) {
    summaryBusyTimer = setTimeout(() => {
      summaryBusy = false;
      summaryBusyTimer = undefined;
      syncApp();
    }, 6000);
  }
}

function setSummaryStatus(message: string, options?: { timeout?: number }) {
  if (summaryStatusTimer) {
    try {
      clearTimeout(summaryStatusTimer);
    } catch {
      /* ignore */
    }
    summaryStatusTimer = undefined;
  }
  summaryStatus = message;
  const delay = options?.timeout ?? 0;
  if (delay > 0) {
    summaryStatusTimer = setTimeout(() => {
      summaryStatusTimer = undefined;
      summaryStatus = '';
      syncApp();
    }, delay);
  }
}

function determineSummaryTargetId(): number | null {
  if (summaryWorkItemId) return summaryWorkItemId;
  if (timerActive && activeId) return activeId;
  const first = itemsForView[0];
  if (first) return Number(first.id || first.fields?.['System.Id']);
  return null;
}

function _attemptSummaryGeneration() {
  const targetId = determineSummaryTargetId();
  if (!targetId) {
    const message = 'Select a work item or start a timer to generate a summary.';
    setSummaryStatus(message, { timeout: 3500 });
    addToast(message, { type: 'warning', timeout: 3500 });
    syncApp();
    return;
  }
  setSummaryBusy(true);
  setSummaryStatus('Generating summary…');
  syncApp();
  postMessage({
    type: 'generateCopilotPrompt',
    workItemId: targetId,
    draftSummary: summaryDraft,
  });
}

function _attemptStopAndApply() {
  // If we have stored timer data from a previous stop, use submitComposeComment instead
  if (_timerStopData && _timerConnectionInfo && summaryWorkItemId) {
    if (summaryWorkItemId) saveDraftForWorkItem(summaryWorkItemId, summaryDraft);
    setSummaryBusy(true);
    setSummaryStatus('Applying timer updates…');
    syncApp();
    postMessage({
      type: 'submitComposeComment',
      workItemId: summaryWorkItemId,
      comment: summaryDraft,
      mode: 'timerStop',
      timerData: _timerStopData,
      connectionInfo: _timerConnectionInfo,
    });
    return;
  }

  // Original logic for actively running timer
  if (!timerActive) {
    const message = 'Start a timer before applying time to the work item.';
    setSummaryStatus(message, { timeout: 3500 });
    addToast(message, { type: 'warning', timeout: 3500 });
    syncApp();
    return;
  }
  if (summaryWorkItemId) saveDraftForWorkItem(summaryWorkItemId, summaryDraft);
  setSummaryBusy(true);
  setSummaryStatus('Stopping timer and applying updates…');
  syncApp();
  postMessage({ type: 'stopAndApply', comment: summaryDraft });
}

function getWorkItemType(it: any): string {
  if (!it) return '';
  const flattened = typeof it?.type === 'string' ? it.type : undefined;
  const fromFields =
    typeof it?.fields?.['System.WorkItemType'] === 'string'
      ? it.fields['System.WorkItemType']
      : undefined;
  const value = flattened || fromFields;
  return typeof value === 'string' ? value.trim() : '';
}

function buildSearchHaystack(item: any): string {
  const parts: string[] = [];
  const seen = new WeakSet<object>();
  const maxDepth = 5;

  const push = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length > 0) parts.push(trimmed.toLowerCase());
  };

  const visit = (value: any, depth = 0) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'string') {
      push(value);
      return;
    }
    if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
      push(String(value));
      return;
    }
    if (value instanceof Date) {
      push(value.toISOString());
      return;
    }
    if (typeof value === 'symbol') {
      push(value.toString());
      return;
    }
    if (typeof value === 'object') {
      if (seen.has(value)) return;
      seen.add(value);
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

function passesFilters(it: any): boolean {
  const query = normalizedQuery;
  const stateRaw = String(it?.fields?.['System.State'] || '');
  const norm = normalizeState(stateRaw);
  if (query) {
    const haystack = getSearchHaystack(it);
    if (!haystack.includes(query)) return false;
  }
  if (typeFilter && getWorkItemType(it) !== typeFilter) return false;
  if (stateFilter && stateFilter !== 'all' && norm !== stateFilter) return false;
  return true;
}

function normalizeState(raw: any): string {
  if (!raw) return 'new';
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

function recomputeTypeOptions() {
  const combined = new Set<string>();
  (Array.isArray(lastWorkItems) ? lastWorkItems : []).forEach((item: any) => {
    const typeName = getWorkItemType(item);
    if (typeName) combined.add(typeName);
  });
  typeOptionHints.forEach((hint) => combined.add(hint));
  typeOptions = Array.from(combined).sort((a, b) => a.localeCompare(b));
  if (typeFilter && !combined.has(typeFilter)) {
    typeFilter = '';
  }
}

function recomputeItemsForView() {
  const items = Array.isArray(lastWorkItems) ? lastWorkItems : [];
  try {
    console.log(
      '[svelte-main] recomputeItemsForView: lastWorkItems.length=',
      items.length,
      'filterText=',
      filterText,
      'typeFilter=',
      typeFilter,
      'stateFilter=',
      stateFilter
    );
  } catch (err) {
    void err;
  }
  recomputeTypeOptions();
  normalizedQuery = String(filterText || '')
    .trim()
    .toLowerCase();
  const filtered = items.filter(passesFilters);
  const sorted = [...filtered].sort((a: any, b: any) => {
    switch (sortKey) {
      case 'id-asc':
        return Number(a.id) - Number(b.id);
      case 'id-desc':
        return Number(b.id) - Number(a.id);
      case 'title-asc': {
        const at = String(a.fields?.['System.Title'] || '').toLowerCase();
        const bt = String(b.fields?.['System.Title'] || '').toLowerCase();
        return at.localeCompare(bt);
      }
      case 'updated-desc':
      default: {
        const ad = Date.parse(
          a.fields?.['System.ChangedDate'] || a.fields?.['System.UpdatedDate'] || ''
        );
        const bd = Date.parse(
          b.fields?.['System.ChangedDate'] || b.fields?.['System.UpdatedDate'] || ''
        );
        return (isNaN(bd) ? 0 : bd) - (isNaN(ad) ? 0 : ad);
      }
    }
  });
  itemsForView = sorted;
  workItemCount = itemsForView.length;
  // Recompute state options (distinct normalized states actually present in ALL items, not just filtered)
  const allStatesSet = new Set<string>();
  (Array.isArray(lastWorkItems) ? lastWorkItems : []).forEach((w: any) => {
    const norm = normalizeState(w?.fields?.['System.State']);
    allStatesSet.add(norm);
  });
  // Desired ordering reflects bucket order used in App.svelte
  const order = [
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
  stateOptions = order.filter((s) => allStatesSet.has(s));
}

function formatElapsedHHMM(sec: number): string {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  const h = Math.floor(s / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((s % 3600) / 60)
    .toString()
    .padStart(2, '0');
  return `${h}:${m}`;
}

function onMessage(message: any) {
  switch (message?.type) {
    case 'workItemsLoading': {
      const messageConnectionId = message?.connectionId;

      // Only show loading for the active connection
      if (messageConnectionId && messageConnectionId !== activeConnectionId) {
        console.log(
          '[svelte-main] Ignoring workItemsLoading for inactive connection:',
          messageConnectionId,
          'active:',
          activeConnectionId
        );
        break;
      }

      console.log(
        '[svelte-main] workItemsLoading - showing loading state for query:',
        message?.query
      );
      initializing = false; // We've connected to extension
      loading = true;
      errorMsg = '';
      syncApp();
      break;
    }
    case 'workItemsLoaded': {
      const items = Array.isArray(message.workItems) ? message.workItems : [];
      const messageConnectionId = message?.connectionId;

      try {
        console.log('[svelte-main] workItemsLoaded received. count=', (items || []).length);
        console.log(
          '[svelte-main] workItemsLoaded sample ids=',
          (items || []).slice(0, 5).map((i: any) => i.id || i.fields?.['System.Id'])
        );
        console.log(
          '[svelte-main] current filters before apply: filterText=',
          filterText,
          'typeFilter=',
          typeFilter,
          'stateFilter=',
          stateFilter
        );
        console.log(
          '[svelte-main] messageConnectionId=',
          messageConnectionId,
          'activeConnectionId=',
          activeConnectionId
        );
        // Additional diagnostics: if host sent zero items, log the entire message and connectionId
        if (!items || (items && items.length === 0)) {
          try {
            console.warn('[svelte-main] workItemsLoaded arrived with 0 items — full message:');
            console.warn(JSON.stringify(message));
            console.warn('[svelte-main] connectionId on message =', message?.connectionId);
            console.warn(
              '[svelte-main] local persisted state: typeFilter=',
              typeFilter,
              'filterText=',
              filterText,
              'stateFilter=',
              stateFilter
            );
            console.warn('[svelte-main] timestamp (ms)=', Date.now());
          } catch (err) {
            void err;
          }
        }
      } catch (err) {
        void err;
      }

      // CRITICAL FIX: Only process this message if it's for the active connection
      // or if no connection filtering is needed (legacy/initial load). This prevents
      // work items from one connection appearing when another is active.
      if (messageConnectionId && messageConnectionId !== activeConnectionId) {
        console.warn(
          '[svelte-main] Ignoring workItemsLoaded for inactive connection:',
          messageConnectionId,
          'active:',
          activeConnectionId
        );
        break;
      }

      // Process the work items - these should always be applied when they match the active connection
      searchHaystackCache = new WeakMap();
      lastWorkItems = items;
      // Only exit initializing state if we have items (cached or fresh)
      // If no items, stay in initializing until a real query fires
      if (items.length > 0) {
        initializing = false;
      }
      if (typeof message.kanbanView === 'boolean') {
        kanbanView = message.kanbanView;
      }

      // Apply saved UI state for this connection (filters, sort, query selection)
      // but DON'T clear the work items we just received
      if (messageConnectionId && messageConnectionId === activeConnectionId) {
        applyConnectionState(messageConnectionId);
      }

      recomputeItemsForView();
      workItemCount = itemsForView.length;
      loading = false;
      errorMsg = '';
      if (activeId) {
        const match = findWorkItemById(activeId);
        if (match) {
          activeTitle = String(match.fields?.['System.Title'] || `#${activeId}`);
        }
      }
      if (summaryWorkItemId) {
        if (!summaryDraft || !summaryDraft.trim()) {
          const persisted = loadDraftForWorkItem(summaryWorkItemId);
          if (persisted !== null) summaryDraft = persisted;
        }
      }
      syncApp();
      break;
    }
    case 'workItemsError': {
      initializing = false; // We've received response from extension
      loading = false;
      errorMsg = String(message?.error || 'Failed to load work items.');
      // Clear items when there's an error to avoid showing stale data
      lastWorkItems = [];
      recomputeItemsForView();
      syncApp();
      break;
    }
    case 'authReminder': {
      const connectionId =
        typeof message?.connectionId === 'string' ? message.connectionId.trim() : '';
      if (!connectionId) break;
      const labelRaw = typeof message?.connectionLabel === 'string' ? message.connectionLabel : '';
      const label =
        labelRaw && labelRaw.trim().length > 0 ? labelRaw.trim() : 'Azure DevOps connection';
      const reminderMessage =
        typeof message?.message === 'string' && message.message.trim().length > 0
          ? message.message.trim()
          : `Microsoft Entra sign-in required for ${label}.`;
      const detail =
        typeof message?.detail === 'string' && message.detail.trim().length > 0
          ? message.detail.trim()
          : undefined;
      const reason = typeof message?.reason === 'string' ? message.reason : undefined;
      const authMethod: AuthMethod | undefined =
        message?.authMethod === 'entra'
          ? 'entra'
          : message?.authMethod === 'pat'
            ? 'pat'
            : undefined;

      const wasNew = !authReminderMap.has(connectionId);
      authReminderMap.set(connectionId, {
        connectionId,
        label,
        message: reminderMessage,
        detail,
        reason,
        authMethod,
      });
      authReminders = Array.from(authReminderMap.values());
      syncApp();
      if (wasNew) {
        addToast(reminderMessage, { type: 'warning', timeout: 6000 });
      }
      break;
    }
    case 'authReminderClear': {
      const connectionId =
        typeof message?.connectionId === 'string' ? message.connectionId.trim() : '';
      if (!connectionId) break;
      if (authReminderMap.delete(connectionId)) {
        authReminders = Array.from(authReminderMap.values());
        syncApp();
      }
      break;
    }
    case 'timerUpdate': {
      const snap = message?.timer;
      const hasTimer = snap && typeof snap.workItemId !== 'undefined';
      timerActive = !!hasTimer;
      timerRunning = !!hasTimer && !snap.isPaused;
      elapsedSeconds = hasTimer ? Number(snap?.elapsedSeconds || 0) : 0;
      timerElapsedLabel = hasTimer ? formatElapsedHHMM(elapsedSeconds) : '';
      if (hasTimer) {
        const newActiveId = Number(snap.workItemId) || 0;
        activeId = newActiveId;
        activeTitle =
          snap.workItemTitle || getWorkItemTitle(activeId) || (activeId ? `#${activeId}` : '');
        const targetChanged = summaryWorkItemId !== activeId;
        setSummaryTarget(activeId, { ensureOpen: false, refreshDraft: targetChanged });
        setSummaryTarget(activeId, { ensureOpen: false, refreshDraft: targetChanged });
        if (!summaryDraft || !summaryDraft.trim()) {
          const persisted = loadDraftForWorkItem(activeId);
          if (persisted && persisted.length > 0) {
            summaryDraft = persisted;
          } else {
            const seconds = Number(snap.elapsedSeconds || 0);
            const hours = Math.max(0, seconds / 3600);
            const fallbackTitle = activeTitle || `#${activeId}`;
            summaryDraft = `Worked approximately ${hours.toFixed(
              2
            )} hours on ${fallbackTitle}. Provide a short summary of what you accomplished.`;
          }
        }
      } else {
        activeId = 0;
        activeTitle = '';
        timerRunning = false;
        elapsedSeconds = 0;
        timerElapsedLabel = '';
      }
      syncApp();
      break;
    }
    case 'showComposeComment': {
      const workItemId = typeof message.workItemId === 'number' ? message.workItemId : null;
      const mode = typeof message.mode === 'string' ? message.mode : 'addComment';

      if (mode === 'timerStop' && message.timerData && workItemId) {
        // Handle timer stop - set the work item as the summary target and populate draft
        const hours = Number(
          message.timerData.hoursDecimal || message.timerData.duration / 3600 || 0
        );
        const fallbackTitle = getWorkItemTitle(workItemId) || `#${workItemId}`;

        // Set summary target and ensure it's visible
        setSummaryTarget(workItemId, { ensureOpen: true, refreshDraft: false });

        // Set draft text if not already present
        if (!summaryDraft || !summaryDraft.trim()) {
          const persisted = loadDraftForWorkItem(workItemId);
          if (persisted && persisted.length > 0) {
            summaryDraft = persisted;
          } else {
            summaryDraft = `Worked approximately ${hours.toFixed(2)} hours on ${fallbackTitle}. Summarize the key updates you completed.`;
          }
        }

        // Store timer data for later submission
        _timerStopData = message.timerData;
        _timerConnectionInfo = message.connectionInfo;

        syncApp();

        // Show success message
        addToast(
          `Timer stopped. Review the comment and use "Stop & Apply" to apply time updates to work item #${workItemId}.`,
          { type: 'info', timeout: 5000 }
        );
      } else if (mode === 'addComment' && workItemId) {
        // Handle regular comment - just set the target
        setSummaryTarget(workItemId, { ensureOpen: true, refreshDraft: false });
        syncApp();

        addToast(`Ready to compose a comment for work item #${workItemId}.`, {
          type: 'info',
          timeout: 3000,
        });
      }
      break;
    }
    case 'composeCommentResult': {
      const workItemId = message.workItemId;
      const mode = message.mode;
      const success = message.success;
      const hours = message.hours;

      setSummaryBusy(false);

      if (!success) {
        const errorMessage =
          typeof message.error === 'string' && message.error.trim().length > 0
            ? message.error.trim()
            : `Failed to ${mode === 'timerStop' ? 'apply timer update' : 'add comment'}.`;
        setSummaryStatus(errorMessage, { timeout: 8000 });
        addToast(errorMessage, { type: 'error', timeout: 5000 });
        syncApp();
        break;
      }

      // Success case
      if (typeof workItemId === 'number') {
        try {
          removeDraftForWorkItem(workItemId);
        } catch (e) {
          console.warn('[svelte-main] Failed to remove persisted draft after compose', e);
        }
      }

      if (mode === 'timerStop') {
        // Clear stored timer data since we successfully applied it
        _timerStopData = null;
        _timerConnectionInfo = null;

        const hoursStr = typeof hours === 'number' ? hours.toFixed(2) : '0.00';
        setSummaryStatus(
          `Timer update applied: ${hoursStr} hours added to work item #${workItemId}`,
          { timeout: 5000 }
        );
        addToast(`Timer update applied: ${hoursStr} hours added to work item #${workItemId}`, {
          type: 'success',
          timeout: 4000,
        });

        // Clear the summary since the timer task is complete
        summaryWorkItemId = null;
        summaryDraft = '';
      } else {
        setSummaryStatus(`Comment added to work item #${workItemId}`, { timeout: 3000 });
        addToast(`Comment added to work item #${workItemId}`, { type: 'success', timeout: 3000 });
      }

      syncApp();
      break;
    }
    case 'moveWorkItemResult': {
      const id = Number(message.id);
      if (!id || !pendingMoves.has(id)) break;
      const pending = pendingMoves.get(id);
      pendingMoves.delete(id);
      if (!message.success) {
        const found = (lastWorkItems || []).find((w: any) => Number(w.id) === id);
        if (found && found.fields && pending) {
          found.fields['System.State'] = pending.prevState;
          searchHaystackCache.delete(found);
          recomputeItemsForView();
        }
        syncApp();
        addToast(`Move failed: ${message.error || 'Unknown error'}`, { type: 'error' });
      } else if (message.newState) {
        const found = (lastWorkItems || []).find((w: any) => Number(w.id) === id);
        if (found && found.fields) {
          found.fields['System.State'] = message.newState;
          searchHaystackCache.delete(found);
          recomputeItemsForView();
        }
        syncApp();
        if (pending && pending.prevState !== message.newState) {
          addToast(`Moved #${id} → ${message.newState}`, { type: 'success', timeout: 2500 });
        }
      }
      break;
    }
    case 'toggleKanbanView': {
      kanbanView = !kanbanView;
      persistViewState();
      syncApp();
      break;
    }
    case 'workItemTypeOptions': {
      const list = Array.isArray(message?.types) ? message.types : [];
      let changed = false;
      for (const entry of list) {
        const value = typeof entry === 'string' ? entry.trim() : '';
        if (!value) continue;
        if (!typeOptionHints.has(value)) {
          typeOptionHints.add(value);
          changed = true;
        }
      }
      if (changed) {
        recomputeItemsForView();
        syncApp();
      }
      break;
    }
    case 'uiPreferences': {
      const prefs = message?.preferences || {};
      if (typeof prefs.kanbanView === 'boolean') kanbanView = prefs.kanbanView;
      if (typeof prefs.filterText === 'string') filterText = prefs.filterText;
      if (typeof prefs.typeFilter === 'string') typeFilter = prefs.typeFilter;
      if (typeof prefs.stateFilter === 'string') stateFilter = prefs.stateFilter;
      if (typeof prefs.sortKey === 'string') sortKey = prefs.sortKey;
      recomputeItemsForView();
      syncApp();
      break;
    }
    case 'copilotPromptCopied': {
      const provider = message?.provider === 'openai' ? 'openai' : 'builtin';
      summaryProvider = provider;
      const workItemId = Number(message.workItemId || 0);
      if (workItemId) {
        setSummaryTarget(workItemId, { ensureOpen: true, refreshDraft: false });
      }
      if (provider === 'openai' && typeof message.summary === 'string' && message.summary.trim()) {
        summaryDraft = message.summary.trim();
        if (summaryWorkItemId) saveDraftForWorkItem(summaryWorkItemId, summaryDraft);
      } else if (
        provider === 'builtin' &&
        typeof message.prompt === 'string' &&
        message.prompt.trim() &&
        (!summaryDraft || !summaryDraft.trim())
      ) {
        summaryDraft = message.prompt;
      }
      setSummaryBusy(false);
      setSummaryStatus(
        provider === 'openai'
          ? 'OpenAI summary copied to clipboard.'
          : 'Copilot prompt copied to clipboard. Paste into Copilot chat to generate a summary.',
        { timeout: 3500 }
      );
      syncApp();
      break;
    }
    case 'stopAndApplyResult': {
      const id = Number(message.workItemId);
      const hours = Number(message.hours || 0);
      setSummaryBusy(false);
      if (Number.isFinite(id) && id > 0) {
        setSummaryTarget(id, { ensureOpen: true, refreshDraft: false });
      }
      summaryDraft = '';
      if (Number.isFinite(id) && id > 0) {
        removeDraftForWorkItem(id);
      }
      setSummaryStatus(`Applied ${hours.toFixed(2)} hours to work item #${id}.`, {
        timeout: 4000,
      });
      syncApp();
      break;
    }
    case 'clearFilters': {
      filterText = '';
      typeFilter = '';
      stateFilter = 'all';
      recomputeItemsForView();
      persistViewState();
      syncApp();
      addToast('Filters cleared', { type: 'info', timeout: 2000 });
      break;
    }
    case 'focusSearch': {
      // Focus the search input - handled in App.svelte
      try {
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      } catch (err) {
        console.warn('[svelte-main] Failed to focus search', err);
      }
      break;
    }
    case 'requestSelection': {
      // Extension is requesting currently selected work item IDs
      const ids = Array.from(selectedWorkItemIds);
      postMessage({ type: 'selectedWorkItems', ids });
      break;
    }
    case 'connectionsUpdate': {
      // Don't exit initializing state just because we got connections
      // Stay in initializing until we have items or a query starts
      const receivedConnections = Array.isArray(message?.connections) ? message.connections : [];
      connections = receivedConnections.map((conn: any) => ({
        id: String(conn.id || ''),
        label: String(conn.label || ''),
        organization: String(conn.organization || ''),
        project: String(conn.project || ''),
      }));
      const newActiveConnectionId = message?.activeConnectionId
        ? String(message.activeConnectionId)
        : undefined;

      // If the active connection changed, clear stale data and set loading state
      if (newActiveConnectionId && newActiveConnectionId !== activeConnectionId) {
        if (activeConnectionId) {
          saveConnectionState(activeConnectionId);
        }
        activeConnectionId = newActiveConnectionId;

        // CRITICAL FIX: Clear stale work items and show loading when switching connections
        lastWorkItems = [];
        itemsForView = [];
        workItemCount = 0;
        loading = true;
        initializing = true; // Back to initializing for new connection
        errorMsg = '';

        // CRITICAL FIX: Clear auth reminders from previous connection to prevent
        // signin cards from old connections appearing on the new connection tab
        authReminderMap.clear();
        authReminders = [];

        applyConnectionState(activeConnectionId);
      } else {
        activeConnectionId = newActiveConnectionId;
      }

      try {
        console.log('[svelte-main] connectionsUpdate received:', {
          count: connections.length,
          activeConnectionId,
          connections: connections.map((c) => ({ id: c.id, label: c.label })),
        });
      } catch (err) {
        void err;
      }
      syncApp();
      break;
    }
    case 'selfTestPing': {
      postMessage({ type: 'selfTestPong', nonce: message.nonce, signature: 'svelte-entry' });
      break;
    }
    default:
      break;
  }
}

function boot() {
  window.addEventListener('message', (ev) => onMessage(ev.data));
  // Signal readiness - extension will send initial data in response
  // Don't request getWorkItems here, as it causes a premature query before
  // connections are properly initialized. Also don't set loading=true here,
  // as we haven't actually started a query yet - just initializing.
  errorMsg = '';
  postMessage({ type: 'webviewReady' });
  ensureApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => boot());
} else {
  boot();
}
