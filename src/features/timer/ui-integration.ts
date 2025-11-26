/**
 * Module: src/features/timer/ui-integration.ts
 * Owner: timer
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
 * Timer UI Integration
 *
 * Handles VSCode-specific timer integration including:
 * - Status bar updates
 * - Command registration
 * - Progress notifications
 */

import * as vscode from 'vscode';
import { createActor } from 'xstate';
import { timerMachine } from './machine';
import type { TimerContext } from './types';
import { saveTimerState, loadTimerState, clearTimerState, formatElapsedTime } from './persistence';

export class TimerUI {
  private statusBarItem: vscode.StatusBarItem;
  private timerActor: any;
  private updateInterval: NodeJS.Timeout | undefined;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'azureDevOpsIntegration.timer.toggle';
    this.statusBarItem.show();

    this.timerActor = createActor(timerMachine).start();
    this.setupEventHandlers();
    this.startUpdateInterval();
  }

  /**
   * Initialize timer from saved state
   */
  async initialize(): Promise<void> {
    const savedState = await loadTimerState();
    if (savedState) {
      this.timerActor.send({
        type: 'RESTORE',
        workItemId: savedState.workItemId,
        workItemTitle: savedState.workItemTitle,
        startTime: savedState.startTime,
        isPaused: savedState.isPaused,
      });
    }
  }

  /**
   * Start timer for a work item
   */
  startTimer(workItemId: number, workItemTitle: string): void {
    this.timerActor.send({
      type: 'START',
      workItemId,
      workItemTitle,
    });
  }

  /**
   * Pause the current timer
   */
  pauseTimer(): void {
    this.timerActor.send({ type: 'PAUSE' });
  }

  /**
   * Resume the paused timer
   */
  resumeTimer(): void {
    this.timerActor.send({ type: 'RESUME' });
  }

  /**
   * Stop the current timer
   */
  stopTimer(): void {
    this.timerActor.send({ type: 'STOP' });
    clearTimerState();
  }

  /**
   * Record user activity
   */
  recordActivity(): void {
    this.timerActor.send({ type: 'ACTIVITY' });
  }

  /**
   * Get current timer state
   */
  getCurrentState(): { state: string; context: TimerContext } {
    const snapshot = this.timerActor.getSnapshot();
    return {
      state: snapshot.value as string,
      context: snapshot.context,
    };
  }

  /**
   * Dispose of timer resources
   */
  dispose(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.timerActor.stop();
    this.statusBarItem.dispose();
  }

  private setupEventHandlers(): void {
    this.timerActor.subscribe((snapshot: any) => {
      this.updateStatusBar(snapshot);
      this.saveState(snapshot);
    });
  }

  private updateStatusBar(snapshot: any): void {
    const { value: state, context } = snapshot;

    switch (state) {
      case 'idle':
        this.statusBarItem.text = '$(clock) Timer';
        this.statusBarItem.tooltip = 'Start timer for work item';
        break;

      case 'running': {
        const elapsed = context.startTime
          ? formatElapsedTime(Math.floor((Date.now() - context.startTime) / 1000))
          : '0s';
        this.statusBarItem.text = `$(play) ${elapsed}`;
        this.statusBarItem.tooltip = `Timer running for: ${context.workItemTitle}`;
        break;
      }

      case 'paused': {
        // When paused, show elapsed time at the moment of pause (frozen)
        const pausedElapsed =
          context.startTime && context.pausedAt
            ? formatElapsedTime(Math.floor((context.pausedAt - context.startTime) / 1000))
            : '0s';
        this.statusBarItem.text = `$(debug-pause) ${pausedElapsed}`;
        this.statusBarItem.tooltip = `Timer paused for: ${context.workItemTitle}`;
        break;
      }
    }
  }

  private async saveState(snapshot: any): Promise<void> {
    const { value: state, context } = snapshot;
    await saveTimerState(context, state);
  }

  private startUpdateInterval(): void {
    this.updateInterval = setInterval(() => {
      const snapshot = this.timerActor.getSnapshot();
      if (snapshot.value === 'running') {
        this.updateStatusBar(snapshot);
      }
    }, 1000); // Update every second
  }
}
