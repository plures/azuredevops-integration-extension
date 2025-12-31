/**
 * Work Item Timer Feature
 *
 * Event-sourced timer logic for tracking time on work items.
 * Follows the "Granular & Event-Sourced" architectural principle.
 */

import { defineFact, defineEvent, defineRule, findEvent } from '@plures/praxis';
import type { ApplicationEngineContext } from '../engine.js';
import { ActivateEvent } from '../facts.js';

// ============================================================================
// Types
// ============================================================================

export type TimerActionType = 'start' | 'pause' | 'stop';

export interface TimerEntry {
  timestamp: number; // UTC Seconds
  type: TimerActionType;
  workItemId: number;
}

export interface TimerStatus {
  isRunning: boolean;
  activeWorkItemId?: number;
  currentStartTimestamp?: number;
  accumulatedDuration: number;
}

// ============================================================================
// Facts (State)
// ============================================================================

/**
 * The history of all timer actions.
 * This is the source of truth for the timer feature.
 */
export const TimerHistoryFact = defineFact<'TimerHistory', { entries: TimerEntry[] }>(
  'TimerHistory'
);

// ============================================================================
// Events (Triggers)
// ============================================================================

/**
 * Start the timer for a specific work item.
 */
export const StartTimerEvent = defineEvent<'StartTimer', { workItemId: number; timestamp: number }>(
  'StartTimer'
);

/**
 * Pause the currently running timer.
 */
export const PauseTimerEvent = defineEvent<'PauseTimer', { workItemId: number; timestamp: number }>(
  'PauseTimer'
);

/**
 * Stop the timer (finish working).
 */
export const StopTimerEvent = defineEvent<'StopTimer', { workItemId: number; timestamp: number }>(
  'StopTimer'
);

/**
 * Request to load timer history from persistence.
 * Emitted by the logic engine when it needs the data.
 */
export const RequestTimerHistoryEvent = defineEvent<'RequestTimerHistory', void>(
  'RequestTimerHistory'
);

/**
 * Timer history loaded from persistence.
 * Emitted by the persistence actor in response to RequestTimerHistoryEvent.
 */
export const TimerHistoryLoadedEvent = defineEvent<'TimerHistoryLoaded', { entries: TimerEntry[] }>(
  'TimerHistoryLoaded'
);

/**
 * Request to save timer history to persistence.
 * Emitted by the logic engine when state changes.
 */
export const PersistTimerHistoryEvent = defineEvent<
  'PersistTimerHistory',
  { entries: TimerEntry[] }
>('PersistTimerHistory');

/**
 * Update the timer status display (UI/Status Bar).
 * Emitted whenever the timer state changes.
 */
export const UpdateTimerStatusEvent = defineEvent<'UpdateTimerStatus', TimerStatus>(
  'UpdateTimerStatus'
);

// ============================================================================
// Helpers
// ============================================================================

/**
 * Calculate the current status of the timer from history.
 */
function calculateTimerStatus(entries: TimerEntry[]): TimerStatus {
  let accumulatedDuration = 0;
  let currentStartTimestamp: number | undefined;
  let activeWorkItemId: number | undefined;
  let isRunning = false;

  // Sort by timestamp just in case
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    if (entry.type === 'start') {
      currentStartTimestamp = entry.timestamp;
      activeWorkItemId = entry.workItemId;
      isRunning = true;
    } else if (entry.type === 'pause' || entry.type === 'stop') {
      if (currentStartTimestamp !== undefined) {
        accumulatedDuration += entry.timestamp - currentStartTimestamp;
        currentStartTimestamp = undefined;
      }
      isRunning = false;
      if (entry.type === 'stop') {
        activeWorkItemId = undefined;
      }
    }
  }

  return {
    isRunning,
    activeWorkItemId,
    currentStartTimestamp,
    accumulatedDuration,
  };
}

// ============================================================================
// Rules (Logic)
// ============================================================================

/**
 * Initialize Timer Rule
 * When the application activates, request the timer history.
 */
export const InitializeTimerRule = defineRule<ApplicationEngineContext>({
  id: 'timer.initialize',
  description: 'Request timer history on activation',
  meta: {
    triggers: ['ACTIVATE'],
  },
  impl: (_state, events) => {
    if (findEvent(events, ActivateEvent)) {
      return [RequestTimerHistoryEvent.create()];
    }
    return [];
  },
});

/**
 * Timer History Loaded Rule
 * When history is loaded, update the state and notify UI.
 */
export const TimerHistoryLoadedRule = defineRule<ApplicationEngineContext>({
  id: 'timer.loaded',
  description: 'Update state with loaded history',
  meta: {
    triggers: ['TimerHistoryLoaded'],
  },
  impl: (state, events) => {
    const event = findEvent(events, TimerHistoryLoadedEvent);
    if (!event) return [];

    state.context.timerHistory.entries = event.payload.entries;

    // Notify UI of initial state
    const status = calculateTimerStatus(state.context.timerHistory.entries);
    return [UpdateTimerStatusEvent.create(status)];
  },
});

/**
 * Start Timer Rule
 * Appends a 'start' entry if the timer is not already running for this work item.
 */
export const StartTimerRule = defineRule<ApplicationEngineContext>({
  id: 'timer.start',
  description: 'Start the timer for a work item',
  meta: {
    triggers: ['StartTimer'],
  },
  impl: (state, events) => {
    const event = findEvent(events, StartTimerEvent);
    if (!event) return [];

    const { workItemId, timestamp } = event.payload;
    
    // Validation: Work item must exist in loaded work items
    const workItemExists = state.context.workItems.some(wi => wi.id === workItemId);
    if (!workItemExists) {
      // Do not start timer for invalid/non-existent work item
      return [];
    }
    
    const history = state.context.timerHistory.entries;
    const lastEntry = history[history.length - 1];

    // Validation: Can only start if stopped or paused (or empty)
    if (lastEntry && lastEntry.type === 'start') {
      return [];
    }

    const newEntry: TimerEntry = {
      type: 'start',
      timestamp,
      workItemId,
    };

    state.context.timerHistory.entries.push(newEntry);

    // Side Effects: Persist and Update UI
    const status = calculateTimerStatus(state.context.timerHistory.entries);
    return [
      PersistTimerHistoryEvent.create({ entries: state.context.timerHistory.entries }),
      UpdateTimerStatusEvent.create(status),
    ];
  },
});

/**
 * Pause Timer Rule
 * Appends a 'pause' entry if the timer is currently running.
 */
export const PauseTimerRule = defineRule<ApplicationEngineContext>({
  id: 'timer.pause',
  description: 'Pause the timer',
  meta: {
    triggers: ['PauseTimer'],
  },
  impl: (state, events) => {
    const event = findEvent(events, PauseTimerEvent);
    if (!event) return [];

    const { workItemId, timestamp } = event.payload;
    const history = state.context.timerHistory.entries;
    const lastEntry = history[history.length - 1];

    // Validation: Can only pause if currently running
    if (!lastEntry || lastEntry.type !== 'start') {
      return [];
    }

    const newEntry: TimerEntry = {
      type: 'pause',
      timestamp,
      workItemId,
    };

    state.context.timerHistory.entries.push(newEntry);

    // Side Effects: Persist and Update UI
    const status = calculateTimerStatus(state.context.timerHistory.entries);
    return [
      PersistTimerHistoryEvent.create({ entries: state.context.timerHistory.entries }),
      UpdateTimerStatusEvent.create(status),
    ];
  },
});

/**
 * Stop Timer Rule
 * Appends a 'stop' entry if the timer is running or paused.
 */
export const StopTimerRule = defineRule<ApplicationEngineContext>({
  id: 'timer.stop',
  description: 'Stop the timer',
  meta: {
    triggers: ['StopTimer'],
  },
  impl: (state, events) => {
    const event = findEvent(events, StopTimerEvent);
    if (!event) return [];

    const { workItemId, timestamp } = event.payload;
    const history = state.context.timerHistory.entries;
    const lastEntry = history[history.length - 1];

    // Validation: Can stop if running or paused
    if (!lastEntry || lastEntry.type === 'stop') {
      return [];
    }

    const newEntry: TimerEntry = {
      type: 'stop',
      timestamp,
      workItemId,
    };

    state.context.timerHistory.entries.push(newEntry);

    // Side Effects: Persist and Update UI
    const status = calculateTimerStatus(state.context.timerHistory.entries);
    return [
      PersistTimerHistoryEvent.create({ entries: state.context.timerHistory.entries }),
      UpdateTimerStatusEvent.create(status),
    ];
  },
});

export const timerRules = [
  InitializeTimerRule,
  TimerHistoryLoadedRule,
  StartTimerRule,
  PauseTimerRule,
  StopTimerRule,
];
