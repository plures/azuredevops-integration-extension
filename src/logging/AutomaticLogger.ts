/**
 * Automatic Logging Infrastructure
 *
 * Provides zero-instrumentation automatic logging for:
 * - Function calls/returns
 * - Message passing (webview ↔ extension)
 * - State changes (Praxis)
 * - Errors
 * - Performance metrics
 *
 * All logs are structured for full replay capability.
 */

import { standardizedLogger } from './StandardizedAutomaticLogger.js';

// ============================================================================
// LOG ENTRY TYPES
// ============================================================================

export type LogEntryType = 'function' | 'message' | 'state' | 'error' | 'performance';

export interface AutomaticLogEntry {
  id: string;
  timestamp: number;
  type: LogEntryType;
  component: string;
  operation: string;

  function?: {
    name: string;
    args: unknown[];
    result?: unknown;
    error?: {
      message: string;
      stack?: string;
    };
    duration: number;
  };

  message?: {
    direction: 'host->webview' | 'webview->host';
    type: string;
    payload: unknown;
    response?: unknown;
  };

  state?: {
    from: string;
    to: string;
    event: string;
    contextBefore?: unknown;
    contextAfter?: unknown;
  };

  error?: {
    message: string;
    stack?: string;
    context: unknown;
  };

  performance?: {
    metric: string;
    value: number;
    unit: string;
  };

  context?: Record<string, unknown>;
  sessionId: string;
  traceId?: string;
}

export interface AutomaticLoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  logFunctions: boolean;
  logMessages: boolean;
  logStateChanges: boolean;
  logErrors: boolean;
  logPerformance: boolean;
  includeComponents: string[];
  excludeComponents: string[];
  maxEntries: number;
  persistToFile: boolean;
  filePath?: string;
}

const DEFAULT_CONFIG: AutomaticLoggingConfig = {
  enabled: true,
  level: 'debug',
  logFunctions: true,
  logMessages: true,
  logStateChanges: true,
  logErrors: true,
  logPerformance: true,
  includeComponents: [],
  excludeComponents: [],
  maxEntries: 10000,
  persistToFile: false,
};

// ============================================================================
// AUTOMATIC LOGGER CLASS
// ============================================================================

export class AutomaticLogger {
  private static instance: AutomaticLogger | undefined;
  private config: AutomaticLoggingConfig;
  private entries: AutomaticLogEntry[] = [];
  private sessionId: string;
  private traceIdCounter = 0;

  private constructor(config?: Partial<AutomaticLoggingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  public static getInstance(config?: Partial<AutomaticLoggingConfig>): AutomaticLogger {
    if (!AutomaticLogger.instance) {
      AutomaticLogger.instance = new AutomaticLogger(config);
    }
    return AutomaticLogger.instance;
  }

  private shouldLog(component: string, type: LogEntryType): boolean {
    if (!this.config.enabled) return false;

    // Check component filters
    if (this.config.excludeComponents.includes(component)) return false;
    if (
      this.config.includeComponents.length > 0 &&
      !this.config.includeComponents.includes(component)
    ) {
      return false;
    }

    // Check type-specific config
    switch (type) {
      case 'function':
        return this.config.logFunctions;
      case 'message':
        return this.config.logMessages;
      case 'state':
        return this.config.logStateChanges;
      case 'error':
        return this.config.logErrors;
      case 'performance':
        return this.config.logPerformance;
      default:
        return true;
    }
  }

  private createEntry(
    type: LogEntryType,
    component: string,
    operation: string,
    data: Partial<AutomaticLogEntry>
  ): AutomaticLogEntry {
    return {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: performance.now(),
      type,
      component,
      operation,
      sessionId: this.sessionId,
      ...data,
    };
  }

  private addEntry(entry: AutomaticLogEntry): void {
    if (!this.shouldLog(entry.component, entry.type)) {
      return;
    }

    this.entries.push(entry);

    // Trim if over limit
    if (this.entries.length > this.config.maxEntries) {
      this.entries = this.entries.slice(-this.config.maxEntries);
    }

    // Log to console/output channel
    this.logToConsole(entry);
  }

  private logToConsole(entry: AutomaticLogEntry): void {
    const level = this.config.level === 'debug' ? 'debug' : 'info';
    const message = this.formatEntry(entry);

    // Use standardized logger with proper format
    // Extract flow/component from component string (e.g., "activation.webview" -> flow="activation", component="webview")
    const parts = entry.component.split('.');
    const flowName = parts[0] || 'unknown';
    const componentName = parts.slice(1).join('.') || entry.component;

    standardizedLogger.log(flowName, componentName, entry.operation, level, message, entry as any);
  }

  private formatEntry(entry: AutomaticLogEntry): string {
    switch (entry.type) {
      case 'function':
        return `[${entry.component}] ${entry.operation}(${entry.function?.args.length || 0} args) ${entry.function?.duration.toFixed(2)}ms`;
      case 'message':
        return `[${entry.component}] ${entry.message?.direction} ${entry.message?.type}`;
      case 'state':
        return `[${entry.component}] ${entry.state?.from} → ${entry.state?.to} (${entry.state?.event})`;
      case 'error':
        return `[${entry.component}] ERROR: ${entry.error?.message}`;
      case 'performance':
        return `[${entry.component}] ${entry.performance?.metric}: ${entry.performance?.value}${entry.performance?.unit}`;
      default:
        return `[${entry.component}] ${entry.operation}`;
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  public logFunction(
    component: string,
    functionName: string,
    args: unknown[],
    result: unknown,
    duration: number,
    error?: Error
  ): void {
    const entry = this.createEntry('function', component, functionName, {
      function: {
        name: functionName,
        args: this.sanitizeArgs(args),
        result: error ? undefined : this.sanitizeResult(result),
        error: error
          ? {
              message: error.message,
              stack: error.stack,
            }
          : undefined,
        duration,
      },
    });

    this.addEntry(entry);
  }

  public logMessage(
    component: string,
    direction: 'host->webview' | 'webview->host',
    type: string,
    payload: unknown,
    response?: unknown
  ): void {
    const entry = this.createEntry('message', component, type, {
      message: {
        direction,
        type,
        payload: this.sanitizePayload(payload),
        response: response ? this.sanitizePayload(response) : undefined,
      },
    });

    this.addEntry(entry);
  }

  public logStateChange(
    component: string,
    from: string,
    to: string,
    event: string,
    contextBefore?: unknown,
    contextAfter?: unknown
  ): void {
    const entry = this.createEntry('state', component, `${from}→${to}`, {
      state: {
        from,
        to,
        event,
        contextBefore: contextBefore ? this.sanitizeContext(contextBefore) : undefined,
        contextAfter: contextAfter ? this.sanitizeContext(contextAfter) : undefined,
      },
    });

    this.addEntry(entry);
  }

  public logError(
    component: string,
    operation: string,
    error: Error,
    context?: Record<string, unknown>
  ): void {
    const entry = this.createEntry('error', component, operation, {
      error: {
        message: error.message,
        stack: error.stack,
        context: context || {},
      },
    });

    this.addEntry(entry);
  }

  public logPerformance(
    component: string,
    metric: string,
    value: number,
    unit: string = 'ms'
  ): void {
    const entry = this.createEntry('performance', component, metric, {
      performance: {
        metric,
        value,
        unit,
      },
    });

    this.addEntry(entry);
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private sanitizeArgs(args: unknown[]): unknown[] {
    return args.map((arg) => this.sanitizeValue(arg));
  }

  private sanitizeResult(result: unknown): unknown {
    return this.sanitizeValue(result);
  }

  private sanitizePayload(payload: unknown): unknown {
    return this.sanitizeValue(payload);
  }

  private sanitizeContext(context: unknown): unknown {
    return this.sanitizeValue(context);
  }

  private sanitizeValue(value: unknown): unknown {
    // Remove circular references, functions, etc.
    try {
      return JSON.parse(
        JSON.stringify(value, (key, val) => {
          if (typeof val === 'function') return '[Function]';
          if (val instanceof Error) return { message: val.message, stack: val.stack };
          if (val instanceof Map) return Object.fromEntries(val);
          if (val instanceof Set) return Array.from(val);
          return val;
        })
      );
    } catch {
      return String(value);
    }
  }

  public getEntries(filter?: { type?: LogEntryType; component?: string }): AutomaticLogEntry[] {
    let entries = this.entries;

    if (filter?.type) {
      entries = entries.filter((e) => e.type === filter.type);
    }

    if (filter?.component) {
      entries = entries.filter((e) => e.component === filter.component);
    }

    return entries;
  }

  public exportSession(): AutomaticLogEntry[] {
    return [...this.entries];
  }

  public clear(): void {
    this.entries = [];
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const automaticLogger = AutomaticLogger.getInstance();
