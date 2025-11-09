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
  context: vscode.ExtensionContext,
  commandContext: CommandContext
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  for (const registration of commandRegistrations) {
    const disposable = vscode.commands.registerCommand(registration.command, (...args: any[]) => {
      try {
        const result = registration.handler(commandContext, ...args);
        if (result instanceof Promise) {
          result.catch((error) => {
            logger.error(`Error in command ${registration.command}`, { meta: error });
            vscode.window.showErrorMessage(`Command failed: ${error.message}`);
          });
        }
      } catch (error) {
        logger.error(`Error in command ${registration.command}`, { meta: error });
        vscode.window.showErrorMessage(`Command failed: ${error.message}`);
      }
    });
    disposables.push(disposable);
  }

  return disposables;
}

export function safeCommandHandler(handler: (...args: any[]) => Promise<void> | void) {
  return async (...args: any[]) => {
    try {
      await handler(...args);
    } catch (error) {
      logger.error('Command handler error', { meta: error });
      vscode.window.showErrorMessage(`Command failed: ${error.message}`);
    }
  };
}
