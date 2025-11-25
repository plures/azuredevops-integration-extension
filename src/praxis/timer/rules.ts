/**
 * Praxis Timer Rules
 *
 * Defines the rules for timer state transitions using the Praxis logic engine.
 * These rules update the timer context directly based on events.
 */

import { defineRule, findEvent, type RuleDescriptor } from '@plures/praxis';
import type { PraxisTimerContext } from './types.js';
import { DEFAULT_TIMER_CONFIG } from './types.js';
import {
  StartTimerEvent,
  PauseTimerEvent,
  ResumeTimerEvent,
  StopTimerEvent,
  ActivityPingEvent,
  InactivityTimeoutEvent,
  RestoreTimerEvent,
} from './facts.js';
import type { TimerEngineContext } from './engine.js';

/**
 * Calculate the adjusted start time after resuming from pause.
 * This adjusts for the pause duration so elapsed time is accurate.
 */
function calculateAdjustedStartTime(timerData: PraxisTimerContext, now: number): number {
  const pauseDuration = timerData.pausedAt && timerData.startTime ? now - timerData.pausedAt : 0;
  return timerData.startTime ? timerData.startTime + pauseDuration : now;
}

export const startTimerRule: RuleDescriptor<TimerEngineContext> = defineRule({
  id: 'timer.start',
  description: 'Start a timer for a work item',
  impl: (state, events) => {
    const startEvent = findEvent(events, StartTimerEvent);
    if (!startEvent) return [];
    if (state.context.timerState !== 'idle') return [];

    const now = Date.now();
    state.context.timerState = 'running';
    state.context.timerData = {
      ...state.context.timerData,
      workItemId: startEvent.payload.workItemId,
      workItemTitle: startEvent.payload.workItemTitle,
      startTime: now,
      pausedAt: undefined,
      isPaused: false,
      lastActivity: now,
    };
    return [];
  },
});

export const pauseTimerRule: RuleDescriptor<TimerEngineContext> = defineRule({
  id: 'timer.pause',
  description: 'Pause the running timer',
  impl: (state, events) => {
    const pauseEvent = findEvent(events, PauseTimerEvent);
    if (!pauseEvent) return [];
    if (state.context.timerState !== 'running') return [];

    const now = Date.now();
    state.context.timerState = 'paused';
    state.context.timerData = {
      ...state.context.timerData,
      isPaused: true,
      pausedAt: now,
    };
    return [];
  },
});

export const resumeTimerRule: RuleDescriptor<TimerEngineContext> = defineRule({
  id: 'timer.resume',
  description: 'Resume a paused timer',
  impl: (state, events) => {
    const resumeEvent = findEvent(events, ResumeTimerEvent);
    if (!resumeEvent) return [];
    if (state.context.timerState !== 'paused') return [];

    const now = Date.now();
    const timerData = state.context.timerData;
    const adjustedStartTime = calculateAdjustedStartTime(timerData, now);

    state.context.timerState = 'running';
    state.context.timerData = {
      ...timerData,
      isPaused: false,
      startTime: adjustedStartTime,
      pausedAt: undefined,
      lastActivity: now,
    };
    return [];
  },
});

export const stopTimerRule: RuleDescriptor<TimerEngineContext> = defineRule({
  id: 'timer.stop',
  description: 'Stop the timer',
  impl: (state, events) => {
    const stopEvent = findEvent(events, StopTimerEvent);
    if (!stopEvent) return [];
    if (state.context.timerState === 'idle') return [];

    state.context.timerState = 'idle';
    state.context.timerData = {
      isPaused: false,
      lastActivity: Date.now(),
      ...DEFAULT_TIMER_CONFIG,
    };
    return [];
  },
});

export const activityPingRule: RuleDescriptor<TimerEngineContext> = defineRule({
  id: 'timer.activity',
  description: 'Record user activity',
  impl: (state, events) => {
    const activityEvent = findEvent(events, ActivityPingEvent);
    if (!activityEvent) return [];

    const timerState = state.context.timerState;
    const now = Date.now();
    const timerData = state.context.timerData;

    // If paused, resume the timer
    if (timerState === 'paused') {
      const adjustedStartTime = calculateAdjustedStartTime(timerData, now);

      state.context.timerState = 'running';
      state.context.timerData = {
        ...timerData,
        isPaused: false,
        startTime: adjustedStartTime,
        pausedAt: undefined,
        lastActivity: now,
      };
      return [];
    }

    // If running, just update last activity
    if (timerState === 'running') {
      state.context.timerData = {
        ...timerData,
        lastActivity: now,
      };
    }

    return [];
  },
});

export const inactivityTimeoutRule: RuleDescriptor<TimerEngineContext> = defineRule({
  id: 'timer.inactivity',
  description: 'Pause timer due to inactivity',
  impl: (state, events) => {
    const timeoutEvent = findEvent(events, InactivityTimeoutEvent);
    if (!timeoutEvent) return [];
    if (state.context.timerState !== 'running') return [];

    const now = Date.now();
    state.context.timerState = 'paused';
    state.context.timerData = {
      ...state.context.timerData,
      isPaused: true,
      pausedAt: now,
    };
    return [];
  },
});

export const restoreTimerRule: RuleDescriptor<TimerEngineContext> = defineRule({
  id: 'timer.restore',
  description: 'Restore timer from persisted state',
  impl: (state, events) => {
    const restoreEvent = findEvent(events, RestoreTimerEvent);
    if (!restoreEvent) return [];
    if (state.context.timerState !== 'idle') return [];

    const now = Date.now();
    const { workItemId, workItemTitle, startTime, isPaused } = restoreEvent.payload;

    state.context.timerState = isPaused ? 'paused' : 'running';
    state.context.timerData = {
      ...state.context.timerData,
      workItemId,
      workItemTitle,
      startTime,
      isPaused,
      pausedAt: isPaused ? now : undefined,
      lastActivity: now,
    };
    return [];
  },
});
