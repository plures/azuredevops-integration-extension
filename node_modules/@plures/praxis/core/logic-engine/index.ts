/**
 * Praxis Logic Engine
 *
 * The Logic Engine is the core module responsible for:
 * - Processing events through rules
 * - Checking constraints
 * - Managing state transitions
 * - Schema-driven rule evaluation
 *
 * The engine is pure and deterministic - all state updates are immutable.
 */

export * from './engine.js';
export * from './rules.js';
export * from './protocol.js';
export * from './psf-adapter.js';
