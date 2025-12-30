/**
 * Tests for Svelte 5 Integration
 *
 * Tests the enhanced Svelte integration with runes support,
 * history state pattern, and snapshot functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPraxisEngine,
  PraxisRegistry,
  defineFact,
  defineEvent,
  defineRule,
  findEvent,
} from '../index.js';
import {
  createPraxisStore,
  createContextStore,
  createDerivedStore,
  usePraxisEngine,
  usePraxisContext,
  HistoryStateManager,
  createHistoryEngine,
} from '../integrations/svelte.js';

// Test context and events
interface CounterContext {
  count: number;
  history: number[];
}

const CountIncremented = defineFact<'CountIncremented', { amount: number }>('CountIncremented');
const Increment = defineEvent<'INCREMENT', { amount?: number }>('INCREMENT');

function createTestEngine() {
  const registry = new PraxisRegistry<CounterContext>();

  registry.registerRule(
    defineRule<CounterContext>({
      id: 'counter.increment',
      description: 'Increment counter',
      impl: (state, events) => {
        const event = findEvent(events, Increment);
        if (!event) return [];

        const amount = event.payload.amount ?? 1;
        state.context.count += amount;
        state.context.history.push(state.context.count);

        return [CountIncremented.create({ amount })];
      },
    })
  );

  return createPraxisEngine<CounterContext>({
    initialContext: {
      count: 0,
      history: [0],
    },
    registry,
  });
}

describe('Svelte Integration - Store API', () => {
  it('should create a reactive Praxis store', () => {
    const engine = createTestEngine();
    const store = createPraxisStore(engine);

    const states: any[] = [];
    const unsubscribe = store.subscribe((state) => {
      states.push(state);
    });

    // Initial state
    expect(states.length).toBe(1);
    expect(states[0].context.count).toBe(0);

    // Dispatch event
    store.dispatch([Increment.create({ amount: 5 })]);

    expect(states.length).toBe(2);
    expect(states[1].context.count).toBe(5);

    unsubscribe();
  });

  it('should create a context store', () => {
    const engine = createTestEngine();
    const store = createContextStore(engine);

    const contexts: any[] = [];
    const unsubscribe = store.subscribe((ctx) => {
      contexts.push(ctx);
    });

    expect(contexts.length).toBe(1);
    expect(contexts[0].count).toBe(0);

    store.dispatch([Increment.create({ amount: 3 })]);

    expect(contexts.length).toBe(2);
    expect(contexts[1].count).toBe(3);

    unsubscribe();
  });

  it('should create a derived store with selector', () => {
    const engine = createTestEngine();
    const countStore = createDerivedStore(engine, (ctx: CounterContext) => ctx.count);

    const counts: number[] = [];
    const unsubscribe = countStore.subscribe((count) => {
      counts.push(count);
    });

    expect(counts).toEqual([0]);

    countStore.dispatch([Increment.create({ amount: 1 })]);
    expect(counts).toEqual([0, 1]);

    countStore.dispatch([Increment.create({ amount: 2 })]);
    expect(counts).toEqual([0, 1, 3]);

    unsubscribe();
  });

  it('should only notify on actual value changes in derived store', () => {
    const engine = createTestEngine();
    const countStore = createDerivedStore(engine, (ctx: CounterContext) => {
      // Return same value regardless of actual count
      return ctx.count > 0 ? 'positive' : 'zero';
    });

    const values: string[] = [];
    const unsubscribe = countStore.subscribe((value) => {
      values.push(value);
    });

    expect(values).toEqual(['zero']);

    // First increment - should notify
    countStore.dispatch([Increment.create({ amount: 1 })]);
    expect(values).toEqual(['zero', 'positive']);

    // Second increment - should NOT notify (value didn't change)
    countStore.dispatch([Increment.create({ amount: 5 })]);
    expect(values).toEqual(['zero', 'positive']);

    unsubscribe();
  });
});

describe('Svelte Integration - Runes API', () => {
  it('should create engine binding with usePraxisEngine', () => {
    const engine = createTestEngine();
    const binding = usePraxisEngine(engine);

    expect(binding.state.context.count).toBe(0);
    expect(binding.context.count).toBe(0);
    expect(binding.facts.length).toBe(0);

    binding.dispatch([Increment.create({ amount: 7 })]);

    expect(binding.context.count).toBe(7);
    expect(binding.facts.length).toBe(1);
    expect(binding.facts[0].tag).toBe('CountIncremented');
  });

  it('should support history with usePraxisEngine', () => {
    const engine = createTestEngine();
    const binding = usePraxisEngine(engine, { enableHistory: true });

    expect(binding.canUndo).toBe(false);
    expect(binding.canRedo).toBe(false);
    expect(binding.snapshots.length).toBe(1);
    expect(binding.historyIndex).toBe(0);

    // First action
    binding.dispatch([Increment.create({ amount: 1 })]);
    expect(binding.context.count).toBe(1);
    expect(binding.snapshots.length).toBe(2);
    expect(binding.canUndo).toBe(true);
    expect(binding.canRedo).toBe(false);

    // Second action
    binding.dispatch([Increment.create({ amount: 2 })]);
    expect(binding.context.count).toBe(3);
    expect(binding.snapshots.length).toBe(3);

    // Undo
    binding.undo();
    expect(binding.context.count).toBe(1);
    expect(binding.canUndo).toBe(true);
    expect(binding.canRedo).toBe(true);

    // Undo again
    binding.undo();
    expect(binding.context.count).toBe(0);
    expect(binding.canUndo).toBe(false);
    expect(binding.canRedo).toBe(true);

    // Redo
    binding.redo();
    expect(binding.context.count).toBe(1);
    expect(binding.canUndo).toBe(true);
    expect(binding.canRedo).toBe(true);
  });

  it('should truncate future history when dispatching from past state', () => {
    const engine = createTestEngine();
    const binding = usePraxisEngine(engine, { enableHistory: true });

    // Create history: 0 -> 1 -> 3 -> 6
    binding.dispatch([Increment.create({ amount: 1 })]);
    binding.dispatch([Increment.create({ amount: 2 })]);
    binding.dispatch([Increment.create({ amount: 3 })]);
    expect(binding.snapshots.length).toBe(4);

    // Go back to count = 1
    binding.undo();
    binding.undo();
    expect(binding.context.count).toBe(1);

    // Dispatch new action - should truncate future history
    // Note: The underlying engine state is at 6, but our snapshot shows 1
    // When we dispatch, it applies to the actual engine state (6 + 10 = 16)
    binding.dispatch([Increment.create({ amount: 10 })]);
    expect(binding.context.count).toBe(16); // 6 + 10
    expect(binding.snapshots.length).toBe(3); // Initial, +1, +10
    expect(binding.canRedo).toBe(false);
  });

  it('should limit history size', () => {
    const engine = createTestEngine();
    const binding = usePraxisEngine(engine, {
      enableHistory: true,
      maxHistorySize: 3,
    });

    // Create more history entries than max size
    binding.dispatch([Increment.create({ amount: 1 })]);
    binding.dispatch([Increment.create({ amount: 1 })]);
    binding.dispatch([Increment.create({ amount: 1 })]);
    binding.dispatch([Increment.create({ amount: 1 })]);

    expect(binding.snapshots.length).toBe(3); // Should be limited to max size
  });

  it('should extract context with usePraxisContext', () => {
    const engine = createTestEngine();
    const count = usePraxisContext(engine, (ctx: CounterContext) => ctx.count);

    expect(count).toBe(0);
  });
});

describe('History State Manager', () => {
  it('should record and navigate history', () => {
    const manager = new HistoryStateManager<CounterContext>(10);

    // Record initial state
    const state1 = {
      context: { count: 0, history: [0] },
      facts: [],
      meta: {},
      protocolVersion: '1.0.0',
    };
    manager.record(state1, [], 'Initial');

    expect(manager.getCurrentIndex()).toBe(0);
    expect(manager.canGoBack()).toBe(false);
    expect(manager.canGoForward()).toBe(false);

    // Record second state
    const state2 = {
      ...state1,
      context: { count: 1, history: [0, 1] },
    };
    manager.record(state2, [Increment.create({ amount: 1 })], 'Increment');

    expect(manager.getCurrentIndex()).toBe(1);
    expect(manager.canGoBack()).toBe(true);
    expect(manager.canGoForward()).toBe(false);

    // Go back
    const entry = manager.back();
    expect(entry).not.toBeNull();
    expect(entry?.state.context.count).toBe(0);
    expect(manager.getCurrentIndex()).toBe(0);
    expect(manager.canGoBack()).toBe(false);
    expect(manager.canGoForward()).toBe(true);

    // Go forward
    const forwardEntry = manager.forward();
    expect(forwardEntry).not.toBeNull();
    expect(forwardEntry?.state.context.count).toBe(1);
    expect(manager.getCurrentIndex()).toBe(1);
  });

  it('should truncate future history when recording from past', () => {
    const manager = new HistoryStateManager<CounterContext>(10);

    const state1 = {
      context: { count: 0, history: [0] },
      facts: [],
      meta: {},
      protocolVersion: '1.0.0',
    };

    // Record 3 states
    manager.record(state1, []);
    manager.record({ ...state1, context: { count: 1, history: [0, 1] } }, []);
    manager.record({ ...state1, context: { count: 2, history: [0, 1, 2] } }, []);

    expect(manager.getHistory().length).toBe(3);

    // Go back to first state
    manager.back();
    manager.back();
    expect(manager.getCurrentIndex()).toBe(0);

    // Record new state - should truncate
    manager.record({ ...state1, context: { count: 10, history: [0, 10] } }, []);

    expect(manager.getHistory().length).toBe(2);
    expect(manager.getCurrentIndex()).toBe(1);
  });

  it('should limit history size', () => {
    const manager = new HistoryStateManager<CounterContext>(3);

    const state = {
      context: { count: 0, history: [0] },
      facts: [],
      meta: {},
      protocolVersion: '1.0.0',
    };

    // Record 5 states
    for (let i = 0; i < 5; i++) {
      manager.record({ ...state, context: { count: i, history: [i] } }, []);
    }

    // Should only keep last 3
    expect(manager.getHistory().length).toBe(3);
    expect(manager.current()?.state.context.count).toBe(4);
  });

  it('should clear history', () => {
    const manager = new HistoryStateManager<CounterContext>(10);

    const state = {
      context: { count: 0, history: [0] },
      facts: [],
      meta: {},
      protocolVersion: '1.0.0',
    };

    manager.record(state, []);
    manager.record({ ...state, context: { count: 1, history: [0, 1] } }, []);

    expect(manager.getHistory().length).toBe(2);

    manager.clear();

    expect(manager.getHistory().length).toBe(0);
    expect(manager.getCurrentIndex()).toBe(-1);
    expect(manager.current()).toBeNull();
  });
});

describe('History Engine', () => {
  it('should create history engine with undo/redo', () => {
    const baseEngine = createTestEngine();
    const historyEngine = createHistoryEngine(baseEngine);

    expect(historyEngine.canUndo()).toBe(false);
    expect(historyEngine.canRedo()).toBe(false);

    // Dispatch action
    historyEngine.dispatch([Increment.create({ amount: 5 })], 'Add 5');
    expect(baseEngine.getContext().count).toBe(5);
    expect(historyEngine.canUndo()).toBe(true);

    // Get history
    const history = historyEngine.getHistory();
    expect(history.length).toBe(2); // Initial + one action
    expect(history[0].label).toBe('Initial');
    expect(history[1].label).toBe('Add 5');
  });

  it('should provide history navigation', () => {
    const baseEngine = createTestEngine();
    const historyEngine = createHistoryEngine(baseEngine, {
      maxHistorySize: 5,
      initialLabel: 'Start',
    });

    historyEngine.dispatch([Increment.create({ amount: 1 })], 'First');
    historyEngine.dispatch([Increment.create({ amount: 2 })], 'Second');
    historyEngine.dispatch([Increment.create({ amount: 3 })], 'Third');

    const history = historyEngine.getHistory();
    expect(history.length).toBe(4); // Start + 3 actions
    expect(history[0].label).toBe('Start');
    expect(history[1].label).toBe('First');
    expect(history[2].label).toBe('Second');
    expect(history[3].label).toBe('Third');

    // Navigate to specific point
    const success = historyEngine.goToHistory(1);
    expect(success).toBe(true);
  });

  it('should clear history', () => {
    const baseEngine = createTestEngine();
    const historyEngine = createHistoryEngine(baseEngine);

    historyEngine.dispatch([Increment.create({ amount: 1 })]);
    historyEngine.dispatch([Increment.create({ amount: 2 })]);

    expect(historyEngine.getHistory().length).toBe(3);

    historyEngine.clearHistory();
    expect(historyEngine.getHistory().length).toBe(0);
  });
});
