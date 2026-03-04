/**
 * Decision Ledger Types
 *
 * Defines the data structures for the decision ledger module.
 * Every mutating operation records a DecisionRecord for auditability and replay.
 */

/**
 * Domain categories for decisions
 */
export type DecisionCategory =
  | 'auth'
  | 'work-item'
  | 'branch'
  | 'pull-request'
  | 'connection'
  | 'lifecycle';

/**
 * The outcome of a policy decision
 */
export type DecisionOutcome = 'allowed' | 'denied' | 'deferred';

/**
 * A single recorded decision for a mutating operation.
 * Immutable once created.
 */
export interface DecisionRecord {
  /** Unique identifier for this decision */
  readonly id: string;
  /** Unix timestamp (ms) when the decision was recorded */
  readonly timestamp: number;
  /** Monotonically increasing version counter in the ledger */
  readonly version: number;
  /** Domain category */
  readonly category: DecisionCategory;
  /** Operation name, e.g. 'signIn', 'createWorkItem' */
  readonly operation: string;
  /** Connection scope, if applicable */
  readonly connectionId?: string;
  /** Whether the operation was allowed, denied, or deferred */
  readonly outcome: DecisionOutcome;
  /** Human-readable reason for the outcome */
  readonly rationale: string;
  /** Arbitrary metadata captured at decision time */
  readonly payload?: Record<string, unknown>;
}

/**
 * Lightweight state stored inside ApplicationEngineContext
 */
export interface DecisionLedgerState {
  /** Ordered list of decisions, newest last */
  readonly entries: DecisionRecord[];
  /** Current ledger version (incremented on each record) */
  readonly version: number;
}
