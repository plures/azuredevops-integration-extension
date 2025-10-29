/**
 * Timer Module Tests
 *
 * Tests for the timer module's pure functions and utilities.
 * Integration tests are in tests/features/timer-integration.test.ts
 */

import { describe, it, expect } from 'vitest';
import { isValidTimerState, calculateElapsedTime, formatElapsedTime } from './persistence';
import type { TimerPersistenceData } from './types';

describe('Timer Persistence Utilities', () => {
  describe('isValidTimerState', () => {
    it('should return true for valid timer state', () => {
      const validState: TimerPersistenceData = {
        workItemId: 123,
        workItemTitle: 'Test Item',
        startTime: Date.now(),
        isPaused: false,
        state: 'running',
        lastActivity: Date.now(),
      };

      expect(isValidTimerState(validState)).toBe(true);
    });

    it('should return false for invalid timer state', () => {
      const invalidStates = [
        { workItemId: 'not-a-number' } as any,
        { workItemId: 123, workItemTitle: 456 } as any,
        { workItemId: 123, workItemTitle: 'Test', startTime: 'not-a-number' } as any,
        null,
        undefined,
      ];

      invalidStates.forEach((state) => {
        expect(isValidTimerState(state)).toBe(false);
      });
    });
  });

  describe('calculateElapsedTime', () => {
    it('should calculate elapsed time correctly', () => {
      const startTime = Date.now() - 5000; // 5 seconds ago
      const elapsed = calculateElapsedTime(startTime);

      expect(elapsed).toBeGreaterThanOrEqual(4);
      expect(elapsed).toBeLessThanOrEqual(6);
    });

    it('should return 0 for current time', () => {
      const now = Date.now();
      const elapsed = calculateElapsedTime(now);

      expect(elapsed).toBe(0);
    });
  });

  describe('formatElapsedTime', () => {
    it('should format seconds correctly', () => {
      expect(formatElapsedTime(0)).toBe('0s');
      expect(formatElapsedTime(30)).toBe('30s');
      expect(formatElapsedTime(59)).toBe('59s');
    });

    it('should format minutes and seconds correctly', () => {
      expect(formatElapsedTime(60)).toBe('1m 0s');
      expect(formatElapsedTime(90)).toBe('1m 30s');
      expect(formatElapsedTime(3599)).toBe('59m 59s');
    });

    it('should format hours, minutes and seconds correctly', () => {
      expect(formatElapsedTime(3600)).toBe('1h 0m 0s');
      expect(formatElapsedTime(3661)).toBe('1h 1m 1s');
      expect(formatElapsedTime(7325)).toBe('2h 2m 5s');
    });
  });
});
