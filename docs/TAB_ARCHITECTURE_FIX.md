# Tab Architecture Fix

## Problem Analysis

The current architecture treats tabs as views of shared global state, causing:
1. Connection switching affects all tabs
2. Work items are globally shared instead of per-connection
3. Filters and queries can't be connection-specific
4. Authentication state is not properly isolated

## Correct Architecture

### Component Hierarchy
```
TabContainer (Parent)
├── connections: Connection[]
├── workItemsByConnection: Map<connectionId, WorkItem[]>
├── activeTabId: string
├── tabStates: Map<connectionId, TabState>
│
├── ConnectionTab (for each connection)
│   ├── connectionId: string
│   ├── workItems: WorkItem[] (filtered from parent)
│   ├── tabState: TabState (filters, query, view mode)
│   ├── isActive: boolean
│   │
│   ├── WorkItemList (when view=list)
│   └── KanbanBoard (when view=kanban)
│
└── AuthenticationManager
    ├── connectionStates: Map<connectionId, AuthState>
    ├── deviceCodeFlows: Map<connectionId, DeviceFlow>
    └── reAuthCountdowns: Map<connectionId, Countdown>
```

### Data Flow
```
1. TabContainer loads all connections
2. For each connection, TabContainer:
   - Manages authentication independently
   - Fetches work items independently  
   - Maintains separate TabState
   - Passes filtered data to ConnectionTab
3. ConnectionTab only handles:
   - Rendering its specific data
   - Local UI state (selection, etc.)
   - Emitting user actions back to parent
4. Tab switching just shows/hides tabs - no data refetch
```

### Context-Driven Integration
```
ApplicationContext:
├── connections: Connection[]
├── workItemsByConnection: Map<connectionId, WorkItem[]>
├── authStatesByConnection: Map<connectionId, AuthState>
├── tabStates: Map<connectionId, TabState>
└── activeConnectionId: string (just for UI display)

ContextActions:
├── loadConnectionWorkItems(connectionId, workItems)
├── setConnectionAuth(connectionId, authState)  
├── updateTabState(connectionId, tabState)
├── setActiveTab(connectionId) // UI only
└── startDeviceFlow(connectionId)
```

## Implementation Plan

### Phase 1: Authentication Fix
1. Restore device code flow prompts
2. Add status bar reauth countdown per connection
3. Independent auth state management

### Phase 2: Tab Container Architecture
1. Create TabContainer component as parent
2. Move work items fetching to per-connection basis
3. Create ConnectionTab component for each connection
4. Independent TabState management

### Phase 3: Context Integration
1. Update ApplicationContext for per-connection data
2. Update ContextManager actions
3. Update reactive stores for tab-specific data

### Phase 4: User Experience
1. Per-tab filters and queries
2. Per-tab view modes (list/kanban)
3. Per-tab sorting and preferences
4. Independent loading states

## Benefits

1. **True Independence**: Each connection operates in isolation
2. **Better UX**: Users can have different setups per connection
3. **Simpler Logic**: No complex global state filtering
4. **Better Performance**: Only active tab renders, others are hidden
5. **Easier Testing**: Each tab is independently testable
6. **Scalable**: Adding more connections doesn't increase complexity

## Migration Strategy

1. Keep existing components working
2. Build new TabContainer alongside
3. Migrate one feature at a time (auth, then data, then UI)
4. Switch over when feature parity achieved
5. Remove old architecture