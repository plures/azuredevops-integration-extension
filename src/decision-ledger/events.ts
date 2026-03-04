/**
 * Decision Ledger Events
 *
 * Praxis event definitions emitted whenever a decision is recorded.
 * Rules and adapters listen for these to update the ledger state.
 */

import { defineEvent } from '@plures/praxis';
import type { DecisionRecord } from './types.js';

/**
 * Emitted when a new decision is recorded in the ledger.
 * The payload is the full, immutable DecisionRecord.
 */
export const DecisionRecordedEvent = defineEvent<'DECISION_RECORDED', DecisionRecord>(
  'DECISION_RECORDED'
);
