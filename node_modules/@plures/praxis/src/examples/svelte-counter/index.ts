/**
 * Svelte Counter Example
 *
 * Demonstrates Svelte v5 integration with a simple counter.
 * Shows how to connect Praxis logic to reactive Svelte stores.
 */

import {
  createPraxisEngine,
  PraxisRegistry,
  defineFact,
  defineEvent,
  defineRule,
  findEvent,
} from '../../index.js';
import { createPraxisStore, createDerivedStore } from '../../integrations/svelte.js';

// Define the context type
interface CounterContext {
  count: number;
  history: number[];
}

// Define facts
const CountIncremented = defineFact<'CountIncremented', { amount: number }>('CountIncremented');
const CountDecremented = defineFact<'CountDecremented', { amount: number }>('CountDecremented');
const CountReset = defineFact<'CountReset', {}>('CountReset');

// Define events
const Increment = defineEvent<'INCREMENT', { amount?: number }>('INCREMENT');
const Decrement = defineEvent<'DECREMENT', { amount?: number }>('DECREMENT');
const Reset = defineEvent<'RESET', {}>('RESET');

// Define rules
const incrementRule = defineRule<CounterContext>({
  id: 'counter.increment',
  description: 'Increment the counter',
  impl: (state, events) => {
    const incrementEvent = findEvent(events, Increment);
    if (!incrementEvent) {
      return [];
    }

    const amount = incrementEvent.payload.amount ?? 1;
    state.context.count += amount;
    state.context.history.push(state.context.count);

    return [CountIncremented.create({ amount })];
  },
});

const decrementRule = defineRule<CounterContext>({
  id: 'counter.decrement',
  description: 'Decrement the counter',
  impl: (state, events) => {
    const decrementEvent = findEvent(events, Decrement);
    if (!decrementEvent) {
      return [];
    }

    const amount = decrementEvent.payload.amount ?? 1;
    state.context.count -= amount;
    state.context.history.push(state.context.count);

    return [CountDecremented.create({ amount })];
  },
});

const resetRule = defineRule<CounterContext>({
  id: 'counter.reset',
  description: 'Reset the counter',
  impl: (state, events) => {
    const resetEvent = findEvent(events, Reset);
    if (!resetEvent) {
      return [];
    }

    state.context.count = 0;
    state.context.history = [0];

    return [CountReset.create({})];
  },
});

// Create and configure the engine
function createCounterEngine() {
  const registry = new PraxisRegistry<CounterContext>();
  registry.registerRule(incrementRule);
  registry.registerRule(decrementRule);
  registry.registerRule(resetRule);

  const engine = createPraxisEngine<CounterContext>({
    initialContext: {
      count: 0,
      history: [0],
    },
    registry,
  });

  return engine;
}

// Create Svelte stores
function createCounterStores() {
  const engine = createCounterEngine();

  const stateStore = createPraxisStore(engine);
  const countStore = createDerivedStore(engine, (ctx: CounterContext) => ctx.count);
  const historyStore = createDerivedStore(engine, (ctx: CounterContext) => ctx.history);

  return {
    engine,
    stateStore,
    countStore,
    historyStore,
    // Helper methods
    increment: (amount?: number) => {
      engine.step([Increment.create({ amount })]);
    },
    decrement: (amount?: number) => {
      engine.step([Decrement.create({ amount })]);
    },
    reset: () => {
      engine.step([Reset.create({})]);
    },
  };
}

// Example usage (non-Svelte demonstration)
function runExample() {
  console.log('=== Svelte Counter Example ===\n');

  const { engine, countStore } = createCounterStores();

  // Subscribe to count changes
  console.log('Subscribing to count changes...\n');
  const unsubscribe = countStore.subscribe((count) => {
    console.log(`Count changed: ${count}`);
  });

  // Dispatch some events
  console.log('\nIncrementing by 1:');
  engine.step([Increment.create({})]);

  console.log('\nIncrementing by 5:');
  engine.step([Increment.create({ amount: 5 })]);

  console.log('\nDecrementing by 2:');
  engine.step([Decrement.create({ amount: 2 })]);

  console.log('\nResetting:');
  engine.step([Reset.create({})]);

  console.log('\nContext:', engine.getContext());

  unsubscribe();
}

// Run example if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExample();
}

export { createCounterEngine, createCounterStores, runExample };
