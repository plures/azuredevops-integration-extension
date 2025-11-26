/**
 * Module: src/fsm/FSMManager.ts
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
 *
 * This module now uses Praxis logic engine instead of XState.
 */
import { PraxisTimerManager } from '../praxis/timer/manager.js';
import type { TimerContext } from './types.js';
import { FSM_CONFIG } from './config.js';
import { createComponentLogger, FSMComponent } from './logging/FSMLogger.js';
import { fsmTracer } from './logging/FSMTracer.js';

export class FSMManager {
  private timerManager: PraxisTimerManager | undefined;
  private isStarted = false;
  private logger = createComponentLogger(FSMComponent.TIMER, 'FSMManager');
  private tickInterval: ReturnType<typeof setInterval> | undefined;

  constructor() {
    this.logger.info('FSMManager created (Praxis-based)');
  }

  start(): void {
    if (this.isStarted) {
      this.logger.warn('FSM Manager already started');
      return;
    }

    try {
      // Initialize Praxis timer manager
      this.timerManager = new PraxisTimerManager();
      this.timerManager.start();

      // Log the transition
      fsmTracer.logEvent({
        component: FSMComponent.TIMER,
        machineId: 'praxisTimerManager',
        eventType: 'START',
        timestamp: Date.now(),
      });

      // Setup tick interval for timer
      this.setupTimerTick();

      this.isStarted = true;
      this.logger.info('FSM Manager started successfully (Praxis-based)');
    } catch (error) {
      this.logger.error(
        'Failed to start FSM Manager: ' + (error instanceof Error ? error.message : String(error))
      );
      throw error;
    }
  }

  stop(): void {
    if (!this.isStarted) {
      return;
    }

    try {
      // Clear tick interval
      if (this.tickInterval) {
        clearInterval(this.tickInterval);
        this.tickInterval = undefined;
      }

      if (this.timerManager) {
        this.timerManager.stop();
        this.timerManager = undefined;
      }

      this.isStarted = false;
      this.logger.info('FSM Manager stopped');
    } catch (error) {
      this.logger.error(
        'Failed to stop FSM Manager: ' + (error instanceof Error ? error.message : String(error))
      );
    }
  }

  // Timer-specific methods
  getTimerActor(): unknown {
    // Return the Praxis timer manager for compatibility
    return this.timerManager;
  }

  startTimer(workItemId: number, workItemTitle: string): boolean {
    if (!this.timerManager) {
      this.logger.error('Timer manager not initialized');
      return false;
    }

    try {
      const result = this.timerManager.startTimer(workItemId, workItemTitle);
      if (result) {
        fsmTracer.logEvent({
          component: FSMComponent.TIMER,
          machineId: 'praxisTimerManager',
          eventType: 'START_TIMER',
          timestamp: Date.now(),
          data: { workItemId, workItemTitle },
        });
      }
      return result;
    } catch (error) {
      this.logger.error(
        'Failed to start timer: ' + (error instanceof Error ? error.message : String(error))
      );
      return false;
    }
  }

  pauseTimer(_manual = true): boolean {
    if (!this.timerManager) {
      this.logger.error('Timer manager not initialized');
      return false;
    }

    try {
      const result = this.timerManager.pauseTimer();
      if (result) {
        fsmTracer.logEvent({
          component: FSMComponent.TIMER,
          machineId: 'praxisTimerManager',
          eventType: 'PAUSE_TIMER',
          timestamp: Date.now(),
        });
      }
      return result;
    } catch (error) {
      this.logger.error(
        'Failed to pause timer: ' + (error instanceof Error ? error.message : String(error))
      );
      return false;
    }
  }

  resumeTimer(_fromActivity = false): boolean {
    if (!this.timerManager) {
      this.logger.error('Timer manager not initialized');
      return false;
    }

    try {
      const result = this.timerManager.resumeTimer();
      if (result) {
        fsmTracer.logEvent({
          component: FSMComponent.TIMER,
          machineId: 'praxisTimerManager',
          eventType: 'RESUME_TIMER',
          timestamp: Date.now(),
        });
      }
      return result;
    } catch (error) {
      this.logger.error(
        'Failed to resume timer: ' + (error instanceof Error ? error.message : String(error))
      );
      return false;
    }
  }

  stopTimer(): any {
    if (!this.timerManager) {
      this.logger.error('Timer manager not initialized');
      return null;
    }

    try {
      const result = this.timerManager.stopTimer();
      if (result) {
        fsmTracer.logEvent({
          component: FSMComponent.TIMER,
          machineId: 'praxisTimerManager',
          eventType: 'STOP_TIMER',
          timestamp: Date.now(),
          data: result,
        });
      }
      return result;
    } catch (error) {
      this.logger.error(
        'Failed to stop timer: ' + (error instanceof Error ? error.message : String(error))
      );
      return null;
    }
  }

  activityPing(): void {
    if (this.timerManager) {
      this.timerManager.activityPing();
    }
  }

  restoreTimer(
    workItemId: number,
    workItemTitle: string,
    startTime: number,
    isPaused: boolean
  ): boolean {
    if (!this.timerManager) {
      this.logger.error('Timer manager not initialized');
      return false;
    }

    try {
      const result = this.timerManager.restoreTimer(workItemId, workItemTitle, startTime, isPaused);
      if (result) {
        fsmTracer.logEvent({
          component: FSMComponent.TIMER,
          machineId: 'praxisTimerManager',
          eventType: 'RESTORE_TIMER',
          timestamp: Date.now(),
          data: { workItemId, workItemTitle, startTime, isPaused },
        });
      }
      return result;
    } catch (error) {
      this.logger.error(
        'Failed to restore timer: ' + (error instanceof Error ? error.message : String(error))
      );
      return false;
    }
  }

  updateElapsedLimit(limit: number): void {
    if (!this.timerManager) {
      this.logger.error('Timer manager not initialized');
      return;
    }

    // TODO: Implement updateElapsedLimit in PraxisTimerManager
    this.logger.warn(`updateElapsedLimit(${limit}) not implemented in PraxisTimerManager yet`);
  }

  getTimerSnapshot(): any {
    if (!this.timerManager) {
      return undefined;
    }

    return this.timerManager.getTimerSnapshot();
  }

  // Private methods
  private setupTimerTick(): void {
    // Setup periodic tick for timer updates (for UI refresh)
    this.tickInterval = setInterval(() => {
      // Praxis doesn't need explicit tick events for state management,
      // but we keep the interval for UI refresh purposes
    }, FSM_CONFIG.timer.tickIntervalMs);
  }

  // Debug and inspection methods
  getStatus(): {
    isStarted: boolean;
    timerState?: string;
    timerContext?: TimerContext;
    hasInspector: boolean;
  } {
    if (!this.timerManager) {
      return {
        isStarted: this.isStarted,
        hasInspector: false,
      };
    }

    const status = this.timerManager.getStatus();

    return {
      isStarted: this.isStarted,
      timerState: status.timerState,
      timerContext: status.timerContext as unknown as TimerContext,
      hasInspector: false, // Praxis doesn't use inspector
    };
  }

  // Subscribe to state changes
  subscribeToTimer(_callback: (snapshot: any) => void): () => void {
    // Praxis engines don't have built-in subscription, but we can
    // provide a no-op unsubscribe for compatibility
    this.logger.warn(
      'Timer subscription not directly supported with Praxis. Consider using polling or webview messaging.'
    );
    return () => {
      // No-op unsubscribe
    };
  }
}

// Singleton instance for global access
let fsmManagerInstance: FSMManager | undefined;

export function getFSMManager(): FSMManager {
  if (!fsmManagerInstance) {
    fsmManagerInstance = new FSMManager();
  }
  return fsmManagerInstance;
}

export function resetFSMManager(): void {
  if (fsmManagerInstance) {
    fsmManagerInstance.stop();
    fsmManagerInstance = undefined;
  }
}
