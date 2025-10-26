/**
 * Options for useRemoteMachineRunes
 */
export interface UseRemoteMachineRunesOptions<TSnapshot, TEvent> {
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
 * Internal event with subseq (subscriber sequence) tracking
 */
interface TrackedEvent<TEvent> {
  event: TEvent;
  subseq: number;
}

/**
 * Snapshot with pubseq (publisher sequence) and optional echoSubseq
 * Matches migration instructions terminology.
 */
export interface RemoteSnapshot<TSnapshot> {
  snapshot: TSnapshot;
  pubseq: number;
  echoSubseq?: number;
}

/**
 * Rune utilities expected from consumer
 */
export interface RuneUtils {
  /**
   * Create a reactive state rune
   */
  state: <T>(initialValue: T) => { current: T };
  /**
   * Create a derived/computed rune (optional)
   */
  derived?: <T>(compute: () => T) => { current: T };
  /**
   * Create an effect rune (optional)
   */
  effect?: (fn: () => void | (() => void)) => void;
}

/**
 * Remote machine API returned by useRemoteMachineRunes (rune-native)
 */
export interface RemoteMachineRuneAPI<TSnapshot, TEvent> {
  /**
   * Current machine snapshot (reactive rune)
   */
  state: { current: TSnapshot | null };
  /**
   * Send an event to the remote machine
   */
  send: (event: TEvent) => void;
  /**
   * Request a fresh snapshot from the server
   */
  requestSnapshot: () => void;
  /**
   * Connection status (reactive rune)
   */
  connected: { current: boolean };
  /**
   * Number of pending (unacknowledged) events (reactive rune)
   */
  pendingCount: { current: number };
}

/**
 * Svelte 5 rune-first implementation of useRemoteMachine.
 *
 * Expects consumer-provided runes (state, derived?, effect?) and exposes native rune API.
 * Manages synchronization with a remote machine via snapshot updates and event sending.
 * Supports optional optimistic updates with subseq/pubseq reconciliation (per migration instructions).
 *
 * Terminology (from migration instructions):
 * - subseq: subscriber sequence (webview-generated, monotonic per outgoing event)
 * - pubseq: publisher sequence (host/broker-generated, monotonic per snapshot)
 * - echoSubseq: included in snapshot to acknowledge consumed subseq(s)
 *
 * @param subscribeFn - Function to subscribe to snapshot updates, returns unsubscribe function
 * @param publishEventFn - Function to publish events to the remote machine with subseq
 * @param requestSnapshotFn - Function to request a snapshot from the remote machine
 * @param runes - Rune utilities from Svelte 5 (state, derived?, effect?)
 * @param options - Configuration options
 * @returns API with rune-native state, send, requestSnapshot, connected, and pendingCount
 */
export function useRemoteMachineRunes<TSnapshot, TEvent>(
  subscribeFn: (onSnapshot: (snapshot: RemoteSnapshot<TSnapshot>) => void) => () => void,
  publishEventFn: (event: TEvent, subseq: number) => void,
  requestSnapshotFn: () => void,
  runes: RuneUtils,
  options: UseRemoteMachineRunesOptions<TSnapshot, TEvent> = {}
): RemoteMachineRuneAPI<TSnapshot, TEvent> {
  const { optimistic, initialSnapshot, onConnectionChange } = options;

  // Create reactive rune states
  const baseStateRune = runes.state<TSnapshot | null>(initialSnapshot ?? null);
  const connectedRune = runes.state<boolean>(false);
  const pendingEventsRune = runes.state<TrackedEvent<TEvent>[]>([]);

  let subseqCounter = 0;
  let lastPubseq = -1;
  let unsubscribe: (() => void) | null = null;

  // Derived state with optimistic updates
  const stateRune = runes.derived
    ? runes.derived<TSnapshot | null>(() => {
        const base = baseStateRune.current;
        const pending = pendingEventsRune.current;

        if (!base) return null;

        if (!optimistic || pending.length === 0) {
          return base;
        }

        // Apply optimistic reducer to pending events
        return pending.reduce((acc, { event }) => optimistic.reducer(acc, event), base);
      })
    : baseStateRune; // Fallback to baseState if no derived available

  // Derived pending count
  const pendingCountRune = runes.derived
    ? runes.derived<number>(() => pendingEventsRune.current.length)
    : runes.state<number>(0);

  // Update pendingCount if not using derived
  if (!runes.derived) {
    // Manual update when pendingEvents changes (requires external tracking)
    // This is a limitation when derived is not available
  }

  // Handle incoming snapshots (with pubseq/echoSubseq reconciliation)
  const handleSnapshot = (remoteSnapshot: RemoteSnapshot<TSnapshot>) => {
    const { snapshot, pubseq, echoSubseq } = remoteSnapshot;

    // Ensure monotonic pubseq (prevent stale snapshots)
    if (pubseq <= lastPubseq) {
      console.warn(
        `[useRemoteMachineRunes] Ignoring stale snapshot. pubseq ${pubseq} <= lastPubseq ${lastPubseq}`
      );
      return;
    }
    lastPubseq = pubseq;

    // Update base state with authoritative snapshot
    baseStateRune.current = snapshot;

    // If echoSubseq is present, remove acknowledged events (≤ echoSubseq)
    if (echoSubseq !== undefined) {
      pendingEventsRune.current = pendingEventsRune.current.filter((e) => e.subseq > echoSubseq);

      // Update manual pending count if not using derived
      if (!runes.derived) {
        (pendingCountRune as { current: number }).current = pendingEventsRune.current.length;
      }
    }

    // Update connection status if not already connected
    if (!connectedRune.current) {
      connectedRune.current = true;
      if (onConnectionChange) onConnectionChange(true);
    }
  };

  // Initialize subscription
  unsubscribe = subscribeFn(handleSnapshot);

  // Setup cleanup effect if available
  if (runes.effect) {
    runes.effect(() => {
      // Cleanup function
      return () => {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      };
    });
  }

  // Send event with subseq tracking (monotonic subscriber sequence)
  const send = (event: TEvent) => {
    const seq = ++subseqCounter;

    // Add to pending queue
    pendingEventsRune.current = [...pendingEventsRune.current, { event, subseq: seq }];

    // Update manual pending count if not using derived
    if (!runes.derived) {
      (pendingCountRune as { current: number }).current = pendingEventsRune.current.length;
    }

    // Publish event with subseq
    publishEventFn(event, seq);
  };

  // Request snapshot
  const requestSnapshot = () => {
    requestSnapshotFn();
  };

  return {
    state: stateRune,
    send,
    requestSnapshot,
    connected: connectedRune,
    pendingCount: pendingCountRune,
  };
}
