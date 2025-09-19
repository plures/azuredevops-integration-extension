import { EventBus } from './events.js';
import type {
  RepositoryProvider,
  WorkItemRepository,
  CommentRepository,
  TimerRepository,
  PullRequestRepository,
} from './repository.js';
import type { ID, WorkItem, Comment, TimerEntry, PullRequest } from './types.js';

class InMemoryWorkItems implements WorkItemRepository {
  private items = new Map<ID, WorkItem>();
  private bus = new EventBus();

  on(listener: (ev: { type: 'workItem'; ids: Array<ID> }) => void) {
    // Adapt to ChangeEvent shape used by EventBus
    return this.bus.on((ev) => {
      if (ev.type === 'workItem') listener({ type: 'workItem', ids: ev.ids });
    });
  }

  async getById(id: ID): Promise<WorkItem | undefined> {
    return this.items.get(id);
  }

  async query(): Promise<WorkItem[]> {
    return Array.from(this.items.values());
  }

  async upsert(items: WorkItem[]): Promise<void> {
    const ids: ID[] = [];
    for (const it of items) {
      this.items.set(it.id, it);
      ids.push(it.id);
    }
    // debug instrumentation
    this.bus.emit({ type: 'workItem', ids, reason: 'upsert' });
  }

  async delete(ids: ID[]): Promise<void> {
    for (const id of ids) this.items.delete(id);
    // debug instrumentation
    // @ts-ignore access private for debug
    this.bus.emit({ type: 'workItem', ids, reason: 'delete' });
  }
}

class InMemoryComments implements CommentRepository {
  private byWi = new Map<ID, Comment[]>();
  private bus = new EventBus();
  on(listener: (ev: { type: 'comment'; ids: Array<ID> }) => void) {
    return this.bus.on((ev) => {
      if (ev.type === 'comment') listener({ type: 'comment', ids: ev.ids });
    });
  }
  async listForWorkItem(workItemId: ID): Promise<Comment[]> {
    return this.byWi.get(workItemId) ?? [];
  }
  async upsert(items: Comment[]): Promise<void> {
    const ids: ID[] = [];
    for (const c of items) {
      const arr = this.byWi.get(c.workItemId) ?? [];
      const idx = arr.findIndex((x) => x.id === c.id);
      if (idx >= 0) arr[idx] = c;
      else arr.push(c);
      this.byWi.set(c.workItemId, arr);
      ids.push(c.id);
    }
    this.bus.emit({ type: 'comment', ids, reason: 'upsert' });
  }
}

class InMemoryTimers implements TimerRepository {
  private byWi = new Map<ID, TimerEntry[]>();
  private bus = new EventBus();
  on(listener: (ev: { type: 'timerEntry'; ids: Array<ID> }) => void) {
    return this.bus.on((ev) => {
      if (ev.type === 'timerEntry') listener({ type: 'timerEntry', ids: ev.ids });
    });
  }
  async listForWorkItem(workItemId: ID): Promise<TimerEntry[]> {
    return this.byWi.get(workItemId) ?? [];
  }
  async upsert(entries: TimerEntry[]): Promise<void> {
    const ids: ID[] = [];
    for (const e of entries) {
      const arr = this.byWi.get(e.workItemId) ?? [];
      const idx = arr.findIndex((x) => x.id === e.id);
      if (idx >= 0) arr[idx] = e;
      else arr.push(e);
      this.byWi.set(e.workItemId, arr);
      ids.push(e.id);
    }
    this.bus.emit({ type: 'timerEntry', ids, reason: 'upsert' });
  }
}

class InMemoryPRs implements PullRequestRepository {
  private items: PullRequest[] = [];
  private bus = new EventBus();
  on(listener: (ev: { type: 'pullRequest'; ids: Array<ID> }) => void) {
    return this.bus.on((ev) => {
      if (ev.type === 'pullRequest') listener({ type: 'pullRequest', ids: ev.ids });
    });
  }
  async listMine(): Promise<PullRequest[]> {
    return this.items;
  }
  async upsert(items: PullRequest[]): Promise<void> {
    const ids: ID[] = [];
    for (const p of items) {
      const idx = this.items.findIndex((x) => x.id === p.id);
      if (idx >= 0) this.items[idx] = p;
      else this.items.push(p);
      ids.push(p.id);
    }
    this.bus.emit({ type: 'pullRequest', ids, reason: 'upsert' });
  }
}

export function createMemoryRepository(): RepositoryProvider {
  return {
    workItems: new InMemoryWorkItems(),
    comments: new InMemoryComments(),
    timers: new InMemoryTimers(),
    pullRequests: new InMemoryPRs(),
  } as RepositoryProvider;
}
