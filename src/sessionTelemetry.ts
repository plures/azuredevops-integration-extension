/**
 * Module: src/sessionTelemetry.ts
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
import { randomUUID } from 'crypto';

import { execFile } from 'child_process';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { TelemetryDatabase } from './telemetryDatabase.js';
import { createLogger } from './logging/unifiedLogger.js';

const logger = createLogger('sessionTelemetry');

const execFileAsync = promisify(execFile);

type SessionEvent = {
  id: string;
  type: string;
  timestamp: number;
  payload: Record<string, unknown>;
};

type GitSnapshot = {
  branch?: string;
  commit?: string;
  upstream?: string;
  ahead?: number;
  behind?: number;
  workingTree?: string[];
  staged?: string[];
  merge?: string[];
  statusShort?: string;
  diffStat?: string;
  diffStatStaged?: string;
};

type ActiveSession = {
  sessionId: string;
  workItemId: number;
  workItemTitle: string;
  startedAt: number;
  repoPath?: string;
  baseline?: GitSnapshot;
  events: SessionEvent[];
  disposables: vscode.Disposable[];
  repo?: any;
};

type SessionRecord = {
  sessionId: string;
  workItemId: number;
  workItemTitle: string;
  startedAt: number;
  stoppedAt: number;
  timerHours?: number;
  capApplied?: boolean;
  capLimitHours?: number;
  baseline?: GitSnapshot;
  finalSnapshot?: GitSnapshot;
  events: SessionEvent[];
};

const TELEMETRY_STORAGE_KEY = 'azureDevOpsIntegration.sessionTelemetry.lastRecord';
const CAPTURE_CONFIG_KEY = 'sessionTelemetry.enableCapture';
const STORAGE_MODE_CONFIG_KEY = 'sessionTelemetry.storageMode';
const SQLITE_PATH_CONFIG_KEY = 'sessionTelemetry.sqlitePath';
const GIT_STATUS_THROTTLE_MS = 4000;

type TelemetryStorageMode = 'sqlite' | 'workspaceState';

async function runGitCommand(repoPath: string, args: string[]): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd: repoPath,
      encoding: 'utf8',
      windowsHide: true,
    });
    return stdout.trim();
  } catch (error) {
    logger.warn('git command failed', { meta: { args, error } });
    return undefined;
  }
}

function asRelativePath(uri: vscode.Uri | undefined): string | undefined {
  if (!uri) return undefined;
  const workspace = vscode.workspace.getWorkspaceFolder(uri);
  if (workspace) {
    return vscode.workspace.asRelativePath(uri, false);
  }
  return uri.fsPath;
}

export class SessionTelemetryManager {
  private readonly context: vscode.ExtensionContext;
  private gitApi: any | undefined;
  private activeSession: ActiveSession | undefined;
  private pendingGitPulse: NodeJS.Timeout | undefined;
  private telemetryDb: TelemetryDatabase | undefined;
  private telemetryDbUri: vscode.Uri | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  get isActive() {
    return !!this.activeSession;
  }

  async ensureGitApi(): Promise<any | undefined> {
    if (this.gitApi) return this.gitApi;
    try {
      const gitExt = vscode.extensions.getExtension('vscode.git');
      if (!gitExt) return undefined;
      const api = gitExt.isActive
        ? gitExt.exports.getAPI?.(1)
        : (await gitExt.activate()).getAPI?.(1);
      this.gitApi = api;
      return api;
    } catch (error) {
      logger.warn('Failed to acquire git API', { meta: error });
      return undefined;
    }
  }

  async startSession(args: { workItemId: number; workItemTitle: string }) {
    const config = vscode.workspace.getConfiguration('azureDevOpsIntegration');
    const enabled = config.get<boolean>(CAPTURE_CONFIG_KEY, true);
    if (!enabled) {
      this.disposeSession();
      return;
    }

    if (this.activeSession) {
      await this.finalizeSession({ reason: 'overlapping-start' });
    }

    const sessionId = randomUUID();
    const startedAt = Date.now();
    const repo = await this.getPrimaryRepository();
    const repoPath = repo?.rootUri?.fsPath ?? undefined;
    const baseline = repoPath ? await this.captureGitSnapshot(repo, repoPath) : undefined;

    const events: SessionEvent[] = [];
    const disposables: vscode.Disposable[] = [];

    if (repo && typeof repo.state?.onDidChange === 'function') {
      const repoListener = repo.state.onDidChange(() => this.queueGitPulse(repo, 'state-change'));
      disposables.push(repoListener);
    }

    const saveListener = vscode.workspace.onDidSaveTextDocument((doc) => {
      if (!this.activeSession) return;
      const relative = asRelativePath(doc.uri);
      if (!relative) return;
      this.recordEvent('workspace:file-save', {
        file: relative,
        languageId: doc.languageId,
        byteLength: doc.getText().length,
      });
    });
    disposables.push(saveListener);

    this.activeSession = {
      sessionId,
      workItemId: args.workItemId,
      workItemTitle: args.workItemTitle,
      startedAt,
      repoPath,
      baseline,
      events,
      disposables,
      repo,
    };

    this.recordEvent('timer:start', {
      workItemId: args.workItemId,
      workItemTitle: args.workItemTitle,
      baseline,
    });
  }

  async handleTimerStop(entry: {
    workItemId: number;
    duration: number;
    hoursDecimal?: number;
    startTime: number;
    endTime: number;
    capApplied?: boolean;
    capLimitHours?: number;
  }) {
    await this.finalizeSession({ reason: 'timer-stop', entry });
  }

  disposeSession() {
    if (!this.activeSession) return;
    for (const d of this.activeSession.disposables) {
      try {
        d.dispose();
      } catch {
        /* ignore dispose errors */
      }
    }
    this.activeSession = undefined;
    if (this.pendingGitPulse) {
      clearTimeout(this.pendingGitPulse);
      this.pendingGitPulse = undefined;
    }
  }

  private recordEvent(type: string, payload: Record<string, unknown>) {
    if (!this.activeSession) return;
    const event: SessionEvent = {
      id: randomUUID(),
      type,
      timestamp: Date.now(),
      payload,
    };
    this.activeSession.events.push(event);
  }

  private queueGitPulse(repo: any, reason: string) {
    if (!this.activeSession || !this.activeSession.repoPath) return;
    if (this.pendingGitPulse) return;
    this.pendingGitPulse = setTimeout(async () => {
      this.pendingGitPulse = undefined;
      const snapshot = await this.captureGitSnapshot(repo, this.activeSession?.repoPath!, reason);
      if (snapshot) {
        this.recordEvent('git:status', { reason, snapshot });
      }
    }, GIT_STATUS_THROTTLE_MS);
  }

  private async finalizeSession(options: {
    reason: string;
    entry?: {
      workItemId: number;
      duration: number;
      hoursDecimal?: number;
      startTime: number;
      endTime: number;
      capApplied?: boolean;
      capLimitHours?: number;
    };
  }) {
    if (!this.activeSession) return;
    const session = this.activeSession;
    const repo = session.repo;
    const repoPath = session.repoPath;
    let finalSnapshot: GitSnapshot | undefined;
    if (repo && repoPath) {
      finalSnapshot = await this.captureGitSnapshot(repo, repoPath, options.reason);
      if (finalSnapshot) {
        this.recordEvent('git:status', {
          reason: `${options.reason}:final`,
          snapshot: finalSnapshot,
        });
      }
    }

    const stoppedAt = Date.now();
    if (options.entry) {
      this.recordEvent('timer:stop', {
        workItemId: options.entry.workItemId,
        duration: options.entry.duration,
        hoursDecimal: options.entry.hoursDecimal,
        startTime: options.entry.startTime,
        endTime: options.entry.endTime,
        capApplied: options.entry.capApplied,
        capLimitHours: options.entry.capLimitHours,
      });
    } else {
      this.recordEvent('timer:stop', { reason: options.reason });
    }

    const record: SessionRecord = {
      sessionId: session.sessionId,
      workItemId: session.workItemId,
      workItemTitle: session.workItemTitle,
      startedAt: session.startedAt,
      stoppedAt,
      timerHours: options.entry?.hoursDecimal,
      capApplied: options.entry?.capApplied,
      capLimitHours: options.entry?.capLimitHours,
      baseline: session.baseline,
      finalSnapshot,
      events: [...session.events],
    };

    await this.persistRecord(record);
    this.disposeSession();
  }

  private async persistRecord(record: SessionRecord) {
    try {
      if (this.getStorageMode() === 'sqlite') {
        const db = await this.ensureTelemetryDb();
        if (db) {
          await db.persistSession(record);
          return;
        }
      }
      await this.context.workspaceState.update(TELEMETRY_STORAGE_KEY, record);
    } catch (error) {
      logger.warn('Failed to persist session record', { meta: error });
      // fallback to workspaceState
      try {
        await this.context.workspaceState.update(TELEMETRY_STORAGE_KEY, record);
      } catch {
        // ignore secondary persist errors
      }
    }
  }

  private getStorageMode(): TelemetryStorageMode {
    const config = vscode.workspace.getConfiguration('azureDevOpsIntegration');
    const value = (config.get<string>(STORAGE_MODE_CONFIG_KEY, 'sqlite') || '').toLowerCase();
    return value === 'workspacestate' ? 'workspaceState' : 'sqlite';
  }

  private async ensureTelemetryDb(): Promise<TelemetryDatabase | undefined> {
    const mode = this.getStorageMode();
    if (mode !== 'sqlite') {
      this.telemetryDb = undefined;
      this.telemetryDbUri = undefined;
      return undefined;
    }

    const sqliteUri = await this.resolveSqliteUri();
    if (!sqliteUri) return undefined;

    if (
      !this.telemetryDb ||
      !this.telemetryDbUri ||
      this.telemetryDbUri.fsPath !== sqliteUri.fsPath
    ) {
      try {
        this.telemetryDb = new TelemetryDatabase(this.context, { storageFile: sqliteUri });
        this.telemetryDbUri = sqliteUri;
      } catch (error) {
        logger.warn('Failed to create TelemetryDatabase, falling back to workspaceState', {
          meta: error,
        });
        // Auto-fallback to workspaceState mode when SQLite initialization fails
        const config = vscode.workspace.getConfiguration('azureDevOpsIntegration');
        await config.update(
          STORAGE_MODE_CONFIG_KEY,
          'workspaceState',
          vscode.ConfigurationTarget.Global
        );
        this.telemetryDb = undefined;
        this.telemetryDbUri = undefined;
        return undefined;
      }
    }

    return this.telemetryDb;
  }

  private async resolveSqliteUri(): Promise<vscode.Uri | undefined> {
    const config = vscode.workspace.getConfiguration('azureDevOpsIntegration');
    const rawSetting = config.get<string>(SQLITE_PATH_CONFIG_KEY, '')?.trim();
    if (!rawSetting) {
      return vscode.Uri.joinPath(this.context.globalStorageUri, 'session-telemetry.sqlite');
    }

    const expanded = rawSetting.startsWith('~')
      ? path.join(os.homedir(), rawSetting.slice(1))
      : rawSetting;
    const candidate = path.isAbsolute(expanded)
      ? expanded
      : this.resolveRelativeSqlitePath(expanded);

    if (!candidate) return undefined;
    return vscode.Uri.file(candidate);
  }

  private resolveRelativeSqlitePath(relPath: string): string | undefined {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (workspaceFolder) {
      return path.join(workspaceFolder, relPath);
    }
    return path.join(this.context.globalStorageUri.fsPath, relPath);
  }

  private async getPrimaryRepository(): Promise<any | undefined> {
    const api = await this.ensureGitApi();
    if (!api) return undefined;
    const repo = api.repositories?.[0];
    return repo;
  }

  private async captureGitSnapshot(
    repo: any,
    repoPath: string,
    reason?: string
  ): Promise<GitSnapshot> {
    try {
      const head = repo?.state?.HEAD;
      const workingTree = Array.isArray(repo?.state?.workingTreeChanges)
        ? (repo.state.workingTreeChanges
            .map((change: any) => asRelativePath(change.resourceUri || change.uri))
            .filter(Boolean) as string[])
        : [];
      const staged = Array.isArray(repo?.state?.indexChanges)
        ? (repo.state.indexChanges
            .map((change: any) => asRelativePath(change.resourceUri || change.uri))
            .filter(Boolean) as string[])
        : [];
      const merge = Array.isArray(repo?.state?.mergeChanges)
        ? (repo.state.mergeChanges
            .map((change: any) => asRelativePath(change.resourceUri || change.uri))
            .filter(Boolean) as string[])
        : [];

      const statusShort = await runGitCommand(repoPath, ['status', '--short']);
      const diffStat = await runGitCommand(repoPath, ['diff', '--stat']);
      const diffStatStaged = await runGitCommand(repoPath, ['diff', '--stat', '--cached']);

      return {
        branch: head?.name,
        commit: head?.commit,
        upstream: head?.upstream?.name,
        ahead: head?.ahead,
        behind: head?.behind,
        workingTree,
        staged,
        merge,
        statusShort,
        diffStat,
        diffStatStaged,
      };
    } catch (error) {
      logger.warn('captureGitSnapshot failed', { meta: { reason, error } });
      return {};
    }
  }
}
