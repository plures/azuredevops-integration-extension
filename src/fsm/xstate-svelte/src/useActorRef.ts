/**
 * Module: src/fsm/xstate-svelte/src/useActorRef.ts
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
import { onDestroy } from 'svelte';
import {
  Actor,
  ActorOptions,
  AnyActorLogic,
  createActor,
  type ConditionalRequired,
  type IsNotNever,
  type RequiredActorOptionsKeys,
} from 'xstate';

export function useActorRef<TLogic extends AnyActorLogic>(
  logic: TLogic,
  ...[options]: ConditionalRequired<
    [
      options?: ActorOptions<TLogic> & {
        [K in RequiredActorOptionsKeys<TLogic>]: unknown;
      },
    ],
    IsNotNever<RequiredActorOptionsKeys<TLogic>>
  >
): Actor<TLogic> {
  const actorRef = createActor(logic, options).start();
  onDestroy(() => actorRef.stop());
  return actorRef;
}
