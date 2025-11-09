/**
 * Module: src/features/connection/index.ts
 * Owner: connection
 * Reads: (document)
 * Writes: (document)
 * Receives: (document)
 * Emits: (document)
 * Prohibitions: Do not mutate ApplicationContext directly; Do not define new *Context types
 * Rationale: (document)
 *
 * LLM-GUARD:
 * - Follow ownership boundaries; route events to Router; do not add UI logic here
 */
/**
 * Connection Module
 *
 * Modular connection management for Azure DevOps Integration.
 * Extracted from the large connectionMachine.ts file for better maintainability.
 */

// Main exports
export { connectionMachine } from './machine.js';
export type { ConnectionContext, ConnectionEvent, ProjectConnection } from './types.js';

// Utility exports
export * from './constants.js';
export * from './utils.js';

// Internal exports (for testing and advanced usage)
export * as guards from './guards.js';
export * as actions from './actions.js';
export * as services from './services.js';
