/**
 * Module: src/config/constants.ts
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
export const EXTENSION_CONFIG_NAMESPACE = 'azureDevOpsIntegration';
export const LEGACY_EXTENSION_CONFIG_NAMESPACE = 'azureDevOps';
export const CONNECTIONS_CONFIG_STORAGE_KEY = 'connections';
export const ACTIVE_CONNECTION_STORAGE_KEY = 'azureDevOpsInt.activeConnectionId';
export const GLOBAL_PAT_SECRET_KEY = 'azureDevOpsInt.pat';
