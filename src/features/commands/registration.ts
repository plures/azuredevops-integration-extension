/**
 * Module: src/features/commands/registration.ts
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

const logger = createLogger('commands-registration');
import type { CommandContext, CommandRegistration } from './types.js';
import {
  setupCommand,
  signInWithEntraCommand,
  signOutEntraCommand,
  openLogsCommand,
  copyLogsToClipboardCommand,
  openLogsFolderCommand,
  diagnoseWorkItemsCommand,
  focusWorkItemsViewCommand,
  setDefaultElapsedLimitCommand,
  showWorkItemsCommand,
  refreshWorkItemsCommand,
  createWorkItemCommand,
  startTimerCommand,
  pauseTimerCommand,
  resumeTimerCommand,
  stopTimerCommand,
  showTimeReportCommand,
  createBranchCommand,
  createPullRequestCommand,
  showPullRequestsCommand,
  showBuildStatusCommand,
  toggleKanbanViewCommand,
  toggleDebugViewCommand,
  selectTeamCommand,
  resetPreferredRepositoriesCommand,
  selfTestWebviewCommand,
  clearPerformanceDataCommand,
  forceGCCommand,
  bulkAssignCommand,
  setOpenAIApiKeyCommand,
  generateCopilotPromptCommand,
  cycleAuthSignInCommand,
} from './handlers.js';

export const commandRegistrations: CommandRegistration[] = [
  { command: 'azureDevOpsInt.setup', handler: setupCommand },
  { command: 'azureDevOpsInt.signInWithEntra', handler: signInWithEntraCommand },
  { command: 'azureDevOpsInt.signOutEntra', handler: signOutEntraCommand },
  { command: 'azureDevOpsInt.openLogs', handler: openLogsCommand },
  { command: 'azureDevOpsInt.copyLogsToClipboard', handler: copyLogsToClipboardCommand },
  { command: 'azureDevOpsInt.diagnoseWorkItems', handler: diagnoseWorkItemsCommand },
  { command: 'azureDevOpsInt.openLogsFolder', handler: openLogsFolderCommand },
  { command: 'azureDevOpsInt.focusWorkItemsView', handler: focusWorkItemsViewCommand },
  { command: 'azureDevOpsInt.setDefaultElapsedLimit', handler: setDefaultElapsedLimitCommand },
  { command: 'azureDevOpsInt.showWorkItems', handler: showWorkItemsCommand },
  { command: 'azureDevOpsInt.refreshWorkItems', handler: refreshWorkItemsCommand },
  { command: 'azureDevOpsInt.createWorkItem', handler: createWorkItemCommand },
  { command: 'azureDevOpsInt.startTimer', handler: startTimerCommand },
  { command: 'azureDevOpsInt.pauseTimer', handler: pauseTimerCommand },
  { command: 'azureDevOpsInt.resumeTimer', handler: resumeTimerCommand },
  { command: 'azureDevOpsInt.stopTimer', handler: stopTimerCommand },
  { command: 'azureDevOpsInt.showTimeReport', handler: showTimeReportCommand },
  { command: 'azureDevOpsInt.createBranch', handler: createBranchCommand },
  { command: 'azureDevOpsInt.createPullRequest', handler: createPullRequestCommand },
  { command: 'azureDevOpsInt.showPullRequests', handler: showPullRequestsCommand },
  { command: 'azureDevOpsInt.showBuildStatus', handler: showBuildStatusCommand },
  { command: 'azureDevOpsInt.toggleKanbanView', handler: toggleKanbanViewCommand },
  { command: 'azureDevOpsInt.toggleDebugView', handler: toggleDebugViewCommand },
  { command: 'azureDevOpsInt.selectTeam', handler: selectTeamCommand },
  {
    command: 'azureDevOpsInt.resetPreferredRepositories',
    handler: resetPreferredRepositoriesCommand,
  },
  { command: 'azureDevOpsInt.selfTestWebview', handler: selfTestWebviewCommand },
  { command: 'azureDevOpsInt.clearPerformanceData', handler: clearPerformanceDataCommand },
  { command: 'azureDevOpsInt.forceGC', handler: forceGCCommand },
  { command: 'azureDevOpsInt.bulkAssign', handler: bulkAssignCommand },
  { command: 'azureDevOpsInt.setOpenAIApiKey', handler: setOpenAIApiKeyCommand },
  { command: 'azureDevOpsInt.generateCopilotPrompt', handler: generateCopilotPromptCommand },
  { command: 'azureDevOpsInt.cycleAuthSignIn', handler: cycleAuthSignInCommand },
];

export function registerCommands(
  _context: vscode.ExtensionContext,
  commandContext: CommandContext
): vscode.Disposable[] {
  const startTime = Date.now();
  const disposables: vscode.Disposable[] = [];
  const errors: Array<{ command: string; error: string }> = [];

  // Batch register all commands (optimization: reduce logging verbosity)
  for (const registration of commandRegistrations) {
    try {
      const disposable = vscode.commands.registerCommand(registration.command, (...args: any[]) => {
        logger.debug(`[COMMAND INVOKED] ${registration.command}`, {
          args,
          timestamp: new Date().toISOString(),
        });
        logger.info(`[Command Registration] Command invoked: ${registration.command}`, { args });
        try {
          const result = registration.handler(commandContext, ...args);
          if (result instanceof Promise) {
            result
              .then(() => {
                logger.debug(`[COMMAND SUCCESS] ${registration.command}`);
              })
              .catch((error) => {
                logger.debug(`[COMMAND ERROR] ${registration.command}`, { meta: error });
                logger.error(`Error in command ${registration.command}`, { meta: error });
                vscode.window.showErrorMessage(`Command failed: ${(error as any).message}`);
              });
          }
        } catch (error) {
          logger.debug(`[COMMAND SYNC ERROR] ${registration.command}`, { meta: error });
          logger.error(`Error in command ${registration.command}`, { meta: error });
          vscode.window.showErrorMessage(`Command failed: ${(error as any).message}`);
        }
      });
      disposables.push(disposable);
      
      // Special handling for signOutEntra (debugging purposes)
      if (registration.command === 'azureDevOpsInt.signOutEntra') {
        logger.debug(
          `[COMMAND REGISTERED] ${registration.command} - handler:`,
          { handlerType: typeof registration.handler }
        );
        logger.info(`[Command Registration] Registered signOutEntra command`, {
          handlerType: typeof registration.handler,
          handlerName: registration.handler?.name || 'anonymous',
        });
      }
    } catch (error) {
      const errorMsg = (error as any).message || String(error);
      errors.push({ command: registration.command, error: errorMsg });
      logger.debug(`[REGISTRATION ERROR] Failed to register ${registration.command}`, { meta: error });
      logger.error(`Failed to register command ${registration.command}`, { meta: error });
      if (registration.command === 'azureDevOpsInt.signOutEntra') {
        vscode.window.showErrorMessage(
          `Failed to register signOutEntra command: ${errorMsg}`
        );
      }
    }
  }

  // Single summary log instead of 32 individual logs (optimization)
  const duration = Date.now() - startTime;
  if (errors.length > 0) {
    logger.warn(
      `[Command Registration] Registered ${disposables.length}/${commandRegistrations.length} commands in ${duration}ms`,
      {
        errors: errors.map((e) => `${e.command}: ${e.error}`),
        failed: errors.length,
      }
    );
  } else {
    logger.info(
      `[Command Registration] Registered ${disposables.length} commands in ${duration}ms`
    );
  }

  return disposables;
}

export function safeCommandHandler(handler: (...args: any[]) => Promise<void> | void) {
  return async (...args: any[]) => {
    try {
      await handler(...args);
    } catch (error) {
      logger.error('Command handler error', { meta: error });
      vscode.window.showErrorMessage(`Command failed: ${(error as any).message}`);
    }
  };
}
