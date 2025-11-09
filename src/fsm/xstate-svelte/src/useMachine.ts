/**
 * Module: src/fsm/xstate-svelte/src/useMachine.ts
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
import {
  ActorOptions,
  AnyStateMachine,
  type ConditionalRequired,
  type IsNotNever,
  type RequiredActorOptionsKeys,
} from 'xstate';
import { useActor } from './useActor';

/** @alias useActor */
export function useMachine<TMachine extends AnyStateMachine>(
  machine: TMachine,
  ...[options]: ConditionalRequired<
    [
      options?: ActorOptions<TMachine> & {
        [K in RequiredActorOptionsKeys<TMachine>]: unknown;
      },
    ],
    IsNotNever<RequiredActorOptionsKeys<TMachine>>
  >
) {
  return useActor(machine, options);
}
