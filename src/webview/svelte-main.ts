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

declare global {
  interface Window {
    vscode?: any;
    acquireVsCodeApi?: () => any;
  }
}

// Acquire VS Code API
const vscode = (() => {
  try {
    return (window as any).vscode || acquireVsCodeApi();
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
let loading = true;
let errorMsg: string = '';
let filterText = '';
let stateFilter: string = 'all';
let sortKey: string = 'updated-desc';
// Track optimistic moves so we can revert on failure
const pendingMoves = new Map<number, { prevState: string }>();
// Initialize kanbanView from persisted webview state if available
try {
  const st =
    vscode && typeof (vscode as any).getState === 'function' ? (vscode as any).getState() : null;
  if (st && typeof st.kanbanView === 'boolean') kanbanView = !!st.kanbanView;
} catch (e) {
  console.warn('[svelte-main] Unable to read persisted state', e);
}
function ensureApp() {
  if (app) return app;
  const root = document.createElement('div');
  root.id = 'svelte-root';
  const container = document.body || document.documentElement;
  container.insertBefore(root, container.firstChild);
  app = new App({
    target: root,
    props: {
      workItemCount,
      subtitle: 'Svelte flag on',
      hasItems: (lastWorkItems || []).length > 0,
      timerActive,
      timerRunning,
      timerElapsedLabel,
      activeId,
      activeTitle,
      items: itemsForView,
      kanbanView,
      loading,
      errorMsg,
      filterText,
      stateFilter,
      sortKey,
    },
  });
  // Hook up UI events
  (app as any).$on('refresh', () => {
    loading = true;
    errorMsg = '';
    (app as any).$set({ loading, errorMsg });
    postMessage({ type: 'refresh' });
  });
  (app as any).$on('openFirst', () => {
    const first = (lastWorkItems || [])[0];
    if (first)
      postMessage({
        type: 'viewWorkItem',
        workItemId: Number(first.id || first.fields?.['System.Id']),
      });
  });
  (app as any).$on('startTimer', () => {
    const first = (lastWorkItems || [])[0];
    if (first)
      postMessage({
        type: 'startTimer',
        workItemId: Number(first.id || first.fields?.['System.Id']),
      });
  });
  (app as any).$on('stopTimer', () => postMessage({ type: 'stopTimer' }));
  (app as any).$on('openActive', (ev: any) => {
    const id = ev?.detail?.id ?? activeId;
    if (id != null) postMessage({ type: 'viewWorkItem', workItemId: Number(id) });
  });
  (app as any).$on('openItem', (ev: any) => {
    const id = Number(ev?.detail?.id);
    if (id) postMessage({ type: 'viewWorkItem', workItemId: id });
  });
  (app as any).$on('startItem', (ev: any) => {
    const id = Number(ev?.detail?.id);
    if (id) postMessage({ type: 'startTimer', workItemId: id });
  });
  (app as any).$on('editItem', (ev: any) => {
    const id = Number(ev?.detail?.id);
    if (id) postMessage({ type: 'editWorkItemInEditor', workItemId: id });
  });
  (app as any).$on('commentItem', (ev: any) => {
    const id = Number(ev?.detail?.id);
    if (id) postMessage({ type: 'addComment', workItemId: id });
  });
  (app as any).$on('createWorkItem', () => postMessage({ type: 'createWorkItem' }));
  (app as any).$on('toggleKanban', () => {
    kanbanView = !kanbanView;
    (app as any).$set({ kanbanView });
    const prefs = { kanbanView, filterText, stateFilter, sortKey };
    try {
      if (vscode && typeof (vscode as any).setState === 'function') {
        const prev =
          (typeof (vscode as any).getState === 'function' && (vscode as any).getState()) || {};
        (vscode as any).setState({ ...prev, ...prefs });
      }
    } catch (e) {
      console.warn('[svelte-main] Unable to persist state', e);
    }
    // Send to extension for global persistence
    postMessage({ type: 'uiPreferenceChanged', preferences: prefs });
  });
  (app as any).$on('filtersChanged', (ev: any) => {
    filterText = String(ev?.detail?.filterText ?? filterText);
    stateFilter = String(ev?.detail?.stateFilter ?? stateFilter);
    sortKey = String(ev?.detail?.sortKey ?? sortKey);
    recomputeItemsForView();
    (app as any).$set({
      filterText,
      stateFilter,
      sortKey,
      items: itemsForView,
      workItemCount: itemsForView.length,
      hasItems: itemsForView.length > 0,
    });
    const prefs = { kanbanView, filterText, stateFilter, sortKey };
    try {
      if (vscode && typeof (vscode as any).setState === 'function') {
        const prev =
          (typeof (vscode as any).getState === 'function' && (vscode as any).getState()) || {};
        (vscode as any).setState({ ...prev, ...prefs });
      }
    } catch (e) {
      console.warn('[svelte-main] Unable to persist filters', e);
    }
    // Send to extension for global persistence
    postMessage({ type: 'uiPreferenceChanged', preferences: prefs });
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
        todo: 'To Do',
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
      (app as any).$set({ items: itemsForView });
    }
    postMessage({ type: 'moveWorkItem', id, target });
  });
  return app;
}

function passesFilters(it: any): boolean {
  const title = String(it?.fields?.['System.Title'] || '').toLowerCase();
  const stateRaw = String(it?.fields?.['System.State'] || '');
  const norm = normalizeState(stateRaw);
  if (filterText && !title.includes(String(filterText).toLowerCase())) return false;
  if (stateFilter && stateFilter !== 'all' && norm !== stateFilter) return false;
  return true;
}

function normalizeState(raw: any): string {
  if (!raw) return 'todo';
  const s = String(raw).toLowerCase().trim().replace(/\s+/g, '-');
  if (s === 'new' || s === 'to-do' || s === 'todo') return 'todo';
  if (s === 'active') return 'active';
  if (s === 'in-progress' || s === 'inprogress' || s === 'doing') return 'inprogress';
  if (s === 'review' || s === 'code-review' || s === 'testing') return 'review';
  if (s === 'resolved') return 'resolved';
  if (s === 'done' || s === 'closed') return 'done';
  if (s === 'removed') return 'removed';
  return 'todo';
}

function recomputeItemsForView() {
  const items = Array.isArray(lastWorkItems) ? lastWorkItems : [];
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
    case 'workItemsLoaded': {
      const items = Array.isArray(message.workItems) ? message.workItems : [];
      lastWorkItems = items;
      recomputeItemsForView();
      workItemCount = itemsForView.length;
      loading = false;
      errorMsg = '';
      // If we know an activeId from timer, try to hydrate a title
      if (activeId != null) {
        const match = items.find(
          (w: any) => Number(w.id || w.fields?.['System.Id']) === Number(activeId)
        );
        if (match) activeTitle = String(match.fields?.['System.Title'] || `#${activeId}`);
      }
      ensureApp();
      (app as any).$set({
        workItemCount,
        hasItems: itemsForView.length > 0,
        activeId,
        activeTitle,
        timerElapsedLabel,
        items: itemsForView,
        kanbanView,
        loading,
        errorMsg,
        filterText,
        stateFilter,
        sortKey,
      });
      break;
    }
    case 'workItemsError': {
      loading = false;
      errorMsg = String(message?.error || 'Failed to load work items.');
      ensureApp();
      (app as any).$set({ loading, errorMsg });
      break;
    }
    case 'toggleKanbanView': {
      kanbanView = !kanbanView;
      ensureApp();
      (app as any).$set({ kanbanView });
      try {
        if (vscode && typeof (vscode as any).setState === 'function') {
          const prev =
            (typeof (vscode as any).getState === 'function' && (vscode as any).getState()) || {};
          (vscode as any).setState({ ...prev, kanbanView });
        }
      } catch (e) {
        console.warn('[svelte-main] Unable to persist state', e);
      }
      break;
    }
    case 'timerUpdate': {
      const snap = message?.timer || {};
      timerActive = !!snap && typeof snap.workItemId !== 'undefined';
      timerRunning = !!snap && !snap.isPaused;
      elapsedSeconds = Number(snap?.elapsedSeconds || 0);
      timerElapsedLabel = formatElapsedHHMM(elapsedSeconds);
      if (timerActive) {
        activeId = Number(snap.workItemId) || 0;
        // Try to find title from cached items; fallback to empty
        const match = (lastWorkItems || []).find(
          (w: any) => Number(w.id || w.fields?.['System.Id']) === Number(activeId)
        );
        activeTitle = match ? String(match.fields?.['System.Title'] || `#${activeId}`) : '';
      } else {
        activeId = 0;
        activeTitle = '';
        elapsedSeconds = 0;
        timerElapsedLabel = '';
      }
      ensureApp();
      (app as any).$set({ timerActive, timerRunning, timerElapsedLabel, activeId, activeTitle });
      break;
    }
    case 'moveWorkItemResult': {
      const id = Number(message.id);
      if (!id || !pendingMoves.has(id)) break;
      const pending = pendingMoves.get(id);
      pendingMoves.delete(id);
      if (!message.success) {
        // Revert the optimistic update
        const found = (lastWorkItems || []).find((w: any) => Number(w.id) === id);
        if (found && found.fields && pending) {
          found.fields['System.State'] = pending.prevState;
          recomputeItemsForView();
          ensureApp();
          (app as any).$set({ items: itemsForView });
        }
        addToast(`Move failed: ${message.error || 'Unknown error'}`, { type: 'error' });
      } else if (message.newState) {
        // Ensure UI reflects server-confirmed canonical state (may differ from mapping label)
        const found = (lastWorkItems || []).find((w: any) => Number(w.id) === id);
        if (found && found.fields) {
          found.fields['System.State'] = message.newState;
          recomputeItemsForView();
          ensureApp();
          (app as any).$set({ items: itemsForView });
        }
        // Optional success toast only if state actually changed textually
        if (pending && pending.prevState !== message.newState) {
          addToast(`Moved #${id} → ${message.newState}`, { type: 'success', timeout: 2500 });
        }
      }
      break;
    }
    case 'uiPreferences': {
      // Merge incoming global preferences with local state
      const prefs = message?.preferences || {};
      if (typeof prefs.kanbanView === 'boolean') kanbanView = prefs.kanbanView;
      if (typeof prefs.filterText === 'string') filterText = prefs.filterText;
      if (typeof prefs.stateFilter === 'string') stateFilter = prefs.stateFilter;
      if (typeof prefs.sortKey === 'string') sortKey = prefs.sortKey;
      recomputeItemsForView();
      ensureApp();
      (app as any).$set({
        kanbanView,
        filterText,
        stateFilter,
        sortKey,
        items: itemsForView,
        workItemCount: itemsForView.length,
        hasItems: itemsForView.length > 0,
      });
      break;
    }
    case 'selfTestPing': {
      postMessage({ type: 'selfTestPong', nonce: message.nonce, signature: 'svelte-entry' });
      break;
    }
    default:
      // ignore
      break;
  }
}

function boot() {
  window.addEventListener('message', (ev) => onMessage(ev.data));
  // Signal readiness and request initial data
  loading = true;
  errorMsg = '';
  postMessage({ type: 'webviewReady' });
  postMessage({ type: 'getWorkItems' });
  ensureApp();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => boot());
} else {
  boot();
}
