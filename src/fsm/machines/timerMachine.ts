import { createMachine, assign } from 'xstate';
import { TimerContext, TimerEvent } from '../types';
import { FSM_CONFIG } from '../config';
import { createComponentLogger, FSMComponent } from '../logging/FSMLogger';

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
          guard: ({ context }) => !context.workItemId,
          actions: assign(({ event }) => ({
            workItemId: event.workItemId,
            workItemTitle: event.workItemTitle,
            startTime: Date.now(),
            isPaused: false,
            lastActivity: Date.now(),
          })),
        },
      },
    },

    running: {
      entry: assign(() => ({ lastActivity: Date.now() })),

      on: {
        PAUSE: {
          target: 'paused',
          actions: assign(() => ({ isPaused: true })),
        },

        STOP: {
          target: 'idle',
          actions: assign(() => ({
            workItemId: undefined,
            workItemTitle: undefined,
            startTime: undefined,
            isPaused: false,
            pomodoroCount: 0,
          })),
        },

        ACTIVITY: {
          actions: assign(() => ({ lastActivity: Date.now() })),
        },

        INACTIVITY_TIMEOUT: {
          target: 'paused',
          actions: [
            assign(() => ({ isPaused: true })),
            () => logger.info('Timer paused due to inactivity'),
          ],
        },
      },
    },

    paused: {
      on: {
        RESUME: {
          target: 'running',
          actions: assign(({ context }) => {
            // Adjust start time to account for paused duration
            const now = Date.now();
            const elapsed = context.startTime ? now - context.startTime : 0;
            return {
              isPaused: false,
              startTime: now - elapsed,
              lastActivity: now,
            };
          }),
        },

        STOP: {
          target: 'idle',
          actions: assign(() => ({
            workItemId: undefined,
            workItemTitle: undefined,
            startTime: undefined,
            isPaused: false,
            pomodoroCount: 0,
          })),
        },

        ACTIVITY: [
          {
            target: 'running',
            guard: ({ context }) => context.isPaused && context.lastActivity > 0,
            actions: assign(({ context }) => {
              const now = Date.now();
              const elapsed = context.startTime ? now - context.startTime : 0;
              return {
                isPaused: false,
                startTime: now - elapsed,
                lastActivity: now,
              };
            }),
          },
          {
            actions: assign(() => ({ lastActivity: Date.now() })),
          },
        ],
      },
    },
  },
});
