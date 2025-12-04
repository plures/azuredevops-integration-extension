import { describe, it, expect } from 'vitest';
import { WorkItemTimer } from '../src/timer.js';

describe('WorkItemTimer inactivity auto-pause', () => {
  it(
    'pauses due to inactivity after timeout',
    () =>
      new Promise<void>((done) => {
        // configure short timeout and frequent checks for test
        let warnCalled = false;
        const timer = new WorkItemTimer({
          inactivityTimeoutSec: 1,
          inactivityCheckMs: 200,
          onWarn: (_m) => {
            warnCalled = true;
          },
        });
        timer.start(1, 'Test');
        // Wait long enough for inactivity check to run
        setTimeout(() => {
          try {
            expect(warnCalled).to.equal(true);
            done();
          } catch (e) {
            done(e as any);
          }
        }, 1600);
      }),
    5000
  );
});
