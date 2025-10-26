/**
 * Context-Driven Architecture - Independent Actors (XState v5)
 *
 * Simplified version that works with XState v5 patterns.
 * Each actor focuses on one concern and observes shared context.
 */

import { createMachine, assign, fromPromise, type ActorRefFrom } from 'xstate';
import { ApplicationContext, type Connection, type WorkItem } from './ApplicationContext';

// Types for actor context
interface ConnectionActorContext {
  connections: Connection[];
  authInProgress: boolean;
}

interface DataActorContext {
  workItemCache: Map<string, WorkItem[]>;
  loadingConnections: Set<string>;
  lastRefresh: Map<string, number>;
}

interface TimerActorContext {
  isActive: boolean;
  isRunning: boolean;
  workItemId: string | null;
  elapsed: number;
  startTime: number | null;
}

/**
 * Connection Actor - Manages connection lifecycle
 */
export const connectionMachine = createMachine(
  {
    id: 'connectionActor',
    initial: 'idle',
    context: {
      connections: [],
      authInProgress: false,
    } as ConnectionActorContext,
    states: {
      idle: {
        on: {
          LOAD_CONNECTIONS: {
            target: 'loading',
          },
          CONTEXT_CHANGED: {
            actions: 'handleContextChange',
          },
        },
      },
      loading: {
        invoke: {
          id: 'loadConnections',
          src: 'loadConnectionsFromSettings',
          onDone: {
            target: 'idle',
            actions: assign({
              connections: ({ event }) => event.output,
            }),
          },
          onError: {
            target: 'idle',
            actions: 'logError',
          },
        },
      },
    },
  },
  {
    actions: {
      handleContextChange: (_context, _event) => {
        console.log('[ConnectionActor] Context changed, updating connections');
        // React to context changes if needed
      },
      logError: ({ event }: any) => {
        console.error('[ConnectionActor] Error:', event?.data || 'Unknown error');
      },
    },
    actors: {
      loadConnectionsFromSettings: fromPromise(async () => {
        // TODO: Load from VS Code settings
        return [];
      }),
    },
  }
);

/**
 * Data Actor - Handles work item fetching and caching
 */
export const dataMachine = createMachine(
  {
    id: 'dataActor',
    initial: 'idle',
    context: {
      workItemCache: new Map(),
      loadingConnections: new Set(),
      lastRefresh: new Map(),
    } as DataActorContext,
    states: {
      idle: {
        on: {
          FETCH_WORK_ITEMS: {
            target: 'fetching',
          },
          CONTEXT_CHANGED: {
            actions: 'handleContextChange',
          },
        },
      },
      fetching: {
        invoke: {
          id: 'fetchWorkItems',
          src: 'fetchWorkItemsFromAPI',
          onDone: {
            target: 'idle',
            actions: 'cacheWorkItems',
          },
          onError: {
            target: 'idle',
            actions: 'logError',
          },
        },
      },
    },
  },
  {
    actions: {
      handleContextChange: ({ context, event }: any) => {
        console.log('[DataActor] Context changed, checking if refresh needed');
        // Check if active connection changed and refresh if needed
        const contextData = event.context as ApplicationContext;
        const activeConnectionId = contextData.activeConnectionId;

        if (activeConnectionId && !context.workItemCache.has(activeConnectionId)) {
          // TODO: Send FETCH_WORK_ITEMS event to self
          console.log('[DataActor] Need to fetch work items for:', activeConnectionId);
        }
      },
      cacheWorkItems: assign({
        workItemCache: ({ context, event }) => {
          const newCache = new Map(context.workItemCache);
          // TODO: Cache the fetched work items
          return newCache;
        },
      }),
      logError: ({ event }: any) => {
        console.error('[DataActor] Error:', event?.data || 'Unknown error');
      },
    },
    actors: {
      fetchWorkItemsFromAPI: fromPromise(async ({ input }: { input: { connectionId: string } }) => {
        // TODO: Fetch from Azure DevOps API
        return [];
      }),
    },
  }
);

/**
 * Timer Actor - Manages time tracking
 */
export const timerMachine = createMachine(
  {
    id: 'timerActor',
    initial: 'stopped',
    context: {
      isActive: false,
      isRunning: false,
      workItemId: null,
      elapsed: 0,
      startTime: null,
    } as TimerActorContext,
    states: {
      stopped: {
        on: {
          START_TIMER: {
            target: 'running',
            actions: 'startTimer',
          },
          CONTEXT_CHANGED: {
            actions: 'handleContextChange',
          },
        },
      },
      running: {
        invoke: {
          id: 'timerTick',
          src: 'timerTickActor',
        },
        on: {
          TICK: {
            actions: 'updateElapsed',
          },
          PAUSE_TIMER: {
            target: 'paused',
            actions: 'pauseTimer',
          },
          STOP_TIMER: {
            target: 'stopped',
            actions: 'stopTimer',
          },
          CONTEXT_CHANGED: {
            actions: 'handleContextChange',
          },
        },
      },
      paused: {
        on: {
          RESUME_TIMER: {
            target: 'running',
            actions: 'resumeTimer',
          },
          STOP_TIMER: {
            target: 'stopped',
            actions: 'stopTimer',
          },
          CONTEXT_CHANGED: {
            actions: 'handleContextChange',
          },
        },
      },
    },
  },
  {
    actions: {
      startTimer: assign({
        isActive: true,
        isRunning: true,
        startTime: () => Date.now(),
        workItemId: ({ event }) => (event as any).workItemId,
      }),
      pauseTimer: assign({
        isRunning: false,
        startTime: null,
      }),
      resumeTimer: assign({
        isRunning: true,
        startTime: () => Date.now(),
      }),
      stopTimer: assign({
        isActive: false,
        isRunning: false,
        startTime: null,
        workItemId: null,
        elapsed: 0,
      }),
      updateElapsed: assign({
        elapsed: ({ context }) => {
          if (context.startTime) {
            return context.elapsed + (Date.now() - context.startTime);
          }
          return context.elapsed;
        },
        startTime: () => Date.now(),
      }),
      handleContextChange: (_context, _event) => {
        console.log('[TimerActor] Context changed');
        // React to context changes if needed
      },
    },
    actors: {
      timerTickActor: fromPromise(async () => {
        return new Promise((resolve) => {
          // This actor sends TICK events every second
          const interval = setInterval(() => {
            // In real implementation, send TICK to parent
          }, 1000);

          // Cleanup after some time
          setTimeout(() => {
            clearInterval(interval);
            resolve('timer completed');
          }, 60000);
        });
      }),
    },
  }
);

/**
 * Application Actor - Orchestrates the context-driven architecture
 *
 * This is the main actor that:
 * 1. Holds the shared ApplicationContext
 * 2. Coordinates context updates
 * 3. Notifies other actors of changes
 */
export const applicationMachine = createMachine(
  {
    id: 'applicationActor',
    initial: 'initializing',
    context: {
      appContext: null as ApplicationContext | null,
      actors: {
        connectionActor: null,
        dataActor: null,
        timerActor: null,
      },
    },
    states: {
      initializing: {
        entry: 'initializeContext',
        always: {
          target: 'ready',
          guard: 'contextInitialized',
        },
      },
      ready: {
        on: {
          UPDATE_CONTEXT: {
            actions: ['updateSharedContext', 'notifyActors'],
          },
          CONTEXT_ACTION: {
            actions: 'handleContextAction',
          },
        },
      },
    },
  },
  {
    actions: {
      initializeContext: assign({
        appContext: () => {
          // Return initial context
          return {
            connections: [],
            activeConnectionId: null,
            activeTab: 'work-items',
            workItemsByConnection: new Map(),
            loadingStates: new Map(),
            errorStates: new Map(),
            queriesByConnection: new Map(),
            kanbanView: false,
            timer: {
              isActive: false,
              isRunning: false,
              elapsed: 0,
            },
            settings: {
              defaultQuery: "SELECT * FROM WorkItems WHERE [System.State] != 'Closed'",
              refreshInterval: 30000,
            },
            isInitialized: false,
          } as ApplicationContext;
        },
      }),
      updateSharedContext: assign({
        appContext: ({ context, event }) => {
          if (!context.appContext) return null;

          // Apply context update
          const update = (event as any).update;
          return { ...context.appContext, ...update };
        },
      }),
      handleContextAction: ({ context, event }) => {
        if (!context.appContext) return;

        const action = (event as any).action;
        const payload = (event as any).payload;

        // Apply context action using contextActions
        console.log('[ApplicationActor] Handling context action:', action, payload);

        // TODO: Apply the action and update context
        // const newContext = contextActions[action](context.appContext, payload);
        // Send UPDATE_CONTEXT with the new context
      },
      notifyActors: ({ context }) => {
        console.log('[ApplicationActor] Notifying actors of context change');
        // In a real implementation, we would send CONTEXT_CHANGED to all child actors
        // For now, just log
      },
    },
    guards: {
      contextInitialized: ({ context }) => context.appContext !== null,
    },
  }
);

/**
 * Factory function to create and start all actors
 */
export function createIndependentActors() {
  console.log('[ContextDrivenArchitecture] Creating independent actors');

  return {
    connectionActor: connectionMachine,
    dataActor: dataMachine,
    timerActor: timerMachine,
    applicationActor: applicationMachine,
  };
}

/**
 * Type exports for use in other files
 */
export type ConnectionActor = ActorRefFrom<typeof connectionMachine>;
export type DataActor = ActorRefFrom<typeof dataMachine>;
export type TimerActor = ActorRefFrom<typeof timerMachine>;
export type ApplicationActor = ActorRefFrom<typeof applicationMachine>;

export interface IndependentActors {
  connectionActor: typeof connectionMachine;
  dataActor: typeof dataMachine;
  timerActor: typeof timerMachine;
  applicationActor: typeof applicationMachine;
}
