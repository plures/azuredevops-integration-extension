/**
 * Module: src/fsm/functions/tabViewModelFunctions.ts
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
  AuthReminderState,
  ConnectionState,
  ProjectConnection,
} from '../machines/applicationTypes.js';

export interface TabWorkItemViewModel {
  id: number;
  title: string;
  type?: string;
  state?: string;
  assignedTo?: string;
}

export interface TabTimerViewModel {
  isActive: boolean;
  isRunning: boolean;
  workItemId: number | null;
  elapsed: number;
}

export interface TabAuthReminderViewModel {
  reason: string;
  detail?: string;
  message?: string;
  label?: string;
  authMethod?: 'pat' | 'entra';
}

export interface TabStatusViewModel {
  isLoading: boolean;
  lastError?: string | null;
}

export interface TabViewModel {
  connectionId: string | null;
  label: string;
  organization?: string;
  project?: string;
  authMethod?: 'pat' | 'entra';
  isActive: boolean;
  workItems: TabWorkItemViewModel[];
  rawWorkItems: unknown[];
  timer: TabTimerViewModel;
  status: TabStatusViewModel;
  authReminder: TabAuthReminderViewModel | null;
}

export function deriveTabViewModel(
  context: ApplicationContext,
  rawConnectionId: string | null | undefined
): TabViewModel {
  const normalizedId =
    normalizeConnectionId(rawConnectionId) ?? normalizeConnectionId(context.activeConnectionId);
  const connection = selectConnection(context.connections, normalizedId);
  const connectionId = connection?.id ?? normalizedId ?? null;
  const connectionState = connectionId ? context.connectionStates.get(connectionId) : undefined;

  return {
    connectionId,
    label: deriveConnectionLabel(connection, connectionId),
    organization: connection?.organization,
    project: connection?.project,
    authMethod: connection?.authMethod,
    isActive: Boolean(connectionId && context.activeConnectionId === connectionId),
    rawWorkItems: deriveRawWorkItems(context, connectionId),
    workItems: deriveWorkItems(context, connectionId),
    timer: deriveTimerViewModel(context),
    status: deriveStatus(context, connectionId, connectionState),
    authReminder: deriveAuthReminder(
      context.pendingAuthReminders,
      connectionId,
      context.connections
    ),
  };
}

export function deriveTimerViewModel(context: ApplicationContext): TabTimerViewModel {
  const timerActor = context.timerActor as { getSnapshot?: () => unknown } | undefined;
  if (!timerActor?.getSnapshot) {
    return { isActive: false, isRunning: false, workItemId: null, elapsed: 0 };
  }

  try {
    const snapshot = timerActor.getSnapshot() as {
      context?: Record<string, unknown>;
      matches?: (value: string) => boolean;
      value?: unknown;
    } | null;
    const snapshotContext = snapshot?.context ?? {};
    const isRunning =
      typeof snapshot?.matches === 'function'
        ? snapshot.matches('running')
        : snapshot?.value === 'running';

    return {
      isActive: Boolean(snapshot),
      isRunning: Boolean(isRunning),
      workItemId: readNumeric(snapshotContext.workItemId),
      elapsed: readElapsed(snapshotContext.elapsed),
    };
  } catch {
    return { isActive: false, isRunning: false, workItemId: null, elapsed: 0 };
  }
}

export function normalizeWorkItems(items: unknown[]): TabWorkItemViewModel[] {
  return items
    .map((item) => normalizeWorkItem(item))
    .filter((item): item is TabWorkItemViewModel => item !== null && item.id !== null);
}

function deriveWorkItems(
  context: ApplicationContext,
  connectionId: string | null
): TabWorkItemViewModel[] {
  return normalizeWorkItems(deriveRawWorkItems(context, connectionId));
}

function deriveRawWorkItems(context: ApplicationContext, connectionId: string | null): unknown[] {
  if (!connectionId) {
    return [];
  }

  const pending = context.pendingWorkItems;
  if (!pending || !Array.isArray(pending.workItems)) {
    return [];
  }

  const targetMatches =
    typeof pending.connectionId === 'string' ? pending.connectionId === connectionId : true;
  if (!targetMatches) {
    return [];
  }

  return pending.workItems;
}

function deriveStatus(
  context: ApplicationContext,
  connectionId: string | null,
  connectionState: ConnectionState | undefined
): TabStatusViewModel {
  if (!connectionId) {
    return { isLoading: false, lastError: null };
  }

  const pending = context.pendingWorkItems;
  const pendingMatches =
    pending && (!pending.connectionId || pending.connectionId === connectionId);
  const waitingForData = Boolean(
    pendingMatches && (!Array.isArray(pending?.workItems) || pending.workItems.length === 0)
  );
  const connectionReady = Boolean(connectionState?.client && connectionState?.provider);
  const lastError = context.lastError?.message ?? null;

  return {
    isLoading: !connectionReady || waitingForData,
    lastError,
  };
}

function deriveAuthReminder(
  reminders: Map<string, AuthReminderState> | undefined,
  connectionId: string | null,
  connections: ProjectConnection[] | undefined
): TabAuthReminderViewModel | null {
  if (!connectionId || !reminders?.size) {
    return null;
  }

  const reminder = reminders.get(connectionId);
  if (!reminder || reminder.status !== 'pending') {
    return null;
  }

  const connection = selectConnection(connections, connectionId);
  const label = connection?.label ?? connection?.project ?? connectionId;
  const authMethod = connection?.authMethod;

  let message = 'Authentication required';
  if (reminder.reason === 'tokenExpired') {
    message = 'Session expired';
  } else if (reminder.reason === 'authFailed') {
    message = 'Authentication failed';
  } else if (reminder.reason === 'refreshFailed') {
    message = 'Could not refresh session';
  }

  if (reminder.detail) {
    message += `: ${reminder.detail}`;
  }

  return {
    reason: reminder.reason,
    detail: reminder.detail,
    message,
    label,
    authMethod,
  };
}

function normalizeConnectionId(connectionId: string | null | undefined): string | null {
  if (typeof connectionId !== 'string') {
    return null;
  }
  const trimmed = connectionId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function selectConnection(
  connections: ProjectConnection[] | undefined,
  connectionId: string | null
): ProjectConnection | undefined {
  if (!connectionId || !Array.isArray(connections)) {
    return undefined;
  }
  return connections.find((connection) => connection.id === connectionId);
}

function deriveConnectionLabel(
  connection: ProjectConnection | undefined,
  connectionId: string | null
): string {
  if (connection?.project) {
    return connection.project;
  }
  if (connection?.id) {
    return connection.id;
  }
  return connectionId ?? 'unknown-connection';
}

function normalizeWorkItem(item: unknown): TabWorkItemViewModel | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const record = item as Record<string, unknown>;
  const id = readNumeric(record.id ?? record['System.Id']);
  if (id === null) {
    return null;
  }

  const fields = readRecord(record.fields);
  const title = readString(record.title ?? fields?.['System.Title']) ?? String(id);
  const type = readString(record.type ?? fields?.['System.WorkItemType']);
  const state = readString(record.state ?? fields?.['System.State']);
  const assignedTo = readAssignedTo(record.assignedTo, fields?.['System.AssignedTo']);

  return { id, title, type, state, assignedTo };
}

function readNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readElapsed(value: unknown): number {
  const numeric = readNumeric(value);
  return numeric !== null ? numeric : 0;
}

function readString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

function readAssignedTo(fieldValue: unknown, fieldRecord: unknown): string | undefined {
  if (typeof fieldValue === 'string') {
    return fieldValue;
  }
  if (fieldRecord && typeof fieldRecord === 'object') {
    const record = fieldRecord as Record<string, unknown>;
    const candidate = record.displayName ?? record.uniqueName;
    return readString(candidate);
  }
  return undefined;
}
