/**
 * Module: src/fsm/commands/outputChannelReader.ts
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
 * Output Channel Reader for FSM Debug Integration
 *
 * This module provides programmatic access to VS Code Output Channel content
 * allowing automated debugging tools to read FSM logs directly.
 */

import * as vscode from 'vscode';
import { componentLogger } from '../logging/ComponentLogger.js';

export class OutputChannelReader {
  private static instance: OutputChannelReader;
  private logBuffer: string[] = [];
  private maxBufferSize = 1000; // Keep last 1000 log entries

  private constructor() {
    // Hook into the FSM logger to capture all output
    this.setupLogCapture();
  }

  public static getInstance(): OutputChannelReader {
    if (!OutputChannelReader.instance) {
      OutputChannelReader.instance = new OutputChannelReader();
    }
    return OutputChannelReader.instance;
  }

  /**
   * Setup log capture by intercepting FSM logger output
   */
  private setupLogCapture(): void {
    // Store original methods
    const originalAppendLine = componentLogger.outputChannel?.appendLine?.bind(
      componentLogger.outputChannel
    );

    if (componentLogger.outputChannel && originalAppendLine) {
      // Override appendLine to capture logs
      componentLogger.outputChannel.appendLine = (value: string) => {
        // Add to our buffer
        this.logBuffer.push(`${new Date().toISOString()} ${value}`);

        // Maintain buffer size
        if (this.logBuffer.length > this.maxBufferSize) {
          this.logBuffer = this.logBuffer.slice(-this.maxBufferSize);
        }

        // Call original method
        return originalAppendLine(value);
      };
    }
  }

  /**
   * Get recent logs
   */
  public getRecentLogs(count: number = 50): string[] {
    return this.logBuffer.slice(-count);
  }

  /**
   * Get all captured logs
   */
  public getAllLogs(): string[] {
    return [...this.logBuffer];
  }

  /**
   * Get logs matching a pattern
   */
  public getLogsMatching(pattern: string | RegExp): string[] {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    return this.logBuffer.filter((log) => regex.test(log));
  }

  /**
   * Get logs from the last N minutes
   */
  public getLogsFromLastMinutes(minutes: number): string[] {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    return this.logBuffer.filter((log) => {
      const timestamp = log.substring(0, 24); // ISO timestamp length
      try {
        const logTime = new Date(timestamp);
        return logTime >= cutoffTime;
      } catch {
        return false;
      }
    });
  }

  /**
   * Export logs as formatted text
   */
  public exportLogsAsText(filter?: {
    component?: string;
    level?: string;
    lastMinutes?: number;
    pattern?: string | RegExp;
  }): string {
    let logs = this.logBuffer;

    if (filter) {
      if (filter.lastMinutes) {
        logs = this.getLogsFromLastMinutes(filter.lastMinutes);
      }

      if (filter.component) {
        logs = logs.filter((log) => log.includes(`[${filter.component}]`));
      }

      if (filter.level) {
        const level = filter.level;
        logs = logs.filter((log) => log.includes(level));
      }

      if (filter.pattern) {
        const regex =
          typeof filter.pattern === 'string' ? new RegExp(filter.pattern, 'i') : filter.pattern;
        logs = logs.filter((log) => regex.test(log));
      }
    }

    return logs.join('\n');
  }

  /**
   * Clear the log buffer
   */
  public clearBuffer(): void {
    this.logBuffer = [];
  }

  /**
   * Get summary statistics about captured logs
   */
  public getLogStats(): {
    totalLogs: number;
    componentsActive: string[];
    lastLogTime?: string;
    errorCount: number;
    warningCount: number;
  } {
    const components = new Set<string>();
    let errorCount = 0;
    let warningCount = 0;
    let lastLogTime: string | undefined;

    this.logBuffer.forEach((log) => {
      // Extract component from log format: [AzureDevOpsInt][FSM][COMPONENT]
      const componentMatch = log.match(/\[FSM\]\[([^\]]+)\]/);
      if (componentMatch) {
        components.add(componentMatch[1]);
      }

      // Count error/warnings
      if (log.includes('ERROR')) errorCount++;
      if (log.includes('WARN')) warningCount++;

      // Update last log time
      const timestamp = log.substring(0, 24);
      if (timestamp.includes('T')) {
        lastLogTime = timestamp;
      }
    });

    return {
      totalLogs: this.logBuffer.length,
      componentsActive: Array.from(components),
      lastLogTime,
      errorCount,
      warningCount,
    };
  }
}

/**
 * Command to get FSM logs for debugging
 */
export async function getFSMLogsForDebugging(_context: vscode.ExtensionContext): Promise<string> {
  const reader = OutputChannelReader.getInstance();
  const recentLogs = reader.getRecentLogs(100);
  const stats = reader.getLogStats();

  const report = `
=== FSM Debug Log Report ===
Generated: ${new Date().toISOString()}

=== Statistics ===
Total Logs: ${stats.totalLogs}
Active Components: ${stats.componentsActive.join(', ')}
Last Log: ${stats.lastLogTime || 'None'}
Errors: ${stats.errorCount}
Warnings: ${stats.warningCount}

=== Recent Logs (Last 100) ===
${recentLogs.join('\n')}

=== End Report ===
`;

  return report;
}

/**
 * Register command for external access to logs
 */
export function registerOutputChannelReader(context: vscode.ExtensionContext): void {
  // Initialize the reader
  const reader = OutputChannelReader.getInstance();

  // Register command for programmatic access
  const disposable = vscode.commands.registerCommand(
    'azureDevOpsInt.getFSMLogs',
    async (options?: {
      format?: 'text' | 'json';
      filter?: {
        component?: string;
        level?: string;
        lastMinutes?: number;
        pattern?: string;
      };
    }) => {
      try {
        if (options?.format === 'json') {
          return {
            logs: reader.getAllLogs(),
            stats: reader.getLogStats(),
            timestamp: new Date().toISOString(),
          };
        } else {
          return await getFSMLogsForDebugging(context);
        }
      } catch (error) {
        // Use console.debug since this is a debug command and logging system may not be available
        console.debug('[AzureDevOpsInt] [OutputChannelReader] Error getting FSM logs:', error);
        return `Error retrieving FSM logs: ${error}`;
      }
    }
  );

  context.subscriptions.push(disposable);

  // Register additional debugging command
  const debugCommand = vscode.commands.registerCommand('azureDevOpsInt.exportFSMLogs', async () => {
    try {
      const logs = await getFSMLogsForDebugging(context);

      // Create a new untitled document with the logs
      const doc = await vscode.workspace.openTextDocument({
        content: logs,
        language: 'log',
      });

      await vscode.window.showTextDocument(doc);

      vscode.window.showInformationMessage('FSM logs exported to new document');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to export FSM logs: ${error}`);
    }
  });

  context.subscriptions.push(debugCommand);
}
