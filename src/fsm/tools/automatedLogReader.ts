/**
 * FSM Log Reader Tool for VS Code Extension
 *
 * This tool provides automated access to FSM logs for debugging assistance.
 * It can be used by AI assistants to automatically read and analyze FSM output
 * without requiring manual copy-paste from the user.
 */

import * as vscode from 'vscode';

export interface FSMLogEntry {
  timestamp: string;
  component: string;
  level: string;
  message: string;
  data?: any;
}

export interface FSMLogFilter {
  component?: string;
  level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  lastMinutes?: number;
  pattern?: string | RegExp;
}

/**
 * Tool function to read FSM logs automatically
 * This is the main entry point for AI assistants
 */
export async function readFSMLogs(options?: {
  recent?: number;
  filter?: FSMLogFilter;
  format?: 'text' | 'structured';
}): Promise<{
  success: boolean;
  logs: string | FSMLogEntry[];
  stats?: {
    totalEntries: number;
    components: string[];
    errorCount: number;
    warningCount: number;
    timeRange?: { start: string; end: string };
  };
  error?: string;
}> {
  try {
    // Execute the VS Code command to get FSM logs
    const commandResult = await vscode.commands.executeCommand('azureDevOpsInt.getFSMLogs', {
      format: options?.format || 'text',
      filter: options?.filter,
    });

    if (typeof commandResult === 'string') {
      // Text format response
      const lines = commandResult.split('\n').filter((line) => line.trim());
      const recentLines = options?.recent ? lines.slice(-options.recent) : lines;

      return {
        success: true,
        logs: recentLines.join('\n'),
        stats: generateStatsFromText(recentLines),
      };
    } else if (typeof commandResult === 'object' && commandResult !== null) {
      // JSON format response
      const data = commandResult as any;

      return {
        success: true,
        logs: data.logs || [],
        stats: data.stats || {},
      };
    } else {
      return {
        success: false,
        logs: '',
        error: 'No log data received from FSM system',
      };
    }
  } catch (error) {
    return {
      success: false,
      logs: '',
      error: `Failed to read FSM logs: ${error}`,
    };
  }
}

/**
 * Get current FSM system status
 */
export async function getFSMStatus(): Promise<{
  success: boolean;
  status?: {
    isActive: boolean;
    activeComponents: string[];
    lastActivity?: string;
    healthCheck: 'healthy' | 'warning' | 'error';
    recentIssues: string[];
  };
  error?: string;
}> {
  try {
    const logResult = await readFSMLogs({
      recent: 50,
      format: 'text',
    });

    if (!logResult.success) {
      return {
        success: false,
        error: logResult.error,
      };
    }

    const logs = logResult.logs as string;
    const lines = logs.split('\n');

    // Parse status from recent logs
    const components = new Set<string>();
    const issues: string[] = [];
    let lastActivity: string | undefined;
    let errorCount = 0;
    let warningCount = 0;

    lines.forEach((line) => {
      // Extract timestamp
      const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
      if (timestampMatch) {
        lastActivity = timestampMatch[1];
      }

      // Extract component
      const componentMatch = line.match(/\[([^\]]+)\]/);
      if (componentMatch) {
        components.add(componentMatch[1]);
      }

      // Count issues
      if (line.includes('ERROR')) {
        errorCount++;
        issues.push(line);
      }
      if (line.includes('WARN')) {
        warningCount++;
        issues.push(line);
      }
    });

    const healthCheck = errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'healthy';

    return {
      success: true,
      status: {
        isActive: lines.length > 0,
        activeComponents: Array.from(components),
        lastActivity,
        healthCheck,
        recentIssues: issues.slice(-5), // Last 5 issues
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get FSM status: ${error}`,
    };
  }
}

/**
 * Search FSM logs for specific patterns or issues
 */
export async function searchFSMLogs(query: {
  pattern: string | RegExp;
  component?: string;
  level?: string;
  lastMinutes?: number;
}): Promise<{
  success: boolean;
  matches: string[];
  totalMatches: number;
  error?: string;
}> {
  try {
    const logResult = await readFSMLogs({
      filter: {
        component: query.component,
        level: query.level as any,
        lastMinutes: query.lastMinutes,
        pattern: query.pattern,
      },
    });

    if (!logResult.success) {
      return {
        success: false,
        matches: [],
        totalMatches: 0,
        error: logResult.error,
      };
    }

    const logs = logResult.logs as string;
    const lines = logs.split('\n').filter((line) => line.trim());

    const regex =
      typeof query.pattern === 'string' ? new RegExp(query.pattern, 'i') : query.pattern;

    const matches = lines.filter((line) => regex.test(line));

    return {
      success: true,
      matches,
      totalMatches: matches.length,
    };
  } catch (error) {
    return {
      success: false,
      matches: [],
      totalMatches: 0,
      error: `Failed to search FSM logs: ${error}`,
    };
  }
}

/**
 * Helper function to generate stats from text logs
 */
function generateStatsFromText(lines: string[]): {
  totalEntries: number;
  components: string[];
  errorCount: number;
  warningCount: number;
  timeRange?: { start: string; end: string };
} {
  const components = new Set<string>();
  let errorCount = 0;
  let warningCount = 0;
  const timestamps: string[] = [];

  lines.forEach((line) => {
    // Extract components
    const componentMatch = line.match(/\[([^\]]+)\]/);
    if (componentMatch) {
      components.add(componentMatch[1]);
    }

    // Count levels
    if (line.includes('ERROR')) errorCount++;
    if (line.includes('WARN')) warningCount++;

    // Extract timestamps
    const timestampMatch = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
    if (timestampMatch) {
      timestamps.push(timestampMatch[1]);
    }
  });

  const timeRange =
    timestamps.length > 0
      ? {
          start: timestamps[0],
          end: timestamps[timestamps.length - 1],
        }
      : undefined;

  return {
    totalEntries: lines.length,
    components: Array.from(components),
    errorCount,
    warningCount,
    timeRange,
  };
}

// Export the main function as default
export default readFSMLogs;
