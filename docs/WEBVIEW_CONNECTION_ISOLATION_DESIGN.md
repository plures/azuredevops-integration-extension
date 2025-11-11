# Webview Connection Isolation Design Proposal

## Overview

This document proposes a redesign of the webview layout to properly isolate connection-specific data and controls. The key principle is that **all data and controls belong to (are children of) the connection**, and tab switching should only control visibility, not data lifecycle.

## Requirements

1. ✅ **Query selector appears below tab buttons** (not adjacent)
2. ✅ **All controls and views are children of the connection**
3. ✅ **Selections and data persist when switching connections**
4. ✅ **Tab switching controls visibility only** (no unmounting/remounting)
5. ✅ **Follows Svelte 5 best practices** with runes and reactive patterns
6. ✅ **Aligns with existing FSM architecture** and reactive philosophy

## Current Problems

### Layout Issue

```
[Tab1] [Tab2] [Query Selector]  ← Query selector is adjacent to tabs (WRONG)
```

### State Management Issue

- Query selection is stored globally (`activeQuery` in context)
- Work items are stored globally (`pendingWorkItems` in context)
- Switching connections clears/resets data instead of preserving it
- Components unmount/remount on connection switch, losing local state

### Architecture Issue

- Controls are siblings to tabs instead of children
- No per-connection state isolation
- Data fetching is tied to `activeConnectionId` rather than per-connection

## Proposed Architecture

### Component Hierarchy

```
App.svelte
├── ConnectionTabs (always visible if multiple connections)
│   └── Tab buttons (Connection 1, Connection 2, ...)
│
└── ConnectionViews (container for all connection-specific UI)
    ├── ConnectionView (connectionId: "conn-1", visible: true)
    │   ├── QuerySelector (persisted per connection)
    │   ├── Filters (persisted per connection)
    │   ├── WorkItemList (data persisted per connection)
    │   └── StatusBar (connection-specific status)
    │
    ├── ConnectionView (connectionId: "conn-2", visible: false)
    │   ├── QuerySelector (persisted per connection)
    │   ├── Filters (persisted per connection)
    │   ├── WorkItemList (data persisted per connection)
    │   └── StatusBar (connection-specific status)
    │
    └── ... (one ConnectionView per connection)
```

### Visual Layout

```
┌─────────────────────────────────────────┐
│ [Connection 1] [Connection 2] [Conn 3] │  ← ConnectionTabs (if multiple)
├─────────────────────────────────────────┤
│                                         │
│ Query: [My Activity ▼]                  │  ← QuerySelector (below tabs)
│                                         │
│ Filters: [Type ▼] [State ▼] [Sort ▼]  │  ← Filters (below tabs)
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Work Item #101: Implement auth...   │ │  ← WorkItemList
│ │ Work Item #102: Fix null pointer... │ │
│ │ ...                                 │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Status: Connected • 42 items            │  ← StatusBar
└─────────────────────────────────────────┘
```

## Implementation Design

### 1. FSM Context Changes

**Current Context Structure:**

```typescript
interface ApplicationContext {
  activeConnectionId?: string;
  activeQuery?: string; // ← Global, not per-connection
  pendingWorkItems?: {
    workItems: any[];
    connectionId?: string;
  }; // ← Single work items array
}
```

**Proposed Context Structure:**

```typescript
interface ApplicationContext {
  activeConnectionId?: string;

  // Per-connection state maps
  connectionQueries: Map<string, string>; // connectionId → query
  connectionWorkItems: Map<string, WorkItem[]>; // connectionId → workItems
  connectionFilters: Map<string, FilterState>; // connectionId → filters
  connectionViewModes: Map<string, 'list' | 'kanban'>; // connectionId → viewMode

  // UI state per connection
  connectionUIState: Map<
    string,
    {
      selectedItems: Set<number>;
      scrollPosition: number;
      expandedItems: Set<number>;
    }
  >;
}
```

### 2. Component Structure

#### `App.svelte` (Main Container)

```svelte
<script lang="ts">
  import { applicationSnapshot } from './fsmSnapshotStore.js';
  import ConnectionTabs from './components/ConnectionTabs.svelte';
  import ConnectionViews from './components/ConnectionViews.svelte';

  const snapshot = $derived($applicationSnapshot);
  const context = $derived(snapshot.context);
  const activeConnectionId = $derived(context?.activeConnectionId);
  const connections = $derived(context?.connections || []);

  function sendEvent(event: any) {
    const vscode = (window as any).__vscodeApi;
    if (vscode) {
      vscode.postMessage({ type: 'fsmEvent', event });
    }
  }
</script>

<main>
  {#if connections.length > 1}
    <ConnectionTabs
      {connections}
      {activeConnectionId}
      onSelect={(id) => sendEvent({ type: 'SELECT_CONNECTION', connectionId: id })}
    />
  {/if}

  <ConnectionViews
    {connections}
    {activeConnectionId}
    {context}
    {sendEvent}
  />
</main>
```

#### `ConnectionViews.svelte` (Container for All Connections)

```svelte
<script lang="ts">
  import ConnectionView from './ConnectionView.svelte';

  export let connections: Array<{ id: string; label?: string }>;
  export let activeConnectionId: string | undefined;
  export let context: any;
  export let sendEvent: (event: any) => void;

  // Derive per-connection data from context
  const connectionQueries = $derived(context?.connectionQueries || new Map());
  const connectionWorkItems = $derived(context?.connectionWorkItems || new Map());
  const connectionFilters = $derived(context?.connectionFilters || new Map());
</script>

<div class="connection-views">
  {#each connections as connection (connection.id)}
    {@const isActive = connection.id === activeConnectionId}
    {@const query = connectionQueries.get(connection.id) || 'My Activity'}
    {@const workItems = connectionWorkItems.get(connection.id) || []}
    {@const filters = connectionFilters.get(connection.id) || {}}

    <ConnectionView
      {connection}
      {isActive}
      {query}
      {workItems}
      {filters}
      {context}
      {sendEvent}
    />
  {/each}
</div>

<style>
  .connection-views {
    display: flex;
    flex-direction: column;
  }
</style>
```

#### `ConnectionView.svelte` (Per-Connection UI)

```svelte
<script lang="ts">
  import QuerySelector from './QuerySelector.svelte';
  import Filters from './Filters.svelte';
  import WorkItemList from './WorkItemList.svelte';
  import StatusBar from './StatusBar.svelte';

  export let connection: { id: string; label?: string };
  export let isActive: boolean;
  export let query: string;
  export let workItems: any[];
  export let filters: any;
  export let context: any;
  export let sendEvent: (event: any) => void;

  // Local UI state (persisted per connection via FSM context)
  let localQuery = $state(query);

  // Sync with context when it changes
  $effect(() => {
    if (query !== localQuery) {
      localQuery = query;
    }
  });

  function handleQueryChange(newQuery: string) {
    localQuery = newQuery;
    sendEvent({
      type: 'SET_CONNECTION_QUERY',
      connectionId: connection.id,
      query: newQuery,
    });
  }
</script>

<div
  class="connection-view"
  class:active={isActive}
  data-connection-id={connection.id}
>
  {#if isActive}
    <div class="connection-content">
      <QuerySelector
        value={localQuery}
        connectionId={connection.id}
        onChange={handleQueryChange}
      />

      <Filters
        connectionId={connection.id}
        filters={filters}
        onFilterChange={(newFilters) => {
          sendEvent({
            type: 'SET_CONNECTION_FILTERS',
            connectionId: connection.id,
            filters: newFilters,
          });
        }}
      />

      <WorkItemList
        connectionId={connection.id}
        workItems={workItems}
        {context}
        {sendEvent}
      />

      <StatusBar
        connectionId={connection.id}
        {context}
      />
    </div>
  {/if}
</div>

<style>
  .connection-view {
    display: none; /* Hidden by default */
  }

  .connection-view.active {
    display: block; /* Visible when active */
  }

  .connection-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
</style>
```

### 3. Svelte 5 Runes Pattern

**Per-Connection State Store** (`src/webview/stores/connectionState.svelte.ts`):

```typescript
import { $state, $derived } from 'svelte';

// Reactive per-connection state
export const connectionStates = $state<Map<string, ConnectionUIState>>(new Map());

export function getConnectionState(connectionId: string): ConnectionUIState {
  if (!connectionStates.has(connectionId)) {
    connectionStates.set(connectionId, {
      selectedItems: new Set(),
      scrollPosition: 0,
      expandedItems: new Set(),
      localFilters: {},
    });
  }
  return connectionStates.get(connectionId)!;
}

export function updateConnectionState(
  connectionId: string,
  updater: (state: ConnectionUIState) => ConnectionUIState
) {
  const current = getConnectionState(connectionId);
  connectionStates.set(connectionId, updater(current));
}

// Derived: Get active connection state
export const activeConnectionState = $derived((): ConnectionUIState | null => {
  // This would be derived from FSM context's activeConnectionId
  // Implementation depends on how we sync with FSM
  return null;
});
```

### 4. FSM Actions for Per-Connection State

**New Actions in `applicationMachine.ts`:**

```typescript
actions: {
  setConnectionQuery: assign({
    connectionQueries: ({ context, event }) => {
      const { connectionId, query } = event as { connectionId: string; query: string };
      const newMap = new Map(context.connectionQueries || new Map());
      newMap.set(connectionId, query);
      return newMap;
    },
  }),

  setConnectionWorkItems: assign({
    connectionWorkItems: ({ context, event }) => {
      const { connectionId, workItems } = event as {
        connectionId: string;
        workItems: WorkItem[];
      };
      const newMap = new Map(context.connectionWorkItems || new Map());
      newMap.set(connectionId, workItems);
      return newMap;
    },
  }),

  setConnectionFilters: assign({
    connectionFilters: ({ context, event }) => {
      const { connectionId, filters } = event as {
        connectionId: string;
        filters: FilterState;
      };
      const newMap = new Map(context.connectionFilters || new Map());
      newMap.set(connectionId, filters);
      return newMap;
    },
  }),
}
```

**New Events:**

```typescript
export type ApplicationEvent =
  | { type: 'SET_CONNECTION_QUERY'; connectionId: string; query: string }
  | { type: 'SET_CONNECTION_FILTERS'; connectionId: string; filters: FilterState }
  | { type: 'SET_CONNECTION_WORK_ITEMS'; connectionId: string; workItems: WorkItem[] }
  | { type: 'SELECT_CONNECTION'; connectionId: string };
// ... existing events
```

### 5. Data Loading Strategy

**Current (Wrong):**

- Data loading is triggered by `activeConnectionId` change
- Only active connection's data is loaded
- Switching connections triggers new data fetch

**Proposed (Correct):**

- Each connection loads its data independently
- Data persists in `connectionWorkItems` map
- Switching connections only changes visibility
- Background refresh can update inactive connections

**Implementation in `provider.ts`:**

```typescript
// Per-connection provider instances
const providersByConnection = new Map<string, WorkItemProvider>();

function getProviderForConnection(connectionId: string): WorkItemProvider {
  if (!providersByConnection.has(connectionId)) {
    const connection = connections.find((c) => c.id === connectionId);
    if (!connection) throw new Error(`Connection ${connectionId} not found`);

    const provider = new WorkItemProvider(connection);
    providersByConnection.set(connectionId, provider);
  }
  return providersByConnection.get(connectionId)!;
}

// Refresh all connections (or specific connection)
async function refreshConnectionData(connectionId: string) {
  const provider = getProviderForConnection(connectionId);
  const query = context.connectionQueries.get(connectionId) || 'My Activity';
  const workItems = await provider.refresh(query);

  // Update FSM context
  appActor.send({
    type: 'SET_CONNECTION_WORK_ITEMS',
    connectionId,
    workItems,
  });
}
```

## Benefits

### 1. **Proper Isolation**

- Each connection maintains its own state
- No cross-contamination between connections
- Clear ownership of data and controls

### 2. **Better UX**

- Instant switching (no loading delay)
- Preserved selections and filters
- No data loss when switching

### 3. **Performance**

- Components don't unmount/remount
- Data persists in memory
- Background refresh possible

### 4. **Maintainability**

- Clear component hierarchy
- Predictable data flow
- Easier to debug and test

### 5. **Svelte 5 Best Practices**

- Uses `$state` and `$derived` runes
- Reactive patterns throughout
- Type-safe state management

## Migration Strategy

### Phase 1: Context Structure

1. ✅ Add `connectionQueries`, `connectionWorkItems`, `connectionFilters` maps to `ApplicationContext`
2. ✅ Add actions for updating per-connection state
3. ✅ Add events for connection-specific operations

### Phase 2: Component Restructure

1. ✅ Create `ConnectionViews.svelte` container component
2. ✅ Create `ConnectionView.svelte` per-connection component
3. ✅ Move query selector and filters into `ConnectionView`
4. ✅ Update `App.svelte` to use new structure

### Phase 3: Data Loading

1. ✅ Update `provider.ts` to support per-connection providers
2. ✅ Update data loading to populate `connectionWorkItems` map
3. ✅ Implement background refresh for inactive connections

### Phase 4: State Persistence

1. ✅ Persist per-connection state to `globalState`
2. ✅ Restore state on activation
3. ✅ Sync state changes to persistence

### Phase 5: Testing & Validation

1. ✅ Test connection switching preserves state
2. ✅ Test data persistence across sessions
3. ✅ Test background refresh
4. ✅ Update ValidationChecklist.md

## Validation Checklist

- [ ] Query selector appears below tab buttons (not adjacent)
- [ ] All controls are children of ConnectionView component
- [ ] Query selection persists when switching connections
- [ ] Work items persist when switching connections
- [ ] Filters persist when switching connections
- [ ] View mode (list/kanban) persists per connection
- [ ] Selected items persist per connection
- [ ] Scroll position persists per connection (optional)
- [ ] Components use visibility toggle (not mount/unmount)
- [ ] FSM context includes per-connection state maps
- [ ] Data loading populates per-connection maps
- [ ] Background refresh updates inactive connections
- [ ] State persists across VS Code sessions
- [ ] No data loss when switching connections rapidly
- [ ] Performance is acceptable with multiple connections

## Open Questions

1. **Scroll Position Persistence**: Should scroll position be persisted per connection? (Probably yes for better UX)

2. **Background Refresh**: Should inactive connections refresh in the background? (Probably yes, but with lower priority)

3. **Memory Management**: How many connections' data should be kept in memory? (All active connections, or limit?)

4. **Initial Load**: Should all connections load data on activation, or only the active one? (Probably only active, then lazy-load others)

5. **State Cleanup**: When should connection state be cleaned up? (On connection removal, or keep for potential re-add?)

## References

- [Svelte 5 Runes Documentation](https://svelte.dev/docs/svelte/$state)
- [Svelte 5 Derived State](https://svelte.dev/docs/svelte/$derived)
- [XState + Svelte Integration](https://stately.ai/docs/xstate-svelte)
- [VS Code Webview Best Practices](https://code.visualstudio.com/api/extension-guides/webview)
- `docs/SVELTE5_REACTIVITY_MIGRATION.md` - Svelte 5 patterns in this project
- `docs/XSTATE_SVELTE_PROVEN_PATTERNS.md` - XState integration patterns
- `docs/TAB_ARCHITECTURE_FIX.md` - Previous tab architecture analysis
