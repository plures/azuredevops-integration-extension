import { expect } from 'chai';
import { WorkItemTimer } from '../src/timer.js';

describe('WorkItemTimer activity resume', function () {
  it('resumes timer after activity ping when paused due to inactivity', function (done) {
    let state: any = undefined;
    const infoMessages: string[] = [];

    const timer = new WorkItemTimer({
      inactivityTimeoutSec: 1, // Short timeout for testing
      inactivityCheckMs: 200, // Check frequently
      autoResumeOnActivity: true,
      onState: (s) => {
        state = s;
      },
      onInfo: (m) => {
        infoMessages.push(m);
      },
    });

    timer.start(1, 'Test Work Item');

    // Wait for timer to be paused due to inactivity
    setTimeout(() => {
      // Verify timer is paused due to inactivity
      expect(state?.isPaused).to.equal(true);
      expect((state as any)?.pausedDueToInactivity).to.equal(true);

      // Send activity ping to resume timer
      timer.activityPing();

      // Timer should now be resumed
      setTimeout(() => {
        expect(state?.isPaused).to.equal(false);
        expect((state as any)?.pausedDueToInactivity).to.be.undefined;
        expect(infoMessages).to.include('Timer resumed due to activity');
        done();
      }, 100);
    }, 1300);
  }).timeout(5000);

  it('does not resume timer after activity ping if paused manually', function (done) {
    let state: any = undefined;
    const infoMessages: string[] = [];

    const timer = new WorkItemTimer({
      autoResumeOnActivity: true,
      onState: (s) => {
        state = s;
      },
      onInfo: (m) => {
        infoMessages.push(m);
      },
    });

    timer.start(1, 'Test Work Item');

    // Manually pause the timer
    timer.pause(true);

    setTimeout(() => {
      // Verify timer is paused but not due to inactivity
      expect(state?.isPaused).to.equal(true);
      expect((state as any)?.pausedDueToInactivity).to.be.undefined;

      // Send activity ping - should not resume
      timer.activityPing();

      // Timer should still be paused
      setTimeout(() => {
        expect(state?.isPaused).to.equal(true);
        expect(infoMessages).to.not.include('Timer resumed due to activity');
        done();
      }, 100);
    }, 100);
  }).timeout(2000);
});
