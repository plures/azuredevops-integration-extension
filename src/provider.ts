import { AzureDevOpsIntClient } from './azureClient.js';
import type { WorkItem } from './types.js';

export type PostMessageFn = (msg: any) => void;

export type ProviderLogger = {
  debug?: (message: string, meta?: any) => void;
  info?: (message: string, meta?: any) => void;
  warn?: (message: string, meta?: any) => void;
  error?: (message: string, meta?: any) => void;
};

type WorkItemTransform = (params: {
  items: WorkItem[];
  connectionId: string;
}) => Promise<WorkItem[]> | WorkItem[];

type ProviderOptions = {
  kanbanView?: boolean;
  currentFilters?: Record<string, any>;
  logger?: ProviderLogger;
  debounceMs?: number;
  transformWorkItems?: WorkItemTransform;
};

function isProviderOptions(value: any): value is ProviderOptions {
  return value && typeof value === 'object' && !Array.isArray(value);
}

const DEFAULT_QUERY = 'My Activity';

export class WorkItemsProvider {
  private connectionId: string;
  private client: AzureDevOpsIntClient | undefined;
  private postMessage: PostMessageFn;
  private logger: ProviderLogger | undefined;
  private debounceMs = 2000;
  private _workItems: WorkItem[] = [];
  private _selectedWorkItem: WorkItem | undefined;
  private _kanbanView = false;
  private _currentFilters: Record<string, any> = {};
  private _refreshInFlight = false;
  private _lastRefreshTs = 0;
  private _workItemTypes: string[] = [];
  private _currentQuery: string = DEFAULT_QUERY;
  private transformWorkItemsFn: WorkItemTransform | undefined;

  constructor(
    connectionOrClient: string | AzureDevOpsIntClient,
    clientOrPostMessage: AzureDevOpsIntClient | PostMessageFn,
    postMessageOrOptions?: PostMessageFn | ProviderOptions,
    maybeOptions?: ProviderOptions
  ) {
    if (typeof connectionOrClient === 'string') {
      this.connectionId = connectionOrClient;
      this.client = clientOrPostMessage as AzureDevOpsIntClient;
      this.postMessage =
        (typeof postMessageOrOptions === 'function' ? postMessageOrOptions : undefined) ||
        (() => {});
      this.applyOptions(maybeOptions ?? {});
    } else {
      // Legacy signature: (client, postMessage, options)
      this.connectionId = 'default';
      this.client = connectionOrClient;
      this.postMessage =
        (typeof clientOrPostMessage === 'function' ? clientOrPostMessage : undefined) || (() => {});
      this.applyOptions(isProviderOptions(postMessageOrOptions) ? postMessageOrOptions : {});
    }
  }

  private applyOptions(options: ProviderOptions) {
    this._kanbanView = options.kanbanView ?? this._kanbanView;
    this._currentFilters = options.currentFilters ?? this._currentFilters;
    this.logger = options.logger ?? this.logger;
    if (typeof options.debounceMs === 'number' && options.debounceMs >= 0) {
      this.debounceMs = options.debounceMs;
    }
    this.transformWorkItemsFn = options.transformWorkItems ?? this.transformWorkItemsFn;
  }

  updateClient(nextClient: AzureDevOpsIntClient | undefined) {
    this.client = nextClient;
    this._workItemTypes = [];
  }

  setPostMessage(nextPostMessage: PostMessageFn) {
    this.postMessage = nextPostMessage || (() => {});
  }

  setLogger(nextLogger: ProviderLogger | undefined) {
    this.logger = nextLogger;
  }

  setTransformWorkItems(nextTransform: WorkItemTransform | undefined) {
    this.transformWorkItemsFn = nextTransform;
  }

  getConnectionId() {
    return this.connectionId;
  }

  async refresh(query?: string) {
    if (!this.client || typeof (this.client as any).getWorkItems !== 'function') {
      this.log('warn', 'Cannot refresh work items; client missing getWorkItems');
      return;
    }
    const now = Date.now();
    // Debounce: skip if a refresh completed less than 2000ms ago
    if (now - this._lastRefreshTs < this.debounceMs) {
      return;
    }
    if (this._refreshInFlight) {
      // Skip overlapping refresh attempts
      return;
    }
    this._refreshInFlight = true;

    // Define normalizedQuery outside try block so it's accessible in catch
    const normalizedQuery =
      typeof query === 'string' && query.trim().length > 0
        ? query.trim()
        : this._currentQuery || DEFAULT_QUERY;
    this._currentQuery = normalizedQuery;

    // Notify webview that query is starting so it can show loading state
    this._post({
      type: 'workItemsLoading',
      query: normalizedQuery,
    });

    try {
      const shouldFetchTypes =
        this._workItemTypes.length === 0 &&
        typeof (this.client as any).getWorkItemTypes === 'function';
      const typePromise: Promise<any[] | null> | null = shouldFetchTypes
        ? Promise.resolve()
            .then(() => (this.client as any).getWorkItemTypes())
            .catch((err: any) => {
              this.log('warn', 'Failed to fetch work item types', {
                connectionId: this.connectionId,
                error: err?.message || String(err),
              });
              return null;
            })
        : null;

      this.log('debug', 'refresh(): starting fetch', {
        connectionId: this.connectionId,
        query: normalizedQuery,
      });
      const fetched = await this.client.getWorkItems(normalizedQuery);
      const processed = await this._applyTransform(fetched);
      this.log('info', 'refresh(): completed fetch', {
        connectionId: this.connectionId,
        count: Array.isArray(processed) ? processed.length : 'n/a',
      });

      if (typePromise) {
        try {
          const rawTypes = await typePromise;
          if (Array.isArray(rawTypes) && rawTypes.length > 0) {
            this._mergeWorkItemTypesFromNames(this._normalizeTypeNames(rawTypes));
          }
        } catch {
          // Errors already logged in catch above; swallow here to avoid aborting refresh
        }
      }

      // Always update the work items, even if empty
      this._workItems = processed;
      this._mergeWorkItemTypesFromItems(processed);
      this._postWorkItemsLoaded();

      if (processed.length === 0) {
        this.log('debug', 'refresh(): no results for query', {
          connectionId: this.connectionId,
          query: normalizedQuery,
        });
      }
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      this.log('error', 'Failed to refresh work items', {
        connectionId: this.connectionId,
        query: normalizedQuery,
        error: errorMessage,
        stack: err?.stack,
      });

      // Show error to user in webview
      this._error(errorMessage);

      // Also log to console for Developer Tools
      console.error('[WorkItemsProvider] Refresh failed:', {
        connectionId: this.connectionId,
        query: normalizedQuery,
        error: errorMessage,
        fullError: err,
      });
    } finally {
      this._refreshInFlight = false;
      this._lastRefreshTs = Date.now();
    }
  }

  async getWorkItemById(id: number) {
    if (!this.client) return null;
    return this.client.getWorkItemById(id);
  }

  async createWorkItem(
    type: string,
    title: string,
    description?: string,
    assignedTo?: string,
    extraFields?: Record<string, unknown>
  ) {
    if (!this.client || typeof (this.client as any).createWorkItem !== 'function') {
      throw new Error('No client');
    }
    const created = await this.client.createWorkItem(
      type,
      title,
      description,
      assignedTo,
      extraFields
    );
    await this.refresh();
    return created;
  }

  async updateWorkItem(id: number, patchOps: any[]) {
    if (!this.client || typeof (this.client as any).updateWorkItem !== 'function') {
      throw new Error('No client');
    }
    const updated = await this.client.updateWorkItem(id, patchOps);
    await this.refresh();
    return updated;
  }

  async addWorkItemComment(id: number, text: string) {
    if (!this.client || typeof (this.client as any).addWorkItemComment !== 'function') {
      throw new Error('No client');
    }
    return this.client.addWorkItemComment(id, text);
  }

  async addTimeEntry(id: number, hours: number, note?: string) {
    if (!this.client || typeof (this.client as any).addTimeEntry !== 'function') {
      throw new Error('No client');
    }
    await this.client.addTimeEntry(id, hours, note);
    await this.refresh();
  }

  async search(term: string) {
    if (!this.client || typeof (this.client as any).searchWorkItems !== 'function') {
      this.log('warn', 'search() skipped; client missing searchWorkItems');
      return [];
    }
    const res = await this.client.searchWorkItems(term);
    await this.showWorkItems(res);
    return res;
  }

  async filter(filterObj: any) {
    if (!this.client || typeof (this.client as any).filterWorkItems !== 'function') {
      this.log('warn', 'filter() skipped; client missing filterWorkItems');
      return [];
    }
    const res = await this.client.filterWorkItems(filterObj);
    await this.showWorkItems(res);
    return res;
  }

  async runWIQL(wiql: string) {
    if (!this.client || typeof (this.client as any).runWIQL !== 'function') {
      this.log('warn', 'runWIQL() skipped; client missing runWIQL');
      return [];
    }
    return this.client.runWIQL(wiql);
  }

  async showWorkItems(items: WorkItem[]) {
    if (!Array.isArray(items)) return;
    const processed = await this._applyTransform(items);
    const shouldIgnoreEmpty = processed.length === 0 && this._workItems.length > 0;
    if (!shouldIgnoreEmpty) {
      this._workItems = processed;
    }
    this._mergeWorkItemTypesFromItems(shouldIgnoreEmpty ? this._workItems : processed);
    this._postWorkItemsLoaded();
  }

  selectWorkItem(item: WorkItem) {
    this._selectedWorkItem = item;
    this._post({ type: 'workItemSelected', workItem: item });
  }

  getSelectedWorkItem() {
    return this._selectedWorkItem;
  }
  getWorkItems() {
    return [...this._workItems];
  }

  dispose() {
    this._workItems = [];
    this._selectedWorkItem = undefined;
    this._currentFilters = {};
    this._workItemTypes = [];
  }

  private _postWorkItemsLoaded() {
    this._post({
      type: 'workItemsLoaded',
      workItems: this._workItems,
      kanbanView: this._kanbanView,
      query: this._currentQuery,
    });
    this._postWorkItemTypeOptions();
    if (Object.keys(this._currentFilters).length > 0)
      this._post({ type: 'restoreFilters', filters: this._currentFilters });
  }
  private _post(msg: any) {
    if (!this.postMessage) return;
    if (msg && typeof msg === 'object' && !Array.isArray(msg)) {
      this.postMessage({ connectionId: this.connectionId, ...msg });
    } else {
      this.postMessage(msg);
    }
  }
  private _error(message: string) {
    this._post({ type: 'workItemsError', error: message });
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any) {
    if (!this.logger) return;
    const fn = this.logger[level];
    if (typeof fn === 'function') {
      try {
        fn(message, meta);
      } catch {
        // ignore logger failures
      }
    }
  }

  getWorkItemTypeOptions() {
    return [...this._workItemTypes];
  }

  private _normalizeTypeNames(rawTypes: any[]): string[] {
    if (!Array.isArray(rawTypes)) return [];
    return rawTypes
      .map((entry: any) => {
        if (!entry) return '';
        if (typeof entry === 'string') return entry.trim();
        if (typeof entry.name === 'string') return entry.name.trim();
        if (typeof entry.text === 'string') return entry.text.trim();
        if (typeof entry.referenceName === 'string') return entry.referenceName.trim();
        return '';
      })
      .filter((name: string) => name.length > 0);
  }

  private _mergeWorkItemTypesFromNames(names: string[]) {
    if (!Array.isArray(names) || names.length === 0) return;
    const current = new Set(this._workItemTypes);
    let changed = false;
    for (const raw of names) {
      const value = typeof raw === 'string' ? raw.trim() : '';
      if (!value) continue;
      if (!current.has(value)) {
        current.add(value);
        changed = true;
      }
    }
    if (changed) {
      this._workItemTypes = Array.from(current).sort((a, b) => a.localeCompare(b));
    }
  }

  private _mergeWorkItemTypesFromItems(items: WorkItem[]) {
    if (!Array.isArray(items) || items.length === 0) return;
    const names = items
      .map((item: any) => {
        const fromFlattened = typeof item?.type === 'string' ? item.type : undefined;
        const fromFields =
          typeof item?.fields?.['System.WorkItemType'] === 'string'
            ? item.fields['System.WorkItemType']
            : undefined;
        const value = fromFlattened || fromFields;
        return typeof value === 'string' ? value.trim() : '';
      })
      .filter((name: string) => name.length > 0);
    this._mergeWorkItemTypesFromNames(names);
  }

  private _postWorkItemTypeOptions() {
    this._post({ type: 'workItemTypeOptions', types: [...this._workItemTypes] });
  }

  private async _applyTransform(items: WorkItem[]): Promise<WorkItem[]> {
    if (!Array.isArray(items)) return [];
    if (!this.transformWorkItemsFn) return [...items];
    try {
      const result = await this.transformWorkItemsFn({
        items: [...items],
        connectionId: this.connectionId,
      });
      if (Array.isArray(result)) {
        return result;
      }
    } catch (error: any) {
      this.log('warn', 'transformWorkItems failed', {
        connectionId: this.connectionId,
        error: error?.message || String(error),
      });
    }
    return [...items];
  }
}

export default WorkItemsProvider;
