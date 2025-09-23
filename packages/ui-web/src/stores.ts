// Lightweight store pattern to avoid adding svelte as a dependency here.
// The apps (extension/web) can wrap these with actual Svelte stores.

// Minimal local copies of types to avoid cross-package TS path issues in the skeleton stage.
type ID = string | number;
export interface WorkItem {
  id: ID;
  title: string;
  state: string;
  assignedTo?: string;
  tags?: string[];
  iteration?: string;
  area?: string;
  updated?: string;
}

export interface RepositoryProvider {
  workItems: {
    query(filters?: Record<string, unknown>): Promise<WorkItem[]>;
    on(listener: () => void): () => void;
  };
}

type Subscriber<T> = (value: T) => void;

class ReadableStore<T> {
  private value: T;
  private subs: Set<Subscriber<T>> = new Set();
  constructor(initial: T) {
    this.value = initial;
  }
  subscribe(fn: Subscriber<T>) {
    this.subs.add(fn);
    fn(this.value);
    return () => {
      const deleted = this.subs.delete(fn);
      if (deleted) {
        // noop
      }
    };
  }
  protected set(v: T) {
    this.value = v;
    // Copy subscribers to avoid mutation issues during iteration
    const subsSnapshot = Array.from(this.subs);
    for (const s of subsSnapshot) {
      try {
        s(v);
      } catch {
        // Never let one subscriber break the chain
      }
    }
  }
}

export class WorkItemsView extends ReadableStore<WorkItem[]> {
  private unlisten: (() => void) | null = null;
  constructor(private repo: RepositoryProvider) {
    super([]);
  }
  async init() {
    const items = await this.repo.workItems.query();
    this.set(items);
    this.unlisten = this.repo.workItems.on(async () => {
      const fresh = await this.repo.workItems.query();
      this.set(fresh);
    });
    return () => this.dispose();
  }
  dispose() {
    if (this.unlisten) this.unlisten();
    this.unlisten = null;
  }
}

// Filters and derived visible items view
export interface Filters {
  assignee?: string;
  tags?: string[];
}

class WritableStore<T> extends ReadableStore<T> {
  setValue(v: T) {
    // expose a setter for external updates (e.g., UI interactions)
    // accessing protected via class method is allowed
    console.log('[stores] Writable.setValue', v);
    this.set(v);
  }
}

export class FiltersStore extends WritableStore<Filters> {
  constructor(initial: Filters = {}) {
    super(initial);
  }
}

export class VisibleWorkItemsView extends ReadableStore<WorkItem[]> {
  private unsubscribers: Array<() => void> = [];
  private currentItems: WorkItem[] = [];
  private currentFilters: Filters = {};

  constructor(itemsView: WorkItemsView, filters: FiltersStore) {
    super([]);
    // Subscribe to items and filters
    const onItems = (items: WorkItem[]) => {
      this.currentItems = items;
      this.recompute();
    };
    const unsubItems = itemsView.subscribe(onItems);
    const onFilters = (f: Filters) => {
      this.currentFilters = f;
      this.recompute();
    };
    const unsubFilters = filters.subscribe(onFilters);
    this.unsubscribers.push(unsubItems, unsubFilters);
  }

  private recompute() {
    const { assignee, tags } = this.currentFilters;
    let out = this.currentItems;
    if (assignee && assignee.length > 0) {
      out = out.filter((w) => (w.assignedTo ?? '').toLowerCase() === assignee.toLowerCase());
    }
    if (tags && tags.length > 0) {
      out = out.filter((w) => {
        const wt = new Set((w.tags ?? []).map((t) => t.toLowerCase()));
        return tags.every((t) => wt.has(t.toLowerCase()));
      });
    }
    this.set(out);
  }

  dispose() {
    for (const u of this.unsubscribers) u();
    this.unsubscribers = [];
  }
}
