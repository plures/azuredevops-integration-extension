/**
 * Module: src/fsm/machines/authMachine.ts
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
import { createMachine, assign, fromPromise } from 'xstate';
import type { ProjectConnection } from './connectionTypes.js';
import { getPat, getEntraIdToken } from '../functions/auth/authentication.js';
import type { ExtensionContext } from 'vscode';
import { AuthStates } from './authMachine.states.js';

export type AuthContext = {
  connection: ProjectConnection;
  extensionContext: ExtensionContext;
  token?: string;
  error?: string;
};

export type AuthEvent =
  | { type: 'AUTHENTICATE' }
  | { type: 'LOGOUT' }
  | { type: 'AUTH_SUCCESS'; token: string }
  | { type: 'AUTH_FAILED'; error: string };

export const authMachine = createMachine(
  {
    id: 'authentication',
    types: {} as {
      context: AuthContext;
      events: AuthEvent;
    },
    initial: AuthStates.IDLE,
    context: ({
      input,
    }: {
      input: { connection: ProjectConnection; extensionContext: ExtensionContext };
    }) => ({
      connection: input.connection,
      extensionContext: input.extensionContext,
    }),
    states: {
      [AuthStates.IDLE]: {
        on: {
          AUTHENTICATE: AuthStates.AUTHENTICATING,
        },
      },
      [AuthStates.AUTHENTICATING]: {
        invoke: {
          src: 'authenticate',
          input: ({ context }) => ({
            connection: context.connection,
            extensionContext: context.extensionContext,
          }),
          onDone: {
            target: AuthStates.AUTHENTICATED,
            actions: assign({
              token: ({ event }) => event.output,
            }),
          },
          onError: {
            target: AuthStates.FAILED,
            actions: assign({
              error: ({ event }) => (event.error as Error).message,
            }),
          },
        },
      },
      [AuthStates.AUTHENTICATED]: {
        on: {
          LOGOUT: {
            target: AuthStates.IDLE,
            actions: [
              async ({ context }) => {
                const { connection, extensionContext } = context;
                if (connection.authMethod === 'pat' && connection.patKey) {
                  await extensionContext.secrets.delete(connection.patKey);
                } else if (connection.authMethod === 'entra' && connection.tenantId) {
                  await extensionContext.secrets.delete(`entra:${connection.tenantId}`);
                }
              },
              assign({
                token: undefined,
              }),
            ],
          },
        },
      },
      [AuthStates.FAILED]: {
        on: {
          AUTHENTICATE: AuthStates.AUTHENTICATING,
        },
      },
    },
  },
  {
    actors: {
      authenticate: fromPromise(
        async ({
          input,
        }: {
          input: {
            connection: ProjectConnection;
            extensionContext: ExtensionContext;
          };
        }) => {
          const { connection, extensionContext } = input;
          if (connection.authMethod === 'pat') {
            return getPat(extensionContext, connection.patKey);
          }
          // Assuming 'entra' is the only other option
          return getEntraIdToken(extensionContext, connection.tenantId);
        }
      ),
    },
  }
);
