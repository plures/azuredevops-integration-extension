/**
 * Event Replay Debugger
 *
 * Provides step-by-step event replay with breakpoints for debugging.
 */

import type { ApplicationEngineContext } from '../praxis/application/engine.js';
import type { PraxisEvent } from '@plures/praxis';
import { history } from '../webview/praxis/store.js';
import { frontendEngine } from '../webview/praxis/frontendEngine.js';
import type { TestScenario } from '../testing/historyTestRecorder.js';

/**
 * Options for event replay
 */
export interface ReplayOptions {
  stepDelay?: number; // Delay between steps in milliseconds
  pauseOnBreakpoint?: boolean; // Pause when hitting a breakpoint
  onStep?: (index: number, event: PraxisEvent, context: ApplicationEngineContext) => void;
  onBreakpoint?: (index: number, event: PraxisEvent) => void;
}

/**
 * Event Replay Debugger
 *
 * Replays events step-by-step with breakpoint support for debugging.
 */
export class EventReplayDebugger {
  private breakpoints: Set<number> = new Set();
  private paused: boolean = false;
  private resumeCallbacks: Array<() => void> = [];

  /**
   * Set a breakpoint at a specific event index
   */
  setBreakpoint(index: number): void {
    this.breakpoints.add(index);
    // Debug statement removed
  }

  /**
   * Remove a breakpoint
   */
  removeBreakpoint(index: number): void {
    this.breakpoints.delete(index);
    // Debug statement removed
  }

  /**
   * Clear all breakpoints
   */
  clearBreakpoints(): void {
    this.breakpoints.clear();
    // Debug statement removed
  }

  /**
   * Get all breakpoints
   */
  getBreakpoints(): number[] {
    return Array.from(this.breakpoints).sort((a, b) => a - b);
  }

  /**
   * Replay a test scenario with breakpoint support
   */
  async replay(scenario: TestScenario, options: ReplayOptions = {}): Promise<void> {
    const { stepDelay = 0, pauseOnBreakpoint = true, onStep, onBreakpoint } = options;

    // Reset to initial state
    frontendEngine.updateContext(() => scenario.initialContext);
    history.clearHistory();

    // Debug statement removed

    for (let i = 0; i < scenario.events.length; i++) {
      const eventData = scenario.events[i];

      // Check for breakpoint
      if (this.breakpoints.has(i) && pauseOnBreakpoint) {
        this.paused = true;
        // Debug statement removed

        if (onBreakpoint) {
          onBreakpoint(i, eventData.event);
        }

        // Wait for resume
        await this.waitForResume();
      }

      // Dispatch event
      frontendEngine.step([eventData.event]);

      // Call step callback
      if (onStep) {
        const context = frontendEngine.getContext();
        onStep(i, eventData.event, context);
      }

      // Log state after each step
      const context = frontendEngine.getContext();
      // Debug statement removed

      // Wait if step delay specified
      if (stepDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, stepDelay));
      }
    }

    // Debug statement removed
  }

  /**
   * Replay from history entries
   */
  async replayHistory(
    startIndex: number = 0,
    endIndex?: number,
    options: ReplayOptions = {}
  ): Promise<void> {
    const historyEntries = history.getHistory();
    const end = endIndex !== undefined ? endIndex : historyEntries.length - 1;

    // Reset to start state
    if (startIndex > 0 && historyEntries[startIndex - 1]) {
      const startEntry = historyEntries[startIndex - 1];
      frontendEngine.updateContext(() => startEntry.state.context as ApplicationEngineContext);
    } else {
      frontendEngine.updateContext(
        () => historyEntries[0].state.context as ApplicationEngineContext
      );
    }

    const { stepDelay = 0, pauseOnBreakpoint = true, onStep, onBreakpoint } = options;

    for (let i = startIndex; i <= end; i++) {
      const entry = historyEntries[i];
      if (!entry || !entry.events || entry.events.length === 0) {
        continue;
      }

      // Check for breakpoint
      if (this.breakpoints.has(i) && pauseOnBreakpoint) {
        this.paused = true;
        // Debug statement removed

        if (onBreakpoint && entry.events[0]) {
          onBreakpoint(i, entry.events[0]);
        }

        await this.waitForResume();
      }

      // Replay events
      for (const event of entry.events) {
        frontendEngine.step([event]);

        if (onStep) {
          const context = frontendEngine.getContext();
          onStep(i, event, context);
        }
      }

      if (stepDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, stepDelay));
      }
    }
  }

  /**
   * Step forward one event
   */
  async stepForward(scenario: TestScenario, currentIndex: number): Promise<number> {
    if (currentIndex >= scenario.events.length) {
      return currentIndex;
    }

    const eventData = scenario.events[currentIndex];
    frontendEngine.step([eventData.event]);

    const context = frontendEngine.getContext();
    // Debug statement removed

    return currentIndex + 1;
  }

  /**
   * Step backward one event
   */
  async stepBackward(scenario: TestScenario, currentIndex: number): Promise<number> {
    if (currentIndex <= 0) {
      return currentIndex;
    }

    // Go to previous history entry
    history.goToHistory(currentIndex - 1);

    // Debug statement removed

    return currentIndex - 1;
  }

  /**
   * Resume from pause
   */
  resume(): void {
    if (this.paused) {
      this.paused = false;
      // Debug statement removed

      // Call all resume callbacks
      for (const callback of this.resumeCallbacks) {
        callback();
      }
      this.resumeCallbacks = [];
    }
  }

  /**
   * Pause replay
   */
  pause(): void {
    this.paused = true;
    // Debug statement removed
  }

  /**
   * Check if currently paused
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Wait for resume signal
   */
  private async waitForResume(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.paused) {
        resolve();
        return;
      }

      this.resumeCallbacks.push(() => {
        resolve();
      });
    });
  }
}

/**
 * Global debugger instance
 */
let globalDebugger: EventReplayDebugger | null = null;

/**
 * Get or create the global debugger instance
 */
export function getEventReplayDebugger(): EventReplayDebugger {
  if (!globalDebugger) {
    globalDebugger = new EventReplayDebugger();
  }
  return globalDebugger;
}
