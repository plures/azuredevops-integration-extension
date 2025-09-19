# Local-first, reactive architecture for Svelte

This document describes a redesign that embraces Svelte reactivity and a local-first model suitable for offline-first web and mobile (Capacitor) apps, while integrating with Azure DevOps (ADO).

## Core principles

- Local-first: the UI reads from a local cache as the primary source of truth. Network sync is background, resilient, and idempotent.
- Reactive-by-default: UI subscribes to Svelte stores that reflect local state; stores are updated by a single data core, not by screens.
- Queue-and-sync: all writes go to an outbox and are synced with backoff, rate limiting, and conflict detection.
- Deterministic reconciliation: ADO is the source-of-truth; we use resource versions (rev) and ETags to detect conflicts and merge.
- Progressive enhancement: PAT-auth first, optional OAuth later. IndexedDB on web; secure SQLite on mobile.

## Domain model (initial)

- WorkItem: id, fields (title, state, assignedTo, tags, iteration, area, updated, rev, etag), relations
- Comment: id, workItemId, text, createdBy, createdDate, localIdempotencyKey
- TimerEntry: id, workItemId, start, stop, durationSeconds, summaryDraft, proposedCompleted, proposedRemaining, synced
- PullRequest: id, repoId, title, state, createdBy, updated, reviewers

Note: Only include fields we render or update; everything else can be lazy-fetched per-detail.

## Data core layers

- Storage (pluggable):
  - Web: IndexedDB via Dexie (reactive hooks via table hooks or manual invalidation)
  - Mobile: Capacitor SQLite (with a thin repo layer; consider Drizzle ORM for schema)
- Repository API (platform-agnostic): CRUD and query methods by domain type; emits change events per collection and per entity id.
- Svelte stores: readable/writable stores consuming repository events; derived stores for filters/aggregations; no fetch in components.
- Sync engine:
  - Outbox: persist local mutations with an idempotency key and expected rev/etag
  - Pull: incremental polling with delta strategies (see below) and backoff
  - Push: process outbox respecting ADO rate limits; retry/resolve conflicts
  - Connectivity: online/offline detection gates sync; exponential backoff; jitter; suspend on 429

## ADO specifics and deltas

- Work Items: use WIQL with `ChangedDate > lastSync` within scoped teams/areas/iterations to discover changed IDs; fetch items in batch; update local cache. Track `lastSync` per scope.
- Item detail deltas: store `rev`. When `rev` changes, fetch updates via `List work item updates` for fine-grained field patches if needed.
- Concurrency: updates must include the last known `rev` to avoid 409; on 409, fetch latest, rebase local changed fields, and retry (or surface merge UI if risky fields).
- ETags: honor `ETag`/`If-None-Match` where available for comments/repo content; treat 304 as no-op.
- Rate limits: reuse existing rate limiter; escalate backoff on 429/503; persist limiter state if app restarts during heavy sync.

## Conflict resolution

- Default: last-writer-wins per field we own (e.g., Remaining Work hours we set in stop flow) with user-visible review on conflict.
- Comments/TimerEntries: idempotent via a GUID embedded in the body (e.g., `<!-- time-entry:GUID -->`), so resubmits are safe.
- Freeform fields (Title/Description): do not auto-merge; prompt user to accept remote or reapply local edits.

## Query-to-store mapping (reactivity)

- Stores per slice: `workItemsStore`, `myPullRequestsStore`, `timerEntriesStore`.
- Derived stores:
  - Filters (assignee, tags, state category, iteration)
  - Kanban columns derived from state category
  - Counters, badges, and quick stats
- Invalidation: repository emits `changed({type, ids, reason})`; stores recompute derived values efficiently.

## Offline behavior

- Reads: served from local DB immediately
- Writes: recorded in local DB + outbox; optimistic UI updates; rollback if server rejects permanently
- Timer: compute elapsed from timestamps; app resumes reconcile; do not rely on background timers
- Secrets:
  - Extension: VS Code SecretStorage
  - Web: never persist secrets; PAT kept only in memory with page lock/short TTL; rely on reload authentication
  - Mobile: Capacitor Secure Storage

## Polling and backpressure

- Adaptive polling interval based on activity: fast after focus/interaction, slow in background; pause when hidden
- Backpressure signals:
  - Rate limiter saturation
  - Large outbox backlog
  - Consecutive sync errors
- Auto-throttle and surface a subtle banner when syncing is delayed

## Minimal contracts (sketch)

- Repository
  - `getWorkItems(query): Promise<WorkItem[]>`
  - `getWorkItem(id): Promise<WorkItem|undefined>`
  - `upsertWorkItems(items)`; `applyWorkItemPatch(id, patch)`
  - `events.on('workItemsChanged', (ids))`
- SyncEngine
  - `enqueueMutation(type, payload, idempotencyKey, expectedRev)`
  - `start()` / `stop()`; `onStatus((status) => void)`
- Stores
  - `workItems = readable<WorkItem[]>(subscribe => ...)`
  - `filters = writable<Filters>`; `visibleItems = derived([workItems, filters], ...)`

## Security and privacy

- Only store fields needed for UI; purge secrets; encrypt at rest on mobile
- Audit log of mutations (local only) for troubleshooting

## Testing strategy

- Unit: repository and sync engine with mocked transport; conflict scenarios; rate limiter interactions
- Integration: stores -> repo -> in-memory DB -> fake ADO server
- UI: component tests against stores with seeded DB

## Migration path from current extension

- Extract domain shapes + rate limiter to data core
- Adapter for ADO REST implemented once, reused by extension and apps
- Extension webview switches to stores fed by the repository; drop ad-hoc message fetching logic

## Milestones (revised)

- M0: Data core and contracts + mocked sync; Svelte store layer proves reactivity
- M1: ADO adapter with read-only sync; extension reads from local stores; parity UI
- M2: Outbox writes for timer stop flow and comments; optimistic updates
- M3: Mobile shell with offline cache and secure storage; end-to-end sync
- M4: Polish, OAuth option, perf and backpressure telemetry
