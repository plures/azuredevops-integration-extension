/**
 * Flows and actors for orchestrating state transitions in Praxis.
 * Flows represent sequences of state transitions.
 * Actors are entities that maintain their own state and respond to events.
 */

import type { PraxisState, PraxisEvent, StepResult, StepFunction } from './types.js';

/**
 * A flow represents a sequence of events that need to occur.
 */
export interface Flow<E extends PraxisEvent = PraxisEvent> {
  /** Unique identifier for the flow */
  id: string;
  /** Description of what the flow accomplishes */
  description?: string;
  /** Steps in the flow */
  steps: FlowStep<E>[];
  /** Current step index */
  currentStep: number;
  /** Whether the flow is complete */
  complete: boolean;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * A step in a flow.
 */
export interface FlowStep<E extends PraxisEvent = PraxisEvent> {
  /** Step identifier */
  id: string;
  /** Expected event type for this step */
  expectedEventType: string;
  /** Optional validation function */
  validate?: (event: E) => boolean;
  /** Optional timeout in milliseconds */
  timeout?: number;
}

/**
 * An actor maintains its own state and responds to events.
 */
export interface Actor<S extends PraxisState = PraxisState, E extends PraxisEvent = PraxisEvent> {
  /** Unique identifier for the actor */
  id: string;
  /** Current state of the actor */
  state: S;
  /** Step function for processing events */
  step: StepFunction<S, E>;
  /** Optional metadata */
  metadata?: {
    type?: string;
    created?: number;
    [key: string]: unknown;
  };
}

/**
 * Create a new flow.
 */
export function createFlow<E extends PraxisEvent = PraxisEvent>(
  id: string,
  steps: FlowStep<E>[],
  description?: string
): Flow<E> {
  return {
    id,
    description,
    steps,
    currentStep: 0,
    complete: false,
  };
}

/**
 * Advance a flow with an event.
 * Returns an updated flow and whether the flow accepted the event.
 */
export function advanceFlow<E extends PraxisEvent = PraxisEvent>(
  flow: Flow<E>,
  event: E
): { flow: Flow<E>; accepted: boolean } {
  if (flow.complete) {
    return { flow, accepted: false };
  }

  const currentStep = flow.steps[flow.currentStep];
  if (!currentStep) {
    return { flow, accepted: false };
  }

  // Check if event matches expected type
  if (currentStep.expectedEventType !== event.type) {
    return { flow, accepted: false };
  }

  // Validate event if validator is provided
  if (currentStep.validate && !currentStep.validate(event)) {
    return { flow, accepted: false };
  }

  // Advance to next step
  const nextStep = flow.currentStep + 1;
  const complete = nextStep >= flow.steps.length;

  const updatedFlow: Flow<E> = {
    ...flow,
    currentStep: nextStep,
    complete,
  };

  return { flow: updatedFlow, accepted: true };
}

/**
 * Check if a flow is waiting for a specific event type.
 */
export function isFlowWaitingFor<E extends PraxisEvent = PraxisEvent>(
  flow: Flow<E>,
  eventType: string
): boolean {
  if (flow.complete) {
    return false;
  }
  const currentStep = flow.steps[flow.currentStep];
  return currentStep?.expectedEventType === eventType;
}

/**
 * Create a new actor.
 */
export function createActor<
  S extends PraxisState = PraxisState,
  E extends PraxisEvent = PraxisEvent,
>(id: string, initialState: S, stepFunction: StepFunction<S, E>, type?: string): Actor<S, E> {
  return {
    id,
    state: initialState,
    step: stepFunction,
    metadata: {
      type,
      created: Date.now(),
    },
  };
}

/**
 * Process an event through an actor.
 * Returns the updated actor and any effects.
 */
export function processActorEvent<
  S extends PraxisState = PraxisState,
  E extends PraxisEvent = PraxisEvent,
>(actor: Actor<S, E>, event: E): { actor: Actor<S, E>; result: StepResult<S> } {
  const result = actor.step(actor.state, event);

  const updatedActor: Actor<S, E> = {
    ...actor,
    state: result.state,
  };

  return { actor: updatedActor, result };
}

/**
 * Actor system for managing multiple actors.
 */
export class ActorSystem<S extends PraxisState = PraxisState, E extends PraxisEvent = PraxisEvent> {
  private actors: Map<string, Actor<S, E>> = new Map();

  /**
   * Register an actor in the system.
   */
  register(actor: Actor<S, E>): void {
    if (this.actors.has(actor.id)) {
      throw new Error(`Actor with id '${actor.id}' already exists`);
    }
    this.actors.set(actor.id, actor);
  }

  /**
   * Unregister an actor from the system.
   */
  unregister(id: string): boolean {
    return this.actors.delete(id);
  }

  /**
   * Get an actor by ID.
   */
  get(id: string): Actor<S, E> | undefined {
    return this.actors.get(id);
  }

  /**
   * Get all actors.
   */
  getAll(): Actor<S, E>[] {
    return Array.from(this.actors.values());
  }

  /**
   * Send an event to a specific actor.
   */
  send(actorId: string, event: E): StepResult<S> | undefined {
    const actor = this.actors.get(actorId);
    if (!actor) {
      return undefined;
    }

    const { actor: updatedActor, result } = processActorEvent(actor, event);
    this.actors.set(actorId, updatedActor);

    return result;
  }

  /**
   * Broadcast an event to all actors.
   * Returns a map of actor IDs to their results.
   */
  broadcast(event: E): Map<string, StepResult<S>> {
    const results = new Map<string, StepResult<S>>();

    for (const [id, actor] of this.actors) {
      const { actor: updatedActor, result } = processActorEvent(actor, event);
      this.actors.set(id, updatedActor);
      results.set(id, result);
    }

    return results;
  }

  /**
   * Clear all actors from the system.
   */
  clear(): void {
    this.actors.clear();
  }

  /**
   * Get the number of actors in the system.
   */
  size(): number {
    return this.actors.size;
  }
}

/**
 * Create a new actor system.
 */
export function createActorSystem<
  S extends PraxisState = PraxisState,
  E extends PraxisEvent = PraxisEvent,
>(): ActorSystem<S, E> {
  return new ActorSystem<S, E>();
}
