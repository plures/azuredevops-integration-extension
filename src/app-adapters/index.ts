/**
 * App Adapters Module
 *
 * Defines the adapter interface contracts for UI and ADO API orchestration.
 * Adapters are the ONLY layer allowed to perform side effects (API calls,
 * VS Code commands, etc.). They dispatch Praxis events to communicate
 * outcomes back into the logic engine.
 *
 * Module boundaries:
 *  - app-adapters/  → orchestration, side effects (this module)
 *  - praxis-logic/  → pure rules and intents (no side effects)
 *  - decision-ledger/ → decision recording and replay
 */

export type {
  AuthAdapter,
  WorkItemAdapter,
  BranchPrAdapter,
  ConnectionAdapter,
} from './types.js';
