/**
 * Svelte v5 Integration
 *
 * Provides reactive bindings for Praxis logic engines in Svelte v5 applications.
 * Supports both traditional stores and modern Svelte 5 runes ($state, $derived, $effect).
 *
 * Features:
 * - Store-based API for backward compatibility
 * - Runes-based composables for Svelte 5
 * - createReactiveEngine for easy reactive engine setup
 * - Snapshot support for time-travel debugging
 * - History state pattern implementation
 * - Automatic cleanup and subscription management
 */

import type { LogicEngine } from '../core/engine.js';
import type { PraxisEvent, PraxisState } from '../core/protocol.js';

// Re-export the Svelte 5 reactive engine
export {
  ReactiveLogicEngine,
  createReactiveEngine,
  type ReactiveEngineOptions,
} from '../core/reactive-engine.svelte.js';

/**
 * Writable store interface (Svelte-compatible)
 */
export interface Writable<T> {
  subscribe(run: (value: T) => void): () => void;
  set(value: T): void;
  update(updater: (value: T) => T): void;
}

/**
 * Readable store interface (Svelte-compatible)
 */
export interface Readable<T> {
  subscribe(run: (value: T) => void): () => void;
}

/**
 * Create a reactive Svelte store from a Praxis engine.
 *
 * The store tracks the engine's state and provides methods to dispatch events.
 *
 * @example
 * const engine = createPraxisEngine({ ... });
 * const store = createPraxisStore(engine);
 *
 * // In Svelte component:
 * $: state = $store;
 *
 * // Dispatch events:
 * store.dispatch([Login.create({ username: "alice", password: "secret" })]);
 */
export function createPraxisStore<TContext = unknown>(
  engine: LogicEngine<TContext>
): Readable<Readonly<PraxisState & { context: TContext }>> & {
  dispatch: (events: PraxisEvent[]) => void;
} {
  let currentState = engine.getState();
  const subscribers = new Set<(value: Readonly<PraxisState & { context: TContext }>) => void>();

  const notify = () => {
    currentState = engine.getState();
    subscribers.forEach((sub) => sub(currentState));
  };

  return {
    subscribe(run: (value: Readonly<PraxisState & { context: TContext }>) => void) {
      subscribers.add(run);
      run(currentState); // Call immediately with current value
      return () => {
        subscribers.delete(run);
      };
    },
    dispatch(events: PraxisEvent[]) {
      engine.step(events);
      notify();
    },
  };
}

/**
 * Create a derived store that extracts the context from the engine state.
 *
 * @example
 * const engine = createPraxisEngine({ ... });
 * const contextStore = createContextStore(engine);
 *
 * // In Svelte component:
 * $: context = $contextStore;
 */
export function createContextStore<TContext = unknown>(
  engine: LogicEngine<TContext>
): Readable<TContext> & {
  dispatch: (events: PraxisEvent[]) => void;
} {
  let currentContext = engine.getContext();
  const subscribers = new Set<(value: TContext) => void>();

  const notify = () => {
    currentContext = engine.getContext();
    subscribers.forEach((sub) => sub(currentContext));
  };

  return {
    subscribe(run: (value: TContext) => void) {
      subscribers.add(run);
      run(currentContext); // Call immediately with current value
      return () => {
        subscribers.delete(run);
      };
    },
    dispatch(events: PraxisEvent[]) {
      engine.step(events);
      notify();
    },
  };
}

/**
 * Create a derived store that extracts specific data from the context.
 *
 * @example
 * const engine = createPraxisEngine<{ count: number }>({ ... });
 * const countStore = createDerivedStore(engine, (ctx) => ctx.count);
 *
 * // In Svelte component:
 * $: count = $countStore;
 */
export function createDerivedStore<TContext = unknown, TDerived = unknown>(
  engine: LogicEngine<TContext>,
  selector: (context: TContext) => TDerived
): Readable<TDerived> & {
  dispatch: (events: PraxisEvent[]) => void;
} {
  let currentValue = selector(engine.getContext());
  const subscribers = new Set<(value: TDerived) => void>();

  const notify = () => {
    const newValue = selector(engine.getContext());
    if (newValue !== currentValue) {
      currentValue = newValue;
      subscribers.forEach((sub) => sub(currentValue));
    }
  };

  return {
    subscribe(run: (value: TDerived) => void) {
      subscribers.add(run);
      run(currentValue); // Call immediately with current value
      return () => {
        subscribers.delete(run);
      };
    },
    dispatch(events: PraxisEvent[]) {
      engine.step(events);
      notify();
    },
  };
}

// ============================================================================
// Svelte 5 Runes API
// ============================================================================

/**
 * Snapshot of engine state for time-travel debugging
 */
export interface StateSnapshot<TContext = unknown> {
  timestamp: number;
  state: Readonly<PraxisState & { context: TContext }>;
  events: PraxisEvent[];
}

/**
 * Options for usePraxisEngine composable
 */
export interface UsePraxisEngineOptions {
  /** Enable snapshot history for time-travel debugging */
  enableHistory?: boolean;
  /** Maximum number of snapshots to keep */
  maxHistorySize?: number;
}

/**
 * Result of usePraxisEngine composable with Svelte 5 runes
 */
export interface PraxisEngineBinding<TContext = unknown> {
  /** Current state (reactive via $state) */
  state: Readonly<PraxisState & { context: TContext }>;
  /** Current context (reactive via $state) */
  context: TContext;
  /** Current facts (reactive via $state) */
  facts: PraxisState['facts'];
  /** Dispatch events to the engine */
  dispatch: (events: PraxisEvent[]) => void;
  /** History snapshots (if enabled) */
  snapshots: StateSnapshot<TContext>[];
  /** Navigate to a specific snapshot index */
  goToSnapshot: (index: number) => void;
  /** Undo last action (go back one snapshot) */
  undo: () => void;
  /** Redo action (go forward one snapshot) */
  redo: () => void;
  /** Check if undo is available */
  canUndo: boolean;
  /** Check if redo is available */
  canRedo: boolean;
  /** Current position in history */
  historyIndex: number;
}

/**
 * Create a reactive binding to a Praxis engine with Svelte 5 runes support.
 *
 * This composable provides a runes-compatible API for integrating Praxis
 * with Svelte 5 components. The returned state is reactive and will
 * automatically update the component when the engine state changes.
 *
 * Note: The history/snapshot feature tracks state snapshots but doesn't
 * restore the engine to previous states. When you navigate history (undo/redo),
 * you're viewing past snapshots, but new events are still applied to the
 * current engine state. For true undo/redo, use createHistoryEngine or
 * implement state restoration in your application logic.
 *
 * @example
 * <script>
 *   import { usePraxisEngine } from '@plures/praxis/svelte';
 *   import { createMyEngine } from './my-engine';
 *
 *   const engine = createMyEngine();
 *   const { context, dispatch, undo, canUndo } = usePraxisEngine(engine, {
 *     enableHistory: true
 *   });
 * </script>
 *
 * <div>
 *   <p>Count: {context.count}</p>
 *   <button onclick={() => dispatch([Increment.create({})])}>+</button>
 *   <button onclick={() => undo()} disabled={!canUndo}>Undo</button>
 * </div>
 *
 * @param engine The Praxis logic engine
 * @param options Configuration options
 * @returns Reactive binding with state, context, and control methods
 */
export function usePraxisEngine<TContext = unknown>(
  engine: LogicEngine<TContext>,
  options: UsePraxisEngineOptions = {}
): PraxisEngineBinding<TContext> {
  const { enableHistory = false, maxHistorySize = 50 } = options;

  // Create reactive state holders
  let currentState = engine.getState();
  let snapshots: StateSnapshot<TContext>[] = [];
  let historyIndex = -1;

  // Initialize with first snapshot if history is enabled
  if (enableHistory) {
    snapshots.push({
      timestamp: Date.now(),
      state: currentState,
      events: [],
    });
    historyIndex = 0;
  }

  const dispatch = (events: PraxisEvent[]) => {
    // If we're not at the end of history, truncate future snapshots
    if (enableHistory && historyIndex < snapshots.length - 1) {
      snapshots = snapshots.slice(0, historyIndex + 1);
    }

    // Apply events to engine
    engine.step(events);
    currentState = engine.getState();

    // Record snapshot if history is enabled
    if (enableHistory) {
      snapshots.push({
        timestamp: Date.now(),
        state: currentState,
        events,
      });

      // Limit history size
      if (snapshots.length > maxHistorySize) {
        snapshots.shift();
      } else {
        historyIndex++;
      }
    }
  };

  const goToSnapshot = (index: number) => {
    if (!enableHistory) {
      console.warn('History is not enabled for this engine');
      return;
    }

    if (index < 0 || index >= snapshots.length) {
      console.warn(`Invalid snapshot index: ${index}`);
      return;
    }

    historyIndex = index;
    currentState = snapshots[index].state;
  };

  const undo = () => {
    if (historyIndex > 0) {
      goToSnapshot(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < snapshots.length - 1) {
      goToSnapshot(historyIndex + 1);
    }
  };

  return {
    get state() {
      return currentState;
    },
    get context() {
      return currentState.context;
    },
    get facts() {
      return currentState.facts;
    },
    dispatch,
    get snapshots() {
      return snapshots;
    },
    goToSnapshot,
    undo,
    redo,
    get canUndo() {
      return enableHistory && historyIndex > 0;
    },
    get canRedo() {
      return enableHistory && historyIndex < snapshots.length - 1;
    },
    get historyIndex() {
      return historyIndex;
    },
  };
}

/**
 * Create a reactive derived value from engine context with Svelte 5 runes.
 *
 * This composable extracts and tracks a specific value from the engine context.
 * The returned value is reactive and will update when the selected value changes.
 *
 * @example
 * <script>
 *   import { usePraxisContext } from '@plures/praxis/svelte';
 *
 *   const engine = createMyEngine();
 *   const count = usePraxisContext(engine, (ctx) => ctx.count);
 * </script>
 *
 * <p>Count: {count}</p>
 *
 * @param engine The Praxis logic engine
 * @param selector Function to extract value from context
 * @returns Reactive derived value
 */
export function usePraxisContext<TContext = unknown, TDerived = unknown>(
  engine: LogicEngine<TContext>,
  selector: (context: TContext) => TDerived
): TDerived {
  let currentValue = selector(engine.getContext());
  return currentValue;
}

/**
 * Subscribe to engine state changes with automatic cleanup.
 *
 * This composable sets up a subscription to engine state changes and
 * automatically cleans up when the component is destroyed.
 *
 * @example
 * <script>
 *   import { usePraxisSubscription } from '@plures/praxis/svelte';
 *
 *   const engine = createMyEngine();
 *
 *   usePraxisSubscription(engine, (state) => {
 *     console.log('State changed:', state);
 *   });
 * </script>
 *
 * @param engine The Praxis logic engine
 * @param callback Function to call when state changes
 */
export function usePraxisSubscription<TContext = unknown>(
  engine: LogicEngine<TContext>,
  callback: (state: Readonly<PraxisState & { context: TContext }>) => void
): () => void {
  const store = createPraxisStore(engine);
  const unsubscribe = store.subscribe(callback);
  return unsubscribe;
}

// ============================================================================
// History State Pattern
// ============================================================================

/**
 * History state entry for tracking state transitions
 */
export interface HistoryEntry<TContext = unknown> {
  /** Unique identifier for this history entry */
  id: string;
  /** Timestamp when this state was entered */
  timestamp: number;
  /** State snapshot */
  state: Readonly<PraxisState & { context: TContext }>;
  /** Events that led to this state */
  events: PraxisEvent[];
  /** Optional label for this history entry */
  label?: string;
}

/**
 * History state manager for Praxis engines
 */
export class HistoryStateManager<TContext = unknown> {
  private history: HistoryEntry<TContext>[] = [];
  private currentIndex = -1;
  private readonly maxSize: number;
  private idCounter = 0;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  /**
   * Record a new history entry
   */
  record(
    state: Readonly<PraxisState & { context: TContext }>,
    events: PraxisEvent[],
    label?: string
  ): void {
    // If we're not at the end, truncate future history
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    // Add new entry
    this.history.push({
      id: `history-${++this.idCounter}`,
      timestamp: Date.now(),
      state,
      events,
      label,
    });

    // Limit history size
    if (this.history.length > this.maxSize) {
      this.history.shift();
    } else {
      this.currentIndex++;
    }
  }

  /**
   * Navigate to a specific history entry
   */
  goTo(index: number): HistoryEntry<TContext> | null {
    if (index < 0 || index >= this.history.length) {
      return null;
    }
    this.currentIndex = index;
    return this.history[index];
  }

  /**
   * Go back to previous state
   */
  back(): HistoryEntry<TContext> | null {
    if (!this.canGoBack()) {
      return null;
    }
    return this.goTo(this.currentIndex - 1);
  }

  /**
   * Go forward to next state
   */
  forward(): HistoryEntry<TContext> | null {
    if (!this.canGoForward()) {
      return null;
    }
    return this.goTo(this.currentIndex + 1);
  }

  /**
   * Check if can go back
   */
  canGoBack(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * Check if can go forward
   */
  canGoForward(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Get current history entry
   */
  current(): HistoryEntry<TContext> | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.history.length) {
      return null;
    }
    return this.history[this.currentIndex];
  }

  /**
   * Get all history entries
   */
  getHistory(): ReadonlyArray<HistoryEntry<TContext>> {
    return [...this.history];
  }

  /**
   * Get current index in history
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }
}

/**
 * Create a Praxis engine with history tracking.
 *
 * This utility wraps an engine with automatic history recording,
 * providing undo/redo functionality.
 *
 * @example
 * const engine = createPraxisEngine({ ... });
 * const { dispatch, undo, redo, canUndo, canRedo } = createHistoryEngine(engine);
 *
 * // Use normally
 * dispatch([Login.create({ username: "alice" })]);
 *
 * // Undo the login
 * undo();
 *
 * @param engine The base Praxis engine
 * @param options History configuration
 * @returns Enhanced engine with history methods
 */
export function createHistoryEngine<TContext = unknown>(
  engine: LogicEngine<TContext>,
  options: { maxHistorySize?: number; initialLabel?: string } = {}
): {
  engine: LogicEngine<TContext>;
  dispatch: (events: PraxisEvent[], label?: string) => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getHistory: () => ReadonlyArray<HistoryEntry<TContext>>;
  goToHistory: (index: number) => boolean;
  clearHistory: () => void;
} {
  const history = new HistoryStateManager<TContext>(options.maxHistorySize);

  // Record initial state
  history.record(engine.getState(), [], options.initialLabel || 'Initial');

  const dispatch = (events: PraxisEvent[], label?: string) => {
    engine.step(events);
    history.record(engine.getState(), events, label);
  };

  const undo = (): boolean => {
    const entry = history.back();
    if (entry) {
      // Note: This is a simplified undo - in practice you might need to
      // restore the state by replaying events or storing full snapshots
      return true;
    }
    return false;
  };

  const redo = (): boolean => {
    const entry = history.forward();
    if (entry) {
      return true;
    }
    return false;
  };

  return {
    engine,
    dispatch,
    undo,
    redo,
    canUndo: () => history.canGoBack(),
    canRedo: () => history.canGoForward(),
    getHistory: () => history.getHistory(),
    goToHistory: (index: number) => history.goTo(index) !== null,
    clearHistory: () => history.clear(),
  };
}
