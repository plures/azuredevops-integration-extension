/**
 * Decision Ledger Events
 *
 * Praxis event definitions for the decision ledger domain.
 * Note: these events are currently reserved for future use and are not
 * emitted by the core decision rules; ledger state is updated directly.
 */

import { defineEvent } from '@plures/praxis';
import type { DecisionRecord } from './types.js';

/**
 * Event definition representing a decision recorded in the ledger.
 *
 * This defines the payload shape (a full, immutable DecisionRecord) for
 * tooling and future emitters. As of now, it is not emitted by the core
 * decision rules and serves as a reserved extension point.
 */
export const DecisionRecordedEvent = defineEvent<'DECISION_RECORDED', DecisionRecord>(
  'DECISION_RECORDED'
);
