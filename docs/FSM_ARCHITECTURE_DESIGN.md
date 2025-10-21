# Finite State Machine Architecture Design

## Overview

This document outlines the proposed finite state machine (FSM) architecture to replace the current event-driven messaging system in the Azure DevOps Extension. The FSM approach will provide predictable state transitions, better debugging capabilities, and eliminate race conditions.

## Current Problems Addressed

1. **Implicit State Management**: Currently, state is scattered across global variables (`timer`, `provider`, `activeConnectionId`, `timerConnectionInfo`, etc.)
2. **Complex Message Handler**: The `handleMessage()` function has 30+ cases with complex interdependencies
3. **Race Conditions**: Async message handling can lead to inconsistent state
4. **Difficult Debugging**: Hard to trace state changes and understand system behavior
5. **Conflicting Function Names**: Similar functions with different behaviors

## Proposed FSM Architecture

### 1. Main Extension State Machine

```typescript
type ExtensionContext = {
  vscode: vscode.ExtensionContext;
  config: WorkspaceConfiguration;
  panel?: vscode.WebviewPanel;
  outputChannel: vscode.OutputChannel;
};

type ExtensionEvents =
  | { type: 'ACTIVATE'; context: vscode.ExtensionContext }
  | { type: 'DEACTIVATE' }
  | { type: 'WEBVIEW_READY' }
  | { type: 'CONNECTION_ESTABLISHED'; connectionId: string }
  | { type: 'CONNECTION_FAILED'; error: string }
  | { type: 'ERROR'; error: Error };

const extensionMachine = createMachine({
  id: 'extension',
  initial: 'idle',
  context: {} as ExtensionContext,
  states: {
    idle: {
      on: {
        ACTIVATE: {
          target: 'activating',
          actions: 'storeContext',
        },
      },
    },
    activating: {
      invoke: {
        src: 'initializeExtension',
        onDone: 'active',
        onError: 'error',
      },
    },
    active: {
      type: 'parallel',
      states: {
        connection: {
          initial: 'disconnected',
          states: {
            disconnected: {
              /* ... */
            },
            connecting: {
              /* ... */
            },
            connected: {
              /* ... */
            },
            error: {
              /* ... */
            },
          },
        },
        timer: {
          initial: 'idle',
          states: {
            idle: {
              /* ... */
            },
            running: {
              /* ... */
            },
            paused: {
              /* ... */
            },
          },
        },
        webview: {
          initial: 'closed',
          states: {
            closed: {
              /* ... */
            },
            loading: {
              /* ... */
            },
            ready: {
              /* ... */
            },
          },
        },
      },
    },
    error: {
      on: {
        RETRY: 'activating',
        DEACTIVATE: 'idle',
      },
    },
  },
});
```

### 2. Connection State Machine

```typescript
type ConnectionContext = {
  connectionId?: string;
  client?: AzureDevOpsClient;
  provider?: WorkItemProvider;
  lastError?: string;
  retryCount: number;
};

type ConnectionEvents =
  | { type: 'CONNECT'; connectionId: string }
  | { type: 'DISCONNECT' }
  | { type: 'AUTH_SUCCESS' }
  | { type: 'AUTH_FAILED'; error: string }
  | { type: 'RETRY' }
  | { type: 'RESET' };

const connectionMachine = createMachine({
  id: 'connection',
  initial: 'disconnected',
  context: {
    retryCount: 0,
  } as ConnectionContext,
  states: {
    disconnected: {
      on: {
        CONNECT: {
          target: 'connecting',
          actions: 'setConnectionId',
        },
      },
    },
    connecting: {
      invoke: {
        src: 'establishConnection',
        onDone: {
          target: 'connected',
          actions: 'storeClient',
        },
        onError: {
          target: 'error',
          actions: 'storeError',
        },
      },
    },
    connected: {
      on: {
        DISCONNECT: 'disconnected',
        AUTH_FAILED: 'error',
      },
      invoke: {
        src: 'healthCheck',
        onError: 'error',
      },
    },
    error: {
      on: {
        RETRY: {
          target: 'connecting',
          guard: 'canRetry',
          actions: 'incrementRetry',
        },
        RESET: {
          target: 'disconnected',
          actions: 'resetRetryCount',
        },
      },
    },
  },
});
```

### 3. Timer State Machine

```typescript
type TimerContext = {
  workItemId?: number;
  workItemTitle?: string;
  startTime?: number;
  elapsedSeconds: number;
  isPaused: boolean;
  lastActivity: number;
  connectionInfo?: TimerConnectionInfo;
};

type TimerEvents =
  | { type: 'START'; workItemId: number; workItemTitle: string }
  | { type: 'PAUSE'; manual?: boolean }
  | { type: 'RESUME'; fromActivity?: boolean }
  | { type: 'STOP' }
  | { type: 'TICK' }
  | { type: 'ACTIVITY' }
  | { type: 'INACTIVITY_TIMEOUT' };

const timerMachine = createMachine({
  id: 'timer',
  initial: 'idle',
  context: {
    elapsedSeconds: 0,
    isPaused: false,
    lastActivity: Date.now(),
  } as TimerContext,
  states: {
    idle: {
      on: {
        START: {
          target: 'running',
          actions: ['startTimer', 'notifyStateChange'],
        },
      },
    },
    running: {
      invoke: [{ src: 'tickInterval' }, { src: 'inactivityCheck' }],
      on: {
        TICK: {
          actions: 'updateElapsed',
        },
        PAUSE: {
          target: 'paused',
          actions: ['pauseTimer', 'notifyStateChange'],
        },
        STOP: {
          target: 'idle',
          actions: ['stopTimer', 'notifyStateChange'],
        },
        ACTIVITY: {
          actions: 'recordActivity',
        },
        INACTIVITY_TIMEOUT: {
          target: 'paused',
          actions: ['pauseTimer', 'notifyInactivity'],
        },
      },
    },
    paused: {
      on: {
        RESUME: {
          target: 'running',
          actions: ['resumeTimer', 'notifyStateChange'],
        },
        STOP: {
          target: 'idle',
          actions: ['stopTimer', 'notifyStateChange'],
        },
        ACTIVITY: [
          {
            target: 'running',
            guard: 'shouldAutoResume',
            actions: ['resumeTimer', 'recordActivity', 'notifyStateChange'],
          },
          {
            actions: 'recordActivity',
          },
        ],
      },
    },
  },
});
```

### 4. Webview State Machine

```typescript
type WebviewContext = {
  panel?: vscode.WebviewPanel;
  workItems: any[];
  selectedItems: number[];
  isLoading: boolean;
  error?: string;
};

type WebviewEvents =
  | { type: 'SHOW' }
  | { type: 'HIDE' }
  | { type: 'READY' }
  | { type: 'MESSAGE'; message: any }
  | { type: 'LOAD_WORK_ITEMS' }
  | { type: 'WORK_ITEMS_LOADED'; items: any[] }
  | { type: 'ERROR'; error: string };

const webviewMachine = createMachine({
  id: 'webview',
  initial: 'closed',
  context: {
    workItems: [],
    selectedItems: [],
    isLoading: false,
  } as WebviewContext,
  states: {
    closed: {
      on: {
        SHOW: 'opening',
      },
    },
    opening: {
      invoke: {
        src: 'createWebviewPanel',
        onDone: 'loading',
        onError: 'error',
      },
    },
    loading: {
      entry: 'setLoading',
      on: {
        READY: 'ready',
        ERROR: 'error',
      },
    },
    ready: {
      entry: 'clearLoading',
      on: {
        MESSAGE: {
          actions: 'handleMessage',
        },
        LOAD_WORK_ITEMS: 'loading_data',
        HIDE: 'closed',
      },
    },
    loading_data: {
      invoke: {
        src: 'loadWorkItems',
        onDone: {
          target: 'ready',
          actions: 'setWorkItems',
        },
        onError: 'error',
      },
    },
    error: {
      on: {
        RETRY: 'opening',
        HIDE: 'closed',
      },
    },
  },
});
```

### 5. Message Router State Machine

Instead of the large switch statement, we'll use a message router that dispatches events to the appropriate machines:

```typescript
type MessageRouterContext = {
  extensionMachine: AnyInterpreter;
  connectionMachine: AnyInterpreter;
  timerMachine: AnyInterpreter;
  webviewMachine: AnyInterpreter;
};

const messageRouterMachine = createMachine({
  id: 'messageRouter',
  initial: 'active',
  context: {} as MessageRouterContext,
  states: {
    active: {
      on: {
        '*': {
          actions: 'routeMessage',
        },
      },
    },
  },
});

// Message routing logic
const routeMessage = (context: MessageRouterContext, event: any) => {
  const { type } = event.message;

  switch (type) {
    case 'startTimer':
    case 'pauseTimer':
    case 'resumeTimer':
    case 'stopTimer':
    case 'activity':
      context.timerMachine.send(event.message);
      break;

    case 'connect':
    case 'disconnect':
    case 'switchConnection':
      context.connectionMachine.send(event.message);
      break;

    case 'webviewReady':
    case 'getWorkItems':
    case 'refresh':
      context.webviewMachine.send(event.message);
      break;

    default:
      console.warn(`Unhandled message type: ${type}`);
  }
};
```

## Benefits of FSM Architecture

### 1. **Predictable State Transitions**

- All state changes are explicit and documented
- Impossible to reach invalid states
- Clear transition rules prevent race conditions

### 2. **Better Debugging**

- Visual state machine diagrams using XState Inspector
- Complete audit trail of state changes
- Easy to reproduce and debug issues

### 3. **Type Safety**

- TypeScript integration ensures type-safe events and state
- Compile-time verification of valid transitions
- IntelliSense support for all states and events

### 4. **Testability**

- Easy to test individual state transitions
- Mock services and test edge cases
- Deterministic behavior makes testing reliable

### 5. **Maintainability**

- Clear separation of concerns
- Self-documenting code through state definitions
- Easy to add new features without breaking existing functionality

## Migration Strategy

### Phase 1: Infrastructure Setup

1. Install XState and development tools
2. Create base machine definitions
3. Set up TypeScript types and interfaces

### Phase 2: Timer Migration

1. Replace timer logic with FSM
2. Maintain existing API for backward compatibility
3. Add comprehensive tests

### Phase 3: Connection Management

1. Migrate connection handling to FSM
2. Improve error handling and retry logic
3. Add health checking capabilities

### Phase 4: Message Handling

1. Replace switch statement with message router
2. Migrate all message types to FSM events
3. Add validation and type safety

### Phase 5: Webview Integration

1. Integrate webview with FSM
2. Improve state synchronization
3. Add visual debugging tools

## Development Tools

### XState Inspector

```typescript
import { inspect } from '@xstate/inspect';

// Enable visual debugging in development
if (process.env.NODE_ENV === 'development') {
  inspect({
    url: 'https://stately.ai/viz?inspect',
    iframe: false,
  });
}
```

### Testing Utilities

```typescript
import { interpret } from 'xstate';
import { createModel } from '@xstate/test';

// Create test model from state machine
const testModel = createModel(timerMachine).withEvents({
  START: {
    cases: [
      { workItemId: 123, workItemTitle: 'Test Task' },
      { workItemId: 456, workItemTitle: 'Another Task' },
    ],
  },
  PAUSE: [{}],
  RESUME: [{}],
  STOP: [{}],
});

// Generate comprehensive test cases
const testPlans = testModel.getSimplePathPlans();
```

## Conclusion

The FSM architecture will provide:

- **Reliability**: Predictable state management eliminates race conditions
- **Debuggability**: Visual inspection and audit trails
- **Maintainability**: Clear separation of concerns and self-documenting code
- **Testability**: Comprehensive test coverage with deterministic behavior
- **Extensibility**: Easy to add new features without breaking existing functionality

This architecture will transform the extension from a fragile event-driven system into a robust, maintainable codebase that's easy to understand, debug, and extend.
