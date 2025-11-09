/**
 * Module: src/logging.ts
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
 */
import * as vscode from 'vscode';

const LOG_BUFFER_MAX = 5000;
let outputChannel: vscode.OutputChannel | undefined;
const logBuffer: string[] = [];

type ScopedLogFunction = (message: string, meta?: unknown) => void;

export type ScopedLogger = {
  debug: ScopedLogFunction;
  info: ScopedLogFunction;
  warn: ScopedLogFunction;
  error: ScopedLogFunction;
};

export function setOutputChannel(channel: vscode.OutputChannel | undefined) {
  outputChannel = channel;
}

export function getOutputChannel(): vscode.OutputChannel | undefined {
  return outputChannel;
}

export function clearOutputChannel() {
  outputChannel = undefined;
}

export function logLine(text: string) {
  try {
    outputChannel?.appendLine(text);
  } catch {
    /* ignore channel errors */
  }
  try {
    logBuffer.push(text);
    if (logBuffer.length > LOG_BUFFER_MAX) {
      logBuffer.splice(0, logBuffer.length - LOG_BUFFER_MAX);
    }
  } catch {
    /* ignore buffer errors */
  }
}

function formatLogMeta(meta: unknown): string | undefined {
  if (meta === undefined || meta === null) return undefined;
  if (typeof meta === 'string') return meta;
  try {
    return JSON.stringify(meta);
  } catch {
    return '[unserializable meta]';
  }
}

export function createScopedLogger(
  scope: string,
  shouldLogDebug: () => boolean = () => false
): ScopedLogger {
  const write = (level: string, message: string, meta?: unknown) => {
    const metaText = formatLogMeta(meta);
    const suffix = metaText ? ` ${metaText}` : '';
    // CRITICAL: Always include [AzureDevOpsInt] prefix for log filtering
    const line = `${new Date().toISOString()} [AzureDevOpsInt] [${scope}] ${level} ${message}${suffix}`;
    logLine(line);
  };

  return {
    debug: (message, meta) => {
      if (!shouldLogDebug()) return;
      write('DEBUG', message, meta);
    },
    info: (message, meta) => {
      if (!shouldLogDebug()) return;
      write('INFO', message, meta);
    },
    warn: (message, meta) => {
      write('WARN', message, meta);
    },
    error: (message, meta) => {
      write('ERROR', message, meta);
    },
  };
}

export function getLogBufferSnapshot(): string[] {
  return [...logBuffer];
}

export function getLogBufferLength(): number {
  return logBuffer.length;
}

export function clearLogBuffer() {
  logBuffer.splice(0, logBuffer.length);
}

/**
 * Bridges console.log and console.error to the Output Channel
 * This ensures all console logging appears in the extension logs
 */
export function bridgeConsoleToOutputChannel() {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.log = function (...args: any[]) {
    try {
      const message = args
        .map((arg) => {
          if (typeof arg === 'string') return arg;
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
        .join(' ');
      logLine(`[console.log] ${message}`);
    } catch {
      /* ignore */
    }
    return originalConsoleLog.apply(console, args);
  };

  console.error = function (...args: any[]) {
    try {
      const message = args
        .map((arg) => {
          if (typeof arg === 'string') return arg;
          if (arg instanceof Error) return `${arg.message}\n${arg.stack}`;
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
        .join(' ');
      logLine(`[console.error] ${message}`);
    } catch {
      /* ignore */
    }
    return originalConsoleError.apply(console, args);
  };

  console.warn = function (...args: any[]) {
    try {
      const message = args
        .map((arg) => {
          if (typeof arg === 'string') return arg;
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
        .join(' ');
      logLine(`[console.warn] ${message}`);
    } catch {
      /* ignore */
    }
    return originalConsoleWarn.apply(console, args);
  };
}
