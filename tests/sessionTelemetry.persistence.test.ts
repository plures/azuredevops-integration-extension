import { expect } from 'chai';
import * as os from 'node:os';
import * as path from 'node:path';
import { promises as fsp } from 'node:fs';
import * as vscode from 'vscode';

import { SessionTelemetryManager } from '../src/sessionTelemetry.ts';
import { TelemetryDatabase } from '../src/telemetryDatabase.ts';

const TELEMETRY_STATE_KEY = 'azureDevOpsIntegration.sessionTelemetry.lastRecord';

describe('SessionTelemetryManager persistence', () => {
  let tempDir: string;
  let originalGetConfiguration: typeof vscode.workspace.getConfiguration;

  const stateStore = new Map<string, unknown>();
  const workspaceState = {
    get: (key: string) => stateStore.get(key),
    update: async (key: string, value: unknown) => {
      stateStore.set(key, value);
    },
  };

  const createContext = () =>
    ({
      workspaceState,
      globalStorageUri: vscode.Uri.file(tempDir),
    }) as unknown as vscode.ExtensionContext;

  const configureWorkspace = (values: Record<string, unknown>) => {
    (vscode.workspace as any).getConfiguration = () => ({
      get: (key: string, fallback?: unknown) => {
        const normalized = key.toLowerCase();
        const hit = Object.prototype.hasOwnProperty.call(values, key)
          ? values[key]
          : Object.prototype.hasOwnProperty.call(values, normalized)
            ? values[normalized]
            : undefined;
        return hit !== undefined ? hit : fallback;
      },
    });
  };

  const triggerSave = (relativePath: string, contents = 'content') => {
    const filePath = path.join(tempDir, relativePath);
    const uri = vscode.Uri.file(filePath);
    return (vscode.workspace as any).triggerDidSaveTextDocument({
      uri,
      languageId: 'typescript',
      getText: () => contents,
    });
  };

  const fileExists = async (fsPath: string) => {
    try {
      await fsp.stat(fsPath);
      return true;
    } catch {
      return false;
    }
  };

  beforeEach(async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'ado-telemetry-'));
    originalGetConfiguration = vscode.workspace.getConfiguration;
    (vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.file(tempDir) }];
    stateStore.clear();
  });

  afterEach(async () => {
    (vscode.workspace as any).getConfiguration = originalGetConfiguration;
    (vscode.workspace as any).workspaceFolders = [];
    await fsp.rm(tempDir, { recursive: true, force: true });
  });

  it('persists sessions to SQLite when storageMode is sqlite', async () => {
    const sqlitePath = path.join(tempDir, 'telemetry.sqlite');
    configureWorkspace({
      'sessionTelemetry.enableCapture': true,
      'sessionTelemetry.storageMode': 'sqlite',
      'sessionTelemetry.sqlitePath': sqlitePath,
    });

    const context = createContext();
    const manager = new SessionTelemetryManager(context);
    await manager.startSession({ workItemId: 42, workItemTitle: 'Persists' });

    triggerSave('src/example.ts', 'const x = 1;');

    const now = Date.now();
    await manager.handleTimerStop({
      workItemId: 42,
      duration: 120000,
      hoursDecimal: 0.5,
      startTime: now - 120000,
      endTime: now,
      capApplied: false,
      capLimitHours: undefined,
    });

    expect(await fileExists(sqlitePath)).to.equal(true, 'expected sqlite database on disk');
    expect(stateStore.has(TELEMETRY_STATE_KEY)).to.equal(
      false,
      'fallback workspace state should not be used'
    );

    const db = new TelemetryDatabase(context, { storageFile: vscode.Uri.file(sqlitePath) });
    const sessions = await db.getSessions();
    expect(sessions.length).to.be.greaterThan(0);
    const [record] = sessions;
    expect(record.workItemId).to.equal(42);
    expect(record.workItemTitle).to.equal('Persists');
  });

  it('falls back to workspaceState when storageMode is workspaceState', async () => {
    const sqlitePath = path.join(tempDir, 'telemetry.sqlite');
    configureWorkspace({
      'sessionTelemetry.enableCapture': true,
      'sessionTelemetry.storageMode': 'workspaceState',
      'sessionTelemetry.sqlitePath': sqlitePath,
    });

    const context = createContext();
    const manager = new SessionTelemetryManager(context);
    await manager.startSession({ workItemId: 7, workItemTitle: 'Fallback' });

    const now = Date.now();
    await manager.handleTimerStop({
      workItemId: 7,
      duration: 60000,
      hoursDecimal: 0.25,
      startTime: now - 60000,
      endTime: now,
      capApplied: false,
      capLimitHours: undefined,
    });

    expect(stateStore.has(TELEMETRY_STATE_KEY)).to.equal(
      true,
      'workspaceState should persist record'
    );
    expect(await fileExists(sqlitePath)).to.equal(
      false,
      'sqlite file should not be created when storage is workspaceState'
    );
  });
});
