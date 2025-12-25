/**
 * Module: src/fsm/functions/auth/buildAuthReminder.ts
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

export type BuildAuthReminderParams = {
  connectionId: string;
  reason: AuthReminderReason;
  detail?: string;
  now?: number;
};

const WEBVIEW_ACTION_DETAIL =
  'Use Sign In here or select the authentication status bar item to reconnect.';

export function buildAuthReminder(
  context: ApplicationContext,
  params: BuildAuthReminderParams
): AuthReminderState | null {
  const { connectionId, reason, detail, now: nowOverride } = params;
  const connectionState = context.connectionStates.get(connectionId);
  if (!connectionState) {
    return null;
  }

  const now = typeof nowOverride === 'number' ? nowOverride : Date.now();
  const existing = context.pendingAuthReminders.get(connectionId);

  if (existing) {
    if (existing.status === 'pending') {
      return null;
    }

    if (
      existing.status === 'dismissed' &&
      typeof existing.snoozeUntil === 'number' &&
      existing.snoozeUntil > now
    ) {
      return null;
    }
  }

  const details: string[] = [];
  if (typeof detail === 'string' && detail.trim().length > 0) {
    details.push(detail.trim());
  }
  details.push(WEBVIEW_ACTION_DETAIL);

  return {
    connectionId,
    status: 'pending',
    reason,
    detail: details.join('\n\n'),
  };
}
