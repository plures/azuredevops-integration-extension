# History State Pattern in Praxis

This guide explains how to implement and use the history state pattern in Praxis, similar to XState's history states.

## Overview

The history state pattern allows you to track and navigate through state transitions in your application. This is particularly useful for:

- **Undo/Redo functionality**: Let users reverse actions
- **Time-travel debugging**: Inspect and navigate application state history
- **Authentication flows**: Return to previous states after authentication
- **Complex workflows**: Remember where users were before interruptions

## Table of Contents

1. [Basic History Tracking](#basic-history-tracking)
2. [Using History State Manager](#using-history-state-manager)
3. [History Engine Wrapper](#history-engine-wrapper)
4. [Svelte 5 Integration](#svelte-5-integration)
5. [Authentication Flow Example](#authentication-flow-example)
6. [Best Practices](#best-practices)

## Basic History Tracking

The simplest way to track history is using the `HistoryStateManager`:

```typescript
import { HistoryStateManager } from '@plures/praxis/svelte';

// Create a history manager with max 50 entries
const history = new HistoryStateManager<MyContext>(50);

// Record state changes
history.record(engine.getState(), events, 'Login Action');

// Navigate history
if (history.canGoBack()) {
  const previousState = history.back();
  console.log('Previous state:', previousState);
}

if (history.canGoForward()) {
  const nextState = history.forward();
  console.log('Next state:', nextState);
}

// Get all history
const allHistory = history.getHistory();
console.log(`Total history entries: ${allHistory.length}`);
```

## Using History State Manager

The `HistoryStateManager` provides full control over state history:

### Recording History

```typescript
import { createPraxisEngine, HistoryStateManager } from '@plures/praxis';

interface AppContext {
  user: string | null;
  page: string;
}

const engine = createPraxisEngine<AppContext>({
  /* ... */
});
const history = new HistoryStateManager<AppContext>(100);

// Record initial state
history.record(engine.getState(), [], 'Initial State');

// Process events and record
const events = [Login.create({ username: 'alice' })];
engine.step(events);
history.record(engine.getState(), events, 'User Login');
```

### Navigating History

```typescript
// Go back one step
const previousEntry = history.back();
if (previousEntry) {
  console.log('Moved to:', previousEntry.label);
  console.log('State:', previousEntry.state);
}

// Go forward one step
const nextEntry = history.forward();

// Jump to specific point
const entry = history.goTo(5);

// Check navigation availability
console.log('Can undo:', history.canGoBack());
console.log('Can redo:', history.canGoForward());
console.log('Current position:', history.getCurrentIndex());
```

### Inspecting History

```typescript
// Get current state
const current = history.current();
if (current) {
  console.log('Current:', current.label);
  console.log('Timestamp:', new Date(current.timestamp));
  console.log('Events:', current.events);
}

// Get all history entries
const allEntries = history.getHistory();
allEntries.forEach((entry, index) => {
  console.log(`${index}: ${entry.label} at ${new Date(entry.timestamp)}`);
});

// Clear history
history.clear();
```

## History Engine Wrapper

For automatic history tracking, use `createHistoryEngine`:

```typescript
import { createPraxisEngine, createHistoryEngine } from '@plures/praxis/svelte';

// Create base engine
const baseEngine = createPraxisEngine<AppContext>({
  initialContext: { user: null, page: 'home' },
  registry,
});

// Wrap with history tracking
const historyEngine = createHistoryEngine(baseEngine, {
  maxHistorySize: 50,
  initialLabel: 'App Started',
});

// Use like normal engine, but with history
historyEngine.dispatch([Login.create({ username: 'alice' })], 'User Login');

// Undo/redo
if (historyEngine.canUndo()) {
  historyEngine.undo();
}

if (historyEngine.canRedo()) {
  historyEngine.redo();
}

// Navigate to specific point
historyEngine.goToHistory(3);

// Inspect history
const history = historyEngine.getHistory();
history.forEach((entry) => {
  console.log(`${entry.label}: ${entry.events.length} events`);
});

// Clear history if needed
historyEngine.clearHistory();
```

## Svelte 5 Integration

Praxis provides first-class Svelte 5 support with runes:

### Using `usePraxisEngine` with History

```svelte
<script lang="ts">
  import { usePraxisEngine } from '@plures/praxis/svelte';
  import { createMyEngine, Login, Logout } from './my-engine';

  const engine = createMyEngine();
  const {
    context,
    dispatch,
    undo,
    redo,
    canUndo,
    canRedo,
    snapshots,
    historyIndex
  } = usePraxisEngine(engine, {
    enableHistory: true,
    maxHistorySize: 50
  });
</script>

<div class="app">
  <header>
    <h1>Welcome {context.user?.name || 'Guest'}</h1>
    <p>History: {historyIndex + 1} / {snapshots.length}</p>
  </header>

  <main>
    {#if !context.user}
      <button onclick={() => dispatch([Login.create({ username: 'alice' })])}>
        Login
      </button>
    {:else}
      <button onclick={() => dispatch([Logout.create({})])}>
        Logout
      </button>
    {/if}
  </main>

  <footer>
    <button onclick={undo} disabled={!canUndo}>
      Undo
    </button>
    <button onclick={redo} disabled={!canRedo}>
      Redo
    </button>
  </footer>
</div>
```

### Time-Travel Debugging

```svelte
<script lang="ts">
  import { usePraxisEngine } from '@plures/praxis/svelte';
  import { createMyEngine } from './my-engine';

  const engine = createMyEngine();
  const { context, snapshots, goToSnapshot, historyIndex } =
    usePraxisEngine(engine, { enableHistory: true });
</script>

<div class="debugger">
  <h2>Time-Travel Debugger</h2>

  <div class="timeline">
    {#each snapshots as snapshot, index}
      <button
        class:active={index === historyIndex}
        onclick={() => goToSnapshot(index)}
      >
        {new Date(snapshot.timestamp).toLocaleTimeString()}
        {#if snapshot.events.length > 0}
          ({snapshot.events.length} events)
        {/if}
      </button>
    {/each}
  </div>

  <div class="state-view">
    <h3>Current State</h3>
    <pre>{JSON.stringify(context, null, 2)}</pre>
  </div>
</div>
```

## Authentication Flow Example

Here's a complete example showing how to use history states for auth flows:

```typescript
// auth-engine.ts
import {
  createPraxisEngine,
  PraxisRegistry,
  defineFact,
  defineEvent,
  defineRule,
  findEvent,
} from '@plures/praxis';

interface AuthContext {
  user: { id: string; name: string } | null;
  previousPage: string | null;
  currentPage: string;
  attemptedSecurePage: string | null;
}

// Define facts
const UserAuthenticated = defineFact<
  'UserAuthenticated',
  {
    userId: string;
    name: string;
  }
>('UserAuthenticated');

const NavigatedToPage = defineFact<
  'NavigatedToPage',
  {
    page: string;
  }
>('NavigatedToPage');

// Define events
const Login = defineEvent<
  'LOGIN',
  {
    username: string;
    password: string;
  }
>('LOGIN');

const Logout = defineEvent<'LOGOUT', {}>('LOGOUT');

const NavigateTo = defineEvent<
  'NAVIGATE_TO',
  {
    page: string;
    requiresAuth?: boolean;
  }
>('NAVIGATE_TO');

// Define rules
const loginRule = defineRule<AuthContext>({
  id: 'auth.login',
  description: 'Authenticate user',
  impl: (state, events) => {
    const loginEvent = findEvent(events, Login);
    if (!loginEvent) return [];

    // Simulate authentication
    const { username } = loginEvent.payload;
    state.context.user = { id: username, name: username };

    // Return to attempted secure page if exists
    if (state.context.attemptedSecurePage) {
      state.context.currentPage = state.context.attemptedSecurePage;
      state.context.attemptedSecurePage = null;
    }

    return [UserAuthenticated.create({ userId: username, name: username })];
  },
});

const logoutRule = defineRule<AuthContext>({
  id: 'auth.logout',
  description: 'Log out user',
  impl: (state, events) => {
    const logoutEvent = findEvent(events, Logout);
    if (!logoutEvent) return [];

    state.context.previousPage = state.context.currentPage;
    state.context.user = null;
    state.context.currentPage = 'login';

    return [];
  },
});

const navigationRule = defineRule<AuthContext>({
  id: 'navigation.navigate',
  description: 'Handle navigation',
  impl: (state, events) => {
    const navEvent = findEvent(events, NavigateTo);
    if (!navEvent) return [];

    const { page, requiresAuth } = navEvent.payload;

    // Check if page requires authentication
    if (requiresAuth && !state.context.user) {
      state.context.attemptedSecurePage = page;
      state.context.currentPage = 'login';
      return [];
    }

    state.context.previousPage = state.context.currentPage;
    state.context.currentPage = page;

    return [NavigatedToPage.create({ page })];
  },
});

export function createAuthEngine() {
  const registry = new PraxisRegistry<AuthContext>();
  registry.registerRule(loginRule);
  registry.registerRule(logoutRule);
  registry.registerRule(navigationRule);

  return createPraxisEngine<AuthContext>({
    initialContext: {
      user: null,
      previousPage: null,
      currentPage: 'home',
      attemptedSecurePage: null,
    },
    registry,
  });
}

export { Login, Logout, NavigateTo };
```

### Using the Auth Engine with History

```svelte
<script lang="ts">
  import { usePraxisEngine } from '@plures/praxis/svelte';
  import { createAuthEngine, Login, Logout, NavigateTo } from './auth-engine';

  const engine = createAuthEngine();
  const { context, dispatch, undo, canUndo } = usePraxisEngine(engine, {
    enableHistory: true
  });

  function login() {
    dispatch([Login.create({
      username: 'alice',
      password: 'secret123'
    })], 'User Login');
  }

  function logout() {
    dispatch([Logout.create({})], 'User Logout');
  }

  function goToProfile() {
    dispatch([NavigateTo.create({
      page: 'profile',
      requiresAuth: true
    })], 'Navigate to Profile');
  }

  function returnToPrevious() {
    if (context.previousPage) {
      dispatch([NavigateTo.create({
        page: context.previousPage
      })], 'Return to Previous Page');
    } else if (canUndo) {
      undo();
    }
  }
</script>

<div class="auth-app">
  <nav>
    <button onclick={() => dispatch([NavigateTo.create({ page: 'home' })])}>
      Home
    </button>
    <button onclick={goToProfile}>
      Profile {context.user ? '' : '(requires login)'}
    </button>
  </nav>

  <main>
    {#if context.currentPage === 'login'}
      <div class="login">
        <h2>Please Login</h2>
        {#if context.attemptedSecurePage}
          <p>You need to login to access: {context.attemptedSecurePage}</p>
        {/if}
        <button onclick={login}>Login as Alice</button>
      </div>
    {:else if context.currentPage === 'profile'}
      <div class="profile">
        <h2>Profile</h2>
        <p>Welcome, {context.user?.name}!</p>
        <button onclick={logout}>Logout</button>
      </div>
    {:else}
      <div class="home">
        <h2>Home</h2>
        {#if context.user}
          <p>Logged in as: {context.user.name}</p>
          <button onclick={logout}>Logout</button>
        {:else}
          <button onclick={login}>Login</button>
        {/if}
      </div>
    {/if}
  </main>

  <footer>
    {#if context.previousPage || canUndo}
      <button onclick={returnToPrevious}>
        ← Back
      </button>
    {/if}
  </footer>
</div>
```

## Best Practices

### 1. Set Appropriate History Limits

```typescript
// For user-facing undo/redo: smaller limit
const userHistory = new HistoryStateManager<Context>(20);

// For debugging: larger limit
const debugHistory = new HistoryStateManager<Context>(100);

// For critical audit trails: very large or unlimited
const auditHistory = new HistoryStateManager<Context>(10000);
```

### 2. Label Important States

```typescript
historyEngine.dispatch(
  [PlaceOrder.create({ orderId: '123' })],
  'Order Placed' // Clear label for debugging
);
```

### 3. Clear History When Appropriate

```typescript
// Clear on logout to protect privacy
function handleLogout() {
  historyEngine.dispatch([Logout.create({})]);
  historyEngine.clearHistory();
}

// Clear when starting new workflow
function startNewProject() {
  historyEngine.clearHistory();
  historyEngine.dispatch([CreateProject.create({})], 'New Project');
}
```

### 4. Combine with Context State

```typescript
interface AppContext {
  // Application state
  user: User | null;

  // Built-in history tracking in context
  navigationHistory: string[];

  // Previous state for quick back
  previousView: string | null;
}

// You can use both engine history and context-based history
const navigationRule = defineRule<AppContext>({
  id: 'nav.track',
  impl: (state, events) => {
    const nav = findEvent(events, Navigate);
    if (!nav) return [];

    state.context.previousView = state.context.currentView;
    state.context.navigationHistory.push(nav.payload.page);
    state.context.currentView = nav.payload.page;

    return [];
  },
});
```

### 5. Persist Critical History

```typescript
import { HistoryStateManager } from '@plures/praxis/svelte';

// Save to localStorage
function saveHistory(history: HistoryStateManager<Context>) {
  const entries = history.getHistory();
  localStorage.setItem('app-history', JSON.stringify(entries));
}

// Restore from localStorage
function loadHistory(history: HistoryStateManager<Context>) {
  const saved = localStorage.getItem('app-history');
  if (saved) {
    const entries = JSON.parse(saved);
    entries.forEach((entry: any) => {
      history.record(entry.state, entry.events, entry.label);
    });
  }
}
```

### 6. Use History for Error Recovery

```typescript
const errorRecoveryRule = defineRule<AppContext>({
  id: 'error.recover',
  impl: (state, events) => {
    const error = findEvent(events, ErrorOccurred);
    if (!error) return [];

    // Log error with context
    console.error('Error at state:', state.context);

    // You can use history to diagnose or recover
    // historyEngine.undo() to revert to last good state

    return [ErrorLogged.create({ error: error.payload })];
  },
});
```

## Comparison with XState

| Feature                     | XState                | Praxis                               |
| --------------------------- | --------------------- | ------------------------------------ |
| **Built-in History States** | ✅ Native support     | ✅ Pattern-based implementation      |
| **History Types**           | Shallow/Deep          | Configurable via HistoryStateManager |
| **Time-Travel**             | Via DevTools          | ✅ Built into usePraxisEngine        |
| **Undo/Redo**               | Custom implementation | ✅ Built-in with createHistoryEngine |
| **Snapshot Support**        | ✅ Via snapshot()     | ✅ Via usePraxisEngine snapshots     |
| **History Size Limits**     | Manual                | ✅ Automatic with maxHistorySize     |

## Summary

The history state pattern in Praxis provides:

- ✅ **Flexible History Tracking**: Use `HistoryStateManager` for full control
- ✅ **Automatic History**: Wrap engines with `createHistoryEngine`
- ✅ **Svelte 5 Integration**: Native runes support with `usePraxisEngine`
- ✅ **Time-Travel Debugging**: Navigate and inspect state history
- ✅ **Undo/Redo**: Built-in support for user actions
- ✅ **Auth Flow Support**: Return to previous states after authentication

The pattern is designed to be:

- **Simple**: Easy to understand and use
- **Flexible**: Works with any Praxis engine
- **Performant**: Configurable history limits
- **Type-Safe**: Full TypeScript support
- **Framework-Agnostic**: Use with or without Svelte

For more examples, see:

- [Svelte Counter Example](/src/examples/svelte-counter/index.ts)
- [Auth Basic Example](/src/examples/auth-basic/index.ts)
- [Svelte Integration Tests](/src/__tests__/svelte-integration.test.ts)
