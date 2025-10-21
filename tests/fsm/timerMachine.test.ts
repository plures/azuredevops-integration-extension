import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import { FSMManager } from '../../src/fsm/FSMManager';
import { createActor } from 'xstate';
import { timerMachine } from '../../src/fsm/machines/timerMachine';

describe('Timer State Machine', () => {
  let fsmManager: FSMManager;

  beforeEach(() => {
    // Set environment to disable inspector in tests
    process.env.NODE_ENV = 'test';
    fsmManager = new FSMManager();
    fsmManager.start();
  });

  afterEach(() => {
    fsmManager.stop();
  });

  describe('Basic Timer Operations', () => {
    it('should start in idle state', () => {
      const status = fsmManager.getStatus();
      expect(status.timerState).to.equal('idle');
      expect(status.isStarted).to.be.true;
    });

    it('should start timer successfully', () => {
      const result = fsmManager.startTimer(123, 'Test Work Item');
      expect(result).to.be.true;

      const status = fsmManager.getStatus();
      expect(status.timerState).to.equal('running');
      expect(status.timerContext?.workItemId).to.equal(123);
      expect(status.timerContext?.workItemTitle).to.equal('Test Work Item');
    });

    it('should not start timer when already running', () => {
      fsmManager.startTimer(123, 'Test Work Item');
      const result = fsmManager.startTimer(456, 'Another Work Item');

      expect(result).to.be.false;
      const status = fsmManager.getStatus();
      expect(status.timerContext?.workItemId).to.equal(123); // Should remain unchanged
    });

    it('should pause timer when running', () => {
      fsmManager.startTimer(123, 'Test Work Item');
      const result = fsmManager.pauseTimer();

      expect(result).to.be.true;
      const status = fsmManager.getStatus();
      expect(status.timerState).to.equal('paused');
      expect(status.timerContext?.isPaused).to.be.true;
    });

    it('should resume timer when paused', () => {
      fsmManager.startTimer(123, 'Test Work Item');
      fsmManager.pauseTimer();
      const result = fsmManager.resumeTimer();

      expect(result).to.be.true;
      const status = fsmManager.getStatus();
      expect(status.timerState).to.equal('running');
      expect(status.timerContext?.isPaused).to.be.false;
    });

    it('should stop timer and return result', () => {
      fsmManager.startTimer(123, 'Test Work Item');
      const result = fsmManager.stopTimer();

      expect(result).to.not.be.null;
      expect(result.workItemId).to.equal(123);
      expect(result.duration).to.be.a('number');
      expect(result.hoursDecimal).to.be.a('number');

      const status = fsmManager.getStatus();
      expect(status.timerState).to.equal('idle');
    });

    it('should handle activity pings', () => {
      fsmManager.startTimer(123, 'Test Work Item');

      // Should not throw error
      expect(() => fsmManager.activityPing()).to.not.throw();

      const status = fsmManager.getStatus();
      expect(status.timerContext?.lastActivity).to.be.a('number');
    });
  });

  describe('Timer Snapshot', () => {
    it('should return undefined when no timer is running', () => {
      const snapshot = fsmManager.getTimerSnapshot();
      expect(snapshot).to.be.undefined;
    });

    it('should return timer details when running', () => {
      fsmManager.startTimer(123, 'Test Work Item');
      const snapshot = fsmManager.getTimerSnapshot();

      expect(snapshot).to.not.be.undefined;
      expect(snapshot.workItemId).to.equal(123);
      expect(snapshot.workItemTitle).to.equal('Test Work Item');
      expect(snapshot.elapsedSeconds).to.be.a('number');
      expect(snapshot.isPaused).to.be.false;
      expect(snapshot.running).to.be.true;
    });

    it('should show paused state in snapshot', () => {
      fsmManager.startTimer(123, 'Test Work Item');
      fsmManager.pauseTimer();
      const snapshot = fsmManager.getTimerSnapshot();

      expect(snapshot.isPaused).to.be.true;
      expect(snapshot.running).to.be.false;
    });
  });

  describe('Timer State Transitions', () => {
    it('should follow correct state flow: idle -> running -> paused -> running -> idle', () => {
      // Start: idle -> running
      expect(fsmManager.getStatus().timerState).to.equal('idle');
      fsmManager.startTimer(123, 'Test Work Item');
      expect(fsmManager.getStatus().timerState).to.equal('running');

      // Pause: running -> paused
      fsmManager.pauseTimer();
      expect(fsmManager.getStatus().timerState).to.equal('paused');

      // Resume: paused -> running
      fsmManager.resumeTimer();
      expect(fsmManager.getStatus().timerState).to.equal('running');

      // Stop: running -> idle
      fsmManager.stopTimer();
      expect(fsmManager.getStatus().timerState).to.equal('idle');
    });

    it('should handle activity-based resume from paused state', () => {
      fsmManager.startTimer(123, 'Test Work Item');
      fsmManager.pauseTimer();

      // Simulate activity ping when paused
      fsmManager.activityPing();

      // Should transition back to running
      const status = fsmManager.getStatus();
      expect(status.timerState).to.equal('running');
    });
  });

  describe('Error Handling', () => {
    it('should handle operations on stopped FSM gracefully', () => {
      fsmManager.stop();

      expect(fsmManager.startTimer(123, 'Test')).to.be.false;
      expect(fsmManager.pauseTimer()).to.be.false;
      expect(fsmManager.resumeTimer()).to.be.false;
      expect(fsmManager.stopTimer()).to.be.null;

      // Activity ping should not throw
      expect(() => fsmManager.activityPing()).to.not.throw();
    });
  });
});

describe('Timer Machine Direct Tests', () => {
  it('should work with direct machine actor', () => {
    const actor = createActor(timerMachine);
    actor.start();

    expect(actor.getSnapshot().value).to.equal('idle');

    // Start timer
    actor.send({ type: 'START', workItemId: 456, workItemTitle: 'Direct Test' });
    expect(actor.getSnapshot().value).to.equal('running');
    expect(actor.getSnapshot().context.workItemId).to.equal(456);

    // Pause timer
    actor.send({ type: 'PAUSE' });
    expect(actor.getSnapshot().value).to.equal('paused');
    expect(actor.getSnapshot().context.isPaused).to.be.true;

    // Stop timer
    actor.send({ type: 'STOP' });
    expect(actor.getSnapshot().value).to.equal('idle');
    expect(actor.getSnapshot().context.workItemId).to.be.undefined;

    actor.stop();
  });
});
