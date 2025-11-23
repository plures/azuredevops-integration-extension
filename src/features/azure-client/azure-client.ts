/**
 * Module: src/features/azure-client/azure-client.ts
 * Owner: application
 * Reads: (document)
 * Writes: (document)
 * Receives: (document)
 * Emits: (document)
 * Prohibitions: Do not mutate ApplicationContext directly; Do not define new *Context types
 * Rationale: (document)
 *
 * LLM-GUARD:
 * - Follow ownership boundaries; route events to Router; do not add UI logic here
 */
import { AzureHttpClient } from './http-client.js';
import { WorkItemsService } from './work-items-service.js';
import { createLogger } from '../../logging/unifiedLogger.js';
import type { WorkItem } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js';

const logger = createLogger('azure-client');
import type {
  ClientOptions,
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
    return this.workItemsService.getWorkItemsByQuery(query) as unknown as WorkItem[];
  }

  async updateWorkItem(id: number, patches: WorkItemPatch[]): Promise<WorkItem | null> {
    return this.workItemsService.updateWorkItem(id, patches) as unknown as WorkItem | null;
  }

  async addWorkItemComment(id: number, comment: string): Promise<boolean> {
    return this.workItemsService.addWorkItemComment(id, comment);
  }

  async getWorkItemsByIds(ids: number[]): Promise<WorkItem[]> {
    return this.workItemsService.getWorkItemsByIds(ids) as unknown as WorkItem[];
  }

  async getWorkItemById(id: number): Promise<WorkItem | null> {
    const items = await this.workItemsService.getWorkItemsByIds([id]);
    return items.length > 0 ? (items[0] as unknown as WorkItem) : null;
  }

  async createWorkItem(data: WorkItemCreateData): Promise<WorkItem | null> {
    return this.workItemsService.createWorkItem(data) as unknown as WorkItem | null;
  }

  async addWorkItemTime(id: number, timeEntry: WorkItemTimeEntry): Promise<boolean> {
    return this.workItemsService.addWorkItemTime(id, timeEntry);
  }

  async searchWorkItems(term: string, filter?: WorkItemFilter): Promise<WorkItem[]> {
    return this.workItemsService.searchWorkItems(term, filter) as unknown as WorkItem[];
  }

  // Authentication and identity methods
  async getAuthenticatedIdentity(): Promise<Identity | null> {
    if (this.cachedIdentity) return this.cachedIdentity;

    try {
      const response = (await (this.httpClient as any).get('/connectionData')) as {
        data: ConnectionData;
      };
      if (response.data?.authenticatedUser) {
        this.cachedIdentity = response.data.authenticatedUser;
        return this.cachedIdentity;
      }
    } catch (error) {
      logger.error('Error getting authenticated identity', { meta: error });
    }

    return null;
  }

  // Repository methods
  async getRepositories(force = false): Promise<RepositoryInfo[]> {
    if (this._repoCache && !force) return this._repoCache;

    const cacheKey = `repos:${this.organization}:${this.project}`;

    if (!force) {
      const cached = (this.httpClient as any).cache?.get(cacheKey);
      if (cached) {
        this._repoCache = cached;
        return cached;
      }
    }

    return this.fetchAndCacheRepositories(cacheKey);
  }

  private async fetchAndCacheRepositories(cacheKey: string): Promise<RepositoryInfo[]> {
    try {
      const response = await (this.httpClient as any).get('/git/repositories');
      if (response.data?.value) {
        const repos: RepositoryInfo[] = response.data.value.map((repo: any) => ({
          id: repo.id,
          name: repo.name,
          url: repo.url,
          defaultBranch: repo.defaultBranch || 'main',
        }));

        this._repoCache = repos;
        (this.httpClient as any).cache?.set(cacheKey, repos, 10 * 60 * 1000); // 10 minutes
        return repos;
      }
    } catch (error) {
      logger.error('Error fetching repositories', { meta: error });
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

      const response = await (this.httpClient as any).get(
        `/git/repositories/${repositoryId}/pullrequests`,
        {
          params,
        }
      );

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
      logger.error('Error fetching pull requests', { meta: error });
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

      const response = await (this.httpClient as any).get('/build/builds', { params });

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
      logger.error('Error fetching builds', { meta: error });
    }

    return [];
  }

  // Utility methods
  updateCredential(newCredential: string): void {
    (this.httpClient as any).updateCredential(newCredential);
  }

  buildFullUrl(path: string): string {
    return (this.httpClient as any).buildFullUrl(path);
  }

  getBrowserUrl(path: string): string {
    return (this.httpClient as any).getBrowserUrl(path);
  }

  buildTeamUrl(path: string): string {
    return (this.httpClient as any).buildTeamUrl(path);
  }

  setTeam(teamName: string): void {
    (this.httpClient as any).setTeam(teamName);
  }

  // Getters for external access
  get organization(): string {
    return (this.httpClient as any).organization;
  }

  get project(): string {
    return (this.httpClient as any).project;
  }

  get encodedOrganization(): string {
    return (this.httpClient as any).encodedOrg;
  }

  get encodedProject(): string {
    return (this.httpClient as any).encodedProj;
  }

  get encodedTeam(): string | undefined {
    return (this.httpClient as any).encodedTeamName;
  }
}

// Backward-compatible alias for extensions / docs still referencing AzureDevOpsClient
// Deprecated: prefer AzureDevOpsIntClient going forward.
export const AzureDevOpsClient = AzureDevOpsIntClient;
export default AzureDevOpsIntClient;
