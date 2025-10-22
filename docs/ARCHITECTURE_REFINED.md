# Refined Architecture: Svelte 5 + XState FSM

# Refined Architecture: FSM-First with Unidirectional Data Flow

This document outlines the modern architectural pattern for the Azure DevOps Integration extension. It is based on a "FSM-First" principle, where all application state and business logic are managed by a central Finite State Machine (FSM). The UI, built with Svelte 5, acts as a reactive "view" of this state.

## Core Principles

1.  **Single Source of Truth**: The main application FSM, running in the extension host, is the single, authoritative source of truth for the entire application's state.
2.  **Unidirectional Data Flow**: State changes flow in one direction: from the FSM to the UI. The UI never modifies its state directly.
3.  **Event-Driven UI**: The UI sends events (messages) to the extension to trigger state changes. It does not contain business logic.
4.  **Reactive UI**: The webview is built with Svelte 5 and is purely reactive. Components subscribe to a centralized store and automatically update when the state changes.

## Data Flow Diagram

```
+----------------------+       (2) Posts 'syncState'        +---------------------+
|                      |        message with new state      |                     |
|   Extension Host     |----------------------------------->|   Webview (Svelte)  |
| (activation.ts)      |                                    | (reactive-main.ts)  |
|                      |<-----------------------------------|                     |
|   +----------------+ |       (4) Posts user action        +---------------------+
|   | Application  | |        messages (e.g., 'START_TIMER')           |
|   | FSM (XState) | |                                                   | (3) Updates store
|   +----------------+ |                                                   |
|           ^          |                                                   v
|           |          |                                          +----------------+
| (1) State |          |                                          |                |
|   Changes |          |                                          | appState Store |
|           |          |                                          | (store.svelte) |
|           v          |                                          +----------------+
|   +----------------+ |                                                   ^
|   | FSM Subscriber| |                                                  |
|   +----------------+ |                                                  | (Updates UI)
|                      |                                          +----------------+
+----------------------+                                          | Svelte         |
                                                                  | Components     |
                                                                  +----------------+
```

## Detailed Breakdown

### 1. Extension Host (`src/activation.ts`)

-   **Application FSM**: An XState state machine (`applicationMachine.ts`) defines all possible states, transitions, and actions for the application. It manages connections, authentication, data fetching, and timer logic.
-   **State Synchronization**: In `activation.ts`, we subscribe to the application FSM. Whenever the FSM's state changes, the subscriber receives the new state.
-   **`syncState` Message**: The subscriber's primary job is to take the new state, serialize it, and post it to the webview inside a `syncState` message. This is the only message the extension sends to the webview to update its UI.

### 2. Webview (`src/webview/`)

-   **Entry Point (`reactive-main.ts`)**: The webview's entry point is minimal. It:
    1.  Mounts the root Svelte component (`ReactiveApp.svelte`).
    2.  Sets up a single `message` listener.
    3.  When it receives a `syncState` message, it updates the central `appState` store with the payload.

-   **Central Store (`store.svelte.ts`)**:
    -   This file defines and exports a single Svelte 5 store: `appState`.
    -   `export const appState = $state(initialState);`
    -   This store holds the entire state object received from the extension.

-   **Svelte Components (`src/webview/components/`)**:
    -   Components are "dumb" and purely presentational.
    -   They import `appState` from the central store.
    -   They use `$derived` to compute values from the state (e.g., `let workItems = $derived(appState.context.workItems ?? []);`).
    -   When a user interacts with the UI (e.g., clicks a button), the component does **not** change its own state. Instead, it posts a message to the extension host using `vscode.postMessage({ type: 'EVENT_NAME', payload: {...} });`.

### 3. Event Flow (User Action)

1.  A user clicks the "Start Timer" button in the webview.
2.  The Svelte component's event handler calls `vscode.postMessage({ type: 'START_TIMER', payload: { workItemId: 123 } });`.
3.  The `onDidReceiveMessage` listener in `activation.ts` receives this message.
4.  It forwards the event to the application FSM: `dispatchApplicationEvent({ type: 'WEBVIEW_START_TIMER', ... })`.
5.  The FSM transitions to a new state (e.g., `timing`).
6.  The FSM subscriber in `activation.ts` is notified of the state change.
7.  The subscriber sends a new `syncState` message to the webview with the updated state object (which now includes the active timer details).
8.  The webview's message listener updates the `appState` store.
9.  All Svelte components that depend on the timer state reactively update to show the running timer.

## Benefits of this Architecture

-   **Predictability**: State is managed in one place (the FSM), making it easy to understand and debug.
-   **Traceability**: All state changes are the result of explicit events, which can be logged and traced.
-   **Decoupling**: The UI is completely decoupled from the business logic. The webview could be replaced with a different UI framework with no changes to the extension's core logic.
-   **Simplicity**: The webview code is extremely simple. It only renders state and forwards events. There is no complex state management, context passing, or business logic in the UI layer.
-   **Testability**: Pure functions and FSM logic are highly testable. UI components are simple and require minimal testing.


## Core Principles

1.  **Single Source of Truth**: The XState FSM running in the extension host (`src/fsm/`) is the **only** source of truth for the application's state. The UI is a reflection of this state.
2.  **Unidirectional Data Flow**: State changes flow in one direction: from the FSM to the UI. User interactions in the UI flow in the opposite direction as events sent to the FSM. This makes the application predictable and easier to debug.
3.  **Stateless UI Components**: Svelte components are "dumb" and stateless. They receive all their data from a central, reactive Svelte store and do not manage their own state. Their sole responsibility is to render the current state and dispatch events on user interaction.
4.  **Centralized Logic**: All business logic, API calls, and state mutations are handled exclusively within the FSM's actions, services, and guards. This keeps logic organized, testable, and decoupled from the UI.
5.  **Reactive UI with Svelte 5**: The webview uses a single Svelte 5 `store.svelte.ts` file. This store is a reactive object (`$state`) that mirrors the FSM's state. Components subscribe to this store and automatically update whenever the FSM's state changes.

## Architecture Diagram

```
+--------------------------------+      +--------------------------------+
|      Extension Host (VS Code)  |      |      Webview (Svelte 5)        |
+--------------------------------+      +--------------------------------+
|                                |      |                                |
|   +------------------------+   |      |   +------------------------+   |
|   |                        |   | post |   |                        |   |
|   |  XState FSM            |   |----->|   |  appState (store.svelte) |   |
|   | (Application State)    |   | msg  |   |                        |   |
|   +------------------------+   |      |   +------------------------+   |
|       ^           |            |      |              |               |
|       |           | invoke     |      |              | subscribe     |
|       |           v            |      |              v               |
|   +------------------------+   |      |   +------------------------+   |
|   |                        |   | post |   |                        |   |
|   |  Azure Client, etc.    |   |<-----|   |  Svelte Components     |   |
|   |  (Side Effects)        |   | msg  |   |  (e.g., ReactiveApp.svelte)|
|   +------------------------+   |      |   +------------------------+   |
|                                |      |                                |
+--------------------------------+      +--------------------------------+
```

## Implementation Details

### 1. Extension Host (State Management)

-   **`src/fsm/machines/applicationMachine.ts`**: The main XState machine that defines all possible states, transitions, and actions for the entire application.
-   **`src/fsm/types.ts`**: Defines the `ApplicationContext` and `ApplicationState` TypeScript interfaces, ensuring type safety between the FSM and the UI.
-   **`src/activation.ts`**:
    -   Initializes and starts the `applicationMachine`.
    -   **Crucially, it subscribes to every state change in the FSM.**
    -   On every change, it sends the complete, serialized `ApplicationState` to the webview via `webview.postMessage()`.

### 2. Webview (UI Layer)

-   **`src/webview/store.svelte.ts`**:
    -   Defines a single, reactive `$state` object named `appState`.
    -   This object is initialized with a default/empty `ApplicationState`.
    -   It is **not** exported as `const`, but as a `let`-mutable binding to allow it to be completely replaced.

-   **`src/webview/main.ts`**:
    -   The entry point for the webview.
    -   It sets up a message listener (`window.addEventListener('message', ...)`) to receive state updates from the extension host.
    -   When a `syncState` message is received, it **replaces the entire `appState` object** with the new state from the message payload. This atomic update triggers Svelte 5's reactivity.
    -   It mounts the root `App.svelte` component.

-   **`src/webview/components/*.svelte`**:
    -   All UI components live here.
    -   They **must not** have complex internal state.
    -   They import the `appState` from `../store.svelte.js`.
    -   They use `$derived` for computed values based on `appState`.
    -   Event handlers (e.g., `on:click`) **do not modify state directly**. Instead, they call a function that uses `vscode.postMessage()` to send an event (e.g., `{ type: 'START_TIMER', payload: { ... } }`) back to the extension host's FSM.

## Example Component Refactoring

**Before (Stateful Component):**

```svelte
<script>
  let workItems = [];
  let isLoading = true;

  async function fetchWorkItems() {
    // ... local logic to fetch data ...
    workItems = await ...;
    isLoading = false;
  }
</script>

{#if isLoading}
  <p>Loading...</p>
{:else}
  <!-- render workItems -->
{/if}
```

**After (Stateless, Reactive Component):**

```svelte
<script>
  import { appState } from '../store.svelte.js';

  // isLoading is now derived from the FSM's state
  let isLoading = $derived(appState.fsmState.includes('loading'));
  // workItems are now directly from the central store
  let workItems = $derived(appState.context.workItems ?? []);

  function handleRefresh() {
    // Dispatch an event to the FSM instead of fetching locally
    vscode.postMessage({ type: 'REFRESH_DATA' });
  }
</script>

<button on:click={handleRefresh}>Refresh</button>

{#if isLoading}
  <p>Loading...</p>
{:else}
  <!-- render workItems -->
{/if}
```

This architecture ensures a clean separation of concerns, improves traceability and testability, and fully leverages the power of Svelte 5's reactivity for a fast and efficient UI.
