/**
 * Standardized Automatic Logger
 *
 * Provides zero-instrumentation automatic logging with standardized format:
 * [azuredevops-integration-extension][{runtime}][{flowName}][{componentName}][{functionName}] {message}
 *
 * This is the ONLY logging mechanism. All other logging systems are deprecated.
 */

import { logLine } from '../logging.js';

type Runtime = 'ext' | 'webview';
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  runtime: Runtime;
  flowName: string;
  componentName: string;
  functionName?: string;
}

interface LogEntry {
  context: LogContext;
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
  timestamp: number;
  sessionId: string;
}

class StandardizedAutomaticLogger {
  private static instance: StandardizedAutomaticLogger | undefined;
  private sessionId: string;
  private entries: LogEntry[] = [];
  private maxEntries = 10000;

  private constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  public static getInstance(): StandardizedAutomaticLogger {
    if (!StandardizedAutomaticLogger.instance) {
      StandardizedAutomaticLogger.instance = new StandardizedAutomaticLogger();
    }
    return StandardizedAutomaticLogger.instance;
  }

  /**
   * Format log message according to standard:
   * [azuredevops-integration-extension][{runtime}][{flowName}][{componentName}][{functionName}] {message}
   */
  private formatMessage(context: LogContext, message: string): string {
    const prefix = '[azuredevops-integration-extension]';
    const runtime = `[${context.runtime}]`;
    const flow = `[${context.flowName}]`;
    const component = `[${context.componentName}]`;
    const functionPart = context.functionName ? `[${context.functionName}]` : '';

    return `${prefix}${runtime}${flow}${component}${functionPart} ${message}`;
  }

  /**
   * Format metadata for logging
   */
  private formatMeta(meta?: Record<string, unknown>): string {
    if (!meta || Object.keys(meta).length === 0) return '';

    try {
      return ` ${JSON.stringify(meta)}`;
    } catch {
      return ' [unserializable meta]';
    }
  }

  /**
   * Determine runtime context automatically
   */
  private detectRuntime(): Runtime {
    // In webview context, window is available and acquireVsCodeApi exists
    if (typeof window !== 'undefined' && typeof (window as any).acquireVsCodeApi === 'function') {
      return 'webview';
    }
    // In extension host, process.versions.node exists
    if (typeof process !== 'undefined' && process?.versions?.node) {
      return 'ext';
    }
    // Default to ext if uncertain
    return 'ext';
  }

  /**
   * Core logging method
   */
  public log(
    flowName: string,
    componentName: string,
    functionName: string | undefined,
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>
  ): void {
    const runtime = this.detectRuntime();
    const context: LogContext = {
      runtime,
      flowName,
      componentName,
      functionName,
    };

    const entry: LogEntry = {
      context,
      level,
      message,
      meta,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    };

    // Store entry
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    // Format and output
    const formattedMessage = this.formatMessage(context, message);
    const metaText = this.formatMeta(meta);
    const fullMessage = `${formattedMessage}${metaText}`;

    // Write to output channel (VS Code)
    logLine(fullMessage);

    // Write to console (for debug console)
    // Note: We use console methods here because this IS the logging system
    // ESLint rules allow console in logging.ts and this file
    switch (level) {
      case 'error':
        console.error(fullMessage);
        break;
      case 'warn':
        console.warn(fullMessage);
        break;
      case 'debug':
        console.debug(fullMessage);
        break;
      default:
        console.log(fullMessage);
    }
  }

  /**
   * Convenience methods for each log level
   */
  public debug(
    flowName: string,
    componentName: string,
    functionName: string | undefined,
    message: string,
    meta?: Record<string, unknown>
  ): void {
    this.log(flowName, componentName, functionName, 'debug', message, meta);
  }

  public info(
    flowName: string,
    componentName: string,
    functionName: string | undefined,
    message: string,
    meta?: Record<string, unknown>
  ): void {
    this.log(flowName, componentName, functionName, 'info', message, meta);
  }

  public warn(
    flowName: string,
    componentName: string,
    functionName: string | undefined,
    message: string,
    meta?: Record<string, unknown>
  ): void {
    this.log(flowName, componentName, functionName, 'warn', message, meta);
  }

  public error(
    flowName: string,
    componentName: string,
    functionName: string | undefined,
    message: string,
    meta?: Record<string, unknown>
  ): void {
    this.log(flowName, componentName, functionName, 'error', message, meta);
  }

  /**
   * Get all log entries (for replay/export)
   */
  public getEntries(filter?: {
    flowName?: string;
    componentName?: string;
    level?: LogLevel;
  }): LogEntry[] {
    let entries = [...this.entries];

    if (filter?.flowName) {
      entries = entries.filter((e) => e.context.flowName === filter.flowName);
    }
    if (filter?.componentName) {
      entries = entries.filter((e) => e.context.componentName === filter.componentName);
    }
    if (filter?.level) {
      entries = entries.filter((e) => e.level === filter.level);
    }

    return entries;
  }

  /**
   * Export session for replay
   */
  public exportSession(): LogEntry[] {
    return [...this.entries];
  }

  /**
   * Clear all entries
   */
  public clear(): void {
    this.entries = [];
  }

  /**
   * Get session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }
}

// Singleton instance
export const standardizedLogger = StandardizedAutomaticLogger.getInstance();

// Convenience function for automatic logging
export function autoLog(
  flowName: string,
  componentName: string,
  functionName: string | undefined,
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): void {
  standardizedLogger.log(flowName, componentName, functionName, level, message, meta);
}
