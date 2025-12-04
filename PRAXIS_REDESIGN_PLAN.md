# Praxis Redesign Plan

This document outlines the plan to eliminate the legacy "FSM Manager" wrappers (ApplicationFSMManager.ts, ConnectionFSMManager.ts) and fully integrate the Praxis framework directly into the application lifecycle.

## Goal

Remove the hybrid state where Praxis is wrapped by legacy classes. The application should instantiate and interact with PraxisApplicationManager directly.

## Current Architecture (Hybrid/Legacy)

`mermaid
graph TD
Activation[activation.ts] --> AppFSM[ApplicationFSMManager (Legacy Wrapper)]
AppFSM --> PraxisApp[PraxisApplicationManager]
Activation --> ConnFSM[ConnectionFSMManager (Legacy Wrapper)]
ConnFSM --> PraxisConn[PraxisConnectionManager]
AppFSM --> WebviewBridge[ExtensionHostBridge]
``n

## Target Architecture (Pure Praxis)

`mermaid
graph TD
Activation[activation.ts] --> PraxisApp[PraxisApplicationManager]
PraxisApp --> PraxisConn[PraxisConnectionManager]
PraxisApp --> WebviewBridge[ExtensionHostBridge]
``n

## Migration Steps

### 1. Enhance PraxisApplicationManager

The legacy ApplicationFSMManager handles some "glue" logic that needs to be moved into PraxisApplicationManager or handled via a proper setup utility.

- [x] **Webview Bridge Registration**: Move setApplicationStoreBridge logic into PraxisApplicationManager (or a dedicated setupWebviewBridge method).
- [x] **Tracing**: Ensure smTracer instrumentation is preserved.
- [x] **Device Code Handling**: Ensure deviceCodeReceived is fully supported.

### 2. Enhance PraxisConnectionManager / ConnectionService

The legacy ConnectionFSMManager contains complex polling logic (waitForConnection) that drives the authentication flow. This logic is actually "side effect" management that belongs in a Service or Actor, not the raw FSM.

- [x] **Refactor Polling Logic**: The waitForConnection logic in ConnectionFSMManager is effectively a "Connection Actor". We should move this to src/praxis/connection/services/ConnectionService.ts (or similar) that PraxisApplicationManager can use.
- [x] **Direct Usage**: ctivation.ts should use this service to drive connections.

### 3. Refactor ctivation.ts

- [x] **Instantiate Praxis Directly**: Replace getApplicationFSMManager() with
      ew PraxisApplicationManager().
- [x] **Update Connection Logic**: Replace getConnectionFSMManager() calls with direct calls to the new Connection Service or PraxisApplicationManager.

### 4. Cleanup

- [x] **Delete Legacy Wrappers**: Remove ApplicationFSMManager.ts and ConnectionFSMManager.ts.
- [x] **Delete Adapters**: Remove ConnectionAdapter.ts.

## Status

**COMPLETE**. The legacy wrappers have been removed and the application now uses the Praxis framework directly.
