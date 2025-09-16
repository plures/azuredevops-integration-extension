import axios, { AxiosInstance } from 'axios';
import { WorkItem } from './types';
import { RateLimiter } from './rateLimiter.js';

interface RateConfig { ratePerSecond?: number; burst?: number }

export class AzureDevOpsIntClient {
  public organization: string;
  public project: string;
  public encodedOrganization: string;
  public encodedProject: string;
  public axios: AxiosInstance;
  private _repoCache: any[] | undefined;
  private pat: string;
  private limiter: RateLimiter;

  constructor(organization: string, project: string, pat: string, rateCfg: RateConfig = {}) {
    this.organization = organization;
    this.project = project;
    this.pat = pat;
    this.encodedOrganization = encodeURIComponent(organization);
    this.encodedProject = encodeURIComponent(project);
    const baseURL = `https://dev.azure.com/${organization}/${project}/_apis`;
    this.axios = axios.create({
      baseURL,
      timeout: 30000, // 30s network timeout for slow Azure DevOps APIs
      headers: {
        'Content-Type': 'application/json'
      }
    });
  // Rate limiter: allow configurable burst & sustained rate (defaults)
  const rps = Math.max(1, Math.min(50, rateCfg.ratePerSecond ?? 5));
  const burst = Math.max(1, Math.min(100, rateCfg.burst ?? 10));
  this.limiter = new RateLimiter(rps, burst);

    // Attach PAT auth on each request (kept if already implemented elsewhere)
    this.axios.interceptors.request.use(async cfg => {
      await this.limiter.acquire();
      (cfg.headers ||= {} as any)['Authorization'] = `Basic ${Buffer.from(':'+ this.pat).toString('base64')}`;
      (cfg as any).__start = Date.now();
      // Attach attempt counter for retries
      (cfg as any).__attempt = ((cfg as any).__attempt || 0) + 1;
      console.log('[azureDevOpsInt][HTTP] →', cfg.method?.toUpperCase(), cfg.url, 'attempt', (cfg as any).__attempt);
      return cfg;
    });

    this.axios.interceptors.response.use(
      resp => {
        const ms = Date.now() - (resp.config as any).__start;
        console.log('[azureDevOpsInt][HTTP] ←', resp.config.method?.toUpperCase(), resp.config.url, resp.status, `${ms}ms`);
        return resp;
      },
      err => {
        const cfg = err.config || {};
        const ms = cfg.__start ? (Date.now() - cfg.__start) : 'n/a';
        if (err.response) {
          const { status, statusText, data } = err.response;
          console.error('[azureDevOpsInt][HTTP][ERR]', cfg.method?.toUpperCase(), cfg.url, status, statusText, `${ms}ms`);
          if (data) {
            let snippet: string;
            try {
              snippet = typeof data === 'string' ? data.slice(0, 500) : JSON.stringify(data).slice(0, 500);
            } catch {
              snippet = '[unserializable response data]';
            }
            console.error('[azureDevOpsInt][HTTP][ERR] body:', snippet);
          }
        } else if (err.code === 'ECONNABORTED') {
          console.error('[azureDevOpsInt][HTTP][TIMEOUT]', cfg.method?.toUpperCase(), cfg.url, `${ms}ms`);
        } else {
          console.error('[azureDevOpsInt][HTTP][NETERR]', err.message);
        }
        // Retry logic: 429 or >=500 (excluding 501/505 uncommon) with exponential backoff
        const status = err.response?.status;
        const attempt = (cfg as any).__attempt || 1;
        const maxAttempts = 4;
        if (status && (status === 429 || (status >= 500 && status < 600)) && attempt < maxAttempts) {
          const backoffBase = 250 * Math.pow(2, attempt - 1);
            const jitter = Math.random() * backoffBase * 0.3;
            const delay = Math.min(4000, backoffBase + jitter);
            console.warn('[azureDevOpsInt][HTTP][RETRY]', cfg.url, 'status', status, 'retryInMs', Math.round(delay), 'attempt', attempt + 1);
            return new Promise((resolve) => setTimeout(resolve, delay))
              .then(() => this.axios(cfg));
        }
        return Promise.reject(err);
      }
    );
  }

  buildFullUrl(path: string) {
    return `https://dev.azure.com/${this.encodedOrganization}/${this.encodedProject}/_apis${path}`;
  }
  getBrowserUrl(path: string) {
    return `https://dev.azure.com/${this.encodedOrganization}/${this.encodedProject}${path}`;
  }

  buildWIQL(queryNameOrText: string) {
    const fields = `[System.Id], [System.Title], [System.State], [System.WorkItemType], 
                           [System.AssignedTo], [System.CreatedDate], [System.ChangedDate],
                           [System.IterationPath], [System.Tags], [Microsoft.VSTS.Common.Priority]`;
    const selectedSprint: string | null = null; // placeholder; inject externally if needed
    const sprintClause = selectedSprint ? `AND [System.IterationPath] = '${selectedSprint}'` : '';
    switch (queryNameOrText) {
      case 'My Work Items':
        return `SELECT ${fields} FROM WorkItems \
                        WHERE [System.AssignedTo] = @Me \
                        AND [System.State] <> 'Closed' \
                        AND [System.State] <> 'Removed'\n                        ${sprintClause}\n                        ORDER BY [System.ChangedDate] DESC`;
      case 'Current Sprint':
        return selectedSprint
          ? `SELECT ${fields} FROM WorkItems \
                            WHERE [System.IterationPath] = '${selectedSprint}'\n                            AND [System.State] <> 'Closed' \
                            AND [System.State] <> 'Removed'\n                            ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.Id] ASC`
          : `SELECT ${fields} FROM WorkItems \
                        WHERE [System.IterationPath] UNDER @CurrentIteration \n                        AND [System.State] <> 'Closed' \n                        AND [System.State] <> 'Removed'\n                        ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.Id] ASC`;
      case 'All Active':
        return `SELECT ${fields} FROM WorkItems \
                        WHERE [System.State] <> 'Closed' \n                        AND [System.State] <> 'Removed'\n                        AND [System.State] <> 'Done'\n                        ${sprintClause}\n                        ORDER BY [System.ChangedDate] DESC`;
      case 'Recently Updated':
        return `SELECT ${fields} FROM WorkItems \n                        WHERE [System.ChangedDate] >= @Today - 7\n                        ${sprintClause}\n                        ORDER BY [System.ChangedDate] DESC`;
      default:
        return queryNameOrText;
    }
  }

  async getWorkItems(query: string): Promise<WorkItem[]> {
    try {
      const wiql = this.buildWIQL(query);
      console.log('[azureDevOpsInt][GETWI] Fetching work items with query:', wiql);
      console.log('[azureDevOpsInt][GETWI] API Base URL:', this.axios.defaults.baseURL);

      // First, try the WIQL query
      const wiqlResp = await this.axios.post('/wit/wiql?api-version=7.0', { query: wiql });
      console.log('[azureDevOpsInt][GETWI] WIQL response status:', wiqlResp.status);

      const refs = wiqlResp.data?.workItems || [];
      console.log(`[azureDevOpsInt][GETWI] WIQL reference count: ${refs.length}`);

      if (refs.length === 0) {
        console.log('[azureDevOpsInt][GETWI] No work items matched query. Trying simpler query...');
        
        // Try a simpler query to test authentication
        const simpleWiql = 'SELECT [System.Id], [System.Title] FROM WorkItems ORDER BY [System.Id] DESC';
        const simpleResp = await this.axios.post('/wit/wiql?api-version=7.0', { query: simpleWiql });
        const simpleRefs = simpleResp.data?.workItems || [];
        console.log(`[azureDevOpsInt][GETWI] Simple query returned ${simpleRefs.length} work items`);
        
        if (simpleRefs.length === 0) {
          console.log('[azureDevOpsInt][GETWI] No work items in project at all.');
        } else {
          console.log('[azureDevOpsInt][GETWI] Work items exist, but original query has no matches.');
        }
        
        return [];
      }

      const ids = refs.map((w: any) => w.id).join(',');
      console.log('[azureDevOpsInt][GETWI] Expanding IDs:', ids);

      const itemsResp = await this.axios.get(`/wit/workitems?ids=${ids}&$expand=all&api-version=7.0`);
      const rawItems: any[] = itemsResp.data?.value || [];
      console.log('[azureDevOpsInt][GETWI] Raw expanded item count:', rawItems.length);

      const items: WorkItem[] = rawItems
        .filter((item: any) => !!item)
        .map((item: any) => {
          const fields = item.fields || {};
          return {
            id: item.id,
            fields: fields,
          } as WorkItem;
        });

      console.log(`[azureDevOpsInt][GETWI] Returning ${items.length} mapped work items.`);
      return items;
    } catch (err: any) {
      console.error('[azureDevOpsInt][GETWI][ERROR]', err?.message || err);
      if (err?.response) {
        console.error('[azureDevOpsInt][GETWI][ERROR] status:', err.response.status);
        try {
          console.error('[azureDevOpsInt][GETWI][ERROR] data snippet:', JSON.stringify(err.response.data).slice(0, 600));
        } catch {
          /* ignore */
        }
      }
      return [];
    }
  }

  async getWorkItemById(id: number): Promise<WorkItem | null> {
    try {
      const resp = await this.axios.get(`/wit/workitems/${id}?$expand=all`);
      return { id: resp.data.id, fields: resp.data.fields } as WorkItem;
    } catch (err) {
      console.error('Error fetching work item by id:', err);
      return null;
    }
  }

  async runWIQL(wiql: string): Promise<WorkItem[]> {
    try {
      const wiqlResp = await this.axios.post('/wit/wiql', { query: wiql });
      if (!wiqlResp.data.workItems || wiqlResp.data.workItems.length === 0) return [];
      const ids = wiqlResp.data.workItems.map((w: any) => w.id).join(',');
      const itemsResp = await this.axios.get(`/wit/workitems?ids=${ids}&$expand=all`);
      const raw = itemsResp.data.value || [];
      return raw.map((r: any) => ({ id: r.id, fields: r.fields } as WorkItem));
    } catch (err) {
      console.error('runWIQL failed:', err);
      return [];
    }
  }

  async searchWorkItems(term: string): Promise<WorkItem[]> {
    if (!term?.trim()) return [];
    const safe = this._escapeWIQL(term.trim());
    const wiql = `SELECT [System.Id], [System.Title], [System.State] FROM WorkItems 
                 WHERE [System.Title] CONTAINS '${safe}' OR [System.Id] = '${safe}'
                 ORDER BY [System.ChangedDate] DESC`;
    return this.runWIQL(wiql);
  }

  async filterWorkItems(filter: any): Promise<WorkItem[]> {
    const base = 'SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo], [System.IterationPath] FROM WorkItems WHERE ';
    const clauses: string[] = [];
    if (filter?.sprint && filter.sprint !== 'All') {
      if (filter.sprint === '@CurrentIteration') clauses.push('[System.IterationPath] UNDER @CurrentIteration');
      else clauses.push(`[System.IterationPath] = '${this._escapeWIQL(filter.sprint)}'`);
    }
    if (filter?.includeState) clauses.push(`[System.State] = '${this._escapeWIQL(filter.includeState)}'`);
    else if (Array.isArray(filter?.excludeStates) && filter.excludeStates.length) {
      filter.excludeStates.forEach((st: string) => clauses.push(`[System.State] <> '${this._escapeWIQL(st)}'`));
    }
    if (filter?.type && filter.type !== 'All') clauses.push(`[System.WorkItemType] = '${this._escapeWIQL(filter.type)}'`);
    if (filter?.assignedTo === 'Me') clauses.push('[System.AssignedTo] = @Me');
    else if (filter?.assignedTo === 'Unassigned') clauses.push('[System.AssignedTo] = ""');
    if (clauses.length === 0) clauses.push('[System.State] <> "Removed"');
    const wiql = base + clauses.join(' AND ') + ' ORDER BY [System.ChangedDate] DESC';
    return this.runWIQL(wiql);
  }

  async createWorkItem(type: string, title: string, description?: string, assignedTo?: string): Promise<WorkItem> {
    const patch: any[] = [{ op: 'add', path: '/fields/System.Title', value: title }];
    if (description) patch.push({ op: 'add', path: '/fields/System.Description', value: description });
    if (assignedTo) patch.push({ op: 'add', path: '/fields/System.AssignedTo', value: assignedTo });
    const resp = await this.axios.post(`/wit/workitems/$${type}?api-version=7.0`, patch, {
      headers: { 'Content-Type': 'application/json-patch+json' }
    });
    return { id: resp.data.id, fields: resp.data.fields } as WorkItem;
  }

  async updateWorkItem(id: number, patchOps: any[]): Promise<WorkItem> {
    const resp = await this.axios.patch(`/wit/workitems/${id}?api-version=7.0`, patchOps, {
      headers: { 'Content-Type': 'application/json-patch+json' }
    });
    return { id: resp.data.id, fields: resp.data.fields } as WorkItem;
  }

  async addWorkItemComment(id: number, text: string) {
    const resp = await this.axios.post(`/wit/workitems/${id}/comments?api-version=7.0-preview.3`, { text });
    return resp.data; // comment response shape not forced into WorkItem
  }

  async addTimeEntry(id: number, hours: number, note?: string) {
    if (typeof hours !== 'number' || hours <= 0) throw new Error('hours must be positive number');
    const patch = [{ op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.CompletedWork', value: hours }];
    await this.updateWorkItem(id, patch);
    if (note) await this.addWorkItemComment(id, `Time tracked: ${hours} hours. ${note}`);
  }

  async getIterations() {
    try {
      const resp = await this.axios.get('/work/teamsettings/iterations?api-version=7.0');
      return resp.data.value || [];
    } catch (err) {
      console.error('Error fetching iterations:', err);
      return [];
    }
  }

  async getCurrentIteration() {
    try {
      const resp = await this.axios.get('/work/teamsettings/iterations?$timeframe=current&api-version=7.0');
      return resp.data.value?.[0] || null;
    } catch (err) {
      console.error('Error fetching current iteration:', err);
      return null;
    }
  }

  private _escapeWIQL(value: string) {
    return String(value).replace(/'/g, "''");
  }

  // ---------------- Git & PR Helpers ----------------
  async getRepositories(force = false) {
    if (this._repoCache && !force) return this._repoCache;
    try {
      const resp = await this.axios.get(`/git/repositories`);
      this._repoCache = resp.data.value || [];
      return this._repoCache;
    } catch (e) {
      console.error('Error fetching repositories', e);
      return [];
    }
  }

  async getDefaultRepository() {
  const repos = await this.getRepositories();
  return Array.isArray(repos) ? repos[0] : undefined;
  }

  async getPullRequests(repositoryId: string, status: string = 'active') {
    try {
      const resp = await this.axios.get(`/git/pullrequests`, { params: { 'searchCriteria.repositoryId': repositoryId, 'searchCriteria.status': status } });
      const prs = resp.data.value || [];
      return prs.map((pr: any) => ({
        id: pr.pullRequestId,
        title: pr.title,
        status: pr.status,
        createdBy: pr.createdBy?.displayName,
        sourceRefName: pr.sourceRefName,
        targetRefName: pr.targetRefName,
        repository: pr.repository?.name,
        webUrl: this.getBrowserUrl(`/_git/${encodeURIComponent(pr.repository?.name)}/pullrequest/${pr.pullRequestId}`)
      }));
    } catch (e) {
      console.error('Error fetching pull requests', e);
      return [];
    }
  }

  async createPullRequest(repositoryId: string, sourceRefName: string, targetRefName: string, title: string, description?: string) {
    try {
      const payload: any = { sourceRefName, targetRefName, title };
      if (description) payload.description = description;
      const resp = await this.axios.post(`/git/repositories/${repositoryId}/pullrequests?api-version=7.0`, payload);
      return resp.data;
    } catch (e) {
      console.error('Error creating pull request', e);
      throw e;
    }
  }

  // ---------------- Build Helpers ----------------
  async getRecentBuilds(top: number = 10) {
    try {
      const resp = await this.axios.get(`/build/builds`, { params: { '$top': top, queryOrder: 'finishTimeDescending' } });
      return (resp.data.value || []).map((b: any) => ({
        id: b.id,
        buildNumber: b.buildNumber,
        status: b.status,
        result: b.result,
        definition: b.definition?.name,
        queueTime: b.queueTime,
        finishTime: b.finishTime,
        webUrl: b._links?.web?.href
      }));
    } catch (e) {
      console.error('Error fetching builds', e);
      return [];
    }
  }
}

// Backward-compatible alias for extensions / docs still referencing AzureDevOpsClient
// Deprecated: prefer AzureDevOpsIntClient going forward.
export const AzureDevOpsClient = AzureDevOpsIntClient;
export default AzureDevOpsIntClient;
