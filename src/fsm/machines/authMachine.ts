import { createMachine, assign, fromPromise } from 'xstate';
import type { ProjectConnection } from './connectionTypes.js';
import { getPat, getEntraIdToken } from '../functions/auth/authentication.js';
import type { ExtensionContext } from 'vscode';

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
    initial: 'idle',
    context: ({
      input,
    }: {
      input: { connection: ProjectConnection; extensionContext: ExtensionContext };
    }) => ({
      connection: input.connection,
      extensionContext: input.extensionContext,
    }),
    states: {
      idle: {
        on: {
          AUTHENTICATE: 'authenticating',
        },
      },
      authenticating: {
        invoke: {
          src: 'authenticate',
          input: ({ context }) => ({
            connection: context.connection,
            extensionContext: context.extensionContext,
          }),
          onDone: {
            target: 'authenticated',
            actions: assign({
              token: ({ event }) => event.output,
            }),
          },
          onError: {
            target: 'failed',
            actions: assign({
              error: ({ event }) => (event.error as Error).message,
            }),
          },
        },
      },
      authenticated: {
        on: {
          LOGOUT: {
            target: 'idle',
            actions: assign({
              token: undefined,
            }),
          },
        },
      },
      failed: {
        on: {
          AUTHENTICATE: 'authenticating',
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
