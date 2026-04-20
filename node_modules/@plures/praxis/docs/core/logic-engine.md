# Praxis Logic Engine

The Praxis Logic Engine is the computational core of every Praxis application. It provides a pure, functional approach to application logic using facts, events, rules, and constraints.

## Core Concepts

### Facts

Facts are typed propositions about your domain. They represent "what is true" or "what happened."

```typescript
import { defineFact } from '@plures/praxis';

// Define a fact type
const UserLoggedIn = defineFact<'UserLoggedIn', { userId: string; timestamp: number }>(
  'UserLoggedIn'
);

// Create a fact instance
const fact = UserLoggedIn.create({ userId: 'user-123', timestamp: Date.now() });

// Check if a value is this fact type
if (UserLoggedIn.is(someFact)) {
  console.log(someFact.payload.userId);
}
```

#### Fact Properties

| Property    | Type   | Description                         |
| ----------- | ------ | ----------------------------------- |
| `tag`       | string | Unique identifier for the fact type |
| `payload`   | object | Data associated with the fact       |
| `timestamp` | number | When the fact was created           |
| `metadata`  | object | Optional additional metadata        |

### Events

Events are temporally ordered facts that drive state changes. They represent user actions, external triggers, or system events.

```typescript
import { defineEvent } from '@plures/praxis';

// Define an event type
const Login = defineEvent<'LOGIN', { username: string; password: string }>('LOGIN');

// Create an event instance
const event = Login.create({ username: 'alice', password: 'secret' });

// Dispatch events to the engine
engine.dispatch([event]);
```

### Rules

Rules are pure functions that produce facts from events and current state.

```typescript
import { defineRule } from '@plures/praxis';

const loginRule = defineRule<AuthContext>({
  id: 'auth.login',
  description: 'Process login and emit UserLoggedIn fact',
  impl: (state, events) => {
    const loginEvent = events.find(Login.is);
    if (!loginEvent) return [];

    // Validate credentials (pure logic only)
    const user = state.context.users.find((u) => u.username === loginEvent.payload.username);

    if (user) {
      // Modify state (within the pure function)
      state.context.currentUser = user;

      // Return facts to emit
      return [
        UserLoggedIn.create({
          userId: user.id,
          timestamp: Date.now(),
        }),
      ];
    }

    return [
      LoginFailed.create({
        reason: 'Invalid credentials',
      }),
    ];
  },
});
```

#### Rule Properties

| Property      | Type     | Required | Description                         |
| ------------- | -------- | -------- | ----------------------------------- |
| `id`          | string   | Yes      | Unique rule identifier              |
| `description` | string   | Yes      | What the rule does                  |
| `impl`        | function | Yes      | Pure function implementation        |
| `priority`    | number   | No       | Execution order (higher = first)    |
| `triggers`    | string[] | No       | Event types that activate this rule |

### Constraints

Constraints are invariants that must always hold true. They validate state after rules execute.

```typescript
import { defineConstraint } from '@plures/praxis';

const positiveBalance = defineConstraint<BankContext>({
  id: 'bank.positiveBalance',
  description: 'Account balance must be non-negative',
  check: (state) => state.context.balance >= 0,
  errorMessage: 'Insufficient funds',
  severity: 'error',
});
```

#### Constraint Properties

| Property       | Type     | Required | Description                  |
| -------------- | -------- | -------- | ---------------------------- |
| `id`           | string   | Yes      | Unique constraint identifier |
| `description`  | string   | Yes      | What the constraint ensures  |
| `check`        | function | Yes      | Returns true if valid        |
| `errorMessage` | string   | Yes      | Error when violated          |
| `severity`     | string   | Yes      | `error` or `warning`         |

## Creating an Engine

### Basic Setup

```typescript
import { createPraxisEngine, PraxisRegistry } from '@plures/praxis';

// Define your context type
interface AppContext {
  count: number;
  user: { id: string; name: string } | null;
}

// Create a registry
const registry = new PraxisRegistry<AppContext>();

// Register rules and constraints
registry.registerRule(myRule);
registry.registerConstraint(myConstraint);

// Create the engine
const engine = createPraxisEngine({
  initialContext: { count: 0, user: null },
  registry,
});
```

### Engine Options

```typescript
const engine = createPraxisEngine({
  // Required: Initial application state
  initialContext: { count: 0 },

  // Required: Registry with rules and constraints
  registry,

  // Optional: Enable history for undo/redo
  enableHistory: true,
  maxHistorySize: 100,

  // Optional: Custom reducer for state transitions
  reducer: (state, event) => {
    // Custom state transition logic
    return state;
  },

  // Optional: Middleware
  middleware: [
    (state, events, next) => {
      console.log('Before:', events);
      const result = next(state, events);
      console.log('After:', result);
      return result;
    },
  ],
});
```

## Processing Events

### Basic Dispatch

```typescript
// Dispatch a single event
engine.dispatch([Increment.create({})]);

// Dispatch multiple events
engine.dispatch([
  AddItem.create({ id: '1', name: 'Product' }),
  UpdateQuantity.create({ id: '1', quantity: 2 }),
]);

// Get current state
const context = engine.getContext();
console.log(context);
```

### Step Function

For more control, use the step function directly:

```typescript
const result = engine.step([Login.create({ username: 'alice', password: 'secret' })]);

console.log(result.state.context); // Updated context
console.log(result.state.facts); // Emitted facts
console.log(result.effects); // Side effects to execute
console.log(result.violations); // Constraint violations
```

### Step Result

| Property        | Type   | Description               |
| --------------- | ------ | ------------------------- |
| `state.context` | object | Updated application state |
| `state.facts`   | array  | Facts emitted by rules    |
| `effects`       | array  | Side effects to execute   |
| `violations`    | array  | Constraint violations     |

## State Management

### Immutability

The engine maintains immutable state. Each step creates a new state:

```typescript
const state1 = engine.getState();
engine.dispatch([Increment.create({})]);
const state2 = engine.getState();

console.log(state1 === state2); // false
console.log(state1.context.count); // 0
console.log(state2.context.count); // 1
```

### Subscriptions

Subscribe to state changes:

```typescript
// Subscribe to all changes
const unsubscribe = engine.subscribe((state) => {
  console.log('State changed:', state.context);
});

// Later: unsubscribe
unsubscribe();
```

### History and Undo/Redo

When history is enabled:

```typescript
const engine = createPraxisEngine({
  initialContext: { count: 0 },
  registry,
  enableHistory: true,
});

engine.dispatch([Increment.create({})]); // count: 1
engine.dispatch([Increment.create({})]); // count: 2

engine.undo(); // count: 1
engine.redo(); // count: 2

// Access history
const snapshots = engine.getSnapshots();
console.log(snapshots.length); // 3 (initial + 2 changes)

// Go to specific snapshot
engine.goToSnapshot(0); // count: 0
```

## Rule Execution

### Priority

Rules execute in priority order (highest first):

```typescript
const highPriorityRule = defineRule({
  id: 'important',
  priority: 100,  // Executes first
  impl: (state, events) => { ... }
});

const lowPriorityRule = defineRule({
  id: 'less-important',
  priority: 1,  // Executes later
  impl: (state, events) => { ... }
});
```

### Triggers

Rules can specify which events activate them:

```typescript
const loginRule = defineRule({
  id: 'auth.login',
  triggers: ['LOGIN', 'OAUTH_CALLBACK'],  // Only runs for these events
  impl: (state, events) => { ... }
});
```

### Rule Chaining

Facts emitted by rules can trigger other rules:

```typescript
// Rule 1: Login produces UserLoggedIn
const loginRule = defineRule({
  id: 'auth.login',
  triggers: ['LOGIN'],
  impl: (state, events) => [UserLoggedIn.create({ userId: '123' })],
});

// Rule 2: UserLoggedIn triggers welcome notification
const welcomeRule = defineRule({
  id: 'notify.welcome',
  impl: (state, events) => {
    // This runs after loginRule because facts are processed
    const loggedIn = state.facts.find((f) => f.tag === 'UserLoggedIn');
    if (loggedIn) {
      return [ShowNotification.create({ message: 'Welcome!' })];
    }
    return [];
  },
});
```

## Constraint Checking

### Validation Flow

1. Events are dispatched
2. Rules execute and modify state
3. Constraints are checked
4. If violations occur, state can be rolled back

```typescript
const result = engine.step([WithdrawMoney.create({ amount: 1000 })]);

if (result.violations.length > 0) {
  console.log('Constraint violated:', result.violations[0].message);
  // State was not applied
}
```

### Severity Levels

```typescript
const softConstraint = defineConstraint({
  id: 'warn.lowBalance',
  severity: 'warning', // Allows state change, logs warning
  check: (state) => state.context.balance > 100,
  errorMessage: 'Balance is getting low',
});

const hardConstraint = defineConstraint({
  id: 'error.overdraft',
  severity: 'error', // Prevents state change
  check: (state) => state.context.balance >= 0,
  errorMessage: 'Insufficient funds',
});
```

## Effects and Side Effects

Rules return facts (pure data), but applications need side effects. Use the effects pattern:

```typescript
const sendEmailRule = defineRule({
  id: 'notify.email',
  impl: (state, events) => {
    const orderPlaced = events.find(e => e.tag === 'OrderPlaced');
    if (orderPlaced) {
      // Return an effect descriptor (not the actual side effect)
      return [
        EmailQueued.create({
          to: state.context.user.email,
          template: 'order-confirmation',
          data: { orderId: orderPlaced.payload.orderId }
        })
      ];
    }
    return [];
  }
});

// Execute effects after step
const result = engine.step([PlaceOrder.create({ ... })]);
for (const fact of result.state.facts) {
  if (fact.tag === 'EmailQueued') {
    await emailService.send(fact.payload);
  }
}
```

## Introspection

### Registry Introspection

```typescript
// Get all registered rules
const rules = registry.getRules();
console.log(rules.map((r) => r.id));

// Get all constraints
const constraints = registry.getConstraints();

// Get registry statistics
const stats = registry.getStats();
console.log(stats);
// { ruleCount: 5, constraintCount: 3, ... }
```

### State Introspection

```typescript
// Get current state
const state = engine.getState();

// Get context (application data)
const context = engine.getContext();

// Get facts (emitted by rules)
const facts = engine.getFacts();

// Get history (if enabled)
const snapshots = engine.getSnapshots();
const currentIndex = engine.getHistoryIndex();
```

## Advanced Patterns

### Actors

For isolated stateful units:

```typescript
import { createActor, createActorSystem } from '@plures/praxis';

const counterActor = createActor('counter-1', { count: 0 }, counterStepFunction, 'counter');

const system = createActorSystem();
system.register(counterActor);

// Send to specific actor
system.send('counter-1', Increment.create({}));

// Broadcast to all actors
system.broadcast(Reset.create({}));
```

### Flows

For multi-step processes:

```typescript
import { createFlow, advanceFlow } from '@plures/praxis';

const checkoutFlow = createFlow('checkout', [
  { id: 'cart', expectedEventType: 'REVIEW_CART' },
  { id: 'shipping', expectedEventType: 'ENTER_SHIPPING' },
  { id: 'payment', expectedEventType: 'PROCESS_PAYMENT' },
  { id: 'confirm', expectedEventType: 'CONFIRM_ORDER' },
]);

// Advance through the flow
const { flow, accepted } = advanceFlow(checkoutFlow, event);
if (flow.complete) {
  console.log('Checkout complete!');
}
```

## Best Practices

### 1. Keep Rules Pure

Rules should have no side effects:

```typescript
// ❌ Bad: Side effect in rule
const badRule = defineRule({
  impl: (state, events) => {
    fetch('/api/data'); // Side effect!
    return [];
  },
});

// ✅ Good: Return effect descriptor
const goodRule = defineRule({
  impl: (state, events) => {
    return [FetchDataRequested.create({ url: '/api/data' })];
  },
});
```

### 2. Use Descriptive IDs

```typescript
// ❌ Bad
const rule1 = defineRule({ id: 'r1', ... });

// ✅ Good
const processLogin = defineRule({ id: 'auth.processLogin', ... });
```

### 3. Leverage TypeScript

```typescript
// Define your context type
interface AppContext {
  user: User | null;
  items: Item[];
  settings: Settings;
}

// Rules are typed
const typedRule = defineRule<AppContext>({
  impl: (state, events) => {
    // TypeScript knows the shape of state.context
    const user = state.context.user;
    return [];
  },
});
```

### 4. Test Your Logic

```typescript
import { describe, it, expect } from 'vitest';

describe('Login Rule', () => {
  it('should emit UserLoggedIn on valid credentials', () => {
    const engine = createPraxisEngine({
      initialContext: { users: [{ username: 'alice', id: '1' }] },
      registry,
    });

    const result = engine.step([Login.create({ username: 'alice', password: 'valid' })]);

    expect(result.state.facts).toContainEqual(expect.objectContaining({ tag: 'UserLoggedIn' }));
  });
});
```

---

**Next:** [UI Generation](./ui-generation.md)
