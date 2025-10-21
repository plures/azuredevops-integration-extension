/**
 * Debug Console Bridge
 * 
 * Creates a bridge between the debug console and VS Code commands
 * to make FSM logs easily accessible for debugging assistance.
 */

import * as vscode from 'vscode';

// Store console logs in memory for easy access
const debugLogBuffer: string[] = [];
const MAX_DEBUG_LOGS = 500;

// Override console methods to capture logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

function captureLog(level: string, ...args: any[]) {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  
  const logEntry = `${timestamp} [${level}] ${message}`;
  debugLogBuffer.push(logEntry);
  
  // Maintain buffer size
  if (debugLogBuffer.length > MAX_DEBUG_LOGS) {
    debugLogBuffer.splice(0, debugLogBuffer.length - MAX_DEBUG_LOGS);
  }
}

// Wrap console methods
console.log = (...args: any[]) => {
  captureLog('LOG', ...args);
  originalConsoleLog(...args);
};

console.error = (...args: any[]) => {
  captureLog('ERROR', ...args);
  originalConsoleError(...args);
};

console.warn = (...args: any[]) => {
  captureLog('WARN', ...args);
  originalConsoleWarn(...args);
};

console.info = (...args: any[]) => {
  captureLog('INFO', ...args);
  originalConsoleInfo(...args);
};

/**
 * Get recent debug console logs
 */
export function getRecentDebugLogs(count: number = 50): string[] {
  return debugLogBuffer.slice(-count);
}

/**
 * Get FSM-specific debug logs
 */
export function getFSMDebugLogs(count: number = 100): string[] {
  return debugLogBuffer
    .filter(log => log.includes('[FSM]'))
    .slice(-count);
}

/**
 * Export all captured debug logs
 */
export function exportAllDebugLogs(): string {
  return debugLogBuffer.join('\n');
}

/**
 * Register debug console bridge commands
 */
export function registerDebugConsoleBridge(context: vscode.ExtensionContext): void {
  // Command to show recent FSM debug logs in a new document
  const showFSMDebugLogsCmd = vscode.commands.registerCommand(
    'azureDevOpsInt.showFSMDebugLogs',
    async () => {
      const fsmLogs = getFSMDebugLogs(100);
      
      if (fsmLogs.length === 0) {
        vscode.window.showInformationMessage('No FSM debug logs found');
        return;
      }

      const content = `=== FSM Debug Console Logs ===
Generated: ${new Date().toISOString()}
Total FSM Log Entries: ${fsmLogs.length}

${fsmLogs.join('\n')}

=== End FSM Debug Logs ===`;

      // Create new document with logs
      const doc = await vscode.workspace.openTextDocument({
        content,
        language: 'log'
      });
      
      await vscode.window.showTextDocument(doc);
      
      vscode.window.showInformationMessage(
        `FSM debug logs exported (${fsmLogs.length} entries)`
      );
    }
  );

  // Command to copy FSM debug logs to clipboard
  const copyFSMDebugLogsCmd = vscode.commands.registerCommand(
    'azureDevOpsInt.copyFSMDebugLogs',
    async () => {
      const fsmLogs = getFSMDebugLogs(50);
      
      if (fsmLogs.length === 0) {
        vscode.window.showWarningMessage('No FSM debug logs to copy');
        return;
      }

      const content = fsmLogs.join('\n');
      await vscode.env.clipboard.writeText(content);
      
      vscode.window.showInformationMessage(
        `Copied ${fsmLogs.length} FSM debug log entries to clipboard`
      );
    }
  );

  // Command to show all recent debug logs
  const showAllDebugLogsCmd = vscode.commands.registerCommand(
    'azureDevOpsInt.showAllDebugLogs',
    async () => {
      const allLogs = getRecentDebugLogs(200);
      
      if (allLogs.length === 0) {
        vscode.window.showInformationMessage('No debug logs found');
        return;
      }

      const content = `=== All Debug Console Logs ===
Generated: ${new Date().toISOString()}
Total Log Entries: ${allLogs.length}

${allLogs.join('\n')}

=== End Debug Logs ===`;

      const doc = await vscode.workspace.openTextDocument({
        content,
        language: 'log'
      });
      
      await vscode.window.showTextDocument(doc);
    }
  );

  context.subscriptions.push(
    showFSMDebugLogsCmd,
    copyFSMDebugLogsCmd,
    showAllDebugLogsCmd
  );
}

/**
 * Clear the debug log buffer
 */
export function clearDebugLogBuffer(): void {
  debugLogBuffer.length = 0;
}