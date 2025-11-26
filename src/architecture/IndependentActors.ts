/**
 * Module: src/architecture/IndependentActors.ts
 * Owner: application
 * Reads: (document)
 * Writes: (document)
 * Receives: (document)
 * Emits: (document)
 * Prohibitions: Do not mutate ApplicationContext directly; Do not define new *Context types
 * Rationale: (document)
 *
 * LLM-GUARD:
 * - Follow ownership boundaries; route events to Router; do not add UI logic here
 */
/**
 * Context-Driven Architecture - Independent Actors
 *
 * Each actor focuses on one concern and observes/updates shared context.
 * No direct actor-to-actor communication.
 */

import { createMachine, assign, type ActorRefFrom } from 'xstate';
import type { ApplicationContext } from './ApplicationContext';

/**
 * Connection Actor - Manages connection lifecycle and authentication
 *
 * Concerns:
 * - Loading connections from settings
 * - Managing authentication states
 * - Adding/removing connections
 */
export const connectionMachine = createMachine(
  {
    id: 'connectionActor',
    initial: 'initializing',
    context: {
      // This actor doesn't need its own state - it observes/updates shared context
    },
    states: {
      initializing: {
        entry: 'loadConnectionsFromSettings',
        on: {
          CONNECTIONS_LOADED: 'ready',
        },
      },
      ready: {
        on: {
          ADD_CONNECTION: {
            actions: 'addConnection',
          },
          REMOVE_CONNECTION: {
            actions: 'removeConnection',
          },
          AUTH_REQUIRED: {
            actions: 'markAuthRequired',
          },
          AUTH_COMPLETED: {
            actions: 'markAuthCompleted',
          },
        },
      },
    },
  },
  {
    actions: {
      loadConnectionsFromSettings: (_context, _event) => {
        // Load from VS Code settings and update shared context
        console.log('[ConnectionActor] Loading connections from settings');
      },

      addConnection: (_context, event: any) => {
        // Update shared context with new connection
        console.log('[ConnectionActor] Adding connection:', event.connection);
      },

      removeConnection: (_context, event: any) => {
        // Update shared context to remove connection
        console.log('[ConnectionActor] Removing connection:', event.connectionId);
      },

      markAuthRequired: (_context, event: any) => {
        console.log('[ConnectionActor] Auth required for:', event.connectionId);
      },

      markAuthCompleted: (_context, event: any) => {
        console.log('[ConnectionActor] Auth completed for:', event.connectionId);
      },
    },
  }
);

/**
 * Data Actor - Manages work item data per connection
 *
 * Concerns:
 * - Fetching work items for each connection
 * - Caching and refreshing data
 * - Managing loading states
 * - Handling API errors
 */
export const dataMachine = createMachine(
  {
    id: 'dataActor',
    initial: 'idle',
    context: {
      refreshTimers: new Map(), // Connection ID -> timer handle
    },
    states: {
      idle: {
        on: {
          CONTEXT_CHANGED: [
            // {
            //   guard: 'hasNewConnections',
            //   actions: 'startDataLoadingForNewConnections',
            // },
            // {
            //   guard: 'hasRemovedConnections',
            //   actions: 'stopDataLoadingForRemovedConnections',
            // },
          ],
          REFRESH_CONNECTION: {
            actions: 'refreshConnectionData',
          },
          REFRESH_ALL: {
            actions: 'refreshAllConnections',
          },
        },
      },
    },
  },
  {
    guards: {
      // hasNewConnections: (_context, _event: any) => {
      //   // Check if shared context has new connections that need data loading
      //   return false; // TODO: Implement
      // },
      // hasRemovedConnections: (_context, _event: any) => {
      //   // Check if connections were removed and cleanup needed
      //   return false; // TODO: Implement
      // },
    },

    actions: {
      // startDataLoadingForNewConnections: (_context, _event) => {
      //   console.log('[DataActor] Starting data loading for new connections');
      //   // For each new connection, start periodic refresh
      // },

      // stopDataLoadingForRemovedConnections: (_context, _event) => {
      //   console.log('[DataActor] Stopping data loading for removed connections');
      //   // Clear timers and cleanup
      // },

      refreshConnectionData: (_context, event: any) => {
        console.log('[DataActor] Refreshing data for connection:', event.connectionId);
        // Update shared context with loading state
        // Fetch work items
        // Update shared context with results
      },

      refreshAllConnections: (_context, _event) => {
        console.log('[DataActor] Refreshing all connection data');
      },
    },
  }
);

/**
 * Timer Actor - Manages time tracking
 *
 * Concerns:
 * - Timer start/stop/pause
 * - Elapsed time calculation
 * - Timer persistence
 */
export const timerMachine = createMachine(
  {
    id: 'timerActor',
    initial: 'idle',
    context: {
      tickInterval: null as any,
    },
    states: {
      idle: {
        on: {
          CONTEXT_CHANGED: [
            // {
            //   guard: 'timerShouldStart',
            //   target: 'running',
            //   actions: 'startTicking',
            // },
          ],
        },
      },
      running: {
        entry: 'startTicking',
        exit: 'stopTicking',
        on: {
          CONTEXT_CHANGED: [
            // {
            //   guard: 'timerShouldStop',
            //   target: 'idle',
            // },
            // {
            //   guard: 'timerShouldPause',
            //   target: 'paused',
            // },
          ],
          TICK: {
            actions: 'updateElapsedTime',
          },
        },
      },
      paused: {
        on: {
          CONTEXT_CHANGED: [
            // {
            //   guard: 'timerShouldResume',
            //   target: 'running',
            // },
            // {
            //   guard: 'timerShouldStop',
            //   target: 'idle',
            // },
          ],
        },
      },
    },
  },
  {
    guards: {
      // timerShouldStart: (_context, _event: any) => {
      //   // Check shared context to see if timer should start
      //   return false; // TODO: Implement
      // },
      // timerShouldStop: (_context, _event: any) => {
      //   return false; // TODO: Implement
      // },
      // timerShouldPause: (_context, _event: any) => {
      //   return false; // TODO: Implement
      // },
      // timerShouldResume: (_context, _event: any) => {
      //   return false; // TODO: Implement
      // },
    },

    actions: {
      startTicking: assign({
        tickInterval: (context) => {
          return setInterval(() => {
            // Send TICK event to self
          }, 1000);
        },
      }),

      stopTicking: ({ context }: any) => {
        if (context.tickInterval) {
          clearInterval(context.tickInterval);
        }
      },

      updateElapsedTime: (_context, _event) => {
        console.log('[TimerActor] Updating elapsed time');
        // Update shared context with new elapsed time
      },
    },
  }
);

/**
 * Main Application Actor - Orchestrates the independent actors
 *
 * This actor spawns and coordinates the independent actors,
 * but each actor operates on shared context independently.
 */
export const applicationMachine = createMachine(
  {
    id: 'application',
    initial: 'initializing',
    context: {
      // Shared application context
      appContext: null as ApplicationContext | null,

      // Actor references
      connectionActor: null as any,
      dataActor: null as any,
      timerActor: null as any,
    },
    states: {
      initializing: {
        entry: ['initializeContext', 'spawnActors'],
        always: {
          target: 'ready',
          // guard: 'allActorsSpawned',
        },
      },
      ready: {
        on: {
          UPDATE_CONTEXT: {
            actions: 'updateSharedContext',
          },
          // Context update events that actors can listen to
          CONTEXT_CHANGED: {
            actions: 'notifyActors',
          },
        },
      },
    },
  },
  {
    guards: {
      // allActorsSpawned: ({ context }: any) => {
      //   return !!(context.connectionActor && context.dataActor && context.timerActor);
      // },
    },

    actions: {
      initializeContext: assign({
        appContext: (context) => {
          // Initialize shared context
          return null; // TODO: Return createInitialContext()
        },
      }),

      spawnActors: assign({
        connectionActor: ({ spawn }) => spawn(connectionMachine),
        dataActor: ({ spawn }) => spawn(dataMachine),
        timerActor: ({ spawn }) => spawn(timerMachine),
      }),

      updateSharedContext: (_context, event: any) => {
        console.log('[ApplicationActor] Updating shared context:', event.update);
        // Apply context update using contextActions
        // Notify all actors of context change
      },

      notifyActors: ({ context }: any) => {
        // Send CONTEXT_CHANGED to all actors
        context.connectionActor?.send({ type: 'CONTEXT_CHANGED' });
        context.dataActor?.send({ type: 'CONTEXT_CHANGED' });
        context.timerActor?.send({ type: 'CONTEXT_CHANGED' });
      },
    },
  }
);

/**
 * Context Update Interface
 *
 * This provides a clean interface for any part of the application
 * to update the shared context without knowing about actors.
 */
export interface ContextUpdater {
  updateContext: (updater: (context: ApplicationContext) => ApplicationContext) => void;
  getContext: () => ApplicationContext | null;
  subscribe: (callback: (context: ApplicationContext) => void) => () => void;
}

export const createContextUpdater = (
  appActor: ActorRefFrom<typeof applicationMachine>
): ContextUpdater => ({
  updateContext: (updater) => {
    appActor.send({
      type: 'UPDATE_CONTEXT',
      update: updater,
    });
  },

  getContext: () => {
    return appActor.getSnapshot()?.context.appContext || null;
  },

  subscribe: (callback) => {
    const subscription = appActor.subscribe((state) => {
      if (state.context.appContext) {
        callback(state.context.appContext);
      }
    });

    return () => subscription.unsubscribe();
  },
});
