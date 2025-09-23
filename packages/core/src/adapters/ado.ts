import type { RepositoryProvider } from '../repository.js';
import type { SyncEngine, SyncStatus } from '../sync.js';

export interface AdoAuth {
  organization: string;
  project: string;
  pat?: string; // PAT for initial phase; OAuth later
  baseUrl?: string; // optional override
}

export interface AdoDeltaState {
  // Track last sync timestamps per scope (e.g., Current Sprint, My Items)
  lastWorkItemsSync?: string; // ISO
}

export interface AdoAdapterOptions {
  pollIntervalMs?: number; // adaptive later
}

export class AdoSyncAdapter implements SyncEngine {
  private statusListeners = new Set<(s: SyncStatus) => void>();
  private timer: any;
  private stopped = true;

  constructor(
    private auth: AdoAuth,
    private repo: RepositoryProvider,
    private delta: AdoDeltaState = {},
    private opts: AdoAdapterOptions = {}
  ) {}

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.loop();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }

  onStatus(cb: (s: SyncStatus) => void): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  async enqueue(): Promise<void> {
    // Outbox handling to push local mutations — to be implemented
  }

  private emitStatus(s: SyncStatus) {
    for (const l of this.statusListeners) l(s);
  }

  private async loop() {
    if (this.stopped) return;
    try {
      this.emitStatus({ state: 'syncing', phase: 'pull' });
      await this.pullDeltas();
      this.emitStatus({ state: 'syncing', phase: 'push' });
      await this.pushOutbox();
      this.emitStatus({ state: 'idle' });
    } catch (e: any) {
      this.emitStatus({ state: 'error', message: String(e?.message ?? e) });
    } finally {
      const ms = this.opts.pollIntervalMs ?? 15000;
      this.timer = setTimeout(() => this.loop(), ms);
    }
  }

  private async pullDeltas() {
    // 1) WIQL ChangedDate > lastWorkItemsSync to get changed IDs
    // 2) Fetch details in batches and upsert into repository
    // 3) Update delta.lastWorkItemsSync
  }

  private async pushOutbox() {
    // Process queued local mutations (timer entries, comments, simple field updates)
    // Use ETag/rev expectations; on 409, fetch latest and rebase or flag conflict
  }
}
