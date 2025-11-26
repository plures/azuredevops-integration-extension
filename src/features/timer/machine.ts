import { setup } from 'xstate';
import type { TimerContext, TimerEvent } from './types';

export const timerMachine = setup({
  types: {
    context: {} as TimerContext,
    events: {} as TimerEvent,
  },
}).createMachine({
  id: 'timer',
  initial: 'idle',
  context: {
    isPaused: false,
    lastActivity: Date.now(),
    inactivityTimeoutSec: 300,
    defaultElapsedLimitHours: 3.5,
    pomodoroEnabled: false,
    pomodoroCount: 0,
  },
  states: {
    idle: {
      on: {
        START: 'running',
      },
    },
    running: {
      on: {
        PAUSE: 'paused',
        STOP: 'idle',
      },
    },
    paused: {
      on: {
        RESUME: 'running',
        STOP: 'idle',
      },
    },
  },
});
