# Praxis Migration Patterns

This document describes the patterns for migrating from XState finite state machines to the Praxis logic engine.

## Overview

The Praxis logic engine provides a declarative, functional approach to state management that is simpler to test, debug, and maintain than traditional state machines.

## Implemented Modules

The following Praxis modules have been implemented:

### Timer Module (`src/praxis/timer/`)

Manages work item time tracking with states: `idle`, `running`, `paused`.

- **Manager**: `PraxisTimerManager`
- **Engine**: `createTimerEngine()`
- **Tests**: `tests/praxis/praxisTimer.test.ts` (22 tests)

### Authentication Module (`src/praxis/auth/`)

Manages authentication lifecycle with states: `idle`, `authenticating`, `authenticated`, `failed`.

- **Manager**: `PraxisAuthManager`
- **Engine**: `createAuthEngine()`
- **Tests**: `tests/praxis/praxisAuth.test.ts` (27 tests)

Supports:

- PAT (Personal Access Token) authentication
- Entra ID (Microsoft Entra) authentication with device code flow
- Token expiration and refresh handling
- Retry logic with configurable limits

### Connection Module (`src/praxis/connection/`)

Manages Azure DevOps connection lifecycle with states: `disconnected`, `authenticating`, `creating_client`, `creating_provider`, `connected`, `auth_failed`, `client_failed`, `provider_failed`, `connection_error`, `token_refresh`.

- **Manager**: `PraxisConnectionManager`
- **Engine**: `createConnectionEngine()`
- **Tests**: `tests/praxis/praxisConnection.test.ts` (33 tests)

Supports:

- Full connection flow from disconnected to connected
- Authentication integration (PAT and Entra ID)
- Azure client and provider creation
- Token refresh with exponential backoff
- Error handling and retry logic

## Key Concepts

### XState vs Praxis Comparison

| XState Concept | Praxis Equivalent | Description                                      |
| -------------- | ----------------- | ------------------------------------------------ |
| State          | Context property  | The current state value is stored in the context |
| Context        | Context           | Application data that changes over time          |
| Event          | Event             | Actions that trigger state changes               |
| Guard          | Condition in rule | Logic in the rule implementation                 |
| Action         | Rule side effect  | Direct context mutation in rule                  |
| History        | Manual tracking   | Track previous states in context if needed       |

## Migration Steps

### 1. Define Facts and Events

In Praxis, facts represent propositions about your domain, and events drive state changes.

```typescript
import { defineFact, defineEvent } from '@plures/praxis';

// Define typed facts
const TimerStateFact = defineFact<'TimerState', 'idle' | 'running' | 'paused'>('TimerState');

// Define typed events
const StartTimerEvent = defineEvent<'START_TIMER', { workItemId: number }>('START_TIMER');
```

### 2. Map States to Context

Instead of using XState's state nodes, store the state value directly in the context.

```typescript
// XState approach
const timerMachine = createMachine({
  initial: 'idle',
  states: {
    idle: {
      /* ... */
    },
    running: {
      /* ... */
    },
    paused: {
      /* ... */
    },
  },
});

// Praxis approach
interface TimerEngineContext {
  timerState: 'idle' | 'running' | 'paused';
  timerData: {
    workItemId?: number;
    startTime?: number;
    // ... other data
  };
}
```

### 3. Convert Transitions to Rules

XState transitions become Praxis rules that update the context.

```typescript
// XState transition
{
  on: {
    START: {
      target: 'running',
      guard: ({ context }) => context.workItemId !== undefined,
      actions: assign({ startTime: () => Date.now() }),
    },
  },
}

// Praxis rule
export const startTimerRule = defineRule<TimerEngineContext>({
  id: 'timer.start',
  description: 'Start a timer',
  impl: (state, events) => {
    const startEvent = findEvent(events, StartTimerEvent);
    if (!startEvent) return [];
    if (state.context.timerState !== 'idle') return [];  // Guard

    // Direct context mutation (action)
    state.context.timerState = 'running';
    state.context.timerData.startTime = Date.now();
    return [];
  },
});
```

### 4. Convert Guards to Conditions

XState guards become simple conditions in the rule implementation.

```typescript
// XState guard
guard: ({ context }) => context.isPaused === false;

// Praxis condition
if (state.context.timerData.isPaused) return [];
```

### 5. Convert Actions to Context Mutations

XState actions (especially `assign`) become direct context mutations.

```typescript
// XState action
actions: assign({
  startTime: () => Date.now(),
  isPaused: false,
});

// Praxis context mutation
state.context.timerData.startTime = Date.now();
state.context.timerData.isPaused = false;
```

### 6. Create the Engine

Replace `createMachine` and `createActor` with `createPraxisEngine`.

```typescript
import { createPraxisEngine, PraxisRegistry } from '@plures/praxis';

export function createTimerEngine(): LogicEngine<TimerEngineContext> {
  const registry = new PraxisRegistry<TimerEngineContext>();

  // Register rules
  registry.registerRule(startTimerRule);
  registry.registerRule(pauseTimerRule);
  registry.registerRule(stopTimerRule);

  return createPraxisEngine<TimerEngineContext>({
    initialContext: {
      timerState: 'idle',
      timerData: {
        /* ... */
      },
    },
    registry,
    initialFacts: [],
  });
}
```

### 7. Replace `actor.send()` with `engine.step()`

XState's event sending becomes Praxis step calls.

```typescript
// XState
actor.send({ type: 'START', workItemId: 123 });

// Praxis
engine.step([StartTimerEvent.create({ workItemId: 123 })]);
```

### 8. Replace `actor.getSnapshot()` with `engine.getContext()`

```typescript
// XState
const state = actor.getSnapshot();
const isRunning = state.matches('running');
const data = state.context;

// Praxis
const context = engine.getContext();
const isRunning = context.timerState === 'running';
const data = context.timerData;
```

## Feature Flags

The migration uses feature flags for gradual rollout:

- `experimental.usePraxisTimer` - Use Praxis for timer component
- `experimental.usePraxisAuth` - Use Praxis for authentication
- `experimental.usePraxisConnection` - Use Praxis for connection management

## Testing

Praxis engines are easier to test because rules are pure functions.

```typescript
import { describe, it, expect } from 'vitest';
import { PraxisTimerManager } from '../src/praxis/timer/manager';

describe('Timer', () => {
  it('should start timer', () => {
    const manager = new PraxisTimerManager();
    manager.start();

    const result = manager.startTimer(123, 'Test');
    expect(result).toBe(true);
    expect(manager.getTimerState()).toBe('running');
  });
});
```

## Benefits of Praxis

1. **Simpler mental model**: No state machine diagrams needed
2. **Easier testing**: Pure functions are easy to unit test
3. **Better debugging**: Context is always inspectable
4. **Fewer dependencies**: No XState, @xstate/svelte, @statelyai/inspect
5. **Functional approach**: Aligns with FSM-first architecture principles

## Usage Examples

### Timer Module

```typescript
import { PraxisTimerManager } from '../src/praxis/timer/manager';

const timer = new PraxisTimerManager();
timer.start();

// Start a timer for a work item
timer.startTimer(123, 'My Work Item');

// Get timer snapshot
const snapshot = timer.getTimerSnapshot();
console.log(snapshot.elapsedSeconds);

// Pause and resume
timer.pauseTimer();
timer.resumeTimer();

// Stop and get result
const result = timer.stopTimer();
console.log(`Logged ${result.hoursDecimal} hours`);
```

### Authentication Module

```typescript
import { PraxisAuthManager } from '../src/praxis/auth/manager';

const auth = new PraxisAuthManager('connection-1', 'pat');
auth.start();

// Initiate authentication
auth.authenticate();

// Handle success (called by auth provider)
auth.authSuccess('my-token', Date.now() + 3600000);

// Check state
if (auth.isAuthenticated()) {
  const token = auth.getToken();
}
```

### Connection Module

```typescript
import { PraxisConnectionManager } from '../src/praxis/connection/manager';

const connection = new PraxisConnectionManager({
  id: 'my-connection',
  organization: 'my-org',
  project: 'my-project',
  authMethod: 'pat',
});
connection.start();

// Connect
connection.connect();

// Handle auth callback
connection.authenticated('my-token');

// Handle client creation
connection.clientCreated(azureClient);

// Handle provider creation
connection.providerCreated(workItemsProvider);

// Check state
if (connection.isConnected()) {
  const client = connection.getClient();
}
```

### Application Orchestrator Module (`src/praxis/application/`)

Coordinates all Praxis engines (Timer, Auth, Connection) using a multi-engine architecture with event bus pattern.

- **Manager**: `PraxisApplicationManager`
- **Engine**: `createApplicationEngine()`
- **Event Bus**: `PraxisEventBus`
- **Tests**: `tests/praxis/praxisApplication.test.ts` (46 tests)

Supports:

- Application lifecycle (activate, deactivate, error recovery)
- Multi-connection management
- Work items loading and caching per connection
- Query and view mode per connection
- Timer integration
- Device code flow for OAuth
- Auth reminders
- Debug view toggling
- Event-driven cross-engine coordination

```typescript
import { PraxisApplicationManager } from '../src/praxis/application/manager';

const app = new PraxisApplicationManager();
app.start();

// Activate
app.activate();
app.activationComplete();

// Load connections
app.loadConnections([{ id: 'conn-1', organization: 'org', project: 'proj', authMethod: 'pat' }]);

// Select connection
app.selectConnection('conn-1');

// Timer operations
app.startTimer(123, 'My Work Item');
app.pauseTimer();
app.resumeTimer();
const result = app.stopTimer();

// Work items
app.workItemsLoaded([{ id: 1, fields: {} }], 'conn-1', 'My Activity');

// Device code flow
app.deviceCodeStarted('conn-1', 'ABC123', 'https://microsoft.com/devicelogin', 900);

// Event bus subscriptions
const eventBus = app.getEventBus();
eventBus.subscribe('timer:started', (msg) => console.log('Timer started'));
```

### Svelte Integration Module (`src/praxis/svelte/`)

Provides Svelte 5 runes-compatible helpers for using Praxis engines in webview components.

- **Hook**: `usePraxisEngine()` - Local engine hook
- **Remote Hook**: `useRemotePraxisEngine()` - VS Code webview hook
- **Adapter**: `createVSCodePraxisAdapter()` - Webview messaging adapter
- **Tests**: `tests/praxis/praxisSvelte.test.ts` (14 tests)

Supports:

- Reactive state management with Svelte 5 runes
- VS Code webview message passing
- State matching helpers
- Connection status tracking

```svelte
<script lang="ts">
  import { usePraxisEngine } from '$lib/praxis/svelte';
  import { createTimerEngine } from '$lib/praxis/timer';

  const engine = createTimerEngine();
  const { state, dispatch } = usePraxisEngine(
    { state: $state, effect: $effect },
    engine
  );
</script>

<div>Timer: {state.context.timerState}</div>
```

For VS Code webview:

```svelte
<script lang="ts">
  import { createVSCodePraxisAdapter, useRemotePraxisEngine } from '$lib/praxis/svelte';

  const adapter = createVSCodePraxisAdapter<ApplicationContext>('application');
  const { state, dispatch } = useRemotePraxisEngine(
    { state: $state, effect: $effect },
    adapter
  );
</script>

<div>Connection: {state.context.activeConnectionId}</div>
```

## Migration Roadmap

- [x] Phase 1: Core Praxis infrastructure
- [x] Phase 2: Timer Migration
- [x] Phase 3: Authentication Migration
- [x] Phase 4: Connection Migration
- [x] Phase 5: Application Orchestrator Migration
- [x] Phase 6: Webview Integration
- [ ] Phase 7: Cleanup and Documentation
