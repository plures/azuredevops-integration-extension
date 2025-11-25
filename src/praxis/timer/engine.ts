/**
 * Praxis Timer Engine
 *
 * Creates and configures the Praxis logic engine for timer functionality.
 * This is the main entry point for the Praxis-based timer implementation.
 */

import { createPraxisEngine, PraxisRegistry, type LogicEngine } from '@plures/praxis';
import type {
  PraxisTimerContext,
  PraxisTimerState,
  PraxisTimerSnapshot,
  PraxisTimerStopResult,
} from './types.js';
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
import {
  startTimerRule,
  pauseTimerRule,
  resumeTimerRule,
  stopTimerRule,
  activityPingRule,
  inactivityTimeoutRule,
  restoreTimerRule,
} from './rules.js';

/**
 * Timer engine context - uses context for state management (not facts)
 */
export interface TimerEngineContext {
  timerState: PraxisTimerState;
  timerData: PraxisTimerContext;
}

/**
 * Create a new Praxis timer engine
 */
export function createTimerEngine(
  initialConfig?: Partial<PraxisTimerContext>
): LogicEngine<TimerEngineContext> {
  const registry = new PraxisRegistry<TimerEngineContext>();

  // Register all timer rules
  registry.registerRule(startTimerRule);
  registry.registerRule(pauseTimerRule);
  registry.registerRule(resumeTimerRule);
  registry.registerRule(stopTimerRule);
  registry.registerRule(activityPingRule);
  registry.registerRule(inactivityTimeoutRule);
  registry.registerRule(restoreTimerRule);

  return createPraxisEngine<TimerEngineContext>({
    initialContext: {
      timerState: 'idle',
      timerData: {
        isPaused: false,
        lastActivity: Date.now(),
        ...DEFAULT_TIMER_CONFIG,
        ...initialConfig,
      },
    },
    registry,
    initialFacts: [],
  });
}
