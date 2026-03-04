/**
 * App Adapters – Interface Contracts
 *
 * Defines the boundaries for adapter modules that orchestrate side effects.
 * Concrete implementations live alongside VS Code / ADO API callers and
 * dispatch Praxis events. They must NOT contain business logic; that belongs
 * in praxis-logic/.
 */

import type { ProjectConnection } from '../praxis/connection/types.js';

/**
 * Adapter for authentication operations.
 * Implementations dispatch Praxis events; they do not make policy decisions.
 */
export interface AuthAdapter {
  /** Initiate Entra ID sign-in for a connection. */
  signInEntra(connectionId: string, forceInteractive?: boolean): Promise<void>;
  /** Sign out of Entra ID for a connection. */
  signOutEntra(connectionId: string): Promise<void>;
  /** Cancel a pending device code flow. */
  cancelDeviceCode(connectionId: string): Promise<void>;
}

/**
 * Adapter for work-item operations.
 * Implementations call the ADO API and emit results as Praxis events.
 */
export interface WorkItemAdapter {
  /** Trigger creation of a new work item for the given connection. */
  createWorkItem(connectionId: string): Promise<void>;
  /** Bulk-assign work items. */
  bulkAssign(connectionId: string, workItemIds: number[]): Promise<void>;
}

/**
 * Adapter for branch and pull-request operations.
 */
export interface BranchPrAdapter {
  /** Create a branch, optionally linked to a work item. */
  createBranch(connectionId: string, workItemId?: number): Promise<void>;
  /** Create a pull request, optionally linked to a work item. */
  createPullRequest(connectionId: string, workItemId?: number): Promise<void>;
  /** Open the pull-requests view for a connection. */
  showPullRequests(connectionId: string): Promise<void>;
}

/**
 * Adapter for connection lifecycle operations.
 */
export interface ConnectionAdapter {
  /** Load and publish available project connections. */
  loadConnections(): Promise<ProjectConnection[]>;
  /** Refresh work items for the given connection. */
  refreshWorkItems(connectionId: string): Promise<void>;
}
