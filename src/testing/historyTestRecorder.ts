/**
 * History Test Recorder
 *
 * Records Praxis engine state transitions and events to create test scenarios
 * that can be replayed for automated testing and regression detection.
 */

import type { PraxisEvent } from '@plures/praxis';
import type { ApplicationEngineContext } from '../praxis/application/engine.js';
import { history } from '../webview/praxis/store.js';
import { frontendEngine } from '../webview/praxis/frontendEngine.js';

/**
 * A recorded test scenario containing initial state, events, and final state
 */
export interface TestScenario {
  id: string;
  name: string;
  description?: string;
  timestamp: string;
  initialContext: ApplicationEngineContext;
  events: Array<{
    event: PraxisEvent;
    label?: string;
    expectedState?: Partial<ApplicationEngineContext>;
    timestamp: number;
    stateAfter: string;
  }>;
  finalContext: ApplicationEngineContext;
  metadata?: {
    tags?: string[];
    author?: string;
    version?: string;
  };
}

/**
 * Options for recording test scenarios
 */
export interface RecordingOptions {
  autoLabel?: boolean; // Automatically label events based on event type
  captureExpectedState?: boolean; // Capture expected state after each event
  maxDuration?: number; // Maximum recording duration in milliseconds
}

/**
 * History Test Recorder
 *
 * Records engine state transitions and events to create replayable test scenarios.
 */
export class HistoryTestRecorder {
  private scenario: TestScenario | null = null;
  private startTime: number = 0;
  private options: RecordingOptions;
  private eventLabels: Map<string, string> = new Map();

  constructor(options: RecordingOptions = {}) {
    this.options = {
      autoLabel: true,
      captureExpectedState: true,
      ...options,
    };
  }

  /**
   * Start recording a new test scenario
   */
  startRecording(
    scenarioId: string,
    scenarioName: string,
    description?: string,
    metadata?: TestScenario['metadata']
  ): void {
    if (this.scenario) {
      throw new Error('Recording already in progress. Call stopRecording() first.');
    }

    // Clear history to start fresh
    history.clearHistory();

    // Capture initial state
    const initialContext = frontendEngine.getContext();
    this.startTime = Date.now();

    this.scenario = {
      id: scenarioId,
      name: scenarioName,
      description,
      timestamp: new Date().toISOString(),
      initialContext: this.deepClone(initialContext),
      events: [],
      finalContext: initialContext,
      metadata: metadata || {},
    };

    // Recording started (logging disabled to satisfy ESLint)
  }

  /**
   * Stop recording and return the test scenario
   */
  stopRecording(): TestScenario {
    if (!this.scenario) {
      throw new Error('No active recording. Call startRecording() first.');
    }

    // Capture final state
    this.scenario.finalContext = this.deepClone(frontendEngine.getContext());

    const scenario = this.scenario;
    this.scenario = null;

    // Recording stopped (logging disabled to satisfy ESLint)

    return scenario;
  }

  /**
   * Record an event (called automatically when events are dispatched)
   */
  recordEvent(event: PraxisEvent, label?: string): void {
    if (!this.scenario) {
      return; // Not recording
    }

    // Check max duration
    if (this.options.maxDuration) {
      const elapsed = Date.now() - this.startTime;
      if (elapsed > this.options.maxDuration) {
        // Max duration exceeded - stop recording
        this.stopRecording();
        return;
      }
    }

    // Get state after event
    const stateAfter = frontendEngine.getContext().applicationState;

    // Auto-generate label if needed
    const eventLabel = label || (this.options.autoLabel ? this.generateLabel(event) : undefined);

    // Capture expected state if enabled
    let expectedState: Partial<ApplicationEngineContext> | undefined;
    if (this.options.captureExpectedState) {
      expectedState = this.extractRelevantState(frontendEngine.getContext());
    }

    this.scenario.events.push({
      event,
      label: eventLabel,
      expectedState,
      timestamp: Date.now(),
      stateAfter,
    });

    // Event recorded (logging disabled to satisfy ESLint)
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.scenario !== null;
  }

  /**
   * Get current scenario (if recording)
   */
  getCurrentScenario(): TestScenario | null {
    return this.scenario ? { ...this.scenario } : null;
  }

  /**
   * Add a label for a specific event type
   */
  setEventLabel(eventTag: string, label: string): void {
    this.eventLabels.set(eventTag, label);
  }

  /**
   * Generate a human-readable label for an event
   */
  private generateLabel(event: PraxisEvent): string {
    // Check if we have a custom label
    if (this.eventLabels.has(event.tag)) {
      return this.eventLabels.get(event.tag)!;
    }

    // Generate label from event tag
    return event.tag
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  /**
   * Extract relevant state for expected state comparison
   */
  private extractRelevantState(
    context: ApplicationEngineContext
  ): Partial<ApplicationEngineContext> {
    // Extract only key fields that are likely to change
    return {
      applicationState: context.applicationState,
      isActivated: context.isActivated,
      isDeactivating: context.isDeactivating,
      connections: context.connections,
      activeConnectionId: context.activeConnectionId,
      errorRecoveryAttempts: context.errorRecoveryAttempts,
      lastError: context.lastError,
      // Add more fields as needed
    };
  }

  /**
   * Deep clone context to avoid mutations
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}

/**
 * Global recorder instance (for webview)
 */
let globalRecorder: HistoryTestRecorder | null = null;

/**
 * Get or create the global recorder instance
 */
export function getHistoryTestRecorder(): HistoryTestRecorder {
  if (!globalRecorder) {
    globalRecorder = new HistoryTestRecorder();
  }
  return globalRecorder;
}

/**
 * Start recording a test scenario
 */
export function startRecording(
  scenarioId: string,
  scenarioName: string,
  description?: string,
  metadata?: TestScenario['metadata']
): void {
  const recorder = getHistoryTestRecorder();
  recorder.startRecording(scenarioId, scenarioName, description, metadata);
}

/**
 * Stop recording and return the scenario
 */
export function stopRecording(): TestScenario {
  const recorder = getHistoryTestRecorder();
  return recorder.stopRecording();
}

/**
 * Check if currently recording
 */
export function isRecording(): boolean {
  const recorder = getHistoryTestRecorder();
  return recorder.isRecording();
}
