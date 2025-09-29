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
    const line = `${new Date().toISOString()} [${scope}] ${level} ${message}${suffix}`;
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
