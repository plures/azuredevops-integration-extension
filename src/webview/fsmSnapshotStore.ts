/**
 * Module: src/webview/fsmSnapshotStore.ts
 * Owner: webview
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
import { writable } from 'svelte/store';

export interface ApplicationSnapshot {
  value: any; // Can be string or object for nested states
  context: any;
  matches?: Record<string, boolean>; // Pre-computed state matches from extension
}

export const applicationSnapshot = writable<ApplicationSnapshot>({
  value: 'initial',
  context: {},
  matches: {},
});
