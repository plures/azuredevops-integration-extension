import { AzureHttpClient } from './http-client.js';
import { WorkItemsService } from './work-items-service.js';
import type {
  ClientOptions,
  WorkItem,
  WorkItemFilter,
  WorkItemCreateData,
  WorkItemTimeEntry,
  WorkItemPatch,
  RepositoryInfo,
  PullRequestInfo,
  BuildInfo,
  Identity,
  ConnectionData,
} from './types.js';

export class AzureDevOpsIntClient {
  private httpClient: AzureHttpClient;
  private workItemsService: WorkItemsService;
  private cachedIdentity?: Identity;
  private _repoCache?: RepositoryInfo[];

  // Static properties for API versions
  static readonly connectionDataApiVersions = ['7.1-preview.1', '7.0', '6.0'];

  constructor(
    organization: string,
    project: string,
    credential: string,
    authType: 'pat' | 'bearer' = 'pat',
    options: ClientOptions = {}
  ) {
    this.httpClient = new AzureHttpClient(organization, project, credential, authType, options);
    this.workItemsService = new WorkItemsService(this.httpClient);
  }

  // Delegate work items operations to the service
  async getWorkItems(query: string): Promise<WorkItem[]> {
    return this.workItemsService.getWorkItemsByQuery(query);
  }

  async updateWorkItem(id: number, patches: WorkItemPatch[]): Promise<WorkItem | null> {
    return this.workItemsService.updateWorkItem(id, patches);
  }

  async addWorkItemComment(id: number, comment: string): Promise<boolean> {
    return this.workItemsService.addWorkItemComment(id, comment);
  }

  async getWorkItemsByIds(ids: number[]): Promise<WorkItem[]> {
    return this.workItemsService.getWorkItemsByIds(ids);
  }

  async getWorkItemById(id: number): Promise<WorkItem | null> {
    const items = await this.workItemsService.getWorkItemsByIds([id]);
    return items.length > 0 ? items[0] : null;
  }

  async createWorkItem(data: WorkItemCreateData): Promise<WorkItem | null> {
    return this.workItemsService.createWorkItem(data);
  }

  async addWorkItemTime(id: number, timeEntry: WorkItemTimeEntry): Promise<boolean> {
    return this.workItemsService.addWorkItemTime(id, timeEntry);
  }

  async searchWorkItems(term: string, filter?: WorkItemFilter): Promise<WorkItem[]> {
    return this.workItemsService.searchWorkItems(term, filter);
  }

  // Authentication and identity methods
  async getAuthenticatedIdentity(): Promise<Identity | null> {
    if (this.cachedIdentity) return this.cachedIdentity;

    try {
      const response = await this.httpClient.get<ConnectionData>('/connectionData');
      if (response.data?.authenticatedUser) {
        this.cachedIdentity = response.data.authenticatedUser;
        return this.cachedIdentity;
      }
    } catch (error) {
      console.error('[AzureDevOpsIntClient] Error getting authenticated identity:', error);
    }

    return null;
  }

  // Repository methods
  async getRepositories(force = false): Promise<RepositoryInfo[]> {
    if (this._repoCache && !force) return this._repoCache;

    const cacheKey = `repos:${this.httpClient.organizationName}:${this.httpClient.projectName}`;

    if (!force) {
      const cached = this.httpClient['cache']?.get(cacheKey);
      if (cached) {
        this._repoCache = cached;
        return cached;
      }
    }

    try {
      const response = await this.httpClient.get('/git/repositories');
      if (response.data?.value) {
        const repos: RepositoryInfo[] = response.data.value.map((repo: any) => ({
          id: repo.id,
          name: repo.name,
          url: repo.url,
          defaultBranch: repo.defaultBranch || 'main',
        }));

        this._repoCache = repos;
        this.httpClient['cache']?.set(cacheKey, repos, 10 * 60 * 1000); // 10 minutes
        return repos;
      }
    } catch (error) {
      console.error('[AzureDevOpsIntClient] Error fetching repositories:', error);
    }

    return [];
  }

  // Pull request methods
  async getPullRequests(repositoryId: string, status?: string): Promise<PullRequestInfo[]> {
    try {
      const params: any = {};
      if (status) {
        params.status = status;
      }

      const response = await this.httpClient.get(`/git/repositories/${repositoryId}/pullrequests`, {
        params,
      });

      if (response.data?.value) {
        return response.data.value.map((pr: any) => ({
          pullRequestId: pr.pullRequestId,
          title: pr.title,
          description: pr.description,
          sourceRefName: pr.sourceRefName,
          targetRefName: pr.targetRefName,
          status: pr.status,
          createdBy: pr.createdBy,
          creationDate: pr.creationDate,
          url: pr.url,
        }));
      }
    } catch (error) {
      console.error('[AzureDevOpsIntClient] Error fetching pull requests:', error);
    }

    return [];
  }

  // Build methods
  async getBuilds(projectId?: string, definitions?: string | number[]): Promise<BuildInfo[]> {
    try {
      const params: any = {};
      if (projectId) {
        params.projectId = projectId;
      }
      if (definitions !== undefined) {
        params.definitions = Array.isArray(definitions) ? definitions.join(',') : definitions;
      }

      const response = await this.httpClient.get('/build/builds', { params });

      if (response.data?.value) {
        return response.data.value.map((build: any) => ({
          id: build.id,
          buildNumber: build.buildNumber,
          status: build.status,
          result: build.result,
          startTime: build.startTime,
          finishTime: build.finishTime,
          definition: build.definition,
          url: build.url,
        }));
      }
    } catch (error) {
      console.error('[AzureDevOpsIntClient] Error fetching builds:', error);
    }

    return [];
  }

  // Utility methods
  updateCredential(newCredential: string): void {
    this.httpClient.updateCredential(newCredential);
  }

  buildFullUrl(path: string): string {
    return this.httpClient.buildFullUrl(path);
  }

  getBrowserUrl(path: string): string {
    return this.httpClient.getBrowserUrl(path);
  }

  buildTeamUrl(path: string): string {
    return this.httpClient.buildTeamUrl(path);
  }

  setTeam(teamName: string): void {
    this.httpClient.setTeam(teamName);
  }

  // Getters for external access
  get organization(): string {
    return this.httpClient.organizationName;
  }

  get project(): string {
    return this.httpClient.projectName;
  }

  get encodedOrganization(): string {
    return this.httpClient.encodedOrg;
  }

  get encodedProject(): string {
    return this.httpClient.encodedProj;
  }

  get encodedTeam(): string | undefined {
    return this.httpClient.encodedTeamName;
  }
}

// Backward-compatible alias for extensions / docs still referencing AzureDevOpsClient
// Deprecated: prefer AzureDevOpsIntClient going forward.
export const AzureDevOpsClient = AzureDevOpsIntClient;
export default AzureDevOpsIntClient;
