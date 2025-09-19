export type ID = string | number;

export interface WorkItem {
  id: ID;
  title: string;
  state: string;
  assignedTo?: string;
  tags?: string[];
  iteration?: string;
  area?: string;
  updated?: string; // ISO
  rev?: number; // ADO revision
  etag?: string;
}

export interface Comment {
  id: ID;
  workItemId: ID;
  text: string;
  createdBy?: string;
  createdDate?: string; // ISO
  idempotencyKey?: string;
}

export interface TimerEntry {
  id: ID;
  workItemId: ID;
  start: string; // ISO
  stop?: string; // ISO
  durationSeconds?: number;
  summaryDraft?: string;
  proposedCompleted?: number;
  proposedRemaining?: number;
  synced?: boolean;
}

export interface PullRequest {
  id: ID;
  repoId: string;
  title: string;
  state: string;
  createdBy?: string;
  updated?: string; // ISO
  reviewers?: string[];
}

export type Entity = WorkItem | Comment | TimerEntry | PullRequest;

export interface Filters {
  assignee?: string;
  tags?: string[];
  stateCategory?: string;
  iteration?: string;
}
