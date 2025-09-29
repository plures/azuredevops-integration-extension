import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import * as path from 'node:path';
import * as vscode from 'vscode';

type TelemetryDatabaseOptions = {
  storageFile?: vscode.Uri;
};

export class TelemetryDatabase {
  private db: Database | undefined;
  private sqlJs: SqlJsStatic | undefined;
  private ready: Promise<void>;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly options: TelemetryDatabaseOptions = {}
  ) {
    this.ready = this.init();
  }

  async persistSession(record: {
    sessionId: string;
    workItemId: number;
    workItemTitle: string;
    startedAt: number;
    stoppedAt: number;
    timerHours?: number;
    capApplied?: boolean;
    capLimitHours?: number;
    baseline?: unknown;
    finalSnapshot?: unknown;
    events: Array<{
      id: string;
      type: string;
      timestamp: number;
      payload: unknown;
    }>;
  }) {
    await this.ready;
    if (!this.db) return;
    this.db.run(
      `INSERT OR REPLACE INTO session (sessionId, workItemId, workItemTitle, startedAt, stoppedAt, timerHours, capApplied, capLimitHours, baseline, finalSnapshot)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`.trim(),
      [
        record.sessionId,
        record.workItemId,
        record.workItemTitle,
        record.startedAt,
        record.stoppedAt,
        record.timerHours ?? null,
        record.capApplied ? 1 : 0,
        record.capLimitHours ?? null,
        record.baseline ? JSON.stringify(record.baseline) : null,
        record.finalSnapshot ? JSON.stringify(record.finalSnapshot) : null,
      ]
    );
    for (const event of record.events) {
      this.db.run(
        `INSERT OR REPLACE INTO event (id, sessionId, type, timestamp, payload) VALUES (?, ?, ?, ?, ?)`.trim(),
        [
          event.id,
          record.sessionId,
          event.type,
          event.timestamp,
          event.payload ? JSON.stringify(event.payload) : null,
        ]
      );
    }
    await this.save();
  }

  async getSessions() {
    await this.ready;
    if (!this.db) return [];
    const stmt = this.db.prepare('SELECT * FROM session ORDER BY startedAt DESC');
    const sessions: Array<Record<string, unknown>> = [];
    try {
      while (stmt.step()) {
        const row = stmt.getAsObject();
        row.baseline = row.baseline ? JSON.parse(row.baseline as string) : undefined;
        row.finalSnapshot = row.finalSnapshot ? JSON.parse(row.finalSnapshot as string) : undefined;
        sessions.push(row);
      }
    } finally {
      stmt.free();
    }
    return sessions;
  }

  private async init() {
    this.sqlJs = await initSqlJs();
    const bytes = await this.loadFromDisk();
    this.db = this.sqlJs ? new this.sqlJs.Database(bytes ?? undefined) : undefined;
    this.createTables();
  }

  private createTables() {
    if (!this.db) return;
    this.db.run(
      `CREATE TABLE IF NOT EXISTS session (
         sessionId TEXT PRIMARY KEY,
         workItemId INTEGER,
         workItemTitle TEXT,
         startedAt INTEGER,
         stoppedAt INTEGER,
         timerHours REAL,
         capApplied INTEGER,
         capLimitHours REAL,
         baseline TEXT,
         finalSnapshot TEXT
       );
       CREATE TABLE IF NOT EXISTS event (
         id TEXT PRIMARY KEY,
         sessionId TEXT,
         type TEXT,
         timestamp INTEGER,
         payload TEXT
       );`
    );
  }

  private async save() {
    if (!this.db) return;
    const storageFile = await this.ensureStorageFile();
    if (!storageFile) return;
    const data = this.db.export();
    await vscode.workspace.fs.writeFile(storageFile, data);
  }

  private async loadFromDisk(): Promise<Uint8Array | undefined> {
    const storageFile = await this.ensureStorageFile(false);
    if (!storageFile) return undefined;
    try {
      const bytes = await vscode.workspace.fs.readFile(storageFile);
      return bytes;
    } catch (error) {
      if (
        (error as { code?: string }).code === 'FileNotFound' ||
        (error as any)?.name === 'EntryNotFound'
      ) {
        return undefined;
      }
      console.warn('[telemetryDatabase] Failed to read existing database', error);
      return undefined;
    }
  }

  private async ensureStorageFile(createDir = true): Promise<vscode.Uri | undefined> {
    const target =
      this.options.storageFile ??
      vscode.Uri.joinPath(this.context.globalStorageUri, 'telemetry.sqlite');
    if (!target) return undefined;
    if (createDir) {
      const dir = vscode.Uri.file(path.dirname(target.fsPath));
      await vscode.workspace.fs.createDirectory(dir);
    }
    return target;
  }
}
