/**
 * Praxis Application Rules – Decision Ledger
 *
 * Re-exports all decision rules from their focused sub-files.
 * Every mutating operation records a DecisionRecord in the engine context,
 * providing a replayable audit trail of application decisions.
 */

export { authDecisionRules } from './decisionRules.auth.js';
export { operationsDecisionRules } from './decisionRules.operations.js';

import { authDecisionRules } from './decisionRules.auth.js';
import { operationsDecisionRules } from './decisionRules.operations.js';

/**
 * All decision rules combined
 */
export const decisionRules = [...authDecisionRules, ...operationsDecisionRules];
