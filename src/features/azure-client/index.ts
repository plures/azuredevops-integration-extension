/**
 * Module: src/features/azure-client/index.ts
 * Owner: application
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
export * from './types.js';
export * from './http-client.js';
// Export WorkItem from types.js to avoid conflict with work-items-service.ts
export { WorkItemsService } from './work-items-service.js';
export * from './azure-client.js';
