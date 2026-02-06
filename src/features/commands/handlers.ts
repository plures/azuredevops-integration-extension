/* eslint-disable max-lines */
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
import { FSMSetupService } from '../../services/setupService.js';
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
async function loadConnectionsFromConfig(context: vscode.ExtensionContext) {
  const { loadConnectionsFromConfig: loadConnections } = await import('../../activation.js');
  return loadConnections(context);
}

async function signInWithEntra(
  context: vscode.ExtensionContext,
  connectionId?: string
): Promise<void> {
  try {
    // Get active connection ID if not provided
    const { getApplicationStoreActor } = await import('../../activation.js');
    const actor = getApplicationStoreActor();
    const snapshot = actor?.getSnapshot?.();
    const activeConnectionId = connectionId || snapshot?.context?.activeConnectionId;

    if (!activeConnectionId) {
      vscode.window.showWarningMessage('No active connection to sign in with.');
      return;
    }

    // Get connection config to verify it's Entra
    const connections = snapshot?.context?.connections || [];
    const connection = connections.find((c: any) => c.id === activeConnectionId);

    if (!connection) {
      vscode.window.showWarningMessage('Connection not found.');
      return;
    }

    if (connection.authMethod !== 'entra') {
      vscode.window.showInformationMessage('This connection does not use Entra ID authentication.');
      return;
    }

    // Clear signed-out flag if it exists (user is explicitly signing in)
    const { clearSignedOutFlag } = await import('../../activation.js');
    if (typeof clearSignedOutFlag === 'function') {
      clearSignedOutFlag(activeConnectionId);
    }

    // Dispatch SIGN_IN_ENTRA event with forceInteractive to trigger new auth flow
    dispatchApplicationEvent({
      type: 'SIGN_IN_ENTRA',
      connectionId: activeConnectionId,
      forceInteractive: true,
    });

    // Also disconnect first to clear any cached tokens
    const { ConnectionService } = await import('../../praxis/connection/service.js');
    const connectionService = ConnectionService.getInstance();
    connectionService.disconnect(activeConnectionId);

    // Clear cached tokens
    const { clearEntraIdToken } = await import('../../services/auth/authentication.js');
    await clearEntraIdToken(context, connection.tenantId, connection.clientId);

    // Reconnect with interactive auth (this will use the new auth code flow if enabled)
    connectionService.setContext(context);
    await connectionService.connect(connection, {
      refresh: true,
      interactive: true,
    });
  } catch (error: any) {
    logger.error('signInWithEntra error', { meta: error });
    vscode.window.showErrorMessage(`Sign in failed: ${error.message || String(error)}`);
  }
}

/**
 * Clear all possible Entra ID token variations
 */
async function clearAllEntraTokens(
  context: vscode.ExtensionContext,
  connection: any,
  activeConnectionId: string
): Promise<void> {
  const authModule = await import('../../services/auth/authentication.js');
  const { clearEntraIdToken } = authModule;

  const tenantId = connection.tenantId || 'organizations';
  const AZURE_DEVOPS_CLIENT_ID = '872cd9fa-d31f-45e0-9eab-6e460a02d1f1';
  const AZURE_CLI_CLIENT_ID = '04b07795-8ddb-461a-bbee-02f9e1bf7b46';

  // Clear tokens for all possible combinations
  await clearEntraIdToken(context, tenantId, connection.clientId || AZURE_DEVOPS_CLIENT_ID);
  await clearEntraIdToken(context, tenantId, AZURE_DEVOPS_CLIENT_ID);
  await clearEntraIdToken(context, tenantId, AZURE_CLI_CLIENT_ID);
  await clearEntraIdToken(context, 'organizations', AZURE_DEVOPS_CLIENT_ID);
  await clearEntraIdToken(context, 'organizations', AZURE_CLI_CLIENT_ID);
  await clearEntraIdToken(context, 'organizations', undefined);
}

/**
 * Clear pending auth providers and MSAL cache
 */
async function clearAuthProviders(activeConnectionId: string): Promise<void> {
  const pendingAuthProviders = (globalThis as any).__pendingAuthProviders as
    | Map<string, any>
    | undefined;
  if (pendingAuthProviders) {
    const provider = pendingAuthProviders.get(activeConnectionId);
    if (provider && typeof provider.signOut === 'function') {
      await provider.signOut();
    }
    pendingAuthProviders.delete(activeConnectionId);
  }

  try {
    const { clearPendingAuthCodeFlowProvider } =
      await import('../../services/auth/authentication.js');
    clearPendingAuthCodeFlowProvider(activeConnectionId);
  } catch {
    // Ignore errors clearing provider
  }
}

/**
 * Disconnect connection and mark as signed out
 */
async function disconnectAndMarkSignedOut(activeConnectionId: string): Promise<void> {
  const { ConnectionService } = await import('../../praxis/connection/service.js');
  const connectionService = ConnectionService.getInstance();
  logger.info('[signOutEntra] Disconnecting connection', { connectionId: activeConnectionId });
  connectionService.disconnect(activeConnectionId);
  logger.info('[signOutEntra] Connection disconnected', { connectionId: activeConnectionId });

  // Clear connection state from connectionStates map
  try {
    const { clearConnectionState } = await import('../../activation.js');
    if (typeof clearConnectionState === 'function') {
      clearConnectionState(activeConnectionId);
      logger.info('[signOutEntra] Connection state cleared', { connectionId: activeConnectionId });
    }
  } catch {
    // Ignore if function doesn't exist
  }

  // Mark connection as recently signed out
  const { markConnectionSignedOut } = await import('../../activation.js');
  if (typeof markConnectionSignedOut === 'function') {
    logger.info('[signOutEntra] Marking connection as signed out', {
      connectionId: activeConnectionId,
    });
    markConnectionSignedOut(activeConnectionId);
    logger.info('[signOutEntra] Connection marked as signed out', {
      connectionId: activeConnectionId,
    });
  } else {
    logger.warn('[signOutEntra] markConnectionSignedOut function not available');
  }
}

async function signOutEntra(
  context: vscode.ExtensionContext,
  connectionId?: string
): Promise<void> {
  try {
    logger.info('[signOutEntra] Starting sign out', { connectionId });

    // Get active connection ID if not provided
    const { getApplicationStoreActor } = await import('../../activation.js');
    const actor = getApplicationStoreActor();
    const snapshot = actor?.getSnapshot?.();
    const activeConnectionId = connectionId || snapshot?.context?.activeConnectionId;

    logger.info('signOutEntra: Active connection ID', { activeConnectionId });

    if (!activeConnectionId) {
      logger.warn('signOutEntra: No active connection found');
      vscode.window.showWarningMessage('No active connection to sign out from.');
      return;
    }

    // Get connection config
    const connections = snapshot?.context?.connections || [];
    const connection = connections.find((c: any) => c.id === activeConnectionId);

    if (!connection) {
      vscode.window.showWarningMessage('Connection not found.');
      return;
    }

    if (connection.authMethod !== 'entra') {
      vscode.window.showInformationMessage('This connection does not use Entra ID authentication.');
      return;
    }

    // Disconnect and mark as signed out
    await disconnectAndMarkSignedOut(activeConnectionId);

    // Clear all token variations
    await clearAllEntraTokens(context, connection, activeConnectionId);

    // Clear auth providers
    await clearAuthProviders(activeConnectionId);

    // Dispatch SIGN_OUT_ENTRA event
    dispatchApplicationEvent({
      type: 'SIGN_OUT_ENTRA',
      connectionId: activeConnectionId,
    });

    // Update status bar
    const { updateAuthStatusBar } = await import('../../activation.js');
    if (typeof updateAuthStatusBar === 'function') {
      await updateAuthStatusBar();
    }

    vscode.window.showInformationMessage('Signed out successfully.');
    logger.info('Sign out completed', { connectionId: activeConnectionId });
  } catch (error: any) {
    logger.error('signOutEntra error', {
      error: error?.message || String(error),
      stack: error?.stack,
      name: error?.name,
      code: error?.code,
      connectionId: activeConnectionId,
    });
    vscode.window.showErrorMessage(`Sign out failed: ${error.message || String(error)}`);
  }
}

async function setOpenAIApiKey(context: vscode.ExtensionContext) {
  try {
    const apiKey = await vscode.window.showInputBox({
      prompt: 'Enter your OpenAI API Key',
      password: true,
      placeHolder: 'sk-...',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'API key cannot be empty';
        }
        if (!value.startsWith('sk-')) {
          return 'OpenAI API keys typically start with "sk-"';
        }
        return null;
      },
    });

    if (apiKey) {
      // Store in secrets for security
      const SECRET_KEY = 'azureDevOpsInt.openai.apiKey';
      await context.secrets.store(SECRET_KEY, apiKey);
      vscode.window.showInformationMessage('OpenAI API Key saved successfully.');
      logger.info('OpenAI API key stored in secrets');
    }
  } catch (error: any) {
    logger.error('setOpenAIApiKey error', { meta: error });
    vscode.window.showErrorMessage(`Failed to save API key: ${error.message || String(error)}`);
  }
}

async function cycleAuthSignIn(context: vscode.ExtensionContext) {
  try {
    const { getApplicationStoreActor } = await import('../../activation.js');
    const actor = getApplicationStoreActor();
    const snapshot = actor?.getSnapshot?.();
    const connections = snapshot?.context?.connections || [];

    // Find connections that need authentication
    const pendingConnections = connections.filter((conn: any) => {
      if (conn.authMethod !== 'entra') return false;

      // Check if connection is not connected or has auth issues
      const connectionStates = snapshot?.context?.connectionStates;
      const connState = connectionStates?.get?.(conn.id);
      const isConnected = connState?.isConnected === true;

      return !isConnected;
    });

    if (pendingConnections.length === 0) {
      // No pending connections - sign in to active connection
      const activeConnectionId = snapshot?.context?.activeConnectionId;
      if (activeConnectionId) {
        await signInWithEntra(context, activeConnectionId);
      } else if (connections.length > 0) {
        // Sign in to first connection
        await signInWithEntra(context, connections[0].id);
      } else {
        vscode.window.showWarningMessage('No connections configured.');
      }
      return;
    }

    // Cycle through pending connections
    // Use a simple round-robin approach based on connection ID hash
    const now = Date.now();
    const cycleIndex = Math.floor((now / 1000) % pendingConnections.length);
    const targetConnection = pendingConnections[cycleIndex];

    await signInWithEntra(context, targetConnection.id);
    vscode.window.showInformationMessage(
      `Signing in to ${targetConnection.label || targetConnection.id}...`
    );
  } catch (error: any) {
    logger.error('cycleAuthSignIn error', { meta: error });
    vscode.window.showErrorMessage(`Cycle sign in failed: ${error.message || String(error)}`);
  }
}

async function diagnoseWorkItemsIssue(_context: vscode.ExtensionContext) {
  try {
    const channel =
      getOutputChannel() || vscode.window.createOutputChannel('Azure DevOps Integration');
    setOutputChannel(channel);
    channel.show(true);

    logLine('=== Work Items Diagnostic ===');
    logLine(`Started at: ${new Date().toISOString()}`);
    logLine('');

    // Get application state
    const { getApplicationStoreActor } = await import('../../activation.js');
    const actor = getApplicationStoreActor();
    const snapshot = actor?.getSnapshot?.();

    const {
      checkConnections,
      checkActiveConnectionState,
      checkWorkItemsState,
      checkActiveQuery,
      checkErrors,
      testConnection,
      generateRecommendations,
    } = await import('./diagnosticHelpers.js');

    const diagnosticContext = {
      connections: snapshot?.context?.connections || [],
      activeConnectionId: snapshot?.context?.activeConnectionId,
      snapshot,
    };

    // 1. Check connections
    if (!checkConnections(diagnosticContext)) {
      return;
    }

    // 2. Check active connection state
    const isConnected = await checkActiveConnectionState(diagnosticContext);

    // 3. Check work items state
    checkWorkItemsState(diagnosticContext);

    // 4. Check active query
    const activeQuery = checkActiveQuery(diagnosticContext);

    // 5. Check for errors
    const workItemsError = checkErrors(diagnosticContext);

    // 6. Test connection if available
    await testConnection(diagnosticContext);

    // 7. Recommendations
    generateRecommendations(diagnosticContext, isConnected, activeQuery, workItemsError);

    logLine('');
    logLine('=== Diagnostic Complete ===');
    logLine('Check the output above for issues and recommendations.');

    vscode.window.showInformationMessage(
      'Work items diagnostic complete. Check the output channel for details.'
    );
  } catch (error: any) {
    logger.error('diagnoseWorkItemsIssue error', { meta: error });
    vscode.window.showErrorMessage(`Diagnostic failed: ${error.message || String(error)}`);
  }
}

function getConfig() {
  return vscode.workspace.getConfiguration('azureDevOpsIntegration');
}

// Import the dispatchApplicationEvent function from activation.ts
// This ensures events are handled by the actual implementation with work item dialogs, etc.
import { dispatchApplicationEvent } from '../../activation.js';

// Setup Commands
export const setupCommand: CommandHandler = async (ctx, options?: unknown) => {
  const setupService = new FSMSetupService(ctx.context);
  const setupOptions =
    options && typeof options === 'object'
      ? (options as { startAtAuthChoice?: boolean; connectionId?: string })
      : undefined;

  const result = await setupService.startSetup(setupOptions);
  // After setup, refresh connections from config
  await loadConnectionsFromConfig(ctx.context);
  return result;
};

// Authentication Commands
export const signInWithEntraCommand: CommandHandler = async (_ctx, target?: unknown) => {
  return signInWithEntra(_ctx.context, typeof target === 'string' ? target : (target as any)?.id);
};

export const signOutEntraCommand: CommandHandler = async (_ctx, target?: unknown) => {
  logger.info('[signOutEntraCommand] Command invoked', { target, hasContext: !!_ctx.context });

  try {
    logger.info('[signOutEntraCommand] Calling signOutEntra function');
    await signOutEntra(_ctx.context, typeof target === 'string' ? target : (target as any)?.id);
    logger.info('[signOutEntraCommand] signOutEntra completed successfully');
  } catch (error: any) {
    logger.error('[signOutEntraCommand] Command failed', { meta: error });
    throw error;
  }
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
