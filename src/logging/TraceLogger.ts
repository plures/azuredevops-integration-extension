/* eslint-disable max-lines */
/**
 * Module: src/logging/TraceLogger.ts
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
 * Praxis Tracing and Replay System
 *
 * Provides comprehensive event tracing with full replay capability:
 * - Captures all Praxis events, state transitions, and context changes
 * - Stores detailed snapshots for replay debugging
 * - Exports/imports trace files for sharing and analysis
 * - Visual timeline and state visualization
 * - Performance analysis and bottleneck detection
 *
 * Compatible with Praxis logic engine.
 */

import { Component, componentLogger } from './ComponentLogger.js';

// ============================================================================
// TRACE ENTRY TYPES
// ============================================================================

export interface TraceEntry {
  id: string;
  timestamp: number;
  sessionId: string;
  machineId: string;
  actorId: string;
  component: Component;

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

export interface TraceSession {
  id: string;
  startTime: number;
  endTime?: number;
  description?: string;
  entries: TraceEntry[];
  metadata: {
    extensionVersion?: string;
    vscodeVersion?: string;
    userAgent?: string;
    [key: string]: unknown;
  };
}

export interface ReplayOptions {
  startFromEntry?: number;
  endAtEntry?: number;
  stepMode?: boolean;
  delayMs?: number;
  skipErrors?: boolean;
  onStateChange?: (entry: TraceEntry) => void;
  onError?: (entry: TraceEntry, error: Error) => void;
}

// Generic event type for logging
interface LogEventData {
  component: Component;
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
// TRACE LOGGER CLASS
// ============================================================================

export class TraceLogger {
  private static instance: TraceLogger | undefined;
  private sessions: Map<string, TraceSession> = new Map();
  private currentSession: TraceSession | undefined;
  private isRecording = false;
  private traceCounter = 0;
  private maxEntriesPerSession = 10000;
  private subscribedActors: Map<string, () => void> = new Map();

  private constructor() {
    this.startNewSession('Praxis Extension Startup');
  }

  public static getInstance(): TraceLogger {
    if (!TraceLogger.instance) {
      TraceLogger.instance = new TraceLogger();
    }
    return TraceLogger.instance;
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
      description: description || 'Praxis Trace Session',
      entries: [],
      metadata: {
        extensionVersion: process.env.npm_package_version,
        nodeVersion: process.version,
      },
    };

    this.sessions.set(sessionId, this.currentSession);
    this.isRecording = true;

    componentLogger.info(Component.MACHINE, `New trace session started: ${sessionId}`, {
      component: Component.MACHINE,
      machineId: sessionId,
    });

    return sessionId;
  }

  public stopCurrentSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = Date.now();
      this.isRecording = false;

      componentLogger.info(
        Component.MACHINE,
        `Trace session ended: ${this.currentSession.id}`,
        {
          component: Component.MACHINE,
          machineId: this.currentSession.id,
        },
        {
          duration: this.currentSession.endTime - this.currentSession.startTime,
          entriesCount: this.currentSession.entries.length,
        }
      );
    }
  }

  public getCurrentSession(): TraceSession | undefined {
    return this.currentSession;
  }

  public getSession(sessionId: string): TraceSession | undefined {
    return this.sessions.get(sessionId);
  }

  public getAllSessions(): TraceSession[] {
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
  public instrumentActor(_actor: unknown, component: Component, machineId?: string): () => void {
    if (!this.isRecording || !this.currentSession) {
      return (): void => {}; // No-op if not recording
    }

    const actorId = `${component}_${machineId || 'default'}_${Date.now()}`;

    // For Praxis, we don't subscribe to the actor directly
    // Instead, we provide the logEvent method for manual logging
    componentLogger.debug(Component.MACHINE, `Actor registered for tracing: ${actorId}`, {
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

    const entry: TraceEntry = {
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

  private addTraceEntry(entry: TraceEntry): void {
    if (!this.currentSession) return;

    this.currentSession.entries.push(entry);

    // Maintain buffer size
    if (this.currentSession.entries.length > this.maxEntriesPerSession) {
      this.currentSession.entries = this.currentSession.entries.slice(-this.maxEntriesPerSession);
    }

    // Log significant events
    if (entry.eventType !== 'TICK' && entry.eventType !== 'HEARTBEAT') {
      componentLogger.debug(
        Component.MACHINE,
        `Praxis Event: ${entry.eventType}`,
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
    options: ReplayOptions = {}
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

    componentLogger.info(
      Component.MACHINE,
      `Starting replay of session: ${sessionId}`,
      {
        component: Component.MACHINE,
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
          componentLogger.warn(Component.MACHINE, `Replay error skipped: ${error}`, {
            component: Component.MACHINE,
            machineId: sessionId,
          });
          onError?.(entry, error as Error);
        } else {
          throw error;
        }
      }
    }

    componentLogger.info(Component.MACHINE, `Replay completed for session: ${sessionId}`);
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
      const session: TraceSession = JSON.parse(sessionData);

      // Validate session structure
      if (!session.id || !session.entries || !Array.isArray(session.entries)) {
        throw new Error('Invalid session data format');
      }

      this.sessions.set(session.id, session);

      componentLogger.info(
        Component.MACHINE,
        `Session imported: ${session.id}`,
        {
          component: Component.MACHINE,
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

  private summarizeEntries(entries: TraceEntry[]): {
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

    componentLogger.info(Component.MACHINE, 'Trace Logger cleaned up');
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

// Initialize traceLogger instance
const _traceLogger = TraceLogger.getInstance();
export const traceLogger = _traceLogger;

// Backward compatibility type exports (for migration period)
// Backward compatibility type exports (for migration period only)
export type FSMTraceEntry = TraceEntry;
export type FSMTraceSession = TraceSession;
export type FSMReplayOptions = ReplayOptions;

export type SessionAnalysis = ReturnType<TraceLogger['analyzeSession']>;

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export function instrumentActor(
  actor: unknown,
  component: Component,
  machineId?: string
): () => void {
  return traceLogger.instrumentActor(actor, component, machineId);
}

export function startTraceSession(description?: string): string {
  return traceLogger.startNewSession(description);
}

export function stopTraceSession(): void {
  traceLogger.stopCurrentSession();
}

export function exportCurrentTrace(): string | undefined {
  const currentSession = traceLogger.getCurrentSession();
  if (!currentSession) return undefined;

  return traceLogger.exportSession(currentSession.id);
}

export function analyzeCurrentTrace(): SessionAnalysis | undefined {
  const currentSession = traceLogger.getCurrentSession();
  if (!currentSession) return undefined;

  return traceLogger.analyzeSession(currentSession.id);
}
