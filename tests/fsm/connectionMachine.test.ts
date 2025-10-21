import { describe, it } from 'mocha';
import { expect } from 'chai';
import { connectionMachine } from '../../src/fsm/machines/connectionMachine.js';
import { createActor, fromPromise } from 'xstate';
import type { ProjectConnection } from '../../src/fsm/machines/connectionTypes.js';

describe('connectionMachine', () => {
  it('stores client and provider instances when connection succeeds', async () => {
    const stubClient = { id: 'client-stub' };
    const stubProvider = { refresh: () => undefined };
    const machine = connectionMachine.provide({
      actors: {
        authenticateWithPAT: fromPromise(async () => ({ credential: 'test-pat' })),
        createAzureClient: fromPromise(async () => ({
          client: stubClient,
          config: {
            organization: 'org',
            project: 'proj',
            credential: 'test-pat',
            options: {
              authType: 'pat' as const,
            },
          },
          context: {},
        })),
        createWorkItemsProvider: fromPromise(async () => stubProvider),
      },
      actions: {
        notifyConnectionSuccess: () => {
          // Skip legacy refresh logic in tests
        },
      },
    });

    const actor = createActor(machine);
    const connection: ProjectConnection = {
      id: 'conn-1',
      organization: 'org',
      project: 'proj',
      authMethod: 'pat',
    };

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Timed out waiting for connected state')),
        2000
      );
      actor.subscribe((state) => {
        if (state.matches('connected')) {
          clearTimeout(timeout);
          resolve();
        } else if (
          state.matches('auth_failed') ||
          state.matches('client_failed') ||
          state.matches('provider_failed')
        ) {
          clearTimeout(timeout);
          reject(new Error(`Unexpected terminal state: ${String(state.value)}`));
        }
      });

      actor.start();
      actor.send({ type: 'CONNECT', config: connection });
    });

    const snapshot = actor.getSnapshot();
    expect(snapshot?.context.client).to.equal(stubClient);
    expect(snapshot?.context.provider).to.equal(stubProvider);

    actor.stop();
  });
});
