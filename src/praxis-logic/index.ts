/**
 * Praxis Logic Module
 *
 * Exposes the domain logic layer: rules, intents, and derivations.
 * This module is the single boundary that UI components and app adapters
 * should import from when they need business logic.
 *
 * Module boundaries:
 *  - praxis-logic/  → pure rules, intents, derivations (no side effects)
 *  - decision-ledger/ → decision recording and replay
 *  - app-adapters/  → orchestration, VS Code API, ADO API calls
 */

// Domain rules (re-exported for consumers that need to compose engines)
export { applicationRules } from '../praxis/application/rules/index.js';

// Named workflow intents
export {
  AUTH_INTENTS,
  WORK_ITEM_INTENTS,
  BRANCH_INTENTS,
  PULL_REQUEST_INTENTS,
  CONNECTION_INTENTS,
  LIFECYCLE_INTENTS,
} from './intents.js';

export type {
  AuthIntent,
  WorkItemIntent,
  BranchIntent,
  PullRequestIntent,
  ConnectionIntent,
  LifecycleIntent,
  WorkflowIntent,
} from './intents.js';
