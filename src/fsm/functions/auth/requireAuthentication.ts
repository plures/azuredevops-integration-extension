/**
 * Module: src/fsm/functions/auth/requireAuthentication.ts
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
import type { ApplicationContext, AuthReminderReason } from '../../machines/applicationMachine.js';

export type RequireAuthenticationMessage = {
  type: 'requireAuthentication';
  connectionId?: unknown;
};

export type RequireAuthenticationPlan = {
  connectionId?: string;
  interactiveAuth?: {
    connectionId: string;
    reason: AuthReminderReason;
    detail?: string;
  };
  warnings: string[];
};

export function planRequireAuthentication(
  context: ApplicationContext,
  message: RequireAuthenticationMessage
): RequireAuthenticationPlan {
  const warnings: string[] = [];
  const connectionId = normalizeConnectionId(message?.connectionId);

  if (!connectionId) {
    warnings.push('missing_connection_id');
    return {
      warnings,
    };
  }

  const state = context.connectionStates.get(connectionId);
  if (!state) {
    warnings.push('connection_state_missing');
    return {
      connectionId,
      warnings,
    };
  }

  if (state.reauthInProgress) {
    warnings.push('reauth_in_progress');
    return {
      connectionId,
      warnings,
    };
  }

  const reason: AuthReminderReason = 'authFailed';

  return {
    connectionId,
    interactiveAuth: {
      connectionId,
      reason,
    },
    warnings,
  };
}

function normalizeConnectionId(raw: unknown): string | undefined {
  if (typeof raw !== 'string') {
    return undefined;
  }

  const value = raw.trim();
  return value.length > 0 ? value : undefined;
}
