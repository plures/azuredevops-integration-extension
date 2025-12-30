/**
 * Actor system tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActorManager, createTimerActor, type Actor } from '../core/actors.js';
import { createPraxisEngine } from '../core/engine.js';
import { PraxisRegistry } from '../core/rules.js';
import { defineEvent, defineRule, defineFact } from '../dsl/index.js';

describe('Actor System', () => {
  describe('ActorManager', () => {
    let manager: ActorManager<{ count: number }>;
    let registry: PraxisRegistry<{ count: number }>;
    let engine: ReturnType<typeof createPraxisEngine<{ count: number }>>;

    beforeEach(() => {
      manager = new ActorManager();
      registry = new PraxisRegistry();
      engine = createPraxisEngine({
        initialContext: { count: 0 },
        registry,
      });
      manager.attachEngine(engine);
    });

    it('should register and start an actor', async () => {
      const onStartSpy = vi.fn();
      const actor: Actor<{ count: number }> = {
        id: 'test-actor',
        description: 'Test actor',
        onStart: onStartSpy,
      };

      manager.register(actor);
      await manager.start('test-actor');

      expect(onStartSpy).toHaveBeenCalledWith(engine);
      expect(manager.isActive('test-actor')).toBe(true);
    });

    it('should throw when registering duplicate actor IDs', () => {
      const actor: Actor<{ count: number }> = {
        id: 'duplicate',
        description: 'Test actor',
      };

      manager.register(actor);
      expect(() => manager.register(actor)).toThrow('Actor with id "duplicate" already registered');
    });

    it('should throw when starting already active actor', async () => {
      const actor: Actor<{ count: number }> = {
        id: 'test',
        description: 'Test',
      };

      manager.register(actor);
      await manager.start('test');
      await expect(manager.start('test')).rejects.toThrow('Actor "test" is already started');
    });

    it('should stop an actor', async () => {
      const onStopSpy = vi.fn();
      const actor: Actor<{ count: number }> = {
        id: 'test-actor',
        description: 'Test actor',
        onStop: onStopSpy,
      };

      manager.register(actor);
      await manager.start('test-actor');
      await manager.stop('test-actor');

      expect(onStopSpy).toHaveBeenCalled();
      expect(manager.isActive('test-actor')).toBe(false);
    });

    it('should notify actors of state changes', async () => {
      const onStateChangeSpy = vi.fn();
      const actor: Actor<{ count: number }> = {
        id: 'observer',
        description: 'Observer actor',
        onStateChange: onStateChangeSpy,
      };

      manager.register(actor);
      await manager.start('observer');

      const state = engine.getState();
      await manager.notifyStateChange(state);

      expect(onStateChangeSpy).toHaveBeenCalledWith(state, engine);
    });

    it('should start all registered actors', async () => {
      const onStart1 = vi.fn();
      const onStart2 = vi.fn();

      manager.register({ id: 'actor1', description: 'Actor 1', onStart: onStart1 });
      manager.register({ id: 'actor2', description: 'Actor 2', onStart: onStart2 });

      await manager.startAll();

      expect(onStart1).toHaveBeenCalled();
      expect(onStart2).toHaveBeenCalled();
      expect(manager.getActiveActorIds()).toHaveLength(2);
    });

    it('should stop all active actors', async () => {
      const onStop1 = vi.fn();
      const onStop2 = vi.fn();

      manager.register({ id: 'actor1', description: 'Actor 1', onStop: onStop1 });
      manager.register({ id: 'actor2', description: 'Actor 2', onStop: onStop2 });

      await manager.startAll();
      await manager.stopAll();

      expect(onStop1).toHaveBeenCalled();
      expect(onStop2).toHaveBeenCalled();
      expect(manager.getActiveActorIds()).toHaveLength(0);
    });

    it('should handle async actor methods', async () => {
      let startResolved = false;
      let stopResolved = false;

      const actor: Actor<{ count: number }> = {
        id: 'async-actor',
        description: 'Async actor',
        onStart: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          startResolved = true;
        },
        onStop: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          stopResolved = true;
        },
      };

      manager.register(actor);
      await manager.start('async-actor');
      expect(startResolved).toBe(true);

      await manager.stop('async-actor');
      expect(stopResolved).toBe(true);
    });

    it('should not notify stopped actors of state changes', async () => {
      const onStateChangeSpy = vi.fn();
      const actor: Actor<{ count: number }> = {
        id: 'observer',
        description: 'Observer',
        onStateChange: onStateChangeSpy,
      };

      manager.register(actor);
      await manager.start('observer');
      await manager.stop('observer');

      const state = engine.getState();
      await manager.notifyStateChange(state);

      expect(onStateChangeSpy).not.toHaveBeenCalled();
    });

    it('should throw when starting actor without attached engine', async () => {
      const actor: Actor<{ count: number }> = {
        id: 'test',
        description: 'Test',
      };

      const newManager = new ActorManager<{ count: number }>();
      newManager.register(actor);

      await expect(newManager.start('test')).rejects.toThrow(
        'Actor manager not attached to an engine'
      );
    });
  });

  describe('createTimerActor', () => {
    it('should create a timer actor that dispatches events', async () => {
      vi.useFakeTimers();

      const Tick = defineEvent<'TICK', {}>('TICK');
      const TickReceived = defineFact<'TickReceived', {}>('TickReceived');

      const tickRule = defineRule<{ count: number }>({
        id: 'tick.rule',
        description: 'Count ticks',
        impl: (state, events) => {
          if (events.some(Tick.is)) {
            state.context.count += 1;
            return [TickReceived.create({})];
          }
          return [];
        },
      });

      const registry = new PraxisRegistry<{ count: number }>();
      registry.registerRule(tickRule);

      const engine = createPraxisEngine({
        initialContext: { count: 0 },
        registry,
      });

      const manager = new ActorManager<{ count: number }>();
      manager.attachEngine(engine);

      const timerActor = createTimerActor('timer', 100, () => Tick.create({}));
      manager.register(timerActor);
      await manager.start('timer');

      // Advance timers
      vi.advanceTimersByTime(250);

      // Should have ticked at least twice (at 100ms and 200ms)
      expect(engine.getContext().count).toBeGreaterThanOrEqual(2);

      await manager.stop('timer');
      vi.useRealTimers();
    });

    it('should stop dispatching events after actor is stopped', async () => {
      vi.useFakeTimers();

      const Tick = defineEvent<'TICK', {}>('TICK');
      const registry = new PraxisRegistry<{ count: number }>();

      const tickRule = defineRule<{ count: number }>({
        id: 'tick.rule',
        description: 'Count ticks',
        impl: (state, events) => {
          if (events.some(Tick.is)) {
            state.context.count += 1;
          }
          return [];
        },
      });
      registry.registerRule(tickRule);

      const engine = createPraxisEngine({
        initialContext: { count: 0 },
        registry,
      });

      const manager = new ActorManager<{ count: number }>();
      manager.attachEngine(engine);

      const timerActor = createTimerActor('timer', 50, () => Tick.create({}));
      manager.register(timerActor);
      await manager.start('timer');

      vi.advanceTimersByTime(100);
      const countBeforeStop = engine.getContext().count;

      await manager.stop('timer');
      vi.advanceTimersByTime(200);
      const countAfterStop = engine.getContext().count;

      // Count should not increase after stopping
      expect(countAfterStop).toBe(countBeforeStop);

      vi.useRealTimers();
    });
  });
});
