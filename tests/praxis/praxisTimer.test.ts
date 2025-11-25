/**
 * Praxis Timer Tests
 *
 * Tests for the Praxis-based timer implementation.
 * These tests mirror the existing XState timer tests for compatibility validation.
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { PraxisTimerManager } from '../../src/praxis/timer/manager';

describe('Praxis Timer Manager', () => {
  let timerManager: PraxisTimerManager;

  beforeEach(() => {
    timerManager = new PraxisTimerManager();
    timerManager.start();
  });

  afterEach(() => {
    timerManager.stop();
  });

  describe('Basic Timer Operations', () => {
    it('should start in idle state', () => {
      const status = timerManager.getStatus();
      expect(status.timerState).toBe('idle');
      expect(status.isStarted).toBe(true);
    });

    it('should start timer successfully', () => {
      const result = timerManager.startTimer(123, 'Test Work Item');
      expect(result).toBe(true);

      const status = timerManager.getStatus();
      expect(status.timerState).toBe('running');
      expect(status.timerContext?.workItemId).toBe(123);
      expect(status.timerContext?.workItemTitle).toBe('Test Work Item');
    });

    it('should not start timer when already running', () => {
      timerManager.startTimer(123, 'Test Work Item');
      const result = timerManager.startTimer(456, 'Another Work Item');

      expect(result).toBe(false);
      const status = timerManager.getStatus();
      expect(status.timerContext?.workItemId).toBe(123); // Should remain unchanged
    });

    it('should pause timer when running', () => {
      timerManager.startTimer(123, 'Test Work Item');
      const result = timerManager.pauseTimer();

      expect(result).toBe(true);
      const status = timerManager.getStatus();
      expect(status.timerState).toBe('paused');
      expect(status.timerContext?.isPaused).toBe(true);
    });

    it('should resume timer when paused', () => {
      timerManager.startTimer(123, 'Test Work Item');
      timerManager.pauseTimer();
      const result = timerManager.resumeTimer();

      expect(result).toBe(true);
      const status = timerManager.getStatus();
      expect(status.timerState).toBe('running');
      expect(status.timerContext?.isPaused).toBe(false);
    });

    it('should stop timer and return result', () => {
      timerManager.startTimer(123, 'Test Work Item');
      const result = timerManager.stopTimer();

      expect(result).not.toBeNull();
      expect(result!.workItemId).toBe(123);
      expect(result!.duration).toBeTypeOf('number');
      expect(result!.hoursDecimal).toBeTypeOf('number');

      const status = timerManager.getStatus();
      expect(status.timerState).toBe('idle');
    });

    it('should handle activity pings', () => {
      timerManager.startTimer(123, 'Test Work Item');

      // Should not throw error
      expect(() => timerManager.activityPing()).not.toThrow();

      const status = timerManager.getStatus();
      expect(status.timerContext?.lastActivity).toBeTypeOf('number');
    });
  });

  describe('Timer Snapshot', () => {
    it('should return undefined when no timer is running', () => {
      const snapshot = timerManager.getTimerSnapshot();
      expect(snapshot).toBeUndefined();
    });

    it('should return timer details when running', () => {
      timerManager.startTimer(123, 'Test Work Item');
      const snapshot = timerManager.getTimerSnapshot();

      expect(snapshot).not.toBeUndefined();
      expect(snapshot!.workItemId).toBe(123);
      expect(snapshot!.workItemTitle).toBe('Test Work Item');
      expect(snapshot!.elapsedSeconds).toBeTypeOf('number');
      expect(snapshot!.isPaused).toBe(false);
      expect(snapshot!.running).toBe(true);
    });

    it('should show paused state in snapshot', () => {
      timerManager.startTimer(123, 'Test Work Item');
      timerManager.pauseTimer();
      const snapshot = timerManager.getTimerSnapshot();

      expect(snapshot!.isPaused).toBe(true);
      expect(snapshot!.running).toBe(false);
    });
  });

  describe('Timer State Transitions', () => {
    it('should follow correct state flow: idle -> running -> paused -> running -> idle', () => {
      // Start: idle -> running
      expect(timerManager.getStatus().timerState).toBe('idle');
      timerManager.startTimer(123, 'Test Work Item');
      expect(timerManager.getStatus().timerState).toBe('running');

      // Pause: running -> paused
      timerManager.pauseTimer();
      expect(timerManager.getStatus().timerState).toBe('paused');

      // Resume: paused -> running
      timerManager.resumeTimer();
      expect(timerManager.getStatus().timerState).toBe('running');

      // Stop: running -> idle
      timerManager.stopTimer();
      expect(timerManager.getStatus().timerState).toBe('idle');
    });

    it('should handle activity-based resume from paused state', () => {
      timerManager.startTimer(123, 'Test Work Item');
      timerManager.pauseTimer();

      // Simulate activity ping when paused
      timerManager.activityPing();

      // Should transition back to running
      const status = timerManager.getStatus();
      expect(status.timerState).toBe('running');
    });
  });

  describe('Inactivity Timeout', () => {
    it('should pause timer on inactivity timeout', () => {
      timerManager.startTimer(123, 'Test Work Item');
      timerManager.inactivityTimeout();

      const status = timerManager.getStatus();
      expect(status.timerState).toBe('paused');
      expect(status.timerContext?.isPaused).toBe(true);
    });

    it('should not pause already paused timer', () => {
      timerManager.startTimer(123, 'Test Work Item');
      timerManager.pauseTimer();
      timerManager.inactivityTimeout();

      const status = timerManager.getStatus();
      expect(status.timerState).toBe('paused');
    });
  });

  describe('Timer Restore', () => {
    it('should restore timer from persisted state', () => {
      const startTime = Date.now() - 60000; // 1 minute ago
      const result = timerManager.restoreTimer(456, 'Restored Work Item', startTime, false);

      expect(result).toBe(true);
      const status = timerManager.getStatus();
      expect(status.timerState).toBe('running');
      expect(status.timerContext?.workItemId).toBe(456);
      expect(status.timerContext?.workItemTitle).toBe('Restored Work Item');
    });

    it('should restore paused timer from persisted state', () => {
      const startTime = Date.now() - 60000;
      const result = timerManager.restoreTimer(456, 'Restored Work Item', startTime, true);

      expect(result).toBe(true);
      const status = timerManager.getStatus();
      expect(status.timerState).toBe('paused');
      expect(status.timerContext?.isPaused).toBe(true);
    });

    it('should not restore when timer is already running', () => {
      timerManager.startTimer(123, 'Test Work Item');
      const result = timerManager.restoreTimer(456, 'Another Work Item', Date.now(), false);

      expect(result).toBe(false);
      const status = timerManager.getStatus();
      expect(status.timerContext?.workItemId).toBe(123);
    });
  });

  describe('Error Handling', () => {
    it('should handle operations on stopped manager gracefully', () => {
      timerManager.stop();

      expect(timerManager.startTimer(123, 'Test')).toBe(false);
      expect(timerManager.pauseTimer()).toBe(false);
      expect(timerManager.resumeTimer()).toBe(false);
      expect(timerManager.stopTimer()).toBeNull();

      // Activity ping should not throw
      expect(() => timerManager.activityPing()).not.toThrow();
    });

    it('should not pause when not running', () => {
      const result = timerManager.pauseTimer();
      expect(result).toBe(false);
    });

    it('should not resume when not paused', () => {
      timerManager.startTimer(123, 'Test Work Item');
      const result = timerManager.resumeTimer();
      expect(result).toBe(false);
    });
  });

  describe('Cap Enforcement', () => {
    it('should apply cap when elapsed time exceeds limit', () => {
      const customManager = new PraxisTimerManager({
        defaultElapsedLimitHours: 0.001, // Very small limit for testing
      });
      customManager.start();

      // Start with a start time in the past to simulate long running timer
      customManager.restoreTimer(123, 'Test', Date.now() - 3600000, false); // 1 hour ago

      const result = customManager.stopTimer();
      expect(result).not.toBeNull();
      expect(result!.capApplied).toBe(true);
      expect(result!.capLimitHours).toBe(0.001);

      customManager.stop();
    });
  });
});

describe('Praxis Timer Engine Direct Tests', () => {
  it('should work with createTimerEngine', async () => {
    const { createTimerEngine } = await import('../../src/praxis/timer/engine');
    const { StartTimerEvent } = await import('../../src/praxis/timer/facts');

    const engine = createTimerEngine();

    // Initial state should be idle
    expect(engine.getContext().timerState).toBe('idle');

    // Start timer
    engine.step([StartTimerEvent.create({ workItemId: 456, workItemTitle: 'Direct Test' })]);

    expect(engine.getContext().timerState).toBe('running');
    expect(engine.getContext().timerData.workItemId).toBe(456);
  });
});
