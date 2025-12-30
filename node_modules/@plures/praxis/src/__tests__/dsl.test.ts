/**
 * DSL tests
 */

import { describe, it, expect } from 'vitest';
import {
  defineFact,
  defineEvent,
  defineRule,
  defineConstraint,
  defineModule,
  findEvent,
  findFact,
} from '../dsl/index.js';

describe('DSL Helpers', () => {
  describe('defineFact', () => {
    it('should create a fact definition', () => {
      const TestFact = defineFact<'TestFact', { value: number }>('TestFact');

      expect(TestFact.tag).toBe('TestFact');

      const fact = TestFact.create({ value: 42 });
      expect(fact.tag).toBe('TestFact');
      expect(fact.payload.value).toBe(42);
    });

    it('should provide type guard', () => {
      const TestFact = defineFact<'TestFact', { value: number }>('TestFact');
      const fact = TestFact.create({ value: 42 });

      expect(TestFact.is(fact)).toBe(true);
      expect(TestFact.is({ tag: 'OtherFact', payload: {} })).toBe(false);
    });
  });

  describe('defineEvent', () => {
    it('should create an event definition', () => {
      const TestEvent = defineEvent<'TEST', { action: string }>('TEST');

      expect(TestEvent.tag).toBe('TEST');

      const event = TestEvent.create({ action: 'test' });
      expect(event.tag).toBe('TEST');
      expect(event.payload.action).toBe('test');
    });

    it('should provide type guard', () => {
      const TestEvent = defineEvent<'TEST', { action: string }>('TEST');
      const event = TestEvent.create({ action: 'test' });

      expect(TestEvent.is(event)).toBe(true);
      expect(TestEvent.is({ tag: 'OTHER', payload: {} })).toBe(false);
    });
  });

  describe('defineRule', () => {
    it('should create a rule descriptor', () => {
      const rule = defineRule({
        id: 'test.rule',
        description: 'Test rule',
        impl: () => [],
      });

      expect(rule.id).toBe('test.rule');
      expect(rule.description).toBe('Test rule');
      expect(typeof rule.impl).toBe('function');
    });
  });

  describe('defineConstraint', () => {
    it('should create a constraint descriptor', () => {
      const constraint = defineConstraint({
        id: 'test.constraint',
        description: 'Test constraint',
        impl: () => true,
      });

      expect(constraint.id).toBe('test.constraint');
      expect(constraint.description).toBe('Test constraint');
      expect(typeof constraint.impl).toBe('function');
    });
  });

  describe('defineModule', () => {
    it('should create a module', () => {
      const rule = defineRule({
        id: 'test.rule',
        description: 'Test rule',
        impl: () => [],
      });

      const constraint = defineConstraint({
        id: 'test.constraint',
        description: 'Test constraint',
        impl: () => true,
      });

      const module = defineModule({
        rules: [rule],
        constraints: [constraint],
        meta: { version: '1.0.0' },
      });

      expect(module.rules).toHaveLength(1);
      expect(module.constraints).toHaveLength(1);
      expect(module.meta?.version).toBe('1.0.0');
    });
  });

  describe('findEvent', () => {
    it('should find matching event', () => {
      const TestEvent = defineEvent<'TEST', { value: number }>('TEST');
      const events = [{ tag: 'OTHER', payload: {} }, TestEvent.create({ value: 42 })];

      const found = findEvent(events, TestEvent);
      expect(found).toBeDefined();
      expect(found?.payload.value).toBe(42);
    });

    it('should return undefined if not found', () => {
      const TestEvent = defineEvent<'TEST', { value: number }>('TEST');
      const events = [{ tag: 'OTHER', payload: {} }];

      const found = findEvent(events, TestEvent);
      expect(found).toBeUndefined();
    });
  });

  describe('findFact', () => {
    it('should find matching fact', () => {
      const TestFact = defineFact<'TestFact', { value: number }>('TestFact');
      const facts = [{ tag: 'OtherFact', payload: {} }, TestFact.create({ value: 42 })];

      const found = findFact(facts, TestFact);
      expect(found).toBeDefined();
      expect(found?.payload.value).toBe(42);
    });

    it('should return undefined if not found', () => {
      const TestFact = defineFact<'TestFact', { value: number }>('TestFact');
      const facts = [{ tag: 'OtherFact', payload: {} }];

      const found = findFact(facts, TestFact);
      expect(found).toBeUndefined();
    });
  });
});
