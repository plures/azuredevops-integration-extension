/**
 * Module: Activation
 * Owner: application
 * Reads: ApplicationContext (selectors), webview events
 * Writes: none directly to context; delegates via Praxis reducers and Router stamping
 * Receives: UI/system events, provider messages
 * Emits: syncState to webview; dispatches typed events to PraxisApplicationManager
 * Prohibitions: Do not implement webview logic here; Do not define context types; Do not set selection
 * Rationale: Integration layer wiring VS Code host to Praxis + Webview; routing and stamping only
 *
 * LLM-GUARD:
 * - Do not mutate ApplicationContext directly; use Praxis events/reducers
 * - Do not create new *Context types; import from the single context module
 */
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
// import { randomUUID as _randomUUID } from 'crypto';
// import { OpenAI } from 'openai';
import { AzureDevOpsIntClient } from './azureClient.js';
// import {
//   parseAzureDevOpsUrl as _parseAzureDevOpsUrl,
//   isAzureDevOpsWorkItemUrl as _isAzureDevOpsWorkItemUrl,
// } from './azureDevOpsUrlParser.js';
import type { WorkItemsProvider } from './provider.js';
import { SessionTelemetryManager } from './sessionTelemetry.js';
// import {
//   clearConnectionCaches,
//   getBranchEnrichmentState,
//   updateBuildRefreshTimer,
//   type BranchContext,
// } from './services/connection/branchEnrichment.js';
import {
  clearConnectionCaches,
  // getBranchEnrichmentState,
  updateBuildRefreshTimer,
  // type BranchContext,
} from './services/connection/branchEnrichment.js';
import {
  createBranchAwareTransform,
  // createConnectionProvider as _createConnectionProvider,
} from './services/connection/providerFactory.js';
import { createSharedContextBridge } from './bridge/sharedContextBridge.js';
import {
  bridgeConsoleToOutputChannel,
  // getLogBufferSnapshot,
  getOutputChannel,
  logLine,
  setOutputChannel,
} from './logging.js';

import { startCacheCleanup, stopCacheCleanup } from './cache.js';
// import { performanceMonitor, MemoryOptimizer } from './performance.js';
import {
  normalizeConnections,
  resolveActiveConnectionId,
} from './services/connection/connectionNormalization.js';
import { migrateGlobalPATToConnections } from './services/secrets/patMigration.js';
import {
  getApplicationStoreActor,
  sendApplicationStoreEvent,
  // setActiveConnectionHandler as _setActiveConnectionHandler,
  setActiveConnectionIdReader,
  setExtensionContextRef as setExtensionContextRefBridge,
  // setForwardProviderMessage as _setForwardProviderMessage,
  setGetSecretPAT,
  setLoadedConnectionsReader,
  getLoadedConnections,
  // setRegisterAllCommands as _setRegisterAllCommands,
  // setWebviewMessageHandler as _setWebviewMessageHandler,
} from './services/extensionHostBridge.js';
import { registerCommands } from './features/commands/index.js';
import { registerTraceCommands } from './commands/traceCommands.js';
import { registerQuickDebugCommands } from './commands/quickDebugCommands.js';
import { ConnectionService } from './praxis/connection/service.js';
//import { initializeBridge } from './services/extensionHostBridge.js';
import type {
  // AuthReminderReason,
  AuthReminderState,
  ConnectionState,
  ProjectConnection,
} from './types/application.js';
import {
  AuthRedirectReceivedAppEvent,
  AuthCodeFlowCompletedAppEvent,
  DeviceCodeCopyFailedEvent,
  DeviceCodeBrowserOpenFailedEvent,
  DeviceCodeSessionNotFoundEvent,
  DeviceCodeBrowserOpenedEvent,
  AuthCodeFlowBrowserOpenFailedEvent,
  AuthCodeFlowBrowserOpenedEvent,
  ApplicationErrorEvent,
} from './praxis/application/facts.js';
// import type { WorkItemTimerState, TimeEntry } from './types.js';

// type _AuthMethod = 'pat' | 'entra';

// Local lightweight type definitions for internal messaging helpers.
// These were previously only present in a temporary bundle artifact.
// Keeping them here avoids implicit any usage and preserves clarity.
// type LoggerFn = (message: string, meta?: any) => void;
/*
type PostWorkItemsSnapshotParams = {
  panel?: vscode.WebviewView;
  logger?: LoggerFn;
  connectionId?: string;
  items?: any[];
  kanbanView?: boolean;
  provider?: WorkItemsProvider;
  types?: string[];
  query?: string;
  branchContext?: BranchContext | null;
};
*/

// const STATE_TIMER = 'azureDevOpsInt.timer.state';
// const STATE_TIME_ENTRIES = 'azureDevOpsInt.timer.entries';
// const STATE_LAST_SAVE = 'azureDevOpsInt.timer.lastSave';
// const STATE_TIMER_CONNECTION = 'azureDevOpsInt.timer.connection';
const CONFIG_NS = 'azureDevOpsIntegration';
// const LEGACY_CONFIG_NS = 'azureDevOps';
const CONNECTIONS_CONFIG_KEY = 'connections';
const ACTIVE_CONNECTION_STATE_KEY = 'azureDevOpsInt.activeConnectionId';

export let panel: vscode.WebviewView | undefined;

// Track last state signature to deduplicate syncState messages (Priority 2: Reduce redundant syncs)
// Module-level variable accessible from both class methods and global subscription callbacks
let lastStateSignature: string | undefined = undefined;

// Debounce RESET_AUTH events to prevent rapid duplicate processing
let lastResetAuthTime = 0;
const RESET_AUTH_DEBOUNCE_MS = 2000; // 2 seconds
let provider: WorkItemsProvider | undefined;
let sessionTelemetry: SessionTelemetryManager | undefined;
let client: AzureDevOpsIntClient | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;
let authStatusBarItem: vscode.StatusBarItem | undefined;
// const _PAT_KEY = 'azureDevOpsInt.pat';
// const OPENAI_SECRET_KEY = 'azureDevOpsInt.openai.apiKey';
let viewProviderRegistered = false;
const initialRefreshedConnections = new Set<string>();
let connections: ProjectConnection[] = [];
const connectionStates = new Map<string, ConnectionState>();
// let connectionAdapterInstance: ConnectionAdapter | undefined;
let activeConnectionId: string | undefined;
// Track connections that were recently signed out to prevent automatic reconnection
const recentlySignedOutConnections = new Set<string>();

/**
 * Mark a connection as recently signed out to prevent automatic reconnection
 */
export function markConnectionSignedOut(connectionId: string): void {
  recentlySignedOutConnections.add(connectionId);
  // Automatic logging will capture this
  // Clear the flag after 30 seconds to allow reconnection if user wants
  setTimeout(() => {
    recentlySignedOutConnections.delete(connectionId);
    // Automatic logging will capture this
  }, 30000);
}

/**
 * Clear the signed-out flag for a connection (e.g., when user explicitly signs in)
 */
export function clearSignedOutFlag(connectionId: string): void {
  recentlySignedOutConnections.delete(connectionId);
  // Automatic logging will capture this
}

/**
 * Clear connection state from connectionStates map (used during sign out)
 */
export function clearConnectionState(connectionId: string): void {
  connectionStates.delete(connectionId);
  initialRefreshedConnections.delete(connectionId);
  // Automatic logging will capture this
}
let tokenRefreshInterval: NodeJS.Timeout | undefined;
let gcInterval: NodeJS.Timeout | undefined;
// let isDeactivating = false;
let rejectionHandler: ((reason: any, promise: Promise<any>) => void) | undefined;
let sharedContextBridge: ReturnType<typeof createSharedContextBridge> | undefined;
let extensionContextRef: vscode.ExtensionContext | undefined;
// let openAiClient: OpenAI | undefined;
// let cachedExtensionVersion: string | undefined; // cache package.json version for cache-busting
// Track last applied query to avoid redundant provider refreshes
let lastQueriedActiveConnectionId: string | undefined;
let lastQueriedQuery: string | undefined;

function shouldLogDebug(): boolean {
  try {
    return Boolean(getConfig().get('debugLogging'));
  } catch {
    return false;
  }
}
// -------------------------------------------------------------
// TEST HOOKS (Internal) - Minimal message handling used by tests
// -------------------------------------------------------------
// These exports provide a lightweight simulation of the webview ↔ activation
// message contract for unit tests that import activation.ts directly.
// They intentionally avoid Praxis pathways for isolation.
export function __setTestContext(ctx: {
  panel?: any;
  provider?: any;
  client?: any;
  activeConnectionId?: string;
}): void {
  if (ctx.panel) panel = ctx.panel;
  if (ctx.provider) provider = ctx.provider;
  if (ctx.client) client = ctx.client;
  if (ctx.activeConnectionId) activeConnectionId = ctx.activeConnectionId;
}

export function handleMessage(message: any): void {
  switch (message?.type) {
    case 'openExternal': {
      // Praxis-requested external URL open
      if (message.url) {
        vscode.env.openExternal(vscode.Uri.parse(message.url));
      }
      break;
    }
    case 'createBranch': {
      // Praxis-requested branch creation
      if (message.suggestedName) {
        vscode.window
          .showInputBox({
            prompt: 'Enter branch name',
            value: message.suggestedName,
            placeHolder: 'feature/123-my-work-item',
          })
          .then((name) => {
            if (name) {
              vscode.commands.executeCommand('git.branch', name);
            }
          });
      }
      break;
    }
    case 'getWorkItems': {
      const items = provider?.getWorkItems?.() || [];
      dispatchProviderMessage({
        type: 'workItemsLoaded',
        workItems: items,
        connectionId: activeConnectionId,
        query: getStoredQueryForConnection(activeConnectionId),
      });
      break;
    }
    case 'refresh': {
      try {
        // CRITICAL: Use provider from active connection's Praxis state, not global provider
        // This ensures refresh uses the correct connection when tabs are switched
        if (activeConnectionId) {
          const actor = getApplicationActor();
          const snapshot = actor?.getSnapshot?.();
          const connectionStates = snapshot?.context?.connectionStates;
          const connectionState = connectionStates?.get(activeConnectionId);
          const activeProvider = connectionState?.provider;

          if (activeProvider && typeof activeProvider.refresh === 'function') {
            const query = getStoredQueryForConnection(activeConnectionId);
            activeProvider.refresh(query);
            // Automatic logging will capture this
          } else if (provider) {
            // Fallback to global provider if Praxis provider not available
            provider.refresh(getStoredQueryForConnection(activeConnectionId));
            // Automatic logging will capture this
          } else {
            // Automatic logging will capture this
          }
        }
      } catch (error) {
        // Automatic logging will capture this
      }
      break;
    }
    case 'addComment': {
      if (!message.comment) {
        dispatchApplicationEvent({
          type: 'SHOW_COMPOSE_COMMENT',
          mode: 'addComment',
          workItemId: message.workItemId,
        });
        break;
      }
      // fallthrough to submitComposeComment logic if comment provided
      handleMessage({ ...message, type: 'submitComposeComment' });
      break;
    }
    case 'submitComposeComment': {
      const { workItemId, comment, mode, timerData } = message;
      if (!client) {
        dispatchApplicationEvent({
          type: 'COMMENT_RESULT',
          success: false,
          mode,
          workItemId,
          error: 'No active client',
        });
        break;
      }
      const hoursDecimal: number | undefined = timerData?.hoursDecimal;
      (async () => {
        try {
          if (mode === 'timerStop' && typeof hoursDecimal === 'number') {
            const wi = await client.getWorkItemById?.(workItemId);
            const completed = Number(wi?.fields?.['Microsoft.VSTS.Scheduling.CompletedWork'] || 0);
            const remaining = Number(wi?.fields?.['Microsoft.VSTS.Scheduling.RemainingWork'] || 0);
            const newCompleted = completed + hoursDecimal;
            const newRemaining = Math.max(remaining - hoursDecimal, 0);
            await client.updateWorkItem?.(workItemId, [
              {
                op: 'add',
                path: '/fields/Microsoft.VSTS.Scheduling.CompletedWork',
                value: newCompleted,
              },
              {
                op: 'add',
                path: '/fields/Microsoft.VSTS.Scheduling.RemainingWork',
                value: newRemaining,
              },
            ]);
            const hoursStr = hoursDecimal.toFixed(2);
            const composed = comment
              ? `${comment} (Logged ${hoursStr}h)`
              : `Logged ${hoursStr}h via timer stop.`;
            await client.addWorkItemComment?.(workItemId, composed);
            dispatchApplicationEvent({
              type: 'COMMENT_RESULT',
              success: true,
              mode,
              workItemId,
              message: `Logged ${hoursStr}h and added comment`,
            });
            return;
          }
          if (mode === 'addComment') {
            if (comment) {
              await client.addWorkItemComment?.(workItemId, comment);
              dispatchApplicationEvent({
                type: 'COMMENT_RESULT',
                success: true,
                mode,
                workItemId,
                message: 'Comment added successfully',
              });
            } else {
              dispatchApplicationEvent({
                type: 'SHOW_COMPOSE_COMMENT',
                mode: 'addComment',
                workItemId,
              });
            }
            return;
          }
          // Generic fallback
          if (comment) {
            await client.addWorkItemComment?.(workItemId, comment);
          }
          dispatchApplicationEvent({
            type: 'COMMENT_RESULT',
            success: true,
            mode,
            workItemId,
            message: 'Comment added',
          });
        } catch (err) {
          dispatchApplicationEvent({
            type: 'COMMENT_RESULT',
            success: false,
            mode,
            workItemId,
            error: String(err),
          });
          // Automatic logging will capture this error
        }
      })().catch((err) => {
        dispatchApplicationEvent({
          type: 'COMMENT_RESULT',
          success: false,
          mode,
          workItemId,
          error: String(err),
        });
        // Automatic logging will capture this error
      });
      break;
    }
    default:
      // ignore
      break;
  }
}

// Legacy PAT migration helper (test-only export)
// Moves PAT from globalState key to secrets storage if present.
export async function migrateLegacyPAT(context: vscode.ExtensionContext): Promise<void> {
  try {
    const legacy = context.globalState.get<string>('azureDevOpsInt.pat');
    if (legacy && legacy.trim().length > 0) {
      await context.secrets.store('azureDevOpsInt.pat', legacy);
      // Clear legacy value to prevent re-migration loops (best-effort)
      try {
        await context.globalState.update('azureDevOpsInt.pat', undefined as any);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore migration errors for tests */
  }
}

// Build minimal webview HTML (test helper) choosing bundle based on feature flag + existence.
export function buildMinimalWebviewHtml(
  context: vscode.ExtensionContext,
  webview: { cspSource: string; asWebviewUri: (u: any) => any },
  nonce: string
): string {
  const cfg = vscode.workspace.getConfiguration('azureDevOpsIntegration');
  const enableSvelte = !!cfg.get('experimentalSvelteUI');
  const basePath = context.extensionPath;
  const sveltePath = path.join(basePath, 'media', 'webview', 'svelte-main.js');
  const scriptFile = enableSvelte && fs.existsSync(sveltePath) ? 'svelte-main.js' : 'main.js';
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'webview', scriptFile)
  );
  // Link to main.css which contains Svelte component styles from esbuild
  const mainCssUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'webview', 'main.css')
  );
  const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' 'unsafe-eval'; img-src ${webview.cspSource} data:; connect-src 'self';`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <link href="${mainCssUri}" rel="stylesheet" />
  <title>Work Items</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="azure-devops-integration" content="minimal-webview" />
</head>
<body>
  <div id="svelte-root"></div>
  <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

// Manual logging removed - use automatic logging via StandardizedAutomaticLogger

// Self-test tracking (prove Svelte webview round-trip works)
// Self-test pending promise handlers (typed loosely to avoid unused param lint churn)
// let selfTestPending:
//   | { nonce: string; resolve: Function; reject: Function; timeout: NodeJS.Timeout }
//   | undefined;

// type TimerConnectionInfo = {
//   id?: string;
//   label?: string;
//   organization?: string;
//   project?: string;
// };

// let timerConnectionInfo: TimerConnectionInfo = {};

const DEFAULT_QUERY = 'My Activity';
const activeQueryByConnection = new Map<string, string>();
const ACTIVE_QUERY_STATE_KEY = 'azureDevOpsInt.activeQueryByConnection';

// let nextAuthConnectionIndex = 0;
// const INTERACTIVE_REAUTH_THROTTLE_MS = 5 * 60 * 1000;

function getApplicationActor():
  | { getSnapshot?: () => any; send?: (event: unknown) => void }
  | undefined {
  const actor = getApplicationStoreActor();
  if (!actor || typeof actor !== 'object') {
    return undefined;
  }
  return actor as { getSnapshot?: () => any; send?: (event: unknown) => void };
}

async function showEditDialog(item: any, client: any, provider: any): Promise<void> {
  // Define editable fields with their display names and current values
  const editableFields = [
    {
      id: 'System.Title',
      label: 'Title',
      value: item.fields?.['System.Title'] || '',
      type: 'text',
    },
    {
      id: 'System.State',
      label: 'State',
      value: item.fields?.['System.State'] || '',
      type: 'picklist',
      options: ['New', 'Active', 'Resolved', 'Closed', 'Removed'],
    },
    {
      id: 'System.AssignedTo',
      label: 'Assigned To',
      value:
        item.fields?.['System.AssignedTo']?.displayName || item.fields?.['System.AssignedTo'] || '',
      type: 'text',
    },
    {
      id: 'System.Tags',
      label: 'Tags',
      value: item.fields?.['System.Tags'] || '',
      type: 'text',
    },
    {
      id: 'System.Description',
      label: 'Description',
      value: item.fields?.['System.Description'] || '',
      type: 'multiline',
    },
  ];

  // Show field selection
  const fieldItems = editableFields.map((field) => ({
    label: field.label,
    description: `Current: ${field.value}`,
    field: field,
  }));

  const selectedField = await vscode.window.showQuickPick(fieldItems, {
    placeHolder: 'Select field to edit',
    title: `Edit Work Item #${item.id}`,
  });

  if (!selectedField) return;

  const field = selectedField.field;
  let newValue: string | undefined;

  if (field.type === 'picklist') {
    // Show picklist for state field
    const stateItems = (field.options || []).map((option) => ({
      label: option,
      picked: option === field.value,
    }));

    const selectedState = await vscode.window.showQuickPick(stateItems, {
      placeHolder: 'Select new state',
      title: `Edit ${field.label}`,
    });

    if (!selectedState) return;
    newValue = selectedState.label;
  } else if (field.type === 'multiline') {
    // Show input box for multiline text
    newValue = await vscode.window.showInputBox({
      prompt: `Enter new ${field.label}`,
      value: field.value,
      ignoreFocusOut: true,
    });
  } else {
    // Show input box for single-line text
    newValue = await vscode.window.showInputBox({
      prompt: `Enter new ${field.label}`,
      value: field.value,
      ignoreFocusOut: true,
    });
  }

  if (newValue === undefined) return; // User cancelled

  // Update the work item
  try {
    const patches = [
      {
        op: 'replace' as const,
        path: `/fields/${field.id}`,
        value: newValue,
      },
    ];

    const updatedItem = await client.updateWorkItem(item.id, patches);

    if (updatedItem) {
      vscode.window.showInformationMessage(
        `Successfully updated ${field.label} for work item #${item.id}`
      );

      // Refresh the provider to show updated data
      provider.refresh?.(getStoredQueryForConnection(activeConnectionId));
    } else {
      vscode.window.showErrorMessage(`Failed to update ${field.label} for work item #${item.id}`);
    }
  } catch (error) {
    // Automatic logging will capture this error - activationLogger.error('Error updating work item', { meta: error });
    vscode.window.showErrorMessage(
      `Error updating work item: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function showCreateWorkItemDialog(
  client: any,
  provider: any,
  connectionId?: string
): Promise<void> {
  try {
    // Step 1: Get work item types from Azure DevOps
    let workItemTypes: string[] = [];
    try {
      const types: Array<{ name: string }> = await client.getWorkItemTypes();
      workItemTypes = types.map((t) => t.name).filter((n) => n);
    } catch (error) {
      // Automatic logging will capture this warning - activationLogger.warn('Could not fetch work item types, using defaults', { meta: error });
    }

    // Use defaults if API call failed
    if (workItemTypes.length === 0) {
      workItemTypes = ['Task', 'Bug', 'User Story', 'Feature', 'Epic'];
    }

    // Step 2: Select work item type
    const selectedType = await vscode.window.showQuickPick(workItemTypes, {
      placeHolder: 'Select work item type',
      title: 'Create Work Item',
    });

    if (!selectedType) return;

    // Step 3: Enter title
    const title = await vscode.window.showInputBox({
      prompt: 'Enter work item title',
      placeHolder: 'Title',
      ignoreFocusOut: true,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Title is required';
        }
        return null;
      },
    });

    if (!title) return;

    // Step 4: Enter description (optional)
    const description = await vscode.window.showInputBox({
      prompt: 'Enter work item description (optional)',
      placeHolder: 'Description',
      ignoreFocusOut: true,
    });

    // Step 5: Enter assignee (optional)
    const assignTo = await vscode.window.showInputBox({
      prompt: 'Assign to (optional, leave empty for unassigned)',
      placeHolder: 'Email or display name',
      ignoreFocusOut: true,
    });

    // Step 6: Select Iteration (optional)
    let iterationPath: string | undefined;
    try {
      // Try to fetch iterations if the client supports it
      if (typeof client.getIterations === 'function') {
        const iterations = await client.getIterations();
        if (Array.isArray(iterations) && iterations.length > 0) {
          const iterationItems = iterations.map((i: any) => ({
            label: i.name,
            description: i.path,
            detail: i.attributes?.startDate
              ? `Start: ${new Date(i.attributes.startDate).toLocaleDateString()}`
              : undefined,
          }));

          const selectedIteration = await vscode.window.showQuickPick(iterationItems, {
            placeHolder: 'Select Iteration (optional)',
            title: 'Iteration',
          });

          if (selectedIteration) {
            iterationPath = selectedIteration.description;
          }
        }
      }
    } catch (error) {
      // Automatic logging will capture this warning - activationLogger.warn('Failed to fetch iterations', { meta: error });
    }

    const extraFields: Record<string, unknown> = {};
    if (iterationPath) {
      extraFields['System.IterationPath'] = iterationPath;
    }

    // Create the work item
    const createdItem = await client.createWorkItem(
      selectedType,
      title.trim(),
      description?.trim(),
      assignTo?.trim() || undefined,
      extraFields
    );

    if (createdItem) {
      vscode.window.showInformationMessage(
        `Successfully created ${selectedType} #${createdItem.id}: ${title}`
      );

      // Refresh the provider to show the new work item
      provider.refresh?.(getStoredQueryForConnection(connectionId || activeConnectionId));
    } else {
      vscode.window.showErrorMessage(`Failed to create ${selectedType}`);
    }
  } catch (error) {
    // Automatic logging will capture this error - activationLogger.error('Error creating work item', { meta: error });
    vscode.window.showErrorMessage(
      `Error creating work item: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function dispatchApplicationEvent(event: unknown): void {
  // Route work item action events to legacy handleMessage which has implementations
  if (event && typeof event === 'object' && 'type' in event) {
    const evt = event as any;

    switch (evt.type) {
      case 'STOP_TIMER':
        // Show comment dialog for time entry
        (async () => {
          try {
            const appActor = getApplicationStoreActor() as any;
            const snapshot = appActor?.getSnapshot?.();
            const timerState = snapshot?.context?.timerState;

            if (!timerState?.workItemId || !timerState?.startTime) {
              vscode.window.showWarningMessage('No active timer to stop');
              return;
            }

            // Calculate elapsed time
            const elapsed = Math.floor((Date.now() - timerState.startTime) / 1000);
            const hours = (elapsed / 3600).toFixed(2);

            // Prompt for comment
            const comment = await vscode.window.showInputBox({
              prompt: `Add comment for ${hours} hours logged on work item #${timerState.workItemId}`,
              placeHolder: 'Optional: describe what you worked on...',
            });

            // Stop the timer (send to Praxis)
            const timerActor = snapshot?.context?.timerActor;
            if (timerActor && typeof timerActor.send === 'function') {
              timerActor.send({ type: 'STOP' });
            }

            // Add time entry and comment if we have a client
            if (client && timerState.workItemId) {
              try {
                // Update completed/remaining work
                const wi = await client.getWorkItemById(timerState.workItemId);
                const completed = Number(
                  wi?.fields?.['Microsoft.VSTS.Scheduling.CompletedWork'] || 0
                );
                const remaining = Number(
                  wi?.fields?.['Microsoft.VSTS.Scheduling.RemainingWork'] || 0
                );
                const hoursDecimal = Number(hours);

                await client.updateWorkItem(timerState.workItemId, [
                  {
                    op: 'add',
                    path: '/fields/Microsoft.VSTS.Scheduling.CompletedWork',
                    value: completed + hoursDecimal,
                  },
                  {
                    op: 'add',
                    path: '/fields/Microsoft.VSTS.Scheduling.RemainingWork',
                    value: Math.max(remaining - hoursDecimal, 0),
                  },
                ]);

                // Add comment
                const finalComment = comment
                  ? `${comment} (Logged ${hours}h)`
                  : `Logged ${hours}h via timer stop.`;
                await client.addWorkItemComment(timerState.workItemId, finalComment);

                vscode.window.showInformationMessage(
                  `Timer stopped. Logged ${hours} hours to work item #${timerState.workItemId}`
                );
              } catch (error) {
                // Automatic logging will capture this error - activationLogger.error('Error adding time entry', { meta: error });
                vscode.window.showErrorMessage(
                  `Timer stopped but failed to log time: ${error instanceof Error ? error.message : String(error)}`
                );
              }
            } else {
              vscode.window.showInformationMessage(`Timer stopped. ${hours} hours elapsed.`);
            }

            // Clear persisted timer state
            if (snapshot?.context?.extensionContext) {
              await snapshot.context.extensionContext.globalState.update(
                'azureDevOpsInt.timer.state',
                undefined
              );
            }
          } catch (error) {
            // Automatic logging will capture this error - activationLogger.error('Error stopping timer', { meta: error });
            vscode.window.showErrorMessage(
              `Failed to stop timer: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        })();
        break;
      case 'EDIT_WORK_ITEM':
        // Implement in-VSCode edit dialog
        try {
          if (evt.workItemId && client && provider) {
            const items = provider.getWorkItems?.() || [];
            const item = items.find((i: any) => i.id === evt.workItemId);
            if (item) {
              showEditDialog(item, client, provider);
            } else {
              vscode.window.showErrorMessage('Work item not found');
            }
          } else {
            vscode.window.showErrorMessage('Unable to edit work item: missing client or provider');
          }
        } catch (error) {
          // Automatic logging will capture this error - activationLogger.error('Error editing work item', { meta: error });
          vscode.window.showErrorMessage(
            `Failed to edit work item: ${error instanceof Error ? error.message : String(error)}`
          );
        }
        break;
      case 'CREATE_WORK_ITEM':
        // Show dialog to create new work item
        try {
          if (client && provider) {
            showCreateWorkItemDialog(client, provider, activeConnectionId);
          } else {
            vscode.window.showErrorMessage(
              'Unable to create work item: missing client or provider'
            );
          }
        } catch (error) {
          // Automatic logging will capture this error - activationLogger.error('Error creating work item', { meta: error });
          vscode.window.showErrorMessage(
            `Failed to create work item: ${error instanceof Error ? error.message : String(error)}`
          );
        }
        break;
      case 'OPEN_IN_BROWSER':
      case 'OPEN_WORK_ITEM':
        // Open work item in browser and copy URL to clipboard (standard behavior)
        if (evt.workItemId && client) {
          const url = client.getBrowserUrl(`/_workitems/edit/${evt.workItemId}`);
          // Copy URL to clipboard (standard behavior)
          vscode.env.clipboard.writeText(url).then(
            () => {
              vscode.window.showInformationMessage(`Work item URL copied to clipboard`);
            },
            (error) => {
              // Automatic logging will capture this warning
            }
          );
          // Open in browser
          vscode.env.openExternal(vscode.Uri.parse(url));
        }
        break;
      case 'CREATE_BRANCH':
        // Show input for branch name then create and link to work item
        (async () => {
          try {
            if (evt.workItemId) {
              const items = provider?.getWorkItems?.() || [];
              const item = items.find((i: any) => i.id === evt.workItemId);

              if (item) {
                const title = item.fields?.['System.Title'] || '';
                const branchName = `feature/${evt.workItemId}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                const name = await vscode.window.showInputBox({
                  prompt: 'Enter branch name',
                  value: branchName,
                });

                if (name) {
                  try {
                    // Create the branch
                    await vscode.commands.executeCommand('git.branch', name);

                    // Add comment to work item linking the branch
                    if (client) {
                      const comment = `Created branch: ${name}`;
                      const success = await client.addWorkItemComment(evt.workItemId, comment);

                      if (success) {
                        vscode.window.showInformationMessage(
                          `Branch "${name}" created and linked to work item #${evt.workItemId}`
                        );
                      } else {
                        vscode.window.showWarningMessage(
                          `Branch "${name}" created but failed to link to work item #${evt.workItemId}`
                        );
                      }
                    } else {
                      vscode.window.showInformationMessage(`Branch "${name}" created`);
                    }
                  } catch (error) {
                    // Automatic logging will capture this error - activationLogger.error('Error creating branch', { meta: error });
                    vscode.window.showErrorMessage(
                      `Failed to create branch: ${error instanceof Error ? error.message : String(error)}`
                    );
                  }
                }
              } else {
                vscode.window.showErrorMessage('Work item not found');
              }
            } else {
              vscode.window.showErrorMessage('No work item ID provided for branch creation');
            }
          } catch (error) {
            // Automatic logging will capture this error - activationLogger.error('Error in branch creation', { meta: error });
            vscode.window.showErrorMessage(
              `Failed to create branch: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        })();
        break;
    }
  }

  // Always send event to Praxis for state management
  sendApplicationStoreEvent(event);
}

// async function signInWithEntra(
//   context: vscode.ExtensionContext,
//   connectionId?: string,
//   options: { showSuccessMessage?: boolean; forceInteractive?: boolean } = {}
// ): Promise<void> {
//   await ensureConnectionsInitialized(context);
//   const targetId = connectionId ?? activeConnectionId;

//   if (!targetId) {
//     vscode.window.showWarningMessage('No active connection to sign in with.');
//     return;
//   }

//   dispatchApplicationEvent({
//     type: 'SIGN_IN_ENTRA',
//     connectionId: targetId,
//     forceInteractive: options.forceInteractive,
//   });
// }

/*
async function signOutEntra(
  context: vscode.ExtensionContext,
  connectionId?: string
): Promise<void> {
  await ensureConnectionsInitialized(context);
  const targetId = connectionId ?? activeConnectionId;

  if (!targetId) {
    vscode.window.showWarningMessage('No active connection to sign out from.');
    return;
  }

  dispatchApplicationEvent({ type: 'SIGN_OUT_ENTRA', connectionId: targetId });
}
*/

/*
function safeCommandHandler<Args extends unknown[], Result>(
  handler: (...args: Args) => Result
): (...args: Args) => void {
  return (...args: Args) => {
    if (isDeactivating) {
      // Automatic logging will capture this
      return;
    }

    try {
      const result = handler(...args);
      const maybeThenable = result as
        | { catch?: (onRejected: (reason: unknown) => unknown) => unknown }
        | undefined;
      if (maybeThenable?.catch) {
        maybeThenable.catch((error) => {
          if (!isDeactivating) {
            // Automatic logging will capture this error - activationLogger.error('[Command] Unhandled command error', { meta: error });
          }
        });
      }
    } catch (error) {
      if (!isDeactivating) {
        // Automatic logging will capture this error - activationLogger.error('[Command] Synchronous command error', { meta: error });
      }
    }
  };
}
*/

async function ensureSharedContextBridge(
  context: vscode.ExtensionContext
): Promise<ReturnType<typeof createSharedContextBridge>> {
  if (!sharedContextBridge) {
    if (!getApplicationActor()) {
      await import('./stores/applicationStore.js');
    }

    const actor = getApplicationActor();
    if (!actor) {
      throw new Error('Application store actor not available');
    }

    sharedContextBridge = createSharedContextBridge({
      actor: actor as any,
      logger: (message, meta) => {
        // Automatic logging will capture this
      },
    });

    context.subscriptions.push(sharedContextBridge);
    context.subscriptions.push(
      new vscode.Disposable(() => {
        sharedContextBridge = undefined;
      })
    );
  }

  return sharedContextBridge;
}

function getPendingAuthReminderMap(): Map<string, AuthReminderState> {
  const actor = getApplicationActor();
  if (!actor?.getSnapshot) {
    return new Map();
  }

  try {
    const snapshot = actor.getSnapshot?.();
    const pending = snapshot?.context?.pendingAuthReminders;

    if (pending instanceof Map) {
      return new Map(pending as Map<string, AuthReminderState>);
    }

    if (Array.isArray(pending)) {
      const normalized = pending
        .filter((entry): entry is AuthReminderState =>
          Boolean(
            entry && typeof entry.connectionId === 'string' && entry.connectionId.trim().length > 0
          )
        )
        .map((entry) => [entry.connectionId, entry] as const);

      return new Map(normalized);
    }
  } catch (error) {
    // Automatic logging will capture this
  }

  return new Map();
}

/*
function getPendingAuthConnectionIds(): string[] {
  const pending = getPendingAuthReminderMap();
  const ordered: string[] = [];

  for (const connection of connections) {
    const reminder = pending.get(connection.id);
    if (reminder?.status === 'pending') {
      ordered.push(connection.id);
    }
  }

  for (const [connectionId, reminder] of pending.entries()) {
    if (reminder?.status === 'pending' && !ordered.includes(connectionId)) {
      ordered.push(connectionId);
    }
  }

  return ordered;
}
*/

/*
async function cycleAuthSignIn(context: vscode.ExtensionContext): Promise<void> {
  const pendingIds = getPendingAuthConnectionIds();

  if (pendingIds.length === 0) {
    if (activeConnectionId) {
      await signInWithEntra(context, activeConnectionId);
    } else {
      await signInWithEntra(context);
    }
    return;
  }

  if (nextAuthConnectionIndex >= pendingIds.length) {
    nextAuthConnectionIndex = 0;
  }

  const targetId = pendingIds[nextAuthConnectionIndex];
  nextAuthConnectionIndex = (nextAuthConnectionIndex + 1) % pendingIds.length;

  clearAuthReminder(targetId);
  await signInWithEntra(context, targetId, { showSuccessMessage: true });
}
*/

function describeConnection(connection: ProjectConnection): string {
  if (connection.label && connection.label.trim().length > 0) {
    return connection.label;
  }

  const parts: string[] = [];
  if (connection.organization) parts.push(connection.organization);
  if (connection.project) parts.push(connection.project);

  if (parts.length > 0) {
    return parts.join('/');
  }

  return connection.id;
}

// Global reference for reactive status bar updates
// let updateAuthStatusBarRef: (() => Promise<void>) | null = null;

export async function updateAuthStatusBar(): Promise<void> {
  if (!authStatusBarItem) return;

  if (!activeConnectionId) {
    // Always show a status item even without an active selection
    try {
      const actor = getApplicationActor();
      const snapshot = actor?.getSnapshot?.();
      const numConnections = Array.isArray(snapshot?.context?.connections)
        ? snapshot!.context.connections.length
        : 0;

      if (numConnections === 0) {
        authStatusBarItem.text = '$(plug) No connections';
        authStatusBarItem.tooltip = 'Click to add an Azure DevOps connection';
        authStatusBarItem.backgroundColor = undefined;
        authStatusBarItem.command = 'azureDevOpsInt.setup';
        authStatusBarItem.show();
      } else {
        authStatusBarItem.text = '$(plug) Select a connection';
        authStatusBarItem.tooltip = 'Select an active connection';
        authStatusBarItem.backgroundColor = undefined;
        authStatusBarItem.command = 'azureDevOpsInt.setup';
        authStatusBarItem.show();
      }
    } catch {
      // Fallback: still show a minimal item
      authStatusBarItem.text = '$(plug) Azure DevOps';
      authStatusBarItem.tooltip = 'Azure DevOps Integration';
      authStatusBarItem.backgroundColor = undefined;
      authStatusBarItem.command = 'azureDevOpsInt.setup';
      authStatusBarItem.show();
    }
    return;
  }

  // Try to get state from connectionStates first, but also check Praxis if not available
  const state = connectionStates.get(activeConnectionId);
  let authMethod: 'pat' | 'entra';
  let connectionConfig: ProjectConnection | undefined;

  // If state not in connectionStates, try to get from Praxis context
  if (!state) {
    try {
      const actor = getApplicationActor();
      const snapshot = actor?.getSnapshot?.();
      const praxisConnectionStates = snapshot?.context?.connectionStates;
      const praxisConnectionState = praxisConnectionStates?.get(activeConnectionId);

      // Try to get connection config from Praxis context or connections list
      const connections = snapshot?.context?.connections || [];
      connectionConfig = connections.find((c: ProjectConnection) => c.id === activeConnectionId);

      if (praxisConnectionState) {
        authMethod =
          praxisConnectionState.authMethod || praxisConnectionState.config?.authMethod || 'pat';
      } else if (connectionConfig) {
        authMethod = connectionConfig.authMethod || 'pat';
      } else {
        // No state found - hide status bar
        authStatusBarItem.hide();
        return;
      }
    } catch (error) {
      // Praxis might not be available yet - hide status bar
      authStatusBarItem.hide();
      return;
    }
  } else {
    // State found in connectionStates - use it
    authMethod = state.authMethod || state.config?.authMethod || 'pat';
    connectionConfig = state.config;
  }

  authStatusBarItem.command = {
    title: 'Sign in with Microsoft Entra',
    command: 'azureDevOpsInt.signInWithEntra',
    arguments: [activeConnectionId],
  };

  try {
    // Use connectionConfig (from state or Praxis) for connection label
    if (!connectionConfig) {
      // Fallback: try to get from connections list
      try {
        const actor = getApplicationActor();
        const snapshot = actor?.getSnapshot?.();
        const connections = snapshot?.context?.connections || [];
        connectionConfig = connections.find((c: ProjectConnection) => c.id === activeConnectionId);
      } catch {
        // If we can't get config, hide status bar
        authStatusBarItem.hide();
        return;
      }
    }

    if (!connectionConfig) {
      authStatusBarItem.hide();
      return;
    }

    const connectionLabel = describeConnection(connectionConfig);

    // Get Praxis connection state to determine actual auth status
    const actor = getApplicationActor();
    const snapshot = actor?.getSnapshot?.();
    const praxisConnectionStates = snapshot?.context?.connectionStates;
    const praxisConnectionState = praxisConnectionStates?.get(activeConnectionId);

    // Get the actual connection machine state (e.g., 'connected', 'auth_failed')
    let connectionMachineState: string | null = null;
    try {
      const connectionService = ConnectionService.getInstance();
      const manager = connectionService.getConnectionManager(activeConnectionId);
      connectionMachineState = manager?.getConnectionState() || null;
    } catch (error) {
      // Connection service might not be available yet
      // Automatic logging will capture this error
    }

    // Check multiple indicators of connection status
    // BUT: Only consider connected if the state machine is actually in 'connected' state
    const actualStateConnected = connectionMachineState === 'connected';
    const hasClientAndProvider = Boolean(
      praxisConnectionState?.client ||
      praxisConnectionState?.provider ||
      (state?.client && state?.provider)
    );
    const isConnected = actualStateConnected && hasClientAndProvider;

    // Check for auth failure: state machine in failed states
    const stateMachineAuthFailed =
      connectionMachineState === 'auth_failed' ||
      connectionMachineState === 'client_failed' ||
      connectionMachineState === 'provider_failed' ||
      connectionMachineState === 'connection_error';
    // Remaining retries according to connection machine policy (retryCount < 3)
    const remainingRetries =
      (typeof praxisConnectionState?.retryCount === 'number'
        ? praxisConnectionState.retryCount
        : 0) < 3;

    // Check if there's an active device code session for this connection
    const hasActiveDeviceCode = Boolean(
      snapshot?.context?.deviceCodeSession?.connectionId === activeConnectionId &&
      snapshot?.context?.deviceCodeSession?.expiresAt > Date.now()
    );

    // Check if there's an active auth code flow session for this connection
    const hasActiveAuthCodeFlow = Boolean(
      snapshot?.context?.authCodeFlowSession?.connectionId === activeConnectionId &&
      snapshot?.context?.authCodeFlowSession?.expiresAt > Date.now()
    );

    // Check if connection is in interactive_auth state (device code flow in progress)
    const isInteractiveAuth =
      connectionMachineState === 'interactive_auth' ||
      connectionMachineState === 'checking_token' ||
      connectionMachineState === 'authenticating';

    // Check if connection is in a connecting/retrying state (not yet failed)
    const isConnecting =
      connectionMachineState === 'authenticating' ||
      connectionMachineState === 'checking_token' ||
      connectionMachineState === 'interactive_auth' ||
      connectionMachineState === 'creating_client' ||
      connectionMachineState === 'creating_provider' ||
      praxisConnectionState?.reauthInProgress === true;

    // Treat startup/disconnected and transient auth_failed-with-retries as connecting to prevent flicker
    const isDisconnected =
      !connectionMachineState ||
      connectionMachineState === 'disconnected' ||
      connectionMachineState === 'idle';
    const treatAsConnecting =
      !isConnected &&
      (isConnecting || (stateMachineAuthFailed && remainingRetries) || isDisconnected);

    // Automatic logging will capture status checks

    // PRIORITY 1: Show connecting while connecting/retrying/startup
    if (treatAsConnecting) {
      if (authMethod === 'entra') {
        authStatusBarItem.text = '$(sync~spin) Entra: Connecting...';
        authStatusBarItem.tooltip = `Connecting to ${connectionLabel}...`;
        authStatusBarItem.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.warningBackground'
        );
        authStatusBarItem.command = 'azureDevOpsInt.signInWithEntra';
        authStatusBarItem.show();
        return; // Connecting takes precedence
      } else {
        authStatusBarItem.text = '$(sync~spin) PAT: Connecting...';
        authStatusBarItem.tooltip = `Connecting to ${connectionLabel}...`;
        authStatusBarItem.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.warningBackground'
        );
        authStatusBarItem.command = 'azureDevOpsInt.setup';
        authStatusBarItem.show();
        return; // Connecting takes precedence
      }
    }

    // PRIORITY 2: Device code / Auth code flow / interactive flow indicator
    if (hasActiveAuthCodeFlow && authMethod === 'entra') {
      // Show auth code flow in progress (Entra only)
      const remainingMs = Math.max(
        (snapshot?.context?.authCodeFlowSession?.expiresAt || Date.now()) - Date.now(),
        0
      );
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      authStatusBarItem.text = '$(sync~spin) Entra: Signing In...';
      authStatusBarItem.tooltip = `Authorization code flow in progress for ${connectionLabel}. Complete sign-in in browser (${remainingMinutes}m remaining).`;
      authStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      authStatusBarItem.command = 'azureDevOpsInt.signInWithEntra';
      authStatusBarItem.show();
    } else if (hasActiveDeviceCode || (isInteractiveAuth && authMethod === 'entra')) {
      // Show device code flow in progress (Entra only)
      authStatusBarItem.text = '$(sync~spin) Entra: Device Code Active';
      authStatusBarItem.tooltip = `Device code authentication in progress for ${connectionLabel}`;
      authStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      authStatusBarItem.command = 'azureDevOpsInt.signInWithEntra';
      authStatusBarItem.show();
    } else if (isConnected && !hasActiveDeviceCode && !hasActiveAuthCodeFlow) {
      // Show successful auth status (only if no auth failure)
      if (authMethod === 'entra') {
        authStatusBarItem.text = '$(pass) Entra: Connected';
        authStatusBarItem.tooltip = `Microsoft Entra ID authentication active for ${connectionLabel}`;
        authStatusBarItem.command = undefined; // No action needed when connected
      } else {
        authStatusBarItem.text = '$(key) PAT: Connected';
        authStatusBarItem.tooltip = `Personal Access Token authentication active for ${connectionLabel}`;
        authStatusBarItem.command = 'azureDevOpsInt.setup'; // Allow managing connections
      }
      authStatusBarItem.backgroundColor = undefined; // Clear warning background
      authStatusBarItem.show();
    } else {
      // FINAL: Show failure or sign-in required only when no retries remain and not connecting
      if (stateMachineAuthFailed && !remainingRetries) {
        const authLabel = authMethod === 'entra' ? 'Entra' : 'PAT';
        const errorMessage =
          praxisConnectionState?.lastError ||
          state?.lastError ||
          (connectionMachineState === 'auth_failed' ? 'Authentication failed' : 'Connection error');
        if (authMethod === 'entra') {
          // Entra: present as Sign In Required (final state requiring user action)
          authStatusBarItem.text = '$(warning) Entra: Sign In Required';
          authStatusBarItem.tooltip = `${errorMessage}\n\nConnection: ${connectionLabel}\nClick to sign in.`;
          authStatusBarItem.command = 'azureDevOpsInt.signInWithEntra';
          authStatusBarItem.backgroundColor = new vscode.ThemeColor(
            'statusBarItem.warningBackground'
          );
          authStatusBarItem.show();
        } else {
          // PAT: show Auth Failed with manage link
          authStatusBarItem.text = `$(error) ${authLabel}: Auth Failed`;
          authStatusBarItem.tooltip = `${errorMessage}\n\nConnection: ${connectionLabel}\nClick to manage connections.`;
          authStatusBarItem.backgroundColor = new vscode.ThemeColor(
            'statusBarItem.errorBackground'
          );
          authStatusBarItem.command = 'azureDevOpsInt.setup';
          authStatusBarItem.show();
        }
      } else {
        // Fallback: show Sign In Required only when idle without activity (e.g., PAT setup)
        if (authMethod === 'entra') {
          authStatusBarItem.text = '$(sync~spin) Entra: Connecting...';
          authStatusBarItem.tooltip = `Connecting to ${connectionLabel}...`;
          authStatusBarItem.backgroundColor = new vscode.ThemeColor(
            'statusBarItem.warningBackground'
          );
          authStatusBarItem.command = 'azureDevOpsInt.signInWithEntra';
          authStatusBarItem.show();
        } else {
          authStatusBarItem.text = '$(warning) PAT: Auth Required';
          authStatusBarItem.tooltip = `Personal Access Token required for ${connectionLabel}. Click to manage connections.`;
          authStatusBarItem.command = 'azureDevOpsInt.setup';
          authStatusBarItem.backgroundColor = new vscode.ThemeColor(
            'statusBarItem.warningBackground'
          );
          authStatusBarItem.show();
        }
      }
    }
  } catch (error) {
    // Automatic logging will capture this error - activationLogger.error('[updateAuthStatusBar] Error updating auth status', { meta: error });
    authStatusBarItem.hide();
  }
}

function notifyConnectionsList(): void {
  const actor = getApplicationActor();
  const send = actor?.send;
  if (!send) {
    return;
  }

  send({
    type: 'CONNECTIONS_LOADED',
    connections: connections.slice(),
  });

  if (activeConnectionId) {
    send({ type: 'CONNECTION_SELECTED', connectionId: activeConnectionId });
  }
}

// function ensureAuthReminder(
//   connectionId: string,
//   reason: AuthReminderReason,
//   options: { detail?: string } = {}
// ): void {
//   dispatchApplicationEvent({
//     type: 'AUTH_REMINDER_REQUESTED',
//     connectionId,
//     reason,
//     detail: options.detail,
//   });
// }

/*
function triggerAuthReminderSignIn(
  connectionId: string,
  reason: AuthReminderReason,
  options: { detail?: string; force?: boolean; startInteractive?: boolean } = {}
): void {
  const state = connectionStates.get(connectionId);
  if (!state) return;

  const detail = options.detail;
  const startInteractive = options.startInteractive === true;

  if (!startInteractive || (state.authMethod ?? 'pat') !== 'entra') {
    ensureAuthReminder(connectionId, reason, detail ? { detail } : {});
    return;
  }

  const now = Date.now();
  if (state.reauthInProgress) {
    return;
  }

  if (
    !options.force &&
    state.lastInteractiveAuthAt &&
    now - state.lastInteractiveAuthAt < INTERACTIVE_REAUTH_THROTTLE_MS
  ) {
    return;
  }

  state.reauthInProgress = true;
  state.lastInteractiveAuthAt = now;
  state.accessToken = undefined;
  state.refreshFailureCount = 0;
  state.refreshBackoffUntil = undefined;

  const context = extensionContextRef;

  (async () => {
    try {
      if (context) {
        await signInWithEntra(context, connectionId, {
          showSuccessMessage: false,
          forceInteractive: true,
        });
      } else {
        await vscode.commands.executeCommand('azureDevOpsInt.signInWithEntra', connectionId);
      }
    } catch (error) {
      // Automatic logging will capture this error
      ensureAuthReminder(connectionId, reason, detail ? { detail } : {});
    } finally {
      state.reauthInProgress = false;
    }
  })().catch((error) => {
    // Automatic logging will capture this error
    state.reauthInProgress = false;
    ensureAuthReminder(connectionId, reason, detail ? { detail } : {});
  });
}
*/

function clearAuthReminder(connectionId: string | undefined): void {
  if (!connectionId) {
    return;
  }

  dispatchApplicationEvent({ type: 'AUTH_REMINDER_CLEARED', connectionId });

  if (getPendingAuthReminderMap().size === 0) {
    // nextAuthConnectionIndex = 0;
  }
}

function normalizeQuery(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getStoredQueryForConnection(connectionId?: string | null, fallback?: string): string {
  const resolved = fallback ?? getDefaultQuery(getConfig());
  const base = resolved && resolved.trim().length > 0 ? resolved : DEFAULT_QUERY;
  if (!connectionId) {
    return base;
  }
  const stored = activeQueryByConnection.get(connectionId);
  if (stored && stored.trim().length > 0) {
    return stored;
  }
  // Attempt to load from persisted globalState if not hydrated yet
  try {
    const ctx = extensionContextRef;
    const persisted = ctx?.globalState.get<Record<string, string>>(ACTIVE_QUERY_STATE_KEY) || {};
    const persistedForConn =
      typeof persisted[connectionId] === 'string' ? persisted[connectionId] : undefined;
    const normalized = normalizeQuery(persistedForConn);
    if (normalized) {
      activeQueryByConnection.set(connectionId, normalized);
      return normalized;
    }
  } catch {
    // ignore persistence errors
  }
  activeQueryByConnection.set(connectionId, base);
  return base;
}

function setStoredQueryForConnection(connectionId: string, query?: string): string {
  const resolvedDefault = getDefaultQuery(getConfig());
  const normalized = normalizeQuery(query) ?? resolvedDefault ?? DEFAULT_QUERY;
  activeQueryByConnection.set(connectionId, normalized);
  // Persist to globalState for cross-session retention (best-effort, non-blocking)
  try {
    const ctx = extensionContextRef;
    if (ctx) {
      const current = ctx.globalState.get<Record<string, string>>(ACTIVE_QUERY_STATE_KEY) || {};
      const next = { ...current, [connectionId]: normalized };
      void ctx.globalState.update(ACTIVE_QUERY_STATE_KEY, next);
    }
  } catch {
    // ignore persistence errors
  }
  return normalized;
}

/*
function getQueryForProvider(
  targetProvider?: WorkItemsProvider,
  connectionId?: string | null
): string {
  const cfg = getConfig();
  const fallback = getDefaultQuery(cfg);
  const providerConnectionId = connectionId
    ? connectionId
    : typeof targetProvider?.getConnectionId === 'function'
      ? targetProvider.getConnectionId()
      : undefined;
  return getStoredQueryForConnection(providerConnectionId, fallback);
}
*/

/*
function setTimerConnectionFrom(connection: ProjectConnection | undefined) {
  if (connection) {
    timerConnectionInfo = {
      id: connection.id,
      label: getConnectionLabel(connection),
      organization: connection.organization,
      project: connection.project,
    };
  } else {
    timerConnectionInfo = {};
  }
}
*/

/*
function getActiveTimerConnectionLabel(): string | undefined {
  const info = timerConnectionInfo;
  if (!info) {
    return undefined;
  }

  if (info.label && info.label.trim().length > 0) {
    return info.label;
  }

  if (info.id) {
    const byId = connections.find((connection) => connection.id === info.id);
    if (byId) {
      return getConnectionLabel(byId);
    }
  }

  if (info.organization && info.project) {
    const byCoordinates = connections.find(
      (connection) =>
        connection.organization === info.organization && connection.project === info.project
    );
    if (byCoordinates) {
      return getConnectionLabel(byCoordinates);
    }
  }

  return undefined;
}
*/

type EnsureActiveConnectionOptions = {
  refresh?: boolean;
  notify?: boolean;
  interactive?: boolean;
};

async function ensureActiveConnection(
  context: vscode.ExtensionContext,
  connectionId?: string,
  options: EnsureActiveConnectionOptions = {}
): Promise<ConnectionState | undefined> {
  const prepared = await resolveActiveConnectionTarget(context, connectionId, options);
  if (!prepared) {
    return undefined;
  }

  const { connection } = prepared;

  // CRITICAL: Check if this connection was recently signed out
  // This prevents automatic reconnection after explicit sign-out
  if (recentlySignedOutConnections.has(connection.id)) {
    // Automatic logging will capture this
    return undefined;
  }
  const connectionService = ConnectionService.getInstance();
  connectionService.setContext(context);

  const result = await connectionService.connect(connection, {
    refresh: options.refresh,
    interactive: options.interactive,
  });

  if (result.success && result.client && result.provider) {
    const state = result.state as ConnectionState;
    (state as any).id = connection.id;
    state.config = connection;
    state.authMethod = connection.authMethod || 'pat';

    const settings = getConfig();
    await finalizeConnectionSuccess(connection, state, options, settings);
    return state;
  }

  // Automatic logging will capture this

  if (options.notify !== false && result.error) {
    const isAuthError =
      result.error.includes('invalid_grant') ||
      result.error.includes('interaction_required') ||
      result.error.includes('sign_in_required') ||
      result.error.includes('Entra ID token acquisition failed');

    if (isAuthError) {
      const message = `Authentication failed for ${connection.label || connection.id}: ${result.error}`;
      vscode.window.showErrorMessage(message);
    } else {
      vscode.window.showErrorMessage(
        `Connection failed for ${connection.label || connection.id}: ${result.error}`
      );
    }
  }

  return undefined;
}

// function getConnectionAdapterInstance(): ConnectionAdapter {
//   if (!connectionAdapterInstance) {
//     const manager = ConnectionService.getInstance();
//     // The fallback function is no longer needed as we are fully on Praxis.
//     connectionAdapterInstance = new ConnectionAdapter(manager, async () => undefined, true);
//     connectionAdapterInstance.setUsePraxis(true);
//   }
//   return connectionAdapterInstance;
// }

async function resolveActiveConnectionTarget(
  context: vscode.ExtensionContext,
  connectionId?: string,
  options: EnsureActiveConnectionOptions = {}
): Promise<{ connection: ProjectConnection; connectionId: string } | undefined> {
  await ensureConnectionsInitialized(context);

  // Use bridge reader to get connections - this ensures we get the latest state including temp connections
  const availableConnections = (getLoadedConnections() as ProjectConnection[]) || connections;
  const targetId = connectionId ?? activeConnectionId ?? availableConnections[0]?.id;
  // Automatic logging will capture this

  if (!targetId) {
    if (options.notify !== false) {
      notifyConnectionsList();
    }
    await vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', false);
    provider = undefined;
    client = undefined;
    return undefined;
  }

  if (targetId !== activeConnectionId) {
    activeConnectionId = targetId;
    await context.globalState.update(ACTIVE_CONNECTION_STATE_KEY, targetId);
    if (options.notify !== false) {
      notifyConnectionsList();
    }
  }

  const connection = availableConnections.find((item) => item.id === targetId);
  if (!connection) {
    // Automatic logging will capture this warning - activationLogger.warn('Connection not found for id', { meta: { targetId } });
    return undefined;
  }

  // Automatic logging will capture this

  return { connection, connectionId: targetId };
}

function configureProviderForConnection(
  connection: ProjectConnection,
  state: ConnectionState
): void {
  if (!state.provider) {
    return;
  }

  // Manual logging removed - use automatic logging
  const branchSource = { id: connection.id, client: state.client };

  if (typeof state.provider.updateClient === 'function' && state.client) {
    state.provider.updateClient(state.client);
  }

  state.provider.setPostMessage?.((msg: unknown) => forwardProviderMessage(connection.id, msg));
  // Logger removed - use automatic logging via StandardizedAutomaticLogger
  // state.provider.setLogger?.(providerLogger);
  state.provider.setTransformWorkItems?.(createBranchAwareTransform(branchSource));
}

async function finalizeConnectionSuccess(
  connection: ProjectConnection,
  state: ConnectionState,
  options: EnsureActiveConnectionOptions,
  settings: vscode.WorkspaceConfiguration
): Promise<ConnectionState> {
  connectionStates.set(connection.id, state);
  configureProviderForConnection(connection, state);

  client = state.client;
  provider = state.provider;

  // setTimerConnectionFrom(connection);

  await vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', true);
  await updateAuthStatusBar();

  if (options.refresh !== false && state.provider) {
    const fallbackQuery = getDefaultQuery(settings);
    const selectedQuery = getStoredQueryForConnection(connection.id, fallbackQuery);

    if (!initialRefreshedConnections.has(connection.id)) {
      initialRefreshedConnections.add(connection.id);
    }

    // Automatic logging will capture this

    state.provider.refresh(selectedQuery);
  }

  const hadReminder = getPendingAuthReminderMap().has(connection.id);
  clearAuthReminder(connection.id);
  if ((state.authMethod ?? 'pat') === 'entra' || hadReminder) {
    dispatchApplicationEvent({ type: 'AUTHENTICATION_SUCCESS', connectionId: connection.id });
  }

  dispatchApplicationEvent({
    type: 'CONNECTION_ESTABLISHED',
    connectionId: connection.id,
    connectionState: state,
  });

  return state;
}

/*
function getClientForConnectionInfo(info?: TimerConnectionInfo): AzureDevOpsIntClient | undefined {
  if (!info) {
    return client;
  }

  if (info.id) {
    const stateById = connectionStates.get(info.id);
    if (stateById?.client) {
      return stateById.client;
    }
  }

  if (info.organization && info.project) {
    for (const state of connectionStates.values()) {
      if (
        state.config.organization === info.organization &&
        state.config.project === info.project &&
        state.client
      ) {
        return state.client;
      }
    }
  }

  if (info.label) {
    const byLabel = connections.find((connection) => getConnectionLabel(connection) === info.label);
    if (byLabel) {
      const stateByLabel = connectionStates.get(byLabel.id);
      if (stateByLabel?.client) {
        return stateByLabel.client;
      }
    }
  }

  if (activeConnectionId) {
    const activeState = connectionStates.get(activeConnectionId);
    if (activeState?.client) {
      return activeState.client;
    }
  }

  return client;
}
*/

export async function loadConnectionsFromConfig(
  context: vscode.ExtensionContext
): Promise<ProjectConnection[]> {
  const settings = getConfig();
  const rawConnections = settings.get<unknown[]>(CONNECTIONS_CONFIG_KEY) ?? [];

  const legacyOrganization = String(settings.get<string>('organization') ?? '').trim();
  const legacyProject = String(settings.get<string>('project') ?? '').trim();
  const legacyTeam = String(settings.get<string>('team') ?? '').trim();

  const legacyFallback =
    legacyOrganization && legacyProject
      ? {
          organization: legacyOrganization,
          project: legacyProject,
          team: legacyTeam || undefined,
          label: undefined,
        }
      : undefined;

  const {
    connections: normalized,
    requiresSave,
    summary,
  } = normalizeConnections(rawConnections, legacyFallback);
  connections = normalized;

  if (requiresSave) {
    try {
      await settings.update(
        CONNECTIONS_CONFIG_KEY,
        normalized.map((entry) => ({ ...entry })),
        vscode.ConfigurationTarget.Global
      );
      // Automatic logging will capture this
    } catch (error) {
      // Automatic logging will capture this warning - activationLogger.warn('[connections] Failed to save migrated connections', { meta: error });
    }
  }

  // Migrate any existing global PAT into per-connection secret keys so
  // credentials are always connection-scoped (no global PAT sharing).
  if (connections.length > 0) {
    try {
      await migrateGlobalPATToConnections(context, connections);
    } catch (error) {
      // Automatic logging will capture this warning - activationLogger.warn('migrateGlobalPATToConnections failed', { meta: error });
    }
  }

  // Automatic logging will capture this

  const validIds = new Set(connections.map((item) => item.id));

  for (const [id, state] of connectionStates.entries()) {
    if (!validIds.has(id)) {
      connectionStates.delete(id);
      initialRefreshedConnections.delete(id);
      clearConnectionCaches(id);
    } else {
      const updated = connections.find((item) => item.id === id);
      if (updated) {
        state.config = updated;
      }
    }
  }

  for (const key of Array.from(activeQueryByConnection.keys())) {
    if (!validIds.has(key)) {
      activeQueryByConnection.delete(key);
    }
  }

  const persistedActive = context.globalState.get<string>(ACTIVE_CONNECTION_STATE_KEY);
  const { activeConnectionId: resolvedActiveId, requiresPersistence } = resolveActiveConnectionId(
    persistedActive,
    connections
  );

  activeConnectionId = resolvedActiveId;

  if (requiresPersistence) {
    await context.globalState.update(ACTIVE_CONNECTION_STATE_KEY, resolvedActiveId);
  }

  // Set the readers for the bridge *after* connections are loaded
  setLoadedConnectionsReader(() => connections);
  setActiveConnectionIdReader(() => activeConnectionId);

  // Initialize PAT retrieval bridge function
  setGetSecretPAT(async (extensionContext: vscode.ExtensionContext, connectionId?: string) => {
    if (!connectionId) {
      return undefined;
    }

    // Find the connection to get its patKey
    const connection = connections.find((c) => c.id === connectionId);
    if (!connection || !connection.patKey) {
      return undefined;
    }

    // Retrieve PAT from secrets using the connection's patKey
    return await extensionContext.secrets.get(connection.patKey);
  });

  notifyConnectionsList();
  return connections;
}

/*
async function saveConnectionsToConfig(
  context: vscode.ExtensionContext,
  nextConnections: ProjectConnection[]
): Promise<void> {
  const settings = getConfig();
  connections = nextConnections;
  const serialized = nextConnections.map((entry) => ({ ...entry }));
  await settings.update(CONNECTIONS_CONFIG_KEY, serialized, vscode.ConfigurationTarget.Global);

  const validIds = new Set(nextConnections.map((item) => item.id));
  for (const [id, state] of connectionStates.entries()) {
    if (!validIds.has(id)) {
      connectionStates.delete(id);
      initialRefreshedConnections.delete(id);
      clearConnectionCaches(id);
    } else {
      const updated = nextConnections.find((item) => item.id === id);
      if (updated) state.config = updated;
    }
  }

  if (activeConnectionId && !validIds.has(activeConnectionId)) {
    activeConnectionId = nextConnections[0]?.id;
    await context.globalState.update(ACTIVE_CONNECTION_STATE_KEY, activeConnectionId);
  }

  notifyConnectionsList();
}
*/

async function ensureConnectionsInitialized(context: vscode.ExtensionContext) {
  if (connections.length === 0) await loadConnectionsFromConfig(context);
  return connections;
}

async function showDeviceCodeNotification(session: {
  connectionId: string;
  userCode: string;
  verificationUri: string;
  expiresInSeconds?: number;
}): Promise<void> {
  const connection = connections.find((c) => c.id === session.connectionId);
  const connectionLabel = connection ? describeConnection(connection) : 'Microsoft Entra ID';
  const expiresMinutes = session.expiresInSeconds
    ? Math.max(1, Math.floor(session.expiresInSeconds / 60))
    : undefined;

  const message =
    `Sign in to ${connectionLabel} with Microsoft Entra ID.` +
    `\n\nUse “Copy Code” to copy the code, “Open Browser” to launch the verification page, or “Copy & Open” to do both at once.` +
    `\n\nGo to ${session.verificationUri} and enter code:\n\n${session.userCode}` +
    (expiresMinutes
      ? `\n\nCode expires in ${expiresMinutes} minute${expiresMinutes === 1 ? '' : 's'}.`
      : '');

  const copyAndOpen = 'Copy & Open';
  const openBrowser = 'Open Browser';
  const copyCode = 'Copy Code';

  const action = await vscode.window.showInformationMessage(
    message,
    { modal: false },
    copyAndOpen,
    openBrowser,
    copyCode
  );

  try {
    if (action === 'Copy & Open') {
      try {
        await vscode.env.clipboard.writeText(session.userCode);
      } catch (error) {
        // Automatic logging will capture this warning
      }
      await vscode.env.openExternal(vscode.Uri.parse(session.verificationUri));
      vscode.window.showInformationMessage(
        `Device code ${session.userCode} copied to clipboard. Paste it into the browser to finish signing in.`
      );
      return;
    }

    if (action === 'Copy Code') {
      await vscode.env.clipboard.writeText(session.userCode);
      vscode.window.showInformationMessage('Device code copied to clipboard.');
    }

    if (action === 'Open Browser') {
      try {
        await vscode.env.clipboard.writeText(session.userCode);
      } catch (error) {
        // Automatic logging will capture this warning
      }
      await vscode.env.openExternal(vscode.Uri.parse(session.verificationUri));
      vscode.window.showInformationMessage(
        `Device code ${session.userCode} copied to clipboard. Paste it into the browser to finish signing in.`
      );
    }
  } catch (error) {
    // Automatic logging will capture this warning - activationLogger.warn('[EntraAuth] Device code notification failed', { meta: error });
  }
}

/*
function ensureTimer(context: vscode.ExtensionContext) {
  if (timer) return timer;
  const config = getConfig();
  let pomodoroBreakTimeout: NodeJS.Timeout | undefined;
  timer = new WorkItemTimer({
    autoResumeOnActivity: config.get<boolean>('autoResumeOnActivity') ?? true,
    inactivityTimeoutSec: config.get<number>('timerInactivityTimeout') ?? 300,
    defaultElapsedLimitHours: config.get<number>('defaultElapsedLimitHours') ?? 3.5,
    pomodoroEnabled: config.get<boolean>('pomodoroEnabled') ?? false,
    breakPrompt: () => {
      const snap = timer?.snapshot?.();
      if (!snap || !snap.isPaused) return;
      vscode.window
        .showInformationMessage(
          'Time for a Pomodoro break?',
          { modal: true },
          'Start 5‑min break',
          'Skip'
        )
        .then((choice) => {
          if (!choice || choice === 'Skip') return;
          try {
            timer?.pause();
          } catch {
            // ignore pause error
          }
          if (pomodoroBreakTimeout) {
            try {
              clearTimeout(pomodoroBreakTimeout);
            } catch {
              // ignore clear error
            }
            pomodoroBreakTimeout = undefined;
          }
          pomodoroBreakTimeout = setTimeout(
            () => {
              try {
                timer?.resume();
              } catch {
                // ignore resume error
              }
              pomodoroBreakTimeout = undefined;
            },
            5 * 60 * 1000
          );
        })
        .then(
          () => {},
          (error) => {
            // Automatic logging will capture this error - activationLogger.error('[TIMER] Failed to show Pomodoro break dialog', { meta: error });
          }
        );
    },
    persist: (data: { state?: any; timeEntries?: any[]; updateLastSave?: boolean }) =>
      persistTimer(context, data),
    restorePersisted: () => restoreTimer(context),
    onState: (s: any) => {
      // Reactive Architecture: Timer state is managed by Praxis timerActor.
      // Timer state updates are sent to webview via syncState message (not partial timerUpdate).
      // This callback only updates VS Code context for command enablement.
      updateTimerContext(s);
    },
    onInfo: (m: any) => { // Automatic logging will capture this },
    onWarn: (m: any) => { // Automatic logging will capture this },
    onError: (m: any) => { // Automatic logging will capture this },
  });
  timer.loadFromPersisted();
  return timer;
}
*/

/*
function updateTimerContext(state: any) {
  vscode.commands.executeCommand('setContext', 'azureDevOpsInt.timerActive', state?.isActive);
  vscode.commands.executeCommand('setContext', 'azureDevOpsInt.timerPaused', state?.isPaused);
}

async function persistTimer(
  context: vscode.ExtensionContext,
  data: { state?: any; timeEntries?: any[]; updateLastSave?: boolean }
) {
  if (data.state) await context.globalState.update(STATE_TIMER, data.state);
  if (data.timeEntries) await context.globalState.update(STATE_TIME_ENTRIES, data.timeEntries);
  if (data.updateLastSave) await context.globalState.update(STATE_LAST_SAVE, Date.now());
}

function restoreTimer(context: vscode.ExtensionContext): {
  state: WorkItemTimerState | undefined;
  timeEntries: TimeEntry[] | undefined;
  lastSave: number | undefined;
  connection: TimerConnectionInfo | undefined;
} {
  return {
    state: context.globalState.get(STATE_TIMER),
    timeEntries: context.globalState.get(STATE_TIME_ENTRIES),
    lastSave: context.globalState.get(STATE_LAST_SAVE),
    connection: context.globalState.get(STATE_TIMER_CONNECTION),
  };
}
*/

// Enable a minimal smoke-test mode for CI/integration tests to avoid heavy initialization
// Primary signal: VSCODE_INTEGRATION_SMOKE=1
// Fallback signal: VS Code test runner is present (extensionTestsPath arg) which indicates an integration test session.
function isVSCodeTestRun(): boolean {
  try {
    return (process.argv || []).some(
      (a) =>
        typeof a === 'string' &&
        (a.includes('--extensionTestsPath') || a.includes('integration-tests'))
    );
  } catch {
    return false;
  }
}
const IS_SMOKE = process.env.VSCODE_INTEGRATION_SMOKE === '1' || isVSCodeTestRun();

function getConfig() {
  return vscode.workspace.getConfiguration(CONFIG_NS);
}

type ConfigInspection<T> = {
  key: string;
  defaultValue?: T;
  globalValue?: T;
  workspaceValue?: T;
  workspaceFolderValue?: T;
  globalLanguageValue?: T;
  workspaceLanguageValue?: T;
  workspaceFolderLanguageValue?: T;
};

/*
type SendToWebviewOptions = {
  panel?: vscode.WebviewView;
  logger?: LoggerFn;
};
*/

/*
type SendWorkItemsSnapshotOptions = Omit<PostWorkItemsSnapshotParams, 'panel' | 'logger'> &
  SendToWebviewOptions;
*/

function dispatchProviderMessage(message: any): void {
  const messageType = message?.type;

  // Reactive Architecture: workItemsLoaded and workItemsError are handled via Praxis context updates.
  // These messages dispatch to Praxis, which updates context, and syncState sends full state to webview.
  // We no longer post these partial messages directly to webview.
  if (messageType === 'workItemsLoaded') {
    const items = Array.isArray(message.workItems) ? [...message.workItems] : [];
    // Automatic logging will capture this

    // Dispatch to Praxis - context will be updated and syncState will send full state to webview
    dispatchApplicationEvent({
      type: 'WORK_ITEMS_LOADED',
      workItems: items,
      connectionId: typeof message.connectionId === 'string' ? message.connectionId : undefined,
      query: typeof message.query === 'string' ? message.query : undefined,
      kanbanView: !!message.kanbanView,
      types: Array.isArray(message.types) ? [...message.types] : undefined,
    });

    // Automatic logging will capture this

    // CRITICAL: Force syncState to webview immediately after work items are loaded
    // This ensures work items appear without requiring a manual refresh
    setImmediate(() => {
      if (panel?.webview) {
        const appActor = getApplicationStoreActor();
        if (appActor) {
          let snapshot: any = undefined;

          // Check if it's PraxisApplicationManager (has getApplicationState)
          if (typeof (appActor as any).getApplicationState === 'function') {
            const manager = appActor as any;
            const state = manager.getApplicationState();
            const context = manager.getContext();
            snapshot = { value: state, context };
          }
          // Check if it's XState actor (has getSnapshot)
          else if (typeof (appActor as any).getSnapshot === 'function') {
            snapshot = (appActor as any).getSnapshot();
          }

          if (snapshot) {
            const serializableState = {
              praxisState: snapshot.value,
              context: getSerializableContext(snapshot.context),
              matches: {}, // Simplified matches for immediate sync
            };

            // Note: Deduplication handled in sendCurrentState() method
            // This is a one-time sync after work items loaded, so we send it
            // Automatic logging will capture this

            panel.webview.postMessage({
              type: 'syncState',
              payload: serializableState,
            });
          }
        }
      }
    });

    return;
  }

  // workItemsError: Dispatch an authentication
  if (messageType === 'workItemsError') {
    // Automatic logging will capture this
    try {
      const errorText = String(message.error ?? '');
      const connectionId =
        typeof message.connectionId === 'string' ? message.connectionId : activeConnectionId;
      if (connectionId) {
        // If this looks like an authentication error (401 or contains 'Authentication failed'),
        // notify the Praxis so UI (status bar/banner) can update deterministically.
        const looksAuthFailure =
          /\b401\b/.test(errorText) || /authentication failed/i.test(errorText);
        if (looksAuthFailure) {
          dispatchApplicationEvent({
            type: 'AUTHENTICATION_FAILED',
            connectionId,
            error: errorText,
          });
        }
      }
    } catch {
      // best-effort; ignore
    }
    return;
  }

  // Other messages are dropped as they are legacy/unused in the new architecture
  // Automatic logging will capture this
}

export function forwardProviderMessage(connectionId: string, message: unknown) {
  // Forward provider messages directly, not wrapped in envelope
  // This allows sendToWebview to recognize workItemsLoaded and other message types
  // Automatic logging will capture this

  if (message && typeof message === 'object' && 'type' in message) {
    dispatchProviderMessage({
      ...(message as any),
      connectionId,
    });
  } else {
    // Fallback for messages without type
    dispatchProviderMessage({
      type: 'providerMessage',
      connectionId,
      message,
    });
  }
}

/*
function resolveSnapshotTypes(
  providerRef: WorkItemsProvider | undefined,
  explicit: string[] | undefined,
  logger: LoggerFn | undefined
): string[] | undefined {
  if (Array.isArray(explicit)) {
    return [...explicit];
  }
  if (!providerRef || typeof (providerRef as any).getWorkItemTypeOptions !== 'function') {
    return undefined;
  }
  try {
    const raw = (providerRef as any).getWorkItemTypeOptions();
    return Array.isArray(raw) ? [...raw] : undefined;
  } catch (error) {
    logger?.(
      '[sendWorkItemsSnapshot] failed to read provider type options',
      error instanceof Error ? error.message : error
    );
    return undefined;
  }
}

function resolveBranchContextPayload(
  connectionId: string | undefined,
  explicit: PostWorkItemsSnapshotParams['branchContext']
): PostWorkItemsSnapshotParams['branchContext'] {
  if (explicit !== undefined) {
    return explicit;
  }
  if (!connectionId) {
    return null;
  }
  const enrichment = getBranchEnrichmentState(connectionId);
  return enrichment?.context ?? null;
}

function enrichWorkItems(
  items: any[],
  connectionId: string | undefined,
  branchContext: PostWorkItemsSnapshotParams['branchContext']
): any[] {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }
  return items.map((item) => ({ ...item, connectionId, branchContext }));
}
*/

/*
function sendWorkItemsSnapshot(options: SendWorkItemsSnapshotOptions): void {
  const connectionId = options.connectionId ?? activeConnectionId;
  const items = Array.isArray(options.items) ? options.items : [];
  const branchContext = resolveBranchContextPayload(connectionId, options.branchContext);
  const types = resolveSnapshotTypes(options.provider, options.types, verbose);

  // Reactive Architecture: Dispatch directly to Praxis instead of using sendToWebview.
  // Praxis will update context and syncState will send full state to webview.
  const enrichedWorkItems = enrichWorkItems(items, connectionId, branchContext);
  dispatchApplicationEvent({
    type: 'WORK_ITEMS_LOADED',
    workItems: enrichedWorkItems,
    connectionId,
    query: options.query,
    kanbanView: !!options.kanbanView,
    types,
  });
}
*/

function hasConfigOverride<T>(metadata: ConfigInspection<T> | undefined): boolean {
  if (!metadata) return false;
  const overrideValues = [
    metadata.globalValue,
    metadata.workspaceValue,
    metadata.workspaceFolderValue,
    metadata.globalLanguageValue,
    metadata.workspaceLanguageValue,
    metadata.workspaceFolderLanguageValue,
  ];
  return overrideValues.some((value) => value !== undefined);
}

export function resolveDefaultQuery(_config: vscode.WorkspaceConfiguration): string {
  const getValue = (key: string): string | undefined => {
    try {
      const raw = _config?.get<string | undefined>(key);
      if (typeof raw !== 'string') return undefined;
      const trimmed = raw.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    } catch {
      return undefined;
    }
  };

  const explicitDefault = getValue('defaultQuery');
  if (explicitDefault) return explicitDefault;

  const workItemQuery = getValue('workItemQuery');
  if (workItemQuery) {
    const inspectFn =
      typeof _config?.inspect === 'function' ? _config.inspect.bind(_config) : undefined;
    if (!inspectFn) return workItemQuery;
    try {
      const metadata = (inspectFn as any)('workItemQuery');
      if (hasConfigOverride(metadata)) return workItemQuery;
    } catch {
      // If inspect fails, assume the user intentionally set a custom query to avoid breaking legacy behavior.
      return workItemQuery;
    }
  }

  return DEFAULT_QUERY;
}

function getDefaultQuery(config?: vscode.WorkspaceConfiguration): string {
  const target = config ?? getConfig();
  return resolveDefaultQuery(target);
}

/*
async function setOpenAIApiKey(context: vscode.ExtensionContext) {
  const apiKey = await vscode.window.showInputBox({
    prompt: 'Enter your OpenAI API Key',
    password: true,
  });
  if (apiKey) {
    // await context.secrets.store(OPENAI_SECRET_KEY, apiKey);
    vscode.window.showInformationMessage('OpenAI API Key saved successfully.');
    // openAiClient = new OpenAI({ apiKey });
  }
}

function getExtensionVersion(context: vscode.ExtensionContext): string {
  // if (cachedExtensionVersion) return cachedExtensionVersion;
  try {
    const pkgPath = path.join(context.extensionPath, 'package.json');
    const pkgRaw = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(pkgRaw);
    // cachedExtensionVersion = String(pkg.version || 'dev');
    return String(pkg.version || 'dev');
  } catch {
    // Swallow errors and fall back to 'dev'
    // cachedExtensionVersion = 'dev';
    return 'dev';
  }
  // return cachedExtensionVersion;
}
async function migrateLegacyConfigIfNeeded() {
  try {
    const legacy = vscode.workspace.getConfiguration(LEGACY_CONFIG_NS);
    const target = getConfig();
    const legacyOrg = legacy.get<string>('organization');
    const legacyProj = legacy.get<string>('project');
    if (legacyOrg && !target.get('organization'))
      await target.update('organization', legacyOrg, vscode.ConfigurationTarget.Global);
    if (legacyProj && !target.get('project'))
      await target.update('project', legacyProj, vscode.ConfigurationTarget.Global);
  } catch (e) {
    // Automatic logging will capture this warning - activationLogger.warn('migrateLegacyConfigIfNeeded failed', { meta: e });
  }
}
*/

/**
 * Apply startup patches to fix user settings and configuration issues.
 * This system automatically resolves problems without requiring manual user intervention.
 *
 * Each patch has a version identifier to ensure it only runs once per user.
 * Add new patches here for future bug fixes that need to modify user settings.
 *
 * @param context VS Code extension context for accessing settings and state
 */
async function applyStartupPatches(context: vscode.ExtensionContext): Promise<void> {
  try {
    const patchState = context.globalState;
    const PATCH_VERSION_KEY = 'azureDevOpsInt.appliedPatches';
    const appliedPatches = patchState.get<string[]>(PATCH_VERSION_KEY, []);

    // Patch 1.0.0-clientid-removal: Remove clientId from connection configurations
    // This fixes authentication issues caused by storing incorrect client IDs per connection
    if (!appliedPatches.includes('1.0.0-clientid-removal')) {
      await applyClientIdRemovalPatch();
      appliedPatches.push('1.0.0-clientid-removal');
      await patchState.update(PATCH_VERSION_KEY, appliedPatches);
      // Automatic logging will capture this
    }

    // Future patches can be added here following the same pattern:
    // if (!appliedPatches.includes('1.1.0-some-other-fix')) {
    //   await applySomeOtherPatch();
    //   appliedPatches.push('1.1.0-some-other-fix');
    //   await patchState.update(PATCH_VERSION_KEY, appliedPatches);
    //   console.log('[azureDevOpsInt] Applied patch: 1.1.0-some-other-fix');
    // }
  } catch (error) {
    // Automatic logging will capture this warning - activationLogger.warn('Failed to apply startup patches', { meta: error });
    // Don't fail activation if patches fail - log and continue
  }
}

/**
 * Patch to remove clientId from connection configurations.
 *
 * PROBLEM: Earlier versions allowed users to configure clientId per connection,
 * which caused authentication failures when users stored incorrect client IDs.
 *
 * SOLUTION: Remove all clientId fields from stored connections. The extension
 * now hardcodes the correct Azure DevOps client ID (872cd9fa-d31f-45e0-9eab-6e460a02d1f1)
 * in the authentication code, preventing user configuration errors.
 */
async function applyClientIdRemovalPatch(): Promise<void> {
  const config = vscode.workspace.getConfiguration('azureDevOpsIntegration');
  const connections = config.get<ProjectConnection[]>('connections', []);

  let patchedCount = 0;
  const patchedConnections = connections.map((conn) => {
    if ('clientId' in conn) {
      patchedCount++;
      const { clientId, ...connWithoutClientId } = conn as any;
      return connWithoutClientId;
    }
    return conn;
  });

  if (patchedCount > 0) {
    await config.update('connections', patchedConnections, vscode.ConfigurationTarget.Global);
    // Automatic logging will capture this
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export async function activate(context: vscode.ExtensionContext) {
  // Store reference to our rejection handler for proper cleanup
  rejectionHandler = (reason: any, promise: Promise<any>) => {
    // Only handle rejections that originate from our extension
    const isFromOurExtension =
      reason &&
      typeof reason === 'object' &&
      'stack' in reason &&
      typeof reason.stack === 'string' &&
      (reason.stack.includes('azuredevops-integration-extension') ||
        reason.stack.includes('azureDevOpsInt') ||
        reason.stack.includes('activation.ts') ||
        reason.stack.includes('src\\praxis\\') ||
        reason.stack.includes('src/praxis/'));

    // Skip rejections from other extensions
    if (!isFromOurExtension) {
      return;
    }

    // Suppress cancellation errors which are normal during VS Code shutdown
    if (reason && typeof reason === 'object') {
      // Check for cancellation by name, message, or stack trace content
      const isCancellation =
        ('name' in reason && reason.name === 'Canceled') ||
        ('message' in reason && reason.message === 'Canceled') ||
        (reason.toString && reason.toString().includes('Canceled')) ||
        ('stack' in reason &&
          typeof reason.stack === 'string' &&
          reason.stack.includes('Canceled'));

      if (isCancellation) {
        // Automatic logging will capture this
        return;
      }
    }
    // Try to extract meaningful error information
    let errorInfo: any = reason;
    if (reason && typeof reason === 'object') {
      errorInfo = {
        message: reason.message || reason.toString(),
        name: reason.name,
        stack: reason.stack,
        code: reason.code,
        errorCode: reason.errorCode,
        ...reason,
      };
    } else if (reason !== undefined && reason !== null) {
      errorInfo = { value: String(reason) };
    }

    // Automatic logging will capture this error
  };

  // Add global unhandled promise rejection handler
  process.on('unhandledRejection', rejectionHandler);

  // Add global uncaught exception handler
  process.on('uncaughtException', (error) => {
    // Automatic logging will capture this error - activationLogger.error('Uncaught Exception', { meta: error });
  });

  extensionContextRef = context;
  setExtensionContextRefBridge(context);
  ConnectionService.getInstance().setContext(context);

  // Hydrate persisted per-connection query selections (if present)
  try {
    const persistedQueries =
      context.globalState.get<Record<string, string>>(ACTIVE_QUERY_STATE_KEY) || {};
    for (const [connId, q] of Object.entries(persistedQueries)) {
      if (typeof connId === 'string' && typeof q === 'string' && q.trim().length > 0) {
        activeQueryByConnection.set(connId, q.trim());
      }
    }
  } catch {
    // Non-fatal: persistence is best-effort
  }

  // Apply startup patches to fix user settings and configuration issues
  await applyStartupPatches(context);

  // In smoke mode (integration tests), minimize activation work to avoid any potential stalls.
  if (IS_SMOKE) {
    try {
      vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', false).then(
        () => {},
        () => {}
      );
    } catch {
      /* ignore */
    }
    // Do not register views/commands or initialize any domain objects in smoke mode.
    return undefined;
  }
  const cfg = getConfig();
  if (cfg.get<boolean>('debugLogging')) {
    const channel =
      getOutputChannel() ?? vscode.window.createOutputChannel('Azure DevOps Integration');
    setOutputChannel(channel);
    // Use standardized logger format: [azuredevops-integration-extension][ext][activation][activation][enableDebugLogging]
    standardizedLogger.info('activation', 'activation', 'enableDebugLogging', 'Debug logging enabled');
    // Bridge console logging to Output Channel for better debugging
    bridgeConsoleToOutputChannel();
  }
  // Status bar (hidden until connected or timer active)
  // Use compatibility signature (alignment, priority) to avoid VS Code API version issues
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'azureDevOpsInt.stopTimer';
  context.subscriptions.push(statusBarItem);

  // Auth status bar item (shows Entra ID token status)
  // Use compatibility signature (alignment, priority) to avoid VS Code API version issues
  authStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
  authStatusBarItem.command = 'azureDevOpsInt.signInWithEntra';
  context.subscriptions.push(authStatusBarItem);
  // Show a minimal default immediately; updateAuthStatusBar will refine it
  authStatusBarItem.text = '$(plug) Azure DevOps';
  authStatusBarItem.tooltip = 'Azure DevOps Integration';
  authStatusBarItem.backgroundColor = undefined;
  authStatusBarItem.command = 'azureDevOpsInt.setup';
  authStatusBarItem.show();

  // Set global reference for reactive status bar updates
  // updateAuthStatusBarRef = updateAuthStatusBar;
  (globalThis as any).__updateAuthStatusBar = updateAuthStatusBar;

  // Global map to store pending auth code flow providers by connection ID
  // This allows the URI handler to route redirects to the correct provider
  const pendingAuthProviders = new Map<string, any>();
  (globalThis as any).__pendingAuthProviders = pendingAuthProviders;

  // Register URI handler for authorization code flow
  const uriHandler = vscode.window.registerUriHandler({
    handleUri: async (uri: vscode.Uri) => {
      try {
        // Only handle our custom scheme
        if (uri.scheme !== 'vscode-azuredevops-int') {
          return;
        }

        // Handle auth callback
        if (uri.path === '/auth/callback') {
          await handleAuthRedirect(uri, context, pendingAuthProviders);
        }
      } catch (error: any) {
        // Automatic logging will capture this error - activationLogger.error(`URI handler error: ${error.message}`, { meta: error });
        vscode.window.showErrorMessage(`Authentication error: ${error.message}`);
      }
    },
  });
  context.subscriptions.push(uriHandler);

  // const authenticationProviderOptions: vscode.AuthenticationProviderOptions & {
  //   supportsAccountManagement?: boolean;
  // } = {
  //   supportsMultipleAccounts: true,
  //   supportsAccountManagement: true,
  // };
  // LEGACY AUTH REMOVED - Authentication provider registration replaced by Praxis authentication

  // Ensure applicationStore is initialized before registering webview provider
  // This prevents race conditions where the webview panel resolves before the Praxis actor is available
  // Automatic logging will capture this
  await ensureSharedContextBridge(context);
  // Automatic logging will capture this

  // Register the work items webview view resolver (guard against duplicate registration)
  if (!viewProviderRegistered) {
    // Automatic logging will capture this
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        'azureDevOpsWorkItems',
        new AzureDevOpsIntViewProvider(context),
        { webviewOptions: { retainContextWhenHidden: true } }
      )
    );
    viewProviderRegistered = true;
  }
  // Register trace commands for full replay capability
  registerTraceCommands(context);

  // Register quick debug commands for instant troubleshooting
  registerQuickDebugCommands(context);
  // Automatic logging will capture this

  // Register output channel reader for programmatic log access
  import('./commands/outputChannelReader.js')
    .then(({ registerOutputChannelReader }) => {
      registerOutputChannelReader(context);
      // Automatic logging will capture this
    })
    .catch((error) => {
      // Automatic logging will capture this error
    });

  // AUTO-START TRACING AND SHOW OUTPUT FOR DEBUGGING
  // Automatic logging will capture this

  // Import tracing modules
  import('./logging/TraceLogger.js')
    .then(({ startTraceSession }) => {
      try {
        const sessionId = startTraceSession('Extension Activation - Auto Debug Session');
        // Automatic logging will capture this

        // Show the output channel immediately for visibility
        import('./logging/ComponentLogger.js')
          .then(({ componentLogger, Component }) => {
            componentLogger.showOutputChannel();
            // Automatic logging will capture this

            // Log activation start
            componentLogger.info(Component.APPLICATION, 'Extension activation started', {
              component: Component.APPLICATION,
              event: 'ACTIVATE',
              state: 'activating',
            });
          })
          .catch((error) => {
            // Automatic logging will capture this error
          });
      } catch (error) {
        // Automatic logging will capture this error - activationLogger.error('[ACTIVATION] Failed to start tracing', { meta: error });
      }
    })
    .catch((error) => {
      // Automatic logging will capture this error - activationLogger.error('[ACTIVATION] Failed to import tracing modules', { meta: error });
    });

  // Import LiveCanvasBridge to enable the WebSocket connection to the live canvas
  import('./logging/LiveCanvasBridge.js')
    .then(({ LiveCanvasBridge }) => {
      try {
        // Initialize LiveCanvasBridge
        const bridge = new LiveCanvasBridge(dispatchApplicationEvent);
        context.subscriptions.push({ dispose: () => bridge.dispose() });
        // Automatic logging will capture this
      } catch (error) {
        // Automatic logging will capture this error
      }
    })
    .catch((error) => {
      // Automatic logging will capture this error - activationLogger.error('[ACTIVATION] Failed to import LiveCanvasBridge', { meta: error });
    });

  // Bridge setup
  // const praxisSetupService = new PraxisSetupService(context);

  const appActor = getApplicationStoreActor();

  // Activate the application with extension context
  if (appActor && typeof (appActor as any).send === 'function') {
    // Automatic logging will capture this
    (appActor as any).send({ type: 'ACTIVATE', context });

    // Drive the activation process
    loadConnectionsFromConfig(context)
      .then((loadedConnections) => {
        // Automatic logging will capture this
        (appActor as any).send({ type: 'CONNECTIONS_LOADED', connections: loadedConnections });

        if (activeConnectionId) {
          // Automatic logging will capture this
          (appActor as any).send({ type: 'CONNECTION_SELECTED', connectionId: activeConnectionId });

          // Proactively ensure connection on startup
          ensureActiveConnection(context, activeConnectionId, {
            refresh: true,
            notify: true, // Ensure errors are shown on startup
          }).catch((err) => {
            // Automatic logging will capture this
          });
        }

        // Automatic logging will capture this
        (appActor as any).send({ type: 'ACTIVATION_COMPLETE' });
      })
      .catch((error) => {
        // Automatic logging will capture this error
        (appActor as any).send({ type: 'ERROR', error });
      });
  }

  // Track previous device code session to detect changes
  let previousDeviceCodeSession: { connectionId: string; expiresAt: number } | undefined =
    undefined;
  let lastDeviceCodeNotificationKey: string | undefined = undefined;

  if (appActor && typeof (appActor as any).subscribe === 'function') {
    (appActor as any).subscribe((snapshot: any) => {
      // CRITICAL: Update global activeConnectionId when application context changes
      // This ensures status bar and refresh use the correct connection
      const praxisActiveConnectionId = snapshot?.context?.activeConnectionId;
      if (praxisActiveConnectionId !== activeConnectionId) {
        const previousActiveConnectionId = activeConnectionId;
        activeConnectionId = praxisActiveConnectionId;
        // Automatic logging will capture this

        // Update status bar immediately when active connection changes
        setImmediate(() => {
          updateAuthStatusBar().catch((err) => {
            // Automatic logging will capture this
          });
        });

        // If the newly active connection is not connected, proactively ensure and, if needed, prompt
        // BUT: Skip if this connection was recently signed out (prevents automatic reconnection after sign out)
        try {
          if (extensionContextRef && activeConnectionId) {
            // Check if this connection was recently signed out
            if (recentlySignedOutConnections.has(activeConnectionId)) {
              // Automatic logging will capture this
            } else {
              const connectionService = ConnectionService.getInstance();
              const manager = connectionService.getConnectionManager(activeConnectionId);
              const stateValue = manager?.getConnectionState() || null;
              const targetState = connectionStates.get(activeConnectionId);
              const hasProvider = !!targetState?.provider;
              const isConnected =
                stateValue === 'connected' || (targetState && targetState.isConnected === true);
              if (!hasProvider || !isConnected) {
                // Attempt to establish connection; allow interactive auth so user is prompted if required
                ensureActiveConnection(extensionContextRef, activeConnectionId, {
                  refresh: true,
                  interactive: true,
                }).catch((err) => {
                  // Automatic logging will capture this
                });
              }
            }
          }
        } catch (err) {
          // Automatic logging will capture this
        }
      }

      // Check if device code session changed and update status bar
      const currentDeviceCodeSession = snapshot?.context?.deviceCodeSession;
      const deviceCodeSessionChanged =
        currentDeviceCodeSession?.connectionId !== previousDeviceCodeSession?.connectionId ||
        currentDeviceCodeSession?.expiresAt !== previousDeviceCodeSession?.expiresAt;

      if (deviceCodeSessionChanged && currentDeviceCodeSession) {
        // Device code session started or changed - update status bar
        setImmediate(() => {
          updateAuthStatusBar().catch((err) => {
            dispatchApplicationEvent(
              ApplicationErrorEvent.create({
                error: `Failed to update status bar after device code session change: ${err instanceof Error ? err.message : String(err)}`,
              })
            );
          });
        });

        const sessionKey = `${currentDeviceCodeSession.connectionId}:${currentDeviceCodeSession.expiresAt}`;
        if (sessionKey !== lastDeviceCodeNotificationKey) {
          lastDeviceCodeNotificationKey = sessionKey;
          setImmediate(() => {
            showDeviceCodeNotification({
              connectionId: currentDeviceCodeSession.connectionId,
              userCode: currentDeviceCodeSession.userCode,
              verificationUri: currentDeviceCodeSession.verificationUri,
              expiresInSeconds: currentDeviceCodeSession.expiresInSeconds,
            }).catch((err) => {
              // Automatic logging will capture this warning
            });
          });
        }
      }

      previousDeviceCodeSession = currentDeviceCodeSession
        ? {
            connectionId: currentDeviceCodeSession.connectionId,
            expiresAt: currentDeviceCodeSession.expiresAt,
          }
        : undefined;
      if (!currentDeviceCodeSession) {
        lastDeviceCodeNotificationKey = undefined;
      }

      if (panel && snapshot) {
        // Pre-compute all state matches since snapshot.matches() doesn't survive JSON serialization

        // Helper for robust matching (copied from AzureDevOpsIntViewProvider)
        const state = snapshot.value;
        const matchesFn = (stateValue: any) => {
          if (typeof stateValue === 'string') {
            return (
              state === stateValue || (typeof state === 'string' && state.includes(stateValue))
            );
          }
          if (typeof stateValue === 'object' && stateValue !== null) {
            const key = Object.keys(stateValue)[0];
            const subValue = stateValue[key];
            if (typeof state === 'string') {
              if (state === key) return false;
              if (typeof subValue === 'string') {
                return state === `${key}.${subValue}` || state.startsWith(`${key}.${subValue}.`);
              }
              return false;
            }
            if (typeof state === 'object' && state !== null) {
              const stateSubValue = state[key];
              if (stateSubValue === subValue) return true;
              if (
                typeof subValue === 'string' &&
                typeof stateSubValue === 'object' &&
                stateSubValue !== null
              ) {
                return Object.keys(stateSubValue)[0] === subValue;
              }
              return false;
            }
          }
          return false;
        };

        const matches = {
          // Top-level states
          inactive: matchesFn('inactive'),
          activating: matchesFn('activating'),
          activation_failed: matchesFn('activation_failed'),
          active: matchesFn('active'),
          error_recovery: matchesFn('error_recovery'),
          deactivating: matchesFn('deactivating'),

          // Active sub-states
          'active.setup': matchesFn({ active: 'setup' }),
          'active.setup.loading_connections': matchesFn({
            active: { setup: 'loading_connections' },
          }),
          'active.setup.waiting_for_panel': matchesFn({
            active: { setup: 'waiting_for_panel' },
          }),
          'active.setup.panel_ready': matchesFn({ active: { setup: 'panel_ready' } }),
          'active.setup.setup_error': matchesFn({ active: { setup: 'setup_error' } }),

          // Active.ready sub-states
          'active.ready': matchesFn({ active: 'ready' }),
          'active.ready.idle': matchesFn({ active: { ready: 'idle' } }),
          'active.ready.loadingData': matchesFn({ active: { ready: 'loadingData' } }),
          'active.ready.managingConnections': matchesFn({
            active: { ready: 'managingConnections' },
          }),
          'active.ready.error': matchesFn({ active: { ready: 'error' } }),
        };

        const serializableState = {
          praxisState: snapshot.value,
          context: getSerializableContext(snapshot.context),
          matches, // Include pre-computed state matches
        };

        // Deduplicate: only send if state changed (Priority 2: Reduce redundant syncs)
        const signature = JSON.stringify(serializableState);
        if (signature === lastStateSignature) {
          return; // No change, skip sending duplicate state
        }
        lastStateSignature = signature;

        // Reduce excessive logging - only log state changes if debug logging is enabled
        if (shouldLogDebug()) {
          // Automatic logging will capture this
        }

        panel.webview.postMessage({
          type: 'syncState',
          payload: serializableState,
        });

        // If activeQuery changed, persist and trigger provider refresh (for the correct connection)
        try {
          const snapCtx = snapshot.context;
          const newQuery: string | undefined = snapCtx?.activeQuery;
          const newConn: string | undefined = snapCtx?.activeConnectionId;
          if (newConn && typeof newQuery === 'string') {
            const changed =
              newConn !== lastQueriedActiveConnectionId || newQuery !== lastQueriedQuery;
            if (changed) {
              // Persist query in per-connection store
              setStoredQueryForConnection(newConn, newQuery);
              // Ensure provider for the TARGET connection, not the global provider
              const targetState = connectionStates.get(newConn);
              const targetProvider = targetState?.provider;
              if (targetProvider && typeof targetProvider.refresh === 'function') {
                try {
                  targetProvider.refresh(newQuery);
                } catch (e) {
                  // Automatic logging will capture this
                }
              } else if (extensionContextRef) {
                // No provider yet - ensure connection (may trigger interactive auth if required)
                ensureActiveConnection(extensionContextRef, newConn, { refresh: true }).catch(
                  (err) => {
                    // Automatic logging will capture this
                  }
                );
              }
              lastQueriedActiveConnectionId = newConn;
              lastQueriedQuery = newQuery;
            }
          }
        } catch (e) {
          // Automatic logging will capture this
        }
        // Update VS Code context key for debug view visibility so menus can react
        try {
          vscode.commands
            .executeCommand(
              'setContext',
              'azureDevOpsInt.debugViewVisible',
              !!snapshot.context?.debugViewVisible
            )
            .then(
              () => {},
              () => {}
            );
        } catch {
          /* ignore context key errors */
        }
      }
    });
  }

  // Core commands - using extracted commands module
  const commandContext = {
    context,
    panel,
    provider,
    sessionTelemetry,
    client,
    statusBarItem,
    authStatusBarItem,
  };

  // Automatic logging will capture this

  const commandDisposables = registerCommands(context, commandContext);
  // Automatic logging will capture this
  context.subscriptions.push(...commandDisposables);

  // Set up listeners and handlers
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration(CONFIG_NS)) {
        await loadConnectionsFromConfig(context);
        // Don't block on connection refresh during config changes
        ensureActiveConnection(context, activeConnectionId, { refresh: true }).catch((error) => {
          // Automatic logging will capture this
        });
      }
    })
  );

  // The webview will initialize immediately and show auth UI when ready
  ensureActiveConnection(context, activeConnectionId, { refresh: true })
    .then(() => {
      // Ensure status bar is shown after initial connection
      // Small delay to allow application to process device code session if it exists
      setTimeout(() => {
        updateAuthStatusBar().catch((error) => {
          // Automatic logging will capture this
        });
      }, 500);
    })
    .catch((error) => {
      // Automatic logging will capture this
      // Still try to update status bar even if connection failed
      setTimeout(() => {
        updateAuthStatusBar().catch((err) => {
          // Automatic logging will capture this
        });
      }, 500);
    });

  // Also update status bar immediately on startup (in case device code session already exists)
  setTimeout(() => {
    updateAuthStatusBar().catch((err) => {
      // Automatic logging will capture this
    });
  }, 1000);

  // Start periodic cache cleanup
  startCacheCleanup();

  // Start memory optimizer
  // const memoryOptimizer = new MemoryOptimizer();

  // Start periodic token refresh
  if (tokenRefreshInterval) clearInterval(tokenRefreshInterval);
  tokenRefreshInterval = setInterval(
    () => {
      for (const connectionId of connectionStates.keys()) {
        dispatchApplicationEvent({ type: 'REFRESH_TOKEN', connectionId });
      }
    },
    15 * 60 * 1000
  ); // every 15 minutes

  // Start periodic build status refresh
  for (const connectionId of connectionStates.keys()) {
    updateBuildRefreshTimer(connectionId, connectionStates.get(connectionId)?.provider, true);
  }

  // Start periodic garbage collection if enabled
  if (global.gc) {
    if (gcInterval) clearInterval(gcInterval);
    gcInterval = setInterval(
      () => {
        global.gc?.();
        // Automatic logging will capture this
      },
      5 * 60 * 1000
    ); // every 5 minutes
  }
}

export function deactivate(): Thenable<void> {
  // isDeactivating = true;
  // Automatic logging will capture this

  // Stop periodic tasks
  stopCacheCleanup();
  for (const connectionId of connectionStates.keys()) {
    updateBuildRefreshTimer(connectionId, undefined, false);
  }
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
    tokenRefreshInterval = undefined;
  }
  if (gcInterval) {
    clearInterval(gcInterval);
    gcInterval = undefined;
  }

  // Clear all caches and state
  connectionStates.clear();
  activeQueryByConnection.clear();

  dispatchApplicationEvent({ type: 'EXTENSION_DEACTIVATED' });
  // Automatic logging will capture this

  return Promise.resolve();
}

// Helper function to extract only serializable properties from application context
function getSerializableContext(context: any): Record<string, any> {
  if (!context) {
    return {};
  }

  // Debug: log what we're serializing
  // Only log context serialization if debug logging is enabled
  if (shouldLogDebug()) {
    // Automatic logging will capture this
  }

  // Extract connection error from connection machine if available
  let workItemsError: string | undefined = undefined;
  let workItemsErrorConnectionId: string | undefined = undefined;

  if (context.activeConnectionId) {
    try {
      // First check connectionStates Map from Praxis context (most reliable)
      const connectionStatesMap = context.connectionStates instanceof Map 
        ? context.connectionStates 
        : context.connectionStates 
          ? new Map(Object.entries(context.connectionStates))
          : new Map();
      
      const praxisConnectionState = connectionStatesMap.get(context.activeConnectionId);
      
      // Check if connection is in error/disconnected state
      if (praxisConnectionState && (!praxisConnectionState.isConnected || praxisConnectionState.state === 'disconnected' || praxisConnectionState.state === 'auth_failed')) {
        // Determine auth method to provide appropriate error message
        const activeConnection = context.connections?.find((c: any) => c.id === context.activeConnectionId);
        const isEntraAuth = activeConnection?.authMethod === 'entra';
        
        if (praxisConnectionState.state === 'auth_failed') {
          workItemsError = isEntraAuth 
            ? 'Entra ID authentication failed. Start a new sign-in to choose PAT or begin device code again.'
            : 'Authentication failed. Please check your credentials and try again.';
        } else if (!praxisConnectionState.isConnected || praxisConnectionState.state === 'disconnected') {
          workItemsError = isEntraAuth
            ? 'Connection not authenticated. Sign in to continue.'
            : 'Connection not authenticated. Please configure your credentials.';
        }
        
        if (workItemsError) {
          workItemsErrorConnectionId = context.activeConnectionId;
        }
      }
      
      // Also check ConnectionService for explicit error messages (takes precedence)
      const connectionService = ConnectionService.getInstance();
      const connectionManager = connectionService.getConnectionManager(context.activeConnectionId);
      if (connectionManager) {
        const connectionData = connectionManager.getConnectionData();
        if (connectionData.lastError) {
          workItemsError = connectionData.lastError;
          workItemsErrorConnectionId = context.activeConnectionId;
        }
      }
    } catch (e) {
      if (shouldLogDebug()) {
        // Automatic logging will capture this warning
      }
    }
  }

  // Extract only serializable properties, excluding VS Code API objects and actors
  const serialized = {
    isActivated: context.isActivated,
    isDeactivating: context.isDeactivating,
    connections: context.connections || [],
    activeConnectionId: context.activeConnectionId,
    activeQuery: context.activeQuery,
    connectionStates: context.connectionStates ? Object.fromEntries(context.connectionStates) : {},
    pendingAuthReminders: context.pendingAuthReminders
      ? Object.fromEntries(context.pendingAuthReminders)
      : {},
    pendingWorkItems: context.pendingWorkItems,
    workItems: context.pendingWorkItems?.workItems || [],
    timerState: context.timerState,
    lastError: context.lastError
      ? { message: context.lastError.message, stack: context.lastError.stack }
      : undefined,
    errorRecoveryAttempts: context.errorRecoveryAttempts,
    viewMode: context.viewMode,
    kanbanColumns: context.kanbanColumns,
    workItemsError,
    workItemsErrorConnectionId,
    debugLoggingEnabled: context.debugLoggingEnabled,
    debugViewVisible: context.debugViewVisible,
    // Serialize per-connection Maps to plain objects for webview
    connectionQueries: context.connectionQueries
      ? Object.fromEntries(context.connectionQueries)
      : {},
    connectionWorkItems: context.connectionWorkItems
      ? Object.fromEntries(context.connectionWorkItems)
      : {},
    connectionFilters: context.connectionFilters
      ? Object.fromEntries(context.connectionFilters)
      : {},
    connectionViewModes: context.connectionViewModes
      ? Object.fromEntries(context.connectionViewModes)
      : {},
    deviceCodeSession: context.deviceCodeSession
      ? {
          connectionId: context.deviceCodeSession.connectionId,
          userCode: context.deviceCodeSession.userCode,
          verificationUri: context.deviceCodeSession.verificationUri,
          startedAt: context.deviceCodeSession.startedAt,
          expiresAt: context.deviceCodeSession.expiresAt,
          expiresInSeconds: context.deviceCodeSession.expiresInSeconds,
          remainingMs: Math.max(context.deviceCodeSession.expiresAt - Date.now(), 0),
        }
      : undefined,
    authCodeFlowSession: context.authCodeFlowSession
      ? {
          connectionId: context.authCodeFlowSession.connectionId,
          authorizationUrl: context.authCodeFlowSession.authorizationUrl,
          startedAt: context.authCodeFlowSession.startedAt,
          expiresAt: context.authCodeFlowSession.expiresAt,
          expiresInSeconds: context.authCodeFlowSession.expiresInSeconds,
          remainingMs: Math.max(context.authCodeFlowSession.expiresAt - Date.now(), 0),
        }
      : undefined,
  };

  // Only log serialization if debug logging is enabled to prevent log spam
  if (shouldLogDebug()) {
    // Automatic logging will capture this
  }

  return serialized;
}

/**
 * Handle authorization redirect URI from browser
 */
async function handleAuthRedirect(
  uri: vscode.Uri,
  context: vscode.ExtensionContext,
  pendingAuthProviders: Map<string, any>
): Promise<void> {
  try {
    // Parse URI parameters
    const params = new URLSearchParams(uri.query);
    const authorizationCode = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    // Check for errors
    if (error) {
      const errorMsg = errorDescription || error;
      // Automatic logging will capture this error - activationLogger.error(`Authorization error: ${errorMsg}`);
      vscode.window.showErrorMessage(`Authentication failed: ${errorMsg}`);
      return;
    }

    if (!authorizationCode || !state) {
      // Automatic logging will capture this error - activationLogger.error('Missing authorization code or state in redirect URI');
      vscode.window.showErrorMessage('Invalid authentication response');
      return;
    }

    // Find provider by checking state parameter
    let connectionId: string | undefined;
    let provider: any;

    for (const [connId, prov] of pendingAuthProviders.entries()) {
      const pendingState = prov.getPendingAuthState?.();
      if (pendingState === state) {
        connectionId = connId;
        provider = prov;
        break;
      }
    }

    if (!provider || !connectionId) {
      // Automatic logging will capture this error - activationLogger.error('No pending authentication found for redirect');
      vscode.window.showErrorMessage('Authentication session expired. Please try again.');
      return;
    }

    // Dispatch event
    dispatchApplicationEvent(
      AuthRedirectReceivedAppEvent.create({
        connectionId: connectionId,
        authorizationCode: authorizationCode,
        state: state,
      })
    );

    // Handle redirect
    const result = await provider.handleRedirectUri(uri);

    if (result.success) {
      // Dispatch completion event
      dispatchApplicationEvent(
        AuthCodeFlowCompletedAppEvent.create({
          connectionId: connectionId,
          success: true,
        })
      );

      // Clear pending provider
      pendingAuthProviders.delete(connectionId);

      vscode.window.showInformationMessage('Authentication successful!');
    } else {
      // Dispatch failure event
      dispatchApplicationEvent(
        AuthCodeFlowCompletedAppEvent.create({
          connectionId: connectionId,
          success: false,
          error: result.error,
        })
      );

      vscode.window.showErrorMessage(`Authentication failed: ${result.error}`);
    }
  } catch (error: any) {
    // Automatic logging will capture this error - activationLogger.error(`Redirect handling error: ${error.message}`, { meta: error });
    vscode.window.showErrorMessage(`Authentication error: ${error.message}`);
  }
}

import { interceptWebviewMessages } from './logging/MessageInterceptor.js';
import { standardizedLogger } from './logging/StandardizedAutomaticLogger.js';

class AzureDevOpsIntViewProvider implements vscode.WebviewViewProvider {
  public view?: vscode.WebviewView;
  private readonly extensionUri: vscode.Uri;
  private readonly appActor: ReturnType<typeof getApplicationActor>;

  constructor(_context: vscode.ExtensionContext) {
    this.extensionUri = _context.extensionUri;
    this.appActor = getApplicationActor();
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.view = webviewView;
    panel = webviewView; // Store in global for snapshot subscription

    // CRITICAL: When panel is created, immediately send current Praxis state
    // This ensures work items loaded before panel creation are sent to webview
    // (State will be sent below after webview setup is complete)
    const webview = webviewView.webview;
    
    // Intercept webview messages for automatic logging
    // Store intercepted methods to use instead of direct webview calls
    // Automatic logging will capture this - activationLogger.info('[AzureDevOpsIntViewProvider] Setting up automatic message logging');
    let interceptedWebview: ReturnType<typeof interceptWebviewMessages> | undefined;
    try {
      interceptedWebview = interceptWebviewMessages(webview, 'webview-provider');
      // Automatic logging will capture this - activationLogger.info('[AzureDevOpsIntViewProvider] Automatic message logging set up');
    } catch (err) {
      // Automatic logging will capture this error
    }
    
    webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
    };

    const nonce = getNonce();
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'webview', 'main.js')
    );
    // Link to main.css which contains Svelte component styles from esbuild
    const mainCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'webview', 'main.css')
    );

    // The 'unsafe-eval' is required for Svelte's dev mode.
    // TODO: Remove 'unsafe-eval' in production builds.
    const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' 'unsafe-eval'; img-src ${webview.cspSource} data:; connect-src 'self';`;

    webview.html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="${csp}">
        <link href="${mainCssUri}" rel="stylesheet">
        <title>Work Items</title>
      </head>
      <body>
        <div id="svelte-root" style="padding:12px;font-family:var(--vscode-font-family,sans-serif);color:var(--vscode-foreground);">
          <div style="opacity:0.8">Loading Azure DevOps Integration…</div>
        </div>
        <script nonce="${nonce}">
          // Early error trap before module loads
          (function() {
            const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;
            const post = (payload) => {
              try { vscode?.postMessage({ type: 'webviewPreError', payload }); } catch {}
            };
            window.addEventListener('error', (event) => {
              post({ kind: 'error', message: String(event.message), filename: event.filename, lineno: event.lineno, colno: event.colno, stack: event.error?.stack });
            });
            window.addEventListener('unhandledrejection', (event) => {
              post({ kind: 'unhandledrejection', reason: String((event as any)?.reason) });
            });
            post({ kind: 'preload_ready', readyState: document.readyState });
          })();
        </script>
        <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>
    `;

    // Attach shared context bridge so webview can request/receive context updates (getContext)
    const bridge = sharedContextBridge;
    if (bridge?.attachWebview) {
      try {
        bridge.attachWebview(webview);
      } catch (error) {
        // Automatic logging will capture this warning
      }

      webviewView.onDidDispose(() => {
        try {
          bridge?.detachWebview();
        } catch (error) {
          // Automatic logging will capture this warning
        }

        if (panel === webviewView) {
          panel = undefined;
        }
      });
    }

    // Helper to send current state to webview
    // Uses module-level lastStateSignature for deduplication
    const sendCurrentState = () => {
      const appActor = getApplicationStoreActor();
      // Automatic logging will capture this

      if (appActor) {
        let snapshot: any = undefined;
        let matchesFn: ((state: any) => boolean) | undefined = undefined;

        // Check if it's PraxisApplicationManager (has getApplicationState)
        if (typeof (appActor as any).getApplicationState === 'function') {
          const manager = appActor as any;
          const state = manager.getApplicationState();
          const context = manager.getContext();

          snapshot = {
            value: state,
            context: context,
          };

          matchesFn = (stateValue: any) => {
            if (typeof stateValue === 'string') {
              return (
                state === stateValue || (typeof state === 'string' && state.includes(stateValue))
              );
            }
            if (typeof stateValue === 'object' && stateValue !== null) {
              // Simple check for top-level key match for object patterns
              const key = Object.keys(stateValue)[0];
              const subValue = stateValue[key];

              // If state is a string, it must match the specific substate (e.g. "active.setup")
              // It should NOT match if state is just the parent (e.g. "active")
              if (typeof state === 'string') {
                if (state === key) {
                  return false; // "active" does not match { active: 'setup' }
                }
                // Check for dot notation "active.setup"
                if (typeof subValue === 'string') {
                  return state === `${key}.${subValue}` || state.startsWith(`${key}.${subValue}.`);
                }
                return false;
              }

              // If state is object, check property match
              if (typeof state === 'object' && state !== null) {
                // Handle { active: 'setup' } matching { active: 'setup' } or { active: { setup: '...' } }
                const stateSubValue = state[key];
                if (stateSubValue === subValue) return true;
                if (
                  typeof subValue === 'string' &&
                  typeof stateSubValue === 'object' &&
                  stateSubValue !== null
                ) {
                  // If asking for 'setup', and state is { setup: 'loading' }, that's a match
                  return Object.keys(stateSubValue)[0] === subValue; // Approximate
                }
                return false;
              }
            }
            return false;
          };
        }
        // Check if it's XState actor (has getSnapshot)
        else if (typeof (appActor as any).getSnapshot === 'function') {
          snapshot = (appActor as any).getSnapshot();
          matchesFn = snapshot?.matches ? snapshot.matches.bind(snapshot) : () => false;
        }

        // Automatic logging will capture this

        if (snapshot && matchesFn) {
          // Pre-compute state matches
          const matches = {
            inactive: matchesFn('inactive'),
            activating: matchesFn('activating'),
            activation_failed: matchesFn('activation_failed'),
            active: matchesFn('active'),
            error_recovery: matchesFn('error_recovery'),
            deactivating: matchesFn('deactivating'),
            'active.setup': matchesFn({ active: 'setup' }),
            'active.setup.loading_connections': matchesFn({
              active: { setup: 'loading_connections' },
            }),
            'active.setup.waiting_for_panel': matchesFn({
              active: { setup: 'waiting_for_panel' },
            }),
            'active.setup.panel_ready': matchesFn({ active: { setup: 'panel_ready' } }),
            'active.setup.setup_error': matchesFn({ active: { setup: 'setup_error' } }),
            'active.ready': matchesFn({ active: 'ready' }),
            'active.ready.idle': matchesFn({ active: { ready: 'idle' } }),
            'active.ready.loadingData': matchesFn({ active: { ready: 'loadingData' } }),
            'active.ready.managingConnections': matchesFn({
              active: { ready: 'managingConnections' },
            }),
            'active.ready.error': matchesFn({ active: { ready: 'error' } }),
          };

          const serializableState = {
            praxisState: snapshot.value,
            context: getSerializableContext(snapshot.context),
            matches,
          };
          
          // Deduplicate: only send if state changed (Priority 2: Reduce redundant syncs)
          const signature = JSON.stringify(serializableState);
          if (signature === lastStateSignature) {
            return; // No change, skip sending duplicate state
          }
          lastStateSignature = signature;
          
          // Automatic logging will capture this
          // Use intercepted webview if available, otherwise fall back to original
          const webviewToUse = interceptedWebview || webview;
          webviewToUse.postMessage({
            type: 'syncState',
            payload: serializableState,
          });
        }
      }
    };

    // Set up message handler to receive events from webview
    // Use intercepted webview if available, otherwise fall back to original
    const webviewToUse = interceptedWebview || webview;
    webviewToUse.onDidReceiveMessage(async (message) => {
      // Shared context bridge handles getContext/contextUpdate requests
      if (sharedContextBridge?.handleWebviewMessage?.(message)) {
        // Automatic logging will capture this
        return;
      }

      if (message?.type === 'getContext') {
        // Automatic logging will capture this
        sendCurrentState();
        return;
      }

      if (message?.type === 'webviewPreError') {
        // Automatic logging will capture this error
        return;
      }

      if (message?.type === 'webviewLog') {
        // Automatic logging will capture this
        return;
      }

      if (message.type === 'webviewReady' || message.type === 'ready') {
        // Automatic logging will capture this
        sendCurrentState();
        return;
      }

      if (message.type === 'PRAXIS_EVENT' && Array.isArray(message.events)) {
        // Handle Praxis events from webview (these are usually local-only, but we can log them)
        // Automatic logging will capture this
        // Don't forward these back - they're for local webview state management
        return;
      }

      if (message.type === 'appEvent' && message.event) {
        // Forward webview events to the Praxis (wrapped format)
        // Automatic logging will capture this

        // Router-lite stamping: add atConnectionId/correlationId to connection-shaped events
        try {
          const actor = getApplicationActor();
          const snapshot = actor?.getSnapshot?.();
          const currentActiveId = snapshot?.context?.activeConnectionId;
          const evtType = message.event.type as string;
          // Router stamping helper
          try {
            const { stampConnectionMeta } = await import('./services/router/stamp.js');
            message.event = stampConnectionMeta(message.event, currentActiveId);
          } catch {
            // Inline fallback (no-op)
          }

          // Guard: selection must originate from webview when using new factory
          if (evtType === 'SELECT_CONNECTION') {
            if (message.event.origin !== 'webview') {
              // Automatic logging will capture this warning
              return;
            }
            // Extract connectionId from payload and send SELECT_CONNECTION event
            const targetId = message.event?.payload?.id ?? null;
            if (typeof targetId === 'string') {
              dispatchApplicationEvent({
                type: 'SELECT_CONNECTION',
                connectionId: targetId,
              });
              return;
            } else if (targetId === null) {
              // Handle null case (deselection) - translate to CONNECTION_SELECTED for backward compatibility
              dispatchApplicationEvent({
                type: 'CONNECTION_SELECTED',
                connectionId: null as any,
              });
              return;
            }
          }
        } catch {
          // best-effort stamping; continue dispatch
        }

        // Handle special events that need direct VS Code command execution
        if (message.event.type === 'OPEN_SETTINGS') {
          // Automatic logging will capture this
          vscode.commands
            .executeCommand('azureDevOpsInt.setup')
            .then(() => {
              // Automatic logging will capture this
            })
            .then(undefined, (err) => {
              // Automatic logging will capture this error
            });
          return; // Don't dispatch to Praxis
        }

        // Handle RESET_AUTH: sign out and open settings for reconfiguration
        if (message.event.type === 'RESET_AUTH') {
          const now = Date.now();
          const timeSinceLastReset = now - lastResetAuthTime;
          
          // Debounce: ignore if called too soon after last execution
          if (timeSinceLastReset < RESET_AUTH_DEBOUNCE_MS) {
            // Automatic logging will capture this (debounced)
            return; // Skip duplicate processing
          }
          
          // Update last execution time
          lastResetAuthTime = now;
          
          const connectionId = message.event.connectionId as string | undefined;
          // Sign out first (handled by Praxis via event dispatch)
          if (connectionId) {
            dispatchApplicationEvent({
              type: 'SIGN_OUT_ENTRA',
              connectionId,
            });
          }
          // Then open settings so user can reconfigure auth
          vscode.commands
            .executeCommand('azureDevOpsInt.setup')
            .then(() => {
              // Automatic logging will capture this
            })
            .then(undefined, (err) => {
              // Automatic logging will capture this error
            });
          return; // Don't dispatch to Praxis (handled directly)
        }

        if (message.event.type === 'OPEN_DEVICE_CODE_BROWSER') {
          // Handle device code browser opening from webview
          // Event will be automatically logged via Praxis when dispatched

          // Get device code session from Praxis context
          const actor = getApplicationActor();
          const snapshot = actor?.getSnapshot?.();
          const deviceCodeSession = snapshot?.context?.deviceCodeSession;

          if (deviceCodeSession && deviceCodeSession.connectionId === message.event.connectionId) {
            // Validate userCode exists before copying
            if (!deviceCodeSession.userCode || deviceCodeSession.userCode.trim() === '') {
              vscode.window.showErrorMessage(
                'Device code is not available. Please try signing in again.'
              );
              dispatchApplicationEvent(
                ApplicationErrorEvent.create({
                  error: 'Device code is empty or missing',
                  connectionId: message.event.connectionId,
                })
              );
              return;
            }

            // Copy code to clipboard and open browser
            vscode.env.clipboard
              .writeText(deviceCodeSession.userCode)
              .then(() => {
                const uri = vscode.Uri.parse(
                  deviceCodeSession.verificationUri || 'https://microsoft.com/devicelogin'
                );
                vscode.env
                  .openExternal(uri)
                  .then(() => {
                    vscode.window.showInformationMessage(
                      `Device code ${deviceCodeSession.userCode} copied to clipboard. Paste it into the browser to finish signing in.`
                    );
                    dispatchApplicationEvent(
                      DeviceCodeBrowserOpenedEvent.create({
                        connectionId: message.event.connectionId,
                        userCode: deviceCodeSession.userCode,
                      })
                    );
                  })
                  .then(undefined, (err) => {
                    dispatchApplicationEvent(
                      DeviceCodeBrowserOpenFailedEvent.create({
                        connectionId: message.event.connectionId,
                        error: err instanceof Error ? err.message : String(err),
                      })
                    );
                    vscode.window.showErrorMessage('Failed to open browser. Code was copied to clipboard.');
                  });
              })
              .then(undefined, (err) => {
                dispatchApplicationEvent(
                  DeviceCodeCopyFailedEvent.create({
                    connectionId: message.event.connectionId,
                    error: err instanceof Error ? err.message : String(err),
                  })
                );
                vscode.window.showErrorMessage(
                  `Failed to copy device code to clipboard: ${err instanceof Error ? err.message : String(err)}`
                );
                // Still try to open browser even if clipboard copy failed
                const uri = vscode.Uri.parse(
                  deviceCodeSession.verificationUri || 'https://microsoft.com/devicelogin'
                );
                vscode.env.openExternal(uri).then(undefined, () => {
                  // Ignore browser open errors if clipboard already failed
                });
              });
          } else {
            dispatchApplicationEvent(
              DeviceCodeSessionNotFoundEvent.create({
                connectionId: message.event.connectionId,
              })
            );
            vscode.window.showWarningMessage(
              'Device code session not found. Please try signing in again.'
            );
          }
          return; // Don't dispatch to Praxis
        }

        if (message.event.type === 'OPEN_AUTH_CODE_FLOW_BROWSER') {
          // Handle auth code flow browser opening from webview
          // Get auth code flow session from Praxis context
          const actor = getApplicationActor();
          const snapshot = actor?.getSnapshot?.();
          const authCodeFlowSession = snapshot?.context?.authCodeFlowSession;

          if (
            authCodeFlowSession &&
            authCodeFlowSession.connectionId === message.event.connectionId
          ) {
            // Open browser to authorization URL
            const uri = vscode.Uri.parse(authCodeFlowSession.authorizationUrl);
            vscode.env
              .openExternal(uri)
              .then(() => {
                dispatchApplicationEvent(
                  AuthCodeFlowBrowserOpenedEvent.create({
                    connectionId: message.event.connectionId,
                    url: authCodeFlowSession.authorizationUrl,
                  })
                );
              })
              .then(undefined, (err) => {
                dispatchApplicationEvent(
                  AuthCodeFlowBrowserOpenFailedEvent.create({
                    connectionId: message.event.connectionId,
                    error: err instanceof Error ? err.message : String(err),
                  })
                );
              });
          } else {
            dispatchApplicationEvent(
              ApplicationErrorEvent.create({
                error: 'Auth code flow session not found for connection',
                connectionId: message.event.connectionId,
              })
            );
          }
          return; // Don't dispatch to Praxis
        }

        // Forward other events to Praxis
        dispatchApplicationEvent(message.event);
      } else {
        // Log warning for legacy/unknown message types
        // Check if message.event exists before accessing its properties
        if (message.event && message.event.type === 'COPY_DEVICE_CODE') {
          // Automatic logging will capture this

          const actor = getApplicationActor();
          const snapshot = actor?.getSnapshot?.();
          const deviceCodeSession = snapshot?.context?.deviceCodeSession;

          if (deviceCodeSession && deviceCodeSession.connectionId === message.event.connectionId) {
            // Validate userCode exists before copying
            if (!deviceCodeSession.userCode || deviceCodeSession.userCode.trim() === '') {
              vscode.window.showErrorMessage(
                'Device code is not available. Please try signing in again.'
              );
              // Automatic logging will capture this warning
              return;
            }

            vscode.env.clipboard
              .writeText(deviceCodeSession.userCode)
              .then(() => {
                vscode.window.showInformationMessage(
                  `Device code ${deviceCodeSession.userCode} copied to clipboard`
                );
                // Automatic logging will capture this
              })
              .then(undefined, (err) => {
                // Automatic logging will capture this error
                vscode.window.showErrorMessage(
                  `Failed to copy device code to clipboard: ${err instanceof Error ? err.message : String(err)}`
                );
              });
          } else {
            // Automatic logging will capture this
            vscode.window.showWarningMessage(
              'Device code session not found. Please try signing in again.'
            );
          }
          return;
        }
        // Automatic logging will capture this warning
      }
    });

    // Notify Praxis that webview panel is ready
    this.appActor?.send?.({ type: 'UPDATE_WEBVIEW_PANEL', webviewPanel: webviewView });

    // Send initial Praxis state to webview
    // CRITICAL: When panel is created, immediately send current Praxis state
    // This ensures work items loaded before panel creation are sent to webview
    sendCurrentState();
  }
}
