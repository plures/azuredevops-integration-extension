# Context-Driven Architecture Migration Guide

## Overview

This guide shows how to migrate from the current message-based FSM architecture to a context-driven approach where independent actors observe shared application context.

## Current vs New Architecture

### Current (Message-Based)
```
Component → FSM Actor → Message → Another Actor → State Change → Component Re-render
```
**Problems:**
- Tight coupling between actors
- Complex message routing
- Difficult to debug
- Doesn't scale to multiple connections

### New (Context-Driven)
```
User Action → Context Action → Shared Context → Reactive Store → Component Re-render
                                     ↓
                               Independent Actors observe context
```
**Benefits:**
- Loose coupling
- Simple, predictable flow
- Easy to debug
- Scales naturally

## Migration Steps

### Step 1: Initialize Shared Context

```typescript
// In activation.ts
import { createApplicationContext } from './architecture/ApplicationContext';
import { createContextStore } from './architecture/ReactiveStores';

let applicationContext = createApplicationContext();
let contextStore = createContextStore(applicationContext);

// Make available to webview
webviewManager.setContextStore(contextStore);
```

### Step 2: Replace Message Handlers

**Before:**
```typescript
case 'switchConnection':
  // Complex message routing
  applicationFSMManager.send({
    type: 'SWITCH_CONNECTION', 
    connectionId,
    refresh: true
  });
  break;
```

**After:**
```typescript
case 'switchConnection':
  // Simple context update
  contextActions.setActiveConnection(connectionId);
  contextActions.refreshConnection(connectionId);
  break;
```

### Step 3: Convert Components to Use Stores

**Before:**
```svelte
<script>
  import { onMount } from 'svelte';
  
  let workItems = [];
  let loading = false;
  
  onMount(() => {
    // Complex message setup
    window.addEventListener('message', handleMessage);
  });
  
  function handleMessage(event) {
    // Complex message parsing
    if (event.data.type === 'workItemsUpdated') {
      workItems = event.data.workItems;
      loading = false;
    }
  }
</script>
```

**After:**
```svelte
<script>
  import { activeWorkItems, isActiveConnectionLoading } from '../architecture/ReactiveStores';
  
  // That's it! Reactive updates automatically
</script>

{#if $isActiveConnectionLoading}
  Loading...
{:else}
  {#each $activeWorkItems as item}
    <!-- Display work item -->
  {/each}
{/if}
```

### Step 4: Start Independent Actors

```typescript
// In activation.ts
import { createIndependentActors } from './architecture/IndependentActors';

const actors = createIndependentActors(contextStore);

// Actors now observe context and handle their concerns independently
// No direct message passing between actors
```

## Key Changes to Existing Files

### activation.ts
- Initialize shared context and reactive stores
- Replace complex message routing with simple context actions
- Start independent actors that observe context

### webview/main.ts (or reactive-main.ts)
- Remove complex message handling
- Use reactive stores for all state
- Actions just call context actions

### Component files
- Remove `onMount` message setup
- Use reactive stores with `$` syntax
- Actions call `contextActions` methods

## Connection Switching Example

### Current Flow (Broken)
1. User clicks tab
2. Component sends message to extension
3. Extension routes to FSM
4. FSM sends message to another actor
5. Data is loaded but display doesn't update (current bug)

### New Flow (Works)
1. User clicks tab
2. Component calls `contextActions.setActiveTab(connectionId)`
3. Context updates
4. Reactive stores automatically update
5. UI re-renders with new data
6. Independent data actor observes context change and refreshes if needed

## Benefits in Practice

### Scalability
- Adding 5th or 10th connection: Just add to context
- Each connection has independent state
- No message routing complexity

### Debugging
- All state in one place (ApplicationContext)
- Clear audit trail of context changes
- No complex message tracing

### Testing
- Test context actions in isolation
- Test components with mock stores
- Test actors independently

### Maintainability
- Actors have single concerns
- No interdependencies
- Easy to add new features

## Migration Timeline

1. **Phase 1**: Create architecture files ✓
2. **Phase 2**: Initialize context in activation.ts
3. **Phase 3**: Convert one component to use stores
4. **Phase 4**: Start independent actors
5. **Phase 5**: Migrate remaining components
6. **Phase 6**: Remove legacy FSM message handling

## Example: Fixing Current Connection Switching Bug

The current bug where connection switching doesn't update the display would be fixed like this:

```typescript
// Instead of complex message routing that breaks
const handleTabClick = (connectionId) => {
  contextActions.setActiveTab(connectionId);
  // That's it! Reactive stores handle the rest
};
```

The reactive store automatically provides the right data:

```javascript
export const activeWorkItems = derived(
  [applicationContext, activeTab],
  ([$context, $activeTab]) => $context.workItemsByConnection.get($activeTab) || []
);
```

## Next Steps

Would you like me to:
1. Implement Phase 2 (initialize context in activation.ts)?
2. Convert the current buggy component to use stores?
3. Create a simple working demo first?
4. Fix the XState v5 syntax issues in IndependentActors.ts?