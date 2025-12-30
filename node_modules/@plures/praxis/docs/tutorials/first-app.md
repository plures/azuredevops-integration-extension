# Build Your First Praxis App

This tutorial walks you through building a simple counter application with Praxis. You'll learn the core concepts: facts, events, rules, and how to connect logic to a UI.

**Time:** 15-20 minutes  
**Level:** Beginner  
**Prerequisites:** Node.js 18+, basic TypeScript

## What You'll Build

A counter application that:

- Displays a count value
- Has increment and decrement buttons
- Shows a history of actions
- Demonstrates undo/redo

## Step 1: Create the Project

```bash
# Create a new directory
mkdir praxis-counter
cd praxis-counter

# Initialize npm
npm init -y

# Install Praxis
npm install @plures/praxis

# Install development tools
npm install -D typescript @types/node vitest
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

## Step 2: Define the Schema

Create `src/schema.psf.json`:

```json
{
  "$version": "1.0.0",
  "id": "counter-app",
  "name": "Counter",
  "description": "A simple counter application",

  "facts": [
    {
      "id": "fact_incremented",
      "tag": "Incremented",
      "description": "Counter was incremented",
      "payload": {
        "type": "object",
        "properties": {
          "previousValue": { "type": "number" },
          "newValue": { "type": "number" }
        }
      }
    },
    {
      "id": "fact_decremented",
      "tag": "Decremented",
      "description": "Counter was decremented",
      "payload": {
        "type": "object",
        "properties": {
          "previousValue": { "type": "number" },
          "newValue": { "type": "number" }
        }
      }
    },
    {
      "id": "fact_reset",
      "tag": "Reset",
      "description": "Counter was reset to zero",
      "payload": {
        "type": "object",
        "properties": {
          "previousValue": { "type": "number" }
        }
      }
    }
  ],

  "events": [
    {
      "id": "event_increment",
      "tag": "INCREMENT",
      "description": "Increment the counter",
      "payload": { "type": "object", "properties": {} }
    },
    {
      "id": "event_decrement",
      "tag": "DECREMENT",
      "description": "Decrement the counter",
      "payload": { "type": "object", "properties": {} }
    },
    {
      "id": "event_reset",
      "tag": "RESET",
      "description": "Reset counter to zero",
      "payload": { "type": "object", "properties": {} }
    }
  ],

  "rules": [
    {
      "id": "counter.increment",
      "name": "Increment Counter",
      "description": "Increment count when INCREMENT event occurs",
      "triggers": ["INCREMENT"],
      "priority": 10
    },
    {
      "id": "counter.decrement",
      "name": "Decrement Counter",
      "description": "Decrement count when DECREMENT event occurs",
      "triggers": ["DECREMENT"],
      "priority": 10
    },
    {
      "id": "counter.reset",
      "name": "Reset Counter",
      "description": "Reset count to zero when RESET event occurs",
      "triggers": ["RESET"],
      "priority": 10
    }
  ],

  "constraints": [
    {
      "id": "counter.nonNegative",
      "name": "Non-Negative Count",
      "description": "Count must not be negative",
      "errorMessage": "Counter cannot go below zero",
      "severity": "error"
    }
  ]
}
```

## Step 3: Create the Engine

Create `src/engine.ts`:

```typescript
import {
  createPraxisEngine,
  PraxisRegistry,
  defineFact,
  defineEvent,
  defineRule,
  defineConstraint,
} from '@plures/praxis';

// Define the context (application state)
interface CounterContext {
  count: number;
  history: string[];
}

// Define Facts
export const Incremented = defineFact<'Incremented', { previousValue: number; newValue: number }>(
  'Incremented'
);

export const Decremented = defineFact<'Decremented', { previousValue: number; newValue: number }>(
  'Decremented'
);

export const Reset = defineFact<'Reset', { previousValue: number }>('Reset');

// Define Events
export const INCREMENT = defineEvent<'INCREMENT', {}>('INCREMENT');
export const DECREMENT = defineEvent<'DECREMENT', {}>('DECREMENT');
export const RESET = defineEvent<'RESET', {}>('RESET');

// Define Rules
const incrementRule = defineRule<CounterContext>({
  id: 'counter.increment',
  description: 'Increment count when INCREMENT event occurs',
  impl: (state, events) => {
    const event = events.find(INCREMENT.is);
    if (!event) return [];

    const previousValue = state.context.count;
    const newValue = previousValue + 1;

    // Update state
    state.context.count = newValue;
    state.context.history.push(`Incremented from ${previousValue} to ${newValue}`);

    // Emit fact
    return [Incremented.create({ previousValue, newValue })];
  },
});

const decrementRule = defineRule<CounterContext>({
  id: 'counter.decrement',
  description: 'Decrement count when DECREMENT event occurs',
  impl: (state, events) => {
    const event = events.find(DECREMENT.is);
    if (!event) return [];

    const previousValue = state.context.count;
    const newValue = previousValue - 1;

    // Update state
    state.context.count = newValue;
    state.context.history.push(`Decremented from ${previousValue} to ${newValue}`);

    // Emit fact
    return [Decremented.create({ previousValue, newValue })];
  },
});

const resetRule = defineRule<CounterContext>({
  id: 'counter.reset',
  description: 'Reset count to zero when RESET event occurs',
  impl: (state, events) => {
    const event = events.find(RESET.is);
    if (!event) return [];

    const previousValue = state.context.count;

    // Update state
    state.context.count = 0;
    state.context.history.push(`Reset from ${previousValue} to 0`);

    // Emit fact
    return [Reset.create({ previousValue })];
  },
});

// Define Constraint
const nonNegativeConstraint = defineConstraint<CounterContext>({
  id: 'counter.nonNegative',
  description: 'Count must not be negative',
  check: (state) => state.context.count >= 0,
  errorMessage: 'Counter cannot go below zero',
  severity: 'error',
});

// Create Registry
const registry = new PraxisRegistry<CounterContext>();
registry.registerRule(incrementRule);
registry.registerRule(decrementRule);
registry.registerRule(resetRule);
registry.registerConstraint(nonNegativeConstraint);

// Create and export the engine factory
export function createCounterEngine() {
  return createPraxisEngine({
    initialContext: {
      count: 0,
      history: [],
    },
    registry,
  });
}
```

## Step 4: Test the Engine

Create `src/main.ts`:

```typescript
import { createCounterEngine, INCREMENT, DECREMENT, RESET } from './engine';

// Create the engine
const engine = createCounterEngine();

console.log('Initial state:', engine.getContext());
// { count: 0, history: [] }

// Increment a few times
engine.dispatch([INCREMENT.create({})]);
console.log('After increment:', engine.getContext());
// { count: 1, history: ['Incremented from 0 to 1'] }

engine.dispatch([INCREMENT.create({})]);
engine.dispatch([INCREMENT.create({})]);
console.log('After more increments:', engine.getContext());
// { count: 3, history: [...] }

// Decrement
engine.dispatch([DECREMENT.create({})]);
console.log('After decrement:', engine.getContext());
// { count: 2, history: [...] }

// Try to go negative (should be blocked by constraint)
engine.dispatch([DECREMENT.create({})]);
engine.dispatch([DECREMENT.create({})]);
const result = engine.step([DECREMENT.create({})]);
console.log('Trying to go negative, violations:', result.violations);
// [{ id: 'counter.nonNegative', message: 'Counter cannot go below zero' }]

// Reset
engine.dispatch([RESET.create({})]);
console.log('After reset:', engine.getContext());
// { count: 0, history: [..., 'Reset from 2 to 0'] }

// Show history
console.log('\nAction history:');
engine.getContext().history.forEach((entry, i) => {
  console.log(`${i + 1}. ${entry}`);
});
```

Run it:

```bash
npx tsx src/main.ts
```

## Step 5: Add History (Undo/Redo)

Update `src/main.ts` to demonstrate history:

```typescript
import { createPraxisEngine, PraxisRegistry } from '@plures/praxis';
import { createCounterEngine, INCREMENT, DECREMENT, RESET } from './engine';

// Create engine with history enabled
const engine = createPraxisEngine({
  initialContext: {
    count: 0,
    history: [],
  },
  registry: new PraxisRegistry(), // You'd use your real registry here
  enableHistory: true,
  maxHistorySize: 10,
});

// For this demo, let's use the simpler approach
const counterEngine = createCounterEngine();

console.log('=== Counter with Actions ===\n');

// Track all actions
const actions: string[] = [];

function logState(action: string) {
  actions.push(action);
  const ctx = counterEngine.getContext();
  console.log(`${action}: count = ${ctx.count}`);
}

logState('Initial');

counterEngine.dispatch([INCREMENT.create({})]);
logState('Increment');

counterEngine.dispatch([INCREMENT.create({})]);
logState('Increment');

counterEngine.dispatch([INCREMENT.create({})]);
logState('Increment');

counterEngine.dispatch([DECREMENT.create({})]);
logState('Decrement');

counterEngine.dispatch([RESET.create({})]);
logState('Reset');

console.log('\n=== Complete History ===');
counterEngine.getContext().history.forEach((entry, i) => {
  console.log(`  ${i + 1}. ${entry}`);
});
```

## Step 6: Write Tests

Create `src/engine.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCounterEngine,
  INCREMENT,
  DECREMENT,
  RESET,
  Incremented,
  Decremented,
  Reset,
} from './engine';

describe('Counter Engine', () => {
  let engine: ReturnType<typeof createCounterEngine>;

  beforeEach(() => {
    engine = createCounterEngine();
  });

  describe('INCREMENT', () => {
    it('should increment the count', () => {
      engine.dispatch([INCREMENT.create({})]);
      expect(engine.getContext().count).toBe(1);
    });

    it('should emit Incremented fact', () => {
      const result = engine.step([INCREMENT.create({})]);
      expect(result.state.facts).toContainEqual(expect.objectContaining({ tag: 'Incremented' }));
    });

    it('should record in history', () => {
      engine.dispatch([INCREMENT.create({})]);
      expect(engine.getContext().history).toContain('Incremented from 0 to 1');
    });
  });

  describe('DECREMENT', () => {
    it('should decrement the count', () => {
      engine.dispatch([INCREMENT.create({})]);
      engine.dispatch([INCREMENT.create({})]);
      engine.dispatch([DECREMENT.create({})]);
      expect(engine.getContext().count).toBe(1);
    });

    it('should emit Decremented fact', () => {
      engine.dispatch([INCREMENT.create({})]);
      const result = engine.step([DECREMENT.create({})]);
      expect(result.state.facts).toContainEqual(expect.objectContaining({ tag: 'Decremented' }));
    });
  });

  describe('RESET', () => {
    it('should reset count to zero', () => {
      engine.dispatch([INCREMENT.create({})]);
      engine.dispatch([INCREMENT.create({})]);
      engine.dispatch([INCREMENT.create({})]);
      engine.dispatch([RESET.create({})]);
      expect(engine.getContext().count).toBe(0);
    });
  });

  describe('Constraints', () => {
    it('should report violation when going negative', () => {
      const result = engine.step([DECREMENT.create({})]);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].message).toContain('cannot go below zero');
    });
  });

  describe('Multiple events', () => {
    it('should handle multiple events at once', () => {
      engine.dispatch([INCREMENT.create({}), INCREMENT.create({}), INCREMENT.create({})]);
      expect(engine.getContext().count).toBe(3);
    });
  });
});
```

Add test script to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Run tests:

```bash
npm test
```

## What You Learned

In this tutorial, you learned:

1. **Project Setup**: How to create a Praxis project from scratch
2. **PSF Schema**: The structure of a Praxis Schema Format document
3. **Facts**: Typed propositions about what happened
4. **Events**: Actions that drive state changes
5. **Rules**: Pure functions that process events and emit facts
6. **Constraints**: Invariants that must hold true
7. **Registry**: How to register rules and constraints
8. **Engine**: How to create and use a Praxis engine
9. **Testing**: How to test your logic

## Next Steps

- [Todo with PluresDB](./todo-pluresdb.md) - Add data persistence
- [Svelte Integration](../guides/svelte-integration.md) - Connect to a UI
- [Examples](../../examples/) - See more complex applications

## Complete Source Code

The complete source code for this tutorial is available at:
[examples/counter](../../examples/counter.js)

---

**Next Tutorial:** [Todo with PluresDB](./todo-pluresdb.md)
