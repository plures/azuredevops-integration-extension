/**
 * Module: src/logging/unifiedLogger.ts
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
/**
 * Unified Logger - Always includes [AzureDevOpsInt] prefix
 *
 * This logger ensures all logs are properly prefixed so they can be filtered.
 * Use this instead of console.log/error/warn directly.
 */

// Optional vscode import (extension host only); dynamic to avoid bundler resolution errors in desktop app
let vscode: typeof import('vscode') | undefined;
void (async () => {
  try {
    if (typeof process !== 'undefined' && process?.versions?.node) {
      const vscodeModule = await import('vscode');
      vscode = vscodeModule;
    }
  } catch {
    vscode = undefined;
  }
})();
import { logLine } from '../logging.js';

const LOG_PREFIX = '[AzureDevOpsInt]';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  /** Optional scope/category for the log (e.g., 'convert', 'activation') */
  scope?: string;
  /** Optional metadata object to include */
  meta?: unknown;
}

/**
 * Unified logger that always includes [AzureDevOpsInt] prefix
 *
 * @example
 * ```typescript
 * import { log } from './logging/unifiedLogger.js';
 *
 * log.info('Connection established', { scope: 'connection', meta: { id: 'conn-123' } });
 * log.error('Failed to connect', { scope: 'connection', meta: error });
 * ```
 */
export const log = {
  debug: (message: string, options?: LogOptions) => {
    if (!shouldLogDebug()) return;
    writeLog('debug', message, options);
  },

  info: (message: string, options?: LogOptions) => {
    writeLog('info', message, options);
  },

  warn: (message: string, options?: LogOptions) => {
    writeLog('warn', message, options);
  },

  error: (message: string, options?: LogOptions) => {
    writeLog('error', message, options);
  },
};

function shouldLogDebug(): boolean {
  try {
    if (vscode?.workspace?.getConfiguration) {
      const config = vscode.workspace.getConfiguration('azureDevOpsIntegration');
      return Boolean(config.get('debugLogging'));
    }
    // Fallback: environment flag for non-extension runtimes
    if (typeof process !== 'undefined' && process?.env?.AZDO_INT_DEBUG === '1') return true;
    return false;
  } catch {
    return false;
  }
}

function writeLog(level: LogLevel, message: string, options?: LogOptions): void {
  const scope = options?.scope ? `[${options.scope}]` : '';
  const metaText = formatMeta(options?.meta);
  const metaSuffix = metaText ? ` ${metaText}` : '';

  const logMessage = `${LOG_PREFIX}${scope} ${message}${metaSuffix}`;

  // Write to output channel
  logLine(logMessage);

  // Also write to console for immediate visibility
  // Handle console methods explicitly to satisfy ESLint no-console rule
  if (level === 'error') {
    console.error(logMessage);
  } else if (level === 'warn') {
    console.warn(logMessage);
  } else if (level === 'debug') {
    console.debug(logMessage);
  } else {
    console.log(logMessage);
  }
}

function formatMeta(meta: unknown): string | undefined {
  if (meta === undefined || meta === null) return undefined;
  if (typeof meta === 'string') return meta;
  if (meta instanceof Error) {
    return `${meta.message}${meta.stack ? `\n${meta.stack}` : ''}`;
  }
  try {
    return JSON.stringify(meta);
  } catch {
    return '[unserializable meta]';
  }
}

/**
 * Create a scoped logger for a specific component
 *
 * @example
 * ```typescript
 * const logger = createLogger('convert');
 * // Simple message (no meta):
 * logger.info('Starting conversion');
 * // Message with metadata:
 * logger.error('Conversion failed', { meta: error });
 * // Processing without metadata:
 * logger.debug('Processing item');
 * ```
 */
export function createLogger(scope: string) {
  const wrap = (options?: any) => {
    if (!options) return { scope };
    if ('meta' in options) return { scope, ...options };
    return { scope, meta: options };
  };

  return {
    debug: (message: string, options?: any) => log.debug(message, wrap(options)),
    info: (message: string, options?: any) => log.info(message, wrap(options)),
    warn: (message: string, options?: any) => log.warn(message, wrap(options)),
    error: (message: string, options?: any) => log.error(message, wrap(options)),
  };
}
