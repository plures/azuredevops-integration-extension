/**
 * Module: src/fsm/machines/timerMachine.ts
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
import { createMachine, assign } from 'xstate';
import { TimerContext, TimerEvent } from '../types';
import { FSM_CONFIG } from '../config';
import { createComponentLogger, FSMComponent } from '../logging/FSMLogger';
import { TimerStates } from './timerMachine.states.js';

// Create logger for timer machine
const logger = createComponentLogger(FSMComponent.MACHINE, 'timerMachine');

// Create the timer state machine using XState v5 syntax
export const timerMachine = createMachine({
  id: 'timer',
  initial: TimerStates.IDLE,

  types: {} as {
    context: TimerContext;
    events: TimerEvent;
  },

  context: {
    workItemId: undefined,
    workItemTitle: undefined,
    startTime: undefined,
    pausedAt: undefined,
    isPaused: false,
    lastActivity: Date.now(),
    inactivityTimeoutSec: FSM_CONFIG.timer.inactivityTimeoutSec,
    defaultElapsedLimitHours: FSM_CONFIG.timer.defaultElapsedLimitHours,
    pomodoroEnabled: false,
    pomodoroCount: 0,
  },

  states: {
    [TimerStates.IDLE]: {
      on: {
        START: {
          target: TimerStates.RUNNING,
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
            target: TimerStates.PAUSED,
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
            target: TimerStates.RUNNING,
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

    [TimerStates.RUNNING]: {
      entry: [assign(() => ({ lastActivity: Date.now() }))],

      on: {
        PAUSE: {
          target: TimerStates.PAUSED,
          actions: [
            assign(() => ({
              isPaused: true,
              pausedAt: Date.now(),
            })),
          ],
        },

        STOP: {
          target: TimerStates.IDLE,
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
          target: TimerStates.PAUSED,
          actions: [
            assign(() => ({
              isPaused: true,
              pausedAt: Date.now(),
            })),
            () => logger.info('Timer paused due to inactivity'),
          ],
        },
      },
    },

    [TimerStates.PAUSED]: {
      entry: [],
      on: {
        RESUME: {
          target: TimerStates.RUNNING,
          actions: [
            assign(({ context }) => {
              const now = Date.now();
              const pauseDuration =
                context.pausedAt && context.startTime ? now - context.pausedAt : 0;
              return {
                isPaused: false,
                startTime: context.startTime ? context.startTime + pauseDuration : now,
                pausedAt: undefined,
                lastActivity: now,
              };
            }),
          ],
        },

        STOP: {
          target: TimerStates.IDLE,
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
            target: TimerStates.RUNNING,
            guard: ({ context }) => context.isPaused && context.lastActivity > 0,
            actions: [
              assign(({ context }) => {
                const now = Date.now();
                const pauseDuration =
                  context.pausedAt && context.startTime ? now - context.pausedAt : 0;
                return {
                  isPaused: false,
                  startTime: context.startTime ? context.startTime + pauseDuration : now,
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
