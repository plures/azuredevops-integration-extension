/**
 * Module: src/fsm/logging/FSMTracer.ts
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
/**
 * FSM Tracing and Replay System
 *
 * Provides comprehensive event tracing with full replay capability:
 * - Captures all FSM events, state transitions, and context changes
 * - Stores detailed snapshots for replay debugging
 * - Exports/imports trace files for sharing and analysis
 * - Visual timeline and state machine visualization
 * - Performance analysis and bottleneck detection
 *
 * Now compatible with Praxis logic engine (no XState dependency).
 */

import { fsmLogger, FSMComponent } from './FSMLogger.js';

// ============================================================================
// TRACE ENTRY TYPES
// ============================================================================

export interface FSMTraceEntry {
  id: string;
  timestamp: number;
  sessionId: string;
  machineId: string;
  actorId: string;
  component: FSMComponent;

  // Event information
  event: { type: string; payload?: unknown };
  eventType: string;

  // State information
  fromState: string;
  toState: string;

  // Context snapshots
  contextBefore: unknown;
  contextAfter: unknown;

  // Metadata
  duration?: number;
  error?: string;
  tags?: string[];
}

export interface FSMTraceSession {
  id: string;
  startTime: number;
  endTime?: number;
  description?: string;
  entries: FSMTraceEntry[];
  metadata: {
    extensionVersion?: string;
    vscodeVersion?: string;
    userAgent?: string;
    [key: string]: unknown;
  };
}

export interface FSMReplayOptions {
  startFromEntry?: number;
  endAtEntry?: number;
  stepMode?: boolean;
  delayMs?: number;
  skipErrors?: boolean;
  onStateChange?: (entry: FSMTraceEntry) => void;
  onError?: (entry: FSMTraceEntry, error: Error) => void;
}

// Generic event type for logging
interface LogEventData {
  component: FSMComponent;
  machineId: string;
  eventType: string;
  timestamp: number;
  fromState?: string;
  toState?: string;
  context?: unknown;
  data?: unknown;
  error?: string;
}

// ============================================================================
// FSM TRACER CLASS
// ============================================================================

export class FSMTracer {
  private static instance: FSMTracer | undefined;
  private sessions: Map<string, FSMTraceSession> = new Map();
  private currentSession: FSMTraceSession | undefined;
  private isRecording = false;
  private traceCounter = 0;
  private maxEntriesPerSession = 10000;
  private subscribedActors: Map<string, () => void> = new Map();

  private constructor() {
    this.startNewSession('FSM Extension Startup');
  }

  public static getInstance(): FSMTracer {
    if (!FSMTracer.instance) {
      FSMTracer.instance = new FSMTracer();
    }
    return FSMTracer.instance;
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  public startNewSession(description?: string): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // End current session if exists
    if (this.currentSession) {
      this.currentSession.endTime = Date.now();
    }

    this.currentSession = {
      id: sessionId,
      startTime: Date.now(),
      description: description || 'FSM Trace Session',
      entries: [],
      metadata: {
        extensionVersion: process.env.npm_package_version,
        nodeVersion: process.version,
      },
    };

    this.sessions.set(sessionId, this.currentSession);
    this.isRecording = true;

    fsmLogger.info(FSMComponent.MACHINE, `New trace session started: ${sessionId}`, {
      component: FSMComponent.MACHINE,
      machineId: sessionId,
    });

    return sessionId;
  }

  public stopCurrentSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = Date.now();
      this.isRecording = false;

      fsmLogger.info(
        FSMComponent.MACHINE,
        `Trace session ended: ${this.currentSession.id}`,
        {
          component: FSMComponent.MACHINE,
          machineId: this.currentSession.id,
        },
        {
          duration: this.currentSession.endTime - this.currentSession.startTime,
          entriesCount: this.currentSession.entries.length,
        }
      );
    }
  }

  public getCurrentSession(): FSMTraceSession | undefined {
    return this.currentSession;
  }

  public getSession(sessionId: string): FSMTraceSession | undefined {
    return this.sessions.get(sessionId);
  }

  public getAllSessions(): FSMTraceSession[] {
    return Array.from(this.sessions.values());
  }

  // ============================================================================
  // PRAXIS-COMPATIBLE ACTOR INSTRUMENTATION
  // ============================================================================

  /**
   * Instrument a Praxis manager or engine for tracing.
   * This is a no-op that returns a cleanup function for compatibility.
   * For actual tracing, use logEvent() directly.
   */
  public instrumentActor(
    _actor: unknown,
    component: FSMComponent,
    machineId?: string
  ): () => void {
    if (!this.isRecording || !this.currentSession) {
      return (): void => {}; // No-op if not recording
    }

    const actorId = `${component}_${machineId || 'default'}_${Date.now()}`;

    // For Praxis, we don't subscribe to the actor directly
    // Instead, we provide the logEvent method for manual logging
    fsmLogger.debug(FSMComponent.MACHINE, `Actor registered for tracing: ${actorId}`, {
      component,
      machineId,
    });

    // Store cleanup function
    const cleanup: () => void = () => {
      this.subscribedActors.delete(actorId);
    };

    this.subscribedActors.set(actorId, cleanup);

    return cleanup;
  }

  /**
   * Log an event from a Praxis engine or manager.
   * This is the main method for recording events in Praxis-based systems.
   */
  public logEvent(data: LogEventData): void {
    if (!this.isRecording || !this.currentSession) return;

    const entry: FSMTraceEntry = {
      id: `trace_${++this.traceCounter}`,
      timestamp: data.timestamp,
      sessionId: this.currentSession.id,
      machineId: data.machineId,
      actorId: `${data.component}_${data.machineId}`,
      component: data.component,

      event: { type: data.eventType, payload: data.data },
      eventType: data.eventType,

      fromState: data.fromState || 'unknown',
      toState: data.toState || 'unknown',

      contextBefore: null,
      contextAfter: data.context,

      error: data.error,
    };

    this.addTraceEntry(entry);
  }

  private addTraceEntry(entry: FSMTraceEntry): void {
    if (!this.currentSession) return;

    this.currentSession.entries.push(entry);

    // Maintain buffer size
    if (this.currentSession.entries.length > this.maxEntriesPerSession) {
      this.currentSession.entries = this.currentSession.entries.slice(-this.maxEntriesPerSession);
    }

    // Log significant events
    if (entry.eventType !== 'TICK' && entry.eventType !== 'HEARTBEAT') {
      fsmLogger.debug(
        FSMComponent.MACHINE,
        `FSM Event: ${entry.eventType}`,
        {
          component: entry.component,
          machineId: entry.machineId,
          state: entry.toState,
          event: entry.eventType,
        },
        {
          fromState: entry.fromState,
          toState: entry.toState,
          contextChanged:
            JSON.stringify(entry.contextBefore) !== JSON.stringify(entry.contextAfter),
        }
      );
    }
  }

  // ============================================================================
  // REPLAY FUNCTIONALITY
  // ============================================================================

  public async replaySession(
    sessionId: string,
    _targetActor: unknown,
    options: FSMReplayOptions = {}
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const {
      startFromEntry = 0,
      endAtEntry = session.entries.length - 1,
      stepMode = false,
      delayMs = 100,
      skipErrors = false,
      onStateChange,
      onError,
    } = options;

    fsmLogger.info(
      FSMComponent.MACHINE,
      `Starting replay of session: ${sessionId}`,
      {
        component: FSMComponent.MACHINE,
        machineId: sessionId,
      },
      {
        totalEntries: session.entries.length,
        startFrom: startFromEntry,
        endAt: endAtEntry,
      }
    );

    const entriesToReplay = session.entries.slice(startFromEntry, endAtEntry + 1);

    for (let i = 0; i < entriesToReplay.length; i++) {
      const entry = entriesToReplay[i];

      try {
        // For Praxis, replay is informational only
        // The actual state machine doesn't receive the events
        onStateChange?.(entry);

        // Wait if not in step mode
        if (!stepMode && delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else if (stepMode) {
          // In step mode, wait for user input
          await this.waitForStep();
        }
      } catch (error) {
        if (skipErrors) {
          fsmLogger.warn(FSMComponent.MACHINE, `Replay error skipped: ${error}`, {
            component: FSMComponent.MACHINE,
            machineId: sessionId,
          });
          onError?.(entry, error as Error);
        } else {
          throw error;
        }
      }
    }

    fsmLogger.info(FSMComponent.MACHINE, `Replay completed for session: ${sessionId}`);
  }

  private async waitForStep(): Promise<void> {
    // This could be enhanced with a UI for stepping through
    // For now, just a simple delay
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // ============================================================================
  // EXPORT/IMPORT FUNCTIONALITY
  // ============================================================================

  public exportSession(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return JSON.stringify(session, null, 2);
  }

  public exportAllSessions(): string {
    const allSessions = Object.fromEntries(this.sessions);
    return JSON.stringify(allSessions, null, 2);
  }

  public importSession(sessionData: string): string {
    try {
      const session: FSMTraceSession = JSON.parse(sessionData);

      // Validate session structure
      if (!session.id || !session.entries || !Array.isArray(session.entries)) {
        throw new Error('Invalid session data format');
      }

      this.sessions.set(session.id, session);

      fsmLogger.info(
        FSMComponent.MACHINE,
        `Session imported: ${session.id}`,
        {
          component: FSMComponent.MACHINE,
          machineId: session.id,
        },
        {
          entriesCount: session.entries.length,
          originalStartTime: session.startTime,
        }
      );

      return session.id;
    } catch (error) {
      throw new Error(`Failed to import session: ${error}`);
    }
  }

  // ============================================================================
  // ANALYSIS FUNCTIONALITY
  // ============================================================================

  public analyzeSession(sessionId: string): {
    summary: {
      duration: number;
      totalEvents: number;
      uniqueStates: number;
      errors: number;
    };
    eventFrequency: Record<string, number>;
    stateTransitions: Record<string, string[]>;
    performance: {
      avgTransitionTime: number;
      slowestTransitions: Array<{ from: string; to: string; event: string; duration: number }>;
    };
  } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const entries = session.entries;
    const { eventFrequency, stateTransitions, uniqueStates, transitions, errors } =
      this.summarizeEntries(entries);

    const avgTransitionTime =
      transitions.length > 0
        ? transitions.reduce((sum, t) => sum + t.duration, 0) / transitions.length
        : 0;

    const slowestTransitions = transitions.sort((a, b) => b.duration - a.duration).slice(0, 10);

    return {
      summary: {
        duration: (session.endTime || Date.now()) - session.startTime,
        totalEvents: entries.length,
        uniqueStates: uniqueStates.size,
        errors,
      },
      eventFrequency,
      stateTransitions,
      performance: {
        avgTransitionTime,
        slowestTransitions,
      },
    };
  }

  private summarizeEntries(entries: FSMTraceEntry[]): {
    eventFrequency: Record<string, number>;
    stateTransitions: Record<string, string[]>;
    uniqueStates: Set<string>;
    transitions: Array<{ from: string; to: string; event: string; duration: number }>;
    errors: number;
  } {
    const eventFrequency: Record<string, number> = {};
    const stateTransitions: Record<string, string[]> = {};
    const uniqueStates = new Set<string>();
    const transitions: Array<{ from: string; to: string; event: string; duration: number }> = [];
    let errors = 0;

    entries.forEach((entry, index) => {
      eventFrequency[entry.eventType] = (eventFrequency[entry.eventType] || 0) + 1;
      uniqueStates.add(entry.fromState);
      uniqueStates.add(entry.toState);

      if (!stateTransitions[entry.fromState]) {
        stateTransitions[entry.fromState] = [];
      }
      if (!stateTransitions[entry.fromState].includes(entry.toState)) {
        stateTransitions[entry.fromState].push(entry.toState);
      }

      if (entry.error) {
        errors++;
      }

      if (index > 0) {
        const duration = entry.timestamp - entries[index - 1].timestamp;
        transitions.push({
          from: entry.fromState,
          to: entry.toState,
          event: entry.eventType,
          duration,
        });
      }
    });

    return { eventFrequency, stateTransitions, uniqueStates, transitions, errors };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  public cleanup(): void {
    // Cleanup all subscriptions
    this.subscribedActors.forEach((cleanup) => cleanup());
    this.subscribedActors.clear();

    // Stop current session
    this.stopCurrentSession();

    fsmLogger.info(FSMComponent.MACHINE, 'FSM Tracer cleaned up');
  }

  public getStats(): {
    sessionsCount: number;
    totalEntries: number;
    currentSessionEntries: number;
    instrumentedActors: number;
  } {
    return {
      sessionsCount: this.sessions.size,
      totalEntries: Array.from(this.sessions.values()).reduce(
        (sum, session) => sum + session.entries.length,
        0
      ),
      currentSessionEntries: this.currentSession?.entries.length || 0,
      instrumentedActors: this.subscribedActors.size,
    };
  }
}

// ============================================================================
// GLOBAL TRACER INSTANCE
// ============================================================================

export const fsmTracer = FSMTracer.getInstance();

export type SessionAnalysis = ReturnType<FSMTracer['analyzeSession']>;

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export function instrumentActor(
  actor: unknown,
  component: FSMComponent,
  machineId?: string
): () => void {
  return fsmTracer.instrumentActor(actor, component, machineId);
}

export function startTraceSession(description?: string): string {
  return fsmTracer.startNewSession(description);
}

export function stopTraceSession(): void {
  fsmTracer.stopCurrentSession();
}

export function exportCurrentTrace(): string | undefined {
  const currentSession = fsmTracer.getCurrentSession();
  if (!currentSession) return undefined;

  return fsmTracer.exportSession(currentSession.id);
}

export function analyzeCurrentTrace(): SessionAnalysis | undefined {
  const currentSession = fsmTracer.getCurrentSession();
  if (!currentSession) return undefined;

  return fsmTracer.analyzeSession(currentSession.id);
}
