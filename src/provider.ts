import { AzureDevOpsIntClient } from './azureClient.js';
import type { WorkItem } from './types.js';

export type PostMessageFn = (msg: any) => void;

export class WorkItemsProvider {
  private client: AzureDevOpsIntClient | undefined;
  private postMessage: PostMessageFn | undefined;
  private _workItems: WorkItem[] = [];
  private _selectedWorkItem: WorkItem | undefined;
  private _kanbanView = false;
  private _currentFilters: Record<string, any> = {};
  private _refreshInFlight = false;
  private _lastRefreshTs = 0;

  constructor(client: AzureDevOpsIntClient, postMessage: PostMessageFn, options: { kanbanView?: boolean; currentFilters?: Record<string, any> } = {}) {
    this.client = client;
    this.postMessage = postMessage;
    this._kanbanView = options.kanbanView ?? false;
    this._currentFilters = options.currentFilters ?? {};
  }

  async refresh(defaultQuery = 'My Work Items') {
    if (!this.client) return;
    const now = Date.now();
    // Debounce: skip if a refresh completed less than 2000ms ago
    if (now - this._lastRefreshTs < 2000) {
      return;
    }
    if (this._refreshInFlight) {
      // Skip overlapping refresh attempts
      return;
    }
    this._refreshInFlight = true;
    try {
      console.log('[azureDevOpsInt] refresh(): starting fetch for query:', defaultQuery);
      const fetched = await this.client.getWorkItems(defaultQuery);
      console.log('[azureDevOpsInt] refresh(): received', fetched.length, 'work items');
      
      // Always update the work items, even if empty
      this._workItems = fetched;
      this._postWorkItemsLoaded();
      
      if (fetched.length === 0) {
        console.log('[azureDevOpsInt] refresh(): No work items found for query:', defaultQuery);
      }
    } catch (err: any) {
      console.error('[azureDevOpsInt] Failed to refresh work items:', err);
      this._error(err.message || 'Failed to load work items');
    } finally {
      this._refreshInFlight = false;
      this._lastRefreshTs = Date.now();
    }
  }

  async getWorkItemById(id: number) {
    if (!this.client) return null;
    return this.client.getWorkItemById(id);
  }

  async createWorkItem(type: string, title: string, description?: string, assignedTo?: string) {
    if (!this.client) throw new Error('No client');
    const created = await this.client.createWorkItem(type, title, description, assignedTo);
    await this.refresh();
    return created;
  }

  async updateWorkItem(id: number, patchOps: any[]) {
    if (!this.client) throw new Error('No client');
    const updated = await this.client.updateWorkItem(id, patchOps);
    await this.refresh();
    return updated;
  }

  async addWorkItemComment(id: number, text: string) {
    if (!this.client) throw new Error('No client');
    return this.client.addWorkItemComment(id, text);
  }

  async addTimeEntry(id: number, hours: number, note?: string) {
    if (!this.client) throw new Error('No client');
    await this.client.addTimeEntry(id, hours, note);
    await this.refresh();
  }

  async search(term: string) {
    if (!this.client) return [];
    const res = await this.client.searchWorkItems(term);
    this.showWorkItems(res);
    return res;
  }

  async filter(filterObj: any) {
    if (!this.client) return [];
    const res = await this.client.filterWorkItems(filterObj);
    this.showWorkItems(res);
    return res;
  }

  async runWIQL(wiql: string) {
    if (!this.client) return [];
    return this.client.runWIQL(wiql);
  }

  showWorkItems(items: WorkItem[]) {
    if (!Array.isArray(items)) return;
    if (items.length === 0 && this._workItems.length > 0) {
      // ignore empty
    } else {
      this._workItems = items;
    }
    this._postWorkItemsLoaded();
  }

  selectWorkItem(item: WorkItem) {
    this._selectedWorkItem = item;
    this._post({ type: 'workItemSelected', workItem: item });
  }

  getSelectedWorkItem() { return this._selectedWorkItem; }
  getWorkItems() { return [...this._workItems]; }

  dispose() {
    this._workItems = [];
    this._selectedWorkItem = undefined;
    this._currentFilters = {};
  }

  private _postWorkItemsLoaded() {
    this._post({ type: 'workItemsLoaded', workItems: this._workItems, kanbanView: this._kanbanView });
    if (Object.keys(this._currentFilters).length > 0) this._post({ type: 'restoreFilters', filters: this._currentFilters });
  }
  private _post(msg: any) { this.postMessage && this.postMessage(msg); }
  private _error(message: string) { this._post({ type: 'error', message }); }
}

export default WorkItemsProvider;
