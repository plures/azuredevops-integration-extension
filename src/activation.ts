import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { AzureDevOpsIntClient } from './azureClient.js';
import { WorkItemsProvider } from './provider.js';
import { WorkItemTimer } from './timer.js';
import { SessionTelemetryManager } from './sessionTelemetry.js';
import {
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
import type { PostWorkItemsSnapshotParams } from './webviewMessaging.js';
import type OpenAIClient from 'openai';
import { startSetupWizard } from './setupWizard.js';

// Basic state keys
const STATE_TIMER = 'azureDevOpsInt.timer.state';
const STATE_TIME_ENTRIES = 'azureDevOpsInt.timer.entries';
const STATE_LAST_SAVE = 'azureDevOpsInt.timer.lastSave';
const STATE_TIMER_CONNECTION = 'azureDevOpsInt.timer.connection';
const CONFIG_NS = 'azureDevOpsIntegration';
// Legacy settings lived under 'azureDevOps' before renaming; keep migration path
const LEGACY_CONFIG_NS = 'azureDevOps';

type ProjectConnection = {
  id: string;
  organization: string;
  project: string;
  label?: string;
  team?: string;
  patKey?: string; // Key for storing PAT in secrets
  baseUrl?: string; // Base URL for the Azure DevOps instance
};

type ConnectionState = {
  id: string;
  config: ProjectConnection;
  client?: AzureDevOpsIntClient;
  provider?: WorkItemsProvider;
  pat?: string;
};

const CONNECTIONS_CONFIG_KEY = 'connections';
const ACTIVE_CONNECTION_STATE_KEY = 'azureDevOpsInt.activeConnectionId';

let panel: vscode.WebviewView | undefined;
let provider: WorkItemsProvider | undefined;
let timer: WorkItemTimer | undefined;
let sessionTelemetry: SessionTelemetryManager | undefined;
let client: AzureDevOpsIntClient | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;
const PAT_KEY = 'azureDevOpsInt.pat';
const OPENAI_SECRET_KEY = 'azureDevOpsInt.openai.apiKey';
let viewProviderRegistered = false;
const initialRefreshedConnections = new Set<string>();
let connections: ProjectConnection[] = [];
const connectionStates = new Map<string, ConnectionState>();
let activeConnectionId: string | undefined;
type TimerConnectionInfo = {
  id?: string;
  label?: string;
  organization?: string;
  project?: string;
};
let timerConnectionInfo: TimerConnectionInfo = {};

const DEFAULT_QUERY = 'My Activity';
const activeQueryByConnection = new Map<string, string>();

function shouldLogDebug(): boolean {
  try {
    return !!getConfig().get<boolean>('debugLogging');
  } catch {
    return false;
  }
}

type WorkItemsSnapshotOptions = Omit<PostWorkItemsSnapshotParams, 'panel' | 'logger'>;

function sendToWebview(message: any) {
  postToWebview({ panel, message, logger: verbose });
}

function sendWorkItemsSnapshot(options: WorkItemsSnapshotOptions) {
  postWorkItemsSnapshot({ panel, logger: verbose, ...options });
}
function notifyConnectionsList() {
  postConnectionsUpdate({
    panel,
    connections,
    activeConnectionId,
    logger: verbose,
  });
}

function normalizeQuery(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getStoredQueryForConnection(connectionId?: string | null, fallback?: string): string {
  const resolved = fallback ?? getDefaultQuery(getConfig());
  const base = resolved && resolved.trim().length > 0 ? resolved : DEFAULT_QUERY;
  if (!connectionId) return base;
  const stored = activeQueryByConnection.get(connectionId);
  if (stored && stored.trim().length > 0) return stored;
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
  if (timerConnectionInfo.label) return timerConnectionInfo.label;
  if (timerConnectionInfo.id) {
    const match = connections.find((c) => c.id === timerConnectionInfo.id);
    if (match) return getConnectionLabel(match);
  }
  if (timerConnectionInfo.organization && timerConnectionInfo.project) {
    return `${timerConnectionInfo.organization}/${timerConnectionInfo.project}`;
  }
  return undefined;
}

function getClientForConnectionInfo(info?: TimerConnectionInfo): AzureDevOpsIntClient | undefined {
  if (info?.id) {
    const state = connectionStates.get(info.id);
    if (state?.client) return state.client;
    if (info.id === activeConnectionId && client) return client;
  }
  return client;
}

function sanitizeConnection(raw: any): ProjectConnection | null {
  if (!raw || typeof raw !== 'object') return null;
  const organization = String(raw.organization || '').trim();
  const project = String(raw.project || '').trim();
  if (!organization || !project) return null;
  const idValue = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : randomUUID();
  const labelValue =
    typeof raw.label === 'string' && raw.label.trim() ? raw.label.trim() : undefined;
  const teamValue = typeof raw.team === 'string' && raw.team.trim() ? raw.team.trim() : undefined;
  const patKeyValue =
    typeof raw.patKey === 'string' && raw.patKey.trim() ? raw.patKey.trim() : undefined;
  const baseUrlValue =
    typeof raw.baseUrl === 'string' && raw.baseUrl.trim() ? raw.baseUrl.trim() : undefined;
  return {
    id: idValue,
    organization,
    project,
    label: labelValue,
    team: teamValue,
    patKey: patKeyValue,
    baseUrl: baseUrlValue,
  };
}

async function loadConnectionsFromConfig(
  context: vscode.ExtensionContext
): Promise<ProjectConnection[]> {
  const settings = getConfig();
  const rawConnections = settings.get<any[]>(CONNECTIONS_CONFIG_KEY) ?? [];
  const normalized: ProjectConnection[] = [];
  for (const entry of rawConnections) {
    const sanitized = sanitizeConnection(entry);
    if (sanitized) {
      // Migrate existing connections to have patKey if they don't have one
      if (!sanitized.patKey) {
        sanitized.patKey = `azureDevOpsInt.pat.${sanitized.id}`;
      }

      // Migrate existing connections to have baseUrl if they don't have one
      if (!sanitized.baseUrl) {
        sanitized.baseUrl = `https://dev.azure.com/${sanitized.organization}`;
      }

      normalized.push(sanitized);
    }
  }

  if (normalized.length === 0) {
    const legacyOrg = String(settings.get<string>('organization') || '').trim();
    const legacyProject = String(settings.get<string>('project') || '').trim();
    if (legacyOrg && legacyProject) {
      const legacyTeam = String(settings.get<string>('team') || '').trim();
      normalized.push({
        id: randomUUID(),
        organization: legacyOrg,
        project: legacyProject,
        team: legacyTeam || undefined,
      });
      await settings.update(CONNECTIONS_CONFIG_KEY, normalized, vscode.ConfigurationTarget.Global);
    }
  }

  connections = normalized;

  // Migrate global PAT to first connection if needed
  if (connections.length > 0 && connections[0].patKey) {
    await migrateGlobalPATToConnection(context, connections[0]);
  }

  verbose('[connections] Loaded connections from config', {
    count: connections.length,
    ids: connections.map((c) => c.id),
  });
  const validIds = new Set(normalized.map((item) => item.id));

  for (const [id, state] of connectionStates.entries()) {
    if (!validIds.has(id)) {
      connectionStates.delete(id);
      initialRefreshedConnections.delete(id);
    } else {
      const updated = normalized.find((item) => item.id === id);
      if (updated) state.config = updated;
    }
  }

  for (const key of Array.from(activeQueryByConnection.keys())) {
    if (!validIds.has(key)) {
      activeQueryByConnection.delete(key);
    }
  }

  if (connections.length === 0) {
    activeConnectionId = undefined;
    await context.globalState.update(ACTIVE_CONNECTION_STATE_KEY, undefined);
  } else {
    let storedActive = context.globalState.get<string>(ACTIVE_CONNECTION_STATE_KEY);
    if (!storedActive || !validIds.has(storedActive)) {
      storedActive = connections[0].id;
      await context.globalState.update(ACTIVE_CONNECTION_STATE_KEY, storedActive);
    }
    activeConnectionId = storedActive;
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

  // Update legacy settings only for backward compatibility with single connection
  if (nextConnections.length === 1) {
    const primary = nextConnections[0];
    await settings.update('organization', primary.organization, vscode.ConfigurationTarget.Global);
    await settings.update('project', primary.project, vscode.ConfigurationTarget.Global);
    await settings.update('team', primary.team, vscode.ConfigurationTarget.Global);
  } else if (nextConnections.length === 0) {
    // Clear legacy settings when no connections
    await settings.update('organization', undefined, vscode.ConfigurationTarget.Global);
    await settings.update('project', undefined, vscode.ConfigurationTarget.Global);
    await settings.update('team', undefined, vscode.ConfigurationTarget.Global);
  }
  // For multiple connections, leave legacy settings as-is to avoid confusion

  const validIds = new Set(nextConnections.map((item) => item.id));
  for (const [id, state] of connectionStates.entries()) {
    if (!validIds.has(id)) {
      connectionStates.delete(id);
      initialRefreshedConnections.delete(id);
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

async function ensureActiveConnection(
  context: vscode.ExtensionContext,
  connectionId?: string,
  options: { refresh?: boolean; notify?: boolean } = {}
): Promise<ConnectionState | undefined> {
  await ensureConnectionsInitialized(context);

  const targetId = connectionId ?? activeConnectionId ?? connections[0]?.id;
  verbose('[ensureActiveConnection] evaluating target', {
    requested: connectionId,
    activeConnectionId,
    resolved: targetId,
    connectionCount: connections.length,
  });
  if (!targetId) {
    if (options.notify !== false) notifyConnectionsList();
    await vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', false);
    provider = undefined;
    client = undefined;
    return undefined;
  }

  if (targetId !== activeConnectionId) {
    activeConnectionId = targetId;
    await context.globalState.update(ACTIVE_CONNECTION_STATE_KEY, targetId);
    if (options.notify !== false) notifyConnectionsList();
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
  });

  let state = connectionStates.get(targetId);
  if (!state) {
    state = { id: targetId, config: connection };
    connectionStates.set(targetId, state);
  } else {
    state.config = connection;
  }

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

  const settings = getConfig();
  const ratePerSecond = Math.max(1, Math.min(50, settings.get<number>('apiRatePerSecond') ?? 5));
  const burst = Math.max(1, Math.min(100, settings.get<number>('apiBurst') ?? 10));
  const team = connection.team || settings.get<string>('team') || undefined;
  const providerLogger = createScopedLogger(`provider:${connection.id}`, shouldLogDebug);

  const needsNewClient =
    !state.client ||
    state.pat !== pat ||
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
    });
    state.client = new AzureDevOpsIntClient(connection.organization, connection.project, pat, {
      ratePerSecond,
      burst,
      team,
      baseUrl: connection.baseUrl,
    });
    state.pat = pat;
    if (state.provider) state.provider.updateClient(state.client);
  }

  const activeClient = state.client;
  if (!activeClient) {
    provider = undefined;
    client = undefined;
    await vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', false);
    return state;
  }

  if (!state.provider) {
    verbose('[ensureActiveConnection] creating provider', {
      id: state.id,
    });
    state.provider = new WorkItemsProvider(
      state.id,
      activeClient,
      (msg: any) => postToWebview({ panel, message: msg, logger: verbose }),
      { logger: providerLogger }
    );
  } else {
    state.provider.setPostMessage((msg: any) =>
      postToWebview({ panel, message: msg, logger: verbose })
    );
    state.provider.setLogger(providerLogger);
  }

  verbose('[ensureActiveConnection] provider ready', {
    id: state.id,
    hasClient: !!state.client,
  });

  client = activeClient;
  provider = state.provider;

  await vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', true);

  if (options.refresh !== false && provider) {
    const fallbackQuery = getDefaultQuery(settings);
    const selectedQuery = getStoredQueryForConnection(state.id, fallbackQuery);
    if (!initialRefreshedConnections.has(state.id)) {
      initialRefreshedConnections.add(state.id);
    }
    verbose('[ensureActiveConnection] triggering provider refresh', {
      id: state.id,
      query: selectedQuery,
    });
    provider.refresh(selectedQuery);
  }

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
      if (!snap || snap.isPaused) return;
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
        });
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
    onInfo: (m: any) => console.log('[timer]', m),
    onWarn: (m: any) => console.warn('[timer]', m),
    onError: (m: any) => console.error('[timer]', m),
  });
  timer.loadFromPersisted();
  return timer;
}
let extensionContextRef: vscode.ExtensionContext | undefined; // keep a reference for later ops
let cachedExtensionVersion: string | undefined; // cache package.json version for cache-busting
let openAiClient: OpenAIClient | undefined;
// Self-test tracking (prove Svelte webview round‑trip works)
// Self-test pending promise handlers (typed loosely to avoid unused param lint churn)
let selfTestPending:
  | { nonce: string; resolve: Function; reject: Function; timeout: NodeJS.Timeout }
  | undefined;

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

export function activate(context: vscode.ExtensionContext) {
  extensionContextRef = context;
  // In smoke mode (integration tests), minimize activation work to avoid any potential stalls.
  if (IS_SMOKE) {
    try {
      vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', false);
    } catch {
      /* ignore */
    }
    // Do not register views/commands or initialize any domain objects in smoke mode.
    return;
  }
  const cfg = getConfig();
  if (cfg.get<boolean>('debugLogging')) {
    const channel =
      getOutputChannel() ?? vscode.window.createOutputChannel('Azure DevOps Integration');
    setOutputChannel(channel);
    logLine('[activate] Debug logging enabled');
  }
  // Status bar (hidden until connected or timer active)
  statusBarItem = vscode.window.createStatusBarItem(
    'azureDevOpsInt.timer',
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = 'azureDevOpsInt.stopTimer';
  context.subscriptions.push(statusBarItem);

  // Register the work items webview view resolver (guard against duplicate registration)
  if (!viewProviderRegistered) {
    console.log('[azureDevOpsInt] Registering webview view provider: azureDevOpsWorkItems');
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        'azureDevOpsWorkItems',
        new AzureDevOpsIntViewProvider(context),
        { webviewOptions: { retainContextWhenHidden: true } }
      )
    );
    viewProviderRegistered = true;
  }
  // Core commands
  context.subscriptions.push(
    vscode.commands.registerCommand('azureDevOpsInt.setup', () => setupConnection(context)),
    vscode.commands.registerCommand('azureDevOpsInt.setupWizard', () => setupWizard(context)),
    vscode.commands.registerCommand('azureDevOpsInt.setOpenAIApiKey', () =>
      setOpenAIApiKey(context)
    ),
    vscode.commands.registerCommand('azureDevOpsInt.openLogs', async () => {
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
    }),
    vscode.commands.registerCommand('azureDevOpsInt.copyLogsToClipboard', async () => {
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
    }),
    vscode.commands.registerCommand('azureDevOpsInt.openLogsFolder', async () => {
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
    }),
    vscode.commands.registerCommand('azureDevOpsInt.focusWorkItemsView', () =>
      revealWorkItemsView()
    ),
    vscode.commands.registerCommand('azureDevOpsInt.setDefaultElapsedLimit', async () => {
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
    }),
    vscode.commands.registerCommand('azureDevOpsInt.showWorkItems', () => revealWorkItemsView()),
    vscode.commands.registerCommand('azureDevOpsInt.refreshWorkItems', () =>
      (async () => {
        const query = getDefaultQuery();
        verbose('[command] refreshWorkItems invoked', {
          hasProvider: !!provider,
          query,
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
        provider?.refresh(query);
      })()
    ),
    vscode.commands.registerCommand('azureDevOpsInt.createWorkItem', () => quickCreateWorkItem()),
    vscode.commands.registerCommand('azureDevOpsInt.startTimer', () => startTimerInteractive()),
    vscode.commands.registerCommand('azureDevOpsInt.pauseTimer', () => timer?.pause()),
    vscode.commands.registerCommand('azureDevOpsInt.resumeTimer', () => timer?.resume()),
    vscode.commands.registerCommand('azureDevOpsInt.stopTimer', async () => {
      if (!timer) {
        vscode.window.showInformationMessage('No active timer to stop.');
        return;
      }
      const timerConnectionSnapshot: TimerConnectionInfo = { ...timerConnectionInfo };
      setTimerConnectionFrom(undefined);
      const stopped = timer.stop();
      updateTimerContext(undefined);
      if (stopped) {
        // Show compose comment dialog in webview instead of VS Code dialogs
        sendToWebview({
          type: 'showComposeComment',
          workItemId: stopped.workItemId,
          mode: 'timerStop',
          timerData: stopped,
          connectionInfo: timerConnectionSnapshot,
        });
      }
    }),
    vscode.commands.registerCommand('azureDevOpsInt.showTimeReport', () => showTimeReport()),
    vscode.commands.registerCommand('azureDevOpsInt.createBranch', () =>
      createBranchFromWorkItem()
    ),
    vscode.commands.registerCommand('azureDevOpsInt.createPullRequest', () =>
      createPullRequestInteractive()
    ),
    vscode.commands.registerCommand('azureDevOpsInt.showPullRequests', () => showMyPullRequests()),
    vscode.commands.registerCommand('azureDevOpsInt.showBuildStatus', () => showBuildStatus()),
    vscode.commands.registerCommand('azureDevOpsInt.toggleKanbanView', () => toggleKanbanView()),
    vscode.commands.registerCommand('azureDevOpsInt.selectTeam', () => selectTeam()),
    vscode.commands.registerCommand('azureDevOpsInt.resetPreferredRepositories', () =>
      resetPreferredRepositories()
    ),
    vscode.commands.registerCommand('azureDevOpsInt.selfTestWebview', () => selfTestWebview()),
    vscode.commands.registerCommand('azureDevOpsInt.manageConnections', () =>
      manageConnections(context)
    )
  );

  // Attempt silent init if settings already present
  if (!IS_SMOKE) {
    migrateLegacyConfigIfNeeded().finally(() => silentInit(context));
  } else {
    try {
      vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', false);
    } catch {
      /* ignore */
    }
  }

  // React to configuration changes (connections, org, project, PAT) to (re)initialize without requiring reload
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (
        e.affectsConfiguration(`${CONFIG_NS}.connections`) ||
        e.affectsConfiguration(`${CONFIG_NS}.organization`) ||
        e.affectsConfiguration(`${CONFIG_NS}.project`) ||
        e.affectsConfiguration(`${CONFIG_NS}.personalAccessToken`)
      ) {
        try {
          await migrateLegacyPAT(context);
        } catch {
          /* ignore */
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
    })
  );
}

export function deactivate() {
  // noop for now
}

class AzureDevOpsIntViewProvider implements vscode.WebviewViewProvider {
  private ctx: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.ctx = context;
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    if (IS_SMOKE) {
      // Avoid doing any webview work in smoke/integration test mode
      try {
        vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', false);
      } catch {
        /* ignore */
      }
      return;
    }
    console.log('[azureDevOpsInt] resolveWebviewView invoked for view:', webviewView.viewType);
    panel = webviewView;
    const webview = webviewView.webview;
    webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.ctx.extensionUri, 'media', 'webview')],
    };

    const nonce = getNonce();
    webview.onDidReceiveMessage((msg: any) => {
      handleMessage(msg);
    });

    const html = buildMinimalWebviewHtml(this.ctx, webview, nonce);
    webview.html = html;
    if (!IS_SMOKE) {
      initDomainObjects(this.ctx).catch((err) =>
        console.error('[azureDevOpsInt] Failed to initialize domain objects', err)
      );
    } else {
      // In smoke mode, avoid heavy initialization and network calls.
      // Still send minimal ready state so the webview can render.
      sendWorkItemsSnapshot({
        connectionId: activeConnectionId,
        items: [],
        kanbanView: false,
        types: [],
        query: getStoredQueryForConnection(activeConnectionId, getDefaultQuery(getConfig())),
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

async function handleMessage(msg: any) {
  verbose('[webview->ext]', JSON.stringify(msg));

  // Handle async cases first
  if (msg?.type === 'editWorkItemInEditor') {
    const id: number | undefined = typeof msg.workItemId === 'number' ? msg.workItemId : undefined;
    if (typeof id === 'number' && provider) {
      editWorkItemInEditor(id);
    }
    return;
  }

  switch (msg?.type) {
    case 'webviewReady': {
      // Re-send current cached state (avoid race where initial post happened before listener attached)
      if (panel) {
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
      verbose('[setQuery] applied new query', {
        connectionId: targetId,
        query: storedQuery,
        hasProvider: !!targetProvider,
      });
      targetProvider?.refresh(storedQuery);
      break;
    }
    case 'switchConnection':
    case 'setActiveConnection': {
      const targetId = typeof msg.connectionId === 'string' ? msg.connectionId.trim() : '';
      if (!targetId) {
        verbose('[setActiveConnection] missing connectionId in message');
        break;
      }
      if (!extensionContextRef) {
        verbose('[setActiveConnection] missing extension context');
        break;
      }
      try {
        const state = await ensureActiveConnection(extensionContextRef, targetId, {
          refresh: false,
        });
        const activeProvider = state?.provider;
        const cfg = getConfig();
        const selectedQuery = getStoredQueryForConnection(targetId, getDefaultQuery(cfg));
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
          // still trigger a background refresh to keep results current
          setTimeout(() => {
            try {
              activeProvider.refresh(selectedQuery);
            } catch (e: any) {
              verbose('[setActiveConnection] refresh after cached post failed', e?.message || e);
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
      } catch (e: any) {
        console.error('[setActiveConnection] failed', e);
        vscode.window.showErrorMessage(
          'Failed to switch Azure DevOps project: ' + (e?.message || String(e))
        );
      }
      break;
    }
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
      break;
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
      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Stop Timer & Apply Time', action: 'stop' },
          { label: 'Generate Copilot Summary & Continue', action: 'copilot' },
        ],
        {
          placeHolder: 'What would you like to do?',
          ignoreFocusOut: true,
        }
      );

      if (!choice) return; // User cancelled

      if (choice.action === 'stop') {
        const timerConnectionSnapshot: TimerConnectionInfo = { ...timerConnectionInfo };
        setTimerConnectionFrom(undefined);
        const stopped = timer?.stop();
        updateTimerContext(undefined);
        if (stopped) {
          try {
            // The `false` here is to prevent offering the copilot prompt again.
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
      } else if (choice.action === 'copilot') {
        await generateCopilotPromptWithoutStopping();
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
      let comment: string | undefined =
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

async function migrateGlobalPATToConnection(
  context: vscode.ExtensionContext,
  connection: ProjectConnection
): Promise<void> {
  if (!connection.patKey) return;

  // Check if connection already has a PAT
  const existingPAT = await context.secrets.get(connection.patKey);
  if (existingPAT) return; // Already migrated

  // Check if global PAT exists
  const globalPAT = await context.secrets.get(PAT_KEY);
  if (globalPAT) {
    // Migrate global PAT to connection-specific key
    await context.secrets.store(connection.patKey, globalPAT);
    console.log(`[azureDevOpsInt] Migrated global PAT to connection ${connection.id}`);
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
  return context.secrets.get(PAT_KEY);
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
  let html: string;

  try {
    html = fs.readFileSync(htmlPath, 'utf8');
  } catch (error) {
    console.error('[azureDevOpsInt] Failed to read HTML file:', error);
    // Fallback to basic HTML if file read fails
    return `<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Failed to load webview</h1></body></html>`;
  }

  // Get media URIs for replacement
  const mediaRoot = vscode.Uri.joinPath(context.extensionUri, 'media', 'webview');
  const version = getExtensionVersion(context);
  // Load svelte-main.js exclusively
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, 'svelte-main.js'));
  // Append a cache-busting version query so VS Code doesn’t serve stale cached assets after upgrade
  const scriptUriWithVersion = scriptUri.with({ query: `v=${encodeURIComponent(version)}` });
  const scriptUriStr = scriptUriWithVersion.toString();

  // Include the extracted CSS bundle
  let cssLinkTag = '';
  try {
    const cssFsPath = path.join(context.extensionPath, 'media', 'webview', 'svelte-main.css');
    if (fs.existsSync(cssFsPath)) {
      const cssUri = webview
        .asWebviewUri(vscode.Uri.joinPath(mediaRoot, 'svelte-main.css'))
        .with({ query: `v=${encodeURIComponent(version)}` })
        .toString();
      cssLinkTag = `<link rel="stylesheet" href="${cssUri}" />`;
    }
  } catch {
    // ignore css injection errors; webview will still work but unstyled
  }

  // Update CSP and script nonces
  const csp = `default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource}`;
  const consoleBridge = `(function(){try{var vs=window.vscode||acquireVsCodeApi();['log','warn','error'].forEach(function(m){var orig=console[m];console[m]=function(){try{vs.postMessage({type:'webviewConsole', level:m, args:Array.from(arguments).map(a=>{try{return a&&a.stack?String(a.stack):typeof a==='object'?JSON.stringify(a):String(a);}catch{return String(a);}})});}catch{};return orig.apply(console,arguments);};});console.log('[webview] Azure DevOps Integration v${version}');}catch(e){/* ignore */}})();`;

  // Replace placeholders in the static HTML
  html = html.replace(
    '<meta charset="UTF-8">',
    `<meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="${csp}">`
  );

  // Replace script source
  html = html.replace('./svelte-main.js', scriptUriStr);

  // Inject CSS link just before </head> if available
  if (cssLinkTag) {
    html = html.replace('</head>', `${cssLinkTag}\n</head>`);
  }

  html = html.replace(
    '<script type="module" crossorigin src="' + scriptUriStr + '"></script>',
    `<script nonce="${nonce}">(function(){try{if(!window.vscode){window.vscode=acquireVsCodeApi();}}catch(e){console.error('[webview] acquireVsCodeApi failed',e);}})();</script>` +
      `<script nonce="${nonce}">${consoleBridge}</script>` +
      `<script type="module" nonce="${nonce}" src="${scriptUriStr}"></script>`
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
  let action: 'add' | 'remove' | undefined;

  if (!hasExistingConnections) {
    action = 'add';
  } else {
    const pick = await vscode.window.showQuickPick(
      [
        {
          label: 'Add project connection…',
          description: 'Connect to another organization/project',
          action: 'add' as const,
        },
        {
          label: 'Remove project connection…',
          description: 'Disconnect an existing project',
          action: 'remove' as const,
        },
      ],
      {
        placeHolder: 'Manage Azure DevOps project connections',
        ignoreFocusOut: true,
      }
    );
    action = pick?.action;
  }

  if (action === 'add') {
    const added = await promptAddConnection(context);
    if (added) {
      ensureTimer(context);
    }
  } else if (action === 'remove') {
    const removed = await promptRemoveConnection(context);
    if (removed) {
      ensureTimer(context);
    }
  }
}

async function setupWizard(context: vscode.ExtensionContext) {
  try {
    const success = await startSetupWizard(context);
    if (success) {
      // Refresh the connection after successful setup
      await ensureConnectionsInitialized(context);
      await ensureActiveConnection(context, undefined, { refresh: true });
      ensureTimer(context);
    }
  } catch (error) {
    console.error('[setupWizard] Error:', error);
    vscode.window.showErrorMessage(
      `Setup wizard failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

async function manageConnections(context: vscode.ExtensionContext): Promise<void> {
  await ensureConnectionsInitialized(context);

  const connectionItems = connections.map((conn, index) => ({
    label: conn.label || `${conn.organization}/${conn.project}`,
    description: conn.team ? `Team: ${conn.team}` : undefined,
    detail: `Organization: ${conn.organization}, Project: ${conn.project}`,
    connection: conn,
    index,
  }));

  const choices = [
    { label: 'Add New Connection', action: 'add' as const },
    { label: 'Edit Connection', action: 'edit' as const },
    { label: 'Delete Connection', action: 'delete' as const },
    { label: 'Cancel', action: 'cancel' as const },
  ];

  const action = await vscode.window.showQuickPick(choices, {
    placeHolder: 'Manage Azure DevOps Connections',
    ignoreFocusOut: true,
  });

  if (!action || action.action === 'cancel') {
    return;
  }

  switch (action.action) {
    case 'add':
      await startSetupWizard(context);
      break;
    case 'edit': {
      if (connectionItems.length === 0) {
        vscode.window.showInformationMessage('No connections to edit. Add a connection first.');
        return;
      }
      const selectedConnection = await vscode.window.showQuickPick(connectionItems, {
        placeHolder: 'Select a connection to edit',
        ignoreFocusOut: true,
      });
      if (selectedConnection) {
        // Pre-populate wizard with existing connection data
        // This would need to be implemented in the wizard
        await startSetupWizard(context);
      }
      break;
    }
    case 'delete': {
      if (connectionItems.length === 0) {
        vscode.window.showInformationMessage('No connections to delete.');
        return;
      }
      const connectionToDelete = await vscode.window.showQuickPick(connectionItems, {
        placeHolder: 'Select a connection to delete',
        ignoreFocusOut: true,
      });
      if (connectionToDelete) {
        const confirm = await vscode.window.showWarningMessage(
          `Are you sure you want to delete the connection "${connectionToDelete.label}"?`,
          'Yes, Delete',
          'Cancel'
        );
        if (confirm === 'Yes, Delete') {
          // Delete the connection's PAT from secrets
          if (connectionToDelete.connection.patKey) {
            await context.secrets.delete(connectionToDelete.connection.patKey);
          }

          const updatedConnections = connections.filter(
            (conn) => conn.id !== connectionToDelete.connection.id
          );
          await saveConnectionsToConfig(context, updatedConnections);
          vscode.window.showInformationMessage('Connection deleted successfully.');
        }
      }
      break;
    }
  }
}

async function promptAddConnection(context: vscode.ExtensionContext): Promise<boolean> {
  const existingPat = await getSecretPAT(context);

  const lastConnection = connections[connections.length - 1];
  const org = await vscode.window.showInputBox({
    prompt: 'Azure DevOps organization (short name)',
    value: lastConnection?.organization ?? '',
    ignoreFocusOut: true,
  });
  if (!org) return false;

  const project = await vscode.window.showInputBox({
    prompt: 'Azure DevOps project name',
    value: lastConnection?.project ?? '',
    ignoreFocusOut: true,
  });
  if (!project) return false;

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

  let pat = existingPat;
  if (pat) {
    const patChoice = await vscode.window.showQuickPick(
      [
        { label: 'Use saved Personal Access Token', action: 'reuse' as const },
        { label: 'Enter a new Personal Access Token…', action: 'update' as const },
      ],
      {
        placeHolder: 'Choose how to authenticate with Azure DevOps',
        ignoreFocusOut: true,
      }
    );
    if (!patChoice) {
      vscode.window.showInformationMessage('Setup cancelled without updating connections.');
      return false;
    }
    if (patChoice.action === 'update') {
      const entered = await vscode.window.showInputBox({
        prompt: 'Personal Access Token (scopes: Work Items Read/Write)',
        password: true,
        ignoreFocusOut: true,
      });
      if (!entered || !entered.trim()) {
        vscode.window.showWarningMessage('A Personal Access Token is required to complete setup.');
        return false;
      }
      pat = entered.trim();
      await context.secrets.store(PAT_KEY, pat);
    }
  } else {
    const entered = await vscode.window.showInputBox({
      prompt: 'Personal Access Token (scopes: Work Items Read/Write)',
      password: true,
      ignoreFocusOut: true,
    });
    if (!entered || !entered.trim()) {
      vscode.window.showWarningMessage('A Personal Access Token is required to complete setup.');
      return false;
    }
    pat = entered.trim();
    await context.secrets.store(PAT_KEY, pat);
  }

  const newConnection: ProjectConnection = {
    id: randomUUID(),
    organization: org.trim(),
    project: project.trim(),
    label: label?.trim() ? label.trim() : undefined,
    team: team?.trim() ? team.trim() : undefined,
  };

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
  vscode.commands.executeCommand('workbench.view.extension.azureDevOpsIntegration');
  // Also explicitly focus the view to force creation/resolve if VS Code didn't materialize it yet.
  // VS Code generates a '<viewId>.focus' command for contributed views.
  setTimeout(() => {
    try {
      vscode.commands.executeCommand('azureDevOpsWorkItems.focus');
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
        provider = client
          ? new WorkItemsProvider(
              'default',
              client,
              (m: any) => postToWebview({ panel, message: m, logger: verbose }),
              {}
            )
          : provider;
        // refresh view if attached
        provider?.refresh(getDefaultQuery(cfg));
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
    wi.fields?.['System.Title'] || `#${wi.id}`
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

function updateTimerContext(s: any) {
  const running = !!s && !s.isPaused;
  const paused = !!s && s.isPaused;
  vscode.commands.executeCommand('setContext', 'azureDevOpsInt.timerActive', !!s);
  vscode.commands.executeCommand('setContext', 'azureDevOpsInt.timerRunning', running);
  vscode.commands.executeCommand('setContext', 'azureDevOpsInt.timerPaused', paused);
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
// Export handleMessage for testing
export { handleMessage };

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
  const clientForTimer = getClientForConnectionInfo(options?.connection);
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

async function generateCopilotPromptWithoutStopping() {
  const snap = timer?.snapshot();
  if (!snap) {
    vscode.window.showWarningMessage('No active timer to generate a prompt for.');
    return;
  }

  const timerConnectionSnapshot: TimerConnectionInfo = { ...timerConnectionInfo };
  const clientForTimer = getClientForConnectionInfo(timerConnectionSnapshot);
  if (!clientForTimer) {
    vscode.window.showWarningMessage(
      'No Azure DevOps connection is available for the running timer. Connect and try again.'
    );
    return;
  }

  const workItemId = Number(snap.workItemId);
  if (!workItemId) {
    vscode.window.showWarningMessage('Active timer is missing a work item.');
    return;
  }

  const previousClient = client;
  try {
    client = clientForTimer;
    await produceWorkItemSummary({
      workItemId,
      entrySeed: {
        startTime: typeof snap.startTime === 'number' ? snap.startTime : undefined,
        endTime: Date.now(),
        duration: typeof snap.elapsedSeconds === 'number' ? snap.elapsedSeconds : undefined,
        hoursDecimal:
          typeof snap.elapsedSeconds === 'number' ? snap.elapsedSeconds / 3600 : undefined,
      },
      reason: 'manualPrompt',
      stillRunningTimer: true,
    });
  } catch (e: any) {
    console.error('Failed to create Copilot prompt', e);
    vscode.window.showErrorMessage(
      'Failed to generate Copilot prompt: ' + (e?.message || String(e))
    );
  } finally {
    client = previousClient;
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
