# FSM Implementation Plan

## Overview

This document outlines the step-by-step implementation plan for migrating the Azure DevOps Extension from its current event-driven architecture to a finite state machine (FSM) architecture using XState.

## Migration Strategy

### Philosophy: Incremental Migration with Backward Compatibility

We'll implement a **strangler fig pattern** - gradually replacing the old system while maintaining full backward compatibility during the transition. This approach ensures:

- No downtime or broken functionality during migration
- Ability to rollback at any point
- Incremental testing and validation
- Reduced risk of introducing bugs

## Phase 1: Infrastructure Setup (Week 1)

### 1.1 Install Dependencies

```bash
npm install xstate @xstate/react @xstate/inspect
npm install --save-dev @xstate/test @types/node
```

### 1.2 Setup Development Environment

**File: `src/fsm/config.ts`**

```typescript
import { inspect } from '@xstate/inspect';

export const setupFSMInspector = () => {
  if (process.env.NODE_ENV === 'development') {
    inspect({
      url: 'https://stately.ai/viz?inspect',
      iframe: false,
    });
  }
};
```

### 1.3 Create Base Types

**File: `src/fsm/types.ts`**

```typescript
import * as vscode from 'vscode';
import { AzureDevOpsClient } from '../azureClient';
import { WorkItemProvider } from '../types';

// Base FSM context types
export interface ExtensionContext {
  vscode: vscode.ExtensionContext;
  config: vscode.WorkspaceConfiguration;
  panel?: vscode.WebviewPanel;
  outputChannel: vscode.OutputChannel;
}

export interface ConnectionContext {
  connectionId?: string;
  client?: AzureDevOpsClient;
  provider?: WorkItemProvider;
  lastError?: string;
  retryCount: number;
  maxRetries: number;
}

export interface TimerContext {
  workItemId?: number;
  workItemTitle?: string;
  startTime?: number;
  elapsedSeconds: number;
  isPaused: boolean;
  lastActivity: number;
  connectionInfo?: TimerConnectionInfo;
  inactivityTimeoutSec: number;
  defaultElapsedLimitHours: number;
}

export interface WebviewContext {
  panel?: vscode.WebviewPanel;
  workItems: any[];
  selectedItems: number[];
  isLoading: boolean;
  error?: string;
  currentView: 'list' | 'kanban';
}

// Event types for each machine
export type ExtensionEvents =
  | { type: 'ACTIVATE'; context: vscode.ExtensionContext }
  | { type: 'DEACTIVATE' }
  | { type: 'WEBVIEW_READY' }
  | { type: 'CONNECTION_ESTABLISHED'; connectionId: string }
  | { type: 'CONNECTION_FAILED'; error: string }
  | { type: 'ERROR'; error: Error };

export type ConnectionEvents =
  | { type: 'CONNECT'; connectionId: string }
  | { type: 'DISCONNECT' }
  | { type: 'AUTH_SUCCESS' }
  | { type: 'AUTH_FAILED'; error: string }
  | { type: 'RETRY' }
  | { type: 'RESET' };

export type TimerEvents =
  | { type: 'START'; workItemId: number; workItemTitle: string }
  | { type: 'PAUSE'; manual?: boolean }
  | { type: 'RESUME'; fromActivity?: boolean }
  | { type: 'STOP' }
  | { type: 'TICK' }
  | { type: 'ACTIVITY' }
  | { type: 'INACTIVITY_TIMEOUT' };

export type WebviewEvents =
  | { type: 'SHOW' }
  | { type: 'HIDE' }
  | { type: 'READY' }
  | { type: 'MESSAGE'; message: any }
  | { type: 'LOAD_WORK_ITEMS' }
  | { type: 'WORK_ITEMS_LOADED'; items: any[] }
  | { type: 'ERROR'; error: string };
```

### 1.4 Create FSM Manager

**File: `src/fsm/FSMManager.ts`**

```typescript
import { interpret, Interpreter } from 'xstate';
import { extensionMachine } from './machines/extensionMachine';
import { connectionMachine } from './machines/connectionMachine';
import { timerMachine } from './machines/timerMachine';
import { webviewMachine } from './machines/webviewMachine';

export class FSMManager {
  private extensionService: Interpreter<any>;
  private connectionService: Interpreter<any>;
  private timerService: Interpreter<any>;
  private webviewService: Interpreter<any>;

  constructor() {
    this.extensionService = interpret(extensionMachine);
    this.connectionService = interpret(connectionMachine);
    this.timerService = interpret(timerMachine);
    this.webviewService = interpret(webviewMachine);
  }

  start() {
    this.extensionService.start();
    this.connectionService.start();
    this.timerService.start();
    this.webviewService.start();
  }

  stop() {
    this.extensionService.stop();
    this.connectionService.stop();
    this.timerService.stop();
    this.webviewService.stop();
  }

  getExtensionService() {
    return this.extensionService;
  }
  getConnectionService() {
    return this.connectionService;
  }
  getTimerService() {
    return this.timerService;
  }
  getWebviewService() {
    return this.webviewService;
  }
}
```

## Phase 2: Timer Migration (Week 2)

### 2.1 Create Timer State Machine

**File: `src/fsm/machines/timerMachine.ts`**

```typescript
import { createMachine, assign } from 'xstate';
import { TimerContext, TimerEvents } from '../types';

export const timerMachine = createMachine<TimerContext, TimerEvents>(
  {
    id: 'timer',
    initial: 'idle',
    context: {
      elapsedSeconds: 0,
      isPaused: false,
      lastActivity: Date.now(),
      inactivityTimeoutSec: 300,
      defaultElapsedLimitHours: 3.5,
    },
    states: {
      idle: {
        on: {
          START: {
            target: 'running',
            actions: ['startTimer', 'notifyStateChange'],
            cond: 'canStartTimer',
          },
        },
      },
      running: {
        entry: 'enterRunning',
        exit: 'exitRunning',
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
  },
  {
    actions: {
      startTimer: assign((context, event) => ({
        workItemId: event.workItemId,
        workItemTitle: event.workItemTitle,
        startTime: Date.now(),
        elapsedSeconds: 0,
        isPaused: false,
      })),
      pauseTimer: assign({ isPaused: true }),
      resumeTimer: assign({ isPaused: false }),
      stopTimer: assign({
        workItemId: undefined,
        workItemTitle: undefined,
        startTime: undefined,
        elapsedSeconds: 0,
        isPaused: false,
      }),
      updateElapsed: assign((context) => ({
        elapsedSeconds: context.startTime
          ? Math.floor((Date.now() - context.startTime) / 1000)
          : context.elapsedSeconds,
      })),
      recordActivity: assign({ lastActivity: Date.now() }),
    },
    guards: {
      canStartTimer: (context) => !context.workItemId,
      shouldAutoResume: (context) => context.isPaused,
    },
    services: {
      tickInterval: () => (sendBack) => {
        const interval = setInterval(() => {
          sendBack('TICK');
        }, 1000);
        return () => clearInterval(interval);
      },
      inactivityCheck: (context) => (sendBack) => {
        const interval = setInterval(() => {
          const idleTime = Date.now() - context.lastActivity;
          if (idleTime >= context.inactivityTimeoutSec * 1000) {
            sendBack('INACTIVITY_TIMEOUT');
          }
        }, 10000); // Check every 10 seconds
        return () => clearInterval(interval);
      },
    },
  }
);
```

### 2.2 Create Timer Adapter

**File: `src/fsm/adapters/TimerAdapter.ts`**

```typescript
import { Interpreter } from 'xstate';
import { WorkItemTimer } from '../../timer';
import { TimerContext, TimerEvents } from '../types';

export class TimerAdapter {
  private service: Interpreter<TimerContext, any, TimerEvents>;
  private legacyTimer: WorkItemTimer;

  constructor(service: Interpreter<TimerContext, any, TimerEvents>, legacyTimer: WorkItemTimer) {
    this.service = service;
    this.legacyTimer = legacyTimer;
  }

  // Adapter methods that maintain backward compatibility
  start(workItemId: number, workItemTitle: string): boolean {
    if (this.service.state.matches('idle')) {
      this.service.send('START', { workItemId, workItemTitle });
      return true;
    }
    return false;
  }

  pause(manual = true): boolean {
    if (this.service.state.matches('running')) {
      this.service.send('PAUSE', { manual });
      return true;
    }
    return false;
  }

  resume(fromActivity = false): boolean {
    if (this.service.state.matches('paused')) {
      this.service.send('RESUME', { fromActivity });
      return true;
    }
    return false;
  }

  stop(): any {
    if (!this.service.state.matches('idle')) {
      this.service.send('STOP');
      return this.service.state.context;
    }
    return null;
  }

  activityPing(): void {
    this.service.send('ACTIVITY');
  }

  snapshot(): any {
    return this.service.state.context.workItemId ? this.service.state.context : undefined;
  }
}
```

### 2.3 Integration Point

**File: `src/fsm/integration.ts`**

```typescript
// Gradual migration helper
export class LegacyTimerBridge {
  private fsmManager: FSMManager;
  private legacyTimer: WorkItemTimer;
  private adapter: TimerAdapter;

  constructor(fsmManager: FSMManager, legacyTimer: WorkItemTimer) {
    this.fsmManager = fsmManager;
    this.legacyTimer = legacyTimer;
    this.adapter = new TimerAdapter(fsmManager.getTimerService(), legacyTimer);
  }

  // Use FSM for new functionality, fallback for legacy
  getTimer(): WorkItemTimer | TimerAdapter {
    // Feature flag to control migration
    const useFSM = process.env.USE_FSM_TIMER === 'true';
    return useFSM ? this.adapter : this.legacyTimer;
  }
}
```

## Phase 3: Connection Management Migration (Week 3)

### 3.1 Create Connection State Machine

**File: `src/fsm/machines/connectionMachine.ts`**

```typescript
export const connectionMachine = createMachine<ConnectionContext, ConnectionEvents>({
  id: 'connection',
  initial: 'disconnected',
  context: {
    retryCount: 0,
    maxRetries: 3,
  },
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

### 3.2 Connection Health Monitoring

```typescript
// Enhanced connection monitoring with FSM
services: {
  healthCheck: (context) => (sendBack) => {
    const interval = setInterval(async () => {
      try {
        if (context.client) {
          await context.client.getProjects(); // Health check call
        }
      } catch (error) {
        sendBack({ type: 'AUTH_FAILED', error: error.message });
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  };
}
```

## Phase 4: Message Handler Migration (Week 4)

### 4.1 Create Message Router

**File: `src/fsm/MessageRouter.ts`**

```typescript
export class MessageRouter {
  private fsmManager: FSMManager;

  constructor(fsmManager: FSMManager) {
    this.fsmManager = fsmManager;
  }

  routeMessage(message: any): void {
    const { type } = message;

    // Route to appropriate FSM
    switch (this.getMessageCategory(type)) {
      case 'timer':
        this.fsmManager.getTimerService().send(this.mapToTimerEvent(message));
        break;
      case 'connection':
        this.fsmManager.getConnectionService().send(this.mapToConnectionEvent(message));
        break;
      case 'webview':
        this.fsmManager.getWebviewService().send(this.mapToWebviewEvent(message));
        break;
      default:
        console.warn(`Unhandled message type: ${type}`);
    }
  }

  private getMessageCategory(type: string): string {
    const timerMessages = ['startTimer', 'pauseTimer', 'resumeTimer', 'stopTimer', 'activity'];
    const connectionMessages = ['connect', 'disconnect', 'switchConnection', 'setActiveConnection'];
    const webviewMessages = ['webviewReady', 'getWorkItems', 'refresh', 'loadWorkItems'];

    if (timerMessages.includes(type)) return 'timer';
    if (connectionMessages.includes(type)) return 'connection';
    if (webviewMessages.includes(type)) return 'webview';
    return 'unknown';
  }
}
```

### 4.2 Gradual Migration Strategy

**File: `src/activation.ts` (Modified)**

```typescript
// Add FSM manager alongside existing code
let fsmManager: FSMManager | undefined;
let messageRouter: MessageRouter | undefined;

export function activate(context: vscode.ExtensionContext) {
  // Existing code...

  // Initialize FSM (feature-flagged)
  if (getConfig().get<boolean>('experimental.useFSM', false)) {
    fsmManager = new FSMManager();
    messageRouter = new MessageRouter(fsmManager);
    fsmManager.start();
  }

  // ... existing code
}

async function handleMessage(msg: any) {
  // Try FSM first, fallback to legacy
  if (messageRouter && shouldUseFSM(msg.type)) {
    try {
      messageRouter.routeMessage(msg);
      return; // FSM handled it successfully
    } catch (error) {
      console.warn('FSM failed, falling back to legacy:', error);
    }
  }

  // Legacy message handling (existing switch statement)
  switch (
    msg?.type
    // ... existing cases
  ) {
  }
}

function shouldUseFSM(messageType: string): boolean {
  // Gradually enable FSM for different message types
  const fsmEnabledMessages = process.env.FSM_ENABLED_MESSAGES?.split(',') || [];
  return fsmEnabledMessages.includes(messageType);
}
```

## Phase 5: Testing and Validation (Week 5)

### 5.1 FSM Test Framework

**File: `tests/fsm/timerMachine.test.ts`**

```typescript
import { interpret } from 'xstate';
import { createModel } from '@xstate/test';
import { timerMachine } from '../../src/fsm/machines/timerMachine';

describe('Timer State Machine', () => {
  const testModel = createModel(timerMachine).withEvents({
    START: {
      cases: [
        { workItemId: 123, workItemTitle: 'Test Task' },
        { workItemId: 456, workItemTitle: 'Another Task' },
      ],
    },
    PAUSE: [{ manual: true }, { manual: false }],
    RESUME: [{ fromActivity: true }, { fromActivity: false }],
    STOP: [{}],
    ACTIVITY: [{}],
    INACTIVITY_TIMEOUT: [{}],
  });

  const testPlans = testModel.getSimplePathPlans();

  testPlans.forEach((plan) => {
    describe(plan.description, () => {
      plan.paths.forEach((path) => {
        it(path.description, async () => {
          const service = interpret(timerMachine);
          service.start();

          await path.test(service);

          service.stop();
        });
      });
    });
  });

  it('provides coverage', () => {
    testModel.testCoverage();
  });
});
```

### 5.2 Integration Tests

**File: `tests/fsm/integration.test.ts`**

```typescript
describe('FSM Integration Tests', () => {
  let fsmManager: FSMManager;

  beforeEach(() => {
    fsmManager = new FSMManager();
    fsmManager.start();
  });

  afterEach(() => {
    fsmManager.stop();
  });

  it('should handle timer lifecycle correctly', async () => {
    const timerService = fsmManager.getTimerService();

    // Verify initial state
    expect(timerService.state.matches('idle')).toBe(true);

    // Start timer
    timerService.send('START', { workItemId: 123, workItemTitle: 'Test' });
    expect(timerService.state.matches('running')).toBe(true);

    // Pause timer
    timerService.send('PAUSE');
    expect(timerService.state.matches('paused')).toBe(true);

    // Resume timer
    timerService.send('RESUME');
    expect(timerService.state.matches('running')).toBe(true);

    // Stop timer
    timerService.send('STOP');
    expect(timerService.state.matches('idle')).toBe(true);
  });
});
```

## Phase 6: Rollout and Monitoring (Week 6)

### 6.1 Feature Flags

**File: `package.json` (Configuration)**

```json
{
  "contributes": {
    "configuration": {
      "properties": {
        "azureDevOpsIntegration.experimental.useFSM": {
          "type": "boolean",
          "default": false,
          "description": "Enable experimental FSM architecture"
        },
        "azureDevOpsIntegration.experimental.fsmComponents": {
          "type": "array",
          "default": [],
          "description": "List of components to use FSM for: timer, connection, webview"
        }
      }
    }
  }
}
```

### 6.2 Monitoring and Metrics

**File: `src/fsm/monitoring.ts`**

```typescript
export class FSMMonitor {
  private metrics: Map<string, any> = new Map();

  recordTransition(machineId: string, from: string, to: string, event: string) {
    const key = `${machineId}.transitions`;
    const transitions = this.metrics.get(key) || [];
    transitions.push({
      timestamp: Date.now(),
      from,
      to,
      event,
    });
    this.metrics.set(key, transitions);
  }

  recordError(machineId: string, error: Error) {
    const key = `${machineId}.errors`;
    const errors = this.metrics.get(key) || [];
    errors.push({
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
    });
    this.metrics.set(key, errors);
  }

  getMetrics(): Record<string, any> {
    return Object.fromEntries(this.metrics);
  }
}
```

## Rollback Strategy

If issues arise during migration, we can easily rollback:

1. **Component-level rollback**: Disable FSM for specific components via feature flags
2. **Full rollback**: Set `useFSM` to `false` to revert to legacy system
3. **Data preservation**: All state is preserved during rollback
4. **Zero downtime**: No extension restart required

## Success Metrics

- **Reliability**: Reduction in state-related bugs and race conditions
- **Debuggability**: Faster issue resolution with visual state inspection
- **Performance**: No performance regression during migration
- **Test Coverage**: Achieve >90% test coverage for all state machines
- **Developer Experience**: Reduced complexity in adding new features

## Timeline Summary

- **Week 1**: Infrastructure setup and tooling
- **Week 2**: Timer migration and testing
- **Week 3**: Connection management migration
- **Week 4**: Message handling migration
- **Week 5**: Comprehensive testing and validation
- **Week 6**: Gradual rollout with monitoring

**Total Estimated Time**: 6 weeks with 1-2 developers

This plan ensures a safe, incremental migration to FSM architecture while maintaining full backward compatibility and providing clear rollback options at every step.
