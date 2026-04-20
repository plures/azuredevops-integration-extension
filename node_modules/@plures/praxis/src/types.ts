/**
 * Core types for Praxis - A TypeScript library for typed, functional application logic.
 * All types are designed to be JSON-friendly for serialization and interoperability.
 */

/**
 * Base type for all Praxis events.
 * Events represent things that have happened and trigger state transitions.
 */
export interface PraxisEvent {
  /** Unique identifier for the event type */
  type: string;
  /** Timestamp when the event occurred */
  timestamp: number;
  /** Additional event data (must be JSON-serializable) */
  data?: Record<string, unknown>;
  /** Optional metadata for tracing and debugging */
  metadata?: {
    correlationId?: string;
    source?: string;
    [key: string]: unknown;
  };
}

/**
 * Base type for all Praxis state.
 * State represents the current facts and context of the application.
 */
export interface PraxisState {
  /** Current facts - immutable truths about the system */
  facts: Record<string, unknown>;
  /** Optional metadata for debugging and inspection */
  metadata?: {
    version?: number;
    lastUpdated?: number;
    [key: string]: unknown;
  };
}

/**
 * Result of a state transition step.
 * Contains the new state and any side effects to be executed.
 */
export interface StepResult<S extends PraxisState = PraxisState> {
  /** The new state after applying the event */
  state: S;
  /** Side effects to be executed (e.g., commands, events to emit) */
  effects?: Effect[];
  /** Optional errors or warnings that occurred during the step */
  errors?: string[];
}

/**
 * Represents a side effect to be executed outside the pure step function.
 */
export interface Effect {
  /** Type of the effect */
  type: string;
  /** Effect payload (must be JSON-serializable) */
  payload?: Record<string, unknown>;
}

/**
 * A pure function that transitions from one state to another given an event.
 * This is the core abstraction of Praxis.
 */
export type StepFunction<
  S extends PraxisState = PraxisState,
  E extends PraxisEvent = PraxisEvent,
> = (state: S, event: E) => StepResult<S>;
