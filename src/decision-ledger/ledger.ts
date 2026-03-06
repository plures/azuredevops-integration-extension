/**
 * Decision Ledger
 *
 * Standalone class for recording, querying, and replaying decision records.
 * Consumers that need an in-memory ledger (e.g. adapters, tests) use this
 * directly. The Praxis engine stores ledger state inside ApplicationEngineContext
 * via the decision rules.
 */

import type {
  DecisionCategory,
  DecisionLedgerState,
  DecisionRecord,
  DecisionOutcome,
} from './types.js';

function makeId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `dl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Input for creating a new decision entry (all derived fields are computed).
 */
export interface DecisionInput {
  category: DecisionCategory;
  operation: string;
  outcome: DecisionOutcome;
  rationale: string;
  connectionId?: string;
  payload?: Record<string, unknown>;
}

/**
 * Create a fresh, empty ledger state.
 */
export function createDecisionLedgerState(): DecisionLedgerState {
  return { entries: [], version: 0 };
}

/**
 * Pure function: append a new DecisionRecord to an existing ledger state.
 * Returns a new state object (immutable update pattern).
 */
export function appendDecision(
  state: DecisionLedgerState,
  input: DecisionInput
): { state: DecisionLedgerState; record: DecisionRecord } {
  const nextVersion = state.version + 1;
  const record: DecisionRecord = {
    id: makeId(),
    timestamp: Date.now(),
    version: nextVersion,
    category: input.category,
    operation: input.operation,
    outcome: input.outcome,
    rationale: input.rationale,
    connectionId: input.connectionId,
    payload: input.payload,
  };

  return {
    state: {
      entries: [...state.entries, record],
      version: nextVersion,
    },
    record,
  };
}

/**
 * Pure function: return all entries matching a given category.
 */
export function filterByCategory(
  state: DecisionLedgerState,
  category: DecisionCategory
): DecisionRecord[] {
  return state.entries.filter((e) => e.category === category);
}

/**
 * Helper for Praxis rule implementations.
 * Mutates `context.decisionLedger` in place (following the Praxis rule
 * mutation pattern) and returns the created record.
 */
export function recordDecision(
  context: { decisionLedger: DecisionLedgerState },
  input: DecisionInput
): DecisionRecord {
  const result = appendDecision(context.decisionLedger, input);
  context.decisionLedger = result.state;
  return result.record;
}

/**
 * Pure function: return all entries from a given version onward (inclusive).
 * Useful for replaying decisions after a known checkpoint.
 */
export function replayFrom(state: DecisionLedgerState, fromVersion: number): DecisionRecord[] {
  return state.entries.filter((e) => e.version >= fromVersion);
}

/**
 * Stateful helper class for use in adapters and tests.
 * Wraps the pure functions above with mutable state management.
 */
export class DecisionLedger {
  private _state: DecisionLedgerState;

  constructor(initial?: DecisionLedgerState) {
    this._state = initial ?? createDecisionLedgerState();
  }

  /** Record a decision and return the new record. */
  record(input: DecisionInput): DecisionRecord {
    const result = appendDecision(this._state, input);
    this._state = result.state;
    return result.record;
  }

  /** Return all recorded decisions. */
  getEntries(): DecisionRecord[] {
    return [...this._state.entries];
  }

  /** Return decisions for a specific category. */
  getByCategory(category: DecisionCategory): DecisionRecord[] {
    return filterByCategory(this._state, category);
  }

  /** Replay decisions from a given ledger version onward. */
  replay(fromVersion = 0): DecisionRecord[] {
    return replayFrom(this._state, fromVersion);
  }

  /** Current ledger version. */
  get version(): number {
    return this._state.version;
  }

  /** Export ledger state (for serialization or engine context). */
  toState(): DecisionLedgerState {
    return { ...this._state };
  }

  /** Reset the ledger to empty. */
  clear(): void {
    this._state = createDecisionLedgerState();
  }
}
