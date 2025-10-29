import * as vscode from 'vscode';
import type { WorkItemsProvider } from '../../provider.js';
import type { ProjectConnection as _ProjectConnection } from '../../fsm/machines/applicationMachine.js';
import type { BranchContext } from '../../fsm/functions/connection/branchEnrichment.js';

export interface CommandContext {
  context: vscode.ExtensionContext;
  panel?: vscode.WebviewView;
  provider?: WorkItemsProvider;
  timer?: any; // WorkItemTimer type
  sessionTelemetry?: any; // SessionTelemetryManager type
  client?: any; // AzureDevOpsIntClient type
  statusBarItem?: vscode.StatusBarItem;
  authStatusBarItem?: vscode.StatusBarItem;
}

export interface CommandHandler {
  (context: CommandContext, ...args: any[]): Promise<void> | void;
}

export interface CommandRegistration {
  command: string;
  handler: CommandHandler;
}

export interface LogCommandParams {
  logger?: (message: string, meta?: any) => void;
  connectionId?: string;
  items?: any[];
  kanbanView?: boolean;
  provider?: WorkItemsProvider;
  types?: string[];
  query?: string;
  branchContext?: BranchContext | null;
}

export interface TimerCommandParams {
  workItemId?: string;
  workItemTitle?: string;
  connectionId?: string;
}

export interface AuthCommandParams {
  target?: unknown;
  connectionId?: string;
}

export interface WorkItemCommandParams {
  connectionId?: string;
  workItemId?: string;
  workItemTitle?: string;
  teamId?: string;
  projectId?: string;
}

export interface BranchCommandParams {
  connectionId?: string;
  branchName?: string;
  repositoryId?: string;
  projectId?: string;
}

export interface PullRequestCommandParams {
  connectionId?: string;
  sourceBranch?: string;
  targetBranch?: string;
  repositoryId?: string;
  projectId?: string;
  title?: string;
  description?: string;
}

export interface BuildCommandParams {
  connectionId?: string;
  buildId?: string;
  projectId?: string;
}

export interface TeamCommandParams {
  connectionId?: string;
  teamId?: string;
  projectId?: string;
}

export interface RepositoryCommandParams {
  connectionId?: string;
  repositoryId?: string;
  projectId?: string;
}

export interface DebugCommandParams {
  connectionId?: string;
  debugMode?: boolean;
}

export interface PerformanceCommandParams {
  clearData?: boolean;
  forceGC?: boolean;
}

export interface OpenAICommandParams {
  apiKey?: string;
  prompt?: string;
}

export interface BulkActionCommandParams {
  connectionId?: string;
  workItemIds?: string[];
  action?: string;
  value?: any;
}
