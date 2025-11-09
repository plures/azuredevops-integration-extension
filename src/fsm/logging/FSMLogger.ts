/**
 * Module: src/fsm/logging/FSMLogger.ts
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
 * FSM-Integrated Logging System
 *
 * Provides comprehensive logging capabilities specifically designed for FSM architecture:
 * - Configurable log levels with runtime changes
 * - FSM context-aware logging with state tracking
 * - Component-specific log filtering
 * - Multiple output destinations
 * - Performance-optimized with minimal overhead when disabled
 */

// Conditional vscode import for webview compatibility
let vscode: any = null;
async function getVscode(): Promise<any> {
  if (vscode) return vscode;
  try {
    if (typeof window === 'undefined') {
      // Only import vscode in Node.js environment (extension), not webview
      vscode = await import('vscode');
    }
  } catch {
    // vscode not available - running in webview or test environment
  }
  return vscode;
}

// ============================================================================
// LOG LEVEL DEFINITIONS
// ============================================================================

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  OFF = 4,
}

export const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.OFF]: 'OFF',
};

// ============================================================================
// FSM COMPONENT TYPES
// ============================================================================

export enum FSMComponent {
  APPLICATION = 'APPLICATION',
  CONNECTION = 'CONNECTION',
  TIMER = 'TIMER',
  WEBVIEW = 'WEBVIEW',
  AUTH = 'AUTH',
  DATA = 'DATA',
  ADAPTER = 'ADAPTER',
  MACHINE = 'MACHINE',
}

export interface FSMContext {
  component: FSMComponent;
  instanceId?: string;
  connectionId?: string;
  state?: string;
  event?: string;
  machineId?: string;
}

// ============================================================================
// LOGGING CONFIGURATION
// ============================================================================

export interface LoggingConfig {
  enabled: boolean;
  level: LogLevel;
  components: Record<FSMComponent, boolean>;
  destinations: {
    console: boolean;
    outputChannel: boolean;
    file: boolean;
  };
  includeTimestamp: boolean;
  includeStackTrace: boolean;
  maxLogEntries: number;
  contextTracking: boolean;
}

const DEFAULT_CONFIG: LoggingConfig = {
  enabled: true,
  level: LogLevel.DEBUG, // More verbose logging by default
  components: {
    [FSMComponent.APPLICATION]: true,
    [FSMComponent.CONNECTION]: true,
    [FSMComponent.TIMER]: true,
    [FSMComponent.WEBVIEW]: true, // Enable webview logging
    [FSMComponent.AUTH]: true,
    [FSMComponent.DATA]: true, // Enable data logging
    [FSMComponent.ADAPTER]: true, // Enable adapter logging
    [FSMComponent.MACHINE]: true, // Enable machine logging
  },
  destinations: {
    console: true,
    outputChannel: true,
    file: false,
  },
  includeTimestamp: true,
  includeStackTrace: false,
  maxLogEntries: 1000,
  contextTracking: true,
};

// ============================================================================
// LOG ENTRY STRUCTURE
// ============================================================================

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  component: FSMComponent;
  message: string;
  context?: FSMContext;
  data?: any;
  stackTrace?: string;
}

// ============================================================================
// FSM LOGGER CLASS
// ============================================================================

export class FSMLogger {
  private static instance: FSMLogger | undefined;
  private config: LoggingConfig = DEFAULT_CONFIG;
  private logBuffer: LogEntry[] = [];
  private outputChannel?: any;
  private logCounter = 0;
  private configListeners: Array<(config: LoggingConfig) => void> = [];

  private constructor() {
    void getVscode();
    this.loadConfiguration();
  }

  public static getInstance(): FSMLogger {
    if (!FSMLogger.instance) {
      FSMLogger.instance = new FSMLogger();
    }
    return FSMLogger.instance;
  }

  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================

  private loadConfiguration(): void {
    try {
      // Check if vscode is available before trying to access workspace
      if (typeof vscode !== 'undefined' && vscode?.workspace) {
        const vscodeConfig = vscode.workspace.getConfiguration('azureDevOpsIntegration.logging');

        this.config = {
          enabled: vscodeConfig.get('enabled', DEFAULT_CONFIG.enabled),
          level: vscodeConfig.get('level', DEFAULT_CONFIG.level),
          components: {
            ...DEFAULT_CONFIG.components,
            ...vscodeConfig.get('components', {}),
          },
          destinations: {
            ...DEFAULT_CONFIG.destinations,
            ...vscodeConfig.get('destinations', {}),
          },
          includeTimestamp: vscodeConfig.get('includeTimestamp', DEFAULT_CONFIG.includeTimestamp),
          includeStackTrace: vscodeConfig.get(
            'includeStackTrace',
            DEFAULT_CONFIG.includeStackTrace
          ),
          maxLogEntries: vscodeConfig.get('maxLogEntries', DEFAULT_CONFIG.maxLogEntries),
          contextTracking: vscodeConfig.get('contextTracking', DEFAULT_CONFIG.contextTracking),
        };
      } else {
        // Use default configuration if vscode is not available yet
        this.config = { ...DEFAULT_CONFIG };
      }

      // Notify listeners of config changes
      this.configListeners.forEach((listener) => listener(this.config));
    } catch (error) {
      // Bootstrap error - use console.debug since logging system may not be functional
      console.debug('[FSMLogger] Failed to load configuration:', error);
      // Fall back to default config
      this.config = { ...DEFAULT_CONFIG };
    }
  }

  public updateConfiguration(updates: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...updates };
    this.configListeners.forEach((listener) => listener(this.config));

    // Persist to VS Code settings if available
    try {
      if (typeof vscode !== 'undefined' && vscode?.workspace) {
        const vscodeConfig = vscode.workspace.getConfiguration('azureDevOpsIntegration.logging');
        Object.entries(updates).forEach(([key, value]) => {
          vscodeConfig.update(key, value, vscode.ConfigurationTarget.Global);
        });
      }
    } catch (error) {
      // Bootstrap error - use console.debug since logging system may not be functional
      console.debug('[FSMLogger] Failed to persist configuration:', error);
    }
  }

  public onConfigurationChange(listener: (config: LoggingConfig) => void): any {
    this.configListeners.push(listener);
    if (vscode && vscode.Disposable) {
      return new vscode.Disposable(() => {
        const index = this.configListeners.indexOf(listener);
        if (index >= 0) {
          this.configListeners.splice(index, 1);
        }
      });
    } else {
      // Return a simple disposable-like object if vscode is not available
      return {
        dispose: () => {
          const index = this.configListeners.indexOf(listener);
          if (index >= 0) {
            this.configListeners.splice(index, 1);
          }
        },
      };
    }
  }

  // ============================================================================
  // OUTPUT CHANNEL MANAGEMENT
  // ============================================================================

  private getOutputChannel(): any {
    if (!this.outputChannel) {
      // Check if vscode is available (extension context)
      if (typeof vscode !== 'undefined' && vscode?.window) {
        this.outputChannel = vscode.window.createOutputChannel('Azure DevOps Int (FSM)');
      } else {
        // Return null if vscode is not available yet
        return null;
      }
    }
    return this.outputChannel;
  }

  // ============================================================================
  // CORE LOGGING METHODS
  // ============================================================================

  private shouldLog(level: LogLevel, component: FSMComponent): boolean {
    if (!this.config.enabled) return false;
    if (level < this.config.level) return false;
    if (!this.config.components[component]) return false;
    return true;
  }

  private createLogEntry(
    level: LogLevel,
    component: FSMComponent,
    message: string,
    context?: FSMContext,
    data?: any
  ): LogEntry {
    const entry: LogEntry = {
      id: `log_${++this.logCounter}`,
      timestamp: Date.now(),
      level,
      component,
      message,
      context: this.config.contextTracking ? context : undefined,
      data,
    };

    if (this.config.includeStackTrace && level >= LogLevel.WARN) {
      entry.stackTrace = new Error().stack;
    }

    return entry;
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = this.config.includeTimestamp ? new Date(entry.timestamp).toISOString() : '';

    const level = LOG_LEVEL_NAMES[entry.level].padEnd(5);
    const component = `[${entry.component}]`.padEnd(12);

    let contextStr = '';
    if (entry.context) {
      const parts: string[] = [];
      if (entry.context.instanceId) parts.push(`id:${entry.context.instanceId}`);
      if (entry.context.connectionId) parts.push(`conn:${entry.context.connectionId}`);
      if (entry.context.state) parts.push(`state:${entry.context.state}`);
      if (entry.context.event) parts.push(`event:${entry.context.event}`);
      if (entry.context.machineId) parts.push(`machine:${entry.context.machineId}`);

      if (parts.length > 0) {
        contextStr = `{${parts.join(', ')}} `;
      }
    }

    let formatted = `${timestamp} ${level} ${component} ${contextStr}${entry.message}`;

    if (entry.data) {
      formatted += `\n  Data: ${JSON.stringify(entry.data, null, 2)}`;
    }

    if (entry.stackTrace && this.config.includeStackTrace) {
      formatted += `\n  Stack: ${entry.stackTrace}`;
    }

    return formatted;
  }

  private writeToDestinations(entry: LogEntry): void {
    const formatted = this.formatLogEntry(entry);

    // Console output with enhanced visibility for debug console
    if (this.config.destinations.console) {
      const consoleMethod =
        entry.level >= LogLevel.ERROR
          ? 'error'
          : entry.level >= LogLevel.WARN
            ? 'warn'
            : entry.level >= LogLevel.INFO
              ? 'info'
              : 'log';

      // Add emojis and prominent formatting for debug console visibility
      const emoji =
        entry.level >= LogLevel.ERROR
          ? '🔴'
          : entry.level >= LogLevel.WARN
            ? '🟡'
            : entry.level >= LogLevel.INFO
              ? '🟢'
              : '🔵';

      const enhancedFormatted = `${emoji} [AzureDevOpsInt][FSM][${entry.component}] ${formatted}`;

      // ALWAYS output to debug console for maximum visibility during development
      // This ensures FSM logs appear in VS Code debug console when running extension
      console.debug(enhancedFormatted);

      // Also use the appropriate console method for proper categorization in browser dev tools
      // Handle console methods explicitly to satisfy ESLint no-console rule
      if (consoleMethod === 'error') {
        console.debug(`↳ ${formatted}`); // Use debug for all to satisfy ESLint
      } else if (consoleMethod === 'warn') {
        console.debug(`↳ ${formatted}`);
      } else if (consoleMethod === 'info') {
        console.debug(`↳ ${formatted}`);
      }
      // 'log' is already handled above with console.debug
    }

    // Output channel
    if (this.config.destinations.outputChannel) {
      const outputChannel = this.getOutputChannel();
      if (outputChannel) {
        outputChannel.appendLine(formatted);
      }
    }

    // File output (could be implemented later)
    if (this.config.destinations.file) {
      // TODO: Implement file logging
    }
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);

    // Maintain buffer size
    if (this.logBuffer.length > this.config.maxLogEntries) {
      this.logBuffer = this.logBuffer.slice(-this.config.maxLogEntries);
    }
  }

  private log(
    level: LogLevel,
    component: FSMComponent,
    message: string,
    context?: FSMContext,
    data?: any
  ): void {
    if (!this.shouldLog(level, component)) return;

    const entry = this.createLogEntry(level, component, message, context, data);
    this.addToBuffer(entry);
    this.writeToDestinations(entry);
  }

  // ============================================================================
  // PUBLIC LOGGING API
  // ============================================================================

  public debug(component: FSMComponent, message: string, context?: FSMContext, data?: any): void {
    this.log(LogLevel.DEBUG, component, message, context, data);
  }

  public info(component: FSMComponent, message: string, context?: FSMContext, data?: any): void {
    this.log(LogLevel.INFO, component, message, context, data);
  }

  public warn(component: FSMComponent, message: string, context?: FSMContext, data?: any): void {
    this.log(LogLevel.WARN, component, message, context, data);
  }

  public error(component: FSMComponent, message: string, context?: FSMContext, data?: any): void {
    this.log(LogLevel.ERROR, component, message, context, data);
  }

  // ============================================================================
  // FSM-SPECIFIC LOGGING HELPERS
  // ============================================================================

  public logStateTransition(
    component: FSMComponent,
    instanceId: string,
    fromState: string,
    toState: string,
    event: string,
    machineId?: string
  ): void {
    this.info(component, `State transition: ${fromState} → ${toState}`, {
      component,
      instanceId,
      state: toState,
      event,
      machineId,
    });
  }

  public logFSMEvent(
    component: FSMComponent,
    instanceId: string,
    event: string,
    currentState: string,
    machineId?: string,
    data?: any
  ): void {
    this.debug(
      component,
      `Event: ${event}`,
      {
        component,
        instanceId,
        state: currentState,
        event,
        machineId,
      },
      data
    );
  }

  public logFSMError(
    component: FSMComponent,
    instanceId: string,
    error: Error,
    currentState?: string,
    machineId?: string
  ): void {
    this.error(
      component,
      `FSM Error: ${error.message}`,
      {
        component,
        instanceId,
        state: currentState,
        machineId,
      },
      { error: error.stack }
    );
  }

  public logConnectionActivity(
    connectionId: string,
    activity: string,
    state?: string,
    data?: any
  ): void {
    this.info(
      FSMComponent.CONNECTION,
      activity,
      {
        component: FSMComponent.CONNECTION,
        connectionId,
        state,
      },
      data
    );
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  public getLogBuffer(): LogEntry[] {
    return [...this.logBuffer];
  }

  public clearLogBuffer(): void {
    this.logBuffer = [];
  }

  public exportLogs(): string {
    return this.logBuffer.map((entry) => this.formatLogEntry(entry)).join('\n');
  }

  public getConfiguration(): LoggingConfig {
    return { ...this.config };
  }

  public showOutputChannel(): void {
    const outputChannel = this.getOutputChannel();
    if (outputChannel) {
      outputChannel.show(true);
    }
  }

  public getStats(): {
    totalEntries: number;
    entriesByLevel: Record<LogLevel, number>;
    entriesByComponent: Record<FSMComponent, number>;
  } {
    const stats = {
      totalEntries: this.logBuffer.length,
      entriesByLevel: {} as Record<LogLevel, number>,
      entriesByComponent: {} as Record<FSMComponent, number>,
    };

    // Initialize counters
    Object.values(LogLevel).forEach((level) => {
      if (typeof level === 'number') {
        stats.entriesByLevel[level] = 0;
      }
    });
    Object.values(FSMComponent).forEach((component) => {
      stats.entriesByComponent[component] = 0;
    });

    // Count entries
    this.logBuffer.forEach((entry) => {
      stats.entriesByLevel[entry.level]++;
      stats.entriesByComponent[entry.component]++;
    });

    return stats;
  }
}

// ============================================================================
// GLOBAL LOGGER INSTANCE
// ============================================================================

export const fsmLogger = FSMLogger.getInstance();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export interface ComponentLogger {
  debug: (message: string, context?: Partial<FSMContext>, data?: any) => void;
  info: (message: string, context?: Partial<FSMContext>, data?: any) => void;
  warn: (message: string, context?: Partial<FSMContext>, data?: any) => void;
  error: (message: string, context?: Partial<FSMContext>, data?: any) => void;
  logStateTransition: (
    fromState: string,
    toState: string,
    event: string,
    machineId?: string
  ) => void;
  logEvent: (event: string, currentState: string, machineId?: string, data?: any) => void;
  logError: (error: Error, currentState?: string, machineId?: string) => void;
}

export function createComponentLogger(
  component: FSMComponent,
  instanceId?: string
): ComponentLogger {
  return {
    debug: (message: string, context?: Partial<FSMContext>, data?: any) =>
      fsmLogger.debug(component, message, { component, instanceId, ...context }, data),

    info: (message: string, context?: Partial<FSMContext>, data?: any) =>
      fsmLogger.info(component, message, { component, instanceId, ...context }, data),

    warn: (message: string, context?: Partial<FSMContext>, data?: any) =>
      fsmLogger.warn(component, message, { component, instanceId, ...context }, data),

    error: (message: string, context?: Partial<FSMContext>, data?: any) =>
      fsmLogger.error(component, message, { component, instanceId, ...context }, data),

    logStateTransition: (fromState: string, toState: string, event: string, machineId?: string) =>
      fsmLogger.logStateTransition(
        component,
        instanceId || 'unknown',
        fromState,
        toState,
        event,
        machineId
      ),

    logEvent: (event: string, currentState: string, machineId?: string, data?: any) =>
      fsmLogger.logFSMEvent(
        component,
        instanceId || 'unknown',
        event,
        currentState,
        machineId,
        data
      ),

    logError: (error: Error, currentState?: string, machineId?: string) =>
      fsmLogger.logFSMError(component, instanceId || 'unknown', error, currentState, machineId),
  };
}
