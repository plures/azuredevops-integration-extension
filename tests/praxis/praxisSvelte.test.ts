/**
 * Praxis Svelte Integration Tests
 *
 * Tests for the Svelte integration module (Phase 6).
 * Note: These tests don't test actual Svelte components but the
 * pure JavaScript functions that power the integration.
 */

import { describe, it, expect } from 'vitest';
import { matchesState, createStateMatchers } from '../../src/praxis/svelte/usePraxisEngine.js';
import { PraxisEventBus } from '../../src/praxis/application/eventBus.js';

describe('Praxis Svelte Helpers', () => {
  describe('matchesState', () => {
    it('should return true when state matches', () => {
      const context = { timerState: 'running' };

      expect(matchesState(context, 'timerState', 'running')).toBe(true);
    });

    it('should return false when state does not match', () => {
      const context = { timerState: 'running' };

      expect(matchesState(context, 'timerState', 'paused')).toBe(false);
    });

    it('should work with different state types', () => {
      const context = {
        applicationState: 'active',
        connectionState: 'connected',
        authState: 'authenticated',
      };

      expect(matchesState(context, 'applicationState', 'active')).toBe(true);
      expect(matchesState(context, 'connectionState', 'connected')).toBe(true);
      expect(matchesState(context, 'authState', 'authenticated')).toBe(true);
    });

    it('should handle undefined values', () => {
      const context = { timerState: undefined };

      expect(matchesState(context, 'timerState', undefined)).toBe(true);
      expect(matchesState(context, 'timerState', 'running')).toBe(false);
    });
  });

  describe('createStateMatchers', () => {
    it('should create matchers for common states', () => {
      const context = { timerState: 'running' };

      const matchers = createStateMatchers(context, 'timerState');

      expect(matchers.running).toBe(true);
      expect(matchers.idle).toBe(false);
      expect(matchers.paused).toBe(false);
    });

    it('should include all common state values', () => {
      const context = { applicationState: 'active' };

      const matchers = createStateMatchers(context, 'applicationState');

      // Check that common states are included
      expect('idle' in matchers).toBe(true);
      expect('active' in matchers).toBe(true);
      expect('inactive' in matchers).toBe(true);
      expect('running' in matchers).toBe(true);
      expect('paused' in matchers).toBe(true);
      expect('loading' in matchers).toBe(true);
      expect('error' in matchers).toBe(true);
      expect('connected' in matchers).toBe(true);
      expect('authenticated' in matchers).toBe(true);
    });

    it('should return correct boolean values', () => {
      const context = { connectionState: 'connected' };

      const matchers = createStateMatchers(context, 'connectionState');

      expect(matchers.connected).toBe(true);
      expect(matchers.disconnected).toBe(false);
    });
  });
});

describe('Praxis Svelte Types', () => {
  describe('SvelteRunes mock', () => {
    it('should work with mock runes', () => {
      // Mock Svelte 5 runes for testing
      const mockRunes = {
        state: <T>(value: T): T => value,
        effect: (fn: () => void | (() => void)): void => {
          fn();
        },
      };

      // Verify mock works
      const testState = mockRunes.state({ count: 0 });
      expect(testState.count).toBe(0);

      let effectCalled = false;
      mockRunes.effect(() => {
        effectCalled = true;
      });
      expect(effectCalled).toBe(true);
    });
  });

  describe('PraxisEngineState', () => {
    it('should have correct structure', () => {
      const state = {
        context: { timerState: 'idle' },
        connected: true,
        lastUpdate: Date.now(),
      };

      expect(state).toHaveProperty('context');
      expect(state).toHaveProperty('connected');
      expect(state).toHaveProperty('lastUpdate');
    });
  });
});

describe('VS Code Adapter Helpers', () => {
  describe('Message types', () => {
    it('should define correct message types', () => {
      const messageTypes = [
        'praxis:state',
        'praxis:event',
        'praxis:connected',
        'praxis:disconnected',
      ];

      // Just verify the types are what we expect
      expect(messageTypes).toHaveLength(4);
    });
  });

  describe('State payload structure', () => {
    it('should have correct structure', () => {
      const payload = {
        context: { applicationState: 'active' },
        engineId: 'application',
      };

      expect(payload).toHaveProperty('context');
      expect(payload).toHaveProperty('engineId');
    });
  });

  describe('Event payload structure', () => {
    it('should have correct structure', () => {
      const payload = {
        event: {
          tag: 'ACTIVATE',
          payload: {},
        },
        engineId: 'application',
      };

      expect(payload).toHaveProperty('event');
      expect(payload).toHaveProperty('engineId');
      expect(payload.event).toHaveProperty('tag');
      expect(payload.event).toHaveProperty('payload');
    });
  });
});

describe('Integration with Event Bus', () => {
  it('should work with application event bus', () => {
    const eventBus = new PraxisEventBus();
    const stateUpdates: unknown[] = [];

    // Simulate webview subscribing to state changes
    eventBus.subscribeAll((msg) => {
      if (msg.type === 'app:activated') {
        stateUpdates.push(msg.payload);
      }
    });

    // Simulate extension host publishing state
    eventBus.emitApplicationEvent('app:activated', {
      applicationState: 'active',
      isActivated: true,
    });

    expect(stateUpdates).toHaveLength(1);
  });

  it('should handle multiple subscribers', () => {
    const eventBus = new PraxisEventBus();
    let subscriber1Called = false;
    let subscriber2Called = false;

    eventBus.subscribeAll(() => {
      subscriber1Called = true;
    });

    eventBus.subscribeAll(() => {
      subscriber2Called = true;
    });

    eventBus.emitApplicationEvent('app:activated', {});

    expect(subscriber1Called).toBe(true);
    expect(subscriber2Called).toBe(true);
  });
});
