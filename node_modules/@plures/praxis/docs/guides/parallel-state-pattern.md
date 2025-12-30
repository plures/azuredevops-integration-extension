# Parallel State Pattern in Praxis

This guide explains how to implement parallel states in Praxis using multiple engines, similar to XState's parallel states.

## Overview

Parallel states allow different parts of your application to maintain independent state machines that run concurrently. This is useful for:

- **Multi-region UIs**: Different panels operating independently
- **Concurrent Workflows**: Multiple processes running simultaneously
- **Complex Orchestration**: Coordinating independent subsystems
- **Feature Isolation**: Separate state machines for different features

## Table of Contents

1. [Multiple Engine Pattern](#multiple-engine-pattern)
2. [Coordinated Engines](#coordinated-engines)
3. [Parent-Child Hierarchy](#parent-child-hierarchy)
4. [Cross-Engine Communication](#cross-engine-communication)
5. [Svelte Integration](#svelte-integration)
6. [Real-World Examples](#real-world-examples)

## Multiple Engine Pattern

The simplest way to achieve parallel states is to create multiple independent engines.

### Basic Example

```typescript
import { createPraxisEngine, PraxisRegistry } from '@plures/praxis';

// Engine 1: Authentication
interface AuthContext {
  user: User | null;
  isLoading: boolean;
}

const authRegistry = new PraxisRegistry<AuthContext>();
// ... register auth rules
const authEngine = createPraxisEngine({
  initialContext: { user: null, isLoading: false },
  registry: authRegistry,
});

// Engine 2: Shopping Cart
interface CartContext {
  items: CartItem[];
  total: number;
}

const cartRegistry = new PraxisRegistry<CartContext>();
// ... register cart rules
const cartEngine = createPraxisEngine({
  initialContext: { items: [], total: 0 },
  registry: cartRegistry,
});

// Engine 3: Notifications
interface NotificationContext {
  notifications: Notification[];
  unreadCount: number;
}

const notificationRegistry = new PraxisRegistry<NotificationContext>();
// ... register notification rules
const notificationEngine = createPraxisEngine({
  initialContext: { notifications: [], unreadCount: 0 },
  registry: notificationRegistry,
});

// Use all engines in parallel
authEngine.step([Login.create({ username: 'alice' })]);
cartEngine.step([AddItem.create({ itemId: '123' })]);
notificationEngine.step([ShowNotification.create({ message: 'Welcome!' })]);
```

### Independent Operation

Each engine operates completely independently:

```typescript
// Each engine maintains its own state
console.log('Auth:', authEngine.getContext());
console.log('Cart:', cartEngine.getContext());
console.log('Notifications:', notificationEngine.getContext());

// Events are processed independently
authEngine.step([Login.create({})]); // Only affects auth
cartEngine.step([Checkout.create({})]); // Only affects cart
notificationEngine.step([Clear.create({})]); // Only affects notifications
```

## Coordinated Engines

When engines need to coordinate, you can create a coordinator layer:

### Coordinator Pattern

```typescript
interface CoordinatorEvents {
  auth: PraxisEvent[];
  cart: PraxisEvent[];
  notifications: PraxisEvent[];
}

class AppCoordinator {
  constructor(
    private authEngine: LogicEngine<AuthContext>,
    private cartEngine: LogicEngine<CartContext>,
    private notificationEngine: LogicEngine<NotificationContext>
  ) {}

  /**
   * Dispatch events to appropriate engines
   */
  dispatch(events: CoordinatorEvents) {
    const results = {
      auth: this.authEngine.step(events.auth),
      cart: this.cartEngine.step(events.cart),
      notifications: this.notificationEngine.step(events.notifications),
    };

    // Cross-engine reactions
    this.handleCrossEngineEffects(results);

    return results;
  }

  /**
   * Handle cross-engine effects
   */
  private handleCrossEngineEffects(results: any) {
    // When user logs out, clear cart
    if (results.auth.state.facts.some((f: any) => f.tag === 'UserLoggedOut')) {
      this.cartEngine.step([ClearCart.create({})]);
      this.notificationEngine.step([ShowNotification.create({ message: 'Cart cleared' })]);
    }

    // When order is placed, show notification
    if (results.cart.state.facts.some((f: any) => f.tag === 'OrderPlaced')) {
      this.notificationEngine.step([
        ShowNotification.create({ message: 'Order placed successfully!' }),
      ]);
    }

    // When cart is updated, check auth
    if (results.cart.state.facts.some((f: any) => f.tag === 'CartUpdated')) {
      const authContext = this.authEngine.getContext();
      if (!authContext.user) {
        this.notificationEngine.step([
          ShowNotification.create({ message: 'Please login to continue' }),
        ]);
      }
    }
  }

  /**
   * Get all contexts
   */
  getState() {
    return {
      auth: this.authEngine.getContext(),
      cart: this.cartEngine.getContext(),
      notifications: this.notificationEngine.getContext(),
    };
  }
}

// Usage
const coordinator = new AppCoordinator(authEngine, cartEngine, notificationEngine);

coordinator.dispatch({
  auth: [Login.create({ username: 'alice' })],
  cart: [AddItem.create({ itemId: '123' })],
  notifications: [],
});

const state = coordinator.getState();
console.log('Current state:', state);
```

### Event Bus Pattern

For more complex coordination, use an event bus:

```typescript
type EventHandler = (event: PraxisEvent) => void;

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  subscribe(eventType: string, handler: EventHandler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  publish(event: PraxisEvent) {
    const handlers = this.handlers.get(event.tag);
    if (handlers) {
      handlers.forEach((handler) => handler(event));
    }
  }
}

// Create shared event bus
const eventBus = new EventBus();

// Connect engines to event bus
eventBus.subscribe('USER_LOGGED_OUT', () => {
  cartEngine.step([ClearCart.create({})]);
  notificationEngine.step([ShowNotification.create({ message: 'Cart cleared' })]);
});

eventBus.subscribe('ORDER_PLACED', (event) => {
  notificationEngine.step([ShowNotification.create({ message: 'Order placed!' })]);
});

eventBus.subscribe('CART_ITEM_ADDED', (event) => {
  const authContext = authEngine.getContext();
  if (!authContext.user) {
    notificationEngine.step([ShowNotification.create({ message: 'Login to save your cart' })]);
  }
});

// Dispatch events through bus
function dispatchWithBroadcast(engine: LogicEngine<any>, events: PraxisEvent[]) {
  const result = engine.step(events);

  // Broadcast facts as events
  result.state.facts.forEach((fact) => {
    eventBus.publish({
      tag: fact.tag,
      payload: fact.payload,
      timestamp: Date.now(),
    });
  });

  return result;
}
```

## Parent-Child Hierarchy

For hierarchical state management:

```typescript
interface ParentContext {
  mode: 'idle' | 'working' | 'error';
  children: Map<string, any>;
}

class HierarchicalEngine {
  private parentEngine: LogicEngine<ParentContext>;
  private childEngines = new Map<string, LogicEngine<any>>();

  constructor(parentEngine: LogicEngine<ParentContext>) {
    this.parentEngine = parentEngine;
  }

  addChild<T>(id: string, engine: LogicEngine<T>) {
    this.childEngines.set(id, engine);

    // Update parent context
    const parentContext = this.parentEngine.getContext();
    parentContext.children.set(id, engine.getContext());
  }

  removeChild(id: string) {
    this.childEngines.delete(id);

    const parentContext = this.parentEngine.getContext();
    parentContext.children.delete(id);
  }

  dispatch(parentEvents: PraxisEvent[], childEvents: Map<string, PraxisEvent[]>) {
    // Process parent events
    this.parentEngine.step(parentEvents);

    // Process child events
    for (const [childId, events] of childEvents) {
      const child = this.childEngines.get(childId);
      if (child) {
        child.step(events);
      }
    }

    // Update parent's view of children
    const parentContext = this.parentEngine.getContext();
    for (const [id, child] of this.childEngines) {
      parentContext.children.set(id, child.getContext());
    }
  }

  getState() {
    return {
      parent: this.parentEngine.getContext(),
      children: Array.from(this.childEngines.entries()).map(([id, engine]) => ({
        id,
        context: engine.getContext(),
      })),
    };
  }
}

// Usage
const parentEngine = createPraxisEngine<ParentContext>({
  initialContext: {
    mode: 'idle',
    children: new Map(),
  },
  registry: parentRegistry,
});

const hierarchical = new HierarchicalEngine(parentEngine);

// Add child engines
hierarchical.addChild('auth', authEngine);
hierarchical.addChild('cart', cartEngine);
hierarchical.addChild('notifications', notificationEngine);

// Dispatch to multiple levels
hierarchical.dispatch(
  [ParentModeChange.create({ mode: 'working' })],
  new Map([
    ['auth', [Login.create({})]],
    ['cart', [AddItem.create({ itemId: '123' })]],
  ])
);
```

## Cross-Engine Communication

### Shared Context Pattern

```typescript
interface SharedState {
  userId: string | null;
  cartTotal: number;
  unreadCount: number;
}

class SharedStateManager {
  private state: SharedState = {
    userId: null,
    cartTotal: 0,
    unreadCount: 0,
  };

  private subscribers = new Set<(state: SharedState) => void>();

  getState(): SharedState {
    return { ...this.state };
  }

  update(partial: Partial<SharedState>) {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  subscribe(callback: (state: SharedState) => void) {
    this.subscribers.add(callback);
    callback(this.state);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify() {
    this.subscribers.forEach((sub) => sub(this.state));
  }
}

// Create shared state
const sharedState = new SharedStateManager();

// Connect engines to shared state
sharedState.subscribe((state) => {
  // Update cart engine when user changes
  if (state.userId) {
    cartEngine.step([LoadUserCart.create({ userId: state.userId })]);
  }
});

sharedState.subscribe((state) => {
  // Update notification badge
  notificationEngine.step([UpdateBadge.create({ count: state.unreadCount })]);
});

// Engines update shared state
authEngine.step([Login.create({})]);
sharedState.update({ userId: authEngine.getContext().user?.id || null });

cartEngine.step([UpdateCart.create({})]);
sharedState.update({ cartTotal: cartEngine.getContext().total });
```

## Svelte Integration

Using parallel engines with Svelte 5:

### Multiple Engines in Component

```svelte
<script lang="ts">
  import { usePraxisEngine } from '@plures/praxis/svelte';
  import {
    createAuthEngine,
    createCartEngine,
    createNotificationEngine
  } from './engines';

  // Create independent engines
  const authEngine = createAuthEngine();
  const cartEngine = createCartEngine();
  const notificationEngine = createNotificationEngine();

  // Bind to Svelte
  const auth = usePraxisEngine(authEngine);
  const cart = usePraxisEngine(cartEngine);
  const notifications = usePraxisEngine(notificationEngine);

  // Cross-engine reactions
  $: if (auth.context.user) {
    cart.dispatch([LoadUserCart.create({
      userId: auth.context.user.id
    })]);
  }

  $: if (cart.context.items.length > 0 && !auth.context.user) {
    notifications.dispatch([ShowNotification.create({
      message: 'Please login to continue'
    })]);
  }
</script>

<div class="app">
  <!-- Auth UI -->
  <header>
    {#if auth.context.user}
      <p>Welcome, {auth.context.user.name}!</p>
      <button onclick={() => auth.dispatch([Logout.create({})])}>
        Logout
      </button>
    {:else}
      <button onclick={() => auth.dispatch([Login.create({})])}>
        Login
      </button>
    {/if}
  </header>

  <!-- Cart UI -->
  <main>
    <h2>Shopping Cart ({cart.context.items.length})</h2>
    <ul>
      {#each cart.context.items as item}
        <li>{item.name} - ${item.price}</li>
      {/each}
    </ul>
    <p>Total: ${cart.context.total}</p>
  </main>

  <!-- Notifications UI -->
  <aside>
    {#each notifications.context.notifications as notification}
      <div class="notification">
        {notification.message}
      </div>
    {/each}
  </aside>
</div>
```

### Coordinator Component

```svelte
<script lang="ts">
  import { usePraxisEngine } from '@plures/praxis/svelte';
  import { AppCoordinator } from './coordinator';
  import {
    createAuthEngine,
    createCartEngine,
    createNotificationEngine
  } from './engines';

  // Create coordinator
  const coordinator = new AppCoordinator(
    createAuthEngine(),
    createCartEngine(),
    createNotificationEngine()
  );

  // Track overall state
  let state = $state(coordinator.getState());

  function dispatch(events: CoordinatorEvents) {
    coordinator.dispatch(events);
    state = coordinator.getState();
  }
</script>

<div class="app">
  <header>
    <p>User: {state.auth.user?.name || 'Guest'}</p>
    <p>Cart: {state.cart.items.length} items</p>
    <p>Notifications: {state.notifications.unreadCount}</p>
  </header>

  <main>
    <button onclick={() => dispatch({
      auth: [Login.create({})],
      cart: [],
      notifications: []
    })}>
      Login
    </button>

    <button onclick={() => dispatch({
      auth: [],
      cart: [AddItem.create({ itemId: '123' })],
      notifications: []
    })}>
      Add to Cart
    </button>
  </main>
</div>
```

## Real-World Examples

### E-Commerce Application

```typescript
// Create engines for different concerns
const engines = {
  auth: createAuthEngine(),
  catalog: createCatalogEngine(),
  cart: createCartEngine(),
  checkout: createCheckoutEngine(),
  notifications: createNotificationEngine(),
};

// Set up cross-engine coordination
function setupCoordination() {
  // When user logs in, load their cart
  authEngine.subscribe((state) => {
    if (state.context.user) {
      cartEngine.step([LoadCart.create({ userId: state.context.user.id })]);
    }
  });

  // When cart updates, update checkout
  cartEngine.subscribe((state) => {
    checkoutEngine.step([UpdateTotal.create({ total: state.context.total })]);
  });

  // When checkout completes, clear cart and show notification
  checkoutEngine.subscribe((state) => {
    if (state.facts.some((f) => f.tag === 'OrderPlaced')) {
      cartEngine.step([ClearCart.create({})]);
      notificationEngine.step([ShowNotification.create({ message: 'Order placed!' })]);
    }
  });
}
```

### Multi-Panel Dashboard

```typescript
// Create engine for each dashboard panel
const panels = {
  metrics: createMetricsEngine(),
  logs: createLogsEngine(),
  alerts: createAlertsEngine(),
  settings: createSettingsEngine(),
};

// Each panel operates independently
function updatePanel(panelId: keyof typeof panels, events: PraxisEvent[]) {
  panels[panelId].step(events);
}

// Shared coordination for common actions
function refreshAll() {
  Object.values(panels).forEach((panel) => {
    panel.step([Refresh.create({})]);
  });
}

function exportAll() {
  const data = Object.entries(panels).map(([id, panel]) => ({
    panel: id,
    data: panel.getContext(),
  }));

  downloadJSON(data, 'dashboard-export.json');
}
```

### Multiplayer Game

```typescript
// Engine for each game aspect
const game = {
  player: createPlayerEngine(),
  inventory: createInventoryEngine(),
  chat: createChatEngine(),
  world: createWorldEngine(),
};

// Process game tick
function gameTick(deltaTime: number) {
  // Update all engines
  game.player.step([Tick.create({ deltaTime })]);
  game.inventory.step([Tick.create({ deltaTime })]);
  game.world.step([Tick.create({ deltaTime })]);

  // Sync states
  const playerPos = game.player.getContext().position;
  game.world.step([UpdatePlayerPosition.create({ position: playerPos })]);
}

// Handle player actions
function handlePlayerAction(action: string) {
  switch (action) {
    case 'USE_ITEM':
      const item = game.inventory.getContext().selectedItem;
      game.player.step([UseItem.create({ item })]);
      game.inventory.step([RemoveItem.create({ item })]);
      break;

    case 'SEND_MESSAGE':
      const player = game.player.getContext();
      game.chat.step([
        SendMessage.create({
          player: player.name,
          message: player.currentMessage,
        }),
      ]);
      break;
  }
}
```

## Best Practices

### 1. Clear Boundaries

```typescript
// ✅ Good: Clear separation of concerns
const userEngine = createUserEngine(); // User state only
const ordersEngine = createOrdersEngine(); // Orders only
const cartEngine = createCartEngine(); // Cart only

// ❌ Bad: Mixing concerns
const everythingEngine = createEverythingEngine(); // Too much
```

### 2. Minimal Communication

```typescript
// ✅ Good: Explicit coordination points
eventBus.subscribe('USER_LOGGED_OUT', () => {
  cartEngine.step([ClearCart.create({})]);
});

// ❌ Bad: Tight coupling
cartEngine.setAuthEngine(authEngine); // Don't do this
```

### 3. Independent Testing

```typescript
// ✅ Each engine can be tested independently
describe('Cart Engine', () => {
  it('should add items', () => {
    const engine = createCartEngine();
    engine.step([AddItem.create({ itemId: '123' })]);
    expect(engine.getContext().items.length).toBe(1);
  });
});

describe('Auth Engine', () => {
  it('should login users', () => {
    const engine = createAuthEngine();
    engine.step([Login.create({ username: 'alice' })]);
    expect(engine.getContext().user).toBeTruthy();
  });
});
```

### 4. Document Dependencies

```typescript
/**
 * Shopping Cart Engine
 *
 * Dependencies:
 * - Auth engine: Requires user ID to load cart
 * - Checkout engine: Sends total for checkout
 *
 * Emits:
 * - CartUpdated: When items change
 * - CartCleared: When cart is emptied
 */
export function createCartEngine() {
  // ...
}
```

## Comparison with XState

| Feature             | XState               | Praxis                         |
| ------------------- | -------------------- | ------------------------------ |
| **Parallel States** | `type: 'parallel'`   | Multiple engines               |
| **Coordination**    | Parent state machine | Coordinator pattern            |
| **Communication**   | Event forwarding     | Event bus or shared state      |
| **Hierarchy**       | Nested states        | Parent-child engines           |
| **Testing**         | Test parent machine  | Test each engine independently |

## Summary

The parallel state pattern in Praxis provides:

- ✅ **Independent Engines**: Each subsystem has its own engine
- ✅ **Flexible Coordination**: Event bus, coordinator, or shared state
- ✅ **Clear Boundaries**: Separation of concerns
- ✅ **Easy Testing**: Test engines independently
- ✅ **Svelte Integration**: Use multiple engines in components
- ✅ **Scalable**: Add or remove engines as needed

Choose the right pattern based on your needs:

- **Independent engines**: When subsystems don't interact
- **Event bus**: When you need loose coupling with pub/sub
- **Coordinator**: When you need centralized orchestration
- **Shared state**: When engines need to share data
- **Hierarchy**: When you have parent-child relationships

For more examples, see:

- [E-Commerce Example](/src/examples/hero-ecommerce/)
- [Auth Example](/src/examples/auth-basic/)
- [Multiple Engine Tests](/src/__tests__/edge-cases.test.ts)
