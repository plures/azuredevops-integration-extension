/**
 * FSM Instrumentation & Logging System
 * 
 * Provides layered instrumentation for XState actors with:
 * - Event tracking and transition logging
 * - Context diff monitoring
 * - Performance timing
 * - NDJSON export for replay
 * - Svelte 5 runes integration
 */

// ============================================================================
// CORE INSTRUMENTATION TYPES
// ============================================================================

export type LogRecord = {
  t: number;
  type: 'event' | 'transition' | 'ctx_diff' | 'action' | 'action_err' | 'child_transition' | 'timing';
  sessionId?: string;
  machineId?: string;
  correlationId?: string;
  [key: string]: any;
};

export type LogSink = (rec: LogRecord) => void;

// ============================================================================
// ACTOR INSTRUMENTATION
// ============================================================================

/**
 * Wraps an XState actor with comprehensive instrumentation
 */
export function instrument<T extends { send: any; subscribe: any; getSnapshot: any; stop: any }>(
  actor: T,
  options: {
    sink?: LogSink;
    sessionId?: string;
    machineId?: string;
    enableContextDiff?: boolean;
    enableTiming?: boolean;
  } = {}
): () => void {
  const {
    sink = (rec) => console.log(JSON.stringify(rec)), // Default NDJSON to console
    sessionId = crypto.randomUUID(),
    machineId = 'unknown',
    enableContextDiff = true,
    enableTiming = true
  } = options;

  const t0 = performance.now();
  const snap0 = actor.getSnapshot();
  
  // Base log record factory
  const createLogRecord = (type: LogRecord['type'], data: any = {}): LogRecord => ({
    t: performance.now() - t0,
    type,
    sessionId,
    machineId,
    ...data
  });

  // 1) Event Logger - Wrap send method
  const originalSend = actor.send.bind(actor);
  actor.send = (ev: any) => {
    const startTime = performance.now();
    sink(createLogRecord('event', { ev }));
    
    try {
      const result = originalSend(ev);
      
      if (enableTiming) {
        sink(createLogRecord('timing', { 
          operation: 'send', 
          event: ev?.type || 'unknown',
          duration: performance.now() - startTime 
        }));
      }
      
      return result;
    } catch (error) {
      sink(createLogRecord('action_err', { 
        operation: 'send', 
        event: ev?.type || 'unknown', 
        error: error instanceof Error ? error.message : String(error)
      }));
      throw error;
    }
  };

  // 2) Transition Logger
  const transitionSub = actor.subscribe((s: any) => {
    const snap = { 
      value: s.value, 
      status: s.status, 
      tags: [...s.tags ?? []], 
      done: s.done 
    };
    sink(createLogRecord('transition', { snap, ctx: sanitizeContext(s.context) }));
  });

  // 3) Context Diff Logger
  let contextDiffSub: any = null;
  if (enableContextDiff) {
    let prevCtx = snap0?.context;
    contextDiffSub = actor.subscribe((s: any) => {
      const nextCtx = s.context;
      if (nextCtx !== prevCtx) {
        sink(createLogRecord('ctx_diff', { 
          diff: computeContextDiff(prevCtx, nextCtx) 
        }));
        prevCtx = nextCtx;
      }
    });
  }

  // 4) Child Actor Monitoring
  const childSubs = new Map<string, any>();
  const monitorChildren = () => {
    const snap = actor.getSnapshot();
    const children = snap.children ?? {};
    
    // Monitor new children
    for (const [id, child] of Object.entries(children)) {
      if (!childSubs.has(id) && child && typeof (child as any).subscribe === 'function') {
        const childSub = (child as any).subscribe((s: any) => {
          sink(createLogRecord('child_transition', { 
            childId: id, 
            value: s.value,
            status: s.status
          }));
        });
        childSubs.set(id, childSub);
      }
    }
    
    // Clean up removed children
    for (const [id, sub] of childSubs.entries()) {
      if (!(id in children)) {
        sub.unsubscribe();
        childSubs.delete(id);
      }
    }
  };

  // Monitor children on each transition
  const childMonitorSub = actor.subscribe(monitorChildren);
  monitorChildren(); // Initial check

  // Cleanup function
  return () => {
    transitionSub.unsubscribe();
    contextDiffSub?.unsubscribe();
    childMonitorSub.unsubscribe();
    
    // Clean up child subscriptions
    for (const sub of childSubs.values()) {
      sub.unsubscribe();
    }
    childSubs.clear();
  };
}

// ============================================================================
// ACTION/GUARD TRACING
// ============================================================================

/**
 * Higher-order wrapper for tracing actions and guards
 */
export function withTrace<F extends Function>(
  name: string, 
  f: F, 
  sink: LogSink = (rec) => console.log(JSON.stringify(rec))
): F {
  return (function (...args: any[]) {
    const startTime = performance.now();
    const logRecord = {
      t: startTime,
      type: 'action' as const,
      name,
      args: args.length
    };
    
    try {
      const result = (f as any)(...args);
      
      sink({
        ...logRecord,
        duration: performance.now() - startTime,
        success: true
      });
      
      return result;
    } catch (error) {
      sink({
        ...logRecord,
        type: 'action_err' as const,
        duration: performance.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        success: false
      });
      throw error;
    }
  }) as any;
}

// ============================================================================
// SVELTE 5 RUNES INTEGRATION
// ============================================================================

/**
 * Creates reactive Svelte 5 state that mirrors FSM snapshots
 */
export function createReactiveFSMBridge(
  actor: any,
  options: {
    enableEffectLogging?: boolean;
    sink?: LogSink;
  } = {}
) {
  const { enableEffectLogging = true, sink = (rec) => console.log(JSON.stringify(rec)) } = options;
  
  // Reactive snapshot state
  const fsmSnap = $state(actor.getSnapshot());
  
  // Subscribe to actor changes
  const subscription = actor.subscribe((snapshot: any) => {
    // Update reactive state (triggers Svelte reactivity)
    Object.assign(fsmSnap, snapshot);
  });
  
  // Effect for debugging state changes - only create if we're in component context
  if (enableEffectLogging) {
    try {
      $effect(() => {
        sink({
          t: performance.now(),
          type: 'transition',
          source: 'svelte_effect',
          value: fsmSnap.value,
          context: sanitizeContext(fsmSnap.context),
          status: fsmSnap.status
        });
      });
    } catch (error) {
      console.warn('[fsm-instrumentation] Effect creation failed (not in component context):', error);
    }
  }
  
  return {
    fsmSnap,
    cleanup: () => subscription.unsubscribe()
  };
}

// ============================================================================
// LOG SINKS & EXPORT
// ============================================================================

/**
 * NDJSON Log Sink - exports logs as newline-delimited JSON
 */
export class NDJSONLogSink {
  private logs: LogRecord[] = [];
  private maxLogs: number;
  
  constructor(maxLogs = 10000) {
    this.maxLogs = maxLogs;
  }
  
  log = (record: LogRecord) => {
    this.logs.push(record);
    
    // Rotate logs if too many
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs * 0.8); // Keep 80%
    }
    
    // Also log to console in dev
    if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
      console.log(JSON.stringify(record));
    }
  };
  
  /**
   * Export all logs as NDJSON string
   */
  export(): string {
    return this.logs.map(record => JSON.stringify(record)).join('\n');
  }
  
  /**
   * Export logs for a specific time range
   */
  exportRange(startTime: number, endTime: number): string {
    return this.logs
      .filter(record => record.t >= startTime && record.t <= endTime)
      .map(record => JSON.stringify(record))
      .join('\n');
  }
  
  /**
   * Filter logs by type
   */
  exportByType(types: LogRecord['type'][]): string {
    return this.logs
      .filter(record => types.includes(record.type))
      .map(record => JSON.stringify(record))
      .join('\n');
  }
  
  /**
   * Clear all logs
   */
  clear() {
    this.logs = [];
  }

  /**
   * Get the number of logs stored
   */
  getLogCount(): number {
    return this.logs.length;
  }
  
  /**
   * Get current log count
   */
  size(): number {
    return this.logs.length;
  }
}

/**
 * IndexedDB Log Sink - for persistent storage in browser
 */
export class IndexedDBLogSink {
  private dbName: string;
  private storeName: string;
  
  constructor(dbName = 'fsm-logs', storeName = 'logs') {
    this.dbName = dbName;
    this.storeName = storeName;
  }
  
  log = async (record: LogRecord) => {
    try {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await store.add({
        ...record,
        timestamp: Date.now(),
        id: crypto.randomUUID()
      });
    } catch (error) {
      console.warn('Failed to store log record:', error);
      // Fallback to console
      console.log(JSON.stringify(record));
    }
  };
  
  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('type', 'type');
          store.createIndex('sessionId', 'sessionId');
        }
      };
    });
  }
}

// ============================================================================
// TESTING & REPLAY
// ============================================================================

/**
 * Event Recorder for deterministic replay
 */
export class FSMEventRecorder {
  private events: any[] = [];
  
  record(event: any) {
    this.events.push({
      ...event,
      timestamp: Date.now(),
      t: performance.now()
    });
  }
  
  getEvents(): any[] {
    return [...this.events];
  }
  
  /**
   * Replay events on an actor
   */
  async replay(actor: any, delay = 0): Promise<void> {
    for (const event of this.events) {
      actor.send(event.ev);
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  export(): string {
    return JSON.stringify(this.events, null, 2);
  }
  
  clear() {
    this.events = [];
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sanitize context data to avoid logging sensitive information
 */
function sanitizeContext(context: any): any {
  if (!context || typeof context !== 'object') return context;
  
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];
  const sanitized = { ...context };
  
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Compute structural diff between contexts
 */
function computeContextDiff(prev: any, next: any): any {
  try {
    // Simple structural diff - replace with more sophisticated diff if needed
    return {
      prev: JSON.parse(JSON.stringify(prev)),
      next: JSON.parse(JSON.stringify(next)),
      changed: prev !== next
    };
  } catch {
    return { prev, next, changed: true };
  }
}

// ============================================================================
// PRODUCTION CONFIGURATION
// ============================================================================

/**
 * Production-safe instrumentation with feature flags and rate limiting
 */
export function createProductionInstrumentation(options: {
  enabled?: boolean;
  sampleRate?: number;
  maxLogsPerSecond?: number;
  enableInProduction?: boolean;
} = {}) {
  const {
    enabled = true,
    sampleRate = 1.0,
    maxLogsPerSecond = 100,
    enableInProduction = false
  } = options;
  
  const isProduction = typeof window !== 'undefined' && 
    window.location?.hostname !== 'localhost' && 
    !window.location?.hostname?.includes('dev');
  
  if (isProduction && !enableInProduction) {
    return {
      instrument: () => () => {}, // No-op
      sink: () => {}, // No-op
      enabled: false
    };
  }
  
  let logCount = 0;
  let lastSecond = Math.floor(Date.now() / 1000);
  let totalLogsProduced = 0;
  let totalLogsDropped = 0;
  let totalLogsSampled = 0;
  
  const rateLimitedSink: LogSink = (record) => {
    totalLogsProduced++;
    
    const currentSecond = Math.floor(Date.now() / 1000);
    
    if (currentSecond !== lastSecond) {
      logCount = 0;
      lastSecond = currentSecond;
    }
    
    if (logCount >= maxLogsPerSecond) {
      totalLogsDropped++;
      return; // Drop log
    }
    
    if (Math.random() > sampleRate) {
      totalLogsSampled++;
      return; // Sample out
    }
    
    logCount++;
    console.log(JSON.stringify(record));
  };
  
  const stats = {
    samplingStats: {
      sampleRate,
      totalProduced: () => totalLogsProduced,
      totalSampled: () => totalLogsSampled,
      samplingRatio: () => totalLogsProduced > 0 ? totalLogsSampled / totalLogsProduced : 0
    },
    rateLimitStats: {
      maxLogsPerSecond,
      totalProduced: () => totalLogsProduced,
      totalDropped: () => totalLogsDropped,
      dropRate: () => totalLogsProduced > 0 ? totalLogsDropped / totalLogsProduced : 0
    }
  };
  
  return {
    instrument: (actor: any, instrumentOptions: any = {}) => 
      enabled ? instrument(actor, { ...instrumentOptions, sink: rateLimitedSink }) : () => {},
    sink: rateLimitedSink,
    enabled,
    samplingStats: stats.samplingStats,
    rateLimitStats: stats.rateLimitStats
  };
}