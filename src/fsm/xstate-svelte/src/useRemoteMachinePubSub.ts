/**
 * Module: src/fsm/xstate-svelte/src/useRemoteMachinePubSub.ts
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
import { useRemoteMachine, type RemoteMachineAPI, type RemoteSnapshot } from './useRemoteMachine';

/**
 * PubSub adapter interface for webview-side communication
 */
export interface PubSubAdapter {
  /**
   * Subscribe to a topic with a handler
   * @returns Unsubscribe function
   */
  subscribe: <T>(topic: string, handler: (data: T) => void) => () => void;
  /**
   * Publish data to a topic
   */
  publish: <T>(topic: string, data: T) => void;
}

/**
 * Options for useRemoteMachinePubSub
 */
export interface UseRemoteMachinePubSubOptions<TSnapshot, TEvent> {
  /**
   * Optional optimistic reducer for local-first updates
   */
  optimistic?: {
    reducer: (snapshot: TSnapshot, event: TEvent) => TSnapshot;
  };
  /**
   * Initial snapshot to use before receiving from server
   */
  initialSnapshot?: TSnapshot;
  /**
   * Callback when connection status changes
   */
  onConnectionChange?: (connected: boolean) => void;
}

/**
 * Event with subseq (subscriber sequence) for tracking
 * Matches migration instructions terminology.
 */
interface EventWithSeq<TEvent> {
  event: TEvent;
  subseq: number;
}

/**
 * Helper that uses a PubSub adapter to subscribe to machine snapshot topics
 * and publish events. Includes optimistic reducer option and pending replay.
 * Uses subseq/pubseq reconciliation per migration instructions.
 * Uses svelte/store fallback.
 *
 * @param pubsub - PubSub adapter instance
 * @param machineId - Unique identifier for the machine
 * @param options - Configuration options
 * @returns RemoteMachineAPI with state, send, requestSnapshot, connected, and pendingCount
 */
export function useRemoteMachinePubSub<TSnapshot, TEvent>(
  pubsub: PubSubAdapter,
  machineId: string,
  options: UseRemoteMachinePubSubOptions<TSnapshot, TEvent> = {}
): RemoteMachineAPI<TSnapshot, TEvent> {
  const snapshotTopic = `machine:${machineId}:snapshot`;
  const eventsTopic = `machine:${machineId}:events`;
  const requestTopic = `machine:${machineId}:request-snapshot`;

  // Create subscribe function for snapshots
  const subscribeFn = (onSnapshot: (snapshot: RemoteSnapshot<TSnapshot>) => void) => {
    return pubsub.subscribe<RemoteSnapshot<TSnapshot>>(snapshotTopic, onSnapshot);
  };

  // Create publish function for events (with subseq)
  const publishEventFn = (event: TEvent, subseq: number) => {
    const payload: EventWithSeq<TEvent> = { event, subseq };
    pubsub.publish(eventsTopic, payload);
  };

  // Create request snapshot function
  const requestSnapshotFn = () => {
    pubsub.publish(requestTopic, { timestamp: Date.now() });
  };

  // Use the base useRemoteMachine with pubsub wiring
  return useRemoteMachine<TSnapshot, TEvent>(
    subscribeFn,
    publishEventFn,
    requestSnapshotFn,
    options
  );
}
