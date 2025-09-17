import { expect } from 'chai';
import { WorkItemTimer } from '../src/timer.ts';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

describe('WorkItemTimer (basic)', function () {
  it('start -> stop produces a time entry', async function () {
    const persisted: any = { state: undefined, entries: [] };
    const timer = new WorkItemTimer({
      persist: (p) => {
        persisted.state = p.state;
        persisted.entries = p.timeEntries;
      },
      restorePersisted: () => ({ state: undefined, timeEntries: [] }),
      inactivityTimeoutSec: 60, // disable auto pause
    });

    timer.start(42, 'Test WI');
    await sleep(1100);
    const res = timer.stop();
    expect(res).to.have.property('duration').that.is.a('number');
    const entries = timer.getTimeEntries();
    expect(entries.length).to.be.greaterThan(0);
  }).timeout(5000);
});
