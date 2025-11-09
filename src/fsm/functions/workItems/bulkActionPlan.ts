/**
 * Module: src/fsm/functions/workItems/bulkActionPlan.ts
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
import type { ApplicationContext } from '../../machines/applicationMachine.js';

export type BulkActionMessage = {
  type: 'bulkAssign' | 'bulkMove' | 'bulkAddTags' | 'bulkDelete';
  connectionId?: unknown;
};

export type BulkActionKind = 'assign' | 'move' | 'addTags' | 'delete';

export type BulkActionPlan = {
  handled: boolean;
  action?: BulkActionKind;
  connectionId?: string;
  warnings: string[];
};

export function planBulkAction(
  context: ApplicationContext,
  message: BulkActionMessage
): BulkActionPlan {
  const warnings: string[] = [];
  const action = resolveActionKind(message?.type);

  if (!action) {
    warnings.push('unknown_action');
    return {
      handled: false,
      warnings,
    };
  }

  const connectionId = normalizeConnectionId(message?.connectionId) ?? context.activeConnectionId;
  if (!connectionId) {
    warnings.push('missing_connection_id');
    return {
      handled: false,
      action,
      warnings,
    };
  }

  const connectionState = context.connectionStates.get(connectionId);
  if (!connectionState) {
    warnings.push('connection_state_missing');
    return {
      handled: false,
      action,
      connectionId,
      warnings,
    };
  }

  let handled = true;

  if (!connectionState.client) {
    warnings.push('client_unavailable');
    handled = false;
  }

  if (!connectionState.provider) {
    warnings.push('provider_unavailable');
    handled = false;
  }

  return {
    handled,
    action,
    connectionId,
    warnings,
  };
}

function resolveActionKind(
  type: BulkActionMessage['type'] | undefined
): BulkActionKind | undefined {
  switch (type) {
    case 'bulkAssign':
      return 'assign';
    case 'bulkMove':
      return 'move';
    case 'bulkAddTags':
      return 'addTags';
    case 'bulkDelete':
      return 'delete';
    default:
      return undefined;
  }
}

function normalizeConnectionId(raw: unknown): string | undefined {
  if (typeof raw !== 'string') {
    return undefined;
  }

  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
