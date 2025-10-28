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
    elapsedSeconds: 0,
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
          actions: assign(({ event, context }) => {
            if (event.type === 'START') {
              return {
                workItemId: event.workItemId,
                workItemTitle: event.workItemTitle,
                startTime: Date.now(),
                elapsedSeconds: 0,
                isPaused: false,
                lastActivity: Date.now(),
              };
            }
            return context;
          }),
        },
      },
    },

    running: {
      entry: [assign(() => ({ lastActivity: Date.now() }))],

      on: {
        TICK: {
          actions: assign(({ context }) => {
            if (!context.startTime || context.isPaused) return context;

            const elapsed = Math.floor((Date.now() - context.startTime) / 1000);
            const cappedElapsed = Math.min(elapsed, context.defaultElapsedLimitHours * 3600);

            return {
              elapsedSeconds: Math.max(0, cappedElapsed),
            };
          }),
        },

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
            elapsedSeconds: 0,
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
          actions: [
            assign(({ context }) => ({
              isPaused: false,
              startTime: context.startTime
                ? Date.now() - context.elapsedSeconds * 1000
                : Date.now(),
              lastActivity: Date.now(),
            })),
          ],
        },

        STOP: {
          target: 'idle',
          actions: assign(() => ({
            workItemId: undefined,
            workItemTitle: undefined,
            startTime: undefined,
            elapsedSeconds: 0,
            isPaused: false,
            pomodoroCount: 0,
          })),
        },

        ACTIVITY: [
          {
            target: 'running',
            guard: ({ context }) => context.isPaused && context.lastActivity > 0,
            actions: [
              assign(({ context }) => ({
                isPaused: false,
                startTime: context.startTime
                  ? Date.now() - context.elapsedSeconds * 1000
                  : Date.now(),
                lastActivity: Date.now(),
              })),
            ],
          },
          {
            actions: assign(() => ({ lastActivity: Date.now() })),
          },
        ],
      },
    },
  },
});
