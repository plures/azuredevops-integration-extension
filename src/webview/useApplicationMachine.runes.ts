/**
 * Module: src/webview/useApplicationMachine.runes.ts
 * Owner: webview
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
/**
 * Svelte 5 Rune-First Wrapper for Application Machine
 *
 * Provides a convenient way to connect to the application machine from webview components.
 * Uses the rune-first helpers and VS Code PubSub adapter per migration instructions.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useApplicationMachine } from './useApplicationMachine.runes';
 *
 *   const { state, send, connected } = useApplicationMachine();
 *
 *   $effect(() => {
 *     console.log('Machine state:', $state(state));
 *   });
 * </script>
 *
 * <button onclick={() => send({ type: 'REFRESH_DATA' })}>
 *   {$state(state)?.context?.ui?.buttons?.refreshData?.label || 'Refresh'}
 * </button>
 * ```
 */

import type { ApplicationContext, ApplicationEvent } from '../fsm/machines/applicationMachine';
import type {
  RemoteMachineRuneAPI,
  RemoteSnapshot,
} from '../fsm/xstate-svelte/src/useRemoteMachine.runes';
import { useRemoteMachineRunes } from '../fsm/xstate-svelte/src/useRemoteMachine.runes';
import { getVSCodePubSubAdapter } from './vscode-pubsub-adapter';

/**
 * Svelte 5 rune factories (imported from runtime)
 * These must be provided by the consumer based on their Svelte runtime.
 */
interface SvelteRunes {
  state: <T>(initial: T) => { current: T };
  derived?: <T>(compute: () => T) => { current: T };
  effect?: (fn: () => void | (() => void)) => void;
}

/**
 * Application machine snapshot structure
 */
export interface ApplicationSnapshot {
  value: string | object;
  context: ApplicationContext;
  matches?: Record<string, boolean>;
}

/**
 * Options for useApplicationMachine
 */
export interface UseApplicationMachineOptions {
  /**
   * Machine ID (defaults to 'application')
   */
  machineId?: string;
  /**
   * Optional optimistic reducer for local-first updates
   */
  optimistic?: {
    reducer: (snapshot: ApplicationSnapshot, event: ApplicationEvent) => ApplicationSnapshot;
  };
  /**
   * Callback when connection status changes
   */
  onConnectionChange?: (connected: boolean) => void;
}

/**
 * Use the application machine with Svelte 5 runes.
 *
 * This is a convenience wrapper that:
 * 1. Connects to the VS Code PubSub adapter
 * 2. Subscribes to the application machine snapshot topic
 * 3. Publishes events to the application machine
 * 4. Provides rune-native state management
 * 5. Supports optional optimistic updates
 *
 * @param runes - Svelte 5 rune factories (state, derived?, effect?)
 * @param options - Configuration options
 * @returns API with rune-native state, send, requestSnapshot, connected, pendingCount
 */
export function useApplicationMachine(
  runes: SvelteRunes,
  options: UseApplicationMachineOptions = {}
): RemoteMachineRuneAPI<ApplicationSnapshot, ApplicationEvent> {
  const { machineId = 'application', optimistic, onConnectionChange } = options;

  // Get VS Code PubSub adapter
  const pubsub = getVSCodePubSubAdapter();

  // Topic names per migration instructions
  const snapshotTopic = `machine:${machineId}:snapshot`;
  const eventsTopic = `machine:${machineId}:events`;
  const requestTopic = `machine:${machineId}:request-snapshot`;

  // Create subscribe function for snapshots
  const subscribeFn = (onSnapshot: (snapshot: RemoteSnapshot<ApplicationSnapshot>) => void) => {
    return pubsub.subscribe<RemoteSnapshot<ApplicationSnapshot>>(snapshotTopic, onSnapshot);
  };

  // Create publish function for events (with subseq)
  const publishEventFn = (event: ApplicationEvent, subseq: number) => {
    const payload = { event, subseq };
    pubsub.publish(eventsTopic, payload);
  };

  // Create request snapshot function
  const requestSnapshotFn = () => {
    pubsub.publish(requestTopic, { timestamp: Date.now() });
  };

  // Use the rune-first helper
  return useRemoteMachineRunes<ApplicationSnapshot, ApplicationEvent>(
    subscribeFn,
    publishEventFn,
    requestSnapshotFn,
    runes,
    {
      optimistic,
      onConnectionChange,
    }
  );
}

/**
 * Default optimistic reducer for common UI interactions.
 *
 * Implements optimistic updates for:
 * - Button loading states
 * - View mode toggles
 * - Status messages
 *
 * Keeps optimistic logic small and UI-only (per migration instructions).
 *
 * @param snapshot - Current authoritative snapshot
 * @param event - Event being optimistically applied
 * @returns New snapshot with optimistic changes
 */
export function createOptimisticReducer() {
  return (snapshot: ApplicationSnapshot, event: ApplicationEvent): ApplicationSnapshot => {
    const ctx = { ...snapshot.context };

    // Initialize UI state if not present
    if (!ctx.ui) {
      ctx.ui = {};
    }

    switch (event.type) {
      case 'REFRESH_DATA': {
        // Optimistically show loading state
        return {
          ...snapshot,
          context: {
            ...ctx,
            ui: {
              ...ctx.ui,
              buttons: {
                ...ctx.ui.buttons,
                refreshData: {
                  label: ctx.ui.buttons?.refreshData?.label || 'Refresh',
                  loading: true,
                  disabled: true,
                },
              },
              loading: {
                ...ctx.ui.loading,
                workItems: true,
              },
            },
          },
        };
      }

      case 'TOGGLE_VIEW': {
        // Optimistically toggle view mode
        const newViewMode = ctx.viewMode === 'list' ? 'kanban' : 'list';
        return {
          ...snapshot,
          context: {
            ...ctx,
            viewMode: newViewMode,
            ui: {
              ...ctx.ui,
              buttons: {
                ...ctx.ui.buttons,
                toggleView: {
                  label: newViewMode === 'list' ? 'Kanban' : 'List',
                  icon: newViewMode === 'list' ? 'kanban' : 'list',
                },
              },
            },
          },
        };
      }

      default:
        // No optimistic changes for this event
        return snapshot;
    }
  };
}

/**
 * Helper to extract nested state value from rune.
 * Useful in components to safely access rune current value.
 *
 * @param runeState - Rune state object
 * @returns Current value or null
 */
export function extractRuneState<T>(runeState: { current: T | null } | null): T | null {
  return runeState?.current ?? null;
}

/**
 * Helper to check if machine matches a state pattern.
 *
 * @param snapshot - Current snapshot
 * @param pattern - State pattern to match (e.g., 'active.ready')
 * @returns True if matches
 */
export function matchesState(snapshot: ApplicationSnapshot | null, pattern: string): boolean {
  if (!snapshot) return false;

  // Check pre-computed matches first
  if (snapshot.matches && typeof snapshot.matches[pattern] !== 'undefined') {
    return snapshot.matches[pattern];
  }

  // Fallback to string matching for nested states
  const value =
    typeof snapshot.value === 'string' ? snapshot.value : JSON.stringify(snapshot.value);
  return value.includes(pattern);
}
