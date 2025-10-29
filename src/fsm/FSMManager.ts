import { createActor, Actor } from 'xstate';
import { timerMachine } from './machines/timerMachine';
import { TimerContext, TimerEvent as _TimerEvent } from './types';
import { setupFSMInspector, FSM_CONFIG } from './config';
import { createComponentLogger, FSMComponent } from './logging/FSMLogger.js';
import { fsmTracer } from './logging/FSMTracer.js';

export class FSMManager {
  private timerActor: Actor<typeof timerMachine> | undefined;
  private inspector: any;
  private isStarted = false;
  private logger = createComponentLogger(FSMComponent.TIMER, 'FSMManager');
  private traceCleanup: (() => void) | undefined;

  constructor() {
    this.logger.info('FSMManager created');
    // Setup inspector for development
    this.inspector = setupFSMInspector();
  }

  start(): void {
    if (this.isStarted) {
      this.logger.warn('FSM Manager already started');
      return;
    }

    try {
      // Initialize timer actor
      this.timerActor = createActor(timerMachine);

      // Setup inspector if available
      if (this.inspector) {
        this.inspector.actor(this.timerActor);
      }

      // Setup FSM tracing for full replay capability
      // Cast to any to bypass Actor vs ActorRef type mismatch in XState v5
      this.traceCleanup = fsmTracer.instrumentActor(
        this.timerActor as any,
        FSMComponent.TIMER,
        'timerMachine'
      );
      this.logger.info('Timer FSM instrumented for tracing and replay');

      // Start the actors
      this.timerActor.start();

      // Setup tick interval for timer
      this.setupTimerTick();

      this.isStarted = true;
      this.logger.info('FSM Manager started successfully');
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

    // Cleanup tracing
    if (this.traceCleanup) {
      this.traceCleanup();
      this.traceCleanup = undefined;
    }

    try {
      if (this.timerActor) {
        this.timerActor.stop();
        this.timerActor = undefined;
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
  getTimerActor(): Actor<typeof timerMachine> | undefined {
    return this.timerActor;
  }

  startTimer(workItemId: number, workItemTitle: string): boolean {
    if (!this.timerActor) {
      this.logger.error('Timer actor not initialized');
      return false;
    }

    try {
      const currentState = this.timerActor.getSnapshot();
      if (currentState.matches('idle')) {
        this.timerActor.send({ type: 'START', workItemId, workItemTitle });
        return true;
      } else {
        this.logger.warn('Timer is not idle, cannot start');
        return false;
      }
    } catch (error) {
      this.logger.error(
        'Failed to start timer: ' + (error instanceof Error ? error.message : String(error))
      );
      return false;
    }
  }

  pauseTimer(manual = true): boolean {
    if (!this.timerActor) {
      this.logger.error('Timer actor not initialized');
      return false;
    }

    try {
      const currentState = this.timerActor.getSnapshot();
      if (currentState.matches('running')) {
        this.timerActor.send({ type: 'PAUSE', manual });
        return true;
      } else {
        this.logger.warn('Timer is not running, cannot pause');
        return false;
      }
    } catch (error) {
      this.logger.error(
        'Failed to pause timer: ' + (error instanceof Error ? error.message : String(error))
      );
      return false;
    }
  }

  resumeTimer(fromActivity = false): boolean {
    if (!this.timerActor) {
      this.logger.error('Timer actor not initialized');
      return false;
    }

    try {
      const currentState = this.timerActor.getSnapshot();
      if (currentState.matches('paused')) {
        this.timerActor.send({ type: 'RESUME', fromActivity });
        return true;
      } else {
        this.logger.warn('Timer is not paused, cannot resume');
        return false;
      }
    } catch (error) {
      this.logger.error(
        'Failed to resume timer: ' + (error instanceof Error ? error.message : String(error))
      );
      return false;
    }
  }

  stopTimer(): any {
    if (!this.timerActor) {
      this.logger.error('Timer actor not initialized');
      return null;
    }

    try {
      const currentState = this.timerActor.getSnapshot();
      if (!currentState.matches('idle')) {
        const context = currentState.context;
        this.timerActor.send({ type: 'STOP' });

        // Return timer stop result for compatibility
        return {
          workItemId: context.workItemId,
          startTime: context.startTime,
          endTime: Date.now(),
          duration: context.elapsedSeconds,
          hoursDecimal: Number((context.elapsedSeconds / 3600).toFixed(2)),
          capApplied: context.elapsedSeconds > context.defaultElapsedLimitHours * 3600,
          capLimitHours: context.defaultElapsedLimitHours,
        };
      } else {
        this.logger.warn('Timer is already idle');
        return null;
      }
    } catch (error) {
      this.logger.error(
        'Failed to stop timer: ' + (error instanceof Error ? error.message : String(error))
      );
      return null;
    }
  }

  activityPing(): void {
    if (this.timerActor) {
      this.timerActor.send({ type: 'ACTIVITY' });
    }
  }

  getTimerSnapshot(): any {
    if (!this.timerActor) {
      return undefined;
    }

    const currentState = this.timerActor.getSnapshot();
    const context = currentState.context;

    if (context.workItemId) {
      return {
        workItemId: context.workItemId,
        workItemTitle: context.workItemTitle,
        elapsedSeconds: context.elapsedSeconds,
        isPaused: context.isPaused,
        startTime: context.startTime,
        pomodoroCount: context.pomodoroCount,
        running: !context.isPaused,
      };
    }

    return undefined;
  }

  // Private methods
  private setupTimerTick(): void {
    // Setup periodic tick for timer updates
    setInterval(() => {
      if (this.timerActor) {
        const currentState = this.timerActor.getSnapshot();
        if (currentState.matches('running')) {
          this.timerActor.send({ type: 'TICK' });
        }
      }
    }, FSM_CONFIG.timer.tickIntervalMs);
  }

  // Debug and inspection methods
  getStatus(): {
    isStarted: boolean;
    timerState?: string;
    timerContext?: TimerContext;
    hasInspector: boolean;
  } {
    const timerSnapshot = this.timerActor?.getSnapshot();

    return {
      isStarted: this.isStarted,
      timerState: timerSnapshot?.value as string,
      timerContext: timerSnapshot?.context,
      hasInspector: !!this.inspector,
    };
  }

  // Subscribe to state changes
  subscribeToTimer(callback: (snapshot: any) => void): () => void {
    if (!this.timerActor) {
      throw new Error('Timer actor not initialized');
    }

    return this.timerActor.subscribe(callback).unsubscribe;
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
