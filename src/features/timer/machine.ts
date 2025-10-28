/**
 * Timer State Machine
 *
 * Handles timer state transitions and context management.
 * Extracted from the main FSM for better organization.
 */

import { createMachine, assign } from 'xstate';
import { TimerContext, TimerEvent } from './types';
import { FSM_CONFIG } from '../../fsm/config';
import { createComponentLogger, FSMComponent } from '../../fsm/logging/FSMLogger';

// Create logger for timer machine
const logger = createComponentLogger(FSMComponent.MACHINE, 'timerMachine');

// Create the timer state machine using XState v5 syntax
export const timerMachine = createMachine({
  id: 'timer',
  initial: 'idle',

  types: {} as {
    context: TimerContext;
    events: TimerEvent;
  },

  context: {
    workItemId: undefined,
    workItemTitle: undefined,
    startTime: undefined,
    isPaused: false,
    lastActivity: Date.now(),
    inactivityTimeoutSec: FSM_CONFIG.timer.inactivityTimeoutSec,
    defaultElapsedLimitHours: FSM_CONFIG.timer.defaultElapsedLimitHours,
    pomodoroEnabled: false,
    pomodoroCount: 0,
  },

  states: {
    idle: {
      on: {
        START: {
          target: 'running',
          actions: [
            assign(({ event }) => ({
              workItemId: event.workItemId,
              workItemTitle: event.workItemTitle,
              startTime: Date.now(),
              isPaused: false,
              lastActivity: Date.now(),
            })),
          ],
        },
        RESTORE: [
          {
            target: 'paused',
            guard: ({ event }) => event.type === 'RESTORE' && event.isPaused,
            actions: [
              assign(({ event }) => ({
                workItemId: event.workItemId,
                workItemTitle: event.workItemTitle,
                startTime: event.startTime,
                isPaused: event.isPaused,
                lastActivity: Date.now(),
              })),
            ],
          },
          {
            target: 'running',
            actions: [
              assign(({ event }) => ({
                workItemId: event.workItemId,
                workItemTitle: event.workItemTitle,
                startTime: event.startTime,
                isPaused: event.isPaused,
                lastActivity: Date.now(),
              })),
            ],
          },
        ],
      },
    },

    running: {
      entry: [assign(() => ({ lastActivity: Date.now() }))],

      on: {
        PAUSE: {
          target: 'paused',
          actions: [assign(() => ({ isPaused: true, pausedAt: Date.now() }))],
        },

        STOP: {
          target: 'idle',
          actions: [
            assign(() => ({
              workItemId: undefined,
              workItemTitle: undefined,
              startTime: undefined,
              pausedAt: undefined,
              isPaused: false,
              pomodoroCount: 0,
            })),
          ],
        },

        ACTIVITY: {
          actions: [assign(() => ({ lastActivity: Date.now() }))],
        },

        INACTIVITY_TIMEOUT: {
          target: 'paused',
          actions: [
            assign(() => ({ isPaused: true, pausedAt: Date.now() })),
            () => logger.info('Timer paused due to inactivity'),
          ],
        },
      },
    },

    paused: {
      entry: [],
      on: {
        RESUME: {
          target: 'running',
          actions: [
            assign(({ context }) => {
              const now = Date.now();
              // Calculate pause duration and adjust startTime forward to exclude it
              const pauseDuration = context.pausedAt ? now - context.pausedAt : 0;
              const adjustedStartTime = context.startTime ? context.startTime + pauseDuration : now;
              return {
                isPaused: false,
                startTime: adjustedStartTime,
                pausedAt: undefined,
                lastActivity: now,
              };
            }),
          ],
        },

        STOP: {
          target: 'idle',
          actions: [
            assign(() => ({
              workItemId: undefined,
              workItemTitle: undefined,
              startTime: undefined,
              pausedAt: undefined,
              isPaused: false,
              pomodoroCount: 0,
            })),
          ],
        },

        ACTIVITY: [
          {
            target: 'running',
            guard: ({ context }) => context.isPaused && context.lastActivity > 0,
            actions: [
              assign(({ context }) => {
                const now = Date.now();
                // Calculate pause duration and adjust startTime forward to exclude it
                const pauseDuration = context.pausedAt ? now - context.pausedAt : 0;
                const adjustedStartTime = context.startTime ? context.startTime + pauseDuration : now;
                return {
                  isPaused: false,
                  startTime: adjustedStartTime,
                  pausedAt: undefined,
                  lastActivity: now,
                };
              }),
            ],
          },
          {
            actions: [assign(() => ({ lastActivity: Date.now() }))],
          },
        ],
      },
    },
  },
});
