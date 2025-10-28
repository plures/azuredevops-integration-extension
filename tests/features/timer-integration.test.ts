/**
 * Timer Feature Integration Tests
 *
 * Tests the complete timer feature including:
 * - Start/stop/pause/resume
 * - Persistence and restoration
 * - State transitions
 * - Integration with FSM
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createActor } from 'xstate';
import { timerMachine } from '../../src/features/timer/machine';

describe('Timer Feature Integration', () => {
  describe('Basic Timer Operations', () => {
    let timerActor: any;

    beforeEach(() => {
      timerActor = createActor(timerMachine).start();
    });

    it('should start in idle state', () => {
      const snapshot = timerActor.getSnapshot();
      expect(snapshot.value).toBe('idle');
      expect(snapshot.context.workItemId).toBeUndefined();
      expect(snapshot.context.startTime).toBeUndefined();
    });

    it('should transition to running when START event is sent', () => {
      timerActor.send({
        type: 'START',
        workItemId: 123,
        workItemTitle: 'Test Item',
      });

      const snapshot = timerActor.getSnapshot();
      expect(snapshot.value).toBe('running');
      expect(snapshot.context.workItemId).toBe(123);
      expect(snapshot.context.workItemTitle).toBe('Test Item');
      expect(snapshot.context.startTime).toBeGreaterThan(0);
      expect(snapshot.context.isPaused).toBe(false);
    });

    it('should calculate elapsed time from startTime', () => {
      const startTime = Date.now();
      timerActor.send({ type: 'START', workItemId: 123, workItemTitle: 'Test' });

      // Wait a bit
      const snapshot = timerActor.getSnapshot();
      const elapsed = Math.floor((Date.now() - snapshot.context.startTime) / 1000);

      expect(elapsed).toBeGreaterThanOrEqual(0);
      expect(snapshot.context.startTime).toBeGreaterThanOrEqual(startTime);
    });

    it('should pause timer when PAUSE event is sent', () => {
      timerActor.send({ type: 'START', workItemId: 123, workItemTitle: 'Test' });
      timerActor.send({ type: 'PAUSE' });

      const snapshot = timerActor.getSnapshot();
      expect(snapshot.value).toBe('paused');
      expect(snapshot.context.isPaused).toBe(true);
      expect(snapshot.context.workItemId).toBe(123); // Still set
    });

    it('should stop timer and clear state when STOP event is sent', () => {
      timerActor.send({ type: 'START', workItemId: 123, workItemTitle: 'Test' });
      timerActor.send({ type: 'STOP' });

      const snapshot = timerActor.getSnapshot();
      expect(snapshot.value).toBe('idle');
      expect(snapshot.context.workItemId).toBeUndefined();
      expect(snapshot.context.startTime).toBeUndefined();
    });
  });

  describe('Timer Persistence and Restoration', () => {
    it('should restore timer with RESTORE event preserving startTime', () => {
      // Simulate saved state
      const savedStartTime = Date.now() - 60000; // 60 seconds ago
      const savedWorkItemId = 123;
      const savedWorkItemTitle = 'Persisted Timer';

      const timerActor = createActor(timerMachine).start();

      console.log('[TEST] Before RESTORE:', timerActor.getSnapshot().value);

      // Restore the timer
      try {
        timerActor.send({
          type: 'RESTORE',
          workItemId: savedWorkItemId,
          workItemTitle: savedWorkItemTitle,
          startTime: savedStartTime,
          isPaused: false,
        });
      } catch (error) {
        console.error('[TEST] RESTORE error:', error);
        throw error;
      }

      console.log('[TEST] After RESTORE:', timerActor.getSnapshot().value);
      const snapshot = timerActor.getSnapshot();
      expect(snapshot.value).toBe('running');
      expect(snapshot.context.workItemId).toBe(savedWorkItemId);
      expect(snapshot.context.workItemTitle).toBe(savedWorkItemTitle);
      expect(snapshot.context.startTime).toBe(savedStartTime); // CRITICAL: Preserves original time
      expect(snapshot.context.isPaused).toBe(false);
    });

    it('should restore timer in paused state when isPaused is true', () => {
      const savedStartTime = Date.now() - 120000; // 2 minutes ago

      const timerActor = createActor(timerMachine).start();

      timerActor.send({
        type: 'RESTORE',
        workItemId: 456,
        workItemTitle: 'Paused Timer',
        startTime: savedStartTime,
        isPaused: true,
      });

      const snapshot = timerActor.getSnapshot();
      expect(snapshot.value).toBe('paused');
      expect(snapshot.context.isPaused).toBe(true);
      expect(snapshot.context.startTime).toBe(savedStartTime);
    });

    it('should preserve elapsed time across save/restore cycle', () => {
      // Start a timer
      const actor1 = createActor(timerMachine).start();
      actor1.send({ type: 'START', workItemId: 789, workItemTitle: 'Test' });

      const snapshot1 = actor1.getSnapshot();
      const originalStartTime = snapshot1.context.startTime!;

      // Simulate persistence
      const persistedState = {
        workItemId: snapshot1.context.workItemId,
        workItemTitle: snapshot1.context.workItemTitle,
        startTime: snapshot1.context.startTime,
        isPaused: snapshot1.context.isPaused,
      };

      // Create new actor and restore
      const actor2 = createActor(timerMachine).start();
      actor2.send({
        type: 'RESTORE',
        workItemId: persistedState.workItemId!,
        workItemTitle: persistedState.workItemTitle!,
        startTime: persistedState.startTime!,
        isPaused: persistedState.isPaused!,
      });

      const snapshot2 = actor2.getSnapshot();
      expect(snapshot2.context.startTime).toBe(originalStartTime);

      // Elapsed time should be calculated from original start time
      const elapsed1 = Math.floor((Date.now() - originalStartTime) / 1000);
      const elapsed2 = Math.floor((Date.now() - snapshot2.context.startTime!) / 1000);
      expect(elapsed2).toBeGreaterThanOrEqual(elapsed1);
    });
  });

  describe('State Machine Contract', () => {
    it('should not allow START when timer is already running', () => {
      const timerActor = createActor(timerMachine).start();

      timerActor.send({ type: 'START', workItemId: 111, workItemTitle: 'First' });
      const snapshot1 = timerActor.getSnapshot();
      expect(snapshot1.value).toBe('running');
      expect(snapshot1.context.workItemId).toBe(111);

      // Try to start again with different work item
      timerActor.send({ type: 'START', workItemId: 222, workItemTitle: 'Second' });
      const snapshot2 = timerActor.getSnapshot();

      // Should remain with first work item (guard prevents transition)
      expect(snapshot2.value).toBe('running');
      expect(snapshot2.context.workItemId).toBe(111);
    });

    it('should only allow RESTORE when timer is idle', () => {
      const timerActor = createActor(timerMachine).start();

      // Start a timer
      timerActor.send({ type: 'START', workItemId: 111, workItemTitle: 'First' });

      // Try to restore while running (should be ignored by guard)
      timerActor.send({
        type: 'RESTORE',
        workItemId: 222,
        workItemTitle: 'Second',
        startTime: Date.now(),
        isPaused: false,
      });

      const snapshot = timerActor.getSnapshot();
      expect(snapshot.context.workItemId).toBe(111); // Unchanged
    });
  });

  describe('Timer Context', () => {
    it('should track lastActivity on ACTIVITY events', () => {
      const timerActor = createActor(timerMachine).start();
      timerActor.send({ type: 'START', workItemId: 123, workItemTitle: 'Test' });

      const before = timerActor.getSnapshot().context.lastActivity;

      // Wait a tiny bit
      setTimeout(() => {}, 10);

      timerActor.send({ type: 'ACTIVITY' });
      const after = timerActor.getSnapshot().context.lastActivity;

      expect(after).toBeGreaterThanOrEqual(before);
    });

    it('should maintain context fields across state transitions', () => {
      const timerActor = createActor(timerMachine).start();

      timerActor.send({ type: 'START', workItemId: 999, workItemTitle: 'Persistent' });
      const runningSnapshot = timerActor.getSnapshot();
      const originalStartTime = runningSnapshot.context.startTime;

      timerActor.send({ type: 'PAUSE' });
      const pausedSnapshot = timerActor.getSnapshot();

      // Context should persist across pause
      expect(pausedSnapshot.context.workItemId).toBe(999);
      expect(pausedSnapshot.context.workItemTitle).toBe('Persistent');
      expect(pausedSnapshot.context.startTime).toBe(originalStartTime);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle typical timer workflow: start -> work -> pause -> resume -> stop', () => {
      const timerActor = createActor(timerMachine).start();

      // User starts timer
      timerActor.send({ type: 'START', workItemId: 1, workItemTitle: 'Feature Work' });
      expect(timerActor.getSnapshot().value).toBe('running');

      // User takes a break
      timerActor.send({ type: 'PAUSE' });
      expect(timerActor.getSnapshot().value).toBe('paused');

      // User resumes work
      timerActor.send({ type: 'RESUME' });
      expect(timerActor.getSnapshot().value).toBe('running');

      // User finishes work
      timerActor.send({ type: 'STOP' });
      expect(timerActor.getSnapshot().value).toBe('idle');
    });

    it('should correctly exclude pause duration from elapsed time', () => {
      const timerActor = createActor(timerMachine).start();

      // Start timer
      const startTime = Date.now();
      timerActor.send({ type: 'START', workItemId: 1, workItemTitle: 'Test' });
      const snapshot1 = timerActor.getSnapshot();
      const originalStartTime = snapshot1.context.startTime!;

      // Wait 100ms of active time
      const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      return wait(100).then(() => {
        // Pause timer
        timerActor.send({ type: 'PAUSE' });
        const snapshot2 = timerActor.getSnapshot();
        expect(snapshot2.context.isPaused).toBe(true);
        expect(snapshot2.context.pausedAt).toBeDefined();
        const pausedAt = snapshot2.context.pausedAt!;

        // Calculate elapsed time before pause (should be ~100ms)
        const elapsedBeforePause = Date.now() - originalStartTime;

        // Wait 200ms while paused (this should NOT count toward elapsed time)
        return wait(200).then(() => {
          // Resume timer
          timerActor.send({ type: 'RESUME' });
          const snapshot3 = timerActor.getSnapshot();
          expect(snapshot3.context.isPaused).toBe(false);
          expect(snapshot3.context.pausedAt).toBeUndefined();

          // The startTime should have been adjusted forward by the pause duration
          const pauseDuration = Date.now() - pausedAt;
          const adjustedStartTime = snapshot3.context.startTime!;

          // Adjusted start time should be approximately: originalStartTime + pauseDuration
          // This ensures elapsed time (now - adjustedStartTime) excludes the pause
          expect(adjustedStartTime).toBeGreaterThan(originalStartTime);
          expect(adjustedStartTime).toBeCloseTo(originalStartTime + pauseDuration, -1); // Within 10ms

          // Current elapsed time should be approximately equal to time before pause
          // (plus a small amount for the resume operation itself)
          const currentElapsed = Date.now() - adjustedStartTime;
          expect(currentElapsed).toBeLessThan(elapsedBeforePause + 50); // Small tolerance
          expect(currentElapsed).toBeGreaterThanOrEqual(0);
        });
      });
    });

    it('should handle VSCode restart scenario with persistence', () => {
      // Scenario: User starts timer, closes VSCode, reopens VSCode

      // Session 1: Start timer
      const session1Actor = createActor(timerMachine).start();
      session1Actor.send({ type: 'START', workItemId: 42, workItemTitle: 'Bug Fix' });

      const session1Snapshot = session1Actor.getSnapshot();
      const persistedData = {
        workItemId: session1Snapshot.context.workItemId,
        workItemTitle: session1Snapshot.context.workItemTitle,
        startTime: session1Snapshot.context.startTime,
        isPaused: session1Snapshot.context.isPaused,
        state: session1Snapshot.value,
      };

      session1Actor.stop();

      // Session 2: VSCode reopens, restore timer
      const session2Actor = createActor(timerMachine).start();
      session2Actor.send({
        type: 'RESTORE',
        workItemId: persistedData.workItemId!,
        workItemTitle: persistedData.workItemTitle!,
        startTime: persistedData.startTime!,
        isPaused: persistedData.isPaused!,
      });

      const session2Snapshot = session2Actor.getSnapshot();
      expect(session2Snapshot.value).toBe(persistedData.state);
      expect(session2Snapshot.context.workItemId).toBe(42);
      expect(session2Snapshot.context.startTime).toBe(persistedData.startTime);

      // Elapsed time should be calculated from original start time
      const elapsed = Math.floor((Date.now() - session2Snapshot.context.startTime!) / 1000);
      expect(elapsed).toBeGreaterThanOrEqual(0);
    });

    it('should not count pause duration in elapsed time', async () => {
      const timerActor = createActor(timerMachine).start();

      // Start timer
      timerActor.send({ type: 'START', workItemId: 100, workItemTitle: 'Pause Test' });
      const startSnapshot = timerActor.getSnapshot();
      const originalStartTime = startSnapshot.context.startTime!;

      // Wait a bit (simulate some work)
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Pause timer
      timerActor.send({ type: 'PAUSE' });
      const pauseSnapshot = timerActor.getSnapshot();
      expect(pauseSnapshot.value).toBe('paused');
      expect(pauseSnapshot.context.pausedAt).toBeDefined();

      // Calculate elapsed at pause
      const elapsedAtPause = Date.now() - originalStartTime;

      // Wait during pause (this time should NOT be counted)
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Resume timer
      timerActor.send({ type: 'RESUME' });
      const resumeSnapshot = timerActor.getSnapshot();
      expect(resumeSnapshot.value).toBe('running');
      expect(resumeSnapshot.context.pausedAt).toBeUndefined();

      // The startTime should have been adjusted to exclude the pause duration
      // New startTime = old startTime + pause duration
      // So elapsed = now - new startTime should be approximately same as elapsed at pause
      const currentElapsed = Date.now() - resumeSnapshot.context.startTime!;

      // The difference should be close to elapsedAtPause (within tolerance)
      // The current elapsed should NOT include the 200ms pause
      expect(currentElapsed).toBeLessThan(elapsedAtPause + 50); // small tolerance for timing
      expect(resumeSnapshot.context.startTime).toBeGreaterThan(originalStartTime);
    });
  });
});
