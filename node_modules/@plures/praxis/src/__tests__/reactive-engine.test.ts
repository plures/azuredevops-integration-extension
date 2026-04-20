/**
 * Tests for Framework-Agnostic Reactive Engine
 *
 * Tests the reactive engine implementation using JavaScript Proxies
 * for automatic state tracking and change notifications.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ReactiveLogicEngine,
  createReactiveEngine,
  type StateChangeCallback,
} from '../core/reactive-engine.js';

interface TestContext {
  count: number;
  name: string;
  nested: {
    value: number;
  };
}

describe('Framework-Agnostic Reactive Engine', () => {
  describe('ReactiveLogicEngine', () => {
    it('should create an engine with initial state', () => {
      const engine = new ReactiveLogicEngine<TestContext>({
        initialContext: {
          count: 0,
          name: 'test',
          nested: { value: 10 },
        },
        initialFacts: [],
        initialMeta: {},
      });

      expect(engine.context.count).toBe(0);
      expect(engine.context.name).toBe('test');
      expect(engine.context.nested.value).toBe(10);
      expect(engine.facts).toEqual([]);
      expect(engine.meta).toEqual({});
    });

    it('should provide access to state via getters', () => {
      const engine = createReactiveEngine<TestContext>({
        initialContext: { count: 5, name: 'hello', nested: { value: 20 } },
      });

      const state = engine.state;
      expect(state.context.count).toBe(5);
      expect(state.context.name).toBe('hello');
      expect(state.facts).toEqual([]);
      expect(state.meta).toEqual({});
    });
  });

  describe('Reactivity', () => {
    it('should notify subscribers when context changes', () => {
      const engine = createReactiveEngine<TestContext>({
        initialContext: { count: 0, name: 'test', nested: { value: 10 } },
      });

      const states: any[] = [];
      engine.subscribe((state) => {
        states.push({ ...state.context });
      });

      // Initial state
      expect(states.length).toBe(1);
      expect(states[0].count).toBe(0);

      // Mutate context
      engine.apply((state) => {
        state.context.count = 5;
      });

      // Should have notified
      expect(states.length).toBe(2);
      expect(states[1].count).toBe(5);
    });

    it('should notify subscribers when facts change', () => {
      const engine = createReactiveEngine({
        initialContext: { count: 0, name: 'test', nested: { value: 10 } },
      });

      const factArrays: any[][] = [];
      engine.subscribe((state) => {
        factArrays.push([...state.facts]);
      });

      expect(factArrays.length).toBe(1);
      expect(factArrays[0]).toEqual([]);

      // Add a fact
      engine.apply((state) => {
        state.facts.push({ tag: 'TestFact', payload: { value: 1 } });
      });

      expect(factArrays.length).toBe(2);
      expect(factArrays[1]).toEqual([{ tag: 'TestFact', payload: { value: 1 } }]);
    });

    it('should notify subscribers when meta changes', () => {
      const engine = createReactiveEngine({
        initialContext: { count: 0, name: 'test', nested: { value: 10 } },
      });

      const metas: any[] = [];
      engine.subscribe((state) => {
        metas.push({ ...state.meta });
      });

      expect(metas.length).toBe(1);
      expect(metas[0]).toEqual({});

      // Set meta value
      engine.apply((state) => {
        state.meta.timestamp = Date.now();
      });

      expect(metas.length).toBe(2);
      expect(metas[1].timestamp).toBeDefined();
    });

    it('should only notify when value actually changes', () => {
      const engine = createReactiveEngine({
        initialContext: { count: 0, name: 'test', nested: { value: 10 } },
      });

      const callback = vi.fn();
      engine.subscribe(callback);

      expect(callback).toHaveBeenCalledTimes(1); // Initial call

      // Set to same value
      engine.apply((state) => {
        state.context.count = 0;
      });

      // Should not notify because value didn't change
      expect(callback).toHaveBeenCalledTimes(1);

      // Set to different value
      engine.apply((state) => {
        state.context.count = 1;
      });

      // Should notify
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should support nested object mutations', () => {
      const engine = createReactiveEngine({
        initialContext: { count: 0, name: 'test', nested: { value: 10 } },
      });

      const callback = vi.fn();
      engine.subscribe(callback);

      expect(callback).toHaveBeenCalledTimes(1);

      // Mutate nested value
      engine.apply((state) => {
        state.context.nested.value = 20;
      });

      expect(callback).toHaveBeenCalledTimes(2);
      expect(engine.context.nested.value).toBe(20);
    });
  });

  describe('Subscription Management', () => {
    it('should return unsubscribe function', () => {
      const engine = createReactiveEngine({
        initialContext: { count: 0, name: 'test', nested: { value: 10 } },
      });

      const callback = vi.fn();
      const unsubscribe = engine.subscribe(callback);

      expect(callback).toHaveBeenCalledTimes(1);

      engine.apply((state) => {
        state.context.count = 1;
      });

      expect(callback).toHaveBeenCalledTimes(2);

      // Unsubscribe
      unsubscribe();

      // Should not notify after unsubscribe
      engine.apply((state) => {
        state.context.count = 2;
      });

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should support multiple subscribers', () => {
      const engine = createReactiveEngine({
        initialContext: { count: 0, name: 'test', nested: { value: 10 } },
      });

      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      engine.subscribe(callback1);
      engine.subscribe(callback2);
      engine.subscribe(callback3);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback3).toHaveBeenCalledTimes(1);

      engine.apply((state) => {
        state.context.count = 5;
      });

      expect(callback1).toHaveBeenCalledTimes(2);
      expect(callback2).toHaveBeenCalledTimes(2);
      expect(callback3).toHaveBeenCalledTimes(2);
    });

    it('should handle errors in subscriber callbacks gracefully', () => {
      const engine = createReactiveEngine({
        initialContext: { count: 0, name: 'test', nested: { value: 10 } },
      });

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const callback1 = vi.fn(() => {
        throw new Error('Test error');
      });
      const callback2 = vi.fn();

      engine.subscribe(callback1);
      engine.subscribe(callback2);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      // Should not throw, should log error, and should still call callback2
      engine.apply((state) => {
        state.context.count = 1;
      });

      expect(consoleError).toHaveBeenCalled();
      expect(callback1).toHaveBeenCalledTimes(2);
      expect(callback2).toHaveBeenCalledTimes(2);

      consoleError.mockRestore();
    });
  });

  describe('Derived Values', () => {
    it('should create derived values that update reactively', () => {
      const engine = createReactiveEngine({
        initialContext: { count: 0, name: 'test', nested: { value: 10 } },
      });

      const doubled = engine.$derived((state) => state.context.count * 2);

      const values: number[] = [];
      doubled.subscribe((value) => {
        values.push(value);
      });

      expect(values).toEqual([0]);

      engine.apply((state) => {
        state.context.count = 5;
      });

      expect(values).toEqual([0, 10]);

      engine.apply((state) => {
        state.context.count = 10;
      });

      expect(values).toEqual([0, 10, 20]);
    });

    it('should only notify derived subscribers when derived value changes', () => {
      const engine = createReactiveEngine({
        initialContext: { count: 0, name: 'test', nested: { value: 10 } },
      });

      const isPositive = engine.$derived((state) => state.context.count > 0);

      const values: boolean[] = [];
      isPositive.subscribe((value) => {
        values.push(value);
      });

      expect(values).toEqual([false]);

      // Change count but isPositive stays false
      engine.apply((state) => {
        state.context.count = -5;
      });

      // Should not notify because derived value didn't change
      expect(values).toEqual([false]);

      // Change to positive
      engine.apply((state) => {
        state.context.count = 5;
      });

      // Should notify
      expect(values).toEqual([false, true]);

      // Change count but isPositive stays true
      engine.apply((state) => {
        state.context.count = 10;
      });

      // Should not notify
      expect(values).toEqual([false, true]);
    });

    it('should support complex derived selectors', () => {
      const engine = createReactiveEngine({
        initialContext: { count: 0, name: 'test', nested: { value: 10 } },
      });

      const complex = engine.$derived((state) => ({
        total: state.context.count + state.context.nested.value,
        label: `${state.context.name}: ${state.context.count}`,
      }));

      const values: any[] = [];
      complex.subscribe((value) => {
        values.push(value);
      });

      expect(values.length).toBe(1);
      expect(values[0]).toEqual({ total: 10, label: 'test: 0' });

      engine.apply((state) => {
        state.context.count = 5;
      });

      expect(values.length).toBe(2);
      expect(values[1]).toEqual({ total: 15, label: 'test: 5' });
    });

    it('should handle errors in derived subscriber callbacks', () => {
      const engine = createReactiveEngine({
        initialContext: { count: 0, name: 'test', nested: { value: 10 } },
      });

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const doubled = engine.$derived((state) => state.context.count * 2);

      const callback1 = vi.fn(() => {
        throw new Error('Test error in derived');
      });
      const callback2 = vi.fn();

      doubled.subscribe(callback1);
      doubled.subscribe(callback2);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      engine.apply((state) => {
        state.context.count = 5;
      });

      expect(consoleError).toHaveBeenCalled();
      expect(callback1).toHaveBeenCalledTimes(2);
      expect(callback2).toHaveBeenCalledTimes(2);

      consoleError.mockRestore();
    });
  });

  describe('Apply Method', () => {
    it('should allow direct mutation of state', () => {
      const engine = createReactiveEngine({
        initialContext: { count: 0, name: 'test', nested: { value: 10 } },
      });

      engine.apply((state) => {
        state.context.count = 100;
        state.context.name = 'updated';
        state.context.nested.value = 200;
      });

      expect(engine.context.count).toBe(100);
      expect(engine.context.name).toBe('updated');
      expect(engine.context.nested.value).toBe(200);
    });

    it('should work with array operations', () => {
      const engine = createReactiveEngine({
        initialContext: { count: 0, name: 'test', nested: { value: 10 } },
      });

      engine.apply((state) => {
        state.facts.push({ tag: 'Fact1', payload: {} });
        state.facts.push({ tag: 'Fact2', payload: {} });
      });

      expect(engine.facts.length).toBe(2);
      expect(engine.facts[0].tag).toBe('Fact1');
      expect(engine.facts[1].tag).toBe('Fact2');
    });

    it('should work with object property additions and deletions', () => {
      const engine = createReactiveEngine({
        initialContext: { count: 0, name: 'test', nested: { value: 10 } },
      });

      const callback = vi.fn();
      engine.subscribe(callback);

      expect(callback).toHaveBeenCalledTimes(1);

      engine.apply((state) => {
        (state.meta as any).newProp = 'new value';
      });

      expect(engine.meta.newProp).toBe('new value');
      expect(callback).toHaveBeenCalledTimes(2);

      engine.apply((state) => {
        delete state.meta.newProp;
      });

      expect(engine.meta.newProp).toBeUndefined();
      expect(callback).toHaveBeenCalledTimes(3);
    });
  });

  describe('createReactiveEngine Helper', () => {
    it('should create an engine with minimal options', () => {
      const engine = createReactiveEngine({
        initialContext: { count: 0, name: 'test', nested: { value: 10 } },
      });

      expect(engine).toBeInstanceOf(ReactiveLogicEngine);
      expect(engine.context.count).toBe(0);
      expect(engine.facts).toEqual([]);
      expect(engine.meta).toEqual({});
    });

    it('should create an engine with all options', () => {
      const engine = createReactiveEngine({
        initialContext: { count: 5, name: 'hello', nested: { value: 20 } },
        initialFacts: [{ tag: 'InitialFact', payload: {} }],
        initialMeta: { timestamp: 123 },
      });

      expect(engine.context.count).toBe(5);
      expect(engine.facts).toEqual([{ tag: 'InitialFact', payload: {} }]);
      expect(engine.meta).toEqual({ timestamp: 123 });
    });
  });

  describe('Integration Example', () => {
    it('should work in a realistic counter scenario', () => {
      interface CounterContext {
        count: number;
        history: number[];
      }

      const engine = createReactiveEngine<CounterContext>({
        initialContext: {
          count: 0,
          history: [0],
        },
      });

      // Create derived value for count display
      const displayValue = engine.$derived((state) => 
        `Count: ${state.context.count} (History: ${state.context.history.join(', ')})`
      );

      const displays: string[] = [];
      displayValue.subscribe((value) => {
        displays.push(value);
      });

      expect(displays[0]).toBe('Count: 0 (History: 0)');

      // Increment
      engine.apply((state) => {
        state.context.count += 1;
        state.context.history.push(state.context.count);
      });

      expect(displays[1]).toBe('Count: 1 (History: 0, 1)');

      // Increment again
      engine.apply((state) => {
        state.context.count += 5;
        state.context.history.push(state.context.count);
      });

      expect(displays[2]).toBe('Count: 6 (History: 0, 1, 6)');

      // Reset
      engine.apply((state) => {
        state.context.count = 0;
        state.context.history = [0];
      });

      expect(displays[3]).toBe('Count: 0 (History: 0)');
    });
  });
});
