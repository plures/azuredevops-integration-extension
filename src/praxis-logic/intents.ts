/**
 * Praxis Logic – Workflow Intents
 *
 * Named constants that describe the major user-facing workflows.
 * Rules, adapters, and decision records reference these constants
 * so the vocabulary stays consistent across the codebase.
 */

// ============================================================================
// Auth intents
// ============================================================================

export const AUTH_INTENTS = {
  SIGN_IN_ENTRA: 'auth.signInEntra',
  SIGN_OUT_ENTRA: 'auth.signOutEntra',
  DEVICE_CODE_START: 'auth.deviceCodeStart',
  DEVICE_CODE_COMPLETE: 'auth.deviceCodeComplete',
  DEVICE_CODE_CANCEL: 'auth.deviceCodeCancel',
  AUTH_CODE_FLOW_START: 'auth.authCodeFlowStart',
  AUTH_CODE_FLOW_COMPLETE: 'auth.authCodeFlowComplete',
  SUCCESS: 'auth.success',
  FAILED: 'auth.failed',
} as const;

export type AuthIntent = (typeof AUTH_INTENTS)[keyof typeof AUTH_INTENTS];

// ============================================================================
// Work-item intents
// ============================================================================

export const WORK_ITEM_INTENTS = {
  CREATE: 'workItem.create',
  LOAD: 'workItem.load',
  ERROR: 'workItem.error',
  BULK_ASSIGN: 'workItem.bulkAssign',
  GENERATE_COPILOT_PROMPT: 'workItem.generateCopilotPrompt',
} as const;

export type WorkItemIntent = (typeof WORK_ITEM_INTENTS)[keyof typeof WORK_ITEM_INTENTS];

// ============================================================================
// Branch / PR intents
// ============================================================================

export const BRANCH_INTENTS = {
  CREATE: 'branch.create',
} as const;

export type BranchIntent = (typeof BRANCH_INTENTS)[keyof typeof BRANCH_INTENTS];

export const PULL_REQUEST_INTENTS = {
  CREATE: 'pullRequest.create',
  SHOW: 'pullRequest.show',
} as const;

export type PullRequestIntent =
  (typeof PULL_REQUEST_INTENTS)[keyof typeof PULL_REQUEST_INTENTS];

// ============================================================================
// Connection / lifecycle intents
// ============================================================================

export const CONNECTION_INTENTS = {
  SELECT: 'connection.select',
  LOAD: 'connection.load',
  STATE_UPDATED: 'connection.stateUpdated',
} as const;

export type ConnectionIntent = (typeof CONNECTION_INTENTS)[keyof typeof CONNECTION_INTENTS];

export const LIFECYCLE_INTENTS = {
  ACTIVATE: 'lifecycle.activate',
  ACTIVATION_COMPLETE: 'lifecycle.activationComplete',
  ACTIVATION_FAILED: 'lifecycle.activationFailed',
  DEACTIVATE: 'lifecycle.deactivate',
  DEACTIVATION_COMPLETE: 'lifecycle.deactivationComplete',
  RESET: 'lifecycle.reset',
  RETRY: 'lifecycle.retry',
} as const;

export type LifecycleIntent = (typeof LIFECYCLE_INTENTS)[keyof typeof LIFECYCLE_INTENTS];

/**
 * Union of all workflow intents
 */
export type WorkflowIntent =
  | AuthIntent
  | WorkItemIntent
  | BranchIntent
  | PullRequestIntent
  | ConnectionIntent
  | LifecycleIntent;
