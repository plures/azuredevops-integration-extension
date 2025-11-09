/**
 * Module: src/fsm/machines/applicationMachine.states.ts
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
/**
 * State Name Constants for Application Machine
 *
 * Use these constants instead of string literals to:
 * 1. Get IntelliSense/autocomplete
 * 2. Prevent typos
 * 3. Enable safe refactoring
 *
 * Usage:
 * ```typescript
 * SET_QUERY: {
 *   actions: 'setActiveQuery',
 *   target: ApplicationStates.ACTIVE_READY_LOADING_DATA,
 * },
 * ```
 */

export const ApplicationStates = {
  // Top-level states
  INACTIVE: 'inactive',
  ACTIVATING: 'activating',
  ACTIVATION_FAILED: 'activation_failed',
  ACTIVE: 'active',
  ERROR_RECOVERY: 'error_recovery',
  DEACTIVATING: 'deactivating',

  // Active sub-states
  ACTIVE_SETUP: 'active.setup',
  'active.setup.loading_connections': 'active.setup.loading_connections',
  'active.setup.waiting_for_panel': 'active.setup.waiting_for_panel',
  'active.setup.panel_ready': 'active.setup.panel_ready',
  'active.setup.setup_error': 'active.setup.setup_error',

  // Active.ready sub-states
  ACTIVE_READY: 'active.ready',
  'active.ready.idle': 'active.ready.idle',
  'active.ready.loadingData': 'active.ready.loadingData',
  'active.ready.managingConnections': 'active.ready.managingConnections',
  'active.ready.error': 'active.ready.error',
} as const;

export type ApplicationState = (typeof ApplicationStates)[keyof typeof ApplicationStates];

/**
 * Helper to create relative state transitions
 * Use for transitions within the same parent state
 */
export function relativeState(state: string): string {
  return `.${state}`;
}

/**
 * Type-safe transition helper
 * Validates that target state exists in the machine
 */
export function createTransition(target: ApplicationState) {
  return { target };
}
