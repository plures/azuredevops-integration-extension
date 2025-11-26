export interface WorkItemFields {
  [key: string]: any;
  'System.Id'?: number;
  'System.Title'?: string;
  'System.State'?: string;
  'System.WorkItemType'?: string;
  'System.AssignedTo'?: any;
  'System.IterationPath'?: string;
}

export interface WorkItemBranchLink {
  url?: string;
  rel?: string;
  attributes?: Record<string, any>;
  repositoryId?: string;
  projectId?: string;
  refName?: string;
}

export type WorkItemBranchMatchConfidence = 'exact' | 'name' | 'refOnly';

export interface WorkItemBuildSummary {
  id: number;
  buildNumber?: string;
  status?: string;
  result?: string;
  definition?: string;
  queueTime?: string;
  finishTime?: string;
  webUrl?: string;
}

export interface WorkItemBranchMetadata {
  isCurrentBranch?: boolean;
  branchName?: string;
  refName?: string;
  repositoryId?: string;
  repositoryName?: string;
  matchConfidence?: WorkItemBranchMatchConfidence;
  link?: WorkItemBranchLink;
  build?: WorkItemBuildSummary;
  hasActiveBuild?: boolean;
  lastUpdated?: string;
}

export interface WorkItem {
  id?: number; // sometimes id separate from fields
  fields: WorkItemFields;
  relations?: WorkItemBranchLink[];
  branchMetadata?: WorkItemBranchMetadata;
}

export interface AzureDevOpsClientOptions {
  organization: string;
  project: string;
  personalAccessToken: string;
}

// Allow importing Svelte components in TS files used for the webview bundle
declare module '*.svelte' {
  const component: any;
  export default component;
}
