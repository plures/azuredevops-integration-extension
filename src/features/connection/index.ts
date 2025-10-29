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
