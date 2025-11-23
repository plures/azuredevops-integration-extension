/**
 * Module: src/features/azure-client/work-items-service.ts
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
import { workItemCache, WorkItemCache } from '../../cache.js';
import { measureAsync as _measureAsync } from '../../performance.js';
import { createLogger } from '../../logging/unifiedLogger.js';
import type { AzureHttpClient } from './http-client.js';

const logger = createLogger('work-items-service');
import type {
  WorkItemFilter,
  WorkItemPatch,
  WorkItemCreateData,
  WorkItemTimeEntry,
  WIQLQueryResult,
  WorkItemRelation as _WorkItemRelation,
  WorkItemRelationInfo,
} from './types.js';
import { WIQLBuilder } from './wiql-builder.js';

export interface WorkItem {
  id: number;
  title: string;
  state: string;
  assignedTo: string;
  workItemType: string;
  changedDate: string;
  url: string;
  fields: Record<string, any>;
  relations?: WorkItemRelationInfo[];
}

export class WorkItemsService {
  private httpClient: AzureHttpClient;
  private cache: WorkItemCache;
  private wiqlBuilder: WIQLBuilder;

  constructor(httpClient: AzureHttpClient) {
    this.httpClient = httpClient;
    this.cache = workItemCache;
    this.wiqlBuilder = new WIQLBuilder();
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
        logger.error(`Error fetching work items ${chunk.join(',')}`, { meta: error });
      }
    }

    return results;
  }

  async getWorkItemsByQuery(query: string): Promise<WorkItem[]> {
    const cacheKey = `workitems:${this.httpClient.organizationName}:${this.httpClient.projectName}:${query}`;

    try {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit for query', { meta: { query } });
        return cached;
      }

      const wiql = this.wiqlBuilder.buildWIQL(query);
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
      logger.error('Error fetching work items by query', { meta: error });
      return [];
    }
  }

  private _buildCreatePatch(data: WorkItemCreateData): WorkItemPatch[] {
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
    return patch;
  }

  private _handleRequestError(error: unknown, logMessage: string, actionDescription: string): void {
    logger.error(logMessage, { meta: error });
    if ((error as any).response?.status === 403) {
      logger.error(`403 Forbidden - insufficient permissions to ${actionDescription}`);
    }
  }

  async createWorkItem(data: WorkItemCreateData): Promise<WorkItem | null> {
    const patch = this._buildCreatePatch(data);

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
        return this._mapWorkItems([response.data])[0];
      }
    } catch (error) {
      this._handleRequestError(error, 'Error creating work item', 'create work items');
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
        return workItem;
      }
    } catch (error) {
      logger.error('Error updating work item', { meta: error });
      if ((error as any).response?.status === 403) {
        logger.error('403 Forbidden - insufficient permissions to update work items');
      }
    }

    return null;
  }

  async addWorkItemComment(id: number, comment: string): Promise<boolean> {
    try {
      const patch: WorkItemPatch[] = [
        {
          op: 'add',
          path: '/fields/System.History',
          value: comment,
        },
      ];

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
        return true;
      }
    } catch (error) {
      logger.error('Error adding comment', { meta: error });
      if ((error as any).response?.status === 403) {
        logger.error('403 Forbidden - insufficient permissions to add comments');
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
      logger.error('Error adding time to work item', { meta: error });
      return false;
    }
  }

  async searchWorkItems(term: string, filter?: WorkItemFilter): Promise<WorkItem[]> {
    if (!term?.trim()) return [];

    const wiql = this.wiqlBuilder.buildSearchWIQL(term, filter);

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
      logger.error('Error searching work items', { meta: error });
      return [];
    }
  }
}
