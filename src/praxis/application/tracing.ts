/**
 * Praxis Application Tracing
 *
 * Provides tracing capabilities for the Praxis application engine.
 * This module wraps rules with tracing to capture state transitions and events.
 */

import type { Rule } from '@plures/praxis';
import { traceLogger, type TraceEntry } from '../../logging/TraceLogger.js';

/**
 * Trace entry for Praxis application engine
 */
export type { TraceEntry };

/**
 * TraceRecorder for capturing Praxis engine traces
 */
export class TraceRecorder<TContext> {
  private entries: TraceEntry[] = [];
  private isRecording = false;

  constructor() {
    this.isRecording = true;
  }

  /**
   * Record a trace entry
   */
  record(entry: Omit<TraceEntry, 'id' | 'timestamp' | 'sessionId'>): void {
    if (!this.isRecording) {
      return;
    }

    const fullEntry: TraceEntry = {
      ...entry,
      id: `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      sessionId: traceLogger.getCurrentSessionId() || 'unknown',
    };

    this.entries.push(fullEntry);
    traceLogger.recordTrace(fullEntry);
  }

  /**
   * Get all recorded entries
   */
  getEntries(): TraceEntry[] {
    return [...this.entries];
  }

  /**
   * Clear all recorded entries
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Start recording
   */
  start(): void {
    this.isRecording = true;
  }

  /**
   * Stop recording
   */
  stop(): void {
    this.isRecording = false;
  }

  /**
   * Check if recording is active
   */
  isActive(): boolean {
    return this.isRecording;
  }
}

/**
 * Wrap a rule with tracing capabilities
 */
export function wrapRuleWithTracing<TContext>(
  rule: Rule<TContext>,
  traceRecorder?: TraceRecorder<TContext>
): Rule<TContext> {
  if (!traceRecorder) {
    return rule;
  }

  return {
    ...rule,
    when: rule.when
      ? (context: TContext, event: any) => {
          const result = rule.when!(context, event);
          if (result) {
            traceRecorder.record({
              machineId: 'application',
              actorId: 'application',
              component: 'APPLICATION' as any,
              event: { type: event?.type || 'unknown', payload: event },
              eventType: event?.type || 'unknown',
              fromState: (context as any)?.applicationState || 'unknown',
              toState: (context as any)?.applicationState || 'unknown',
              contextBefore: context,
              contextAfter: context,
            });
          }
          return result;
        }
      : undefined,
    then: rule.then
      ? (context: TContext, event: any) => {
          const beforeState = (context as any)?.applicationState || 'unknown';
          const result = rule.then!(context, event);
          const afterState = (result as any)?.applicationState || beforeState;

          traceRecorder.record({
            machineId: 'application',
            actorId: 'application',
            component: 'APPLICATION' as any,
            event: { type: event?.type || 'unknown', payload: event },
            eventType: event?.type || 'unknown',
            fromState: beforeState,
            toState: afterState,
            contextBefore: context,
            contextAfter: result,
          });

          return result;
        }
      : undefined,
  };
}

