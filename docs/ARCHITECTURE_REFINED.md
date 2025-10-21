# Refined Architecture: Svelte 5 + XState FSM

This document outlines the modern, reactive, and robust architecture for the VS Code extension, leveraging Svelte 5 for the webview UI and an XState Finite State Machine (FSM) for all business logic and state management in the extension host.

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
