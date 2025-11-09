/**
 * Module: src/fsm/machines/dataMachine.ts
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
import { getWorkItemTrackingApi } from '../functions/azure/azure-devops-client.js';
import type { WorkItem } from 'azure-devops-node-api/interfaces/WorkItemTrackingInterfaces.js';
import { DataStates } from './dataMachine.states.js';

export type DataContext = {
  serverUrl: string;
  token: string;
  workItems?: WorkItem[];
  error?: string;
};

export type DataEvent =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; workItems: WorkItem[] }
  | { type: 'FETCH_ERROR'; error: string };

export const dataMachine = createMachine(
  {
    id: 'data',
    types: {} as {
      context: DataContext;
      events: DataEvent;
    },
    initial: DataStates.IDLE,
    context: ({ input }: { input: { serverUrl: string; token: string } }) => ({
      serverUrl: input.serverUrl,
      token: input.token,
    }),
    states: {
      [DataStates.IDLE]: {
        on: {
          FETCH: DataStates.FETCHING,
        },
      },
      [DataStates.FETCHING]: {
        invoke: {
          src: 'fetchWorkItems',
          input: ({ context }) => ({
            serverUrl: context.serverUrl,
            token: context.token,
          }),
          onDone: {
            target: DataStates.SUCCESS,
            actions: assign({
              workItems: ({ event }) => event.output,
            }),
          },
          onError: {
            target: DataStates.ERROR,
            actions: assign({
              error: ({ event }) => (event.error as Error).message,
            }),
          },
        },
      },
      [DataStates.SUCCESS]: {
        on: {
          FETCH: DataStates.FETCHING,
        },
      },
      [DataStates.ERROR]: {
        on: {
          FETCH: DataStates.FETCHING,
        },
      },
    },
  },
  {
    actors: {
      fetchWorkItems: fromPromise(
        async ({ input }: { input: { serverUrl: string; token: string } }) => {
          const witApi = await getWorkItemTrackingApi(input.serverUrl, input.token);
          // This is a simplified query. In a real scenario, you would use a more complex WIQL query.
          const queryResult = await witApi.queryByWiql({
            query:
              "SELECT [System.Id] FROM workitems WHERE [System.State] <> 'Closed' AND [System.State] <> 'Done'",
          });

          if (queryResult.workItems) {
            const workItemIds = queryResult.workItems
              .map((wi) => wi.id)
              .filter((id): id is number => id !== undefined);
            if (workItemIds.length > 0) {
              return await witApi.getWorkItems(workItemIds);
            }
          }
          return [];
        }
      ),
    },
  }
);
