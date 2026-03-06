/**
 * Decision Ledger Tests
 *
 * Unit tests for the decision-ledger module: pure functions and
 * the DecisionLedger helper class.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDecisionLedgerState,
  appendDecision,
  filterByCategory,
  replayFrom,
  DecisionLedger,
  type DecisionInput,
} from '../../src/decision-ledger/index.js';

describe('createDecisionLedgerState', () => {
  it('returns empty entries and version 0', () => {
    const state = createDecisionLedgerState();
    expect(state.entries).toHaveLength(0);
    expect(state.version).toBe(0);
  });
});

describe('appendDecision', () => {
  it('increments version on each append', () => {
    let state = createDecisionLedgerState();

    const r1 = appendDecision(state, {
      category: 'auth',
      operation: 'signIn',
      outcome: 'allowed',
      rationale: 'User triggered sign-in',
    });
    state = r1.state;
    expect(r1.state.version).toBe(1);
    expect(r1.record.version).toBe(1);

    const r2 = appendDecision(state, {
      category: 'work-item',
      operation: 'createWorkItem',
      outcome: 'allowed',
      rationale: 'Create work item requested',
    });
    expect(r2.state.version).toBe(2);
    expect(r2.record.version).toBe(2);
  });

  it('does not mutate the original state', () => {
    const state = createDecisionLedgerState();
    appendDecision(state, {
      category: 'auth',
      operation: 'signOut',
      outcome: 'allowed',
      rationale: 'Sign-out requested',
    });
    expect(state.entries).toHaveLength(0);
    expect(state.version).toBe(0);
  });

  it('stores all supplied fields on the record', () => {
    const state = createDecisionLedgerState();
    const input: DecisionInput = {
      category: 'branch',
      operation: 'createBranch',
      outcome: 'allowed',
      rationale: 'Branch creation triggered',
      connectionId: 'conn-1',
      payload: { workItemId: 42 },
    };
    const { record } = appendDecision(state, input);
    expect(record.category).toBe('branch');
    expect(record.operation).toBe('createBranch');
    expect(record.outcome).toBe('allowed');
    expect(record.rationale).toBe('Branch creation triggered');
    expect(record.connectionId).toBe('conn-1');
    expect(record.payload).toEqual({ workItemId: 42 });
    expect(typeof record.id).toBe('string');
    expect(typeof record.timestamp).toBe('number');
  });
});

describe('filterByCategory', () => {
  it('returns only records matching the given category', () => {
    let state = createDecisionLedgerState();
    state = appendDecision(state, {
      category: 'auth',
      operation: 'signIn',
      outcome: 'allowed',
      rationale: '',
    }).state;
    state = appendDecision(state, {
      category: 'branch',
      operation: 'createBranch',
      outcome: 'allowed',
      rationale: '',
    }).state;
    state = appendDecision(state, {
      category: 'auth',
      operation: 'signOut',
      outcome: 'allowed',
      rationale: '',
    }).state;

    const authEntries = filterByCategory(state, 'auth');
    expect(authEntries).toHaveLength(2);
    expect(authEntries.every((e) => e.category === 'auth')).toBe(true);

    const branchEntries = filterByCategory(state, 'branch');
    expect(branchEntries).toHaveLength(1);
  });

  it('returns empty array when no matches', () => {
    const state = createDecisionLedgerState();
    expect(filterByCategory(state, 'work-item')).toHaveLength(0);
  });
});

describe('replayFrom', () => {
  it('returns entries with version >= fromVersion', () => {
    let state = createDecisionLedgerState();
    state = appendDecision(state, {
      category: 'lifecycle',
      operation: 'activate',
      outcome: 'allowed',
      rationale: '',
    }).state;
    state = appendDecision(state, {
      category: 'connection',
      operation: 'selectConnection',
      outcome: 'allowed',
      rationale: '',
    }).state;
    state = appendDecision(state, {
      category: 'work-item',
      operation: 'createWorkItem',
      outcome: 'allowed',
      rationale: '',
    }).state;

    const fromTwo = replayFrom(state, 2);
    expect(fromTwo).toHaveLength(2);
    expect(fromTwo[0].version).toBe(2);
    expect(fromTwo[1].version).toBe(3);
  });

  it('returns all entries when fromVersion is 0', () => {
    let state = createDecisionLedgerState();
    state = appendDecision(state, {
      category: 'auth',
      operation: 'signIn',
      outcome: 'allowed',
      rationale: '',
    }).state;
    state = appendDecision(state, {
      category: 'auth',
      operation: 'signOut',
      outcome: 'allowed',
      rationale: '',
    }).state;

    expect(replayFrom(state, 0)).toHaveLength(2);
  });
});

describe('DecisionLedger class', () => {
  let ledger: DecisionLedger;

  beforeEach(() => {
    ledger = new DecisionLedger();
  });

  it('starts empty', () => {
    expect(ledger.getEntries()).toHaveLength(0);
    expect(ledger.version).toBe(0);
  });

  it('records decisions and increments version', () => {
    ledger.record({ category: 'auth', operation: 'signIn', outcome: 'allowed', rationale: 'Test' });
    expect(ledger.getEntries()).toHaveLength(1);
    expect(ledger.version).toBe(1);

    ledger.record({
      category: 'branch',
      operation: 'createBranch',
      outcome: 'allowed',
      rationale: 'Test',
    });
    expect(ledger.getEntries()).toHaveLength(2);
    expect(ledger.version).toBe(2);
  });

  it('getByCategory filters correctly', () => {
    ledger.record({ category: 'auth', operation: 'signIn', outcome: 'allowed', rationale: '' });
    ledger.record({
      category: 'work-item',
      operation: 'createWorkItem',
      outcome: 'allowed',
      rationale: '',
    });
    ledger.record({ category: 'auth', operation: 'signOut', outcome: 'allowed', rationale: '' });

    expect(ledger.getByCategory('auth')).toHaveLength(2);
    expect(ledger.getByCategory('work-item')).toHaveLength(1);
    expect(ledger.getByCategory('branch')).toHaveLength(0);
  });

  it('replay returns decisions from a given version', () => {
    ledger.record({
      category: 'lifecycle',
      operation: 'activate',
      outcome: 'allowed',
      rationale: '',
    });
    ledger.record({
      category: 'connection',
      operation: 'select',
      outcome: 'allowed',
      rationale: '',
    });
    ledger.record({ category: 'auth', operation: 'signIn', outcome: 'allowed', rationale: '' });

    const fromV2 = ledger.replay(2);
    expect(fromV2).toHaveLength(2);
    expect(fromV2[0].version).toBe(2);
  });

  it('clear resets the ledger', () => {
    ledger.record({ category: 'auth', operation: 'signIn', outcome: 'allowed', rationale: '' });
    ledger.clear();
    expect(ledger.getEntries()).toHaveLength(0);
    expect(ledger.version).toBe(0);
  });

  it('toState exports serializable state', () => {
    ledger.record({ category: 'auth', operation: 'signIn', outcome: 'allowed', rationale: 'r' });
    const st = ledger.toState();
    expect(st.version).toBe(1);
    expect(st.entries).toHaveLength(1);
  });

  it('accepts initial state via constructor', () => {
    const initial = createDecisionLedgerState();
    const r = appendDecision(initial, {
      category: 'auth',
      operation: 'a',
      outcome: 'allowed',
      rationale: '',
    });
    const fromExisting = new DecisionLedger(r.state);
    expect(fromExisting.version).toBe(1);
    expect(fromExisting.getEntries()).toHaveLength(1);
  });
});
