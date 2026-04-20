/**
 * Actors System
 *
 * Actors are effectful units that:
 * - Observe Praxis logic state
 * - Perform side effects (network I/O, database operations, timers, etc.)
 * - Feed new events/facts back into the engine
 *
 * Actors provide the bridge between pure logic and the effectful world.
 */

import type { LogicEngine } from './engine.js';
import type { PraxisEvent, PraxisState } from './protocol.js';

/**
 * Actor interface
 *
 * An actor observes state changes and can:
 * - React to state changes (onStateChange)
 * - Perform initialization (onStart)
 * - Perform cleanup (onStop)
 */
export interface Actor<TContext = unknown> {
  /** Unique identifier for the actor */
  id: string;
  /** Human-readable description */
  description: string;
  /** Called when the actor is started */
  onStart?: (engine: LogicEngine<TContext>) => void | Promise<void>;
  /** Called when state changes */
  onStateChange?: (
    state: Readonly<PraxisState & { context: TContext }>,
    engine: LogicEngine<TContext>
  ) => void | Promise<void>;
  /** Called when the actor is stopped */
  onStop?: () => void | Promise<void>;
}

/**
 * Actor manager
 *
 * Manages the lifecycle of actors and coordinates their interaction with the engine.
 */
export class ActorManager<TContext = unknown> {
  private actors = new Map<string, Actor<TContext>>();
  private activeActors = new Set<string>();
  private engine: LogicEngine<TContext> | null = null;

  /**
   * Register an actor
   */
  register(actor: Actor<TContext>): void {
    if (this.actors.has(actor.id)) {
      throw new Error(`Actor with id "${actor.id}" already registered`);
    }
    this.actors.set(actor.id, actor);
  }

  /**
   * Unregister an actor
   */
  unregister(actorId: string): void {
    if (this.activeActors.has(actorId)) {
      throw new Error(`Cannot unregister active actor "${actorId}". Stop it first.`);
    }
    this.actors.delete(actorId);
  }

  /**
   * Attach the actor manager to an engine
   */
  attachEngine(engine: LogicEngine<TContext>): void {
    this.engine = engine;
  }

  /**
   * Start an actor
   */
  async start(actorId: string): Promise<void> {
    const actor = this.actors.get(actorId);
    if (!actor) {
      throw new Error(`Actor "${actorId}" not found`);
    }
    if (this.activeActors.has(actorId)) {
      throw new Error(`Actor "${actorId}" is already started`);
    }
    if (!this.engine) {
      throw new Error('Actor manager not attached to an engine');
    }

    this.activeActors.add(actorId);
    if (actor.onStart) {
      await actor.onStart(this.engine);
    }
  }

  /**
   * Stop an actor
   */
  async stop(actorId: string): Promise<void> {
    const actor = this.actors.get(actorId);
    if (!actor) {
      throw new Error(`Actor "${actorId}" not found`);
    }
    if (!this.activeActors.has(actorId)) {
      return; // Already stopped
    }

    this.activeActors.delete(actorId);
    if (actor.onStop) {
      await actor.onStop();
    }
  }

  /**
   * Start all registered actors
   */
  async startAll(): Promise<void> {
    const actorIds = Array.from(this.actors.keys());
    for (const actorId of actorIds) {
      if (!this.activeActors.has(actorId)) {
        await this.start(actorId);
      }
    }
  }

  /**
   * Stop all active actors
   */
  async stopAll(): Promise<void> {
    const activeIds = Array.from(this.activeActors);
    for (const actorId of activeIds) {
      await this.stop(actorId);
    }
  }

  /**
   * Notify active actors of a state change
   */
  async notifyStateChange(state: Readonly<PraxisState & { context: TContext }>): Promise<void> {
    if (!this.engine) {
      return;
    }

    const promises: Promise<void>[] = [];
    for (const actorId of this.activeActors) {
      const actor = this.actors.get(actorId);
      if (actor?.onStateChange) {
        const result = actor.onStateChange(state, this.engine);
        if (result instanceof Promise) {
          promises.push(result);
        }
      }
    }
    await Promise.all(promises);
  }

  /**
   * Get all registered actor IDs
   */
  getActorIds(): string[] {
    return Array.from(this.actors.keys());
  }

  /**
   * Get all active actor IDs
   */
  getActiveActorIds(): string[] {
    return Array.from(this.activeActors);
  }

  /**
   * Check if an actor is active
   */
  isActive(actorId: string): boolean {
    return this.activeActors.has(actorId);
  }
}

/**
 * Helper to create a simple actor that dispatches events on a timer
 */
export function createTimerActor<TContext = unknown>(
  id: string,
  intervalMs: number,
  createEvent: () => PraxisEvent
): Actor<TContext> {
  let timerId: ReturnType<typeof setInterval> | null = null;

  return {
    id,
    description: `Timer actor (${intervalMs}ms) - ${id}`,
    onStart: (engine) => {
      timerId = setInterval(() => {
        engine.step([createEvent()]);
      }, intervalMs);
    },
    onStop: () => {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    },
  };
}
