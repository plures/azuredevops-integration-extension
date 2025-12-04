# Live Praxis Canvas Architecture

## Overview

The "Live Praxis Canvas" aims to bridge the gap between the static visualization of application logic and the runtime behavior of the VS Code extension. This enables developers to:

1.  **Visualize** the active state of the application in real-time.
2.  **Debug** logic by seeing which rules are triggering.
3.  **Interact** with the running application by triggering events directly from the canvas.

## Architecture

### 1. Communication Bridge (WebSocket)

Since the VS Code extension runs in a separate process from the Canvas (browser/Node server), we need a bi-directional communication channel.

- **Server**: The Canvas Server (`scripts/canvas/server.ts`) will host a WebSocket server on port `3001` (or share `3000`).
- **Client**: The VS Code Extension will act as a WebSocket client, connecting when the "Debug Mode" is enabled.

### 2. Protocol

Messages will be JSON objects with a `type` field.

**Extension -> Canvas:**

- `FSM_EVENT`: Sent when an event is dispatched in the FSM.
  ```json
  { "type": "FSM_EVENT", "event": "azure.workItem.loaded", "payload": { ... } }
  ```
- `FSM_STATE_CHANGE`: Sent when a state machine transitions.
  ```json
  { "type": "FSM_STATE_CHANGE", "machine": "timer", "from": "idle", "to": "running" }
  ```
- `LOG_ENTRY`: General logs from `FSMLogger`.

**Canvas -> Extension:**

- `TRIGGER_EVENT`: Sent when the user clicks "Trigger" in the Canvas.
  ```json
  { "type": "TRIGGER_EVENT", "event": "timer.start", "payload": { "id": 123 } }
  ```

### 3. Visualization Enhancements

#### A. Domain Grouping (Swimlanes)

Rules will be visually grouped by their domain prefix (e.g., `azure.*`, `timer.*`, `auth.*`) using Cytoscape compound nodes. This creates "swimlanes" or "clusters" that make the graph easier to digest.

#### B. Real-time Highlighting

- **Active State**: Nodes representing the current state will be highlighted (e.g., green border).
- **Event Flow**: When an event triggers a rule, the corresponding edge and node will flash.

#### C. Interactive Debugging

- **Event Log Panel**: A side panel showing a scrolling list of recent events.
- **Trigger Panel**: A form to manually construct and fire events into the running extension.

## Implementation Plan

1.  **Canvas Server**: Add `ws` dependency and handle WebSocket connections.
2.  **Extension**: Create `LiveCanvasBridge` class to hook into `FSMLogger` and forward events to WS.
3.  **Frontend**: Update `index.html` to:
    - Connect to WS.
    - Handle `FSM_EVENT` messages (visual effects).
    - Add "Event Log" and "Trigger" UI components.
4.  **Grouping Logic**: Update `server.ts` to generate compound nodes based on rule IDs.

## Future Ideas

- **Replay**: Record a session and replay it in the canvas.
- **Breakpoints**: Pause the FSM when a specific rule is hit (requires deep integration).
