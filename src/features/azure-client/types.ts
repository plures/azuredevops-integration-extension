/**
 * Module: src/features/azure-client/types.ts
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
export type {
  WorkItem as _WorkItem,
  WorkItemBuildSummary as _WorkItemBuildSummary,
} from '../../types.js';

export type { WorkItem } from '../../types.js';

export type AuthType = 'pat' | 'bearer';

export interface ClientOptions {
  ratePerSecond?: number;
  burst?: number;
  apiBaseUrl?: string;
  identityName?: string;
}

export interface WorkItemFilter {
  sprint?: string;
  includeState?: string;
  type?: string;
  assignedTo?: string;
}

export interface WorkItemPatch {
  op: 'add' | 'replace' | 'remove';
  path: string;
  value?: any;
}

export interface WorkItemCreateData {
  title: string;
  description?: string;
  assignedTo?: string;
  extraFields?: Record<string, any>;
}

export interface WorkItemTimeEntry {
  hours: number;
  note?: string;
}

export interface RepositoryInfo {
  id: string;
  name: string;
  url: string;
  defaultBranch: string;
}

export interface PullRequestInfo {
  pullRequestId: number;
  title: string;
  description?: string;
  sourceRefName: string;
  targetRefName: string;
  status: string;
  createdBy: {
    displayName: string;
    uniqueName: string;
  };
  creationDate: string;
  url: string;
}

export interface BuildInfo {
  id: number;
  buildNumber: string;
  status: string;
  result?: string;
  startTime?: string;
  finishTime?: string;
  definition: {
    name: string;
    id: number;
  };
  url: string;
}

export interface Identity {
  id: string;
  displayName: string;
  uniqueName: string;
  descriptor: string;
}

export interface ConnectionData {
  authenticatedUser: Identity;
  authorizedUser: Identity;
  instanceId: string;
}

export interface WIQLQueryResult {
  workItems: Array<{
    id: number;
    url: string;
  }>;
  queryType: string;
  queryResultType: string;
  asOf: string;
  columns: Array<{
    referenceName: string;
    name: string;
    url: string;
  }>;
  sortColumns: Array<{
    field: {
      referenceName: string;
      name: string;
      url: string;
    };
    descending: boolean;
  }>;
}

export interface WorkItemRelation {
  rel: string;
  url: string;
  attributes?: Record<string, any>;
}

export interface WorkItemRelationInfo {
  workItemId: number;
  relationType: string;
  targetWorkItemId?: number;
  targetWorkItemUrl?: string;
}
