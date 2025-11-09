/**
 * Module: src/fsm/adapters/TimerAdapter.ts
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
import { FSMManager } from '../FSMManager';
import { WorkItemTimer } from '../../timer';
import { TimerStopResult, LegacyTimerSnapshot } from '../types';
import { createComponentLogger, FSMComponent } from '../logging/FSMLogger';

/**
 * TimerAdapter provides backward compatibility between the new FSM-based timer
 * and the existing WorkItemTimer interface. This allows for gradual migration
 * without breaking existing code.
 */
export class TimerAdapter {
  private fsmManager: FSMManager;
  private legacyTimer: WorkItemTimer;
  private useFSM: boolean;
  private logger = createComponentLogger(FSMComponent.ADAPTER, 'TimerAdapter');

  constructor(fsmManager: FSMManager, legacyTimer: WorkItemTimer, useFSM = false) {
    this.fsmManager = fsmManager;
    this.legacyTimer = legacyTimer;
    this.useFSM = useFSM;
  }

  // Enable/disable FSM usage at runtime
  setUseFSM(enabled: boolean): void {
    this.useFSM = enabled;
    this.logger.info(`Timer FSM ${enabled ? 'enabled' : 'disabled'}`);
  }

  // WorkItemTimer interface compatibility methods
  start(workItemId: number, workItemTitle: string): boolean {
    if (this.useFSM) {
      return this.fsmManager.startTimer(workItemId, workItemTitle);
    } else {
      return this.legacyTimer.start(workItemId, workItemTitle);
    }
  }

  pause(manual = true): boolean {
    if (this.useFSM) {
      return this.fsmManager.pauseTimer(manual);
    } else {
      return this.legacyTimer.pause(manual);
    }
  }

  resume(fromActivity = false): boolean {
    if (this.useFSM) {
      return this.fsmManager.resumeTimer(fromActivity);
    } else {
      return this.legacyTimer.resume(fromActivity);
    }
  }

  stop(
    addTimeEntryCallback?: (workItemId: number, hoursDecimal: number) => Promise<any> | any
  ): TimerStopResult | null {
    if (this.useFSM) {
      const result = this.fsmManager.stopTimer();

      if (result && addTimeEntryCallback) {
        try {
          Promise.resolve(addTimeEntryCallback(result.workItemId, result.hoursDecimal)).catch(
            (err) =>
              this.logger.error(
                'Time entry callback failed: ' + (err instanceof Error ? err.message : String(err))
              )
          );
        } catch (error) {
          this.logger.error(
            'Time entry callback error: ' + (error instanceof Error ? error.message : String(error))
          );
        }
      }

      return result;
    } else {
      return this.legacyTimer.stop(addTimeEntryCallback);
    }
  }

  activityPing(): void {
    if (this.useFSM) {
      this.fsmManager.activityPing();
    } else {
      this.legacyTimer.activityPing();
    }
  }

  snapshot(): LegacyTimerSnapshot | undefined {
    if (this.useFSM) {
      const fsmSnapshot = this.fsmManager.getTimerSnapshot();

      if (fsmSnapshot) {
        return {
          workItemId: fsmSnapshot.workItemId,
          workItemTitle: fsmSnapshot.workItemTitle,
          startTime: fsmSnapshot.startTime,
          elapsedSeconds: fsmSnapshot.elapsedSeconds,
          isPaused: fsmSnapshot.isPaused,
          isPomodoro: fsmSnapshot.isPomodoro || false,
          pomodoroCount: fsmSnapshot.pomodoroCount || 0,
        };
      }

      return undefined;
    } else {
      return this.legacyTimer.snapshot();
    }
  }

  // Additional methods from WorkItemTimer
  getTimeEntries(): any[] {
    // FSM doesn't handle time entries yet, delegate to legacy
    return this.legacyTimer.getTimeEntries();
  }

  timeReport(period: 'Today' | 'This Week' | 'This Month' | 'All Time'): any {
    // FSM doesn't handle time reports yet, delegate to legacy
    return this.legacyTimer.timeReport(period);
  }

  loadFromPersisted(): void {
    if (this.useFSM) {
      // FSM persistence loading implementation
      try {
        // Get timer actor from FSM manager
        const timerActor = this.fsmManager.getTimerActor();
        if (timerActor) {
          // Send restore event to timer state machine
          timerActor.send({ type: 'RESTORE' });
          this.logger.debug('FSM timer state restored from persistence');
        } else {
          this.logger.warn('No FSM timer actor available for persistence loading, using legacy');
          this.legacyTimer.loadFromPersisted();
        }
      } catch (error) {
        this.logger.error(
          'FSM persistence loading failed, falling back to legacy: ' +
            (error instanceof Error ? error.message : String(error))
        );
        this.legacyTimer.loadFromPersisted();
      }
    } else {
      this.legacyTimer.loadFromPersisted();
    }
  }

  setDefaultElapsedLimitHours(hours: number): void {
    if (this.useFSM) {
      // Update FSM timer context implementation
      try {
        const timerActor = this.fsmManager.getTimerActor();
        if (timerActor) {
          // Send update elapsed limit event
          timerActor.send({ type: 'UPDATE_ELAPSED_LIMIT', hours });
          this.logger.debug(`FSM timer elapsed limit updated to ${hours} hours`);
        } else {
          this.logger.warn('No FSM timer actor available for elapsed limit update, using legacy');
          this.legacyTimer.setDefaultElapsedLimitHours(hours);
        }
      } catch (error) {
        this.logger.error(
          'FSM elapsed limit update failed, falling back to legacy: ' +
            (error instanceof Error ? error.message : String(error))
        );
        this.legacyTimer.setDefaultElapsedLimitHours(hours);
      }
    } else {
      this.legacyTimer.setDefaultElapsedLimitHours(hours);
    }
  }

  // FSM-specific methods (not in legacy interface)
  getFSMStatus(): any {
    return this.fsmManager.getStatus();
  }

  subscribeToTimerChanges(callback: (snapshot: any) => void): () => void {
    if (this.useFSM) {
      return this.fsmManager.subscribeToTimer(callback);
    } else {
      // For legacy timer, we can't provide real subscriptions
      // Return a no-op unsubscribe function
      return () => {};
    }
  }

  // Debug methods
  isUsingFSM(): boolean {
    return this.useFSM;
  }

  forceSync(): void {
    if (this.useFSM) {
      // Force synchronization between FSM and legacy states
      const fsmSnapshot = this.fsmManager.getTimerSnapshot();
      this.logger.debug('FSM Timer State', { state: String(fsmSnapshot) });
    }

    const legacySnapshot = this.legacyTimer.snapshot();
    this.logger.debug('Legacy Timer State', { state: String(legacySnapshot) });
  }

  // Validation method to ensure both timers are in sync (for testing)
  validateSync(): { isSync: boolean; differences: string[] } {
    if (!this.useFSM) {
      return { isSync: true, differences: [] };
    }

    const fsmSnapshot = this.fsmManager.getTimerSnapshot();
    const legacySnapshot = this.legacyTimer.snapshot();
    const differences: string[] = [];

    if (!!fsmSnapshot !== !!legacySnapshot) {
      differences.push(
        `Timer existence mismatch: FSM=${!!fsmSnapshot}, Legacy=${!!legacySnapshot}`
      );
    }

    if (fsmSnapshot && legacySnapshot) {
      if (fsmSnapshot.workItemId !== legacySnapshot.workItemId) {
        differences.push(
          `Work item ID mismatch: FSM=${fsmSnapshot.workItemId}, Legacy=${legacySnapshot.workItemId}`
        );
      }

      if (fsmSnapshot.isPaused !== legacySnapshot.isPaused) {
        differences.push(
          `Pause state mismatch: FSM=${fsmSnapshot.isPaused}, Legacy=${legacySnapshot.isPaused}`
        );
      }

      // Allow some tolerance for elapsed seconds due to timing differences
      const elapsedDiff = Math.abs(fsmSnapshot.elapsedSeconds - legacySnapshot.elapsedSeconds);
      if (elapsedDiff > 2) {
        differences.push(
          `Elapsed seconds mismatch: FSM=${fsmSnapshot.elapsedSeconds}, Legacy=${legacySnapshot.elapsedSeconds}`
        );
      }
    }

    return {
      isSync: differences.length === 0,
      differences,
    };
  }
}

// Factory function for creating adapters
export function createTimerAdapter(
  fsmManager: FSMManager,
  legacyTimer: WorkItemTimer,
  config: { useFSM?: boolean } = {}
): TimerAdapter {
  const useFSM = config.useFSM ?? process.env.USE_TIMER_FSM === 'true';
  return new TimerAdapter(fsmManager, legacyTimer, useFSM);
}
