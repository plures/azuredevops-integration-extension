/**
 * Module: src/features/commands/handlers.ts
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
import { createLogger } from '../../logging/unifiedLogger.js';

const logger = createLogger('commands-handlers');
import { FSMSetupService } from '../../fsm/services/fsmSetupService.js';
import {
  getOutputChannel,
  setOutputChannel,
  logLine,
  getLogBufferSnapshot,
} from '../../logging.js';
import { performanceMonitor } from '../../performance.js';
import type { CommandHandler } from './types.js';

// Import the actual implementations from activation.ts
// These will be moved to separate modules in future extractions
async function loadConnectionsFromConfig(_context: vscode.ExtensionContext) {
  // Implementation for loading connections
}

async function signInWithEntra(_context: vscode.ExtensionContext, _connectionId?: string) {
  // Implementation for Entra sign in
}

async function signOutEntra(_context: vscode.ExtensionContext, _connectionId?: string) {
  // Implementation for Entra sign out
}

async function setOpenAIApiKey(_context: vscode.ExtensionContext) {
  // Implementation for setting OpenAI API key
}

async function cycleAuthSignIn(_context: vscode.ExtensionContext) {
  // Implementation for cycling auth sign in
}

async function diagnoseWorkItemsIssue(_context: vscode.ExtensionContext) {
  // Implementation for work items diagnosis
}

function getConfig() {
  return vscode.workspace.getConfiguration('azureDevOpsIntegration');
}

function _getExtensionVersion(_context: vscode.ExtensionContext): string {
  return _context.extension.packageJSON.version || 'dev';
}

// Import the dispatchApplicationEvent function from activation.ts
// This ensures events are handled by the actual implementation with work item dialogs, etc.
import { dispatchApplicationEvent } from '../../activation.js';

// Setup Commands
export const setupCommand: CommandHandler = async (ctx) => {
  const setupService = new FSMSetupService(ctx.context);
  await setupService.startSetup();
  // After setup, refresh connections from config
  await loadConnectionsFromConfig(ctx.context);
};

// Authentication Commands
export const signInWithEntraCommand: CommandHandler = async (_ctx, target?: unknown) => {
  return signInWithEntra(_ctx.context, typeof target === 'string' ? target : (target as any)?.id);
};

export const signOutEntraCommand: CommandHandler = async (_ctx, target?: unknown) => {
  return signOutEntra(_ctx.context, typeof target === 'string' ? target : (target as any)?.id);
};

// Logging Commands
export const openLogsCommand: CommandHandler = async (_ctx) => {
  try {
    let channel = getOutputChannel();
    if (!channel) {
      channel = vscode.window.createOutputChannel('Azure DevOps Integration');
      setOutputChannel(channel);
      logLine('[logs] Output channel created on demand');
    }
    channel.show(true);
    const currentConfig = getConfig();
    if (!currentConfig.get<boolean>('debugLogging')) {
      const pick = await vscode.window.showInformationMessage(
        'Verbose logging is currently disabled. Enable it to capture more diagnostics?',
        'Enable',
        'Skip'
      );
      if (pick === 'Enable') {
        await currentConfig.update('debugLogging', true, vscode.ConfigurationTarget.Global);
        logLine('[logs] Debug logging enabled');
      }
    }
  } catch (err) {
    logger.error('openLogs error', { meta: err });
  }
};

export const copyLogsToClipboardCommand: CommandHandler = async (_ctx) => {
  try {
    const version = _ctx.context.extension.packageJSON.version || 'dev';
    const buffer = getLogBufferSnapshot();
    const header = `Azure DevOps Integration Logs\nVersion: ${version}\nTimestamp: ${new Date().toISOString()}\nLines: ${buffer.length}\n---\n`;
    const body = buffer.join('\n');
    const text = header + body + (body.endsWith('\n') ? '' : '\n');
    await vscode.env.clipboard.writeText(text);
    vscode.window.showInformationMessage('Copied extension logs to clipboard.');
  } catch (err) {
    logger.error('copyLogsToClipboard error', { meta: err });
  }
};

export const openLogsFolderCommand: CommandHandler = async (_ctx) => {
  try {
    await vscode.commands.executeCommand('workbench.action.openLogsFolder');
  } catch {
    try {
      await vscode.env.openExternal((vscode.env as any).logUri ?? vscode.Uri.file(''));
    } catch (e: any) {
      vscode.window.showErrorMessage('Failed to open logs folder: ' + (e?.message || String(e)));
    }
  }
};

// Work Items Commands
export const diagnoseWorkItemsCommand: CommandHandler = async (_ctx) => {
  try {
    await diagnoseWorkItemsIssue(_ctx.context);
  } catch (e: any) {
    vscode.window.showErrorMessage('Diagnostic failed: ' + (e?.message || String(e)));
  }
};

export const focusWorkItemsViewCommand: CommandHandler = (_ctx) => {
  vscode.commands.executeCommand('azureDevOpsInt.workItemsView.focus');
};

export const setDefaultElapsedLimitCommand: CommandHandler = async (_ctx) => {
  const limit = await vscode.window.showInputBox({
    prompt: 'Enter default elapsed time limit (in minutes)',
    value: '480', // 8 hours default
    validateInput: (value) => {
      const num = parseInt(value);
      if (isNaN(num) || num <= 0) {
        return 'Please enter a valid positive number';
      }
      return null;
    },
  });

  if (limit) {
    const config = getConfig();
    await config.update('defaultElapsedLimit', parseInt(limit), vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`Default elapsed limit set to ${limit} minutes`);
  }
};

export const showWorkItemsCommand: CommandHandler = (_ctx) => {
  vscode.commands.executeCommand('azureDevOpsInt.workItemsView.focus');
};

export const refreshWorkItemsCommand: CommandHandler = async (_ctx) => {
  // Dispatch REFRESH_DATA event to FSM - this triggers the same refresh process
  // as changing the query selector (transitions to loadingData state, invokes loadData actor)
  dispatchApplicationEvent({ type: 'REFRESH_DATA' });

  // Also send message to webview to trigger the full refresh process
  // (the WebviewHeader button has its own onclick CSS spin animation)
  const { panel } = await import('../../activation.js');
  if (panel?.webview) {
    panel.webview.postMessage({ type: 'REFRESH_DATA' });
  }

  // Note: No need to call provider.refresh() here - the FSM's loadData actor
  // handles this in the loadingData state for consistency with query changes
};

export const createWorkItemCommand: CommandHandler = (_ctx) => {
  dispatchApplicationEvent({ type: 'CREATE_WORK_ITEM' });
};

// Timer Commands
export const startTimerCommand: CommandHandler = (_ctx) => {
  dispatchApplicationEvent({ type: 'START_TIMER' });
};

export const pauseTimerCommand: CommandHandler = (_ctx) => {
  dispatchApplicationEvent({ type: 'PAUSE_TIMER' });
};

export const resumeTimerCommand: CommandHandler = (_ctx) => {
  dispatchApplicationEvent({ type: 'RESUME_TIMER' });
};

export const stopTimerCommand: CommandHandler = async (ctx) => {
  const result = await ctx.timer?.stop();
  if (result) {
    vscode.window.showInformationMessage(`Timer stopped. Elapsed: ${result.elapsedTime}`);
  }
};

export const showTimeReportCommand: CommandHandler = (_ctx) => {
  dispatchApplicationEvent({ type: 'SHOW_TIME_REPORT' });
};

// Branch Commands
export const createBranchCommand: CommandHandler = (_ctx) => {
  dispatchApplicationEvent({ type: 'CREATE_BRANCH' });
};

// Pull Request Commands
export const createPullRequestCommand: CommandHandler = (_ctx) => {
  dispatchApplicationEvent({ type: 'CREATE_PULL_REQUEST' });
};

export const showPullRequestsCommand: CommandHandler = (_ctx) => {
  dispatchApplicationEvent({ type: 'SHOW_PULL_REQUESTS' });
};

// Build Commands
export const showBuildStatusCommand: CommandHandler = (_ctx) => {
  dispatchApplicationEvent({ type: 'SHOW_BUILD_STATUS' });
};

// View Commands
export const toggleKanbanViewCommand: CommandHandler = (_ctx) => {
  // Dispatch TOGGLE_VIEW event - the FSM will toggle between list and kanban
  dispatchApplicationEvent({ type: 'TOGGLE_VIEW' });
};

export const toggleDebugViewCommand: CommandHandler = (_ctx) => {
  // Dispatch TOGGLE_DEBUG_VIEW event - the FSM will toggle the debug view
  dispatchApplicationEvent({ type: 'TOGGLE_DEBUG_VIEW' });
};

// Team Commands
export const selectTeamCommand: CommandHandler = (_ctx) => {
  dispatchApplicationEvent({ type: 'SELECT_TEAM' });
};

export const resetPreferredRepositoriesCommand: CommandHandler = (_ctx) => {
  dispatchApplicationEvent({ type: 'RESET_PREFERRED_REPOSITORIES' });
};

// Debug Commands
export const selfTestWebviewCommand: CommandHandler = (_ctx) => {
  dispatchApplicationEvent({ type: 'SELF_TEST_WEBVIEW' });
};

export const clearPerformanceDataCommand: CommandHandler = (_ctx) => {
  performanceMonitor.clear();
  vscode.window.showInformationMessage('Performance data cleared successfully');
};

export const forceGCCommand: CommandHandler = (_ctx) => {
  if (global.gc) {
    global.gc();
    vscode.window.showInformationMessage('Garbage collection forced');
  } else {
    vscode.window.showWarningMessage('Garbage collection not available');
  }
};

// Bulk Action Commands
export const bulkAssignCommand: CommandHandler = (_ctx) => {
  dispatchApplicationEvent({ type: 'BULK_ASSIGN' });
};

// OpenAI Commands
export const setOpenAIApiKeyCommand: CommandHandler = (ctx) => {
  return setOpenAIApiKey(ctx.context);
};

export const generateCopilotPromptCommand: CommandHandler = async (_ctx) => {
  // This would need access to activeConnectionId from the context
  // For now, we'll dispatch the event
  dispatchApplicationEvent({ type: 'GENERATE_COPILOT_PROMPT' });
};

export const cycleAuthSignInCommand: CommandHandler = (ctx) => {
  return cycleAuthSignIn(ctx.context);
};
