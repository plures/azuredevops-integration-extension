/**
 * Praxis Timer Manager
 *
 * High-level API for timer operations using the Praxis logic engine.
 * This class provides a simple API that mirrors the existing FSMManager
 * for easy migration from XState.
 */

import type { LogicEngine } from '@plures/praxis';
import type {
  PraxisTimerContext,
  PraxisTimerState,
  PraxisTimerSnapshot,
  PraxisTimerStopResult,
} from './types.js';
import {
  StartTimerEvent,
  PauseTimerEvent,
  ResumeTimerEvent,
  StopTimerEvent,
  ActivityPingEvent,
  InactivityTimeoutEvent,
  RestoreTimerEvent,
} from './facts.js';
import { createTimerEngine, type TimerEngineContext } from './engine.js';

/**
 * PraxisTimerManager - High-level API for timer operations
 */
export class PraxisTimerManager {
  private engine: LogicEngine<TimerEngineContext>;
  private isStarted = false;

  constructor(config?: Partial<PraxisTimerContext>) {
    this.engine = createTimerEngine(config);
  }

  start(): void {
    this.isStarted = true;
  }

  stop(): void {
    this.isStarted = false;
  }

  getTimerState(): PraxisTimerState {
    return this.engine.getContext().timerState;
  }

  getTimerData(): PraxisTimerContext | undefined {
    return this.engine.getContext().timerData;
  }

  startTimer(workItemId: number, workItemTitle: string): boolean {
    if (!this.isStarted) return false;
    if (this.getTimerState() !== 'idle') return false;

    this.engine.step([StartTimerEvent.create({ workItemId, workItemTitle })]);
    return this.getTimerState() === 'running';
  }

  pauseTimer(manual = true): boolean {
    if (!this.isStarted) return false;
    if (this.getTimerState() !== 'running') return false;

    this.engine.step([PauseTimerEvent.create({ manual })]);
    return this.getTimerState() === 'paused';
  }

  resumeTimer(fromActivity = false): boolean {
    if (!this.isStarted) return false;
    if (this.getTimerState() !== 'paused') return false;

    this.engine.step([ResumeTimerEvent.create({ fromActivity })]);
    return this.getTimerState() === 'running';
  }

  stopTimer(): PraxisTimerStopResult | null {
    if (!this.isStarted) return null;
    if (this.getTimerState() === 'idle') return null;

    const timerData = this.getTimerData();
    if (!timerData?.workItemId || !timerData?.startTime) return null;

    const endTime = Date.now();
    const duration = endTime - timerData.startTime;
    const hoursDecimal = duration / (1000 * 60 * 60);
    const limit = timerData.defaultElapsedLimitHours;

    const capApplied = hoursDecimal > limit;
    const cappedHours = capApplied ? limit : hoursDecimal;
    const cappedDuration = cappedHours * 60 * 60 * 1000;

    this.engine.step([StopTimerEvent.create({})]);

    return {
      workItemId: timerData.workItemId,
      startTime: timerData.startTime,
      endTime,
      duration: capApplied ? cappedDuration : duration,
      hoursDecimal: cappedHours,
      capApplied,
      capLimitHours: capApplied ? limit : undefined,
    };
  }

  activityPing(): void {
    if (!this.isStarted) return;
    if (this.getTimerState() === 'idle') return;
    this.engine.step([ActivityPingEvent.create({})]);
  }

  inactivityTimeout(): void {
    if (!this.isStarted) return;
    if (this.getTimerState() !== 'running') return;
    this.engine.step([InactivityTimeoutEvent.create({})]);
  }

  restoreTimer(
    workItemId: number,
    workItemTitle: string,
    startTime: number,
    isPaused: boolean
  ): boolean {
    if (!this.isStarted) return false;
    if (this.getTimerState() !== 'idle') return false;

    this.engine.step([
      RestoreTimerEvent.create({ workItemId, workItemTitle, startTime, isPaused }),
    ]);
    return this.getTimerState() !== 'idle';
  }

  getTimerSnapshot(): PraxisTimerSnapshot | undefined {
    const timerState = this.getTimerState();
    if (timerState === 'idle') return undefined;

    const timerData = this.getTimerData();
    if (!timerData) return undefined;

    const now = Date.now();
    // If paused, calculate elapsed time up to the pause point
    // If running, calculate elapsed time from adjusted start time
    let elapsedMs = 0;
    if (timerData.startTime) {
      if (timerData.isPaused && timerData.pausedAt) {
        // When paused, elapsed time is from start to pause point
        elapsedMs = timerData.pausedAt - timerData.startTime;
      } else {
        // When running, elapsed time is from adjusted start to now
        elapsedMs = now - timerData.startTime;
      }
    }

    return {
      workItemId: timerData.workItemId,
      workItemTitle: timerData.workItemTitle,
      startTime: timerData.startTime,
      elapsedSeconds: Math.floor(elapsedMs / 1000),
      isPaused: timerData.isPaused,
      running: timerState === 'running',
      isPomodoro: timerData.pomodoroEnabled,
      pomodoroCount: timerData.pomodoroCount,
    };
  }

  getStatus() {
    return {
      isStarted: this.isStarted,
      timerState: this.getTimerState(),
      timerContext: this.getTimerData(),
    };
  }

  validateSync(): boolean {
    return this.isStarted;
  }

  getEngine(): LogicEngine<TimerEngineContext> {
    return this.engine;
  }
}
