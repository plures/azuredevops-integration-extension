import type { ID, WorkItem, Comment, TimerEntry, PullRequest } from './types.js';
import type { ChangeEvent } from './events.js';

export interface RepositoryEvents {
  on(listener: (ev: ChangeEvent) => void): () => void;
}

export interface WorkItemRepository extends RepositoryEvents {
  getById(id: ID): Promise<WorkItem | undefined>;
  query(filters?: Record<string, unknown>): Promise<WorkItem[]>;
  upsert(items: WorkItem[]): Promise<void>;
  delete(ids: ID[]): Promise<void>;
}

export interface CommentRepository extends RepositoryEvents {
  listForWorkItem(workItemId: ID): Promise<Comment[]>;
  upsert(items: Comment[]): Promise<void>;
}

export interface TimerRepository extends RepositoryEvents {
  listForWorkItem(workItemId: ID): Promise<TimerEntry[]>;
  upsert(entries: TimerEntry[]): Promise<void>;
}

export interface PullRequestRepository extends RepositoryEvents {
  listMine(): Promise<PullRequest[]>;
  upsert(items: PullRequest[]): Promise<void>;
}

export interface RepositoryProvider {
  workItems: WorkItemRepository;
  comments: CommentRepository;
  timers: TimerRepository;
  pullRequests: PullRequestRepository;
}

export interface Mutation<TPayload = unknown> {
  id: string; // idempotency key
  type:
    | 'workItem.update'
    | 'workItem.comment.add'
    | 'timer.add'
    | 'pullRequest.create';
  payload: TPayload;
  expectedRev?: number;
  createdAt: string; // ISO
}
