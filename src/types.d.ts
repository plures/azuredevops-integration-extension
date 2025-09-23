export interface WorkItemFields {
  [key: string]: any;
  'System.Id'?: number;
  'System.Title'?: string;
  'System.State'?: string;
  'System.WorkItemType'?: string;
  'System.AssignedTo'?: any;
  'System.IterationPath'?: string;
}

export interface WorkItem {
  id?: number; // sometimes id separate from fields
  fields: WorkItemFields;
}

export interface WorkItemTimerState {
  workItemId: number;
  workItemTitle: string;
  startTime: number;
  elapsedSeconds: number;
  isPaused: boolean;
  isPomodoro: boolean;
  pomodoroCount: number;
  pausedTime?: number;
  pausedDueToInactivity?: boolean;
}

export interface TimeEntry {
  workItemId: number;
  startTime: number;
  endTime: number;
  duration: number; // seconds
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
