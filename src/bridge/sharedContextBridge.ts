/**
 * Module: SharedContextBridge
 * Owner: application
 * Reads: Application FSM state; transforms to webview-ready payloads
 * Writes: none to ApplicationContext (broadcasts to webview only)
 * Receives: webview messages (forwarded to FSM); actor reference
 * Emits: syncState messages to webview
 * Prohibitions: Do not implement webview logic; Do not mutate ApplicationContext
 * Rationale: Single bridge for serializing FSM context to webview payloads
 *
 * LLM-GUARD:
 * - Post only syncState (or typed) messages; do not send partial context mutations
 * - Do not define new context types here
 */
import type { Disposable, Webview } from 'vscode';
import type { ActorRefFrom, StateFrom } from 'xstate';
import type { ApplicationContext, ProjectConnection } from '../fsm/machines/applicationMachine.js';
import { applicationMachine } from '../fsm/machines/applicationMachine.js';
import {
  deriveTabViewModel,
  deriveTimerViewModel,
  normalizeWorkItems,
  type TabWorkItemViewModel,
  type TabViewModel,
} from '../fsm/functions/tabViewModelFunctions.js';
import {
  getLoadedConnections as readLegacyConnections,
  getActiveConnectionId as readLegacyActiveConnectionId,
} from '../fsm/services/extensionHostBridge.js';

export type Logger = (message: string, meta?: Record<string, unknown>) => void;

export type SharedContextBridgeOptions = {
  actor: ActorRefFrom<typeof applicationMachine>;
  logger?: Logger;
  contextSelector?: (context: ApplicationContext) => SharedContextPayload;
};

export interface SharedContextBridge extends Disposable {
  attachWebview(webview: Webview): void;
  detachWebview(): void;
  handleWebviewMessage(message: unknown): boolean;
  sync(): void;
}

interface SharedConnectionView {
  id: string;
  label: string;
  organization?: string;
  project?: string;
  authMethod?: string;
  lastUsed?: string;
}

interface SharedWorkItemView {
  id: number;
  title: string;
  type?: string;
  state?: string;
  assignedTo?: string;
}

interface SharedTimerView {
  isActive: boolean;
  isRunning: boolean;
  workItemId: number | null;
  elapsed: number;
}

export interface SharedContextPayload {
  activeConnectionId: string | null;
  connections: SharedConnectionView[];
  workItems: SharedWorkItemView[];
  timer: SharedTimerView;
  isLoading: boolean;
  authReminders: Array<{
    connectionId: string;
    reason: string;
    detail?: string;
    message?: string;
    label?: string;
    authMethod?: 'pat' | 'entra';
  }>;
  connectionStateSummaries: Array<{
    id: string;
    isConnected: boolean;
    hasClient: boolean;
    hasProvider: boolean;
    reauthInProgress: boolean;
  }>;
  lastError?: {
    message: string;
    name?: string;
  } | null;
  tab: TabViewModel;
}

type ApplicationActor = ActorRefFrom<typeof applicationMachine>;
type ApplicationState = StateFrom<typeof applicationMachine>;

export function createSharedContextBridge({
  actor,
  logger,
  contextSelector,
}: SharedContextBridgeOptions): SharedContextBridge {
  const applicationActor = actor as ApplicationActor;
  let currentWebview: Webview | undefined;
  let disposed = false;
  let lastSignature = '';

  const subscription = applicationActor.subscribe((state) =>
    maybePostContext(state as ApplicationState, 'state-change')
  );

  function log(message: string, meta?: Record<string, unknown>) {
    try {
      logger?.(message, meta);
    } catch (error) {
      // Use console.debug since logger failed and logging system may not be available
      console.debug('[AzureDevOpsInt] [SharedContextBridge] Logger failed', {
        message,
        meta,
        error,
      });
    }
  }

  function buildPayload(context: ApplicationContext): SharedContextPayload {
    if (contextSelector) {
      return contextSelector(context);
    }

    const fsmConnections = Array.isArray(context.connections) ? context.connections : [];
    const legacyConnections = normalizeLegacyProjectConnections(readLegacyConnections());
    const resolvedConnections: ProjectConnection[] =
      fsmConnections.length > 0 ? fsmConnections : legacyConnections;

    const resolvedActiveConnectionId =
      context.activeConnectionId ?? readLegacyActiveConnectionId() ?? null;

    const augmentedContext =
      resolvedConnections === fsmConnections
        ? context
        : ({
            ...context,
            connections: resolvedConnections,
            activeConnectionId: resolvedActiveConnectionId,
          } as ApplicationContext);

    const safeConnections: SharedConnectionView[] = resolvedConnections.map((connection) => ({
      id: connection.id,
      label:
        typeof connection.label === 'string' && connection.label.trim().length > 0
          ? connection.label.trim()
          : connection.project || connection.id,
      organization: connection.organization,
      project: connection.project,
      authMethod: connection.authMethod,
      lastUsed: connectionStatesSafeTimestamp(augmentedContext, connection.id),
    }));

    const connectionLabelLookup = new Map(
      resolvedConnections.map((connection) => {
        const resolvedLabel =
          typeof connection.label === 'string' && connection.label.trim().length > 0
            ? connection.label.trim()
            : connection.project || connection.id;
        return [connection.id, resolvedLabel] as const;
      })
    );

    const normalizeReminder = (
      connectionId: string,
      reminder: {
        reason?: string;
        detail?: string;
        message?: string;
        label?: string;
        authMethod?: 'pat' | 'entra' | undefined;
      }
    ) => {
      const normalizedId = typeof connectionId === 'string' ? connectionId.trim() : '';
      if (!normalizedId) {
        return null;
      }

      const resolvedLabel =
        typeof reminder?.label === 'string' && reminder.label.trim().length > 0
          ? reminder.label.trim()
          : (connectionLabelLookup.get(normalizedId) ?? normalizedId);

      return {
        connectionId: normalizedId,
        reason: reminder?.reason ?? 'authFailed',
        detail: reminder?.detail,
        message: reminder?.message,
        label: resolvedLabel,
        authMethod: reminder?.authMethod,
      };
    };

    const normalizedWorkItems = normalizeWorkItems(
      Array.isArray(augmentedContext.pendingWorkItems?.workItems)
        ? augmentedContext.pendingWorkItems!.workItems
        : []
    );

    const workItems: SharedWorkItemView[] = normalizedWorkItems.map(
      ({ id, title, type, state, assignedTo }: TabWorkItemViewModel) => ({
        id,
        title,
        type,
        state,
        assignedTo,
      })
    );

    const timerSnapshot = deriveTimerViewModel(augmentedContext);
    const tabView = deriveTabViewModel(
      augmentedContext,
      augmentedContext.activeConnectionId ?? null
    );

    const connectionStateSummaries = normalizeConnectionStateSummaries(
      augmentedContext.connectionStates
    );

    const authReminders = Array.isArray(context.pendingAuthReminders)
      ? context.pendingAuthReminders
          .filter(
            (reminder) =>
              reminder?.status !== 'dismissed' &&
              typeof reminder?.connectionId === 'string' &&
              reminder.connectionId.trim().length > 0
          )
          .map((reminder) =>
            normalizeReminder(reminder.connectionId, {
              reason: reminder?.reason,
              detail: reminder?.detail,
              message: reminder?.message,
              label: reminder?.label,
              authMethod: reminder?.authMethod,
            })
          )
          .filter((reminder): reminder is NonNullable<typeof reminder> => reminder !== null)
      : context.pendingAuthReminders instanceof Map
        ? Array.from(context.pendingAuthReminders.entries())
            .filter(([, reminder]) => reminder?.status !== 'dismissed')
            .map(([connectionId, reminder]) =>
              normalizeReminder(connectionId, {
                reason: reminder?.reason,
                detail: reminder?.detail,
                message: reminder?.message,
                label: reminder?.label,
                authMethod: reminder?.authMethod,
              })
            )
            .filter((reminder): reminder is NonNullable<typeof reminder> => reminder !== null)
        : [];

    const lastError = augmentedContext.lastError
      ? {
          message: augmentedContext.lastError.message,
          name: augmentedContext.lastError.name,
        }
      : null;

    const isLoading = Boolean(
      augmentedContext.pendingWorkItems?.workItems?.length &&
        !augmentedContext.pendingWorkItems?.connectionId
    );

    return {
      activeConnectionId: resolvedActiveConnectionId,
      connections: safeConnections,
      workItems,
      timer: timerSnapshot,
      isLoading,
      authReminders,
      connectionStateSummaries,
      lastError,
      tab: tabView,
    };
  }

  function connectionStatesSafeTimestamp(
    context: ApplicationContext,
    connectionId: string
  ): string | undefined {
    try {
      const rawState = context.connectionStates?.get(connectionId);
      if (!rawState) {
        return undefined;
      }
      const inferred = (rawState as Record<string, unknown>).lastUsed;
      return typeof inferred === 'string' ? inferred : undefined;
    } catch (error) {
      log('connectionStateTimestampExtractionFailed', {
        connectionId,
        error: serializeError(error),
      });
      return undefined;
    }
  }

  function maybePostContext(
    state: StateFrom<typeof applicationMachine> | undefined,
    reason: string
  ) {
    if (!currentWebview || !state) {
      return;
    }

    try {
      const payload = buildPayload(state.context);
      const signature = JSON.stringify(payload);
      if (signature === lastSignature) {
        return;
      }
      lastSignature = signature;

      const message = {
        type: 'contextUpdate',
        context: payload,
        meta: {
          reason,
          state: state.value,
        },
      };

      const maybeThenable = currentWebview.postMessage(message);
      if (typeof (maybeThenable as Thenable<boolean> | undefined)?.then === 'function') {
        (maybeThenable as Thenable<boolean>).then(undefined, (error) => {
          log('postMessageFailed', { error: serializeError(error) });
        });
      }
    } catch (error) {
      log('contextSerializationFailed', { error: serializeError(error) });
    }
  }

  function synchronizeImmediately(reason: string) {
    const snapshot = applicationActor.getSnapshot?.();
    if (!snapshot) {
      log('snapshotUnavailable', { reason });
      return;
    }
    maybePostContext(snapshot, reason);
  }

  function normalizeConnectionStateSummaries(
    rawStates: ApplicationContext['connectionStates'] | unknown
  ): SharedContextPayload['connectionStateSummaries'] {
    if (rawStates instanceof Map) {
      return Array.from(rawStates.entries()).map(([id, state]) =>
        createConnectionSummary(id, state)
      );
    }

    if (isRecord(rawStates)) {
      return Object.entries(rawStates).map(([id, state]) => createConnectionSummary(id, state));
    }

    return [];
  }

  function createConnectionSummary(
    id: string,
    rawState: unknown
  ): SharedContextPayload['connectionStateSummaries'][number] {
    const baseRecord = pickSummarySource(rawState);
    const explicitConnected =
      typeof baseRecord.isConnected === 'boolean' ? baseRecord.isConnected : undefined;
    const explicitReauth =
      typeof baseRecord.reauthInProgress === 'boolean' ? baseRecord.reauthInProgress : undefined;

    const stateToken = toLowerCaseString(baseRecord.state);
    const statusToken = toLowerCaseString(baseRecord.status);

    const connectedToken = stateToken.includes('connected') || statusToken.includes('connected');
    const readyToken = stateToken.includes('ready') || statusToken.includes('ready');
    const authToken =
      stateToken.includes('reauth') ||
      stateToken.includes('authenticating') ||
      statusToken.includes('reauth') ||
      statusToken.includes('authenticating');

    const clientCandidate =
      baseRecord.client ??
      baseRecord.azureClient ??
      baseRecord.connectionClient ??
      baseRecord.hasClient ??
      baseRecord.isConnected ??
      (connectedToken || readyToken);

    const providerCandidate =
      baseRecord.provider ?? baseRecord.hasProvider ?? baseRecord.workItemsProvider;

    const reauthCandidate =
      explicitReauth ?? baseRecord.isAuthenticating ?? baseRecord.authInProgress ?? authToken;

    const hasClient = Boolean(clientCandidate);
    const hasProvider = Boolean(providerCandidate);
    const isConnected =
      explicitConnected ?? Boolean(hasClient || hasProvider || connectedToken || readyToken);

    return {
      id,
      isConnected,
      hasClient: hasClient || isConnected,
      hasProvider,
      reauthInProgress: Boolean(reauthCandidate),
    };
  }

  function pickSummarySource(rawState: unknown): Record<string, any> {
    if (!isRecord(rawState)) {
      return {};
    }

    const nestedContext = rawState.context;
    if (isRecord(nestedContext)) {
      return { ...nestedContext };
    }

    return { ...rawState };
  }

  function isRecord(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null;
  }

  function toLowerCaseString(value: unknown): string {
    return typeof value === 'string' ? value.toLowerCase() : '';
  }

  function normalizeLegacyProjectConnections(value: unknown): ProjectConnection[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((entry) => (isProjectConnection(entry) ? entry : coerceProjectConnection(entry)))
      .filter((entry): entry is ProjectConnection => Boolean(entry));
  }

  function isProjectConnection(value: unknown): value is ProjectConnection {
    if (!isRecord(value)) {
      return false;
    }

    return (
      typeof value.id === 'string' &&
      value.id.length > 0 &&
      typeof value.organization === 'string' &&
      value.organization.length > 0 &&
      typeof value.project === 'string' &&
      value.project.length > 0
    );
  }

  function coerceProjectConnection(value: unknown): ProjectConnection | null {
    if (!isRecord(value)) {
      return null;
    }

    const id = readString(value.id) ?? readString(value.connectionId) ?? null;
    const organization = readString(value.organization) ?? readString(value.org) ?? null;
    const project = readString(value.project) ?? readString(value.teamProject) ?? null;

    if (!id || !organization || !project) {
      return null;
    }

    const coerced: ProjectConnection = {
      id,
      organization,
      project,
      team: readString(value.team) ?? undefined,
      authMethod:
        value.authMethod === 'entra' ? 'entra' : value.authMethod === 'pat' ? 'pat' : undefined,
      baseUrl: readString(value.baseUrl) ?? undefined,
      apiBaseUrl: readString(value.apiBaseUrl) ?? undefined,
      identityName: readString(value.identityName) ?? undefined,
      tenantId: readString(value.tenantId) ?? undefined,
      clientId: readString(value.clientId) ?? undefined,
    };

    return coerced;
  }

  function readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  function handleWebviewMessage(message: unknown): boolean {
    if (!message || typeof message !== 'object') {
      return false;
    }
    const msg = message as { type?: unknown };
    if (msg.type === 'getContext') {
      synchronizeImmediately('explicit-request');
      return true;
    }
    return false;
  }

  return {
    attachWebview(webview: Webview) {
      currentWebview = webview;
      synchronizeImmediately('webview-attached');
    },
    detachWebview() {
      currentWebview = undefined;
    },
    handleWebviewMessage,
    sync() {
      synchronizeImmediately('manual-sync');
    },
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      try {
        subscription.unsubscribe();
      } catch (error) {
        log('subscriptionDisposalFailed', { error: serializeError(error) });
      }
      currentWebview = undefined;
    },
  };
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }
  if (typeof error === 'object' && error) {
    return { ...error } as Record<string, unknown>;
  }
  return { value: String(error) };
}
