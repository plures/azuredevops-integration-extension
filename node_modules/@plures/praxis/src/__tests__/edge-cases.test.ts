/**
 * Edge cases and failure path tests
 */

import { describe, it, expect } from 'vitest';
import { createPraxisEngine } from '../core/engine.js';
import { PraxisRegistry } from '../core/rules.js';
import {
  defineRule,
  defineConstraint,
  defineEvent,
  defineFact,
  defineModule,
} from '../dsl/index.js';

describe('Edge Cases and Failure Paths', () => {
  describe('Rule Errors', () => {
    it('should handle rule that throws an error', () => {
      const ErrorEvent = defineEvent<'ERROR', {}>('ERROR');

      const errorRule = defineRule<{ value: number }>({
        id: 'error.rule',
        description: 'Rule that throws',
        impl: () => {
          throw new Error('Intentional error');
        },
      });

      const registry = new PraxisRegistry<{ value: number }>();
      registry.registerRule(errorRule);

      const engine = createPraxisEngine({
        initialContext: { value: 0 },
        registry,
      });

      const result = engine.step([ErrorEvent.create({})]);

      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.kind).toBe('rule-error');
      expect(result.diagnostics[0]?.message).toContain('Intentional error');
    });

    it('should continue processing other rules after one fails', () => {
      const TestEvent = defineEvent<'TEST', {}>('TEST');
      const Success = defineFact<'Success', { ruleId: string }>('Success');

      const errorRule = defineRule<{ count: number }>({
        id: 'error.rule',
        description: 'Rule that throws',
        impl: () => {
          throw new Error('Error');
        },
      });

      const successRule = defineRule<{ count: number }>({
        id: 'success.rule',
        description: 'Rule that succeeds',
        impl: (state, events) => {
          if (events.some(TestEvent.is)) {
            state.context.count += 1;
            return [Success.create({ ruleId: 'success.rule' })];
          }
          return [];
        },
      });

      const registry = new PraxisRegistry<{ count: number }>();
      registry.registerRule(errorRule);
      registry.registerRule(successRule);

      const engine = createPraxisEngine({
        initialContext: { count: 0 },
        registry,
      });

      const result = engine.step([TestEvent.create({})]);

      // Should have both error diagnostic and success fact
      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.kind).toBe('rule-error');
      expect(result.state.facts.some((f) => f.tag === 'Success')).toBe(true);
      expect(engine.getContext().count).toBe(1);
    });

    it('should handle rule returning invalid data', () => {
      const TestEvent = defineEvent<'TEST', {}>('TEST');

      const invalidRule = defineRule<{ value: number }>({
        id: 'invalid.rule',
        description: 'Rule that returns invalid facts',
        impl: () => {
          // Return invalid fact structure
          return [{ tag: 'Invalid', notPayload: 'wrong' }] as any;
        },
      });

      const registry = new PraxisRegistry<{ value: number }>();
      registry.registerRule(invalidRule);

      const engine = createPraxisEngine({
        initialContext: { value: 0 },
        registry,
      });

      // Should not throw - just add the facts as-is
      const result = engine.step([TestEvent.create({})]);
      expect(result.state.facts).toHaveLength(1);
    });
  });

  describe('Constraint Violations', () => {
    it('should handle constraint that throws an error', () => {
      const errorConstraint = defineConstraint<{ value: number }>({
        id: 'error.constraint',
        description: 'Constraint that throws',
        impl: () => {
          throw new Error('Constraint error');
        },
      });

      const registry = new PraxisRegistry<{ value: number }>();
      registry.registerConstraint(errorConstraint);

      const engine = createPraxisEngine({
        initialContext: { value: 0 },
        registry,
      });

      const result = engine.step([]);

      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.kind).toBe('constraint-violation');
      expect(result.diagnostics[0]?.message).toContain('Constraint error');
    });

    it('should report constraint violation with false return', () => {
      const failConstraint = defineConstraint<{ value: number }>({
        id: 'fail.constraint',
        description: 'Always fails',
        impl: () => false,
      });

      const registry = new PraxisRegistry<{ value: number }>();
      registry.registerConstraint(failConstraint);

      const engine = createPraxisEngine({
        initialContext: { value: 0 },
        registry,
      });

      const result = engine.step([]);

      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.kind).toBe('constraint-violation');
      expect(result.diagnostics[0]?.message).toContain('fail.constraint');
    });

    it('should report constraint violation with custom message', () => {
      const customMessageConstraint = defineConstraint<{ value: number }>({
        id: 'custom.constraint',
        description: 'Custom message constraint',
        impl: (state) => {
          return state.context.value >= 0 || 'Value must be non-negative';
        },
      });

      const registry = new PraxisRegistry<{ value: number }>();
      registry.registerConstraint(customMessageConstraint);

      const engine = createPraxisEngine({
        initialContext: { value: -5 },
        registry,
      });

      const result = engine.step([]);

      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.message).toBe('Value must be non-negative');
    });

    it('should check multiple constraints and report all violations', () => {
      const constraint1 = defineConstraint<{ value: number }>({
        id: 'constraint1',
        description: 'Constraint 1',
        impl: () => 'Violation 1',
      });

      const constraint2 = defineConstraint<{ value: number }>({
        id: 'constraint2',
        description: 'Constraint 2',
        impl: () => 'Violation 2',
      });

      const registry = new PraxisRegistry<{ value: number }>();
      registry.registerConstraint(constraint1);
      registry.registerConstraint(constraint2);

      const engine = createPraxisEngine({
        initialContext: { value: 0 },
        registry,
      });

      const result = engine.step([]);

      expect(result.diagnostics).toHaveLength(2);
      expect(result.diagnostics[0]?.message).toBe('Violation 1');
      expect(result.diagnostics[1]?.message).toBe('Violation 2');
    });
  });

  describe('Registry Edge Cases', () => {
    it('should handle non-existent rule ID in config', () => {
      const registry = new PraxisRegistry<{ value: number }>();
      const engine = createPraxisEngine({
        initialContext: { value: 0 },
        registry,
      });

      const result = engine.stepWithConfig([], {
        ruleIds: ['nonexistent.rule'],
        constraintIds: [],
      });

      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.kind).toBe('rule-error');
      expect(result.diagnostics[0]?.message).toContain('not found in registry');
    });

    it('should handle non-existent constraint ID in config', () => {
      const registry = new PraxisRegistry<{ value: number }>();
      const engine = createPraxisEngine({
        initialContext: { value: 0 },
        registry,
      });

      const result = engine.stepWithConfig([], {
        ruleIds: [],
        constraintIds: ['nonexistent.constraint'],
      });

      expect(result.diagnostics).toHaveLength(1);
      expect(result.diagnostics[0]?.kind).toBe('constraint-violation');
      expect(result.diagnostics[0]?.message).toContain('not found in registry');
    });

    it('should throw when registering duplicate rule IDs', () => {
      const rule = defineRule({
        id: 'duplicate',
        description: 'Test',
        impl: () => [],
      });

      const registry = new PraxisRegistry();
      registry.registerRule(rule);

      expect(() => registry.registerRule(rule)).toThrow(
        'Rule with id "duplicate" already registered'
      );
    });

    it('should throw when registering duplicate constraint IDs', () => {
      const constraint = defineConstraint({
        id: 'duplicate',
        description: 'Test',
        impl: () => true,
      });

      const registry = new PraxisRegistry();
      registry.registerConstraint(constraint);

      expect(() => registry.registerConstraint(constraint)).toThrow(
        'Constraint with id "duplicate" already registered'
      );
    });

    it('should register module with multiple rules and constraints', () => {
      const module = defineModule({
        rules: [
          defineRule({ id: 'rule1', description: 'Rule 1', impl: () => [] }),
          defineRule({ id: 'rule2', description: 'Rule 2', impl: () => [] }),
        ],
        constraints: [
          defineConstraint({ id: 'c1', description: 'C1', impl: () => true }),
          defineConstraint({ id: 'c2', description: 'C2', impl: () => true }),
        ],
        meta: { version: '1.0.0' },
      });

      const registry = new PraxisRegistry();
      registry.registerModule(module);

      expect(registry.getRuleIds()).toHaveLength(2);
      expect(registry.getConstraintIds()).toHaveLength(2);
    });
  });

  describe('Context and State Edge Cases', () => {
    it('should handle empty events array', () => {
      const registry = new PraxisRegistry<{ value: number }>();
      const engine = createPraxisEngine({
        initialContext: { value: 0 },
        registry,
      });

      const result = engine.step([]);
      expect(result.state.facts).toHaveLength(0);
      expect(result.diagnostics).toHaveLength(0);
    });

    it('should handle complex nested context', () => {
      interface ComplexContext {
        nested: {
          deep: {
            value: number;
            array: string[];
          };
        };
        map: Map<string, number>;
      }

      const TestEvent = defineEvent<'TEST', {}>('TEST');
      const rule = defineRule<ComplexContext>({
        id: 'complex.rule',
        description: 'Complex context rule',
        impl: (state) => {
          state.context.nested.deep.value += 1;
          state.context.nested.deep.array.push('item');
          return [];
        },
      });

      const registry = new PraxisRegistry<ComplexContext>();
      registry.registerRule(rule);

      const engine = createPraxisEngine<ComplexContext>({
        initialContext: {
          nested: {
            deep: {
              value: 0,
              array: [],
            },
          },
          map: new Map([['key', 1]]),
        },
        registry,
      });

      engine.step([TestEvent.create({})]);
      const context = engine.getContext();

      expect(context.nested.deep.value).toBe(1);
      expect(context.nested.deep.array).toHaveLength(1);
    });

    it('should handle null and undefined in payloads', () => {
      const NullFact = defineFact<'NullFact', { value: null }>('NullFact');
      const UndefinedFact = defineFact<'UndefinedFact', { value: undefined }>('UndefinedFact');

      const fact1 = NullFact.create({ value: null });
      const fact2 = UndefinedFact.create({ value: undefined });

      expect(fact1.payload.value).toBeNull();
      expect(fact2.payload.value).toBeUndefined();
    });

    it('should handle large number of facts', () => {
      const TestEvent = defineEvent<'TEST', {}>('TEST');
      const TestFact = defineFact<'TestFact', { index: number }>('TestFact');

      const rule = defineRule<{ count: number }>({
        id: 'many.facts',
        description: 'Generate many facts',
        impl: (_state, events) => {
          if (events.some(TestEvent.is)) {
            const facts = [];
            for (let i = 0; i < 1000; i++) {
              facts.push(TestFact.create({ index: i }));
            }
            return facts;
          }
          return [];
        },
      });

      const registry = new PraxisRegistry<{ count: number }>();
      registry.registerRule(rule);

      const engine = createPraxisEngine({
        initialContext: { count: 0 },
        registry,
      });

      const result = engine.step([TestEvent.create({})]);
      expect(result.state.facts).toHaveLength(1000);
    });

    it('should isolate context mutations between getContext calls', () => {
      const registry = new PraxisRegistry<{ value: number }>();
      const engine = createPraxisEngine({
        initialContext: { value: 10 },
        registry,
      });

      const context1 = engine.getContext();
      context1.value = 999;

      const context2 = engine.getContext();
      expect(context2.value).toBe(10); // Should be unchanged
    });
  });

  describe('Event Processing Edge Cases', () => {
    it('should handle duplicate events', () => {
      const TestEvent = defineEvent<'TEST', { id: string }>('TEST');
      const TestFact = defineFact<'TestFact', { count: number }>('TestFact');

      const rule = defineRule<{ count: number }>({
        id: 'count.events',
        description: 'Count test events',
        impl: (_state, events) => {
          const testEvents = events.filter(TestEvent.is);
          if (testEvents.length > 0) {
            return [TestFact.create({ count: testEvents.length })];
          }
          return [];
        },
      });

      const registry = new PraxisRegistry<{ count: number }>();
      registry.registerRule(rule);

      const engine = createPraxisEngine({
        initialContext: { count: 0 },
        registry,
      });

      const event = TestEvent.create({ id: 'test' });
      const result = engine.step([event, event, event]);

      const fact = result.state.facts.find((f) => f.tag === 'TestFact');
      expect(fact?.payload).toEqual({ count: 3 });
    });

    it('should handle events with empty payloads', () => {
      const EmptyEvent = defineEvent<'EMPTY', {}>('EMPTY');
      const EmptyFact = defineFact<'EmptyFact', {}>('EmptyFact');

      const rule = defineRule<{ triggered: boolean }>({
        id: 'empty.rule',
        description: 'Handle empty events',
        impl: (state, events) => {
          if (events.some(EmptyEvent.is)) {
            state.context.triggered = true;
            return [EmptyFact.create({})];
          }
          return [];
        },
      });

      const registry = new PraxisRegistry<{ triggered: boolean }>();
      registry.registerRule(rule);

      const engine = createPraxisEngine({
        initialContext: { triggered: false },
        registry,
      });

      engine.step([EmptyEvent.create({})]);
      expect(engine.getContext().triggered).toBe(true);
    });
  });
});
