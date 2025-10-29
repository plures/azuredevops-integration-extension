import { workItemCache, WorkItemCache } from '../../cache.js';
import { measureAsync as _measureAsync } from '../../performance.js';
import type { AzureHttpClient } from './http-client.js';
import type {
  WorkItem,
  WorkItemFilter,
  WorkItemPatch,
  WorkItemCreateData,
  WorkItemTimeEntry,
  WIQLQueryResult,
  WorkItemRelation as _WorkItemRelation,
  WorkItemRelationInfo,
} from './types.js';

export class WorkItemsService {
  private httpClient: AzureHttpClient;
  private cache: WorkItemCache;

  constructor(httpClient: AzureHttpClient) {
    this.httpClient = httpClient;
    this.cache = workItemCache;
  }

  buildWIQL(queryNameOrText: string): string {
    // Use capability cache to decide whether to include [System.StateCategory]
    const useStateCategory = true; // This would be determined by capability cache

    switch (queryNameOrText) {
      case 'My Activity': {
        const activeFilter = this._buildActiveFilter(useStateCategory);
        return `SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.ChangedDate]
                        FROM WorkItems
                        WHERE [System.TeamProject] = @project
                        AND ([System.AssignedTo] = @Me OR [System.CreatedBy] = @Me OR [System.ChangedBy] = @Me)
                        ${activeFilter}
                        ORDER BY [System.ChangedDate] DESC`;
      }

      case 'Following': {
        return `SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.ChangedDate]
                        FROM WorkItems
                        WHERE [System.TeamProject] = @project
                        AND [System.AssignedTo] = @Me
                        ${this._buildActiveFilter(useStateCategory)}
                        ORDER BY [System.ChangedDate] DESC`;
      }

      case 'Mentioned': {
        return `SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.ChangedDate]
                        FROM WorkItems
                        WHERE [System.TeamProject] = @project
                        AND [System.ChangedBy] = @Me
                        ${this._buildActiveFilter(useStateCategory)}
                        ORDER BY [System.ChangedDate] DESC`;
      }

      default: {
        return queryNameOrText;
      }
    }
  }

  private _buildActiveFilter(useStateCategory: boolean): string {
    if (useStateCategory) {
      return `AND [System.StateCategory] <> 'Completed' AND [System.State] <> 'Removed'`;
    }
    return `AND [System.State] <> 'Removed'`;
  }

  private _mapWorkItems(rawItems: any[]): WorkItem[] {
    if (!Array.isArray(rawItems)) return [];
    return rawItems
      .map((item) => {
        const mapped: WorkItem = {
          id: item.id,
          title: item.fields?.['System.Title'] || 'Untitled',
          state: item.fields?.['System.State'] || 'Unknown',
          assignedTo: item.fields?.['System.AssignedTo']?.displayName || 'Unassigned',
          workItemType: item.fields?.['System.WorkItemType'] || 'Unknown',
          changedDate: item.fields?.['System.ChangedDate'] || new Date().toISOString(),
          url: item.url,
          fields: item.fields || {},
        };

        // Handle relations
        if (Array.isArray(item.relations) && item.relations.length > 0) {
          const relations = item.relations
            .map((rel: any) => {
              if (
                rel.rel === 'System.LinkType.Hierarchy-Forward' ||
                rel.rel === 'System.LinkType.Hierarchy-Reverse'
              ) {
                const targetId = rel.url?.match(/\/(\d+)$/)?.[1];
                if (targetId) {
                  return {
                    workItemId: parseInt(targetId),
                    relationType: rel.rel,
                    targetWorkItemUrl: rel.url,
                  } as WorkItemRelationInfo;
                }
              }
              return null;
            })
            .filter(Boolean);

          if (relations.length > 0) {
            mapped.relations = relations;
          }
        }

        return mapped;
      })
      .filter(Boolean);
  }

  async getWorkItemsByIds(ids: number[]): Promise<WorkItem[]> {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isFinite(id)))) as number[];
    if (uniqueIds.length === 0) return [];

    const results: WorkItem[] = [];
    const chunkSize = 200; // Azure DevOps limit

    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      const chunk = uniqueIds.slice(i, i + chunkSize);
      if (chunk.length === 0) continue;

      try {
        const response = await this.httpClient.get(
          `/wit/workitems?ids=${chunk.join(',')}&$expand=relations`
        );

        if (response.data?.value) {
          const mapped = this._mapWorkItems(response.data.value);
          results.push(...mapped);
        }
      } catch (error) {
        console.error(`[WorkItemsService] Error fetching work items ${chunk.join(',')}:`, error);
      }
    }

    return results;
  }

  async getWorkItemsByQuery(query: string): Promise<WorkItem[]> {
    const cacheKey = `workitems:${this.httpClient.organizationName}:${this.httpClient.projectName}:${query}`;

    try {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log('[WorkItemsService] Cache hit for query:', query);
        return cached;
      }

      const wiql = this.buildWIQL(query);
      const response = await this.httpClient.post<WIQLQueryResult>('/wit/wiql', {
        query: wiql,
      });

      if (!response.data.workItems || response.data.workItems.length === 0) {
        return [];
      }

      const ids = response.data.workItems.map((w: any) => w.id);
      const items = await this.getWorkItemsByIds(ids);

      this.cache.set(cacheKey, items, 5 * 60 * 1000); // 5 minutes
      return items;
    } catch (error) {
      console.error('[WorkItemsService] Error fetching work items by query:', error);
      return [];
    }
  }

  async createWorkItem(data: WorkItemCreateData): Promise<WorkItem | null> {
    const patch: WorkItemPatch[] = [{ op: 'add', path: '/fields/System.Title', value: data.title }];

    if (data.description) {
      patch.push({ op: 'add', path: '/fields/System.Description', value: data.description });
    }
    if (data.assignedTo) {
      patch.push({ op: 'add', path: '/fields/System.AssignedTo', value: data.assignedTo });
    }
    if (data.extraFields && typeof data.extraFields === 'object') {
      for (const [field, value] of Object.entries(data.extraFields)) {
        if (value === undefined || value === null || value === '') continue;
        patch.push({ op: 'add', path: `/fields/${field}`, value });
      }
    }

    try {
      const response = await this.httpClient.post(
        `/wit/workitems/$Bug?bypassRules=true&suppressNotifications=true`,
        patch,
        {
          headers: {
            'Content-Type': 'application/json-patch+json',
          },
        }
      );

      if (response.data?.id) {
        const workItem = this._mapWorkItems([response.data])[0];
        return workItem;
      }
    } catch (error) {
      console.error('[WorkItemsService] Error creating work item:', error);
      if (error.response?.status === 403) {
        console.error(
          '[WorkItemsService] 403 Forbidden - insufficient permissions to create work items'
        );
      }
    }

    return null;
  }

  async updateWorkItem(id: number, patches: WorkItemPatch[]): Promise<WorkItem | null> {
    try {
      const response = await this.httpClient.patch(
        `/wit/workitems/${id}?bypassRules=true&suppressNotifications=true`,
        patches,
        {
          headers: {
            'Content-Type': 'application/json-patch+json',
          },
        }
      );

      if (response.data?.id) {
        const workItem = this._mapWorkItems([response.data])[0];
        // Invalidate cache for this work item
        this.cache.invalidateWorkItem(id);
        return workItem;
      }
    } catch (error) {
      console.error('[WorkItemsService] Error updating work item:', error);
      if (error.response?.status === 403) {
        console.error(
          '[WorkItemsService] 403 Forbidden - insufficient permissions to update work items'
        );
      }
    }

    return null;
  }

  async addWorkItemComment(id: number, comment: string): Promise<boolean> {
    try {
      const patch: WorkItemPatch[] = [{
        op: 'add',
        path: '/fields/System.History',
        value: comment
      }];

      const response = await this.httpClient.patch(
        `/wit/workitems/${id}?bypassRules=true&suppressNotifications=true`,
        patch,
        {
          headers: {
            'Content-Type': 'application/json-patch+json',
          },
        }
      );

      if (response.data?.id) {
        // Invalidate cache for this work item
        this.cache.invalidateWorkItem(id);
        return true;
      }
    } catch (error) {
      console.error('[WorkItemsService] Error adding comment to work item:', error);
      if (error.response?.status === 403) {
        console.error(
          '[WorkItemsService] 403 Forbidden - insufficient permissions to add comments'
        );
      }
    }

    return false;
  }

  async addWorkItemTime(id: number, timeEntry: WorkItemTimeEntry): Promise<boolean> {
    if (typeof timeEntry.hours !== 'number' || timeEntry.hours <= 0) {
      throw new Error('hours must be positive number');
    }

    const patch: WorkItemPatch[] = [
      {
        op: 'add',
        path: '/fields/Microsoft.VSTS.Scheduling.CompletedWork',
        value: timeEntry.hours,
      },
    ];

    try {
      await this.httpClient.patch(`/wit/workitems/${id}?bypassRules=true`, patch, {
        headers: {
          'Content-Type': 'application/json-patch+json',
        },
      });

      if (timeEntry.note) {
        await this.addWorkItemComment(
          id,
          `Time tracked: ${timeEntry.hours} hours. ${timeEntry.note}`
        );
      }

      return true;
    } catch (error) {
      console.error('[WorkItemsService] Error adding time to work item:', error);
      return false;
    }
  }

  async addWorkItemComment(id: number, comment: string): Promise<boolean> {
    try {
      await this.httpClient.post(`/wit/workitems/${id}/comments`, {
        text: comment,
      });
      return true;
    } catch (error) {
      console.error('[WorkItemsService] Error adding comment to work item:', error);
      return false;
    }
  }

  async searchWorkItems(term: string, filter?: WorkItemFilter): Promise<WorkItem[]> {
    if (!term?.trim()) return [];
    const safe = this._escapeWIQL(term.trim());
    const base = `SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.ChangedDate]
                  FROM WorkItems
                  WHERE [System.TeamProject] = @project
                  AND ([System.Title] CONTAINS '${safe}' OR [System.Description] CONTAINS '${safe}')`;

    const clauses: string[] = [];

    if (filter?.sprint && filter.sprint !== 'All') {
      if (filter.sprint === '@CurrentIteration') {
        clauses.push('[System.IterationPath] UNDER @CurrentIteration');
      } else {
        clauses.push(`[System.IterationPath] UNDER '${this._escapeWIQL(filter.sprint)}'`);
      }
    }

    if (filter?.includeState) {
      clauses.push(`[System.State] = '${this._escapeWIQL(filter.includeState)}'`);
    }

    if (filter?.type && filter.type !== 'All') {
      clauses.push(`[System.WorkItemType] = '${this._escapeWIQL(filter.type)}'`);
    }
    if (filter?.assignedTo === 'Me') clauses.push('[System.AssignedTo] = @Me');
    else if (filter?.assignedTo === 'Unassigned') clauses.push('[System.AssignedTo] = ""');
    if (clauses.length === 0) clauses.push('[System.State] <> "Removed"');

    const wiql = base + clauses.join(' AND ') + ' ORDER BY [System.ChangedDate] DESC';

    try {
      const response = await this.httpClient.post<WIQLQueryResult>('/wit/wiql', {
        query: wiql,
      });

      if (!response.data.workItems || response.data.workItems.length === 0) {
        return [];
      }

      const ids = response.data.workItems.map((w: any) => w.id);
      return await this.getWorkItemsByIds(ids);
    } catch (error) {
      console.error('[WorkItemsService] Error searching work items:', error);
      return [];
    }
  }

  private _escapeWIQL(value: string): string {
    return value.replace(/'/g, "''");
  }
}
