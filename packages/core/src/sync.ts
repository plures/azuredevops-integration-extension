import type { Mutation } from './repository.js';

export type SyncStatus =
  | { state: 'idle' }
  | { state: 'syncing'; phase: 'pull' | 'push' }
  | { state: 'backoff'; retryInMs: number }
  | { state: 'error'; message: string };

export interface SyncEngine {
  start(): void;
  stop(): void;
  onStatus(cb: (s: SyncStatus) => void): () => void;
  enqueue<T = unknown>(m: Mutation<T>): Promise<void>;
}
