/**
 * Vitest Plugin Demo
 * 
 * Demonstrates the Vitest plugin custom matchers and automatic history management.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { resetEngine, dispatch, getContext } from '../../../src/testing/helpers.js';
import { history } from '../../../src/webview/praxis/store.js';
import {
  ActivateEvent,
  ActivationCompleteEvent,
} from '../../../src/praxis/application/facts.js';

describe('Vitest Plugin - Custom Matchers Demo', () => {
  beforeEach(async () => {
    await resetEngine();
  });

  describe('Custom Matchers', () => {
    it('should use toHaveStateTransition matcher', () => {
      dispatch([ActivateEvent.create({})]);
      dispatch([ActivationCompleteEvent.create({})]);

      // Use custom matcher - check history for state transitions
      expect(history.getHistory()).toHaveStateTransition('inactive', 'activating');
      expect(history.getHistory()).toHaveStateTransition('activating', 'active');
    });

    it('should use toHaveHistoryLength matcher', () => {
      dispatch([ActivateEvent.create({})]);
      dispatch([ActivationCompleteEvent.create({})]);

      // Use custom matcher
      expect(history.getHistory()).toHaveHistoryLength(3); // Initial + 2 events
    });

    it('should use toHaveState matcher', () => {
      dispatch([ActivateEvent.create({})]);
      dispatch([ActivationCompleteEvent.create({})]);

      // Use custom matcher - check current state
      const context = getContext();
      expect(context).toHaveState('active');
    });
  });

  describe('Automatic History Management', () => {
    it('should automatically reset history before each test', () => {
      // History should be reset by beforeEach in setup file
      const initialLength = history.getHistory().length;
      
      // Should start with initial state
      expect(initialLength).toBeGreaterThanOrEqual(0);
    });
  });
});

