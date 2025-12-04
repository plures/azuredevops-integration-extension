# Live Canvas Implementation Guide

The "Live Praxis" feature has been implemented, enabling a real-time bi-directional link between the VS Code Extension and the Praxis Canvas.

## Architecture

The system consists of three components communicating via WebSockets:

1.  **Canvas Server (`scripts/canvas/server.ts`)**:
    - Hosts the UI at `http://localhost:3000`.
    - Runs a WebSocket Server at `ws://localhost:3001`.
    - Relays messages between all connected clients (Extension <-> Canvas UI).

2.  **Canvas UI (`scripts/canvas/index.html`)**:
    - Connects to `ws://localhost:3001`.
    - **Receives**: `FSM_EVENT` and `FSM_STATE_CHANGE` messages to visualize activity (flashing nodes, event log).
    - **Sends**: `TRIGGER_EVENT` messages when the user manually triggers an event via the UI.

3.  **Extension Bridge (`src/fsm/logging/LiveCanvasBridge.ts`)**:
    - Initialized in `src/activation.ts`.
    - Connects to `ws://localhost:3001`.
    - **Sends**: Forwards all `FSMLogger` events to the WebSocket.
    - **Receives**: Listens for `TRIGGER_EVENT` messages and dispatches them to the `ApplicationMachine` via `dispatchApplicationEvent`.

## Usage

1.  **Start the Canvas Server**:

    ```bash
    npm run canvas:custom
    ```

    - Open `http://localhost:3000` in your browser.
    - Verify the "Live" button shows "🟢 Connected".

2.  **Run the Extension**:
    - Press `F5` in VS Code to launch the extension.
    - The extension will automatically connect to the WebSocket server.
    - You should see "Connected to Live Canvas" in the Debug Console.

3.  **Observe Real-time Activity**:
    - Interact with the extension (e.g., open a work item, start a timer).
    - The Canvas UI will flash the corresponding nodes.
    - The "Event Log" panel in the Canvas will show the raw events.

4.  **Trigger Events**:
    - In the Canvas UI, click "Trigger Event".
    - Enter an event name (e.g., `TIMER_START`) and optional JSON payload.
    - Click "Send".
    - The extension will receive the event and the FSM will react accordingly.

## Troubleshooting

- **Not Connecting**: Ensure `npm run canvas:custom` is running. The extension attempts to reconnect every 5 seconds if the server is offline.
- **Port Conflicts**: The server uses ports 3000 (HTTP) and 3001 (WS). Ensure these are free.
- **Logs not showing**: Check `azureDevOpsIntegration.logging.enabled` setting in VS Code.
