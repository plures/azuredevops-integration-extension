import { expect } from 'chai';

// Import directly from source paths using ts-node/esm loader
import { createMemoryRepository } from '../packages/core/src/memoryRepo.ts';
import type { WorkItem } from '../packages/core/src/types.ts';
import type { RepositoryProvider as CoreRepoProvider } from '../packages/core/src/repository.ts';
import {
  WorkItemsView,
  FiltersStore,
  VisibleWorkItemsView,
} from '../packages/ui-web/src/stores.ts';

// Helper to collect the latest value from a store subscription
function once<T>(fn: (cb: (v: T) => void) => () => void): Promise<T> {
  return new Promise<T>((resolve) => {
    let unsub: undefined | (() => void);
    const cb = (v: T) => {
      // If subscribe calls back synchronously before unsub is assigned,
      // defer the unsubscribe to the next tick.
      if (unsub) unsub();
      else setTimeout(() => unsub && unsub(), 0);
      resolve(v);
    };
    unsub = fn(cb);
  });
}

function nextAfter<T>(fn: (cb: (v: T) => void) => () => void, trigger: () => void): Promise<T> {
  return new Promise<T>((resolve) => {
    let first = true;
    let unsub: undefined | (() => void);
    const cb = (v: T) => {
      if (first) {
        first = false;
        return; // ignore the immediate current value
      }
      if (unsub) unsub();
      else setTimeout(() => unsub && unsub(), 0);
      resolve(v);
    };
    unsub = fn(cb);
    // Trigger after subscription so we capture the change emission
    trigger();
  });
}

describe('UI reactivity demo (memory repo + stores)', () => {
  it('propagates repo changes and filter updates', async function () {
    this.timeout(8000);
    const repo = createMemoryRepository() as unknown as CoreRepoProvider;

    // Seed a few work items
    const seed: WorkItem[] = [
      { id: 1, title: 'Fix login bug', state: 'Active', assignedTo: 'Alex', tags: ['bug', 'auth'] },
      {
        id: 2,
        title: 'Implement Kanban',
        state: 'Active',
        assignedTo: 'Sam',
        tags: ['feature', 'ui'],
      },
      {
        id: 3,
        title: 'Refactor timer',
        state: 'Resolved',
        assignedTo: 'Alex',
        tags: ['tech-debt'],
      },
    ];
    // Type cast to any to avoid importing concrete repo class
    await (repo.workItems as any).upsert(seed);

    const itemsView = new WorkItemsView({
      workItems: {
        // delegate to core repo; ignore event payload parameter
        on: (listener: () => void) => repo.workItems.on(() => listener()),
        query: () => repo.workItems.query(),
      },
    });
    await itemsView.init();

    const filters = new FiltersStore();
    const visible = new VisibleWorkItemsView(itemsView, filters);

    // Initial: all items visible
    const initial = await once<WorkItem[]>((cb) => visible.subscribe(cb));
    console.log(
      '[ui-reactivity] initial visible ids =',
      initial.map((w) => w.id)
    );
    expect(initial.map((w) => w.id).sort()).to.deep.equal([1, 2, 3]);

    // Apply an assignee filter
    const afterAssignee = await nextAfter<WorkItem[]>(
      (cb) => visible.subscribe(cb),
      () => {
        filters.setValue({ assignee: 'Alex' });
      }
    );
    console.log(
      '[ui-reactivity] after assignee filter ids =',
      afterAssignee.map((w) => w.id)
    );
    expect(afterAssignee.map((w) => w.id).sort()).to.deep.equal([1, 3]);

    // Add a new item for Alex; view should react
    const afterUpsert = await nextAfter<WorkItem[]>(
      (cb) => visible.subscribe(cb),
      () => {
        void (repo.workItems as any).upsert([
          { id: 4, title: 'Docs', state: 'Active', assignedTo: 'Alex', tags: ['docs'] },
        ]);
      }
    );
    console.log(
      '[ui-reactivity] after upsert ids =',
      afterUpsert.map((w) => w.id)
    );
    expect(afterUpsert.map((w) => w.id).sort()).to.deep.equal([1, 3, 4]);

    // Add a tag filter that excludes id 3 (no matching tag), includes 1 (bug)
    const afterTags = await nextAfter<WorkItem[]>(
      (cb) => visible.subscribe(cb),
      () => {
        filters.setValue({ assignee: 'Alex', tags: ['bug'] });
      }
    );
    console.log(
      '[ui-reactivity] after tags filter ids =',
      afterTags.map((w) => w.id)
    );
    expect(afterTags.map((w) => w.id).sort()).to.deep.equal([1]);

    // Cleanup
    visible.dispose();
    itemsView.dispose();
  });
});
