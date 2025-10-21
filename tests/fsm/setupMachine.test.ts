import { describe, it } from 'mocha';
import { expect } from 'chai';
import { createActor } from 'xstate';
import { setupMachine } from '../../src/fsm/machines/setupMachine.js';

type TestState = ReturnType<ReturnType<typeof createActor>['getSnapshot']>;

type ExistingConnection = {
  id: string;
  organization: string;
  project: string;
  label?: string;
  authMethod?: 'pat' | 'entra';
  baseUrl?: string;
  apiBaseUrl?: string;
};

const waitForState = async (
  actor: ReturnType<typeof createActor>,
  predicate: (state: TestState) => boolean,
  timeout = 1000
): Promise<TestState> => {
  const current = actor.getSnapshot();
  if (current && predicate(current as TestState)) {
    return current as TestState;
  }

  return await new Promise<TestState>((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      subscription.unsubscribe();
      reject(new Error('Timed out waiting for expected state'));
    }, timeout);

    const subscription = actor.subscribe((state) => {
      if (predicate(state)) {
        clearTimeout(timeoutHandle);
        subscription.unsubscribe();
        resolve(state as TestState);
      }
    });
  });
};

const withStubbedFetch = async (
  implementation: typeof fetch,
  run: () => Promise<void>
): Promise<void> => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = implementation;
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
};

describe('setupMachine existing connection testing', () => {
  const createExtensionContext = (options?: { pat?: string }) => {
    const patValue = options?.pat;
    return {
      secrets: {
        get: async () => patValue,
        store: async () => undefined,
        delete: async () => undefined,
      },
      globalState: {
        get: () => [],
        update: async () => undefined,
      },
    } as any;
  };

  const baseConnection: ExistingConnection = {
    id: 'conn-1',
    organization: 'org',
    project: 'proj',
    label: 'org/proj',
    authMethod: 'pat',
    baseUrl: 'https://dev.azure.com/org',
    apiBaseUrl: 'https://dev.azure.com/org/proj/_apis',
  };

  const startManagingActor = async (options?: { pat?: string }) => {
    const actor = createActor(setupMachine, {
      input: {
        extensionContext: createExtensionContext({ pat: options?.pat }),
      },
    });

    actor.start();
    actor.send({ type: 'START', skipInitialChoice: true });
    await waitForState(actor, (state) => state.matches('managingExisting'));

    return actor;
  };

  const sendExistingTest = async (
    actor: ReturnType<typeof createActor>,
    connection: ExistingConnection
  ) => {
    actor.send({ type: 'TEST_EXISTING_CONNECTION', connection });
    return await waitForState(actor, (state) => state.matches('testingExistingResult'));
  };

  async function runSuccessfulExistingTest(): Promise<void> {
    let invocationCount = 0;

    await withStubbedFetch(
      async () => {
        invocationCount += 1;
        return new Response('{}', {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      },
      async () => {
        const actor = await startManagingActor({ pat: 'token-123' });
        const resultState = await sendExistingTest(actor, baseConnection);

        expect(resultState.context.lastExistingTestResult?.success).to.equal(true);
        expect(invocationCount).to.equal(1);

        actor.send({ type: 'CONTINUE_MANAGING' });
        await waitForState(actor, (state) => state.matches('managingExisting'));
        expect(actor.getSnapshot().context.testingExistingConnection).to.be.undefined;

        actor.stop();
      }
    );
  }

  async function runRetryExistingTest(): Promise<void> {
    let attempt = 0;

    await withStubbedFetch(
      async () => {
        attempt += 1;
        if (attempt === 1) {
          return new Response('Unauthorized', { status: 401 });
        }
        return new Response('{}', {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      },
      async () => {
        const actor = await startManagingActor({ pat: 'token-123' });

        const firstResult = await sendExistingTest(actor, baseConnection);
        expect(firstResult.context.lastExistingTestResult?.success).to.equal(false);
        expect(attempt).to.equal(1);

        actor.send({ type: 'RETRY' });
        const secondResult = await waitForState(actor, (state) =>
          state.matches('testingExistingResult')
        );
        expect(secondResult.context.lastExistingTestResult?.success).to.equal(true);
        expect(attempt).to.equal(2);

        actor.send({ type: 'CONTINUE_MANAGING' });
        await waitForState(actor, (state) => state.matches('managingExisting'));

        actor.stop();
      }
    );
  }

  it('stores result when existing connection test succeeds', async () => {
    await runSuccessfulExistingTest();
  });

  it('retries existing connection test when RETRY is sent', async () => {
    await runRetryExistingTest();
  });

  it('returns failure when PAT secret is missing', async () => {
    const actor = createActor(setupMachine, {
      input: {
        extensionContext: createExtensionContext({ pat: undefined }),
      },
    });

    actor.start();
    actor.send({ type: 'START', skipInitialChoice: true });
    await waitForState(actor, (state) => state.matches('managingExisting'));

    actor.send({ type: 'TEST_EXISTING_CONNECTION', connection: baseConnection });
    const snapshot = await waitForState(actor, (state) => state.matches('testingExistingResult'));

    expect(snapshot.context.lastExistingTestResult?.success).to.equal(false);
    expect(snapshot.context.lastExistingTestResult?.message).to.include('Personal Access Token');

    actor.send({ type: 'CONTINUE_MANAGING' });
    await waitForState(actor, (state) => state.matches('managingExisting'));

    actor.stop();
  });
});
