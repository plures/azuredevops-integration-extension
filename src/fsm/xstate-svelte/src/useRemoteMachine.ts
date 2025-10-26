import { writable, derived, type Readable } from 'svelte/store';

/**
 * Options for useRemoteMachine
 */
export interface UseRemoteMachineOptions<TSnapshot, TEvent> {
  /**
   * Optional optimistic reducer for local-first updates before server acknowledgment.
   * Must be deterministic and small.
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
 * Internal event with clientSeq tracking
 */
interface TrackedEvent<TEvent> {
  event: TEvent;
  clientSeq: number;
}

/**
 * Snapshot with server sequence and optional echo
 */
export interface RemoteSnapshot<TSnapshot> {
  snapshot: TSnapshot;
  serverSeq: number;
  echoClientSeq?: number;
}

/**
 * Remote machine API returned by useRemoteMachine
 */
export interface RemoteMachineAPI<TSnapshot, TEvent> {
  /**
   * Current machine snapshot
   */
  state: Readable<TSnapshot | null>;
  /**
   * Send an event to the remote machine
   */
  send: (event: TEvent) => void;
  /**
   * Request a fresh snapshot from the server
   */
  requestSnapshot: () => void;
  /**
   * Connection status
   */
  connected: Readable<boolean>;
  /**
   * Number of pending (unacknowledged) events
   */
  pendingCount: Readable<number>;
}

/**
 * svelte/store fallback implementation of useRemoteMachine with pubsub support.
 *
 * Manages synchronization with a remote machine via snapshot updates and event sending.
 * Supports optional optimistic updates, clientSeq tracking, and serverSeq handling.
 *
 * @param subscribeFn - Function to subscribe to snapshot updates, returns unsubscribe function
 * @param publishEventFn - Function to publish events to the remote machine
 * @param requestSnapshotFn - Function to request a snapshot from the remote machine
 * @param options - Configuration options
 * @returns API with state, send, requestSnapshot, connected, and pendingCount
 */
export function useRemoteMachine<TSnapshot, TEvent>(
  subscribeFn: (onSnapshot: (snapshot: RemoteSnapshot<TSnapshot>) => void) => () => void,
  publishEventFn: (event: TEvent, clientSeq: number) => void,
  requestSnapshotFn: () => void,
  options: UseRemoteMachineOptions<TSnapshot, TEvent> = {}
): RemoteMachineAPI<TSnapshot, TEvent> {
  const { optimistic, initialSnapshot, onConnectionChange } = options;

  // Internal state stores
  const baseState = writable<TSnapshot | null>(initialSnapshot ?? null);
  const connected = writable<boolean>(false);
  const pendingEvents = writable<TrackedEvent<TEvent>[]>([]);

  let clientSeqCounter = 0;
  let lastServerSeq = -1;
  let unsubscribe: (() => void) | null = null;

  // Derived state that applies optimistic updates
  const state = derived([baseState, pendingEvents], ([$baseState, $pendingEvents]) => {
    if (!$baseState) return null;

    if (!optimistic || $pendingEvents.length === 0) {
      return $baseState;
    }

    // Apply optimistic reducer to pending events
    return $pendingEvents.reduce((acc, { event }) => optimistic.reducer(acc, event), $baseState);
  });

  // Derived pending count
  const pendingCount = derived(pendingEvents, ($pending) => $pending.length);

  // Handle incoming snapshots
  const handleSnapshot = (remoteSnapshot: RemoteSnapshot<TSnapshot>) => {
    const { snapshot, serverSeq, echoClientSeq } = remoteSnapshot;

    // Ensure monotonic serverSeq
    if (serverSeq <= lastServerSeq) {
      return;
    }
    lastServerSeq = serverSeq;

    // Update base state
    baseState.set(snapshot);

    // If echoClientSeq is present, remove acknowledged events
    if (echoClientSeq !== undefined) {
      pendingEvents.update((pending) => pending.filter((e) => e.clientSeq > echoClientSeq));
    }

    // Update connection status if not already connected
    connected.update((c) => {
      const wasConnected = c;
      if (!wasConnected) {
        if (onConnectionChange) onConnectionChange(true);
        return true;
      }
      return c;
    });
  };

  // Initialize subscription
  unsubscribe = subscribeFn(handleSnapshot);

  // Send event with clientSeq tracking
  const send = (event: TEvent) => {
    const seq = ++clientSeqCounter;

    // Add to pending queue
    pendingEvents.update((pending) => [...pending, { event, clientSeq: seq }]);

    // Publish event
    publishEventFn(event, seq);
  };

  // Request snapshot
  const requestSnapshot = () => {
    requestSnapshotFn();
  };

  // Cleanup function (consumer should call this when component unmounts)
  const cleanup = () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  return {
    state,
    send,
    requestSnapshot,
    connected,
    pendingCount,
    cleanup,
  };
}
