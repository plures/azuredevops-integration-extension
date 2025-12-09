import { AppState } from './state.js';
import { processEvent } from './rules.js';
import type { AppEvent } from './events.js';

/**
 * The Global Logic Engine Instance
 */
class SimpleEngine {
  context: AppState;
  constructor(context: AppState) {
    this.context = context;
  }
}

export const engine = new SimpleEngine(new AppState());

// Subscription System
const listeners = new Set<(state: AppState) => void>();
let logger: (msg: string, meta?: any) => void = (msg, meta) =>
  console.debug(`[Praxis] ${msg}`, meta);

/**
 * Configure the logger for the engine.
 */
export function setLogger(fn: (msg: string, meta?: any) => void) {
  logger = fn;
}

/**
 * Subscribe to state changes.
 * The callback is invoked immediately with the current state, and then whenever the state changes.
 */
export function subscribe(fn: (state: AppState) => void) {
  listeners.add(fn);
  // Immediately call with current state
  fn(engine.context);
  return () => listeners.delete(fn);
}

/**
 * Dispatch an event to the engine.
 * This processes the event using the rules and then notifies all subscribers.
 */
export function dispatch(event: AppEvent) {
  logger('Dispatching event', event);
  processEvent(engine.context, event);
  // Notify all listeners
  for (const listener of listeners) {
    listener(engine.context);
  }
}

// Expose for debugging
(globalThis as any).__PRAXIS_ENGINE__ = engine;
