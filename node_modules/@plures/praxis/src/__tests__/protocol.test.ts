/**
 * Core protocol tests
 */

import { describe, it, expect } from 'vitest';
import type { PraxisFact, PraxisEvent, PraxisState } from '../core/protocol.js';

describe('Protocol Types', () => {
  it('should create a valid fact', () => {
    const fact: PraxisFact = {
      tag: 'TestFact',
      payload: { value: 42 },
    };

    expect(fact.tag).toBe('TestFact');
    expect(fact.payload).toEqual({ value: 42 });
  });

  it('should create a valid event', () => {
    const event: PraxisEvent = {
      tag: 'TEST_EVENT',
      payload: { action: 'test' },
    };

    expect(event.tag).toBe('TEST_EVENT');
    expect(event.payload).toEqual({ action: 'test' });
  });

  it('should create a valid state', () => {
    const state: PraxisState = {
      context: { count: 0 },
      facts: [{ tag: 'CountInitialized', payload: {} }],
      meta: { version: '1.0.0' },
    };

    expect(state.context).toEqual({ count: 0 });
    expect(state.facts).toHaveLength(1);
    expect(state.meta?.version).toBe('1.0.0');
  });
});
