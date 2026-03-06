/**
 * Decision Ledger Module
 *
 * Records, stores, and replays decisions for every mutating operation.
 * Import from this module to access types, events, and the ledger utilities.
 */

export type {
  DecisionCategory,
  DecisionOutcome,
  DecisionRecord,
  DecisionLedgerState,
} from './types.js';

export { DecisionRecordedEvent } from './events.js';

export {
  createDecisionLedgerState,
  appendDecision,
  filterByCategory,
  replayFrom,
  recordDecision,
  DecisionLedger,
  type DecisionInput,
} from './ledger.js';
