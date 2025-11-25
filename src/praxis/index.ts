/**
 * Praxis Module
 *
 * Main entry point for Praxis logic engine implementations.
 * This module provides alternatives to XState FSMs using the Praxis logic engine.
 */

// Timer module
export * from './timer/index.js';

// Authentication module
export * from './auth/index.js';

// Connection module
export * from './connection/index.js';

// Re-export commonly used Praxis types for convenience
export {
  createPraxisEngine,
  PraxisRegistry,
  LogicEngine,
  defineFact,
  defineEvent,
  defineRule,
  defineConstraint,
  filterEvents,
  filterFacts,
  findEvent,
  findFact,
} from '@plures/praxis';

export type {
  PraxisFact,
  PraxisEvent,
  PraxisState,
  PraxisStepResult,
  PraxisDiagnostics,
} from '@plures/praxis';
