/**
 * Module: src/fsm/xstate-svelte/test/fetchMachine.ts
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
import { createMachine, assign, type ActorLogicFrom } from 'xstate';

const context = {
  data: undefined as string | undefined,
};

export const fetchMachine = createMachine({
  id: 'fetch',
  types: {} as {
    context: typeof context;
    actors: {
      src: 'fetchData';
      logic: ActorLogicFrom<Promise<string>>;
    };
  },
  initial: 'idle',
  context,
  states: {
    idle: {
      on: { FETCH: 'loading' },
    },
    loading: {
      invoke: {
        id: 'fetchData',
        src: 'fetchData',
        onDone: {
          target: 'success',
          actions: assign({
            data: ({ event }) => event.output,
          }),
          guard: ({ event }) => !!event.output.length,
        },
      },
    },
    success: {
      type: 'final',
    },
  },
});
