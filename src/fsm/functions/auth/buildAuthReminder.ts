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
  ProjectConnection,
} from '../../machines/applicationMachine.js';

export type BuildAuthReminderParams = {
  connectionId: string;
  reason: AuthReminderReason;
  detail?: string;
  now?: number;
};

const REMINDER_MESSAGES: Record<AuthReminderReason, string> = {
  tokenExpired: 'Microsoft Entra access expired for {{label}}.',
  refreshFailed: 'Microsoft Entra sign-in required for {{label}}: token refresh failed.',
  authFailed: 'Microsoft Entra sign-in required for {{label}}.',
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

  const connectionConfig = connectionState.config ?? findConnection(context, connectionId);
  const label = formatConnectionLabel(connectionConfig, connectionId);
  const authMethod = connectionConfig?.authMethod ?? connectionState.authMethod ?? 'pat';

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
    message: renderReminderMessage(reason, label),
    label,
    authMethod,
  };
}

function renderReminderMessage(reason: AuthReminderReason, label: string): string {
  const template = REMINDER_MESSAGES[reason] ?? REMINDER_MESSAGES.tokenExpired;
  return template.replace('{{label}}', label);
}

function findConnection(
  context: ApplicationContext,
  connectionId: string
): ProjectConnection | undefined {
  return context.connections.find((connection) => connection.id === connectionId);
}

function formatConnectionLabel(
  connection: ProjectConnection | undefined,
  fallbackId: string
): string {
  if (connection?.label && connection.label.trim().length > 0) {
    return connection.label;
  }

  const parts: string[] = [];
  if (connection?.organization) {
    parts.push(connection.organization);
  }
  if (connection?.project) {
    parts.push(connection.project);
  }

  if (parts.length > 0) {
    return parts.join('/');
  }

  if (connection?.id) {
    return connection.id;
  }

  return fallbackId;
}
