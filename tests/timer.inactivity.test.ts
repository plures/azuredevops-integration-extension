import { expect } from 'chai';
import { WorkItemTimer } from '../src/timer';

describe('WorkItemTimer inactivity auto-pause', function () {
  it('pauses due to inactivity after timeout', function (done) {
    // configure short timeout and frequent checks for test
    let warnCalled = false;
    const timer = new WorkItemTimer({
      inactivityTimeoutSec: 1,
      inactivityCheckMs: 200,
      onWarn: (m) => { warnCalled = true; }
    });
    timer.start(1, 'Test');
    // Wait long enough for inactivity check to run
    setTimeout(() => {
      try {
        expect(warnCalled).to.equal(true);
        done();
      } catch (e) { done(e); }
    }, 1600);
  }).timeout(5000);
});
