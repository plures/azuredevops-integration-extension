/**
 * Application-wide Finite State Machine Architecture
 *
 * This file defines the complete FSM system for the Azure DevOps extension,
 * replacing the complex global state management with structured state machines.
 */

import { createMachine, assign, fromPromise, createActor } from 'xstate';
import {
  ProjectConnection,
  AuthReminderReason,
  AuthReminderState,
  ConnectionContext as ConnectionState,
} from './connectionTypes.js';
import { timerMachine } from './timerMachine.js';
import { saveConnection, deleteConnection } from '../functions/connectionManagement.js';
import { createComponentLogger, FSMComponent } from '../logging/FSMLogger.js';
import type { NormalizationSummary } from '../functions/activation/connectionNormalization.js';

// ============================================================================
// APPLICATION STATE DEFINITIONS
// ============================================================================

export type { ProjectConnection };

export type ApplicationContext = {
  isActivated: boolean;
  isDeactivating: boolean;
  connections: ProjectConnection[];
  activeConnectionId?: string;
  connectionStates: Map<string, ConnectionState>;
  pendingAuthReminders: Map<string, AuthReminderState>;
  extensionContext?: any;
  webviewPanel?: any;
  timerActor?: any;
  connectionActors: Map<string, any>;
  authActors: Map<string, any>;
  dataActor?: any;
  webviewActor?: any;
  pendingWorkItems?: {
    workItems: any[];
    connectionId?: string;
    query?: string;
  };
  lastError?: Error;
  errorRecoveryAttempts: number;
};

export type ApplicationEvent =
  | { type: 'ACTIVATE'; context: any }
  | { type: 'DEACTIVATE' }
  | { type: 'CONNECTIONS_LOADED'; connections: ProjectConnection[] }
  | { type: 'CONNECTION_SELECTED'; connectionId: string }
  | { type: 'CONNECTION_ESTABLISHED'; connectionId: string; connectionState?: any }
  | { type: 'REFRESH_DATA' }
  | {
      type: 'WORK_ITEMS_LOADED';
      workItems: any[];
      connectionId?: string;
      query?: string;
    }
  | { type: 'AUTHENTICATION_REQUIRED'; connectionId: string }
  | { type: 'AUTHENTICATION_SUCCESS'; connectionId: string }
  | { type: 'AUTHENTICATION_FAILED'; connectionId: string; error: string }
  | { type: 'AUTH_REMINDER_SET'; connectionId: string; reminder: AuthReminderState }
  | { type: 'AUTH_REMINDER_CLEARED'; connectionId: string }
  | { type: 'AUTH_REMINDER_DISMISSED'; connectionId: string; snoozeUntil?: number }
  | {
      type: 'AUTH_REMINDER_REQUESTED';
      connectionId: string;
      reason: AuthReminderReason;
      detail?: string;
    }
  | { type: 'WEBVIEW_READY' }
  | { type: 'SHOW_WEBVIEW' }
  | { type: 'WEBVIEW_MESSAGE'; message: any }
  | { type: 'UPDATE_WEBVIEW_PANEL'; webviewPanel: any }
  | { type: 'ERROR'; error: Error }
  | { type: 'RETRY' }
  | { type: 'RESET' }
  // Connection Management Events
  | { type: 'MANAGE_CONNECTIONS' }
  | { type: 'ADD_CONNECTION' }
  | { type: 'EDIT_CONNECTION'; connectionId: string }
  | { type: 'SAVE_CONNECTION'; connection: ProjectConnection }
  | { type: 'DELETE_CONNECTION'; connectionId: string }
  | { type: 'CONFIRM_DELETE_CONNECTION'; connectionId: string }
  | { type: 'CANCEL_CONNECTION_MANAGEMENT' };

type SetupUIResult = {
  connections: ProjectConnection[];
  activeConnectionId?: string;
  persisted: {
    connections: boolean;
    activeConnectionId: boolean;
  };
  summary: NormalizationSummary;
};

const webviewRouterLogger = createComponentLogger(FSMComponent.WEBVIEW, 'webview-router');

function isSetupUICompletionEvent(
  event: unknown
): event is { type: 'done.invoke.setupUI'; output: SetupUIResult } {
  return Boolean(event) && (event as { type?: unknown }).type === 'done.invoke.setupUI';
}

// ============================================================================
// MAIN APPLICATION STATE MACHINE (ORCHESTRATOR)
// ============================================================================
export const applicationMachine = createMachine(
  {
    id: 'application',
    types: {} as {
      context: ApplicationContext;
      events: ApplicationEvent;
    },
    initial: 'inactive',

    context: {
      isActivated: false,
      isDeactivating: false,
      connections: [],
      connectionStates: new Map(),
      pendingAuthReminders: new Map(),
      connectionActors: new Map(),
      authActors: new Map(),
      errorRecoveryAttempts: 0,
      webviewPanel: undefined,
      pendingWorkItems: undefined,
    },

    states: {
      inactive: {
        on: {
          ACTIVATE: {
            target: 'activating',
            actions: 'storeExtensionContext',
          },
        },
      },
      activating: {
        invoke: {
          src: 'performActivation',
          input: ({ context }) => context,
          onDone: {
            target: 'active',
            actions: 'markActivated',
          },
          onError: {
            target: 'activation_failed',
            actions: 'recordActivationError',
          },
        },
      },
      active: {
        initial: 'setup',
        states: {
          setup: {
            entry: ['initializeChildActors'],
            initial: 'loading_connections',
            onDone: {
              target: 'ready',
            },
            states: {
              loading_connections: {
                invoke: {
                  src: 'setupUI',
                  onDone: {
                    target: 'waiting_for_panel',
                    actions: [
                      'storeConnectionsFromSetup',
                      'initializeConnectionActorsFromSetup',
                      'selectInitialConnection',
                    ],
                  },
                  onError: 'setup_error',
                },
              },
              waiting_for_panel: {
                on: {
                  UPDATE_WEBVIEW_PANEL: {
                    target: 'panel_ready',
                    actions: [
                      'updateWebviewPanelInContext',
                      'syncPendingDataIfAvailable',
                      'clearPendingData',
                    ],
                  },
                },
              },
              panel_ready: {
                type: 'final',
              },
              setup_error: {
                on: {
                  RETRY: 'loading_connections',
                },
              },
            },
            on: {
              CONNECTION_SELECTED: {
                actions: ['setActiveConnectionInContext', 'delegateConnectionActivation'],
              },
              AUTHENTICATION_REQUIRED: {
                actions: 'delegateAuthenticationStart',
              },
            },
          },
          ready: {
            initial: 'idle',
            states: {
              idle: {
                on: {
                  REFRESH_DATA: 'loadingData',
                  MANAGE_CONNECTIONS: 'managingConnections',
                },
              },
              loadingData: {
                invoke: {
                  src: 'loadData',
                  onDone: {
                    target: 'idle',
                    actions: 'syncDataToWebview',
                  },
                  onError: 'error',
                },
              },
              managingConnections: {
                initial: 'idle',
                states: {
                  idle: {
                    on: {
                      ADD_CONNECTION: 'adding',
                      EDIT_CONNECTION: 'editing',
                      DELETE_CONNECTION: 'deleting',
                      CANCEL_CONNECTION_MANAGEMENT: '#application.active.ready.idle',
                    },
                  },
                  adding: {
                    on: {
                      SAVE_CONNECTION: {
                        target: 'idle',
                        actions: assign({
                          connections: ({ context, event }) => saveConnection(context, event),
                        }),
                      },
                      CANCEL_CONNECTION_MANAGEMENT: 'idle',
                    },
                  },
                  editing: {
                    on: {
                      SAVE_CONNECTION: {
                        target: 'idle',
                        actions: assign({
                          connections: ({ context, event }) => saveConnection(context, event),
                        }),
                      },
                      CANCEL_CONNECTION_MANAGEMENT: 'idle',
                    },
                  },
                  deleting: {
                    on: {
                      CONFIRM_DELETE_CONNECTION: {
                        target: 'idle',
                        actions: assign({
                          connections: ({ context, event }) => deleteConnection(context, event),
                        }),
                      },
                      CANCEL_CONNECTION_MANAGEMENT: 'idle',
                    },
                  },
                },
              },
              error: {
                on: {
                  RETRY: 'loadingData',
                },
              },
            },
            on: {
              WEBVIEW_MESSAGE: {
                actions: 'routeWebviewMessage',
              },
              CONNECTION_SELECTED: {
                actions: ['setActiveConnectionInContext', 'delegateConnectionActivation'],
              },
            },
          },
        },
        on: {
          DEACTIVATE: 'deactivating',
          ERROR: {
            target: 'error_recovery',
            actions: 'recordError',
          },
        },
      },
      activation_failed: {
        on: {
          RETRY: 'activating',
        },
      },
      error_recovery: {
        invoke: {
          src: 'recoverFromError',
          onDone: 'active',
          onError: {
            target: 'error_recovery',
            actions: 'incrementRecoveryAttempts',
          },
        },
      },
      deactivating: {
        invoke: {
          src: 'performDeactivation',
          input: ({ context }) => context,
          onDone: 'inactive',
          onError: 'inactive',
        },
        entry: 'markDeactivating',
      },
    },
  },
  {
    actions: {
      storeExtensionContext: assign({
        extensionContext: ({ event }) => (event.type === 'ACTIVATE' ? event.context : undefined),
      }),
      markActivated: assign({
        isActivated: true,
      }),
      recordActivationError: assign({
        lastError: ({ event }) => (event.type === 'ERROR' ? event.error : undefined),
      }),
      setActiveConnectionInContext: assign({
        activeConnectionId: ({ event, context }) =>
          event.type === 'CONNECTION_SELECTED' ? event.connectionId : context.activeConnectionId,
      }),
      storeConnectionsFromSetup: assign(({ context, event }) => {
        if (!isSetupUICompletionEvent(event)) return context;
        const { connections, activeConnectionId } = (
          event as { type: 'done.invoke.setupUI'; output: SetupUIResult }
        ).output;
        return { ...context, connections, activeConnectionId };
      }),
      initializeConnectionActorsFromSetup: () => {
        /* Placeholder */
      },
      selectInitialConnection: () => {
        /* Placeholder */
      },
      updateWebviewPanelInContext: assign({
        webviewPanel: ({ event }) =>
          event.type === 'UPDATE_WEBVIEW_PANEL' ? event.webviewPanel : undefined,
      }),
      syncPendingDataIfAvailable: () => {
        /* Placeholder */
      },
      clearPendingData: assign({ pendingWorkItems: undefined }),
      recordError: assign({
        lastError: ({ event }) => (event.type === 'ERROR' ? event.error : undefined),
      }),
      incrementRecoveryAttempts: assign({
        errorRecoveryAttempts: ({ context }) => context.errorRecoveryAttempts + 1,
      }),
      markDeactivating: assign({
        isDeactivating: true,
      }),
      initializeChildActors: ({ context }) => {
        context.timerActor = createActor(timerMachine).start();
      },
      delegateConnectionActivation: ({ context, event }) => {
        if (event.type === 'CONNECTION_SELECTED') {
          activateConnection(context, event.connectionId);
        }
      },
      delegateAuthenticationStart: ({ context, event }) => {
        if (event.type === 'AUTHENTICATION_REQUIRED') {
          startAuthentication(context, event.connectionId);
        }
      },
      routeWebviewMessage: ({ context, event, self }) => {
        if (event.type !== 'WEBVIEW_MESSAGE') return;
        const { message } = event;
        webviewRouterLogger.debug('Webview message received', { event: message.type }, { message });
        // Simplified routing
        if (message.type === 'connection:select') {
          self.send({ type: 'CONNECTION_SELECTED', connectionId: message.payload.connectionId });
        }
      },
      syncDataToWebview: ({ context, event }) => {
        if (event.type !== 'WORK_ITEMS_LOADED') return;
        context.webviewPanel?.webview.postMessage({
          type: 'work-items-update',
          workItems: event.workItems,
        });
      },
    },
    actors: {
      performActivation: fromPromise(async () => {
        /* Placeholder */
      }),
      performDeactivation: fromPromise(async () => {
        /* Placeholder */
      }),
      setupUI: fromPromise(async () => ({
        connections: [],
        activeConnectionId: undefined,
        persisted: { connections: false, activeConnectionId: false },
        summary: {
          generatedIds: [],
          addedPatKeys: [],
          addedBaseUrls: [],
          addedApiBaseUrls: [],
          removedInvalidEntries: 0,
        },
      })),
      loadData: fromPromise(async () => {
        /* Placeholder */
      }),
      recoverFromError: fromPromise(async () => {
        /* Placeholder */
      }),
    },
  }
);

// ============================================================================
// SINGLE-PURPOSE FUNCTIONS
// ============================================================================

function activateConnection(context: ApplicationContext, connectionId: string) {
  if (context.isDeactivating) return;
  const actor = context.connectionActors.get(connectionId);
  if (actor) {
    actor.send({ type: 'CONNECT' });
  }
}

function startAuthentication(context: ApplicationContext, connectionId: string) {
  if (context.isDeactivating) return;
  const authActor = context.authActors.get(connectionId);
  if (authActor) {
    authActor.send({ type: 'START_AUTH' });
  }
}
