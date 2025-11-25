# Praxis Migration Patterns

This document describes the patterns for migrating from XState finite state machines to the Praxis logic engine.

## Overview

The Praxis logic engine provides a declarative, functional approach to state management that is simpler to test, debug, and maintain than traditional state machines.

## Key Concepts

### XState vs Praxis Comparison

| XState Concept | Praxis Equivalent | Description |
|---------------|-------------------|-------------|
| State | Context property | The current state value is stored in the context |
| Context | Context | Application data that changes over time |
| Event | Event | Actions that trigger state changes |
| Guard | Condition in rule | Logic in the rule implementation |
| Action | Rule side effect | Direct context mutation in rule |
| History | Manual tracking | Track previous states in context if needed |

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
    idle: { /* ... */ },
    running: { /* ... */ },
    paused: { /* ... */ },
  }
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
guard: ({ context }) => context.isPaused === false

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
})

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
      timerData: { /* ... */ },
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
