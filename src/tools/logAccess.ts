/**
 * Module: src/fsm/tools/logAccess.ts
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
 * Automated FSM Log Access Tool
 *
 * This tool provides programmatic access to FSM logs for AI debugging assistance.
 */

import * as vscode from 'vscode';

/**
 * Get current FSM logs for AI analysis
 */
export async function getCurrentFSMLogs(): Promise<{
  success: boolean;
  logs?: string;
  error?: string;
  stats?: any;
}> {
  try {
    // Execute the command to get FSM logs
    const result = await vscode.commands.executeCommand('azureDevOpsInt.getFSMLogs', {
      format: 'text',
      filter: {
        lastMinutes: 10, // Get logs from last 10 minutes
      },
    });

    if (typeof result === 'string') {
      return {
        success: true,
        logs: result,
      };
    } else if (typeof result === 'object' && result !== null) {
      return {
        success: true,
        logs: (result as any).logs?.join('\n') || 'No logs found',
        stats: (result as any).stats,
      };
    } else {
      return {
        success: false,
        error: 'Unexpected result format from FSM logs command',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to retrieve FSM logs: ${error}`,
    };
  }
}

/**
 * Get filtered FSM logs based on criteria
 */
export async function getFilteredFSMLogs(filter: {
  component?: string;
  level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  lastMinutes?: number;
  pattern?: string;
}): Promise<{
  success: boolean;
  logs?: string;
  error?: string;
}> {
  try {
    const result = await vscode.commands.executeCommand('azureDevOpsInt.getFSMLogs', {
      format: 'text',
      filter,
    });

    return {
      success: true,
      logs: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to retrieve filtered FSM logs: ${error}`,
    };
  }
}

/**
 * Get FSM system status and recent activity
 */
export async function getFSMSystemStatus(): Promise<{
  success: boolean;
  status?: {
    isActive: boolean;
    componentsActive: string[];
    recentErrors: string[];
    lastActivity?: string;
  };
  error?: string;
}> {
  try {
    const result = await vscode.commands.executeCommand('azureDevOpsInt.getFSMLogs', {
      format: 'json',
    });

    if (typeof result === 'object' && result !== null) {
      const data = result as any;
      return {
        success: true,
        status: {
          isActive: data.stats?.totalLogs > 0,
          componentsActive: data.stats?.componentsActive || [],
          recentErrors: data.logs?.filter((log: string) => log.includes('ERROR')).slice(-5) || [],
          lastActivity: data.stats?.lastLogTime,
        },
      };
    } else {
      return {
        success: false,
        error: 'Unable to parse FSM system status',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to get FSM system status: ${error}`,
    };
  }
}

export { getCurrentFSMLogs as default };
