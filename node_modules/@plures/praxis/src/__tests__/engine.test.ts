/**
 * Engine tests
 */

import { describe, it, expect } from 'vitest';
import { createPraxisEngine } from '../core/engine.js';
import { PraxisRegistry } from '../core/rules.js';
import { defineRule, defineConstraint, defineFact, defineEvent } from '../dsl/index.js';

describe('LogicEngine', () => {
  it('should create an engine with initial context', () => {
    const registry = new PraxisRegistry<{ count: number }>();
    const engine = createPraxisEngine({
      initialContext: { count: 0 },
      registry,
    });

    expect(engine.getContext()).toEqual({ count: 0 });
  });

  it('should apply rules when processing events', () => {
    interface Context {
      count: number;
    }

    const Incremented = defineFact<'Incremented', { amount: number }>('Incremented');
    const Increment = defineEvent<'INCREMENT', {}>('INCREMENT');

    const incrementRule = defineRule<Context>({
      id: 'increment',
      description: 'Increment counter',
      impl: (state, events) => {
        if (events.some(Increment.is)) {
          state.context.count += 1;
          return [Incremented.create({ amount: 1 })];
        }
        return [];
      },
    });

    const registry = new PraxisRegistry<Context>();
    registry.registerRule(incrementRule);

    const engine = createPraxisEngine({
      initialContext: { count: 0 },
      registry,
    });

    const result = engine.step([Increment.create({})]);

    expect(engine.getContext().count).toBe(1);
    expect(result.state.facts).toHaveLength(1);
    expect(result.state.facts[0]?.tag).toBe('Incremented');
  });

  it('should check constraints', () => {
    interface Context {
      count: number;
    }

    const maxConstraint = defineConstraint<Context>({
      id: 'max100',
      description: 'Count cannot exceed 100',
      impl: (state) => {
        return state.context.count <= 100 || 'Count exceeds 100';
      },
    });

    const registry = new PraxisRegistry<Context>();
    registry.registerConstraint(maxConstraint);

    const engine = createPraxisEngine({
      initialContext: { count: 50 },
      registry,
    });

    // Should pass constraint
    let result = engine.step([]);
    expect(result.diagnostics).toHaveLength(0);

    // Update context to violate constraint
    engine.updateContext(() => ({ count: 150 }));
    result = engine.step([]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.kind).toBe('constraint-violation');
  });

  it('should handle multiple rules', () => {
    interface Context {
      value: number;
    }

    const Doubled = defineFact<'Doubled', {}>('Doubled');
    const Added = defineFact<'Added', { amount: number }>('Added');
    const DoubleThenAdd = defineEvent<'DOUBLE_ADD', { amount: number }>('DOUBLE_ADD');

    const doubleRule = defineRule<Context>({
      id: 'double',
      description: 'Double the value',
      impl: (state, events) => {
        if (events.some(DoubleThenAdd.is)) {
          state.context.value *= 2;
          return [Doubled.create({})];
        }
        return [];
      },
    });

    const addRule = defineRule<Context>({
      id: 'add',
      description: 'Add to the value',
      impl: (state, events) => {
        const event = events.find(DoubleThenAdd.is);
        if (event) {
          state.context.value += event.payload.amount;
          return [Added.create({ amount: event.payload.amount })];
        }
        return [];
      },
    });

    const registry = new PraxisRegistry<Context>();
    registry.registerRule(doubleRule);
    registry.registerRule(addRule);

    const engine = createPraxisEngine({
      initialContext: { value: 10 },
      registry,
    });

    const result = engine.step([DoubleThenAdd.create({ amount: 5 })]);

    // Value should be (10 * 2) + 5 = 25
    expect(engine.getContext().value).toBe(25);
    expect(result.state.facts).toHaveLength(2);
  });

  it('should safely clone state when context contains non-structured-clone values', () => {
    const registry = new PraxisRegistry<{ fn: () => number; timer: any; value: number }>();

    // Context includes a function and a timer handle (non-structured-clone-able)
    const timer = setTimeout(() => {}, 0);
    const initialContext = {
      fn: () => 42,
      timer,
      value: 1,
    };

    const engine = createPraxisEngine({
      initialContext,
      registry,
    });

    clearTimeout(timer);

    expect(() => engine.getContext()).not.toThrow();
    expect(() => engine.getState()).not.toThrow();

    const ctx = engine.getContext();
    expect(typeof ctx.fn).toBe('function');
    expect(ctx.value).toBe(1);
  });
});
