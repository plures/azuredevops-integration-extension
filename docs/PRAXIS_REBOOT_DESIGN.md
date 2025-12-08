# Praxis Reboot: The "Reactive Core" Design

## 1. Philosophy & Motivation

**Problem**: The current system suffers from "event unpredictability". It is difficult to trace which events trigger which actions, leading to bugs like the "empty connection list" despite successful authentication. The hybrid FSM/Praxis approach has become complex.

**Goal**: A **Predictable, Testable, and Reactive** architecture.

- **Predictable**: All events are formally registered. Illegal events fail at compile time.
- **Testable**: Logic is pure. State is explicit.
- **Reactive**: The system reacts to state changes, not just transient events.

## 2. Core Architecture

We will leverage **Svelte 5 Runes** (`$state`, `$derived`, `$effect`) as the universal state management engine, running in both the **Extension Host (Node.js)** and the **WebView**.

### 2.1. The Event Registry (Compile-Time Safety)

We will abandon loose string-based events for strict TypeScript Discriminated Unions.

```typescript
// src/praxis-core/events/registry.ts

export type ConnectionEvent =
  | { type: 'CONNECTION_ADDED'; payload: ConnectionConfig }
  | { type: 'CONNECTION_REMOVED'; payload: { id: string } }
  | { type: 'CONNECTION_ERROR'; payload: { id: string; error: AppError } };

export type AuthEvent =
  | { type: 'AUTH_STARTED'; payload: { provider: string } }
  | { type: 'AUTH_SUCCESS'; payload: { token: string } }
  | { type: 'AUTH_FAILED'; payload: { reason: string } };

export type AppEvent = ConnectionEvent | AuthEvent; // ... and so on
```

### 2.2. The Reactive State Model (Svelte 5)

The entire application state will be a single (or composed) Svelte 5 `$state` object. This serves as the "Single Source of Truth".

```typescript
// src/praxis-core/state/appState.svelte.ts

export class AppState {
  connections = $state<Connection[]>([]);
  activeConnectionId = $state<string | null>(null);
  errors = $state<AppError[]>([]);

  // Derived state (Computed)
  activeConnection = $derived(this.connections.find((c) => c.id === this.activeConnectionId));

  constructor() {
    // Initial state setup
  }
}

export const appState = new AppState();
```

### 2.3. Rules (Pure Mutators)

Rules are functions that take the State and an Event, and mutate the State. They contain **Business Logic**. They do NOT perform side effects (I/O).

```typescript
// src/praxis-core/rules/connectionRules.ts

export function handleConnectionError(
  state: AppState,
  event: ConnectionEvent & { type: 'CONNECTION_ERROR' }
) {
  const { id, error } = event.payload;
  const conn = state.connections.find((c) => c.id === id);
  if (conn) {
    conn.status = 'error';
    conn.errorDetails = error; // Update context with error property
  }
  // Add to global error log
  state.errors.push(error);
}
```

### 2.4. Actors (Reactive Side Effects)

Actors are **Svelte Effects** (`$effect`). They watch the state and perform I/O when specific conditions are met.

```typescript
// src/praxis-core/actors/loggingActor.svelte.ts

$effect(() => {
  // Reacts whenever appState.errors changes
  if (appState.errors.length > 0) {
    const lastError = appState.errors[appState.errors.length - 1];
    console.error(`[Actor] New Error: ${lastError.message}`);
    // Telemetry.trackError(lastError);
  }
});
```

## 3. The Bridge (Extension Host <-> WebView)

Since we use Svelte 5 in the Extension Host, we can create a "Bridge Actor" that automatically syncs state to the WebView.

```typescript
// src/praxis-core/bridge/webviewBridge.svelte.ts

export function setupWebviewBridge(webview: vscode.Webview, state: AppState) {
  // 1. Send initial state
  webview.postMessage({ type: 'SYNC', payload: $state.snapshot(state) });

  // 2. React to changes and sync
  $effect.root(() => {
    $effect(() => {
      // This runs whenever 'state.connections' or 'state.activeConnectionId' changes
      const syncPacket = {
        connections: state.connections,
        activeId: state.activeConnectionId,
      };
      webview.postMessage({ type: 'STATE_UPDATE', payload: syncPacket });
    });
  });
}
```

## 4. Implementation Plan

1.  **Scaffold `src/praxis-core/`**: Create the directory structure.
2.  **Define `EventRegistry`**: Port existing events to the new strict types.
3.  **Create `AppState`**: Define the Svelte 5 class for the domain model.
4.  **Migrate Logic**: Move logic from `src/fsm/functions` to `src/praxis-core/rules`.
5.  **Implement Bridge**: Connect the new state to the existing WebView.

## 5. Addressing Specific Requirements

- **"Connection errors update the connection object context..."**: Handled by `handleConnectionError` rule above.
- **"Webview reacts to context..."**: The WebView will receive the `STATE_UPDATE` message and update its own local Svelte store.
- **"Actors react to context changes..."**: Handled by `$effect` blocks in the Extension Host.

## 6. Questions & Answers

- **"How will this affect running in the extension host?"**: Svelte 5 runs perfectly in Node.js. We just need to ensure we use `.svelte.ts` files and the correct build configuration (esbuild-svelte).
- **"Will we still need a bridge?"**: Yes, process boundaries exist. But the bridge becomes a _dumb pipe_ that just syncs the reactive state, rather than containing complex logic.
