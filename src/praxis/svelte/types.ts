/**
 * Praxis Svelte Integration Types
 *
 * Type definitions for Svelte 5 runes-compatible Praxis state management.
 */

import type { PraxisEvent } from '@plures/praxis';

/**
 * Praxis engine state for Svelte components
 */
export interface PraxisEngineState<TContext> {
  /**
   * Current engine context (reactive)
   */
  context: TContext;

  /**
   * Whether the engine is connected/active
   */
  connected: boolean;

  /**
   * Timestamp of last state update
   */
  lastUpdate: number;
}

/**
 * Dispatch function type
 */
export type DispatchFn = (event: PraxisEvent) => void;

/**
 * Result of usePraxisEngine hook
 */
export interface UsePraxisEngineResult<TContext> {
  /**
   * Reactive state object
   */
  state: PraxisEngineState<TContext>;

  /**
   * Dispatch events to the engine
   */
  dispatch: DispatchFn;

  /**
   * Get the current context (non-reactive)
   */
  getContext: () => TContext;

  /**
   * Check if connected
   */
  isConnected: () => boolean;
}

/**
 * Options for usePraxisEngine
 */
export interface UsePraxisEngineOptions<TContext> {
  /**
   * Callback when connection status changes
   */
  onConnectionChange?: (connected: boolean) => void;

  /**
   * Callback when state updates
   */
  onStateChange?: (context: TContext) => void;

  /**
   * Initial context override
   */
  initialContext?: Partial<TContext>;
}

/**
 * Remote engine adapter interface for VS Code webview communication
 */
export interface RemoteEngineAdapter<TContext> {
  /**
   * Subscribe to context updates from extension host
   */
  subscribe: (callback: (context: TContext) => void) => () => void;

  /**
   * Send event to extension host
   */
  sendEvent: (event: PraxisEvent) => void;

  /**
   * Check if connected to extension host
   */
  isConnected: () => boolean;

  /**
   * Get current context (may be stale)
   */
  getContext: () => TContext | undefined;
}

/**
 * Message types for VS Code webview communication
 */
export type PraxisWebviewMessageType =
  | 'praxis:state'
  | 'praxis:event'
  | 'praxis:connected'
  | 'praxis:disconnected';

/**
 * Message structure for VS Code webview
 */
export interface PraxisWebviewMessage<TPayload = unknown> {
  type: PraxisWebviewMessageType;
  payload: TPayload;
  timestamp: number;
}

/**
 * State message payload
 */
export interface PraxisStatePayload<TContext> {
  context: TContext;
  engineId?: string;
}

/**
 * Event message payload
 */
export interface PraxisEventPayload {
  event: PraxisEvent;
  engineId?: string;
}
