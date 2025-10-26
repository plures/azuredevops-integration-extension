let vscode = null;
async function getVscode() {
  if (vscode) return vscode;
  try {
    if (typeof window === 'undefined') {
      vscode = await import('vscode');
    }
  } catch (e) {}
  return vscode;
}
var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
  LogLevel2[(LogLevel2['DEBUG'] = 0)] = 'DEBUG';
  LogLevel2[(LogLevel2['INFO'] = 1)] = 'INFO';
  LogLevel2[(LogLevel2['WARN'] = 2)] = 'WARN';
  LogLevel2[(LogLevel2['ERROR'] = 3)] = 'ERROR';
  LogLevel2[(LogLevel2['OFF'] = 4)] = 'OFF';
  return LogLevel2;
})(LogLevel || {});
const LOG_LEVEL_NAMES = {
  [0 /* DEBUG */]: 'DEBUG',
  [1 /* INFO */]: 'INFO',
  [2 /* WARN */]: 'WARN',
  [3 /* ERROR */]: 'ERROR',
  [4 /* OFF */]: 'OFF',
};
var FSMComponent = /* @__PURE__ */ ((FSMComponent2) => {
  FSMComponent2['APPLICATION'] = 'APPLICATION';
  FSMComponent2['CONNECTION'] = 'CONNECTION';
  FSMComponent2['TIMER'] = 'TIMER';
  FSMComponent2['WEBVIEW'] = 'WEBVIEW';
  FSMComponent2['AUTH'] = 'AUTH';
  FSMComponent2['DATA'] = 'DATA';
  FSMComponent2['ADAPTER'] = 'ADAPTER';
  FSMComponent2['MACHINE'] = 'MACHINE';
  return FSMComponent2;
})(FSMComponent || {});
const DEFAULT_CONFIG = {
  enabled: true,
  level: 0 /* DEBUG */,
  // More verbose logging by default
  components: {
    ['APPLICATION' /* APPLICATION */]: true,
    ['CONNECTION' /* CONNECTION */]: true,
    ['TIMER' /* TIMER */]: true,
    ['WEBVIEW' /* WEBVIEW */]: true,
    // Enable webview logging
    ['AUTH' /* AUTH */]: true,
    ['DATA' /* DATA */]: true,
    // Enable data logging
    ['ADAPTER' /* ADAPTER */]: true,
    // Enable adapter logging
    ['MACHINE' /* MACHINE */]: true,
    // Enable machine logging
  },
  destinations: {
    console: true,
    outputChannel: true,
    file: false,
  },
  includeTimestamp: true,
  includeStackTrace: false,
  maxLogEntries: 1e3,
  contextTracking: true,
};
class FSMLogger {
  static instance;
  config = DEFAULT_CONFIG;
  logBuffer = [];
  outputChannel;
  logCounter = 0;
  configListeners = [];
  constructor() {
    this.loadConfiguration();
  }
  static getInstance() {
    if (!FSMLogger.instance) {
      FSMLogger.instance = new FSMLogger();
    }
    return FSMLogger.instance;
  }
  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================
  loadConfiguration() {
    try {
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
        this.config = { ...DEFAULT_CONFIG };
      }
      this.configListeners.forEach((listener) => listener(this.config));
    } catch (error) {
      console.error('[FSMLogger] Failed to load configuration:', error);
      this.config = { ...DEFAULT_CONFIG };
    }
  }
  updateConfiguration(updates) {
    this.config = { ...this.config, ...updates };
    this.configListeners.forEach((listener) => listener(this.config));
    try {
      if (typeof vscode !== 'undefined' && vscode?.workspace) {
        const vscodeConfig = vscode.workspace.getConfiguration('azureDevOpsIntegration.logging');
        Object.entries(updates).forEach(([key, value]) => {
          vscodeConfig.update(key, value, vscode.ConfigurationTarget.Global);
        });
      }
    } catch (error) {
      console.error('[FSMLogger] Failed to persist configuration:', error);
    }
  }
  onConfigurationChange(listener) {
    this.configListeners.push(listener);
    if (vscode && vscode.Disposable) {
      return new vscode.Disposable(() => {
        const index = this.configListeners.indexOf(listener);
        if (index >= 0) {
          this.configListeners.splice(index, 1);
        }
      });
    } else {
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
  getOutputChannel() {
    if (!this.outputChannel) {
      if (typeof vscode !== 'undefined' && vscode?.window) {
        this.outputChannel = vscode.window.createOutputChannel('Azure DevOps Int (FSM)');
      } else {
        return null;
      }
    }
    return this.outputChannel;
  }
  // ============================================================================
  // CORE LOGGING METHODS
  // ============================================================================
  shouldLog(level, component) {
    if (!this.config.enabled) return false;
    if (level < this.config.level) return false;
    if (!this.config.components[component]) return false;
    return true;
  }
  createLogEntry(level, component, message, context, data) {
    const entry = {
      id: `log_${++this.logCounter}`,
      timestamp: Date.now(),
      level,
      component,
      message,
      context: this.config.contextTracking ? context : void 0,
      data,
    };
    if (this.config.includeStackTrace && level >= 2 /* WARN */) {
      entry.stackTrace = new Error().stack;
    }
    return entry;
  }
  formatLogEntry(entry) {
    const timestamp = this.config.includeTimestamp ? new Date(entry.timestamp).toISOString() : '';
    const level = LOG_LEVEL_NAMES[entry.level].padEnd(5);
    const component = `[${entry.component}]`.padEnd(12);
    let contextStr = '';
    if (entry.context) {
      const parts = [];
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
      formatted += `
  Data: ${JSON.stringify(entry.data, null, 2)}`;
    }
    if (entry.stackTrace && this.config.includeStackTrace) {
      formatted += `
  Stack: ${entry.stackTrace}`;
    }
    return formatted;
  }
  writeToDestinations(entry) {
    const formatted = this.formatLogEntry(entry);
    if (this.config.destinations.console) {
      const consoleMethod =
        entry.level >= 3 /* ERROR */
          ? 'error'
          : entry.level >= 2 /* WARN */
            ? 'warn'
            : entry.level >= 1 /* INFO */
              ? 'info'
              : 'log';
      const emoji =
        entry.level >= 3 /* ERROR */
          ? '\u{1F534}'
          : entry.level >= 2 /* WARN */
            ? '\u{1F7E1}'
            : entry.level >= 1 /* INFO */
              ? '\u{1F7E2}'
              : '\u{1F535}';
      const enhancedFormatted = `${emoji} [AzureDevOpsInt][FSM][${entry.component}] ${formatted}`;
      console.log(enhancedFormatted);
      if (consoleMethod !== 'log') {
        console[consoleMethod](`\u21B3 ${formatted}`);
      }
    }
    if (this.config.destinations.outputChannel) {
      const outputChannel = this.getOutputChannel();
      if (outputChannel) {
        outputChannel.appendLine(formatted);
      }
    }
    if (this.config.destinations.file) {
    }
  }
  addToBuffer(entry) {
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.config.maxLogEntries) {
      this.logBuffer = this.logBuffer.slice(-this.config.maxLogEntries);
    }
  }
  log(level, component, message, context, data) {
    if (!this.shouldLog(level, component)) return;
    const entry = this.createLogEntry(level, component, message, context, data);
    this.addToBuffer(entry);
    this.writeToDestinations(entry);
  }
  // ============================================================================
  // PUBLIC LOGGING API
  // ============================================================================
  debug(component, message, context, data) {
    this.log(0 /* DEBUG */, component, message, context, data);
  }
  info(component, message, context, data) {
    this.log(1 /* INFO */, component, message, context, data);
  }
  warn(component, message, context, data) {
    this.log(2 /* WARN */, component, message, context, data);
  }
  error(component, message, context, data) {
    this.log(3 /* ERROR */, component, message, context, data);
  }
  // ============================================================================
  // FSM-SPECIFIC LOGGING HELPERS
  // ============================================================================
  logStateTransition(component, instanceId, fromState, toState, event, machineId) {
    this.info(component, `State transition: ${fromState} \u2192 ${toState}`, {
      component,
      instanceId,
      state: toState,
      event,
      machineId,
    });
  }
  logFSMEvent(component, instanceId, event, currentState, machineId, data) {
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
  logFSMError(component, instanceId, error, currentState, machineId) {
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
  logConnectionActivity(connectionId, activity, state, data) {
    this.info(
      'CONNECTION' /* CONNECTION */,
      activity,
      {
        component: 'CONNECTION' /* CONNECTION */,
        connectionId,
        state,
      },
      data
    );
  }
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  getLogBuffer() {
    return [...this.logBuffer];
  }
  clearLogBuffer() {
    this.logBuffer = [];
  }
  exportLogs() {
    return this.logBuffer.map((entry) => this.formatLogEntry(entry)).join('\n');
  }
  getConfiguration() {
    return { ...this.config };
  }
  showOutputChannel() {
    const outputChannel = this.getOutputChannel();
    if (outputChannel) {
      outputChannel.show(true);
    }
  }
  getStats() {
    const stats = {
      totalEntries: this.logBuffer.length,
      entriesByLevel: {},
      entriesByComponent: {},
    };
    Object.values(LogLevel).forEach((level) => {
      if (typeof level === 'number') {
        stats.entriesByLevel[level] = 0;
      }
    });
    Object.values(FSMComponent).forEach((component) => {
      stats.entriesByComponent[component] = 0;
    });
    this.logBuffer.forEach((entry) => {
      stats.entriesByLevel[entry.level]++;
      stats.entriesByComponent[entry.component]++;
    });
    return stats;
  }
}
const fsmLogger = FSMLogger.getInstance();
function createComponentLogger(component, instanceId) {
  return {
    debug: (message, context, data) =>
      fsmLogger.debug(component, message, { component, instanceId, ...context }, data),
    info: (message, context, data) =>
      fsmLogger.info(component, message, { component, instanceId, ...context }, data),
    warn: (message, context, data) =>
      fsmLogger.warn(component, message, { component, instanceId, ...context }, data),
    error: (message, context, data) =>
      fsmLogger.error(component, message, { component, instanceId, ...context }, data),
    logStateTransition: (fromState, toState, event, machineId) =>
      fsmLogger.logStateTransition(
        component,
        instanceId || 'unknown',
        fromState,
        toState,
        event,
        machineId
      ),
    logEvent: (event, currentState, machineId, data) =>
      fsmLogger.logFSMEvent(
        component,
        instanceId || 'unknown',
        event,
        currentState,
        machineId,
        data
      ),
    logError: (error, currentState, machineId) =>
      fsmLogger.logFSMError(component, instanceId || 'unknown', error, currentState, machineId),
  };
}
export { FSMComponent, FSMLogger, LOG_LEVEL_NAMES, LogLevel, createComponentLogger, fsmLogger };
