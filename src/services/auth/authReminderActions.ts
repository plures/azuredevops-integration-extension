/**
 * Module: src/fsm/functions/auth/authReminderActions.ts
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
import type {
  ApplicationContext,
  AuthReminderReason,
  AuthReminderState,
} from '../../machines/applicationTypes.js';
import { buildAuthReminder } from './buildAuthReminder.js';

export type AuthReminderActionMessage = {
  type: 'authReminderAction';
  connectionId?: unknown;
  action?: unknown;
};

export type AuthReminderActionPlan = {
  handled: boolean;
  connectionId?: string;
  pendingAuthReminders: Map<string, AuthReminderState>;
  notify?: {
    type: 'clear';
    connectionId: string;
  };
  interactiveAuth?: {
    connectionId: string;
    reason: AuthReminderReason;
    detail?: string;
  };
  warnings: string[];
};

export const AUTH_REMINDER_SNOOZE_MS = 30 * 60 * 1000;

export function handleAuthReminderAction(
  context: ApplicationContext,
  message: AuthReminderActionMessage,
  options?: {
    now?: number;
    snoozeMs?: number;
  }
): AuthReminderActionPlan {
  const warnings: string[] = [];
  const connectionId = normalizeConnectionId(message?.connectionId);

  if (!connectionId) {
    warnings.push('missing_connection_id');
    return {
      handled: false,
      pendingAuthReminders: context.pendingAuthReminders,
      warnings,
    };
  }

  const action = normalizeAction(message?.action);
  if (!action) {
    warnings.push('missing_action');
    return {
      handled: false,
      connectionId,
      pendingAuthReminders: context.pendingAuthReminders,
      warnings,
    };
  }

  const nextReminders = new Map(context.pendingAuthReminders);
  const now = typeof options?.now === 'number' ? options!.now : Date.now();
  const snoozeMs =
    typeof options?.snoozeMs === 'number' ? options!.snoozeMs : AUTH_REMINDER_SNOOZE_MS;

  if (action === 'signIn') {
    const existing = nextReminders.get(connectionId);
    if (existing) {
      nextReminders.delete(connectionId);
    } else {
      nextReminders.delete(connectionId);
      warnings.push('reminder_not_found');
    }

    const reason: AuthReminderReason = existing?.reason ?? 'authFailed';

    return {
      handled: true,
      connectionId,
      pendingAuthReminders: nextReminders,
      notify: { type: 'clear', connectionId },
      interactiveAuth: {
        connectionId,
        reason,
        detail: existing?.detail,
      },
      warnings,
    };
  }

  if (action === 'dismiss') {
    const snoozeUntil = now + snoozeMs;
    let reminder = nextReminders.get(connectionId);

    if (!reminder) {
      const built = buildAuthReminder(context, {
        connectionId,
        reason: 'authFailed',
        now,
      });

      if (!built) {
        warnings.push('reminder_unavailable');
        return {
          handled: false,
          connectionId,
          pendingAuthReminders: context.pendingAuthReminders,
          warnings,
        };
      }

      reminder = built;
    }

    nextReminders.set(connectionId, {
      ...reminder,
      status: 'dismissed',
      snoozeUntil,
    });

    return {
      handled: true,
      connectionId,
      pendingAuthReminders: nextReminders,
      warnings,
    };
  }

  warnings.push('unknown_action');
  return {
    handled: false,
    connectionId,
    pendingAuthReminders: context.pendingAuthReminders,
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

function normalizeAction(raw: unknown): string | undefined {
  if (typeof raw !== 'string') {
    return undefined;
  }

  const value = raw.trim();
  return value.length > 0 ? value : undefined;
}
