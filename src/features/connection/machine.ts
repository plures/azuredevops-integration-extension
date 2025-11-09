/**
 * Module: src/features/connection/machine.ts
 * Owner: connection
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
 * Connection State Machine
 *
 * Manages individual connection lifecycle using modular components.
 * This is a simplified version that uses the extracted modules.
 */

import { createMachine, assign } from 'xstate';
import { createComponentLogger, FSMComponent } from '../../fsm/logging/FSMLogger.js';
import type { ConnectionContext, ConnectionEvent } from './types.js';
import * as guards from './guards.js';
import * as actions from './actions.js';
import * as services from './services.js';

// Create logger for connection machine
const _logger = createComponentLogger(FSMComponent.CONNECTION, 'connectionMachine');

/**
 * Connection State Machine
 *
 * Simplified version using extracted modules for better maintainability.
 */
export const connectionMachine = createMachine(
  {
    id: 'connection',
    types: {} as {
      context: ConnectionContext;
      events: ConnectionEvent;
    },
    initial: 'disconnected',
    context: {
      connectionId: '',
      config: {} as any,
      authMethod: 'pat',
      isConnected: false,
      retryCount: 0,
      refreshFailureCount: 0,
      reauthInProgress: false,
      forceInteractive: false,
      accessTokenExpiresAt: undefined,
    },
    states: {
      disconnected: {
        entry: [actions.clearConnectionState],
        on: {
          CONNECT: {
            target: 'authenticating',
            actions: assign({
              config: ({ event }) => event.config,
              connectionId: ({ event }) => event.config.id,
              authMethod: ({ event }) => event.config.authMethod || 'pat',
              retryCount: 0,
              lastError: undefined,
              forceInteractive: ({ event }) => !!event.forceInteractive,
              accessTokenExpiresAt: undefined,
            }),
          },
          RESET: {
            target: 'disconnected',
            actions: actions.resetConnection,
          },
        },
      },

      authenticating: {
        initial: 'determining_method',
        states: {
          determining_method: {
            always: [
              {
                target: 'entra_auth',
                guard: guards.isEntraAuth,
              },
              {
                target: 'pat_auth',
                guard: guards.isPATAuth,
              },
            ],
          },

          pat_auth: {
            invoke: {
              src: services.authenticateWithPAT,
              input: ({ context }) => context,
              onDone: {
                target: '#connection.creating_client',
                actions: assign({
                  credential: ({ event }) => event.output.credential,
                  pat: ({ event }) => event.output.credential,
                }),
              },
              onError: {
                target: '#connection.auth_failed',
                actions: assign({
                  lastError: ({ event }) =>
                    (event.error as Error)?.message || 'PAT authentication failed',
                  retryCount: ({ context }) => context.retryCount + 1,
                }),
              },
            },
          },

          entra_auth: {
            invoke: {
              src: services.checkExistingEntraToken,
              input: ({ context }) => context,
              onDone: [
                {
                  target: '#connection.creating_client',
                  guard: guards.hasValidToken,
                  actions: assign({
                    credential: ({ event }) => event.output.token,
                    accessToken: ({ event }) => event.output.token,
                  }),
                },
                {
                  target: 'interactive_auth',
                },
              ],
              onError: {
                target: 'interactive_auth',
              },
            },
            states: {
              interactive_auth: {
                // Simplified - would handle interactive authentication
                on: {
                  AUTH_SUCCESS: {
                    target: '#connection.creating_client',
                    actions: assign({
                      credential: ({ event }) => event.credential,
                    }),
                  },
                  AUTH_FAILED: {
                    target: '#connection.auth_failed',
                    actions: assign({
                      lastError: ({ event }) => event.error,
                    }),
                  },
                },
              },
            },
          },
        },
      },

      creating_client: {
        invoke: {
          src: services.createAzureClient,
          input: ({ context }) => context,
          onDone: {
            target: 'creating_provider',
            actions: assign({
              client: ({ event }) => event.output.client,
            }),
          },
          onError: {
            target: 'client_failed',
            actions: assign({
              lastError: ({ event }) => (event.error as Error)?.message || 'Client creation failed',
              retryCount: ({ context }) => context.retryCount + 1,
            }),
          },
        },
      },

      creating_provider: {
        invoke: {
          src: services.createWorkItemsProvider,
          input: ({ context }) => context,
          onDone: {
            target: 'connected',
            actions: assign({
              provider: ({ event }) => event.output.provider,
              isConnected: true,
            }),
          },
          onError: {
            target: 'provider_failed',
            actions: assign({
              lastError: ({ event }) =>
                (event.error as Error)?.message || 'Provider creation failed',
              retryCount: ({ context }) => context.retryCount + 1,
            }),
          },
        },
      },

      connected: {
        entry: [actions.notifyConnectionSuccess],
        on: {
          DISCONNECT: 'disconnected',
          REFRESH_AUTH: 'token_refresh',
          TOKEN_EXPIRED: 'token_refresh',
        },
      },

      auth_failed: {
        entry: [actions.notifyAuthFailure],
        on: {
          RETRY: {
            target: 'authenticating',
            guard: guards.canRetry,
          },
          CONNECT: {
            target: 'authenticating',
            actions: assign({
              retryCount: 0,
            }),
          },
          DISCONNECT: 'disconnected',
        },
      },

      client_failed: {
        entry: [actions.notifyClientFailure],
        on: {
          RETRY: {
            target: 'creating_client',
            guard: guards.canRetry,
          },
          CONNECT: 'authenticating',
          DISCONNECT: 'disconnected',
        },
      },

      provider_failed: {
        entry: [actions.notifyProviderFailure],
        on: {
          RETRY: {
            target: 'creating_provider',
            guard: guards.canRetry,
          },
          CONNECT: 'authenticating',
          DISCONNECT: 'disconnected',
        },
      },

      token_refresh: {
        invoke: {
          src: services.refreshAuthToken,
          input: ({ context }) => context,
          onDone: {
            target: 'connected',
            actions: assign({
              accessToken: ({ event }) => event.output.token,
              accessTokenExpiresAt: ({ event }) => event.output.expiresAt,
            }),
          },
          onError: {
            target: 'auth_failed',
            actions: assign({
              lastError: ({ event }) => (event.error as Error)?.message || 'Token refresh failed',
            }),
          },
        },
      },
    },
  },
  {
    // Guards
    guards,

    // Actions
    actions,

    // Actors (services)
    actors: services,
  }
);

// Export types
export type { ConnectionContext, ConnectionEvent } from './types.js';
