import { expect } from 'chai';
import { WorkItemTimer } from '../src/timer.ts';

describe('WorkItemTimer persistence', () => {
  it('persists state and restores correctly', () => {
    const store: any = { state: undefined, entries: [] };
    const timer = new WorkItemTimer({
      persist: (p) => {
        store.state = p.state;
        store.timeEntries = p.timeEntries;
      },
      restorePersisted: () => ({ state: store.state, timeEntries: store.timeEntries }),
    });

    timer.start(77, 'Persist test');
    // Simulate some elapsed time
    const snap = timer.snapshot();
    expect(snap).to.have.property('workItemId', 77);
    // Persist was called in start; now instantiate a new timer and restore
    const t2 = new WorkItemTimer({
      persist: () => {},
      restorePersisted: () => ({ state: store.state, timeEntries: store.timeEntries }),
    });
    t2.loadFromPersisted();
    const s2 = t2.snapshot();
    expect(s2).to.have.property('workItemId', 77);
  });
});
