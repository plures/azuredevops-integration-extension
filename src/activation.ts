import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type OpenAIClient from 'openai';
import { AzureDevOpsIntClient } from './azureClient.js';
import { parseAzureDevOpsUrl, isAzureDevOpsWorkItemUrl } from './azureDevOpsUrlParser.js';
import type { WorkItemsProvider } from './provider.js';
import { WorkItemTimer } from './timer.js';
import { SessionTelemetryManager } from './sessionTelemetry.js';
import {
  clearConnectionCaches,
  getBranchEnrichmentState,
  updateBuildRefreshTimer,
} from './fsm/functions/connection/branchEnrichment.js';
import {
  createBranchAwareTransform,
  createConnectionProvider,
} from './fsm/functions/connection/providerFactory.js';
import { createSharedContextBridge } from './bridge/sharedContextBridge.js';
import {
  bridgeConsoleToOutputChannel,
  createScopedLogger,
  getLogBufferSnapshot,
  getOutputChannel,
  logLine,
  setOutputChannel,
} from './logging.js';
import {
  getConnectionLabel,
  postConnectionsUpdate,
  postToWebview,
  postWorkItemsSnapshot,
} from './webviewMessaging.js';
import type { PostWorkItemsSnapshotParams, LoggerFn } from './webviewMessaging.js';
import { startCacheCleanup, stopCacheCleanup } from './cache.js';
import { performanceMonitor, MemoryOptimizer } from './performance.js';
import {
  normalizeConnections,
  resolveActiveConnectionId,
} from './fsm/functions/activation/connectionNormalization.js';
import { migrateGlobalPATToConnections } from './fsm/functions/secrets/patMigration.js';
import {
  getApplicationStoreActor,
  sendApplicationStoreEvent,
  setActiveConnectionHandler,
  setActiveConnectionIdReader,
  setExtensionContextRef as setExtensionContextRefBridge,
  setForwardProviderMessage,
  setGetSecretPAT,
  setLoadedConnectionsReader,
  setRegisterAllCommands,
  setWebviewMessageHandler,
} from './fsm/services/extensionHostBridge.js';
import { registerTraceCommands } from './fsm/commands/traceCommands.js';
import { FSMSetupService } from './fsm/services/fsmSetupService.js';
import { ConnectionAdapter } from './fsm/adapters/ConnectionAdapter.js';
import { getConnectionFSMManager } from './fsm/ConnectionFSMManager.js';
import type {
  AuthReminderState as FSMAuthReminderState,
  AuthReminderReason,
  ConnectionState,
  ProjectConnection,
} from './fsm/machines/applicationMachine.js';

type AuthMethod = 'pat' | 'entra';
type AuthReminderState = Omit<FSMAuthReminderState, 'reason'> & {
  reason: AuthReminderReason;
  detail?: string;
  message?: string;
  label?: string;
  authMethod?: AuthMethod;
  deliveredToWebview?: boolean;
};

type SetupAction =
  | 'add'
  | 'manage'
  | 'remove'
  | 'switch'
  | 'entraSignIn'
  | 'entraSignOut'
  | 'convertToEntra';

const STATE_TIMER = 'azureDevOpsInt.timer.state';
const STATE_TIME_ENTRIES = 'azureDevOpsInt.timer.entries';
const STATE_LAST_SAVE = 'azureDevOpsInt.timer.lastSave';
const STATE_TIMER_CONNECTION = 'azureDevOpsInt.timer.connection';
const CONFIG_NS = 'azureDevOpsIntegration';
const LEGACY_CONFIG_NS = 'azureDevOps';
const CONNECTIONS_CONFIG_KEY = 'connections';
const ACTIVE_CONNECTION_STATE_KEY = 'azureDevOpsInt.activeConnectionId';

let panel: vscode.WebviewView | undefined;
let provider: WorkItemsProvider | undefined;
let timer: WorkItemTimer | undefined;
let sessionTelemetry: SessionTelemetryManager | undefined;
let client: AzureDevOpsIntClient | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;
let authStatusBarItem: vscode.StatusBarItem | undefined;
const PAT_KEY = 'azureDevOpsInt.pat';
const OPENAI_SECRET_KEY = 'azureDevOpsInt.openai.apiKey';
let viewProviderRegistered = false;
const initialRefreshedConnections = new Set<string>();
let connections: ProjectConnection[] = [];
const connectionStates = new Map<string, ConnectionState>();
let connectionAdapterInstance: ConnectionAdapter | undefined;
let activeConnectionId: string | undefined;
let tokenRefreshInterval: NodeJS.Timeout | undefined;
let gcInterval: NodeJS.Timeout | undefined;
let isDeactivating = false;
let rejectionHandler: ((reason: any, promise: Promise<any>) => void) | undefined;
let sharedContextBridge: ReturnType<typeof createSharedContextBridge> | undefined;
let extensionContextRef: vscode.ExtensionContext | undefined;
let openAiClient: OpenAIClient | undefined;
let cachedExtensionVersion: string | undefined; // cache package.json version for cache-busting

// Self-test tracking (prove Svelte webview round-trip works)
// Self-test pending promise handlers (typed loosely to avoid unused param lint churn)
let selfTestPending:
  | { nonce: string; resolve: Function; reject: Function; timeout: NodeJS.Timeout }
  | undefined;

type TimerConnectionInfo = {
  id?: string;
  label?: string;
  organization?: string;
  project?: string;
};

let timerConnectionInfo: TimerConnectionInfo = {};

const DEFAULT_QUERY = 'My Activity';
const activeQueryByConnection = new Map<string, string>();

let nextAuthConnectionIndex = 0;
const INTERACTIVE_REAUTH_THROTTLE_MS = 5 * 60 * 1000;

function getApplicationActor():
  | { getSnapshot?: () => any; send?: (event: unknown) => void }
  | undefined {
  const actor = getApplicationStoreActor();
  if (!actor || typeof actor !== 'object') {
    return undefined;
  }
  return actor as { getSnapshot?: () => any; send?: (event: unknown) => void };
}

function dispatchApplicationEvent(event: unknown): void {
  sendApplicationStoreEvent(event);
}

function safeCommandHandler<Args extends unknown[], Result>(
  handler: (...args: Args) => Result
): (...args: Args) => void {
  return (...args: Args) => {
    if (isDeactivating) {
      console.log('[Command] Ignoring command execution during deactivation');
      return;
    }

    try {
      const result = handler(...args);
      const maybeThenable = result as
        | { catch?: (onRejected: (reason: unknown) => unknown) => unknown }
        | undefined;
      if (maybeThenable?.catch) {
        maybeThenable.catch((error) => {
          if (!isDeactivating) {
            console.error('[Command] Unhandled command error:', error);
          }
        });
      }
    } catch (error) {
      if (!isDeactivating) {
        console.error('[Command] Synchronous command error:', error);
      }
    }
  };
}

async function ensureSharedContextBridge(
  context: vscode.ExtensionContext
): Promise<ReturnType<typeof createSharedContextBridge>> {
  if (!sharedContextBridge) {
    if (!getApplicationActor()) {
      await import('./stores/applicationStore.js');
    }

    const actor = getApplicationActor();
    if (!actor) {
      throw new Error('Application store actor not available');
    }

    sharedContextBridge = createSharedContextBridge({
      actor: actor as any,
      logger: (message, meta) => {
        verbose(`[context-bridge] ${message}`, meta);
      },
    });

    context.subscriptions.push(sharedContextBridge);
    context.subscriptions.push(
      new vscode.Disposable(() => {
        sharedContextBridge = undefined;
      })
    );
  }

  return sharedContextBridge;
}

function getPendingAuthReminderMap(): Map<string, AuthReminderState> {
  const actor = getApplicationActor();
  if (!actor?.getSnapshot) {
    return new Map();
  }

  try {
    const snapshot = actor.getSnapshot?.();
    const pending = snapshot?.context?.pendingAuthReminders;

    if (pending instanceof Map) {
      return new Map(pending as Map<string, AuthReminderState>);
    }

    if (Array.isArray(pending)) {
      const normalized = pending
        .filter((entry): entry is AuthReminderState =>
          Boolean(
            entry && typeof entry.connectionId === 'string' && entry.connectionId.trim().length > 0
          )
        )
        .map((entry) => [entry.connectionId, entry] as const);

      return new Map(normalized);
    }
  } catch (error) {
    verbose('[authReminder] Failed to read pending reminders from actor', { error });
  }

  return new Map();
}

function getPendingAuthConnectionIds(): string[] {
  const pending = getPendingAuthReminderMap();
  const ordered: string[] = [];

  for (const connection of connections) {
    const reminder = pending.get(connection.id);
    if (reminder?.status === 'pending') {
      ordered.push(connection.id);
    }
  }

  for (const [connectionId, reminder] of pending.entries()) {
    if (reminder?.status === 'pending' && !ordered.includes(connectionId)) {
      ordered.push(connectionId);
    }
  }

  return ordered;
}

async function cycleAuthSignIn(context: vscode.ExtensionContext): Promise<void> {
  const pendingIds = getPendingAuthConnectionIds();

  if (pendingIds.length === 0) {
    if (activeConnectionId) {
      await signInWithEntra(context, activeConnectionId);
    } else {
      await signInWithEntra(context);
    }
    return;
  }

  if (nextAuthConnectionIndex >= pendingIds.length) {
    nextAuthConnectionIndex = 0;
  }

  const targetId = pendingIds[nextAuthConnectionIndex];
  nextAuthConnectionIndex = (nextAuthConnectionIndex + 1) % pendingIds.length;

  clearAuthReminder(targetId);
  await signInWithEntra(context, targetId, { showSuccessMessage: true });
}

function describeConnection(connection: ProjectConnection): string {
  if (connection.label && connection.label.trim().length > 0) {
    return connection.label;
  }

  const parts: string[] = [];
  if (connection.organization) parts.push(connection.organization);
  if (connection.project) parts.push(connection.project);

  if (parts.length > 0) {
    return parts.join('/');
  }

  return connection.id;
}

function shouldLogDebug(): boolean {
  try {
    return Boolean(getConfig().get('debugLogging'));
  } catch {
    return false;
  }
}

async function updateAuthStatusBar(): Promise<void> {
  if (!authStatusBarItem) return;

  if (!activeConnectionId) {
    clearAuthReminder(activeConnectionId);
    authStatusBarItem.hide();
    return;
  }

  const state = connectionStates.get(activeConnectionId);
  if (!state || state.authMethod !== 'entra') {
    clearAuthReminder(activeConnectionId);
    authStatusBarItem.hide();
    return;
  }

  authStatusBarItem.command = {
    title: 'Sign in with Microsoft Entra',
    command: 'azureDevOpsInt.signInWithEntra',
    arguments: [activeConnectionId],
  };

  try {
    const connectionLabel = describeConnection(state.config);
    authStatusBarItem.text = '$(warning) Entra Auth Not Available';
    authStatusBarItem.tooltip = `FSM authentication implementation needed for ${connectionLabel}`;
    authStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    authStatusBarItem.show();
  } catch (error) {
    console.error('[updateAuthStatusBar] Error updating auth status:', error);
    authStatusBarItem.hide();
  }
}

function notifyConnectionsList(): void {
  postConnectionsUpdate({
    panel,
    connections,
    activeConnectionId,
    logger: verbose,
  });

  const actor = getApplicationActor();
  const send = actor?.send;
  if (!send) {
    return;
  }

  send({
    type: 'CONNECTIONS_LOADED',
    connections: connections.slice(),
  });

  if (activeConnectionId) {
    send({ type: 'CONNECTION_SELECTED', connectionId: activeConnectionId });
  }
}

function ensureAuthReminder(
  connectionId: string,
  reason: AuthReminderReason,
  options: { detail?: string } = {}
): void {
  dispatchApplicationEvent({
    type: 'AUTH_REMINDER_REQUESTED',
    connectionId,
    reason,
    detail: options.detail,
  });
}

function triggerAuthReminderSignIn(
  connectionId: string,
  reason: AuthReminderReason,
  options: { detail?: string; force?: boolean; startInteractive?: boolean } = {}
): void {
  const state = connectionStates.get(connectionId);
  if (!state) return;

  const detail = options.detail;
  const startInteractive = options.startInteractive === true;

  if (!startInteractive || (state.authMethod ?? 'pat') !== 'entra') {
    ensureAuthReminder(connectionId, reason, detail ? { detail } : {});
    return;
  }

  const now = Date.now();
  if (state.reauthInProgress) {
    return;
  }

  if (
    !options.force &&
    state.lastInteractiveAuthAt &&
    now - state.lastInteractiveAuthAt < INTERACTIVE_REAUTH_THROTTLE_MS
  ) {
    return;
  }

  state.reauthInProgress = true;
  state.lastInteractiveAuthAt = now;
  state.accessToken = undefined;
  state.refreshFailureCount = 0;
  state.refreshBackoffUntil = undefined;

  const context = extensionContextRef;

  (async () => {
    try {
      if (context) {
        await signInWithEntra(context, connectionId, {
          showSuccessMessage: false,
          forceInteractive: true,
        });
      } else {
        await vscode.commands.executeCommand('azureDevOpsInt.signInWithEntra', connectionId);
      }
    } catch (error) {
      console.error('[triggerAuthReminderSignIn] Interactive Entra sign-in failed', error);
      ensureAuthReminder(connectionId, reason, detail ? { detail } : {});
    } finally {
      state.reauthInProgress = false;
    }
  })().catch((error) => {
    console.error('[triggerAuthReminderSignIn] Unexpected Entra sign-in error', error);
    state.reauthInProgress = false;
    ensureAuthReminder(connectionId, reason, detail ? { detail } : {});
  });
}

function clearAuthReminder(connectionId: string | undefined): void {
  if (!connectionId) {
    return;
  }

  dispatchApplicationEvent({ type: 'AUTH_REMINDER_CLEARED', connectionId });

  if (panel) {
    sendToWebview({
      type: 'authReminderClear',
      connectionId,
    });
  }

  if (getPendingAuthReminderMap().size === 0) {
    nextAuthConnectionIndex = 0;
  }
}

function normalizeQuery(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getStoredQueryForConnection(connectionId?: string | null, fallback?: string): string {
  const resolved = fallback ?? getDefaultQuery(getConfig());
  const base = resolved && resolved.trim().length > 0 ? resolved : DEFAULT_QUERY;
  if (!connectionId) {
    return base;
  }
  const stored = activeQueryByConnection.get(connectionId);
  if (stored && stored.trim().length > 0) {
    return stored;
  }
  activeQueryByConnection.set(connectionId, base);
  return base;
}

function setStoredQueryForConnection(connectionId: string, query?: string): string {
  const resolvedDefault = getDefaultQuery(getConfig());
  const normalized = normalizeQuery(query) ?? resolvedDefault ?? DEFAULT_QUERY;
  activeQueryByConnection.set(connectionId, normalized);
  return normalized;
}

function getQueryForProvider(
  targetProvider?: WorkItemsProvider,
  connectionId?: string | null
): string {
  const cfg = getConfig();
  const fallback = getDefaultQuery(cfg);
  const providerConnectionId = connectionId
    ? connectionId
    : typeof targetProvider?.getConnectionId === 'function'
      ? targetProvider.getConnectionId()
      : undefined;
  return getStoredQueryForConnection(providerConnectionId, fallback);
}

function setTimerConnectionFrom(connection: ProjectConnection | undefined) {
  if (connection) {
    timerConnectionInfo = {
      id: connection.id,
      label: getConnectionLabel(connection),
      organization: connection.organization,
      project: connection.project,
    };
  } else {
    timerConnectionInfo = {};
  }
}

function getActiveTimerConnectionLabel(): string | undefined {
  const info = timerConnectionInfo;
  if (!info) {
    return undefined;
  }

  if (info.label && info.label.trim().length > 0) {
    return info.label;
  }

  if (info.id) {
    const byId = connections.find((connection) => connection.id === info.id);
    if (byId) {
      return getConnectionLabel(byId);
    }
  }

  if (info.organization && info.project) {
    const byCoordinates = connections.find(
      (connection) =>
        connection.organization === info.organization && connection.project === info.project
    );
    if (byCoordinates) {
      return getConnectionLabel(byCoordinates);
    }
  }

  return undefined;
}

type EnsureActiveConnectionOptions = {
  refresh?: boolean;
  notify?: boolean;
  interactive?: boolean;
};

function getConnectionAdapterInstance(): ConnectionAdapter {
  if (!connectionAdapterInstance) {
    const manager = getConnectionFSMManager();
    connectionAdapterInstance = new ConnectionAdapter(manager, ensureActiveConnectionLegacy, true);
    connectionAdapterInstance.setUseFSM(true);
  }

  return connectionAdapterInstance;
}

async function resolveActiveConnectionTarget(
  context: vscode.ExtensionContext,
  connectionId?: string,
  options: EnsureActiveConnectionOptions = {}
): Promise<{ connection: ProjectConnection; connectionId: string } | undefined> {
  await ensureConnectionsInitialized(context);

  const targetId = connectionId ?? activeConnectionId ?? connections[0]?.id;
  verbose('[ensureActiveConnection] evaluating target', {
    requested: connectionId,
    activeConnectionId,
    resolved: targetId,
    connectionCount: connections.length,
  });

  if (!targetId) {
    if (options.notify !== false) {
      notifyConnectionsList();
    }
    await vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', false);
    provider = undefined;
    client = undefined;
    return undefined;
  }

  if (targetId !== activeConnectionId) {
    activeConnectionId = targetId;
    await context.globalState.update(ACTIVE_CONNECTION_STATE_KEY, targetId);
    if (options.notify !== false) {
      notifyConnectionsList();
    }
  }

  const connection = connections.find((item) => item.id === targetId);
  if (!connection) {
    console.warn('[azureDevOpsInt] Connection not found for id', targetId);
    return undefined;
  }

  verbose('[ensureActiveConnection] using connection', {
    id: connection.id,
    organization: connection.organization,
    project: connection.project,
    baseUrl: connection.baseUrl,
    apiBaseUrl: connection.apiBaseUrl,
    authMethod: connection.authMethod || 'pat',
    hasIdentityName: !!connection.identityName,
    identityName: connection.identityName,
  });

  return { connection, connectionId: targetId };
}

function configureProviderForConnection(
  connection: ProjectConnection,
  state: ConnectionState
): void {
  if (!state.provider) {
    return;
  }

  const providerLogger = createScopedLogger(`provider:${connection.id}`, shouldLogDebug);
  const branchSource = { id: connection.id, client: state.client };

  if (typeof state.provider.updateClient === 'function' && state.client) {
    state.provider.updateClient(state.client);
  }

  state.provider.setPostMessage?.((msg: unknown) => forwardProviderMessage(connection.id, msg));
  state.provider.setLogger?.(providerLogger);
  state.provider.setTransformWorkItems?.(createBranchAwareTransform(branchSource));
}

async function finalizeConnectionSuccess(
  connection: ProjectConnection,
  state: ConnectionState,
  options: EnsureActiveConnectionOptions,
  settings: ConfigGetter
): Promise<ConnectionState> {
  connectionStates.set(connection.id, state);
  configureProviderForConnection(connection, state);

  client = state.client;
  provider = state.provider;

  setTimerConnectionFrom(connection);

  await vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', true);
  await updateAuthStatusBar();

  if (options.refresh !== false && state.provider) {
    const fallbackQuery = getDefaultQuery(settings);
    const selectedQuery = getStoredQueryForConnection(connection.id, fallbackQuery);

    if (!initialRefreshedConnections.has(connection.id)) {
      initialRefreshedConnections.add(connection.id);
    }

    verbose('[ensureActiveConnection] triggering provider refresh', {
      id: connection.id,
      query: selectedQuery,
    });

    state.provider.refresh(selectedQuery);
  }

  const hadReminder = getPendingAuthReminderMap().has(connection.id);
  clearAuthReminder(connection.id);
  if ((state.authMethod ?? 'pat') === 'entra' || hadReminder) {
    dispatchApplicationEvent({ type: 'AUTHENTICATION_SUCCESS', connectionId: connection.id });
  }

  dispatchApplicationEvent({
    type: 'CONNECTION_ESTABLISHED',
    connectionId: connection.id,
    connectionState: state,
  });

  return state;
}

function getClientForConnectionInfo(info?: TimerConnectionInfo): AzureDevOpsIntClient | undefined {
  if (!info) {
    return client;
  }

  if (info.id) {
    const stateById = connectionStates.get(info.id);
    if (stateById?.client) {
      return stateById.client;
    }
  }

  if (info.organization && info.project) {
    for (const state of connectionStates.values()) {
      if (
        state.config.organization === info.organization &&
        state.config.project === info.project &&
        state.client
      ) {
        return state.client;
      }
    }
  }

  if (info.label) {
    const byLabel = connections.find((connection) => getConnectionLabel(connection) === info.label);
    if (byLabel) {
      const stateByLabel = connectionStates.get(byLabel.id);
      if (stateByLabel?.client) {
        return stateByLabel.client;
      }
    }
  }

  if (activeConnectionId) {
    const activeState = connectionStates.get(activeConnectionId);
    if (activeState?.client) {
      return activeState.client;
    }
  }

  return client;
}

async function loadConnectionsFromConfig(
  context: vscode.ExtensionContext
): Promise<ProjectConnection[]> {
  const settings = getConfig();
  const rawConnections = settings.get<unknown[]>(CONNECTIONS_CONFIG_KEY) ?? [];

  const legacyOrganization = String(settings.get<string>('organization') ?? '').trim();
  const legacyProject = String(settings.get<string>('project') ?? '').trim();
  const legacyTeam = String(settings.get<string>('team') ?? '').trim();

  const legacyFallback =
    legacyOrganization && legacyProject
      ? {
          organization: legacyOrganization,
          project: legacyProject,
          team: legacyTeam || undefined,
          label: undefined,
        }
      : undefined;

  const {
    connections: normalized,
    requiresSave,
    summary,
  } = normalizeConnections(rawConnections, legacyFallback);
  connections = normalized;

  if (requiresSave) {
    try {
      await settings.update(
        CONNECTIONS_CONFIG_KEY,
        normalized.map((entry) => ({ ...entry })),
        vscode.ConfigurationTarget.Global
      );
      verbose('[connections] Saved migrated connections', summary);
    } catch (error) {
      console.warn('[connections] Failed to save migrated connections', error);
    }
  }

  // Migrate any existing global PAT into per-connection secret keys so
  // credentials are always connection-scoped (no global PAT sharing).
  if (connections.length > 0) {
    try {
      await migrateGlobalPATToConnections(context, connections);
    } catch (error) {
      console.warn('[azureDevOpsInt] migrateGlobalPATToConnections failed', error);
    }
  }

  verbose('[connections] Loaded connections from config', {
    count: connections.length,
    ids: connections.map((c) => c.id),
  });

  const validIds = new Set(connections.map((item) => item.id));

  for (const [id, state] of connectionStates.entries()) {
    if (!validIds.has(id)) {
      connectionStates.delete(id);
      initialRefreshedConnections.delete(id);
      clearConnectionCaches(id);
    } else {
      const updated = connections.find((item) => item.id === id);
      if (updated) {
        state.config = updated;
      }
    }
  }

  for (const key of Array.from(activeQueryByConnection.keys())) {
    if (!validIds.has(key)) {
      activeQueryByConnection.delete(key);
    }
  }

  const persistedActive = context.globalState.get<string>(ACTIVE_CONNECTION_STATE_KEY);
  const { activeConnectionId: resolvedActiveId, requiresPersistence } = resolveActiveConnectionId(
    persistedActive,
    connections
  );

  activeConnectionId = resolvedActiveId;

  if (requiresPersistence) {
    await context.globalState.update(ACTIVE_CONNECTION_STATE_KEY, resolvedActiveId);
  }

  notifyConnectionsList();
  return connections;
}

async function saveConnectionsToConfig(
  context: vscode.ExtensionContext,
  nextConnections: ProjectConnection[]
): Promise<void> {
  const settings = getConfig();
  connections = nextConnections;
  const serialized = nextConnections.map((entry) => ({ ...entry }));
  await settings.update(CONNECTIONS_CONFIG_KEY, serialized, vscode.ConfigurationTarget.Global);

  const validIds = new Set(nextConnections.map((item) => item.id));
  for (const [id, state] of connectionStates.entries()) {
    if (!validIds.has(id)) {
      connectionStates.delete(id);
      initialRefreshedConnections.delete(id);
      clearConnectionCaches(id);
    } else {
      const updated = nextConnections.find((item) => item.id === id);
      if (updated) state.config = updated;
    }
  }

  if (activeConnectionId && !validIds.has(activeConnectionId)) {
    activeConnectionId = nextConnections[0]?.id;
    await context.globalState.update(ACTIVE_CONNECTION_STATE_KEY, activeConnectionId);
  }

  notifyConnectionsList();
}

async function ensureConnectionsInitialized(context: vscode.ExtensionContext) {
  if (connections.length === 0) await loadConnectionsFromConfig(context);
  return connections;
}

/**
 * LEGACY AUTH REMOVED - Device code callback no longer used in FSM architecture
 * Device code callback for Entra ID authentication
 * Shows VS Code notification with device code and verification URL
 */
const createDeviceCodeCallback =
  (_context: vscode.ExtensionContext, connection?: ProjectConnection): any =>
  async (_deviceCode: any, userCode: any, verificationUrl: any, expiresIn: any) => {
    verbose('[EntraAuth] Device code received', { userCode, verificationUrl, expiresIn });

    const connectionLabel = connection ? describeConnection(connection) : 'Microsoft Entra ID';
    const action = await vscode.window.showInformationMessage(
      `Sign in to ${connectionLabel} with Microsoft Entra ID. Selecting “Open Browser” copies the code to your clipboard automatically.\n\nGo to ${verificationUrl} and enter code:\n\n${userCode}\n\nCode expires in ${Math.floor(expiresIn / 60)} minutes.`,
      { modal: false },
      'Open Browser'
    );

    if (action === 'Open Browser') {
      try {
        await vscode.env.clipboard.writeText(userCode);
      } catch (error) {
        console.warn('[EntraAuth] Failed to copy device code to clipboard', error);
      }
      await vscode.env.openExternal(vscode.Uri.parse(verificationUrl));
      vscode.window.showInformationMessage(
        `Device code ${userCode} copied to clipboard. Paste it into the browser to finish signing in.`
      );
    }
  };

async function ensureActiveConnection(
  context: vscode.ExtensionContext,
  connectionId?: string,
  options: EnsureActiveConnectionOptions = {}
): Promise<ConnectionState | undefined> {
  const prepared = await resolveActiveConnectionTarget(context, connectionId, options);
  if (!prepared) {
    return undefined;
  }

  const { connection, connectionId: targetId } = prepared;
  const adapter = getConnectionAdapterInstance();

  try {
    const result = (await adapter.ensureActiveConnection(context, targetId, options)) as
      | (ConnectionState & { isConnected?: boolean; lastError?: string })
      | undefined;

    if (result?.client && result?.provider) {
      result.id = connection.id;
      result.config = connection;
      result.authMethod = connection.authMethod || 'pat';

      const settings = getConfig();
      await finalizeConnectionSuccess(connection, result, options, settings);
      return result;
    }

    verbose(
      '[ensureActiveConnection] FSM connection did not produce provider; falling back to legacy',
      {
        connectionId: connection.id,
        hasResult: !!result,
        hasClient: !!result?.client,
        hasProvider: !!result?.provider,
        lastError: result?.lastError,
      }
    );

    return ensureActiveConnectionLegacy(context, connection.id, options);
  } catch (error) {
    console.warn(
      '[ensureActiveConnection] FSM path failed, falling back to legacy implementation',
      error
    );
    return ensureActiveConnectionLegacy(context, connection.id, options);
  }
}

async function ensureActiveConnectionLegacy(
  context: vscode.ExtensionContext,
  connectionId?: string,
  options: EnsureActiveConnectionOptions = {}
): Promise<ConnectionState | undefined> {
  const prepared = await resolveActiveConnectionTarget(context, connectionId, options);
  if (!prepared) {
    return undefined;
  }

  const { connection, connectionId: targetId } = prepared;

  let state = connectionStates.get(targetId);
  if (!state) {
    state = { id: targetId, config: connection, authMethod: connection.authMethod || 'pat' };
    connectionStates.set(targetId, state);
  } else {
    state.config = connection;
    state.authMethod = connection.authMethod || 'pat';
  }

  const settings = getConfig();
  const authMethod: AuthMethod = connection.authMethod || 'pat';

  if (authMethod === 'entra') {
    verbose(
      '[ensureActiveConnection] Entra ID authentication not available - FSM implementation needed',
      {
        id: targetId,
      }
    );

    state.client = undefined;
    state.provider = undefined;
    await vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', false);
    return state;
  }

  verbose('[ensureActiveConnection] using PAT authentication', { id: targetId });

  const pat = await getSecretPAT(context, targetId);
  if (!pat) {
    verbose('[ensureActiveConnection] missing PAT, cannot create client');
    provider = undefined;
    client = undefined;
    state.client = undefined;
    state.provider = undefined;
    await vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', false);
    return state;
  }

  state.pat = pat;
  const credential = pat;

  const ratePerSecond = Math.max(1, Math.min(50, settings.get<number>('apiRatePerSecond') ?? 5));
  const burst = Math.max(1, Math.min(100, settings.get<number>('apiBurst') ?? 10));
  const team = connection.team || settings.get<string>('team') || undefined;
  const providerLogger = createScopedLogger(`provider:${connection.id}`, shouldLogDebug);

  const needsNewClient =
    !state.client ||
    (authMethod === 'pat' && state.pat !== credential) ||
    ((authMethod as AuthMethod) === 'entra' && state.accessToken !== credential) ||
    state.client.organization !== connection.organization ||
    state.client.project !== connection.project ||
    state.client.team !== team;

  if (needsNewClient) {
    verbose('[ensureActiveConnection] creating new client', {
      id: connection.id,
      organization: connection.organization,
      project: connection.project,
      team,
      baseUrl: connection.baseUrl,
      authMethod,
    });

    verbose('[ensureActiveConnection] creating client with options', {
      hasIdentityName: !!connection.identityName,
      identityName: connection.identityName,
      baseUrl: connection.baseUrl,
    });

    state.client = new AzureDevOpsIntClient(
      connection.organization,
      connection.project,
      credential!,
      {
        ratePerSecond,
        burst,
        team,
        baseUrl: connection.baseUrl,
        apiBaseUrl: connection.apiBaseUrl,
        authType: (() => {
          const method = authMethod as AuthMethod;
          return method === 'entra' ? 'bearer' : 'pat';
        })(),
        identityName: connection.identityName,
        onAuthFailure: (error) => {
          state.accessToken = undefined;
          const detail = error?.message ? `Details: ${error.message}` : undefined;
          const shouldStartInteractive = (state.authMethod ?? 'pat') === 'entra';
          triggerAuthReminderSignIn(state.id, 'authFailed', {
            detail,
            force: true,
            startInteractive: shouldStartInteractive,
          });
        },
      }
    );

    if (state.provider) {
      state.provider.updateClient(state.client);
    }
  }

  const activeClient = state.client;
  if (!activeClient) {
    provider = undefined;
    client = undefined;
    await vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', false);
    return state;
  }

  if (!state.provider) {
    verbose('[ensureActiveConnection] creating provider', { id: state.id });
    state.provider = createConnectionProvider({
      connectionId: state.id,
      client: activeClient,
      postMessage: (msg: unknown) => forwardProviderMessage(state.id, msg),
      logger: providerLogger,
    });
  }

  verbose('[ensureActiveConnection] provider ready', {
    id: state.id,
    hasClient: !!state.client,
  });

  await finalizeConnectionSuccess(connection, state, options, settings);
  return state;
}

function ensureTimer(context: vscode.ExtensionContext) {
  if (timer) return timer;
  const config = getConfig();
  let pomodoroBreakTimeout: NodeJS.Timeout | undefined;
  timer = new WorkItemTimer({
    autoResumeOnActivity: config.get<boolean>('autoResumeOnActivity') ?? true,
    inactivityTimeoutSec: config.get<number>('timerInactivityTimeout') ?? 300,
    defaultElapsedLimitHours: config.get<number>('defaultElapsedLimitHours') ?? 3.5,
    pomodoroEnabled: config.get<boolean>('pomodoroEnabled') ?? false,
    breakPrompt: () => {
      const snap = timer?.snapshot?.();
      if (!snap || !snap.isPaused) return;
      vscode.window
        .showInformationMessage(
          'Time for a Pomodoro break?',
          { modal: true },
          'Start 5‑min break',
          'Skip'
        )
        .then((choice) => {
          if (!choice || choice === 'Skip') return;
          try {
            timer?.pause();
          } catch {
            /* ignore pause error */
          }
          if (pomodoroBreakTimeout) {
            try {
              clearTimeout(pomodoroBreakTimeout);
            } catch {
              /* ignore clear error */
            }
            pomodoroBreakTimeout = undefined;
          }
          pomodoroBreakTimeout = setTimeout(
            () => {
              try {
                timer?.resume();
              } catch {
                /* ignore resume error */
              }
              pomodoroBreakTimeout = undefined;
            },
            5 * 60 * 1000
          );
        })
        .then(
          () => {},
          (error) => {
            console.error('❌ [TIMER] Failed to show Pomodoro break dialog:', error);
          }
        );
    },
    persist: (data: { state?: any; timeEntries?: any[]; updateLastSave?: boolean }) =>
      persistTimer(context, data),
    restorePersisted: () => restoreTimer(context),
    onState: (s: any) => {
      sendToWebview({
        type: 'timerUpdate',
        timer: s,
        connectionId: timerConnectionInfo.id,
        connectionLabel: timerConnectionInfo.label,
        connectionOrganization: timerConnectionInfo.organization,
        connectionProject: timerConnectionInfo.project,
      });
      updateTimerContext(s);
    },
    onInfo: (m: any) => verbose('[timer]', m),
    onWarn: (m: any) => console.warn('[timer]', m),
    onError: (m: any) => console.error('[timer]', m),
  });
  timer.loadFromPersisted();
  return timer;
}

// Enable a minimal smoke-test mode for CI/integration tests to avoid heavy initialization
// Primary signal: VSCODE_INTEGRATION_SMOKE=1
// Fallback signal: VS Code test runner is present (extensionTestsPath arg) which indicates an integration test session.
function isVSCodeTestRun(): boolean {
  try {
    return (process.argv || []).some(
      (a) =>
        typeof a === 'string' &&
        (a.includes('--extensionTestsPath') || a.includes('integration-tests'))
    );
  } catch {
    return false;
  }
}
const IS_SMOKE = process.env.VSCODE_INTEGRATION_SMOKE === '1' || isVSCodeTestRun();

function getConfig() {
  return vscode.workspace.getConfiguration(CONFIG_NS);
}

type ConfigInspection<T> = {
  key: string;
  defaultValue?: T;
  globalValue?: T;
  workspaceValue?: T;
  workspaceFolderValue?: T;
  globalLanguageValue?: T;
  workspaceLanguageValue?: T;
  workspaceFolderLanguageValue?: T;
};

type ConfigGetter = {
  get<T>(section: string): T | undefined;
  inspect?<T>(section: string): ConfigInspection<T> | undefined;
};

type SendToWebviewOptions = {
  panel?: vscode.WebviewView;
  logger?: LoggerFn;
};

type SendWorkItemsSnapshotOptions = Omit<PostWorkItemsSnapshotParams, 'panel' | 'logger'> &
  SendToWebviewOptions;

function sendToWebview(message: any, options: SendToWebviewOptions = {}): void {
  const targetPanel = options.panel ?? panel;
  const logger = options.logger ?? verbose;
  const messageType = message?.type;

  if (messageType === 'workItemsLoaded') {
    const items = Array.isArray(message.workItems) ? [...message.workItems] : [];
    dispatchApplicationEvent({
      type: 'WORK_ITEMS_LOADED',
      workItems: items,
      connectionId: typeof message.connectionId === 'string' ? message.connectionId : undefined,
      query: typeof message.query === 'string' ? message.query : undefined,
      kanbanView: !!message.kanbanView,
      types: Array.isArray(message.types) ? [...message.types] : undefined,
    });
  }

  if (!targetPanel) {
    logger?.('[sendToWebview] dropping message (no panel)', { type: messageType });
    return;
  }

  try {
    targetPanel.webview.postMessage(message);
  } catch (error) {
    logger?.(
      '[sendToWebview] failed to post message',
      error instanceof Error ? error.message : error
    );
  }
}

function resolveSnapshotTypes(
  providerRef: WorkItemsProvider | undefined,
  explicit: string[] | undefined,
  logger: LoggerFn | undefined
): string[] | undefined {
  if (Array.isArray(explicit)) {
    return [...explicit];
  }
  if (!providerRef || typeof (providerRef as any).getWorkItemTypeOptions !== 'function') {
    return undefined;
  }
  try {
    const raw = (providerRef as any).getWorkItemTypeOptions();
    return Array.isArray(raw) ? [...raw] : undefined;
  } catch (error) {
    logger?.(
      '[sendWorkItemsSnapshot] failed to read provider type options',
      error instanceof Error ? error.message : error
    );
    return undefined;
  }
}

function resolveBranchContextPayload(
  connectionId: string | undefined,
  explicit: PostWorkItemsSnapshotParams['branchContext']
): PostWorkItemsSnapshotParams['branchContext'] {
  if (explicit !== undefined) {
    return explicit;
  }
  if (!connectionId) {
    return null;
  }
  const enrichment = getBranchEnrichmentState(connectionId);
  return enrichment?.context ?? null;
}

function enrichWorkItems(
  items: any[],
  connectionId: string | undefined,
  branchContext: PostWorkItemsSnapshotParams['branchContext']
): any[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }
  return items.map((item) => ({ ...item, connectionId, branchContext }));
}

function sendWorkItemsSnapshot(options: SendWorkItemsSnapshotOptions): void {
  const targetPanel = options.panel ?? panel;
  const logger = options.logger ?? verbose;
  const connectionId = options.connectionId ?? activeConnectionId;
  const items = Array.isArray(options.items) ? options.items : [];
  const branchContext = resolveBranchContextPayload(connectionId, options.branchContext);
  const types = resolveSnapshotTypes(options.provider, options.types, logger);

  postWorkItemsSnapshot({
    panel: targetPanel,
    connectionId,
    items,
    kanbanView: options.kanbanView,
    provider: options.provider,
    types,
    query: options.query,
    logger,
    branchContext,
  });

  const enrichedWorkItems = enrichWorkItems(items, connectionId, branchContext);
  dispatchApplicationEvent({
    type: 'WORK_ITEMS_LOADED',
    workItems: enrichedWorkItems,
    connectionId,
    query: options.query,
    kanbanView: !!options.kanbanView,
    types,
  });
}

function hasConfigOverride<T>(metadata: ConfigInspection<T> | undefined): boolean {
  if (!metadata) return false;
  const overrideValues = [
    metadata.globalValue,
    metadata.workspaceValue,
    metadata.workspaceFolderValue,
    metadata.globalLanguageValue,
    metadata.workspaceLanguageValue,
    metadata.workspaceFolderLanguageValue,
  ];
  return overrideValues.some((value) => value !== undefined);
}

export function resolveDefaultQuery(_config: ConfigGetter): string {
  const getValue = (key: string): string | undefined => {
    try {
      const raw = _config?.get<string | undefined>(key);
      if (typeof raw !== 'string') return undefined;
      const trimmed = raw.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    } catch {
      return undefined;
    }
  };

  const explicitDefault = getValue('defaultQuery');
  if (explicitDefault) return explicitDefault;

  const workItemQuery = getValue('workItemQuery');
  if (workItemQuery) {
    const inspectFn =
      typeof _config?.inspect === 'function' ? _config.inspect.bind(_config) : undefined;
    if (!inspectFn) return workItemQuery;
    try {
      const metadata = inspectFn<string>('workItemQuery');
      if (hasConfigOverride(metadata)) return workItemQuery;
    } catch {
      // If inspect fails, assume the user intentionally set a custom query to avoid breaking legacy behavior.
      return workItemQuery;
    }
  }

  return DEFAULT_QUERY;
}

function getDefaultQuery(config?: vscode.WorkspaceConfiguration): string {
  const target = (config ?? getConfig()) as ConfigGetter;
  return resolveDefaultQuery(target);
}
function getExtensionVersion(context: vscode.ExtensionContext): string {
  if (cachedExtensionVersion) return cachedExtensionVersion;
  try {
    const pkgPath = path.join(context.extensionPath, 'package.json');
    const pkgRaw = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(pkgRaw);
    cachedExtensionVersion = String(pkg.version || 'dev');
  } catch {
    // Swallow errors and fall back to 'dev'
    cachedExtensionVersion = 'dev';
  }
  return cachedExtensionVersion;
}
async function migrateLegacyConfigIfNeeded() {
  try {
    const legacy = vscode.workspace.getConfiguration(LEGACY_CONFIG_NS);
    const target = getConfig();
    const legacyOrg = legacy.get<string>('organization');
    const legacyProj = legacy.get<string>('project');
    if (legacyOrg && !target.get('organization'))
      await target.update('organization', legacyOrg, vscode.ConfigurationTarget.Global);
    if (legacyProj && !target.get('project'))
      await target.update('project', legacyProj, vscode.ConfigurationTarget.Global);
  } catch (e) {
    console.warn('[azureDevOpsInt] migrateLegacyConfigIfNeeded failed', e);
  }
}

/**
 * Apply startup patches to fix user settings and configuration issues.
 * This system automatically resolves problems without requiring manual user intervention.
 *
 * Each patch has a version identifier to ensure it only runs once per user.
 * Add new patches here for future bug fixes that need to modify user settings.
 *
 * @param context VS Code extension context for accessing settings and state
 */
async function applyStartupPatches(context: vscode.ExtensionContext): Promise<void> {
  try {
    const patchState = context.globalState;
    const PATCH_VERSION_KEY = 'azureDevOpsInt.appliedPatches';
    const appliedPatches = patchState.get<string[]>(PATCH_VERSION_KEY, []);

    // Patch 1.0.0-clientid-removal: Remove clientId from connection configurations
    // This fixes authentication issues caused by storing incorrect client IDs per connection
    if (!appliedPatches.includes('1.0.0-clientid-removal')) {
      await applyClientIdRemovalPatch();
      appliedPatches.push('1.0.0-clientid-removal');
      await patchState.update(PATCH_VERSION_KEY, appliedPatches);
      console.log('[azureDevOpsInt] Applied patch: 1.0.0-clientid-removal');
    }

    // Future patches can be added here following the same pattern:
    // if (!appliedPatches.includes('1.1.0-some-other-fix')) {
    //   await applySomeOtherPatch();
    //   appliedPatches.push('1.1.0-some-other-fix');
    //   await patchState.update(PATCH_VERSION_KEY, appliedPatches);
    //   console.log('[azureDevOpsInt] Applied patch: 1.1.0-some-other-fix');
    // }
  } catch (error) {
    console.warn('[azureDevOpsInt] Failed to apply startup patches:', error);
    // Don't fail activation if patches fail - log and continue
  }
}

/**
 * Patch to remove clientId from connection configurations.
 *
 * PROBLEM: Earlier versions allowed users to configure clientId per connection,
 * which caused authentication failures when users stored incorrect client IDs.
 *
 * SOLUTION: Remove all clientId fields from stored connections. The extension
 * now hardcodes the correct Azure DevOps client ID (872cd9fa-d31f-45e0-9eab-6e460a02d1f1)
 * in the authentication code, preventing user configuration errors.
 */
async function applyClientIdRemovalPatch(): Promise<void> {
  try {
    const config = vscode.workspace.getConfiguration('azureDevOpsIntegration');
    const connections = config.get<ProjectConnection[]>('connections', []);

    let patchedCount = 0;
    const patchedConnections = connections.map((conn) => {
      if ('clientId' in conn) {
        patchedCount++;
        const { clientId, ...connWithoutClientId } = conn as any;
        return connWithoutClientId;
      }
      return conn;
    });

    if (patchedCount > 0) {
      await config.update('connections', patchedConnections, vscode.ConfigurationTarget.Global);
      console.log(
        `[azureDevOpsInt] Startup patch: Removed clientId from ${patchedCount} connection(s)`
      );
    }
  } catch (error) {
    console.warn('[azureDevOpsInt] Client ID removal patch failed:', error);
    throw error; // Re-throw to be caught by applyStartupPatches
  }
}

export async function activate(context: vscode.ExtensionContext) {
  // Store reference to our rejection handler for proper cleanup
  rejectionHandler = (reason: any, promise: Promise<any>) => {
    // Only handle rejections that originate from our extension
    const isFromOurExtension =
      reason &&
      typeof reason === 'object' &&
      'stack' in reason &&
      typeof reason.stack === 'string' &&
      (reason.stack.includes('azuredevops-integration-extension') ||
        reason.stack.includes('azureDevOpsInt') ||
        reason.stack.includes('activation.ts') ||
        reason.stack.includes('src\\fsm\\') ||
        reason.stack.includes('src/fsm/'));

    // Skip rejections from other extensions
    if (!isFromOurExtension) {
      return;
    }

    // Suppress cancellation errors which are normal during VS Code shutdown
    if (reason && typeof reason === 'object') {
      // Check for cancellation by name, message, or stack trace content
      const isCancellation =
        ('name' in reason && reason.name === 'Canceled') ||
        ('message' in reason && reason.message === 'Canceled') ||
        (reason.toString && reason.toString().includes('Canceled')) ||
        ('stack' in reason &&
          typeof reason.stack === 'string' &&
          reason.stack.includes('Canceled'));

      if (isCancellation) {
        verbose('[azureDevOpsInt] Promise cancelled during shutdown (normal)');
        return;
      }
    }
    console.error('[azureDevOpsInt] Unhandled Promise Rejection:', reason);
    console.error('[azureDevOpsInt] Promise:', promise);
  };

  // Add global unhandled promise rejection handler
  process.on('unhandledRejection', rejectionHandler);

  // Add global uncaught exception handler
  process.on('uncaughtException', (error) => {
    console.error('[azureDevOpsInt] Uncaught Exception:', error);
  });

  extensionContextRef = context;
  setExtensionContextRefBridge(context);

  // Apply startup patches to fix user settings and configuration issues
  await applyStartupPatches(context);

  // In smoke mode (integration tests), minimize activation work to avoid any potential stalls.
  if (IS_SMOKE) {
    try {
      vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', false).then(
        () => {},
        () => {}
      );
    } catch {
      /* ignore */
    }
    // Do not register views/commands or initialize any domain objects in smoke mode.
    return undefined;
  }
  const cfg = getConfig();
  if (cfg.get<boolean>('debugLogging')) {
    const channel =
      getOutputChannel() ?? vscode.window.createOutputChannel('Azure DevOps Integration');
    setOutputChannel(channel);
    logLine('[activate] Debug logging enabled');
    // Bridge console logging to Output Channel for better debugging
    bridgeConsoleToOutputChannel();
  }
  // Status bar (hidden until connected or timer active)
  statusBarItem = vscode.window.createStatusBarItem(
    'azureDevOpsInt.timer',
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = 'azureDevOpsInt.stopTimer';
  context.subscriptions.push(statusBarItem);

  // Auth status bar item (shows Entra ID token status)
  authStatusBarItem = vscode.window.createStatusBarItem(
    'azureDevOpsInt.authStatus',
    vscode.StatusBarAlignment.Left,
    99
  );
  authStatusBarItem.command = 'azureDevOpsInt.signInWithEntra';
  context.subscriptions.push(authStatusBarItem);
  authStatusBarItem.hide(); // Hidden by default, shown only for Entra ID connections

  // LEGACY AUTH REMOVED - EntraAuthenticationProvider replaced by FSM authentication
  const authenticationProviderOptions: vscode.AuthenticationProviderOptions & {
    supportsAccountManagement?: boolean;
  } = {
    supportsMultipleAccounts: true,
    supportsAccountManagement: true,
  };
  // LEGACY AUTH REMOVED - Authentication provider registration replaced by FSM authentication

  // Register the work items webview view resolver (guard against duplicate registration)
  if (!viewProviderRegistered) {
    verbose('[azureDevOpsInt] Registering webview view provider: azureDevOpsWorkItems');
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        'azureDevOpsWorkItems',
        new AzureDevOpsIntViewProvider(context),
        { webviewOptions: { retainContextWhenHidden: true } }
      )
    );
    viewProviderRegistered = true;
  }
  // Register FSM trace commands for full replay capability
  registerTraceCommands(context);

  // Register quick debug commands for instant troubleshooting
  import('./fsm/commands/quickDebugCommands.js')
    .then(({ registerQuickDebugCommands }) => {
      registerQuickDebugCommands(context);
      verbose('[ACTIVATION] Quick debug commands registered');
    })
    .catch((error) => {
      console.error('❌ [ACTIVATION] Failed to import quick debug commands:', error);
    });

  // Register output channel reader for programmatic log access
  import('./fsm/commands/outputChannelReader.js')
    .then(({ registerOutputChannelReader }) => {
      registerOutputChannelReader(context);
      verbose('[ACTIVATION] Output channel reader registered for automated debugging');
    })
    .catch((error) => {
      console.error('❌ [ACTIVATION] Failed to import output channel reader:', error);
    });

  // AUTO-START FSM TRACING AND SHOW OUTPUT FOR DEBUGGING
  verbose('[ACTIVATION] Starting FSM tracing session automatically...');

  // Import FSM tracing modules
  import('./fsm/logging/FSMTracer.js')
    .then(({ startTraceSession, fsmTracer }) => {
      try {
        const sessionId = startTraceSession('Extension Activation - Auto Debug Session');
        verbose(`[ACTIVATION] FSM tracing started: ${sessionId}`);

        // Show the FSM output channel immediately for visibility
        import('./fsm/logging/FSMLogger.js')
          .then(({ fsmLogger, FSMComponent }) => {
            fsmLogger.showOutputChannel();
            verbose('[ACTIVATION] FSM Output Channel opened for debugging visibility');

            // Log activation start
            fsmLogger.info(FSMComponent.APPLICATION, 'Extension activation started', {
              component: FSMComponent.APPLICATION,
              event: 'ACTIVATE',
              state: 'activating',
            });
          })
          .catch((error) => {
            console.error('❌ [ACTIVATION] Failed to import FSM logger for activation:', error);
          });
      } catch (error) {
        console.error('❌ [ACTIVATION] Failed to start FSM tracing:', error);
      }
    })
    .catch((error) => {
      console.error('❌ [ACTIVATION] Failed to import FSM tracing modules:', error);
    });

  // FSM and Bridge setup
  const fsmSetupService = new FSMSetupService();
  context.subscriptions.push(fsmSetupService);
  await fsmSetupService.setup(context);

  const appActor = getApplicationStoreActor();
  if (appActor && typeof appActor.subscribe === 'function') {
    appActor.subscribe((snapshot: any) => {
      if (panel && snapshot) {
        const serializableState = {
          fsmState: snapshot.value,
          context: snapshot.context,
        };
        panel.webview.postMessage({
          type: 'syncState',
          payload: serializableState,
        });
      }
    });
  }

  // Core commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'azureDevOpsInt.setup',
      safeCommandHandler(() => {
        return setupConnection(context);
      })
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.setOpenAIApiKey',
      safeCommandHandler(() => {
        return setOpenAIApiKey(context);
      })
    ),
    vscode.commands.registerCommand('azureDevOpsInt.openLogs', () => {
      (async () => {
        try {
          let channel = getOutputChannel();
          if (!channel) {
            channel = vscode.window.createOutputChannel('Azure DevOps Integration');
            setOutputChannel(channel);
            logLine('[logs] Output channel created on demand');
          }
          channel.show(true);
          const currentConfig = getConfig();
          if (!currentConfig.get<boolean>('debugLogging')) {
            const pick = await vscode.window.showInformationMessage(
              'Verbose logging is currently disabled. Enable it to capture more diagnostics?',
              'Enable',
              'Skip'
            );
            if (pick === 'Enable') {
              await currentConfig.update('debugLogging', true, vscode.ConfigurationTarget.Global);
              logLine('[logs] Debug logging enabled');
            }
          }
        } catch (e: any) {
          vscode.window.showErrorMessage('Failed to open logs: ' + (e?.message || String(e)));
        }
      })().catch((err) => console.error('[azureDevOpsInt.openLogs] Error:', err));
    }),
    vscode.commands.registerCommand('azureDevOpsInt.copyLogsToClipboard', () => {
      (async () => {
        try {
          const version = extensionContextRef ? getExtensionVersion(extensionContextRef) : 'dev';
          const buffer = getLogBufferSnapshot();
          const header = `Azure DevOps Integration Logs\nVersion: ${version}\nTimestamp: ${new Date().toISOString()}\nLines: ${buffer.length}\n---\n`;
          const body = buffer.join('\n');
          const text = header + body + (body.endsWith('\n') ? '' : '\n');
          await vscode.env.clipboard.writeText(text);
          vscode.window.showInformationMessage('Copied extension logs to clipboard.');
        } catch (e: any) {
          vscode.window.showErrorMessage(
            'Failed to copy logs to clipboard: ' + (e?.message || String(e))
          );
        }
      })().catch((err) => console.error('[azureDevOpsInt.copyLogsToClipboard] Error:', err));
    }),
    vscode.commands.registerCommand(
      'azureDevOpsInt.diagnoseWorkItems',
      safeCommandHandler(async () => {
        try {
          await diagnoseWorkItemsIssue(context);
        } catch (e: any) {
          vscode.window.showErrorMessage('Diagnostic failed: ' + (e?.message || String(e)));
        }
      })
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.openLogsFolder',
      safeCommandHandler(async () => {
        try {
          await vscode.commands.executeCommand('workbench.action.openLogsFolder');
        } catch {
          try {
            await vscode.env.openExternal((vscode.env as any).logUri ?? vscode.Uri.file(''));
          } catch (e: any) {
            vscode.window.showErrorMessage(
              'Failed to open logs folder: ' + (e?.message || String(e))
            );
          }
        }
      })
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.focusWorkItemsView',
      safeCommandHandler(() => revealWorkItemsView())
    ),

    vscode.commands.registerCommand(
      'azureDevOpsInt.setDefaultElapsedLimit',
      safeCommandHandler(async () => {
        try {
          const cfg = getConfig();
          const prev = cfg.get<number>('defaultElapsedLimitHours') ?? 3.5;
          const input = await vscode.window.showInputBox({
            prompt: 'Default elapsed hours to cap long-running timers (e.g. 3.5)',
            value: String(prev),
            validateInput: (v) => {
              const n = Number(v);
              if (isNaN(n) || !isFinite(n) || n < 0) return 'Enter a non-negative number';
              return null;
            },
          });
          if (typeof input === 'undefined') return; // cancelled
          const val = Number(input);
          await cfg.update('defaultElapsedLimitHours', val, vscode.ConfigurationTarget.Global);
          vscode.window.showInformationMessage(`Default elapsed cap updated to ${val} hours.`);
          // Propagate to any running timer
          if (timer && typeof (timer as any).setDefaultElapsedLimitHours === 'function') {
            try {
              (timer as any).setDefaultElapsedLimitHours(val);
            } catch (e) {
              console.warn(
                '[azureDevOpsInt] Failed to propagate defaultElapsedLimitHours to running timer',
                e
              );
            }
          }
        } catch (err: any) {
          console.error('Failed to update default elapsed cap', err);
          vscode.window.showErrorMessage(
            'Failed to update default elapsed cap: ' + (err?.message || String(err))
          );
        }
      })
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.showWorkItems',
      safeCommandHandler(() => revealWorkItemsView())
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.refreshWorkItems',
      safeCommandHandler(async () => {
        // Use connection-specific query instead of global default
        const connectionSpecificQuery = activeConnectionId
          ? getStoredQueryForConnection(activeConnectionId)
          : getDefaultQuery();

        verbose('[command] refreshWorkItems invoked', {
          hasProvider: !!provider,
          query: connectionSpecificQuery,
          activeConnectionId,
        });
        if (!provider && extensionContextRef) {
          verbose('[command] refreshWorkItems no provider; attempting ensureActiveConnection');
          try {
            await ensureActiveConnection(extensionContextRef, activeConnectionId, {
              refresh: false,
            });
          } catch (e: any) {
            verbose('[command] ensureActiveConnection failed in refreshWorkItems', e?.message || e);
          }
        }
        provider?.refresh(connectionSpecificQuery);
      })
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.createWorkItem',
      safeCommandHandler(() => {
        return quickCreateWorkItem();
      })
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.startTimer',
      safeCommandHandler(() => {
        return startTimerInteractive();
      })
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.pauseTimer',
      safeCommandHandler(() => {
        timer?.pause();
      })
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.resumeTimer',
      safeCommandHandler(() => {
        timer?.resume();
      })
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.stopTimer',
      safeCommandHandler(async () => {
        if (!timer) {
          vscode.window.showInformationMessage('No active timer to stop.');
          return;
        }
        const timerConnectionSnapshot: TimerConnectionInfo = { ...timerConnectionInfo };
        setTimerConnectionFrom(undefined);
        const stopped = timer.stop();
        updateTimerContext(undefined);
        if (stopped) {
          await handleTimerStopAndOfferUpdate(stopped, {
            offerCopilot: false,
            connection: timerConnectionSnapshot,
          });
        }
      })
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.showTimeReport',
      safeCommandHandler(() => showTimeReport())
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.createBranch',
      safeCommandHandler(() => createBranchFromWorkItem())
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.createPullRequest',
      safeCommandHandler(() => createPullRequestInteractive())
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.showPullRequests',
      safeCommandHandler(() => showMyPullRequests())
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.showBuildStatus',
      safeCommandHandler(() => showBuildStatus())
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.toggleKanbanView',
      safeCommandHandler(() => toggleKanbanView())
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.selectTeam',
      safeCommandHandler(() => selectTeam())
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.resetPreferredRepositories',
      safeCommandHandler(() => resetPreferredRepositories())
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.selfTestWebview',
      safeCommandHandler(() => selfTestWebview())
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.signInWithEntra',
      safeCommandHandler((target?: unknown) => {
        return signInWithEntra(
          context,
          typeof target === 'string' ? target : (target as ProjectConnection | undefined)?.id
        );
      })
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.signOutEntra',
      safeCommandHandler((target?: unknown) => {
        return signOutEntra(
          context,
          typeof target === 'string' ? target : (target as ProjectConnection | undefined)?.id
        );
      })
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.convertConnectionToEntra',
      safeCommandHandler(() => convertConnectionToEntra(context))
    ),
    vscode.commands.registerCommand('azureDevOpsInt.clearFilter', () => {
      sendToWebview({ type: 'clearFilters' });
    }),
    vscode.commands.registerCommand('azureDevOpsInt.focusSearch', () => {
      sendToWebview({ type: 'focusSearch' });
    }),
    vscode.commands.registerCommand('azureDevOpsInt.showPerformanceDashboard', () => {
      showPerformanceDashboard();
    }),
    vscode.commands.registerCommand('azureDevOpsInt.clearPerformanceData', () => {
      performanceMonitor.clear();
      vscode.window.showInformationMessage('Performance data cleared successfully');
    }),
    vscode.commands.registerCommand('azureDevOpsInt.forceGC', () => {
      forceGarbageCollection();
    }),
    vscode.commands.registerCommand(
      'azureDevOpsInt.bulkAssign',
      safeCommandHandler(() => {
        dispatchApplicationEvent({
          type: 'WEBVIEW_MESSAGE',
          message: { type: 'bulkAssign', connectionId: activeConnectionId },
        });
      })
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.bulkMove',
      safeCommandHandler(() => {
        dispatchApplicationEvent({
          type: 'WEBVIEW_MESSAGE',
          message: { type: 'bulkMove', connectionId: activeConnectionId },
        });
      })
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.bulkAddTags',
      safeCommandHandler(() => {
        dispatchApplicationEvent({
          type: 'WEBVIEW_MESSAGE',
          message: { type: 'bulkAddTags', connectionId: activeConnectionId },
        });
      })
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.bulkDelete',
      safeCommandHandler(() => {
        dispatchApplicationEvent({
          type: 'WEBVIEW_MESSAGE',
          message: { type: 'bulkDelete', connectionId: activeConnectionId },
        });
      })
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.exportFilters',
      safeCommandHandler(() => {
        exportFiltersToFile();
      })
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.importFilters',
      safeCommandHandler(() => {
        importFiltersFromFile();
      })
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.manageFilters',
      safeCommandHandler(() => {
        manageSavedFilters();
      })
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.showQueryBuilder',
      safeCommandHandler(() => {
        showQueryBuilder();
      })
    )
  );

  // Initialize performance monitoring
  startCacheCleanup();
  performanceMonitor.setEnabled(true);

  // Periodic memory optimization
  gcInterval = setInterval(() => {
    MemoryOptimizer.forceGCIfNeeded();
  }, 60000); // Every minute

  // Attempt silent init if settings already present
  if (!IS_SMOKE) {
    migrateLegacyConfigIfNeeded().finally(() => silentInit(context));
  } else {
    try {
      vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', false).then(
        () => {},
        () => {}
      );
    } catch {
      /* ignore */
    }
  }

  // React to configuration changes (connections, org, project, PAT) to (re)initialize without requiring reload
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      (async () => {
        if (
          e.affectsConfiguration(`${CONFIG_NS}.connections`) ||
          e.affectsConfiguration(`${CONFIG_NS}.organization`) ||
          e.affectsConfiguration(`${CONFIG_NS}.project`) ||
          e.affectsConfiguration(`${CONFIG_NS}.personalAccessToken`)
        ) {
          try {
            vscode.commands.registerCommand(
              'azureDevOpsInt.signInWithEntraCycle',
              safeCommandHandler(() => {
                return cycleAuthSignIn(context);
              })
            );
            await migrateLegacyPAT(context);
          } catch {
            /* ignore */
          }
          // Force reload connections array from config when connections setting changes
          if (e.affectsConfiguration(`${CONFIG_NS}.connections`)) {
            connections.length = 0; // Clear array to force reload
            await loadConnectionsFromConfig(context);
            notifyConnectionsList(); // Update webview with new connections list
          }
          // Reset client/provider so silentInit can rebuild from new settings
          client = undefined;
          provider = undefined;
          await silentInit(context);
          // If a view is attached, refresh to reflect new connection via command
          try {
            await vscode.commands.executeCommand('azureDevOpsInt.refreshWorkItems');
          } catch {
            /* ignore */
          }
        }
      })().catch((err) => console.error('[onDidChangeConfiguration] Error:', err));
    })
  );

  // Background token refresh for Entra ID connections
  // LEGACY AUTH REMOVED - Token refresh now handled by FSM
  // PAT connections don't require token refresh
  verbose('[TokenRefresh] Legacy token refresh disabled - FSM handles authentication');

  // LEGACY AUTH REMOVED - Initial token check now handled by FSM
  verbose('[TokenRefresh] Legacy initial token check disabled - FSM handles authentication');
}

export function deactivate() {
  console.log('[azureDevOpsInt] Extension deactivating...');

  // Set flag to prevent new async operations during shutdown
  isDeactivating = true;

  setWebviewMessageHandler(undefined);

  try {
    // Remove only our specific error handlers
    if (rejectionHandler) {
      process.removeListener('unhandledRejection', rejectionHandler);
      rejectionHandler = undefined;
    }

    // Clean up performance monitoring
    stopCacheCleanup();
    performanceMonitor.setEnabled(false);

    // Clean up token refresh interval
    if (tokenRefreshInterval) {
      clearInterval(tokenRefreshInterval);
      tokenRefreshInterval = undefined;
    }

    // Clean up memory optimization interval
    if (gcInterval) {
      clearInterval(gcInterval);
      gcInterval = undefined;
    }

    // Clean up timer
    if (timer) {
      timer.stop();
    }

    // Reset VS Code context - handle promises properly to avoid unhandled rejections
    try {
      vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', false).then(
        () => {},
        () => {}
      ); // Explicitly handle both resolve and reject
      vscode.commands.executeCommand('setContext', 'azureDevOpsInt.timerActive', false).then(
        () => {},
        () => {}
      ); // Explicitly handle both resolve and reject
      vscode.commands.executeCommand('setContext', 'azureDevOpsInt.timerRunning', false).then(
        () => {},
        () => {}
      ); // Explicitly handle both resolve and reject
      vscode.commands.executeCommand('setContext', 'azureDevOpsInt.timerPaused', false).then(
        () => {},
        () => {}
      ); // Explicitly handle both resolve and reject
    } catch {
      // Ignore any context setting errors during shutdown
    }

    console.log('[azureDevOpsInt] Extension deactivated successfully');
  } catch (error) {
    console.error('[azureDevOpsInt] Error during deactivation:', error);
  }
}

class AzureDevOpsIntViewProvider implements vscode.WebviewViewProvider {
  private ctx: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.ctx = context;
  }

  async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    if (IS_SMOKE) {
      // Avoid doing any webview work in smoke/integration test mode
      try {
        vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', false).then(
          () => {},
          () => {}
        );
      } catch {
        /* ignore */
      }
      return undefined;
    }
    console.log('[azureDevOpsInt] 🔍 resolveWebviewView invoked for view:', webviewView.viewType);
    console.log('[azureDevOpsInt] 🔍 Webview visibility:', webviewView.visible);
    console.log('[azureDevOpsInt] 🔍 Extension context URI:', this.ctx.extensionUri.toString());

    panel = webviewView;
    const webview = webviewView.webview;
    const contextBridge = await ensureSharedContextBridge(this.ctx);
    contextBridge.attachWebview(webview);
    contextBridge.sync();

    console.log('[azureDevOpsInt] 🔍 Setting webview options...');
    console.log('📺 [WEBVIEW] Webview panel created and assigned');

    // Log to FSM system
    import('./fsm/logging/FSMLogger.js')
      .then(({ fsmLogger, FSMComponent }) => {
        fsmLogger.info(
          FSMComponent.WEBVIEW,
          'Webview panel created',
          {
            component: FSMComponent.WEBVIEW,
            event: 'PANEL_CREATED',
          },
          {
            viewType: webviewView.viewType,
            visible: webviewView.visible,
          }
        );
      })
      .catch((error) => {
        console.error('❌ [FSM] Failed to import FSM logger for webview panel creation:', error);
      });
    const mediaPath = vscode.Uri.joinPath(this.ctx.extensionUri, 'media', 'webview');
    console.log('[azureDevOpsInt] 🔍 Media path for local resources:', mediaPath.toString());

    webview.options = {
      enableScripts: true,
      localResourceRoots: [mediaPath],
    };
    console.log('[azureDevOpsInt] 🔍 Webview options set successfully');

    const nonce = getNonce();
    console.log('[azureDevOpsInt] 🔍 Generated nonce for webview:', nonce);

    webview.onDidReceiveMessage((msg: any) => {
      console.log('[azureDevOpsInt] 🔍 Received message from webview:', msg?.type || 'unknown');
      if (contextBridge.handleWebviewMessage(msg)) {
        return;
      }
      dispatchApplicationEvent({ type: 'WEBVIEW_MESSAGE', message: msg });
    });

    webviewView.onDidDispose(() => {
      contextBridge.detachWebview();
    });

    console.log('[azureDevOpsInt] 🔍 Building webview HTML...');
    const html = buildMinimalWebviewHtml(this.ctx, webview, nonce);
    console.log('[azureDevOpsInt] 🔍 HTML length:', html.length);
    console.log('[azureDevOpsInt] 🔍 HTML preview (first 500 chars):', html.substring(0, 500));

    webview.html = html;
    console.log('[azureDevOpsInt] 🔍 Webview HTML set successfully');

    // Add visibility tracking
    webviewView.onDidChangeVisibility(() => {
      console.log('[azureDevOpsInt] 🔍 Webview visibility changed to:', webviewView.visible);
    });

    if (!IS_SMOKE) {
      console.log('[azureDevOpsInt] 🔍 Initializing domain objects...');
      initDomainObjects(this.ctx).catch((err) =>
        console.error('[azureDevOpsInt] Failed to initialize domain objects', err)
      );
    } else {
      // In smoke mode, avoid heavy initialization and network calls.
      // Still send minimal ready state so the webview can render.
      console.log('[azureDevOpsInt] 🔍 SMOKE mode - sending minimal snapshot');
      const initialQuery = getStoredQueryForConnection(
        activeConnectionId,
        getDefaultQuery(getConfig())
      );
      sendWorkItemsSnapshot({
        connectionId: activeConnectionId,
        items: [],
        kanbanView: false,
        types: [],
        query: initialQuery,
      });

      // Also send initial query to webview in SMOKE mode
      sendToWebview({
        type: 'queryChanged',
        query: initialQuery,
        connectionId: activeConnectionId,
        description: `SMOKE mode query for connection ${activeConnectionId}`,
      });
    }
  }
}

async function initDomainObjects(context: vscode.ExtensionContext) {
  verbose('[initDomainObjects] start');
  const config = getConfig();
  sessionTelemetry = sessionTelemetry ?? new SessionTelemetryManager(context);
  await ensureConnectionsInitialized(context);
  const state = await ensureActiveConnection(context, activeConnectionId, { refresh: false });
  verbose('[initDomainObjects] ensured active connection', {
    hasState: !!state,
    connectionId: state?.id,
    hasProvider: !!state?.provider,
  });

  const timerInstance = ensureTimer(context);
  const snapshot = timerInstance.snapshot?.();
  if (snapshot) {
    sendToWebview({
      type: 'timerUpdate',
      timer: snapshot,
      connectionId: timerConnectionInfo.id,
      connectionLabel: timerConnectionInfo.label,
      connectionOrganization: timerConnectionInfo.organization,
      connectionProject: timerConnectionInfo.project,
    });
    updateTimerContext(snapshot);
  }

  notifyConnectionsList();

  if (panel && state?.provider) {
    const selectedQuery = getStoredQueryForConnection(state.id, getDefaultQuery(config));

    // Send current query to webview so UI shows correct selection on initial load
    sendToWebview({
      type: 'queryChanged',
      query: selectedQuery,
      connectionId: state.id,
      description: `Initial query for connection ${state.id}`,
    });

    if (!initialRefreshedConnections.has(state.id)) {
      initialRefreshedConnections.add(state.id);
    }
    verbose('[initDomainObjects] panel ready, refreshing provider', {
      id: state.id,
      query: selectedQuery,
    });
    state.provider.refresh(selectedQuery);
  } else if (panel && !state?.provider) {
    verbose('[initDomainObjects] panel ready but provider missing, sending empty payload');
    sendWorkItemsSnapshot({
      connectionId: activeConnectionId,
      items: [],
      kanbanView: false,
      types: [],
      query: getStoredQueryForConnection(activeConnectionId, getDefaultQuery(config)),
    });
  }
}

async function switchActiveConnectionLegacy(
  targetId: string,
  options: { refresh?: boolean } = {}
): Promise<void> {
  console.log('[azureDevOpsInt] 🔄 Legacy connection switch requested via FSM bridge:', {
    targetId,
    currentActiveConnectionId: activeConnectionId,
    options,
  });

  if (!targetId) {
    verbose('[switchActiveConnectionLegacy] missing connectionId in request');
    return;
  }

  if (!extensionContextRef) {
    verbose('[switchActiveConnectionLegacy] extension context not available');
    return;
  }

  try {
    const state = await ensureActiveConnection(extensionContextRef, targetId, {
      refresh: options.refresh ?? false,
    });

    const activeProvider = state?.provider;
    const cfg = getConfig();
    const selectedQuery = getStoredQueryForConnection(targetId, getDefaultQuery(cfg));

    console.log('[azureDevOpsInt] 🔄 Legacy connection switch completed:', {
      newActiveConnectionId: activeConnectionId,
      targetId,
      selectedQuery,
      hasProvider: !!activeProvider,
    });

    sendToWebview({
      type: 'queryChanged',
      query: selectedQuery,
      connectionId: targetId,
      description: `Query for connection ${targetId}`,
    });

    const cachedItems =
      activeProvider && typeof (activeProvider as any).getWorkItems === 'function'
        ? (activeProvider as any).getWorkItems() || []
        : [];

    sendWorkItemsSnapshot({
      connectionId: targetId,
      items: cachedItems,
      kanbanView: false,
      provider: activeProvider,
      query: selectedQuery,
    });

    if (activeProvider && cachedItems.length === 0) {
      activeProvider.refresh(selectedQuery);
    } else if (activeProvider && cachedItems.length > 0) {
      setTimeout(() => {
        try {
          activeProvider.refresh(selectedQuery);
        } catch (error: any) {
          verbose(
            '[switchActiveConnectionLegacy] refresh after cached post failed',
            error?.message || error
          );
        }
      }, 0);
    } else if (!activeProvider) {
      sendWorkItemsSnapshot({
        connectionId: targetId,
        items: [],
        kanbanView: false,
        types: [],
        query: selectedQuery,
      });
    }
  } catch (error: any) {
    console.error('[switchActiveConnectionLegacy] failed', error);
    vscode.window.showErrorMessage(
      'Failed to switch Azure DevOps project: ' + (error?.message || String(error))
    );
  }
}

async function handleLegacyMessage(msg: any) {
  verbose('[webview->ext]', JSON.stringify(msg));

  // Log to FSM system
  import('./fsm/logging/FSMLogger.js')
    .then(({ fsmLogger, FSMComponent }) => {
      fsmLogger.debug(
        FSMComponent.WEBVIEW,
        `Webview message: ${msg?.type || 'unknown'}`,
        {
          component: FSMComponent.WEBVIEW,
          event: msg?.type || 'UNKNOWN_MESSAGE',
        },
        msg
      );
    })
    .catch((error) => {
      console.error('❌ [FSM] Failed to import FSM logger for webview message:', error);
    });

  // Handle async cases first
  if (msg?.type === 'editWorkItemInEditor') {
    const id: number | undefined = typeof msg.workItemId === 'number' ? msg.workItemId : undefined;
    if (typeof id === 'number' && provider) {
      editWorkItemInEditor(id);
    }
    return undefined;
  }

  switch (msg?.type) {
    case 'requireAuthentication': {
      // Log to FSM system
      import('./fsm/logging/FSMLogger.js')
        .then(({ fsmLogger, FSMComponent }) => {
          fsmLogger.info(FSMComponent.AUTH, 'Manual authentication required', {
            component: FSMComponent.AUTH,
            connectionId: msg.connectionId,
            event: 'REQUIRE_AUTHENTICATION',
          });
        })
        .catch((error) => {
          console.error('❌ [FSM] Failed to import FSM logger for require authentication:', error);
        });

      const connectionId = typeof msg.connectionId === 'string' ? msg.connectionId.trim() : '';
      if (!connectionId) {
        console.warn('🔴 [webview->ext] requireAuthentication: missing connectionId');
        break;
      }

      console.log('🔐 [webview->ext] Manual authentication required for connection:', connectionId);

      // Check if authentication is already in progress for this connection
      const connectionState = connectionStates.get(connectionId);
      if (connectionState?.reauthInProgress) {
        console.log('⏳ [webview->ext] Authentication already in progress for:', connectionId);
        break;
      }

      // Use FSM-based authentication for both PAT and Entra ID
      try {
        const { getConnectionFSMManager } = await import('./fsm/ConnectionFSMManager.js');
        const fsmManager = getConnectionFSMManager();

        // Get connection state to determine auth method and config
        if (connectionState?.config) {
          // Mark authentication as in progress
          if (connectionState) {
            connectionState.reauthInProgress = true;
          }

          // Enable FSM for this operation
          fsmManager.setEnabled(true);

          // Connect using FSM with authentication refresh
          const result = await fsmManager.connectToConnection(connectionState.config, {
            refresh: true,
            interactive: true,
          });

          if (result.success) {
            console.log('✅ [webview->ext] FSM authentication successful for:', connectionId);
          } else {
            console.warn(
              '⚠️ [webview->ext] FSM authentication failed, falling back to legacy:',
              result.error
            );
            throw new Error(result.error || 'FSM authentication failed');
          }
        } else {
          console.warn('⚠️ [webview->ext] No connection config found for FSM authentication');
          throw new Error('No connection config available');
        }
      } catch (error) {
        console.error('❌ [webview->ext] Failed to trigger FSM authentication:', error);
        // Fallback to legacy authentication
        triggerAuthReminderSignIn(connectionId, 'authFailed', {
          force: true,
          startInteractive: true,
        });
      } finally {
        // Clear the in-progress flag
        if (connectionState) {
          connectionState.reauthInProgress = false;
        }
      }
      break;
    }
    case 'webviewReady': {
      // Re-send current cached state (avoid race where initial post happened before listener attached)
      if (panel) {
        // Re-send connections list in case webview loaded before initDomainObjects completed
        notifyConnectionsList();

        const workItems = provider?.getWorkItems() || [];
        console.log('[azureDevOpsInt] Sending workItemsLoaded with', workItems.length, 'items');
        if (workItems.length > 0) {
          console.log('[azureDevOpsInt] First work item:', JSON.stringify(workItems[0], null, 2));
        }
        const snapshotQuery = getQueryForProvider(provider, activeConnectionId);
        sendWorkItemsSnapshot({
          connectionId: activeConnectionId,
          items: workItems,
          kanbanView: false,
          provider,
          query: snapshotQuery,
        });
        const snap = timer?.snapshot?.();
        if (snap)
          sendToWebview({
            type: 'timerUpdate',
            timer: snap,
            connectionId: timerConnectionInfo.id,
            connectionLabel: timerConnectionInfo.label,
            connectionOrganization: timerConnectionInfo.organization,
            connectionProject: timerConnectionInfo.project,
          });
        // Send UI preferences from global memento
        const uiPrefs = extensionContextRef?.globalState.get(
          'azureDevOpsIntegration.uiPreferences',
          {
            kanbanView: false,
            filterText: '',
            typeFilter: '',
            stateFilter: 'all',
            sortKey: 'updated-desc',
          }
        );
        sendToWebview({ type: 'uiPreferences', preferences: uiPrefs });
        // If a self-test was queued before webview ready, trigger now
        if (selfTestPending) {
          sendToWebview({ type: 'selfTestPing', nonce: selfTestPending.nonce });
        }
      }
      break;
    }
    case 'selfTestAck':
    case 'selfTestPong': {
      if (selfTestPending && msg.nonce === selfTestPending.nonce) {
        clearTimeout(selfTestPending.timeout);
        selfTestPending.resolve({ ok: true, details: msg.signature || 'ack' });
        selfTestPending = undefined;
        vscode.window.showInformationMessage(
          `Webview self-test succeeded: ${msg.signature || 'ack'}`
        );
      }
      break;
    }
    case 'webviewRuntimeError': {
      const msgTxt = `[webviewRuntimeError] ${msg.message || 'Unknown error'}${
        msg.stack ? '\n' + msg.stack : ''
      }`;
      console.error(msgTxt);
      logLine(msgTxt);
      if (getConfig().get<boolean>('debugLogging')) {
        vscode.window.showErrorMessage(`Webview runtime error: ${msg.message || 'Unknown'}`);
      }
      break;
    }
    case 'refresh': {
      verbose('[webview] refresh requested', {
        hasProvider: !!provider,
        cachedCount:
          provider && typeof (provider as any).getWorkItems === 'function'
            ? ((provider as any).getWorkItems() || []).length
            : 0,
      });
      if (!provider && extensionContextRef) {
        verbose('[webview] refresh no provider; ensuring connection');
        try {
          await ensureActiveConnection(extensionContextRef, activeConnectionId, {
            refresh: false,
          });
        } catch (e: any) {
          verbose('[webview] ensureActiveConnection failed in refresh', e?.message || e);
        }
      }
      const refreshQuery = getQueryForProvider(provider, activeConnectionId);
      provider?.refresh(refreshQuery);
      break;
    }
    case 'getWorkItems': {
      verbose('Work items requested from webview');
      const cfg = getConfig();
      const requestedConnectionId =
        typeof msg.connectionId === 'string' ? msg.connectionId.trim() : '';
      const fallbackQuery = getDefaultQuery(cfg);
      const incomingQuery = normalizeQuery(msg.query);
      const targetConnectionId = requestedConnectionId || activeConnectionId || undefined;

      let resolvedQuery = fallbackQuery;
      if (targetConnectionId) {
        resolvedQuery = incomingQuery
          ? setStoredQueryForConnection(targetConnectionId, incomingQuery)
          : getStoredQueryForConnection(targetConnectionId, fallbackQuery);
      } else if (incomingQuery) {
        resolvedQuery = incomingQuery;
      }

      let currentProvider = provider;
      verbose('[getWorkItems] current state', {
        hasProvider: !!currentProvider,
        cachedCount:
          currentProvider && typeof (currentProvider as any).getWorkItems === 'function'
            ? ((currentProvider as any).getWorkItems() || []).length
            : 0,
        activeConnectionId,
        requestedConnectionId,
        resolvedQuery,
      });
      if (!currentProvider && extensionContextRef) {
        verbose('No provider available; attempting to ensure active connection');
        try {
          await ensureActiveConnection(extensionContextRef, targetConnectionId, {
            refresh: false,
          });
        } catch (e: any) {
          verbose('ensureActiveConnection failed during getWorkItems request', e?.message || e);
        }
        currentProvider = provider;
      }
      const responseConnectionId = targetConnectionId ?? activeConnectionId;
      if (!targetConnectionId && responseConnectionId) {
        resolvedQuery = incomingQuery
          ? setStoredQueryForConnection(responseConnectionId, incomingQuery)
          : getStoredQueryForConnection(responseConnectionId, fallbackQuery);
      }
      const workItems =
        currentProvider && typeof (currentProvider as any).getWorkItems === 'function'
          ? (currentProvider as any).getWorkItems() || []
          : [];
      verbose('[getWorkItems] responding with cached items', {
        count: workItems.length,
        connectionId: responseConnectionId,
      });
      sendWorkItemsSnapshot({
        connectionId: responseConnectionId,
        items: workItems,
        provider: currentProvider,
        query: resolvedQuery,
      });
      if (currentProvider && workItems.length === 0) {
        verbose('Provider returned zero cached work items; triggering refresh', {
          query: resolvedQuery,
        });
        try {
          currentProvider.refresh(resolvedQuery);
        } catch (e: any) {
          verbose('Provider refresh failed after empty cache response', e?.message || e);
        }
      }
      break;
    }
    case 'setQuery': {
      const connectionIdRaw = typeof msg.connectionId === 'string' ? msg.connectionId.trim() : '';
      const targetId = connectionIdRaw || activeConnectionId || '';
      console.log('[azureDevOpsInt] 🔍 Query update requested:', {
        messageConnectionId: connectionIdRaw,
        resolvedTargetId: targetId,
        activeConnectionId,
        newQuery: msg.query,
      });

      if (!targetId) {
        verbose('[setQuery] no connection id resolved; skipping');
        break;
      }
      const storedQuery = setStoredQueryForConnection(
        targetId,
        typeof msg.query === 'string' ? msg.query : undefined
      );
      const state = connectionStates.get(targetId);
      const targetProvider =
        state?.provider ?? (targetId === activeConnectionId ? provider : undefined);

      console.log('[azureDevOpsInt] 🔍 Query updated:', {
        connectionId: targetId,
        storedQuery,
        hasProvider: !!targetProvider,
        isActiveConnection: targetId === activeConnectionId,
      });

      verbose('[setQuery] applied new query', {
        connectionId: targetId,
        query: storedQuery,
        hasProvider: !!targetProvider,
      });
      targetProvider?.refresh(storedQuery);
      break;
    }
    // case 'switchConnection':
    // case 'setActiveConnection': {
    //   const targetId = typeof msg.connectionId === 'string' ? msg.connectionId.trim() : '';
    //   console.log('[azureDevOpsInt] 🔄 Connection switch requested (legacy handler - should be disabled):', {
    //     targetId,
    //     currentActiveConnectionId: activeConnectionId,
    //     messageType: msg.type,
    //   });

    //   // await switchActiveConnectionLegacy(targetId, { refresh: false });
    //   break;
    // }
    case 'moveWorkItem': {
      const id: number | undefined =
        typeof msg.id === 'number'
          ? msg.id
          : typeof msg.workItemId === 'number'
            ? msg.workItemId
            : undefined;
      const target: string | undefined = typeof msg.target === 'string' ? msg.target : undefined;
      const targetState: string | undefined =
        typeof msg.targetState === 'string' ? msg.targetState : undefined;
      if (!id || (!target && !targetState)) {
        panel?.webview.postMessage({
          type: 'moveWorkItemResult',
          id,
          success: false,
          error: 'Missing id or target state',
        });
        break;
      }
      try {
        if (!client || !provider) throw new Error('Not connected');
        const map: Record<string, string> = {
          todo: 'To Do',
          new: 'New',
          approved: 'Approved',
          committed: 'Committed',
          active: 'Active',
          inprogress: 'In Progress',
          review: 'Review',
          resolved: 'Resolved',
          done: 'Done',
          closed: 'Closed',
          removed: 'Removed',
        };
        let desired =
          (targetState && String(targetState)) || (target ? map[target] : undefined) || 'Active';
        const current = provider.getWorkItems().find((w: any) => Number(w.id) === Number(id));
        const wiType = current?.fields?.['System.WorkItemType'];
        if (wiType) {
          try {
            const states = await client.getWorkItemTypeStates(String(wiType));
            const match = desired
              ? states.find((s: string) => s.toLowerCase() === String(desired).toLowerCase())
              : undefined;
            if (!match) {
              const synonyms: Record<string, string[]> = {
                'To Do': ['New', 'Proposed', 'Approved'],
                Active: ['Committed'],
                'In Progress': ['Doing'],
                Review: ['Code Review', 'Testing', 'QA'],
                Resolved: ['Fixed'],
                Done: ['Closed', 'Completed'],
                Removed: ['Cut', 'Abandoned'],
              };
              const cand = Object.entries(synonyms).find(
                ([k]) => k.toLowerCase() === desired.toLowerCase()
              );
              if (cand) desired = cand[0];
            } else desired = match;
            if (!states.some((s: string) => s.toLowerCase() === desired.toLowerCase())) {
              throw new Error(`State '${desired}' not valid for type ${wiType}`);
            }
          } catch (stateErr: any) {
            verbose('State validation warning ' + (stateErr?.message || String(stateErr)));
          }
        }
        await client.updateWorkItem(id, [
          { op: 'add', path: '/fields/System.State', value: desired },
        ]);
        const postUpdateQuery = getQueryForProvider(provider, activeConnectionId);
        provider.refresh(postUpdateQuery);
        panel?.webview.postMessage({
          type: 'moveWorkItemResult',
          id,
          success: true,
          newState: desired,
        });
      } catch (e: any) {
        console.error('Failed to move work item', e);
        panel?.webview.postMessage({
          type: 'moveWorkItemResult',
          id,
          success: false,
          error: e?.message || String(e),
        });
      }
      break;
    }
    case 'viewWorkItem': {
      const id: number | undefined =
        typeof msg.workItemId === 'number' ? msg.workItemId : undefined;
      if (typeof id === 'number' && provider) {
        // Create work item URL for Azure DevOps
        const baseUrl = (provider as any).client?.getBrowserUrl?.('') || '';
        if (baseUrl) {
          const workItemUrl = `${baseUrl}/_workitems/edit/${id}`;
          vscode.env.openExternal(vscode.Uri.parse(workItemUrl));
        }
      }
      break;
    }
    case 'startTimer': {
      const id: number | undefined =
        typeof msg.workItemId === 'number'
          ? msg.workItemId
          : typeof msg.id === 'number'
            ? msg.id
            : undefined;
      if (typeof id !== 'number') break;

      const activeState = timer?.snapshot?.();
      if (activeState) {
        const runningConnectionLabel = getActiveTimerConnectionLabel();
        const message = runningConnectionLabel
          ? `A timer is already running for ${runningConnectionLabel}. Stop it before starting another.`
          : 'A timer is already running. Stop it before starting another.';
        vscode.window.showInformationMessage(message);
        break;
      }

      const wi: any = provider
        ?.getWorkItems()
        .find((w: any) => (w as any).id === id || w.fields?.['System.Id'] === id);
      if (!wi) break;

      const connection = activeConnectionId
        ? connections.find((c) => c.id === activeConnectionId)
        : undefined;
      const previousInfo = { ...timerConnectionInfo };
      setTimerConnectionFrom(connection);
      const started = timer?.start(
        Number(wi.id || wi.fields?.['System.Id']),
        wi.fields?.['System.Title'] || `#${id}`
      );
      if (!started) timerConnectionInfo = previousInfo;
    }
    case 'pauseTimer':
      timer?.pause();
      break;
    case 'resumeTimer':
      timer?.resume();
      break;
    case 'stopTimer': {
      const timerConnectionSnapshot: TimerConnectionInfo = { ...timerConnectionInfo };
      setTimerConnectionFrom(undefined);
      const stopped = timer?.stop();
      updateTimerContext(undefined);
      if (stopped) {
        try {
          await handleTimerStopAndOfferUpdate(stopped, { connection: timerConnectionSnapshot });
        } catch (e: any) {
          console.error('Error applying timer updates', e);
          vscode.window.showErrorMessage(
            'Failed to process timer update: ' + (e?.message || String(e))
          );
        }
      }
      break;
    }
    case 'showStopTimerOptions': {
      const timerConnectionSnapshot: TimerConnectionInfo = { ...timerConnectionInfo };
      setTimerConnectionFrom(undefined);
      const stopped = timer?.stop();
      updateTimerContext(undefined);
      if (stopped) {
        try {
          await handleTimerStopAndOfferUpdate(stopped, {
            offerCopilot: false,
            connection: timerConnectionSnapshot,
          });
        } catch (e: any) {
          console.error('Error applying timer updates', e);
          vscode.window.showErrorMessage(
            'Failed to process timer update: ' + (e?.message || String(e))
          );
        }
      }
      break;
    }
    case 'activity':
      verbose('Activity ping received');
      timer?.activityPing();
      break;
    case 'webviewConsole': {
      const lvl = msg.level || 'log';
      const text = `[webviewConsole][${lvl}] ${(msg.args || []).join(' ')}`;
      if (lvl === 'error') console.error(text);
      else if (lvl === 'warn') console.warn(text);
      else console.log(text);
      logLine(text);
      break;
    }
    case 'preImportDescriptor': {
      const text = `[preImportDescriptor] ${JSON.stringify(msg.snapshot)}`;
      console.log(text);
      logLine(text);
      break;
    }
    case 'generateCopilotPrompt': {
      const id: number | undefined =
        typeof msg.workItemId === 'number' ? msg.workItemId : undefined;
      // draftSummary (if provided) is available in msg.draftSummary but not required server-side
      if (!id) {
        vscode.window.showWarningMessage('No work item specified for Copilot prompt generation.');
        break;
      }
      const timerSnapshot = timer?.snapshot?.();
      try {
        await produceWorkItemSummary({
          workItemId: id,
          draftSummary: typeof msg.draftSummary === 'string' ? msg.draftSummary : undefined,
          entrySeed: entrySeedFromMessage(msg, id),
          reason: 'manualPrompt',
          stillRunningTimer:
            !!timerSnapshot &&
            Number(timerSnapshot.workItemId) === Number(id) &&
            !timerSnapshot.isPaused,
        });
      } catch (e: any) {
        console.error('Failed to create Copilot prompt', e);
        vscode.window.showErrorMessage(
          'Failed to generate Copilot prompt: ' + (e?.message || String(e))
        );
      }
      break;
    }
    case 'submitComposeComment': {
      const workItemId: number | undefined =
        typeof msg.workItemId === 'number' ? msg.workItemId : undefined;
      const comment: string = typeof msg.comment === 'string' ? msg.comment.trim() : '';
      const mode: string = typeof msg.mode === 'string' ? msg.mode : 'addComment';
      const timerData = msg.timerData; // Timer stop data if mode is 'timerStop'
      const connectionInfo = msg.connectionInfo; // Connection info for timer stops

      if (!workItemId) {
        vscode.window.showWarningMessage('No work item specified for comment.');
        sendToWebview({
          type: 'composeCommentResult',
          workItemId: 0,
          success: false,
          error: 'No work item specified',
        });
        break;
      }

      try {
        let targetClient = client;

        // For timer stops, use the timer's connection info
        if (mode === 'timerStop' && connectionInfo) {
          targetClient = getClientForConnectionInfo(connectionInfo);
        }

        if (!targetClient) {
          throw new Error('Client not initialized');
        }

        if (mode === 'timerStop' && timerData) {
          // Handle timer stop with time entry update
          const wi = await targetClient.getWorkItemById(workItemId);
          if (!wi) throw new Error('Work item not found');

          const currCompleted =
            Number(wi.fields?.['Microsoft.VSTS.Scheduling.CompletedWork'] || 0) || 0;
          const currRemaining =
            Number(wi.fields?.['Microsoft.VSTS.Scheduling.RemainingWork'] || 0) || 0;
          const hours = Number(timerData.hoursDecimal || timerData.duration / 3600 || 0);
          const finalCompleted = Number((currCompleted + hours).toFixed(2));
          const finalRemaining = Number(Math.max(0, currRemaining - hours).toFixed(2));

          const patch = [
            {
              op: 'add',
              path: '/fields/Microsoft.VSTS.Scheduling.CompletedWork',
              value: finalCompleted,
            },
            {
              op: 'add',
              path: '/fields/Microsoft.VSTS.Scheduling.RemainingWork',
              value: finalRemaining,
            },
          ];

          await targetClient.updateWorkItem(workItemId, patch);

          if (comment && comment.trim()) {
            await targetClient.addWorkItemComment(
              workItemId,
              `Time tracked: ${hours.toFixed(2)} hours. ${comment}`
            );
          }

          sendToWebview({
            type: 'composeCommentResult',
            workItemId,
            success: true,
            mode,
            hours: hours,
          });

          vscode.window.showInformationMessage(
            `Work item #${workItemId} updated: Completed ${finalCompleted}h, Remaining ${finalRemaining}h.`
          );
        } else {
          // Handle regular comment addition
          await targetClient.addWorkItemComment(workItemId, comment);

          sendToWebview({
            type: 'composeCommentResult',
            workItemId,
            success: true,
            mode,
          });

          vscode.window.showInformationMessage(`Comment added to work item #${workItemId}.`);
        }
      } catch (err: any) {
        console.error('Failed to submit compose comment', err);
        vscode.window.showErrorMessage(
          `Failed to ${mode === 'timerStop' ? 'apply timer update' : 'add comment'}: ` +
            (err?.message || String(err))
        );
        sendToWebview({
          type: 'composeCommentResult',
          workItemId,
          success: false,
          error: err?.message || String(err),
          mode,
        });
      }
      break;
    }
    case 'stopAndApply': {
      const comment = typeof msg.comment === 'string' ? msg.comment : '';
      const stopped = timer?.stop(async (finishedId: number, hoursDecimal: number) => {
        try {
          const wi = await client?.getWorkItemById(finishedId);
          if (!wi) return;
          const currCompleted =
            Number(wi.fields?.['Microsoft.VSTS.Scheduling.CompletedWork'] || 0) || 0;
          const currRemaining =
            Number(wi.fields?.['Microsoft.VSTS.Scheduling.RemainingWork'] || 0) || 0;
          const finalCompleted = Number((currCompleted + hoursDecimal).toFixed(2));
          const finalRemaining = Number(Math.max(0, currRemaining - hoursDecimal).toFixed(2));
          const patch = [
            {
              op: 'add',
              path: '/fields/Microsoft.VSTS.Scheduling.CompletedWork',
              value: finalCompleted,
            },
            {
              op: 'add',
              path: '/fields/Microsoft.VSTS.Scheduling.RemainingWork',
              value: finalRemaining,
            },
          ];
          if (!client) throw new Error('Client not initialized');
          await client.updateWorkItem(finishedId, patch);
          if (comment && comment.trim()) if (!client) throw new Error('Client not initialized');
          await client.addWorkItemComment(
            finishedId,
            `Time tracked: ${hoursDecimal.toFixed(2)} hours. ${comment}`
          );
          panel?.webview.postMessage({
            type: 'stopAndApplyResult',
            workItemId: finishedId,
            hours: hoursDecimal,
          });
          vscode.window.showInformationMessage(
            `Work item #${finishedId} updated: Completed ${finalCompleted}h, Remaining ${finalRemaining}h.`
          );
        } catch (err: any) {
          console.error('stopAndApply failed', err);
          vscode.window.showErrorMessage(
            'Failed to apply time entry: ' + (err?.message || String(err))
          );
        }
      });
      // If stop returned null (no active timer) inform user
      if (!stopped) vscode.window.showInformationMessage('No active timer to stop.');
      updateTimerContext(undefined);
      break;
    }
    case 'addComment': {
      const workItemId: number | undefined =
        typeof msg.workItemId === 'number' ? msg.workItemId : undefined;
      const comment: string | undefined =
        typeof msg.comment === 'string' ? msg.comment.trim() : undefined;

      if (!workItemId) {
        vscode.window.showWarningMessage('No work item specified for comment.');
        break;
      }

      // If comment is provided by webview (from compose dialog), add it directly
      if (comment && comment.length > 0) {
        try {
          if (!client) throw new Error('Client not initialized');
          await client.addWorkItemComment(workItemId, comment);
          vscode.window.showInformationMessage(`Comment added to work item #${workItemId}.`);
          sendToWebview({ type: 'addCommentResult', workItemId, success: true });
        } catch (err: any) {
          console.error('Failed to add comment', err);
          vscode.window.showErrorMessage('Failed to add comment: ' + (err?.message || String(err)));
          sendToWebview({
            type: 'addCommentResult',
            workItemId,
            success: false,
            error: err?.message || String(err),
          });
        }
        break;
      }

      // If no comment provided, show the compose dialog in webview
      sendToWebview({
        type: 'showComposeComment',
        workItemId,
        mode: 'addComment',
      });
      break;
    }
    case 'uiPreferenceChanged': {
      // Store UI preferences to global memento for cross-session persistence
      if (extensionContextRef && msg.preferences) {
        await extensionContextRef.globalState.update(
          'azureDevOpsIntegration.uiPreferences',
          msg.preferences
        );
      }
      break;
    }
    case 'ready': {
      console.log('✅ [webview->ext] Webview ready message received');
      // Send initial state to webview
      if (panel && activeConnectionId) {
        const currentQuery = getStoredQueryForConnection(activeConnectionId);
        console.log('📤 [webview->ext] Sending initial query to webview:', {
          connectionId: activeConnectionId,
          query: currentQuery,
        });
        sendToWebview({
          type: 'queryChanged',
          query: currentQuery,
          connectionId: activeConnectionId,
          description: `Initial query for connection ${activeConnectionId}`,
        });
      }
      break;
    }
    default:
      console.warn('Unknown webview message', msg);
      verbose('Unknown message type');
  }
}

async function selfTestWebview() {
  try {
    const attempt = async (): Promise<{ ok: boolean; details: string }> => {
      if (!panel) revealWorkItemsView();
      // wait briefly for panel to initialize if needed
      if (!panel) {
        await new Promise((r) => setTimeout(r, 250));
      }
      if (!panel) throw new Error('Webview panel not available');
      if (selfTestPending) throw new Error('A self-test is already running');
      const nonce = getNonce();
      const promise = new Promise<{ ok: boolean; details: string }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (selfTestPending) {
            selfTestPending = undefined;
            reject(new Error('Self-test timeout waiting for ack'));
          }
        }, 4000);
        selfTestPending = { nonce, resolve, reject, timeout };
      });
      // If webview already ready we can post immediately; else it will be posted on webviewReady branch.
      sendToWebview({ type: 'selfTestPing', nonce });
      return promise;
    };
    const result = await attempt();
    verbose('[selfTest] success', result.details);
  } catch (e: any) {
    verbose('[selfTest] failed', e?.message || e);
    vscode.window.showErrorMessage(`Webview self-test failed: ${e?.message || e}`);
  }
}

async function getSecretPAT(
  context: vscode.ExtensionContext,
  connectionId?: string
): Promise<string | undefined> {
  if (connectionId) {
    // Get connection-specific PAT
    const connection = connections.find((conn) => conn.id === connectionId);
    if (connection?.patKey) {
      return context.secrets.get(connection.patKey);
    }
  }

  // Fallback to global PAT for backward compatibility
  return undefined;
}

function persistTimer(
  context: vscode.ExtensionContext,
  data: {
    state?: any;
    timeEntries?: any[];
    updateLastSave?: boolean;
    defaultElapsedLimitHours?: number;
  }
) {
  if (data.updateLastSave) context.globalState.update(STATE_LAST_SAVE, Date.now());
  // Persist cap alongside state to ensure restored timers keep the same cap behavior
  const stateToPersist = data.state
    ? {
        ...(data.state as any),
        __defaultElapsedLimitHours: data.defaultElapsedLimitHours,
        __connectionId: timerConnectionInfo.id,
        __connectionLabel: timerConnectionInfo.label,
        __connectionOrganization: timerConnectionInfo.organization,
        __connectionProject: timerConnectionInfo.project,
      }
    : undefined;
  context.globalState.update(STATE_TIMER, stateToPersist);
  context.globalState.update(STATE_TIME_ENTRIES, data.timeEntries);
  context.globalState.update(
    STATE_TIMER_CONNECTION,
    timerConnectionInfo.id ? { ...timerConnectionInfo } : undefined
  );
}
function restoreTimer(context: vscode.ExtensionContext) {
  const persistedState = context.globalState.get<any>(STATE_TIMER);
  const persistedConnection = context.globalState.get<TimerConnectionInfo | undefined>(
    STATE_TIMER_CONNECTION
  );
  const embedded: TimerConnectionInfo = persistedState
    ? {
        id: persistedState.__connectionId,
        label: persistedState.__connectionLabel,
        organization: persistedState.__connectionOrganization,
        project: persistedState.__connectionProject,
      }
    : {};
  const restored: TimerConnectionInfo = {
    id: embedded.id ?? persistedConnection?.id,
    label: embedded.label ?? persistedConnection?.label,
    organization: embedded.organization ?? persistedConnection?.organization,
    project: embedded.project ?? persistedConnection?.project,
  };
  timerConnectionInfo =
    restored.id || restored.label || restored.organization || restored.project ? restored : {};
  if (persistedState) {
    delete persistedState.__connectionId;
    delete persistedState.__connectionLabel;
    delete persistedState.__connectionOrganization;
    delete persistedState.__connectionProject;
  }
  return {
    state: persistedState,
    timeEntries: context.globalState.get<any[]>(STATE_TIME_ENTRIES) || [],
    defaultElapsedLimitHours: persistedState?.__defaultElapsedLimitHours,
  } as any;
}

function buildMinimalWebviewHtml(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  nonce: string
): string {
  // Use Svelte UI exclusively - no more legacy fallback
  const htmlPath = path.join(context.extensionPath, 'media', 'webview', 'svelte.html');
  console.log('[azureDevOpsInt] 🔍 buildMinimalWebviewHtml: Starting HTML generation');
  console.log('[azureDevOpsInt] 🔍 Extension path:', context.extensionPath);
  console.log('[azureDevOpsInt] 🔍 Extension URI:', context.extensionUri.toString());
  console.log('[azureDevOpsInt] 🔍 HTML path:', htmlPath);
  console.log('[azureDevOpsInt] 🔍 Nonce:', nonce);

  let html: string;

  try {
    console.log('[azureDevOpsInt] 🔍 Attempting to read HTML file...');
    html = fs.readFileSync(htmlPath, 'utf8');
    console.log('[azureDevOpsInt] 🔍 Successfully read HTML file, length:', html.length);
    console.log(
      '[azureDevOpsInt] 🔍 HTML content preview (first 200 chars):',
      html.substring(0, 200)
    );
  } catch (error) {
    console.error('[azureDevOpsInt] 🔍 Failed to read HTML file:', error);
    console.error('[azureDevOpsInt] 🔍 HTML file path:', htmlPath);
    console.error('[azureDevOpsInt] 🔍 HTML file exists:', fs.existsSync(htmlPath));
    // Fallback to basic HTML if file read fails
    return `<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Failed to load webview</h1></body></html>`;
  }

  // Get media URIs for replacement
  const mediaRoot = vscode.Uri.joinPath(context.extensionUri, 'media', 'webview');
  const version = getExtensionVersion(context);
  // Load svelte-main.js exclusively
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, 'reactive-main.js'));
  // Append a cache-busting version query so VS Code doesn’t serve stale cached assets after upgrade
  const scriptUriWithVersion = scriptUri.with({ query: `v=${encodeURIComponent(version)}` });
  const scriptUriStr = scriptUriWithVersion.toString();
  console.log('[azureDevOpsInt] 🔍 Media root URI:', mediaRoot.toString());
  console.log('[azureDevOpsInt] 🔍 Extension version:', version);
  console.log('[azureDevOpsInt] 🔍 Script URI (before version):', scriptUri.toString());
  console.log('[azureDevOpsInt] 🔍 Script URI (with version):', scriptUriStr);

  // Check if the script file exists
  const scriptFsPath = path.join(context.extensionPath, 'media', 'webview', 'reactive-main.js');
  console.log('[azureDevOpsInt] 🔍 Script file path:', scriptFsPath);
  console.log('[azureDevOpsInt] 🔍 Script file exists:', fs.existsSync(scriptFsPath));

  // Include the extracted CSS bundle
  let cssLinkTag = '';
  try {
    const cssFsPath = path.join(context.extensionPath, 'media', 'webview', 'reactive-main.css');
    console.log('[azureDevOpsInt] 🔍 CSS file path:', cssFsPath);
    console.log('[azureDevOpsInt] 🔍 CSS file exists:', fs.existsSync(cssFsPath));

    if (fs.existsSync(cssFsPath)) {
      const cssUri = webview
        .asWebviewUri(vscode.Uri.joinPath(mediaRoot, 'reactive-main.css'))
        .with({ query: `v=${encodeURIComponent(version)}` })
        .toString();
      cssLinkTag = `<link rel="stylesheet" href="${cssUri}" />`;
      console.log('[azureDevOpsInt] 🔍 CSS link tag:', cssLinkTag);
    } else {
      console.log('[azureDevOpsInt] 🔍 CSS file not found, skipping CSS injection');
    }
  } catch (cssError) {
    console.error('[azureDevOpsInt] 🔍 CSS injection error:', cssError);
    // ignore css injection errors; webview will still work but unstyled
  }

  // Update CSP and script nonces
  const csp = `default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource}`;
  console.log('[azureDevOpsInt] 🔍 CSP:', csp);

  const consoleBridge = `(function(){try{var vs=window.vscode||acquireVsCodeApi();['log','warn','error'].forEach(function(m){var orig=console[m];console[m]=function(){try{vs.postMessage({type:'webviewConsole', level:m, args:Array.from(arguments).map(a=>{try{return a&&a.stack?String(a.stack):typeof a==='object'?JSON.stringify(a):String(a);}catch{return String(a);}})});}catch{};return orig.apply(console,arguments);};});console.log('[webview] Azure DevOps Integration v${version}');}catch(e){/* ignore */}})();`;

  console.log('[azureDevOpsInt] 🔍 Starting HTML transformations...');

  // Replace placeholders in the static HTML
  const originalHtml = html;
  html = html.replace(
    '<meta charset="UTF-8">',
    `<meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="${csp}">`
  );
  console.log('[azureDevOpsInt] 🔍 CSP replacement done, changed:', originalHtml !== html);

  // Replace script source with the correct reactive-main.js file
  const beforeScriptReplace = html;
  html = html.replace('./reactive-main.js', scriptUriStr);
  console.log(
    '[azureDevOpsInt] 🔍 Script source replacement done, changed:',
    beforeScriptReplace !== html
  );

  // Inject CSS link just before </head> if available
  if (cssLinkTag) {
    const beforeCssReplace = html;
    html = html.replace('</head>', `${cssLinkTag}\n</head>`);
    console.log('[azureDevOpsInt] 🔍 CSS injection done, changed:', beforeCssReplace !== html);
  }

  const beforeFinalReplace = html;
  // Replace the final script tag with proper nonce and VS Code API setup
  html = html.replace(
    '<script type="module" crossorigin src="./reactive-main.js"></script>',
    `<script nonce="${nonce}">(function(){try{if(!window.vscode){window.vscode=acquireVsCodeApi();}}catch(e){console.error('[webview] acquireVsCodeApi failed',e);}})();</script>` +
      `<script nonce="${nonce}">${consoleBridge}</script>` +
      `<script type="module" nonce="${nonce}" src="${scriptUriStr}"></script>`
  );

  console.log(
    '[azureDevOpsInt] 🔍 Final script replacement done, changed:',
    beforeFinalReplace !== html
  );

  console.log('[azureDevOpsInt] 🔍 Final HTML length:', html.length);
  console.log(
    '[azureDevOpsInt] 🔍 Final HTML preview (last 200 chars):',
    html.substring(html.length - 200)
  );

  return html;
}

function getNonce() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let v = '';
  for (let i = 0; i < 16; i++) v += chars.charAt(Math.floor(Math.random() * chars.length));
  return v;
}

// ---------------- Additional Helper Logic ----------------

async function setupConnection(context: vscode.ExtensionContext) {
  await ensureConnectionsInitialized(context);
  await migrateLegacyPAT(context);

  const hasExistingConnections = connections.length > 0;
  let action: SetupAction | undefined;

  if (!hasExistingConnections) {
    action = 'add';
  } else {
    const canSwitch = connections.length > 1;
    const hasPatConnections = connections.some(
      (connection) => !connection.authMethod || connection.authMethod === 'pat'
    );
    const hasEntraConnections = connections.some((connection) => connection.authMethod === 'entra');

    const quickPickItems: Array<vscode.QuickPickItem & { action: SetupAction }> = [];

    // Main project management options
    quickPickItems.push(
      {
        label: 'Add new project…',
        description: 'Connect to another organization/project',
        action: 'add',
      },
      {
        label: 'Manage existing project…',
        description: 'Edit, replace, or remove an existing project',
        action: 'manage',
      },
      {
        label: 'Remove project…',
        description: 'Disconnect an existing project',
        action: 'remove',
      }
    );

    if (canSwitch) {
      quickPickItems.push({
        label: 'Switch active project…',
        description: 'Choose which project the sidebar uses by default',
        action: 'switch',
      });
    }

    // Authentication options
    quickPickItems.push({
      label: 'Sign in with Microsoft Entra ID…',
      description: 'Authenticate a connection using Entra ID',
      action: 'entraSignIn',
    });

    if (hasEntraConnections) {
      quickPickItems.push({
        label: 'Sign out from Microsoft Entra ID…',
        description: 'Remove cached tokens for an Entra-enabled connection',
        action: 'entraSignOut',
      });
    }

    if (hasPatConnections) {
      quickPickItems.push({
        label: 'Convert a PAT connection to Entra ID…',
        description: 'Upgrade authentication for an existing PAT project',
        action: 'convertToEntra',
      });
    }

    const pick = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: 'Manage Azure DevOps projects',
      ignoreFocusOut: true,
    });
    action = pick?.action;
  }

  if (!action) {
    return;
  }

  if (action === 'add') {
    // Use the FSM-based setup service for connection setup
    const setupService = new FSMSetupService(context);
    const result = await setupService.startSetup();

    if (result.status === 'success') {
      // Reload connections after successful setup
      await ensureConnectionsInitialized(context);
      ensureTimer(context);

      // If a connection was added, set it as active
      if (result.connectionId) {
        const newConnection = connections.find((c) => c.id === result.connectionId);
        if (newConnection) {
          activeConnectionId = result.connectionId;
          await context.globalState.update(ACTIVE_CONNECTION_STATE_KEY, activeConnectionId);
          vscode.window.showInformationMessage(
            `Connection "${newConnection.label || `${newConnection.organization}/${newConnection.project}`}" added and activated successfully.`
          );
        }
      }
    }
  } else if (action === 'manage') {
    // Use the FSM-based setup service to manage existing connections
    const setupService = new FSMSetupService(context);
    const result = await setupService.startSetup({ skipInitialChoice: true });

    if (result.status === 'success') {
      // Reload connections after successful management
      await ensureConnectionsInitialized(context);
      ensureTimer(context);

      // If a connection was modified, show success message
      if (result.connectionId) {
        const updatedConnection = connections.find((c) => c.id === result.connectionId);
        if (updatedConnection) {
          vscode.window.showInformationMessage(
            `Project "${updatedConnection.label || `${updatedConnection.organization}/${updatedConnection.project}`}" updated successfully.`
          );
        }
      }
    }
  } else if (action === 'remove') {
    const removed = await promptRemoveConnection(context);
    if (removed) {
      ensureTimer(context);
    }
  } else if (action === 'switch') {
    const switched = await promptSwitchActiveConnection(context);
    if (switched) {
      ensureTimer(context);
    }
  } else if (action === 'entraSignIn') {
    await signInWithEntra(context);
  } else if (action === 'entraSignOut') {
    await signOutEntra(context);
  } else if (action === 'convertToEntra') {
    await convertConnectionToEntra(context);
  }
}

/**
 * Sign in to an existing connection using Microsoft Entra ID
 */
async function signInWithEntra(
  context: vscode.ExtensionContext,
  targetConnectionId?: string,
  options: { showSuccessMessage?: boolean; forceInteractive?: boolean } = {}
): Promise<void> {
  await ensureConnectionsInitialized(context);

  if (connections.length === 0) {
    vscode.window.showInformationMessage(
      'No connections configured. Please add a connection first.'
    );
    return;
  }

  let connection: ProjectConnection | undefined;
  if (targetConnectionId) {
    connection = connections.find((conn) => conn.id === targetConnectionId);
    if (!connection) {
      vscode.window.showWarningMessage('Selected connection is no longer available.');
      return undefined;
    }
  } else {
    // Let user pick a connection
    const entraEligible = connections.filter((conn) => conn.authMethod === 'entra');

    if (entraEligible.length === 0) {
      vscode.window.showInformationMessage(
        'No connections configured for Microsoft Entra ID. Convert or add a connection first.'
      );
      return;
    }

    if (entraEligible.length === 1) {
      connection = entraEligible[0];
    } else {
      const connectionItems = entraEligible.map((conn) => ({
        label: conn.label || `${conn.organization}/${conn.project}`,
        description: conn.authMethod === 'entra' ? '(Entra ID)' : '(PAT)',
        detail: `Organization: ${conn.organization}, Project: ${conn.project}`,
        connection: conn,
      }));

      const selected = await vscode.window.showQuickPick(connectionItems, {
        placeHolder: 'Select a connection to sign in with Microsoft Entra ID',
        ignoreFocusOut: true,
      });

      if (!selected) {
        return undefined;
      }

      connection = selected.connection;
    }
  }

  if (!connection) {
    return;
  }

  const connectionLabel = describeConnection(connection);

  // Show immediate feedback
  const statusMsg = vscode.window.setStatusBarMessage(
    `🔐 Starting Entra ID authentication...`,
    5000
  );

  // Use FSM-based Entra ID authentication
  try {
    console.log(
      `🔐 [signInWithEntra] Starting FSM-based Entra authentication for ${connection.id}`
    );

    const { getConnectionFSMManager } = await import('./fsm/ConnectionFSMManager.js');
    const fsmManager = getConnectionFSMManager();

    // Enable FSM for authentication
    fsmManager.setEnabled(true);

    // Ensure connection has Entra auth method
    const connectionState = connectionStates.get(connection.id);
    if (connectionState) {
      connectionState.authMethod = 'entra';
    }

    // Update connection config to ensure it has Entra auth method
    const updatedConnection = {
      ...connection,
      authMethod: 'entra' as const,
    };

    // Use FSM to authenticate with Entra ID
    const result = await fsmManager.connectToConnection(updatedConnection, {
      refresh: true,
      interactive: options.forceInteractive || true,
    });

    if (result.success) {
      statusMsg.dispose(); // Clear the status message
      console.log(`✅ [signInWithEntra] Entra authentication successful for ${connection.id}`);
      if (options.showSuccessMessage) {
        vscode.window.showInformationMessage(
          `Successfully signed in to ${connectionLabel} with Microsoft Entra ID.`
        );
      }
    } else {
      statusMsg.dispose(); // Clear the status message
      throw new Error(result.error || 'Entra authentication failed');
    }
  } catch (error) {
    statusMsg.dispose(); // Clear the status message
    console.error(`❌ [signInWithEntra] Failed to authenticate with Entra ID:`, error);
    vscode.window.showErrorMessage(
      `Failed to sign in to ${connectionLabel} with Microsoft Entra ID: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Sign out from Entra ID for a connection
 */
async function signOutEntra(
  context: vscode.ExtensionContext,
  targetConnectionId?: string,
  options: { showSuccessMessage?: boolean } = {}
): Promise<void> {
  await ensureConnectionsInitialized(context);

  const entraConnections = connections.filter((conn) => conn.authMethod === 'entra');
  if (entraConnections.length === 0) {
    vscode.window.showInformationMessage('No Entra ID connections found.');
    return;
  }

  let connection: ProjectConnection | undefined;
  if (targetConnectionId) {
    connection = entraConnections.find((conn) => conn.id === targetConnectionId);
    if (!connection) {
      vscode.window.showWarningMessage('Selected connection is no longer available.');
      return;
    }
  } else {
    const connectionItems = entraConnections.map((conn) => ({
      label: conn.label || `${conn.organization}/${conn.project}`,
      description: '(Entra ID)',
      detail: `Organization: ${conn.organization}, Project: ${conn.project}`,
      connection: conn,
    }));

    const selected = await vscode.window.showQuickPick(connectionItems, {
      placeHolder: 'Select a connection to sign out from',
      ignoreFocusOut: true,
    });

    if (!selected) {
      return;
    }

    connection = selected.connection;
  }

  if (!connection) {
    return;
  }
  const state = connectionStates.get(connection.id);

  try {
    // Clear tokens from secrets
    await context.secrets.delete(`entra_refresh_token_${connection.id}`);
    await context.secrets.delete(`entra_access_token_${connection.id}`);

    // Clear auth service from state
    if (state) {
      // LEGACY AUTH REMOVED - authService cleanup no longer needed
      state.accessToken = undefined;
    }

    if (options.showSuccessMessage !== false) {
      vscode.window.showInformationMessage(
        `Successfully signed out from "${connection.label || connection.organization}".`
      );
    }

    clearAuthReminder(connection.id);

    // If this was the active connection, clear it
    if (connection.id === activeConnectionId) {
      provider = undefined;
      client = undefined;
      await vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', false);
    }

    // LEGACY AUTH REMOVED - FSM authentication needed
  } catch (error: any) {
    console.error('[azureDevOpsInt] Sign out failed:', error);
    vscode.window.showErrorMessage(`Sign out failed: ${error.message}`);
  }
}

/**
 * Convert an existing PAT-based connection to use Entra ID
 */
async function convertConnectionToEntra(context: vscode.ExtensionContext): Promise<void> {
  await ensureConnectionsInitialized(context);

  const patConnections = connections.filter(
    (conn) => !conn.authMethod || conn.authMethod === 'pat'
  );
  if (patConnections.length === 0) {
    vscode.window.showInformationMessage('No PAT-based connections to convert.');
    return;
  }

  const connectionItems = patConnections.map((conn) => ({
    label: conn.label || `${conn.organization}/${conn.project}`,
    description: '(PAT)',
    detail: `Organization: ${conn.organization}, Project: ${conn.project}`,
    connection: conn,
  }));

  const selected = await vscode.window.showQuickPick(connectionItems, {
    placeHolder: 'Select a connection to convert to Entra ID',
    ignoreFocusOut: true,
  });

  if (!selected) {
    return;
  }

  const connection = selected.connection;

  // Confirm conversion
  const confirm = await vscode.window.showWarningMessage(
    `This will convert "${connection.label || connection.organization}" to use Microsoft Entra ID authentication instead of a Personal Access Token. The PAT will be removed. Continue?`,
    'Yes, Convert',
    'Cancel'
  );

  if (confirm !== 'Yes, Convert') {
    return;
  }

  const settings = getConfig();
  const defaultClientId =
    settings.get<string>('entra.defaultClientId') || '872cd9fa-d31f-45e0-9eab-6e460a02d1f1';
  const defaultTenantId = settings.get<string>('entra.defaultTenantId') || 'organizations';

  // LEGACY AUTH REMOVED - FSM authentication needed
  vscode.window.showInformationMessage(
    `Entra ID authentication conversion is not yet implemented in the FSM architecture. Please use PAT authentication for now.`
  );
  console.log(
    '[azureDevOpsInt] Entra ID conversion requested but not yet implemented in FSM architecture'
  );
  return;

  // Function implementation removed - not needed since we return early above
}

async function promptSwitchActiveConnection(context: vscode.ExtensionContext): Promise<boolean> {
  await ensureConnectionsInitialized(context);

  if (connections.length === 0) {
    vscode.window.showInformationMessage('No project connections configured yet.');
    return false;
  }

  if (connections.length === 1) {
    vscode.window.showInformationMessage(
      `Only ${getConnectionLabel(connections[0])} is configured. Add another project to switch.`
    );
    return false;
  }

  const items: Array<vscode.QuickPickItem & { connection: ProjectConnection }> = connections.map(
    (connection) => {
      const description = connection.team
        ? `${connection.organization}/${connection.project} • ${connection.team}`
        : `${connection.organization}/${connection.project}`;
      const labelBase = getConnectionLabel(connection);
      const label = connection.id === activeConnectionId ? `$(check) ${labelBase}` : labelBase;
      const detail =
        connection.authMethod === 'entra' ? 'Microsoft Entra ID' : 'Personal Access Token';
      return {
        label,
        description,
        detail,
        connection,
      };
    }
  );

  const pick = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select the connection to make active',
    ignoreFocusOut: true,
  });

  if (!pick) {
    return false;
  }

  if (pick.connection.id === activeConnectionId) {
    vscode.window.showInformationMessage(
      `${getConnectionLabel(pick.connection)} is already the active connection.`
    );
    return false;
  }

  await ensureActiveConnection(context, pick.connection.id, { refresh: true });
  await updateAuthStatusBar();

  vscode.window.showInformationMessage(
    `Switched active project to ${getConnectionLabel(pick.connection)}.`
  );
  return true;
}

/**
 * Legacy add connection function - DEPRECATED
 * This function is kept for reference but is no longer used.
 * Use FSM-based setup instead, which supports both PAT and Entra ID authentication.
 */
async function _promptAddConnection_DEPRECATED(context: vscode.ExtensionContext): Promise<boolean> {
  const _existingPat = await getSecretPAT(context);

  const lastConnection = connections[connections.length - 1];
  // Offer the user a chance to paste a work item URL first so we can auto-detect org/project/baseUrl
  const urlOrManual = await vscode.window.showQuickPick(
    [
      {
        label: 'Provide a work item URL',
        description: 'Paste a URL to auto-detect organization and project',
        value: 'url',
      },
      {
        label: 'Enter organization & project manually',
        description: 'Type org and project names',
        value: 'manual',
      },
      { label: 'Cancel', description: '', value: 'cancel' },
    ],
    { placeHolder: 'How would you like to add the project connection?', ignoreFocusOut: true }
  );
  if (!urlOrManual || urlOrManual.value === 'cancel') return false;

  let org: string | undefined = undefined;
  let project: string | undefined = undefined;
  let detectedBaseUrl: string | undefined = undefined;
  let detectedApiBaseUrl: string | undefined = undefined;
  let urlInput: string | undefined = undefined;
  let isOnPremManual = false;

  if (urlOrManual.value === 'url') {
    urlInput = await vscode.window.showInputBox({
      prompt: 'Enter a work item URL from your Azure DevOps instance',
      placeHolder: 'https://dev.azure.com/yourorg/yourproject/_workitems/edit/12345',
      validateInput: (value) => {
        if (!value || !value.trim()) return 'Please enter a work item URL or Cancel';
        if (!isAzureDevOpsWorkItemUrl(value))
          return 'Please enter a valid Azure DevOps work item URL';
        return null;
      },
      ignoreFocusOut: true,
    });
    if (!urlInput) return false;
    try {
      const parsed = parseAzureDevOpsUrl(urlInput);
      if (!parsed.isValid) {
        vscode.window.showWarningMessage(`Could not parse URL: ${parsed.error}`);
      } else {
        org = parsed.organization;
        project = parsed.project;
        detectedBaseUrl = parsed.baseUrl;
        detectedApiBaseUrl = parsed.apiBaseUrl;
      }
    } catch (e) {
      // Fall back to manual entry below
      console.warn('[promptAddConnection] URL parse failed', e);
    }
  } else if (urlOrManual.value === 'manual') {
    // Manual entry - ask for instance type first
    const instanceType = await vscode.window.showQuickPick(
      [
        {
          label: 'Azure DevOps (Cloud)',
          description: 'dev.azure.com or visualstudio.com',
          value: 'cloud',
        },
        {
          label: 'Azure DevOps Server (On-Premises/TFS)',
          description: 'Self-hosted server',
          value: 'onprem',
        },
      ],
      { placeHolder: 'Select instance type', ignoreFocusOut: true }
    );

    if (!instanceType) return false;

    if (instanceType.value === 'onprem') {
      isOnPremManual = true;

      // On-prem manual flow: server URL + collection + project
      const serverUrl = await vscode.window.showInputBox({
        prompt: 'Server URL (e.g., https://tfs.contoso.com or https://azuredevops.contoso.com)',
        placeHolder: 'https://tfs.contoso.com',
        validateInput: (value) => {
          if (!value || !value.trim()) return 'Server URL is required';
          if (!value.startsWith('http://') && !value.startsWith('https://')) {
            return 'URL must start with http:// or https://';
          }
          return null;
        },
        ignoreFocusOut: true,
      });
      if (!serverUrl) return false;

      const collection = await vscode.window.showInputBox({
        prompt: 'Collection name (e.g., DefaultCollection)',
        placeHolder: 'DefaultCollection',
        validateInput: (value) => {
          if (!value || !value.trim()) return 'Collection name is required';
          return null;
        },
        ignoreFocusOut: true,
      });
      if (!collection) return false;

      project = await vscode.window.showInputBox({
        prompt: 'Project name',
        validateInput: (value) => {
          if (!value || !value.trim()) return 'Project name is required';
          return null;
        },
        ignoreFocusOut: true,
      });
      if (!project) return false;

      // For on-prem, organization is typically the collection name
      org = collection;
      detectedBaseUrl = `${serverUrl.replace(/\/$/, '')}/${collection}`;
      detectedApiBaseUrl = `${detectedBaseUrl}/${project}/_apis`;

      console.log('[promptAddConnection] On-prem manual configuration:', {
        serverUrl,
        collection,
        project,
        baseUrl: detectedBaseUrl,
        apiBaseUrl: detectedApiBaseUrl,
      });
    } else {
      // Cloud manual flow
      org = await vscode.window.showInputBox({
        prompt: 'Azure DevOps organization (short name)',
        value: lastConnection?.organization ?? '',
        ignoreFocusOut: true,
      });
      if (!org) return false;

      project = await vscode.window.showInputBox({
        prompt: 'Azure DevOps project name',
        value: lastConnection?.project ?? '',
        ignoreFocusOut: true,
      });
      if (!project) return false;
    }
  }

  if (!org || !project) {
    vscode.window.showErrorMessage('Organization and project are required');
    return false;
  }

  // If we detected a baseUrl from a pasted work item URL or manual on-prem setup, use that.
  // Otherwise ask for cloud instance type.
  let baseUrl: string | undefined = detectedBaseUrl;
  const apiBaseUrl: string | undefined = detectedApiBaseUrl;

  if (!baseUrl && !isOnPremManual) {
    const baseUrlChoice = await vscode.window.showQuickPick(
      [
        {
          label: 'dev.azure.com',
          description: 'https://dev.azure.com/{org}',
          value: 'dev.azure.com',
        },
        {
          label: 'visualstudio.com',
          description: 'https://{org}.visualstudio.com',
          value: 'visualstudio.com',
        },
        { label: 'Custom', description: 'Enter custom base URL', value: 'custom' },
      ],
      {
        placeHolder: 'Select your Azure DevOps instance type',
        ignoreFocusOut: true,
      }
    );

    if (!baseUrlChoice) return false;

    if (baseUrlChoice.value === 'custom') {
      const customBaseUrl = await vscode.window.showInputBox({
        prompt: 'Enter your custom base URL',
        placeHolder: 'https://your-instance.visualstudio.com',
        validateInput: (value) => {
          if (!value || !value.trim()) {
            return 'Base URL is required';
          }
          if (!value.startsWith('http://') && !value.startsWith('https://')) {
            return 'Base URL must start with http:// or https://';
          }
          return null;
        },
        ignoreFocusOut: true,
      });
      if (!customBaseUrl) return false;
      baseUrl = customBaseUrl.trim();
    } else if (baseUrlChoice.value === 'dev.azure.com') {
      baseUrl = `https://dev.azure.com/${org}`;
    } else {
      baseUrl = `https://${org}.visualstudio.com`;
    }
  }

  const label = await vscode.window.showInputBox({
    prompt: 'Display label for this connection (optional)',
    placeHolder: 'e.g. Contoso – Sprint Board',
    ignoreFocusOut: true,
  });

  const team = await vscode.window.showInputBox({
    prompt: 'Default team name (optional)',
    placeHolder: 'Leave blank to use extension setting',
    ignoreFocusOut: true,
  });

  // Create the connection object first so we have an ID for the PAT key
  const newConnection: ProjectConnection = {
    id: randomUUID(),
    organization: org.trim(),
    project: project.trim(),
    label: label?.trim() ? label.trim() : undefined,
    team: team?.trim() ? team.trim() : undefined,
    baseUrl: baseUrl?.toString(),
    apiBaseUrl: apiBaseUrl?.toString(), // Store manual API URL override if provided
  };

  // If this looks like an on-prem Azure DevOps Server (custom base URL not dev.azure.com/visualstudio.com),
  // ask the user for their identity name which we can use for @Me substitution when the server does not
  // resolve @Me properly. Only prompt for PAT connections where identity matters.
  try {
    const lowerBase = (baseUrl || '').toLowerCase();
    const isOnPrem =
      lowerBase && !lowerBase.includes('dev.azure.com') && !lowerBase.includes('visualstudio.com');
    if (isOnPrem) {
      const identityPrompt = await vscode.window.showInputBox({
        prompt:
          'Optional: Enter the username/email that your Azure DevOps Server uses for AssignedTo/CreatedBy (leave blank to skip)',
        placeHolder: 'e.g. domain\\username or user@contoso.com',
        ignoreFocusOut: true,
      });
      if (identityPrompt && identityPrompt.trim()) {
        newConnection.identityName = identityPrompt.trim();
      }
    }
  } catch {
    /* ignore prompt failures */
  }

  // Always prompt for a PAT for PAT-authenticated connections. Store the PAT
  // under a connection-specific secret key so credentials are never global.
  const entered = await vscode.window.showInputBox({
    prompt: 'Personal Access Token (scopes: Work Items Read/Write)',
    password: true,
    ignoreFocusOut: true,
  });
  if (!entered || !entered.trim()) {
    vscode.window.showWarningMessage('A Personal Access Token is required to complete setup.');
    return false;
  }
  const pat = entered.trim();

  // For on-prem connections, validate and potentially correct the URL structure
  const lowerBase = (baseUrl || '').toLowerCase();
  const isOnPrem =
    lowerBase && !lowerBase.includes('dev.azure.com') && !lowerBase.includes('visualstudio.com');

  if (isOnPrem && detectedBaseUrl) {
    verbose('[promptAddConnection] Validating on-prem URL structure with provided PAT');

    try {
      const { parseAndValidateOnPremUrl } = await import('./onPremUrlValidator.js');
      const originalUrl = urlInput || `${baseUrl}/${org}/${project}`;

      const validated = await parseAndValidateOnPremUrl(originalUrl, pat);

      if (validated.validated) {
        verbose('[promptAddConnection] URL structure validated successfully:', {
          organization: validated.organization,
          project: validated.project,
          baseUrl: validated.baseUrl,
          apiBaseUrl: validated.apiBaseUrl,
        });

        // Update connection with validated values
        newConnection.organization = validated.organization;
        newConnection.project = validated.project;
        newConnection.baseUrl = validated.baseUrl;

        vscode.window.showInformationMessage(
          `✅ Connection validated: ${validated.organization}/${validated.project}`
        );
      } else {
        verbose('[promptAddConnection] Could not validate URL structure, using parsed values');
        vscode.window.showWarningMessage(
          `Could not validate connection structure. Using: ${org}/${project}. If queries fail, you may need to recreate the connection.`
        );
      }
    } catch (error) {
      console.error('[promptAddConnection] URL validation failed:', error);
      // Continue with parsed values if validation fails
    }
  }

  // Generate a per-connection secret key and store the PAT there. We set
  // the patKey on the connection so the runtime can rehydrate the credential.
  const connPatKey = `azureDevOpsInt.pat.${newConnection.id}`;
  try {
    await context.secrets.store(connPatKey, pat);
    newConnection.patKey = connPatKey;
  } catch (e) {
    console.error('[azureDevOpsInt] Failed to store PAT for connection', e);
    vscode.window.showErrorMessage('Failed to save PAT for the new connection. Setup aborted.');
    return false;
  }

  const nextConnections = [...connections, newConnection];
  await saveConnectionsToConfig(context, nextConnections);
  await ensureActiveConnection(context, newConnection.id, { refresh: true });
  vscode.window.showInformationMessage(
    `Connected to ${getConnectionLabel(newConnection)}. The webview will refresh with the new project.`
  );
  return true;
}

async function promptRemoveConnection(context: vscode.ExtensionContext): Promise<boolean> {
  if (connections.length === 0) {
    vscode.window.showInformationMessage('There are no saved connections to remove.');
    return false;
  }

  const items: Array<vscode.QuickPickItem & { connection: ProjectConnection }> = connections.map(
    (connection) => {
      const description = connection.team
        ? `${connection.organization}/${connection.project} • ${connection.team}`
        : `${connection.organization}/${connection.project}`;
      return {
        label: getConnectionLabel(connection),
        description,
        connection,
      };
    }
  );

  const pick = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a project connection to remove',
    ignoreFocusOut: true,
  });
  if (!pick) return false;

  const confirm = await vscode.window.showWarningMessage(
    `Remove connection ${pick.label}?`,
    { modal: true },
    'Remove'
  );
  if (confirm !== 'Remove') return false;

  const currentActive = activeConnectionId;
  const remaining = connections.filter((connection) => connection.id !== pick.connection.id);
  await saveConnectionsToConfig(context, remaining);

  const nextActiveId = pick.connection.id === currentActive ? remaining[0]?.id : currentActive;
  await ensureActiveConnection(context, nextActiveId, { refresh: true });

  if (remaining.length === 0) {
    vscode.window.showInformationMessage(
      'Removed last connection. Run Azure DevOps: Setup Connection to add another project.'
    );
  } else {
    vscode.window.showInformationMessage(`Removed connection ${pick.label}.`);
  }
  return true;
}

async function silentInit(context: vscode.ExtensionContext) {
  if (IS_SMOKE) return; // Skip heavy init during smoke tests
  await migrateLegacyPAT(context);
  await ensureConnectionsInitialized(context);
  verbose('[silentInit] initialized connections', {
    connectionCount: connections.length,
    activeConnectionId,
  });
  const state = await ensureActiveConnection(context, activeConnectionId, { refresh: false });
  verbose('[silentInit] ensureActiveConnection returned', {
    hasState: !!state,
    stateId: state?.id,
    hasProvider: !!state?.provider,
  });
  ensureTimer(context);

  if (panel && state?.provider) {
    const cfg = getConfig();
    const selectedQuery = getStoredQueryForConnection(state.id, getDefaultQuery(cfg));
    if (!initialRefreshedConnections.has(state.id)) {
      initialRefreshedConnections.add(state.id);
    }
    verbose('[silentInit] panel present, refreshing provider', {
      id: state.id,
      query: selectedQuery,
    });
    state.provider.refresh(selectedQuery);
  }
}

async function migrateLegacyPAT(context: vscode.ExtensionContext) {
  const NEW_KEY = PAT_KEY;
  const legacySecretKeys = [
    'azureDevOps.pat',
    'azureDevOpsIntegration.pat',
    'azureDevOpsIntegration.personalAccessToken',
  ];
  const legacyGlobalKeys = [
    NEW_KEY,
    'azureDevOpsIntegration.personalAccessToken',
    'azureDevOpsIntegration.pat',
  ];

  let stored = String((await context.secrets.get(NEW_KEY)) || '').trim();

  const storeIfMissing = async (
    candidate: string | undefined,
    source: string,
    cleanup?: () => Promise<void>
  ) => {
    if (stored) return;
    const value = String(candidate || '').trim();
    if (!value) return;
    try {
      await context.secrets.store(NEW_KEY, value);
      stored = value;
      if (cleanup) {
        try {
          await cleanup();
        } catch {
          /* ignore cleanup failure */
        }
      }
      console.log(`[azureDevOpsInt] Migrated PAT (${source})`);
    } catch (e) {
      console.error(`Failed migrating PAT (${source})`, e);
    }
  };

  for (const key of legacyGlobalKeys) {
    const value = context.globalState.get<string>(key);
    await storeIfMissing(value, `globalState ${key}`, async () => {
      if (key) await context.globalState.update(key, undefined);
    });
  }

  for (const key of legacySecretKeys) {
    const value = await context.secrets.get(key);
    await storeIfMissing(value || undefined, `secret ${key}`, async () => {
      if (key !== NEW_KEY) await context.secrets.delete(key);
    });
  }

  try {
    const cfg = getConfig();
    const configKeys = ['personalAccessToken', 'pat'];
    for (const key of configKeys) {
      const value = cfg.get<string>(key);
      await storeIfMissing(value, `settings ${key}`, async () => {
        await cfg.update(key, '', vscode.ConfigurationTarget.Global);
      });
    }
  } catch (e) {
    console.warn('[azureDevOpsInt] migrate PAT from settings failed', e);
  }
}

function revealWorkItemsView() {
  if (IS_SMOKE) {
    // Do not attempt to reveal the view during smoke/integration tests
    verbose('Skipping revealWorkItemsView in smoke mode');
    return;
  }
  // Show our custom Activity Bar container. Since it's the only view in the container,
  // revealing the container is sufficient and avoids potential focus race conditions.
  vscode.commands.executeCommand('workbench.view.extension.azureDevOpsIntegration').then(
    () => {},
    () => {}
  );
  // Also explicitly focus the view to force creation/resolve if VS Code didn't materialize it yet.
  // VS Code generates a '<viewId>.focus' command for contributed views.
  setTimeout(() => {
    try {
      vscode.commands.executeCommand('azureDevOpsWorkItems.focus').then(
        () => {},
        () => {}
      );
      verbose('Focused Work Items view');
    } catch {
      // ignore focus error
    }
  }, 0);
  verbose('Revealed Azure DevOps container');
}

async function quickCreateWorkItem() {
  if (!client || !provider) {
    vscode.window.showWarningMessage(
      'Connect to Azure DevOps first (Azure DevOps: Setup Connection).'
    );
    return;
  }

  const cfg = getConfig();
  const defaultType: string = cfg.get('defaultWorkItemType') || 'Task';
  const typeOptions =
    typeof (provider as any).getWorkItemTypeOptions === 'function'
      ? ((provider as any).getWorkItemTypeOptions() as string[])
      : [];
  let chosenType = defaultType;
  if (Array.isArray(typeOptions) && typeOptions.length > 0) {
    const quickPickType = await vscode.window.showQuickPick(
      typeOptions.map((label) => ({ label, picked: label === defaultType })),
      {
        placeHolder: 'Select work item type',
        ignoreFocusOut: true,
      }
    );
    if (!quickPickType) return;
    chosenType = quickPickType.label;
  }

  const title = await vscode.window.showInputBox({
    prompt: `New ${chosenType} title`,
    ignoreFocusOut: true,
  });
  if (!title) return;

  const workItems: any[] =
    typeof provider.getWorkItems === 'function' ? provider.getWorkItems() : [];
  const dedupe = (values: Array<string | undefined>) => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of values) {
      const trimmed = typeof value === 'string' ? value.trim() : '';
      if (!trimmed) continue;
      if (seen.has(trimmed)) continue;
      seen.add(trimmed);
      result.push(trimmed);
    }
    return result.sort((a, b) => a.localeCompare(b));
  };

  const areaPathCache = dedupe(workItems.map((w) => w.fields?.['System.AreaPath']));
  const iterationPathCache = dedupe(workItems.map((w) => w.fields?.['System.IterationPath']));

  const lastAreaPath = extensionContextRef?.globalState.get<string>('azureDevOpsInt.lastAreaPath');
  if (lastAreaPath && !areaPathCache.includes(lastAreaPath)) areaPathCache.unshift(lastAreaPath);
  const lastIterationPath = extensionContextRef?.globalState.get<string>(
    'azureDevOpsInt.lastIterationPath'
  );
  if (lastIterationPath && !iterationPathCache.includes(lastIterationPath))
    iterationPathCache.unshift(lastIterationPath);

  const areaPath = await promptForAreaPath(areaPathCache);
  if (!areaPath) return;
  const iterationPath = await promptForIterationPath(iterationPathCache);
  if (iterationPath === undefined) {
    // User cancelled
    return;
  }

  const extraFields: Record<string, string> = {};
  if (areaPath) extraFields['System.AreaPath'] = areaPath;
  if (iterationPath) extraFields['System.IterationPath'] = iterationPath;

  const descriptionInput = await vscode.window.showInputBox({
    prompt: `Description for the new ${chosenType} (optional)`,
    ignoreFocusOut: true,
    placeHolder: 'Leave blank to skip adding a description',
    value: '',
  });
  const description = descriptionInput?.trim() ? descriptionInput.trim() : undefined;

  try {
    const created = await provider.createWorkItem(
      chosenType,
      title.trim(),
      description,
      undefined,
      extraFields
    );
    if (extensionContextRef) {
      await extensionContextRef.globalState.update('azureDevOpsInt.lastAreaPath', areaPath);
      await extensionContextRef.globalState.update(
        'azureDevOpsInt.lastIterationPath',
        iterationPath || null
      );
    }
    vscode.window.showInformationMessage(`Created work item #${created.id}`);
  } catch (e: any) {
    vscode.window.showErrorMessage(`Failed to create: ${e.message || e}`);
  }
}

async function promptForAreaPath(candidates: string[]): Promise<string | undefined> {
  const hasCandidates = Array.isArray(candidates) && candidates.length > 0;
  if (!hasCandidates) {
    const manual = await vscode.window.showInputBox({
      prompt: 'Area path for new work item (required)',
      ignoreFocusOut: true,
    });
    return manual?.trim();
  }
  const pickItems: vscode.QuickPickItem[] = candidates.map((label, index) => ({
    label,
    picked: index === 0,
  }));
  pickItems.push({
    label: 'Enter custom area path…',
    description: 'Specify a different area path',
    alwaysShow: true,
  });
  const selection = await vscode.window.showQuickPick(pickItems, {
    placeHolder: 'Select Area Path for the new work item',
    ignoreFocusOut: true,
  });
  if (!selection) return undefined;
  if (selection.label === 'Enter custom area path…') {
    const manual = await vscode.window.showInputBox({
      prompt: 'Custom area path',
      ignoreFocusOut: true,
      value: candidates[0] ?? '',
    });
    return manual?.trim() || undefined;
  }
  return selection.label.trim();
}

async function promptForIterationPath(candidates: string[]): Promise<string | undefined> {
  const skipLabel = 'Use default iteration (skip)';
  const customLabel = 'Enter custom iteration path…';
  if (!Array.isArray(candidates) || candidates.length === 0) {
    const manual = await vscode.window.showInputBox({
      prompt: 'Iteration path for the new work item (optional)',
      placeHolder: 'Leave blank to use default iteration',
      ignoreFocusOut: true,
    });
    if (manual === undefined) return undefined;
    const trimmed = manual.trim();
    return trimmed.length > 0 ? trimmed : '';
  }
  const items: vscode.QuickPickItem[] = [
    { label: skipLabel, description: 'Let Azure DevOps use the default iteration' },
    ...candidates.map((label, index) => ({ label, picked: index === 0 })),
    { label: customLabel, description: 'Specify a different iteration path', alwaysShow: true },
  ];
  const selection = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select Iteration Path (optional)',
    ignoreFocusOut: true,
  });
  if (!selection) return undefined;
  if (selection.label === skipLabel) return '';
  if (selection.label === customLabel) {
    const manual = await vscode.window.showInputBox({
      prompt: 'Custom iteration path (optional)',
      placeHolder: 'Leave blank to use default',
      ignoreFocusOut: true,
      value: candidates[0] ?? '',
    });
    if (manual === undefined) return undefined;
    const trimmed = manual.trim();
    return trimmed.length > 0 ? trimmed : '';
  }
  return selection.label.trim();
}

async function selectTeam() {
  try {
    if (!client) {
      vscode.window.showWarningMessage('Connect to Azure DevOps first (Setup Connection).');
      return;
    }
    const teams = await (client as any).getTeams?.();
    if (!Array.isArray(teams) || teams.length === 0) {
      vscode.window.showInformationMessage('No teams found for this project.');
      return;
    }
    const picks = teams.map((t: any) => ({ label: t.name, description: t.id }));
    const chosen = await vscode.window.showQuickPick(picks, {
      placeHolder: 'Select your Team for sprint queries',
    });
    if (!chosen) return;
    const cfg = getConfig();
    await cfg.update('team', chosen.label, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(
      `Team set to "${chosen.label}". 'Current Sprint' will use this team context.`
    );
    // Re-initialize client to use new team without requiring reload
    const org = String(cfg.get('organization') || '');
    const project = String(cfg.get('project') || '');
    const pat = extensionContextRef ? await getSecretPAT(extensionContextRef) : undefined;
    // If we cannot rehydrate PAT in this context, silently skip re-init (next activation covers it)
    if (org && project && pat) {
      try {
        const rate = Math.max(1, Math.min(50, cfg.get<number>('apiRatePerSecond') ?? 5));
        const burst = Math.max(1, Math.min(100, cfg.get<number>('apiBurst') ?? 10));
        client = new AzureDevOpsIntClient(org, project, pat, {
          ratePerSecond: rate,
          burst,
          team: chosen.label,
        });
        if (client) {
          provider = createConnectionProvider({
            connectionId: 'default',
            client,
            postMessage: (m: unknown) => forwardProviderMessage('default', m),
          });
        }
        // refresh view if attached - use connection-specific query
        const connectionSpecificQuery = activeConnectionId
          ? getStoredQueryForConnection(activeConnectionId)
          : getDefaultQuery(cfg);

        console.log('🔄 [Query Debug] selectTeam - refreshing with connection-specific query:', {
          activeConnectionId,
          connectionSpecificQuery,
          globalDefault: getDefaultQuery(cfg),
        });

        provider?.refresh(connectionSpecificQuery);
      } catch {
        /* ignore */
      }
    }
  } catch (e: any) {
    vscode.window.showErrorMessage(`Failed to select team: ${e?.message || e}`);
  }
}

async function resetPreferredRepositories() {
  const cfg = getConfig();
  try {
    await cfg.update('preferredRepositoryIds', [], vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(
      'Preferred repositories cleared. You will be prompted next time you create a PR.'
    );
  } catch (e: any) {
    vscode.window.showErrorMessage(`Failed to clear preferred repositories: ${e?.message || e}`);
  }
}

function toggleKanbanView() {
  if (!panel) {
    revealWorkItemsView();
    return;
  }

  // Send message to webview to toggle the view
  sendToWebview({ type: 'toggleKanbanView' });
}

async function editWorkItemInEditor(workItemId: number) {
  if (!client || !provider) {
    vscode.window.showWarningMessage(
      'Connect to Azure DevOps first (Azure DevOps: Setup Connection).'
    );
    return;
  }

  try {
    // Find the work item in our cached list
    const workItems = provider.getWorkItems();
    const workItem = workItems.find(
      (w: any) => w.id === workItemId || w.fields?.['System.Id'] === workItemId
    );

    if (!workItem) {
      vscode.window.showErrorMessage(`Work item #${workItemId} not found in current list.`);
      return;
    }

    // Extract current values from fields only (typed WorkItem does not include direct props)
    const currentTitle = workItem.fields?.['System.Title'] || '';
    const currentDescription = workItem.fields?.['System.Description'] || '';
    const currentState = workItem.fields?.['System.State'] || '';
    const currentType = workItem.fields?.['System.WorkItemType'] || '';

    // Get new title
    const newTitle = await vscode.window.showInputBox({
      prompt: `Edit title for ${currentType} #${workItemId}`,
      value: currentTitle,
      placeHolder: 'Work item title',
    });

    if (newTitle === undefined) return; // User cancelled

    // Get new description
    const newDescription = await vscode.window.showInputBox({
      prompt: `Edit description for ${currentType} #${workItemId}`,
      value: currentDescription,
      placeHolder: 'Work item description (optional)',
    });

    if (newDescription === undefined) return; // User cancelled

    // Get valid states for this work item type dynamically
    let stateOptions: { label: string; description: string }[];
    try {
      const validStates = await client.getWorkItemTypeStates(currentType);
      if (validStates.length > 0) {
        stateOptions = validStates.map((state) => ({
          label: state,
          description: `${state} state`,
        }));
        // If current state is not in the valid states, add it to prevent user confusion
        if (!validStates.includes(currentState) && currentState) {
          stateOptions.unshift({
            label: currentState,
            description: `Current: ${currentState} state`,
          });
        }
      } else {
        // Fallback to common states if API returns empty
        stateOptions = [
          { label: 'New', description: 'New work item' },
          { label: 'Active', description: 'Work in progress' },
          { label: 'Resolved', description: 'Work completed' },
          { label: 'Closed', description: 'Work verified and closed' },
          { label: 'Removed', description: 'Work item removed' },
        ];
      }
    } catch (e) {
      console.error('Failed to fetch valid states, using fallback:', e);
      // Fallback to common states if API fails
      stateOptions = [
        { label: 'New', description: 'New work item' },
        { label: 'Active', description: 'Work in progress' },
        { label: 'Resolved', description: 'Work completed' },
        { label: 'Closed', description: 'Work verified and closed' },
        { label: 'Removed', description: 'Work item removed' },
      ];
      // Ensure current state is available if it's not in the fallback list
      const fallbackStates = stateOptions.map((opt) => opt.label);
      if (!fallbackStates.includes(currentState) && currentState) {
        stateOptions.unshift({
          label: currentState,
          description: `Current: ${currentState} state`,
        });
      }
    }

    const selectedState = await vscode.window.showQuickPick(stateOptions, {
      placeHolder: `Current state: ${currentState}. Select new state:`,
    });

    if (!selectedState) return; // User cancelled
    const newState = selectedState.label;

    // Build patch operations for changes
    const patchOps: any[] = [];

    if (newTitle !== currentTitle) {
      patchOps.push({
        op: 'replace',
        path: '/fields/System.Title',
        value: newTitle,
      });
    }

    if (newDescription !== currentDescription) {
      patchOps.push({
        op: 'replace',
        path: '/fields/System.Description',
        value: newDescription,
      });
    }

    if (newState !== currentState) {
      patchOps.push({
        op: 'replace',
        path: '/fields/System.State',
        value: newState,
      });
    }

    // Apply updates if there are any changes
    if (patchOps.length > 0) {
      await client.updateWorkItem(workItemId, patchOps);
      vscode.window.showInformationMessage(`Updated work item #${workItemId}`);

      // Refresh the work items list to show updated data
      const refreshQuery = getQueryForProvider(provider, activeConnectionId);
      provider.refresh(refreshQuery);
    } else {
      vscode.window.showInformationMessage('No changes made.');
    }
  } catch (e: any) {
    vscode.window.showErrorMessage(`Failed to edit work item: ${e.message || e}`);
  }
}

async function startTimerInteractive() {
  if (!provider || !timer) {
    vscode.window.showWarningMessage('Provider not ready yet');
    return;
  }
  if (timer.snapshot()) {
    const runningConnectionLabel = getActiveTimerConnectionLabel();
    vscode.window.showInformationMessage(
      runningConnectionLabel
        ? `A timer is already running for ${runningConnectionLabel}. Stop it before starting another.`
        : 'A timer is already running. Stop it before starting another.'
    );
    return;
  }
  const items = provider.getWorkItems();
  if (items.length === 0) {
    const refreshQuery = getQueryForProvider(provider, activeConnectionId);
    await provider.refresh(refreshQuery);
  }
  const pick = await vscode.window.showQuickPick(
    provider.getWorkItems().map((w: any) => ({
      label: w.fields?.['System.Title'] || `#${w.id}`,
      description: `#${w.id}`,
      wi: w,
    })),
    { placeHolder: 'Select work item to start/stop timer' }
  );
  if (!pick) return;
  const wi: any = (pick as any).wi;
  const connection = activeConnectionId
    ? connections.find((c) => c.id === activeConnectionId)
    : undefined;
  const previousInfo = { ...timerConnectionInfo };
  setTimerConnectionFrom(connection);
  const started = timer.start(
    Number(wi.id || wi.fields?.['System.Id']),
    wi.fields?.['System.Title'] || `#${id}`
  );
  if (!started) timerConnectionInfo = previousInfo;
}

function showTimeReport() {
  if (!timer) {
    vscode.window.showInformationMessage('No timer data yet.');
    return;
  }
  const periods: Array<'Today' | 'This Week' | 'This Month' | 'All Time'> = [
    'Today',
    'This Week',
    'This Month',
    'All Time',
  ];
  vscode.window.showQuickPick(periods, { placeHolder: 'Select report period' }).then((p) => {
    if (!p || !timer) return; // guard
    const report = timer.timeReport(p as 'Today' | 'This Week' | 'This Month' | 'All Time');
    const lines: string[] = [];
    report.buckets.forEach((val: any, key: string | number) => {
      const hrs = (val.total / 3600).toFixed(2);
      lines.push(`#${key}: ${hrs}h`);
    });
    if (lines.length === 0) lines.push('No time entries in period');
    vscode.window.showInformationMessage(`${p} Time:\n${lines.join('\n')}`);
  });
}

function showPerformanceDashboard() {
  try {
    const report = performanceMonitor.getPerformanceReport();
    const { stats, cacheStats, memoryUsage, recommendations } = report;

    // Format memory in MB
    const formatMemory = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2) + ' MB';

    const dashboard = [
      '=== Performance Dashboard ===\n',
      '📊 Operation Statistics:',
      `  Total Operations: ${stats.totalOperations}`,
      `  Average Duration: ${stats.averageDuration.toFixed(2)}ms`,
      `  Min Duration: ${stats.minDuration.toFixed(2)}ms`,
      `  Max Duration: ${stats.maxDuration.toFixed(2)}ms`,
      `  Error Rate: ${(stats.errorRate * 100).toFixed(1)}%`,
      `  Cache Hit Rate: ${(stats.cacheHitRate * 100).toFixed(1)}%\n`,
      '💾 Memory Usage:',
      `  Current Heap: ${formatMemory(memoryUsage.heapUsed)}`,
      `  Total Heap: ${formatMemory(memoryUsage.heapTotal)}`,
      `  Peak Usage: ${formatMemory(stats.memoryUsage.peak)}`,
      `  RSS: ${formatMemory(memoryUsage.rss)}\n`,
      '🗄️ Cache Statistics:',
      `  Work Items Cached: ${cacheStats.workItems?.topKeys?.length || 0}`,
      `  API Calls Cached: ${cacheStats.api?.topKeys?.length || 0}`,
      `  Total Memory: ${formatMemory(cacheStats.totalMemoryUsage)}\n`,
    ];

    if (recommendations.length > 0) {
      dashboard.push('💡 Recommendations:');
      recommendations.forEach((rec) => dashboard.push(`  • ${rec}`));
    } else {
      dashboard.push('✅ Performance looks good!');
    }

    vscode.window.showInformationMessage(dashboard.join('\n'), { modal: true });
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to show performance dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function forceGarbageCollection() {
  try {
    // Check if GC is exposed
    if (global.gc) {
      const before = process.memoryUsage();
      global.gc();
      const after = process.memoryUsage();
      const freed = (before.heapUsed - after.heapUsed) / (1024 * 1024);
      vscode.window.showInformationMessage(
        `Garbage collection completed. Freed ${freed.toFixed(2)} MB of memory.`
      );
    } else {
      vscode.window.showWarningMessage(
        'Garbage collection is not exposed. To enable, start VS Code with --expose-gc flag.'
      );
    }
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to force garbage collection: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function exportFiltersToFile() {
  try {
    // Get current filter state
    const config = getConfig();
    const filterData = {
      version: '1.0',
      exported: new Date().toISOString(),
      filters: {
        workItemQuery: config.get<string>('workItemQuery'),
        showCompletedWorkItems: config.get<boolean>('showCompletedWorkItems'),
        defaultWorkItemType: config.get<string>('defaultWorkItemType'),
      },
    };

    // Prompt for file location
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('azuredevops-filters.json'),
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*'],
      },
    });

    if (!uri) return;

    // Write to file
    const fs = await import('fs/promises');
    await fs.writeFile(uri.fsPath, JSON.stringify(filterData, null, 2), 'utf8');

    vscode.window.showInformationMessage(`Filters exported to ${uri.fsPath}`);
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to export filters: ${error.message || 'Unknown error'}`);
  }
}

async function importFiltersFromFile() {
  try {
    // Prompt for file
    const uris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*'],
      },
    });

    if (!uris || uris.length === 0) return;

    // Read file
    const fs = await import('fs/promises');
    const content = await fs.readFile(uris[0].fsPath, 'utf8');
    const filterData = JSON.parse(content);

    if (!filterData.version || !filterData.filters) {
      throw new Error('Invalid filter file format');
    }

    // Confirm import
    const confirm = await vscode.window.showWarningMessage(
      `Import filters from ${uris[0].fsPath}? This will overwrite your current filter settings.`,
      { modal: true },
      'Import',
      'Cancel'
    );

    if (confirm !== 'Import') return;

    // Apply filters
    const config = getConfig();
    const filters = filterData.filters;

    if (filters.workItemQuery) {
      await config.update(
        'workItemQuery',
        filters.workItemQuery,
        vscode.ConfigurationTarget.Global
      );
    }
    if (typeof filters.showCompletedWorkItems === 'boolean') {
      await config.update(
        'showCompletedWorkItems',
        filters.showCompletedWorkItems,
        vscode.ConfigurationTarget.Global
      );
    }
    if (filters.defaultWorkItemType) {
      await config.update(
        'defaultWorkItemType',
        filters.defaultWorkItemType,
        vscode.ConfigurationTarget.Global
      );
    }

    vscode.window.showInformationMessage('Filters imported successfully');

    // Refresh with new filters
    const refreshQuery = getQueryForProvider(provider, activeConnectionId);
    provider?.refresh(refreshQuery);
  } catch (error: any) {
    vscode.window.showErrorMessage(`Failed to import filters: ${error.message || 'Unknown error'}`);
  }
}

async function manageSavedFilters() {
  try {
    const SAVED_FILTERS_KEY = 'azureDevOpsInt.savedFilters';
    const savedFilters =
      extensionContextRef?.globalState.get<
        Array<{ name: string; query: string; description?: string }>
      >(SAVED_FILTERS_KEY) || [];

    const actions = [
      { label: '$(add) Save Current Query', value: 'save' },
      { label: '$(list-unordered) Load Saved Query', value: 'load' },
      { label: '$(trash) Delete Saved Query', value: 'delete' },
      { label: '$(list-flat) List All Saved Queries', value: 'list' },
    ];

    const action = await vscode.window.showQuickPick(actions, {
      placeHolder: `Manage Saved Filters (${savedFilters.length} saved)`,
      ignoreFocusOut: true,
    });

    if (!action) return;

    switch (action.value) {
      case 'save': {
        const name = await vscode.window.showInputBox({
          prompt: 'Enter a name for this filter',
          placeHolder: 'e.g., "My Active Bugs", "Sprint Tasks"',
          ignoreFocusOut: true,
        });

        if (!name) return;

        const config = getConfig();
        const currentQuery = config.get<string>('workItemQuery') || '';

        const description = await vscode.window.showInputBox({
          prompt: 'Enter a description (optional)',
          placeHolder: 'Describe what this filter shows',
          ignoreFocusOut: true,
        });

        const newFilter = { name, query: currentQuery, description: description || undefined };
        const updated = [...savedFilters, newFilter];
        await extensionContextRef?.globalState.update(SAVED_FILTERS_KEY, updated);

        vscode.window.showInformationMessage(`Filter "${name}" saved successfully`);
        break;
      }

      case 'load': {
        if (savedFilters.length === 0) {
          vscode.window.showInformationMessage('No saved filters. Save one first!');
          return;
        }

        const filterItems = savedFilters.map((f) => ({
          label: f.name,
          description: f.description,
          detail: f.query,
          filter: f,
        }));

        const selected = await vscode.window.showQuickPick(filterItems, {
          placeHolder: 'Select a filter to load',
          ignoreFocusOut: true,
        });

        if (!selected) return;

        const config = getConfig();
        await config.update(
          'workItemQuery',
          selected.filter.query,
          vscode.ConfigurationTarget.Global
        );

        vscode.window.showInformationMessage(`Filter "${selected.filter.name}" loaded`);

        // Refresh with new query
        const refreshQuery = getQueryForProvider(provider, activeConnectionId);
        provider?.refresh(refreshQuery);
        break;
      }

      case 'delete': {
        if (savedFilters.length === 0) {
          vscode.window.showInformationMessage('No saved filters to delete');
          return;
        }

        const filterItems = savedFilters.map((f, index) => ({
          label: f.name,
          description: f.description,
          index,
        }));

        const selected = await vscode.window.showQuickPick(filterItems, {
          placeHolder: 'Select a filter to delete',
          ignoreFocusOut: true,
        });

        if (!selected) return;

        const confirm = await vscode.window.showWarningMessage(
          `Delete filter "${selected.label}"?`,
          'Delete',
          'Cancel'
        );

        if (confirm === 'Delete') {
          const updated = savedFilters.filter((_, i) => i !== selected.index);
          await extensionContextRef?.globalState.update(SAVED_FILTERS_KEY, updated);
          vscode.window.showInformationMessage(`Filter "${selected.label}" deleted`);
        }
        break;
      }

      case 'list': {
        if (savedFilters.length === 0) {
          vscode.window.showInformationMessage('No saved filters yet');
          return;
        }

        const list = savedFilters
          .map((f, i) => `${i + 1}. ${f.name}${f.description ? ` - ${f.description}` : ''}`)
          .join('\n');

        vscode.window.showInformationMessage(`Saved Filters (${savedFilters.length}):\n\n${list}`, {
          modal: true,
        });
        break;
      }
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(`Filter management failed: ${error.message || 'Unknown error'}`);
  }
}

async function showQueryBuilder() {
  try {
    const config = getConfig();
    const currentQuery = config.get<string>('workItemQuery') || '';

    // Show interactive query builder
    const buildAction = await vscode.window.showQuickPick(
      [
        { label: '$(edit) Edit Current Query', value: 'edit' },
        { label: '$(sparkle) Build from Template', value: 'template' },
        { label: '$(info) View Query Help', value: 'help' },
      ],
      {
        placeHolder: 'Query Builder',
        ignoreFocusOut: true,
      }
    );

    if (!buildAction) return;

    switch (buildAction.value) {
      case 'edit': {
        const newQuery = await vscode.window.showInputBox({
          prompt: 'Edit WIQL Query',
          value: currentQuery,
          placeHolder: 'SELECT [System.Id], [System.Title] FROM WorkItems WHERE...',
          ignoreFocusOut: true,
          validateInput: (value) => {
            if (!value.trim()) return 'Query cannot be empty';
            if (!value.toUpperCase().includes('SELECT')) return 'Query must include SELECT';
            if (!value.toUpperCase().includes('FROM')) return 'Query must include FROM';
            return null;
          },
        });

        if (!newQuery) return;

        await config.update('workItemQuery', newQuery, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('Query updated successfully');

        // Refresh with new query
        const refreshQuery = getQueryForProvider(provider, activeConnectionId);
        provider?.refresh(refreshQuery);
        break;
      }

      case 'template': {
        const templates = [
          {
            label: 'My Work Items',
            detail: 'Items assigned to me',
            query:
              "SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.WorkItemType] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.AssignedTo] = @Me AND [System.State] <> 'Closed' ORDER BY [System.ChangedDate] DESC",
          },
          {
            label: 'Recently Changed',
            detail: 'Items changed in last 7 days',
            query:
              'SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.WorkItemType] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.ChangedDate] >= @Today-7 ORDER BY [System.ChangedDate] DESC',
          },
          {
            label: 'Active Bugs',
            detail: 'All active bugs in project',
            query:
              "SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.WorkItemType] = 'Bug' AND [System.State] = 'Active' ORDER BY [Microsoft.VSTS.Common.Priority] ASC",
          },
          {
            label: 'Current Sprint',
            detail: 'Items in current iteration',
            query:
              'SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.WorkItemType] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.IterationPath] = @CurrentIteration ORDER BY [Microsoft.VSTS.Common.Priority] ASC',
          },
          {
            label: 'Unassigned Items',
            detail: 'Items with no assignee',
            query:
              "SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.AssignedTo] = '' AND [System.State] <> 'Closed' ORDER BY [System.CreatedDate] DESC",
          },
        ];

        const selected = await vscode.window.showQuickPick(templates, {
          placeHolder: 'Select a query template',
          ignoreFocusOut: true,
        });

        if (!selected) return;

        await config.update('workItemQuery', selected.query, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Query set to: ${selected.label}`);

        // Refresh with new query
        const refreshQuery = getQueryForProvider(provider, activeConnectionId);
        provider?.refresh(refreshQuery);
        break;
      }

      case 'help': {
        const helpText = [
          '=== WIQL Query Builder Help ===\n',
          '📝 Basic Structure:',
          'SELECT [fields] FROM WorkItems WHERE [conditions] ORDER BY [field]\n',
          '🔍 Common Fields:',
          '  [System.Id] - Work Item ID',
        vscode.window.showInformationMessage(helpText, { modal: true });
        break;
      }
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(`Query builder failed: ${error.message || 'Unknown error'}`);
  }
}

function updateTimerContext(s: any) {
  const running = !!s && !s.isPaused;
  const paused = !!s && s.isPaused;

  // Avoid setting context during deactivation to prevent cancelled promise errors
  if (!isDeactivating) {
    vscode.commands.executeCommand('setContext', 'azureDevOpsInt.timerActive', !!s).then(
      () => {},
      () => {}
    );
    vscode.commands.executeCommand('setContext', 'azureDevOpsInt.timerRunning', running).then(
      () => {},
      () => {}
    );
    vscode.commands.executeCommand('setContext', 'azureDevOpsInt.timerPaused', paused).then(
      () => {},
      () => {}
    );
  }
  if (statusBarItem) {
    if (s) {
      const connectionLabel = getActiveTimerConnectionLabel();
      const sec = s.elapsedSeconds || 0;
      const h = Math.floor(sec / 3600)
        .toString()
        .padStart(2, '0');
      const m = Math.floor((sec % 3600) / 60)
        .toString()
        .padStart(2, '0');
      const mini = `${h}:${m}`;
      statusBarItem.text = `$(watch) ${mini} #${s.workItemId}${s.isPaused ? ' (Paused)' : ''}`;
      const tooltipLines = [`Azure DevOps Timer for #${s.workItemId}`];
      if (connectionLabel) tooltipLines.push(`Project: ${connectionLabel}`);
      statusBarItem.tooltip = tooltipLines.join('\n');
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  }
}

function verbose(msg: string, extra?: any) {
  try {
    if (!getOutputChannel()) return;
    if (extra !== undefined) {
      logLine(
        `${new Date().toISOString()} ${msg} ${
          typeof extra === 'string' ? extra : JSON.stringify(extra)
        }`
      );
    } else {
      logLine(`${new Date().toISOString()} ${msg}`);
    }
  } catch {
    /* ignore */
  }
}

function forwardProviderMessage(connectionId: string, message: any) {
  // CRITICAL: Always include connectionId in provider messages so webview can
  // filter/ignore messages that don't match the active connection. This prevents
  // stale data from inactive connections from appearing in the UI.
  if (message?.type === 'workItemsLoaded') {
    const enrichment = getBranchEnrichmentState(connectionId);
    const providerInstance =
      connectionStates.get(connectionId)?.provider ??
      (connectionId === 'default' ? provider : undefined);
    const merged = {
      ...message,
      connectionId,
      branchContext: enrichment?.context ?? null,
    };
    postToWebview({ panel, message: merged, logger: verbose });
    updateBuildRefreshTimer(connectionId, providerInstance, !!enrichment?.hasActiveBuild);
    return;
  }

  // Include connectionId in all provider messages for proper filtering
  const tagged = { ...message, connectionId };
  postToWebview({ panel, message: tagged, logger: verbose });
}

// ---------------- Git / PR / Build Feature Helpers ----------------

async function createBranchFromWorkItem() {
  const gitExt = vscode.extensions.getExtension('vscode.git');
  if (!gitExt) {
    vscode.window.showErrorMessage('Git extension not available.');
    return;
  }
  const api: any = gitExt.isActive ? gitExt.exports.getAPI(1) : (await gitExt.activate()).getAPI(1);
  const repo = api.repositories?.[0];
  if (!repo) {
    vscode.window.showWarningMessage('No git repository open.');
    return;
  }
  if (!provider) {
    vscode.window.showWarningMessage('Work items not loaded yet.');
    return;
  }
  const pick = await vscode.window.showQuickPick(
    provider.getWorkItems().map((w: any) => ({
      label: w.fields?.['System.Title'] || `#${w.id}`,
      description: `#${w.id}`,
      wi: w,
    })),
    { placeHolder: 'Select work item for branch' }
  );
  if (!pick) return;
  const wi: any = (pick as any).wi;
  const id = wi.id || wi.fields?.['System.Id'];
  const rawTitle =
    (wi.fields?.['System.Title'] || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || `wi-${id}`;
  const branchName = await vscode.window.showInputBox({
    prompt: 'Branch name',
    value: `feature/wi-${id}-${rawTitle}`,
  });
  if (!branchName) return;
  try {
    await repo.createBranch(branchName, true);
    vscode.window.showInformationMessage(`Created and switched to ${branchName}`);
    const autoStart = getConfig().get<boolean>('autoStartTimerOnBranch');
    if (autoStart && timer && !timer.snapshot()) {
      const connection = activeConnectionId
        ? connections.find((c) => c.id === activeConnectionId)
        : undefined;
      const previousInfo = { ...timerConnectionInfo };
      setTimerConnectionFrom(connection);
      const started = timer.start(Number(id), wi.fields?.['System.Title'] || `#${id}`);
      if (!started) timerConnectionInfo = previousInfo;
    }
  } catch (e: any) {
    vscode.window.showErrorMessage(`Branch creation failed: ${e.message || e}`);
  }
}

async function createPullRequestInteractive() {
  if (!client) {
    vscode.window.showWarningMessage('Connect first.');
    return;
  }
  const repos = await client.getRepositories();
  if (!Array.isArray(repos) || repos.length === 0) {
    vscode.window.showWarningMessage('No repositories found via REST API.');
    return;
  }
  const cfg = getConfig();
  let preferred: string[] = (cfg.get<string[]>('preferredRepositoryIds') || []).filter(Boolean);
  // If none stored, prompt to select one or more repos and save for future
  if (!preferred.length) {
    const picks = await vscode.window.showQuickPick(
      repos.map((r: any) => ({ label: r.name, description: r.id, picked: false })),
      { placeHolder: 'Select default repositories for PR creation', canPickMany: true }
    );
    if (!picks || picks.length === 0) {
      vscode.window.showInformationMessage('No repositories selected.');
      return;
    }
    preferred = picks.map((p: any) => p.description!).filter(Boolean);
    try {
      await cfg.update('preferredRepositoryIds', preferred, vscode.ConfigurationTarget.Global);
    } catch (e: any) {
      console.warn('[azureDevOpsInt] Failed to persist preferredRepositoryIds', e);
    }
  }

  // Filter stored repo IDs to those that still exist
  const repoMap = new Map((repos || []).map((r: any) => [r.id, r] as const));
  const validPreferred = preferred.filter((id) => repoMap.has(id));
  if (!validPreferred.length) {
    vscode.window.showWarningMessage(
      'Your saved repositories are not found in this project. Please reselect.'
    );
    const picks = await vscode.window.showQuickPick(
      repos.map((r: any) => ({ label: r.name, description: r.id, picked: false })),
      { placeHolder: 'Select default repositories for PR creation', canPickMany: true }
    );
    if (!picks || picks.length === 0) return;
    const newIds = picks.map((p: any) => p.description!).filter(Boolean);
    await cfg.update('preferredRepositoryIds', newIds, vscode.ConfigurationTarget.Global);
  }

  // If more than one preferred, ask which to use for this PR. If single, auto-select
  const candidateRepos = (cfg.get<string[]>('preferredRepositoryIds') || [])
    .filter((id) => repoMap.has(id))
    .map((id) => repoMap.get(id));

  let repoPick: { label: string; description: string } | undefined;
  if (candidateRepos.length === 1) {
    const r = candidateRepos[0] as any;
    repoPick = { label: r.name, description: r.id };
  } else {
    repoPick = await vscode.window.showQuickPick(
      candidateRepos.map((r: any) => ({ label: r.name, description: r.id })),
      { placeHolder: 'Select repository for this PR' }
    );
    if (!repoPick) return;
  }
  const source = await vscode.window.showInputBox({
    prompt: 'Source branch (e.g. refs/heads/feature/x)',
    value: 'refs/heads/',
  });
  if (!source) return;
  const target = await vscode.window.showInputBox({
    prompt: 'Target branch',
    value: 'refs/heads/main',
  });
  if (!target) return;
  const title = await vscode.window.showInputBox({ prompt: 'Pull Request title' });
  if (!title) return;
  try {
    const pr = await client.createPullRequest(repoPick.description!, source, target, title);
    vscode.window.showInformationMessage(`PR created: ${pr.pullRequestId}`);
  } catch (e: any) {
    vscode.window.showErrorMessage(`Failed to create PR: ${e.message || e}`);
  }
}

async function showMyPullRequests() {
  if (!client) {
    vscode.window.showWarningMessage('Connect first.');
    return;
  }
  // Fetch PRs across all repos for the current user (author or reviewer)
  const prs: any[] = await (client as any).getMyPullRequestsAcrossRepos?.('active');
  if (!Array.isArray(prs) || prs.length === 0) {
    vscode.window.showInformationMessage('No active pull requests.');
    return;
  }

  const pick = await vscode.window.showQuickPick(
    prs.map((pr: any) => ({
      label: pr.title,
      description: `#${pr.pullRequestId ?? pr.id} ${pr.sourceRefName
        ?.split('/')
        .pop()} -> ${pr.targetRefName?.split('/').pop()}`,
      detail: pr.webUrl,
    })),
    { placeHolder: 'Open PR in browser' }
  );
  if (!pick) return;
  if (pick.detail) {
    vscode.env.openExternal(vscode.Uri.parse(pick.detail));
  }
}

async function showBuildStatus() {
  if (!client) {
    vscode.window.showWarningMessage('Connect first.');
    return;
  }
  // TODO: Implement build status fetch (placeholder to avoid parse issues)
  vscode.window.showInformationMessage('Build status feature not implemented yet.');
}

// Test helpers (no-op in production): allow tests to inject module-scoped dependencies
export function __setTestContext(
  ctx: Partial<{
    provider: any;
    panel: any;
    timer: any;
    client: any;
    statusBarItem: any;
    outputChannel: any;
  }>
) {
  if (ctx.provider !== undefined) provider = ctx.provider;
  if (ctx.panel !== undefined) panel = ctx.panel;
  if (ctx.timer !== undefined) timer = ctx.timer;
  if (ctx.client !== undefined) client = ctx.client;
  if (ctx.statusBarItem !== undefined) statusBarItem = ctx.statusBarItem;
  if (ctx.outputChannel !== undefined) setOutputChannel(ctx.outputChannel);
}
// Export legacy handler for testing while keeping backwards compatibility
export { handleLegacyMessage };
export { handleLegacyMessage as handleMessage };

// Export self test helper for tests
export { selfTestWebview };

// Export helpers for testing
export { migrateLegacyPAT, persistTimer, restoreTimer, getSecretPAT, migrateLegacyConfigIfNeeded };

// Export buildMinimalWebviewHtml for testing the webview HTML generation without changing runtime behavior.
export { buildMinimalWebviewHtml };

type SummaryProviderMode = 'builtin' | 'openai';

type SummaryEntrySeed = {
  workItemId: number;
  startTime?: number;
  endTime?: number;
  hoursDecimal?: number;
  duration?: number;
  capApplied?: boolean;
  capLimitHours?: number;
};

async function setOpenAIApiKey(context: vscode.ExtensionContext) {
  const current = await context.secrets.get(OPENAI_SECRET_KEY);
  const actions = [
    { label: current ? 'Update API key' : 'Set API key', action: 'set' as const },
    {
      label: 'Clear stored key',
      action: 'clear' as const,
      description: current ? undefined : 'No key stored',
    },
  ];
  const choice = await vscode.window.showQuickPick(actions, {
    placeHolder: current
      ? 'Update or clear the stored OpenAI API key'
      : 'Store an OpenAI API key for summaries',
    ignoreFocusOut: true,
  });
  if (!choice) return;

  if (choice.action === 'set') {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter your OpenAI API key',
      password: true,
      ignoreFocusOut: true,
      placeHolder: 'sk-...',
    });
    if (!input) return;
    await context.secrets.store(OPENAI_SECRET_KEY, input.trim());
    resetOpenAiClient();
    vscode.window.showInformationMessage('OpenAI API key saved.');
    if (getSummaryProvider() !== 'openai') {
      const enable = await vscode.window.showInformationMessage(
        'Would you like to switch the work summary provider to OpenAI?',
        'Yes',
        'Not now'
      );
      if (enable === 'Yes') {
        await getConfig().update('summaryProvider', 'openai', vscode.ConfigurationTarget.Global);
      }
    }
    return;
  }

  if (!current) {
    vscode.window.showInformationMessage('No OpenAI API key is stored.');
    return;
  }
  await context.secrets.delete(OPENAI_SECRET_KEY);
  resetOpenAiClient();
  vscode.window.showInformationMessage('OpenAI API key cleared.');
}

function getSummaryProvider(): SummaryProviderMode {
  try {
    const value = (getConfig().get<string>('summaryProvider') || 'builtin').toLowerCase();
    return value === 'openai' ? 'openai' : 'builtin';
  } catch {
    return 'builtin';
  }
}

function resetOpenAiClient() {
  openAiClient = undefined;
}

async function getOpenAIApiKey(context: vscode.ExtensionContext) {
  return context.secrets.get(OPENAI_SECRET_KEY);
}

async function ensureOpenAiClient(context: vscode.ExtensionContext): Promise<OpenAIClient> {
  if (openAiClient) return openAiClient;
  const apiKey = (await getOpenAIApiKey(context))?.trim();
  if (!apiKey) {
    throw new Error('OpenAI API key not set. Use “Azure DevOps: Set OpenAI API Key” to store one.');
  }
  const module = await import('openai');
  const OpenAIConstructor: any = (module as any).default ?? (module as any).OpenAI;
  if (typeof OpenAIConstructor !== 'function') {
    throw new Error('Failed to initialize OpenAI client.');
  }
  openAiClient = new OpenAIConstructor({ apiKey }) as OpenAIClient;
  return openAiClient;
}

function normalizeSummaryEntrySeed(
  workItemId: number,
  seed?: Partial<SummaryEntrySeed>
): SummaryEntrySeed {
  const snapshot = timer?.snapshot?.();
  const matchesSnapshot = snapshot && Number(snapshot.workItemId) === Number(workItemId);
  const startTime = seed?.startTime ?? (matchesSnapshot ? snapshot?.startTime : undefined);
  const endTime = seed?.endTime ?? (startTime ? Date.now() : undefined);
  const rawDuration =
    typeof seed?.duration === 'number'
      ? seed.duration
      : matchesSnapshot && typeof snapshot?.elapsedSeconds === 'number'
        ? snapshot.elapsedSeconds
        : undefined;
  const hoursDecimal =
    typeof seed?.hoursDecimal === 'number'
      ? seed.hoursDecimal
      : typeof rawDuration === 'number'
        ? rawDuration > 1000
          ? rawDuration / 3600000
          : rawDuration / 3600
        : undefined;
  return {
    workItemId,
    startTime,
    endTime,
    duration: rawDuration,
    hoursDecimal,
    capApplied: seed?.capApplied,
    capLimitHours: seed?.capLimitHours,
  };
}

function entrySeedFromMessage(
  message: any,
  workItemId: number
): Partial<SummaryEntrySeed> | undefined {
  if (!message || typeof message !== 'object') return undefined;
  const seed: Partial<SummaryEntrySeed> = {};
  let hasValue = false;
  if (typeof message.startTime === 'number') {
    seed.startTime = message.startTime;
    hasValue = true;
  }
  if (typeof message.endTime === 'number') {
    seed.endTime = message.endTime;
    hasValue = true;
  }
  if (typeof message.hoursDecimal === 'number') {
    seed.hoursDecimal = message.hoursDecimal;
    hasValue = true;
  }
  if (typeof message.duration === 'number') {
    seed.duration = message.duration;
    hasValue = true;
  }
  if (typeof message.capApplied === 'boolean') {
    seed.capApplied = message.capApplied;
    hasValue = true;
  }
  if (typeof message.capLimitHours === 'number') {
    seed.capLimitHours = message.capLimitHours;
    hasValue = true;
  }
  if (!hasValue) return undefined;
  return { ...seed, workItemId };
}

function toPlainText(value: unknown, maxLength = 2000): string {
  if (!value || typeof value !== 'string') return '';
  const text = value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

function buildOpenAiPrompt(
  workItem: any,
  seed: SummaryEntrySeed | undefined,
  draftSummary: string | undefined
): string {
  const fields = workItem?.fields || {};
  const title = fields['System.Title'] || `#${workItem?.id}`;
  const type = fields['System.WorkItemType'] || 'Work Item';
  const state = fields['System.State'] || 'Unknown';
  const assignedTo = fields['System.AssignedTo'];
  const description = toPlainText(fields['System.Description']);
  const tags = toPlainText(fields['System.Tags'] || '')
    .split(';')
    .map((t) => t.trim())
    .filter(Boolean);
  const start = seed?.startTime ? new Date(seed.startTime).toISOString() : undefined;
  const end = seed?.endTime ? new Date(seed.endTime).toISOString() : undefined;
  const hours =
    typeof seed?.hoursDecimal === 'number'
      ? seed.hoursDecimal
      : typeof seed?.duration === 'number'
        ? seed.duration / 3600
        : undefined;
  const notes = toPlainText(draftSummary || '', 1000);

  const lines: string[] = [];
  lines.push('You are helping summarize Azure DevOps work.');
  lines.push(
    'Write a concise 1-2 sentence summary suitable as a work item comment. Mention progress, impact, and next steps if relevant.'
  );
  lines.push('Avoid hedging language, keep it factual.');
  lines.push('\nContext:');
  lines.push(`- Work item: #${workItem?.id} | ${type} | ${title}`);
  lines.push(`- Current state: ${state}`);
  if (assignedTo)
    lines.push(
      `- Assigned to: ${typeof assignedTo === 'string' ? assignedTo : assignedTo.displayName || assignedTo.uniqueName || 'Unknown'}`
    );
  if (typeof hours === 'number') lines.push(`- Time spent: ${hours.toFixed(2)} hours`);
  if (start) lines.push(`- Start time: ${start}`);
  if (end) lines.push(`- End time: ${end}`);
  if (tags.length) lines.push(`- Tags: ${tags.join(', ')}`);
  if (description) {
    lines.push('\nWork item details:');
    lines.push(description);
  }
  if (notes) {
    lines.push('\nUser notes:');
    lines.push(notes);
  }
  lines.push('\nRespond with only the summary sentences.');
  return lines.join('\n');
}

async function generateOpenAiSummary(options: {
  workItem: any;
  seed: SummaryEntrySeed | undefined;
  draftSummary?: string;
  model: string;
}): Promise<string> {
  if (!extensionContextRef) {
    throw new Error('Extension context unavailable.');
  }
  const client = await ensureOpenAiClient(extensionContextRef);
  const prompt = buildOpenAiPrompt(options.workItem, options.seed, options.draftSummary);
  const response = await client.responses.create({
    model: options.model,
    input: prompt,
    temperature: 0.2,
    max_output_tokens: 320,
  } as any);
  const text = (response as any)?.output_text;
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('OpenAI returned an empty summary.');
  }
  return text.trim();
}

async function produceWorkItemSummary(options: {
  workItemId: number;
  draftSummary?: string;
  entrySeed?: Partial<SummaryEntrySeed>;
  reason: 'manualPrompt' | 'timerStop';
  providerOverride?: SummaryProviderMode;
  stillRunningTimer?: boolean;
}): Promise<{ provider: SummaryProviderMode; content: string }> {
  if (!client) throw new Error('Client not initialized');
  const workItem = await client.getWorkItemById(options.workItemId);
  if (!workItem) throw new Error(`Work item #${options.workItemId} not found.`);
  const seed = normalizeSummaryEntrySeed(options.workItemId, options.entrySeed);
  const provider = options.providerOverride ?? getSummaryProvider();

  if (provider === 'openai') {
    try {
      const model = getConfig().get<string>('openAiModel') || 'gpt-4o-mini';
      const summary = await generateOpenAiSummary({
        workItem,
        seed,
        draftSummary: options.draftSummary,
        model,
      });
      await vscode.env.clipboard.writeText(summary);
      panel?.webview.postMessage({
        type: 'copilotPromptCopied',
        workItemId: options.workItemId,
        provider: 'openai',
        summary,
      });
      const message = options.stillRunningTimer
        ? 'Generated an OpenAI summary and copied it to the clipboard while the timer continues running.'
        : 'Generated an OpenAI summary and copied it to the clipboard.';
      vscode.window.showInformationMessage(message);
      return { provider: 'openai', content: summary };
    } catch (err) {
      console.error('OpenAI summary generation failed', err);
      vscode.window.showErrorMessage(
        err instanceof Error && err.message
          ? err.message
          : 'Failed to generate OpenAI summary. Falling back to Copilot prompt.'
      );
      return produceWorkItemSummary({ ...options, providerOverride: 'builtin' });
    }
  }

  const prompt = buildCopilotPrompt(seed || { workItemId: options.workItemId }, workItem);
  await vscode.env.clipboard.writeText(prompt);
  panel?.webview.postMessage({
    type: 'copilotPromptCopied',
    workItemId: options.workItemId,
    provider: 'builtin',
    prompt,
  });
  const message = options.stillRunningTimer
    ? 'Copilot prompt copied to clipboard. The timer is still running.'
    : 'Copilot prompt copied to clipboard. Open Copilot chat and paste to generate a summary.';
  vscode.window.showInformationMessage(message);
  return { provider: 'builtin', content: prompt };
}

async function handleTimerStopAndOfferUpdate(
  entry: {
    workItemId: number;
    startTime: number;
    endTime: number;
    duration: number;
    hoursDecimal: number;
    capApplied?: boolean;
    capLimitHours?: number;
  },
  options?: { offerCopilot?: boolean; connection?: TimerConnectionInfo }
) {
  if (!entry) return;
  const connectionInfo = options?.connection ?? timerConnectionInfo;

  if (panel?.webview) {
    revealWorkItemsView();
    sendToWebview({
      type: 'showComposeComment',
      workItemId: entry.workItemId,
      mode: 'timerStop',
      timerData: entry,
      connectionInfo,
    });
    return;
  }

  const clientForTimer = getClientForConnectionInfo(connectionInfo);
  if (!clientForTimer) {
    vscode.window.showWarningMessage(
      'Timer stopped but no Azure DevOps client is available for the associated project. Connect and try again.'
    );
    return;
  }
  const id = Number(entry.workItemId);
  let workItem: any;
  try {
    workItem = await clientForTimer.getWorkItemById(id);
  } catch (err: any) {
    console.error('Failed to load work item for timer stop', err);
    vscode.window.showErrorMessage('Failed to load work item: ' + (err?.message || String(err)));
    return;
  }
  if (!workItem) {
    vscode.window.showErrorMessage(`Work item #${id} not found.`);
    return;
  }
  const fields = workItem.fields || {};
  const title = fields['System.Title'] || `#${id}`;
  const currCompleted = Number(fields['Microsoft.VSTS.Scheduling.CompletedWork'] || 0) || 0;
  const currRemaining = Number(fields['Microsoft.VSTS.Scheduling.RemainingWork'] || 0) || 0;
  const hours = Number(entry.hoursDecimal || entry.duration / 3600 || 0);
  const suggestedCompleted = Number((currCompleted + hours).toFixed(2));
  const suggestedRemaining = Number(Math.max(0, currRemaining - hours).toFixed(2));

  const initialOptions: string[] = ['Apply', 'Edit'];
  if (options?.offerCopilot !== false) {
    initialOptions.push('Generate Copilot prompt');
  }
  let promptMsg = `Add ${hours.toFixed(
    2
  )}h to Completed (${currCompleted} → ${suggestedCompleted}) and subtract from Remaining (${currRemaining} → ${suggestedRemaining}) for ${title}?`;
  if (entry.capApplied) {
    promptMsg += `\n\nNote: the timer elapsed exceeded the configured cap of ${
      entry.capLimitHours
    } hours and the recorded duration was limited to ${hours.toFixed(2)}h.`;
  }
  let action = await vscode.window.showInformationMessage(
    promptMsg,
    { modal: true },
    ...initialOptions
  );
  if (!action) return;

  let comment = generateAutoSummary(entry, workItem);

  // If user requested a Copilot prompt, generate it, copy to clipboard, and re-prompt
  if (action === 'Generate Copilot prompt') {
    try {
      const previousClient = client;
      try {
        client = clientForTimer;
        const result = await produceWorkItemSummary({
          workItemId: id,
          draftSummary: comment,
          entrySeed: entry,
          reason: 'timerStop',
        });
        if (result.provider === 'openai' && result.content) {
          comment = result.content;
        }
      } finally {
        client = previousClient;
      }
    } catch (err: any) {
      console.error('Failed to generate summary prompt', err);
      vscode.window.showErrorMessage(
        'Failed to generate summary prompt: ' + (err?.message || String(err))
      );
    }
    action = await vscode.window.showInformationMessage(
      `After generating the summary in Copilot, choose how to proceed for work item #${id}.`,
      { modal: true },
      'Apply',
      'Edit'
    );
    if (!action) return;
  }

  let finalCompleted = suggestedCompleted;
  let finalRemaining = suggestedRemaining;

  if (action === 'Edit') {
    const c = await vscode.window.showInputBox({
      prompt: 'Completed work (hours)',
      value: String(suggestedCompleted),
      ignoreFocusOut: true,
    });
    if (!c) return;
    finalCompleted = Number(c);
    const r = await vscode.window.showInputBox({
      prompt: 'Remaining work (hours)',
      value: String(suggestedRemaining),
      ignoreFocusOut: true,
    });
    if (!r) return;
    finalRemaining = Number(r);
    const edited = await vscode.window.showInputBox({
      prompt: 'Summary comment (will be added to the work item)',
      value: comment,
      ignoreFocusOut: true,
    });
    if (edited !== undefined) comment = edited;
  } else {
    const edited = await vscode.window.showInputBox({
      prompt: 'Summary comment (optional)',
      value: comment,
      ignoreFocusOut: true,
    });
    if (edited !== undefined) comment = edited;
  }

  const patch = [
    { op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.CompletedWork', value: finalCompleted },
    { op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.RemainingWork', value: finalRemaining },
  ];
  try {
    await clientForTimer.updateWorkItem(id, patch);
    if (comment && comment.trim()) {
      await clientForTimer.addWorkItemComment(
        id,
        `Time tracked: ${hours.toFixed(2)} hours. ${comment}`
      );
    }
    vscode.window.showInformationMessage(
      `Work item #${id} updated: Completed ${finalCompleted}h, Remaining ${finalRemaining}h.`
    );
  } catch (err: any) {
    console.error('Failed to update work item', err);
    vscode.window.showErrorMessage('Failed to update work item: ' + (err?.message || String(err)));
  }
}
function generateAutoSummary(entry: any, workItem: any) {
  try {
    const title = workItem?.fields?.['System.Title'] || `#${entry.workItemId}`;
    const start = entry.startTime ? new Date(entry.startTime).toLocaleString() : '';
    const end = entry.endTime ? new Date(entry.endTime).toLocaleString() : '';
    const hrs = Number(entry.hoursDecimal || 0).toFixed(2);
    return `Auto-summary: Worked ${hrs}h on "${title}" (${start} → ${end}).`;
  } catch {
    return `Worked ${Number(entry.hoursDecimal || 0).toFixed(2)}h on work item #${
      entry.workItemId
    }.`;
  }
}

function buildCopilotPrompt(entry: any, workItem: any) {
  const title = workItem?.fields?.['System.Title'] || `#${entry.workItemId}`;
  const start = entry.startTime ? new Date(entry.startTime).toLocaleString() : '';
  const end = entry.endTime ? new Date(entry.endTime).toLocaleString() : '';
  const hrs = Number(entry.hoursDecimal || entry.duration / 3600 || 0).toFixed(2);
  return `You are my assistant. Summarize the work I performed on work item #${entry.workItemId} entitled "${title}" between ${start} and ${end} (total ${hrs} hours). Produce a concise 1-2 sentence summary suitable as a comment on the work item that highlights the outcome, key changes, and suggested next steps.`;
}

async function diagnoseWorkItemsIssue(context: vscode.ExtensionContext) {
  const outputChannel =
    getOutputChannel() || vscode.window.createOutputChannel('Azure DevOps Integration');
  outputChannel.show(true);

  logLine('[DIAGNOSIS] Starting work items diagnostic...');

  try {
    // Ensure we have an active connection
    await ensureConnectionsInitialized(context);

    if (connections.length === 0) {
      logLine('[DIAGNOSIS] ❌ No connections configured');
      vscode.window.showErrorMessage(
        'No Azure DevOps connections found. Please run the Setup Wizard first.'
      );
      return;
    }

    logLine(`[DIAGNOSIS] Found ${connections.length} connection(s)`);
    connections.forEach((conn, i) => {
      logLine(`[DIAGNOSIS]   ${i + 1}. ${conn.organization}/${conn.project} (ID: ${conn.id})`);
    });

    // Test the active connection
    const state = await ensureActiveConnection(context, activeConnectionId, { refresh: false });
    if (!state) {
      logLine('[DIAGNOSIS] ❌ Failed to establish active connection');
      vscode.window.showErrorMessage('Failed to establish connection to Azure DevOps');
      return;
    }

    logLine(
      `[DIAGNOSIS] ✅ Active connection: ${state.config.organization}/${state.config.project}`
    );

    if (!state.client) {
      logLine('[DIAGNOSIS] ❌ No client available - check PAT configuration');
      vscode.window.showErrorMessage(
        'No Azure DevOps client available. Check your Personal Access Token.'
      );
      return;
    }

    // Test authentication
    logLine('[DIAGNOSIS] Testing authentication...');
    try {
      const userId = await state.client.getAuthenticatedUserId();
      logLine(`[DIAGNOSIS] ✅ Authentication successful. User ID: ${userId || 'unknown'}`);
    } catch (error: any) {
      logLine(`[DIAGNOSIS] ❌ Authentication failed: ${error.message}`);
      vscode.window.showErrorMessage('Authentication failed. Check your Personal Access Token.');
      return;
    }

    // Test simple work item query
    logLine('[DIAGNOSIS] Testing simple work item query...');
    try {
      const simpleQuery =
        'SELECT [System.Id], [System.Title] FROM WorkItems ORDER BY [System.Id] DESC';
      const simpleResults = await state.client.runWIQL(simpleQuery);
      logLine(`[DIAGNOSIS] ✅ Simple query returned ${simpleResults.length} work items`);

      if (simpleResults.length === 0) {
        logLine('[DIAGNOSIS] ⚠️  Project has no work items at all');
        vscode.window.showWarningMessage(
          'This project appears to have no work items. Try creating a work item first.'
        );
        return;
      } else {
        const sample = simpleResults[0];
        logLine(
          `[DIAGNOSIS]     Sample: #${sample.id} - ${sample.fields?.['System.Title'] || 'No title'}`
        );
      }
    } catch (error: any) {
      logLine(`[DIAGNOSIS] ❌ Simple query failed: ${error.message}`);
      vscode.window.showErrorMessage('Failed to query work items. Check your PAT permissions.');
      return;
    }

    // Test each of the main queries used by the extension
    const testQueries = [
      { name: 'My Activity', query: 'My Activity' },
      { name: 'All Active', query: 'All Active' },
      { name: 'Assigned to me', query: 'Assigned to me' },
    ];

    for (const test of testQueries) {
      logLine(`[DIAGNOSIS] Testing "${test.name}" query...`);
      try {
        const results = await state.client.getWorkItems(test.query);
        logLine(`[DIAGNOSIS] ✅ "${test.name}" returned ${results.length} work items`);

        if (results.length > 0) {
          const sample = results[0];
          logLine(
            `[DIAGNOSIS]     Sample: #${sample.id} - ${sample.fields?.['System.Title'] || 'No title'}`
          );
        }
      } catch (error: any) {
        logLine(`[DIAGNOSIS] ❌ "${test.name}" failed: ${error.message}`);
      }
    }

    // Test work item types
    logLine('[DIAGNOSIS] Testing work item types...');
    try {
      const workItemTypes = await state.client.getWorkItemTypes();
      logLine(`[DIAGNOSIS] ✅ Found ${workItemTypes.length} work item types:`);
      workItemTypes.slice(0, 5).forEach((item: { name?: string } | string) => {
        const label = typeof item === 'string' ? item : (item?.name ?? 'Unknown');
        logLine(`[DIAGNOSIS]     - ${label}`);
      });
    } catch (error: any) {
      logLine(`[DIAGNOSIS] ❌ Failed to get work item types: ${error.message}`);
    }

    // Test current provider state
    if (provider) {
      const cachedItems = provider.getWorkItems();
      logLine(`[DIAGNOSIS] ✅ Provider has ${cachedItems.length} cached work items`);

      if (cachedItems.length === 0) {
        logLine('[DIAGNOSIS] ⚠️  Provider cache is empty - this is likely the issue');
        logLine('[DIAGNOSIS] Triggering manual refresh...');

        const defaultQuery = getDefaultQuery(getConfig());
        await provider.refresh(defaultQuery);

        // Wait a moment for the refresh to complete
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const refreshedItems = provider.getWorkItems();
        logLine(`[DIAGNOSIS] After refresh: ${refreshedItems.length} work items`);

        if (refreshedItems.length > 0) {
          logLine('[DIAGNOSIS] ✅ Refresh successful! Work items should now appear in the UI.');
          vscode.window.showInformationMessage(
            'Diagnostic completed successfully. Work items should now be visible.'
          );
        } else {
          logLine(
            '[DIAGNOSIS] ❌ Refresh returned no items. This may be normal if you have no work items matching the default query.'
          );
          vscode.window.showWarningMessage(
            'No work items match the current query. Try changing the query or creating work items.'
          );
        }
      } else {
        logLine('[DIAGNOSIS] ✅ Provider cache has items - they should be visible in the UI');
        vscode.window.showInformationMessage(
          'Diagnostic completed. Work items are cached and should be visible.'
        );
      }
    } else {
      logLine('[DIAGNOSIS] ❌ No provider available');
      vscode.window.showErrorMessage('No work items provider available. Try reloading the window.');
    }

    logLine('[DIAGNOSIS] Diagnostic completed. Check the log above for details.');
  } catch (error: any) {
    logLine(`[DIAGNOSIS] ❌ Diagnostic failed: ${error.message}`);
    vscode.window.showErrorMessage(`Diagnostic failed: ${error.message}`);
  }
}

// Export for FSM machine integration
export function registerAllCommands(context: vscode.ExtensionContext): void {
  // FSM-based setup command is registered separately in the main activate function
  console.log('[registerAllCommands] Commands are already registered in the activate function');
}

export { extensionContextRef };

// Export additional functions needed by FSM adapters
export function getLoadedConnections() {
  return connections;
}

export function getActiveConnectionId(): string | null {
  return activeConnectionId ?? null;
}

export { forwardProviderMessage };

setRegisterAllCommands(registerAllCommands);
setForwardProviderMessage(forwardProviderMessage);
setGetSecretPAT(getSecretPAT);
setLoadedConnectionsReader(() => connections);
setActiveConnectionIdReader(() => activeConnectionId ?? null);
setWebviewMessageHandler(handleLegacyMessage);
setActiveConnectionHandler(async (connectionId, options) => {
  if (!extensionContextRef) {
    console.warn(
      '[activation] Active connection requested before extension context initialization'
    );
    return undefined;
  }

  return ensureActiveConnection(extensionContextRef, connectionId, options);
});
