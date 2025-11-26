import { expect } from 'chai';
import { WorkItemTimer } from '../src/timer.ts';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

describe('WorkItemTimer (basic)', () => {
  it('start -> stop produces a time entry', async () => {
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
  }, 5000);

  it('timeReport Today includes entries spanning midnight with overlap only', () => {
    // Fixed clock just after midnight (use a fixed instant; timezone-insensitive expectation computed from report window)
    const jan2MidnightPlus1h = new Date('2025-01-02T01:00:00Z').getTime();
    const persisted: any = { state: undefined, entries: [] };
    const timer = new WorkItemTimer({
      now: () => jan2MidnightPlus1h,
      persist: (p) => {
        persisted.state = p.state;
        persisted.entries = p.timeEntries;
      },
      restorePersisted: () => ({ state: undefined, timeEntries: [] }),
      inactivityTimeoutSec: 60,
    });

    // Simulate an entry that started before midnight on Jan 1 23:30 and lasted 90 minutes, ending at Jan 2 01:00
    const start = new Date('2025-01-01T23:30:00Z').getTime();
    const end = new Date('2025-01-02T01:00:00Z').getTime();
    (timer as any)._timeEntries.push({
      workItemId: 100,
      startTime: start,
      endTime: end,
      duration: (end - start) / 1000,
    });

    const report = (timer as any).timeReport('Today');
    const bucket = report.buckets.get(100);
    expect(bucket).to.exist;
    const from = report.from as number;
    const to = report.to as number;
    const expectedOverlap = Math.max(0, Math.min(end, to) - Math.max(start, from)) / 1000;
    expect(Math.round(bucket.total)).to.equal(Math.round(expectedOverlap));
  });

  it('timeReport filters to period window using timer.now for week/month', () => {
    // Set "now" to mid-month Wednesday
    const now = new Date('2025-05-14T12:00:00Z').getTime();
    const timer = new WorkItemTimer({ now: () => now, restorePersisted: () => ({}) as any });

    // Entry entirely last month should not overlap "This Month"
    (timer as any)._timeEntries.push({
      workItemId: 1,
      startTime: new Date('2025-04-10T10:00:00Z').getTime(),
      endTime: new Date('2025-04-10T11:00:00Z').getTime(),
      duration: 3600,
    });

    // Entry entirely this month
    (timer as any)._timeEntries.push({
      workItemId: 2,
      startTime: new Date('2025-05-10T09:00:00Z').getTime(),
      endTime: new Date('2025-05-10T10:30:00Z').getTime(),
      duration: 5400,
    });

    const monthReport = (timer as any).timeReport('This Month');
    const fromM = monthReport.from as number;
    const toM = monthReport.to as number;
    expect(monthReport.buckets.has(1)).to.equal(false);
    const b2 = monthReport.buckets.get(2);
    expect(Math.round(b2.total)).to.equal(
      Math.round(
        Math.max(
          0,
          Math.min(new Date('2025-05-10T10:30:00Z').getTime(), toM) -
            Math.max(new Date('2025-05-10T09:00:00Z').getTime(), fromM)
        ) / 1000
      )
    );

    // For This Week, construct an entry relative to the computed window to avoid timezone ambiguities
    const weekTimer = new WorkItemTimer({ now: () => new Date('2025-05-14T12:00:00Z').getTime() });
    // First compute the window start/end
    const windowProbe = (weekTimer as any).timeReport('This Week');
    const fromW = windowProbe.from as number;
    const toW = windowProbe.to as number;
    // Create an entry that overlaps the first 30 minutes of the week
    const s = fromW - 30 * 60 * 1000; // 30m before week start
    const e = fromW + 30 * 60 * 1000; // 30m after week start
    (weekTimer as any)._timeEntries.push({
      workItemId: 3,
      startTime: s,
      endTime: e,
      duration: (e - s) / 1000,
    });
    const weekReport = (weekTimer as any).timeReport('This Week');
    const b3 = weekReport.buckets.get(3);
    const exp = Math.max(0, Math.min(e, toW) - Math.max(s, fromW)) / 1000;
    expect(Math.round(b3.total)).to.equal(Math.round(exp));
  });
});
