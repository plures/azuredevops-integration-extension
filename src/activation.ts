import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID as _randomUUID } from 'crypto';
import { OpenAI } from 'openai';
import { AzureDevOpsIntClient } from './azureClient.js';
import {
  parseAzureDevOpsUrl as _parseAzureDevOpsUrl,
  isAzureDevOpsWorkItemUrl as _isAzureDevOpsWorkItemUrl,
} from './azureDevOpsUrlParser.js';
import type { WorkItemsProvider } from './provider.js';
import { WorkItemTimer } from './timer.js';
import { SessionTelemetryManager } from './sessionTelemetry.js';
import {
  clearConnectionCaches,
  getBranchEnrichmentState,
  updateBuildRefreshTimer,
  type BranchContext,
} from './fsm/functions/connection/branchEnrichment.js';
import { getConnectionLabel } from './fsm/functions/connection/connectionLabel.js';
import {
  createBranchAwareTransform,
  createConnectionProvider as _createConnectionProvider,
} from './fsm/functions/connection/providerFactory.js';
import { createSharedContextBridge } from './bridge/sharedContextBridge.js';
import {
  bridgeConsoleToOutputChannel,
  createScopedLogger,
  getLogBufferSnapshot,
  getOutputChannel,
  logLine,
  setOutputChannel,
} from './logging.js';

import { startCacheCleanup, stopCacheCleanup } from './cache.js';
import { performanceMonitor, MemoryOptimizer } from './performance.js';
import {
  normalizeConnections,
  resolveActiveConnectionId,
} from './fsm/functions/activation/connectionNormalization.js';
import { migrateGlobalPATToConnections } from './fsm/functions/secrets/patMigration.js';
import {
  getApplicationStoreActor,
  sendApplicationStoreEvent,
  setActiveConnectionHandler as _setActiveConnectionHandler,
  setActiveConnectionIdReader,
  setExtensionContextRef as setExtensionContextRefBridge,
  setForwardProviderMessage as _setForwardProviderMessage,
  setGetSecretPAT,
  setLoadedConnectionsReader,
  setRegisterAllCommands as _setRegisterAllCommands,
  setWebviewMessageHandler as _setWebviewMessageHandler,
} from './fsm/services/extensionHostBridge.js';
import { registerCommands } from './features/commands/index.js';
import { registerTraceCommands } from './fsm/commands/traceCommands.js';
import { registerQuickDebugCommands } from './fsm/commands/quickDebugCommands.js';
import { FSMSetupService } from './fsm/services/fsmSetupService.js';
import { ConnectionAdapter } from './fsm/adapters/ConnectionAdapter.js';
import { getConnectionFSMManager } from './fsm/ConnectionFSMManager.js';
//import { initializeBridge } from './fsm/services/extensionHostBridge.js';
import type {
  AuthReminderReason,
  AuthReminderState,
  ConnectionState,
  ProjectConnection,
} from './fsm/machines/applicationMachine.js';
import type { WorkItemTimerState, TimeEntry } from './types.js';

type _AuthMethod = 'pat' | 'entra';

// Local lightweight type definitions for internal messaging helpers.
// These were previously only present in a temporary bundle artifact.
// Keeping them here avoids implicit any usage and preserves clarity.
type LoggerFn = (message: string, meta?: any) => void;
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

const STATE_TIMER = 'azureDevOpsInt.timer.state';
const STATE_TIME_ENTRIES = 'azureDevOpsInt.timer.entries';
const STATE_LAST_SAVE = 'azureDevOpsInt.timer.lastSave';
const STATE_TIMER_CONNECTION = 'azureDevOpsInt.timer.connection';
const CONFIG_NS = 'azureDevOpsIntegration';
const LEGACY_CONFIG_NS = 'azureDevOps';
const CONNECTIONS_CONFIG_KEY = 'connections';
const ACTIVE_CONNECTION_STATE_KEY = 'azureDevOpsInt.activeConnectionId';

let panel: vscode.WebviewView | undefined;
let provider: WorkItemsProvider | undefined;
let timer: WorkItemTimer | undefined;
let sessionTelemetry: SessionTelemetryManager | undefined;
let client: AzureDevOpsIntClient | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;
let authStatusBarItem: vscode.StatusBarItem | undefined;
const _PAT_KEY = 'azureDevOpsInt.pat';
const OPENAI_SECRET_KEY = 'azureDevOpsInt.openai.apiKey';
let viewProviderRegistered = false;
const initialRefreshedConnections = new Set<string>();
let connections: ProjectConnection[] = [];
const connectionStates = new Map<string, ConnectionState>();
let connectionAdapterInstance: ConnectionAdapter | undefined;
let activeConnectionId: string | undefined;
let tokenRefreshInterval: NodeJS.Timeout | undefined;
let gcInterval: NodeJS.Timeout | undefined;
let isDeactivating = false;
let rejectionHandler: ((reason: any, promise: Promise<any>) => void) | undefined;
let sharedContextBridge: ReturnType<typeof createSharedContextBridge> | undefined;
let extensionContextRef: vscode.ExtensionContext | undefined;
let openAiClient: OpenAI | undefined;
let cachedExtensionVersion: string | undefined; // cache package.json version for cache-busting
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
// They intentionally avoid FSM pathways for isolation.
export function __setTestContext(ctx: {
  panel?: any;
  provider?: any;
  client?: any;
  timer?: any;
}): void {
  if (ctx.panel) panel = ctx.panel;
  if (ctx.provider) provider = ctx.provider;
  if (ctx.client) client = ctx.client;
  if (ctx.timer) timer = ctx.timer;
}

export function handleMessage(message: any): void {
  switch (message?.type) {
    case 'openExternal': {
      // FSM-requested external URL open
      if (message.url) {
        vscode.env.openExternal(vscode.Uri.parse(message.url));
      }
      break;
    }
    case 'createBranch': {
      // FSM-requested branch creation
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
      sendToWebview({
        type: 'workItemsLoaded',
        workItems: items,
        connectionId: activeConnectionId,
        query: getStoredQueryForConnection(activeConnectionId),
      });
      const typeOptions = provider?.getWorkItemTypeOptions?.();
      if (Array.isArray(typeOptions)) {
        sendToWebview({ type: 'workItemTypeOptions', options: [...typeOptions] });
      }
      break;
    }
    case 'startTimer': {
      const id = message.workItemId;
      if (!timer || typeof timer.start !== 'function' || !provider) break;
      const items = provider.getWorkItems?.() || [];
      const match = items.find((i: any) => i.id === id);
      const title = match?.fields?.['System.Title'] || `Work Item ${id}`;
      try {
        timer.start(id, title);
      } catch {
        /* ignore */
      }
      break;
    }
    case 'refresh': {
      try {
        provider?.refresh?.(getStoredQueryForConnection(activeConnectionId));
      } catch {
        /* ignore */
      }
      break;
    }
    case 'addComment': {
      const workItemId = message.workItemId;
      if (!message.comment) {
        sendToWebview({ type: 'showComposeComment', mode: 'addComment', workItemId });
        break;
      }
      // fallthrough to submitComposeComment logic if comment provided
    }
    case 'submitComposeComment': {
      const { workItemId, comment, mode, timerData } = message;
      if (!client) {
        sendToWebview({ type: 'composeCommentResult', success: false, mode, workItemId });
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
            sendToWebview({
              type: 'composeCommentResult',
              success: true,
              mode,
              workItemId,
              hours: hoursDecimal,
            });
            return;
          }
          if (mode === 'addComment') {
            if (comment) {
              await client.addWorkItemComment?.(workItemId, comment);
              sendToWebview({ type: 'composeCommentResult', success: true, mode, workItemId });
            } else {
              sendToWebview({ type: 'showComposeComment', mode: 'addComment', workItemId });
            }
            return;
          }
          // Generic fallback
          if (comment) {
            await client.addWorkItemComment?.(workItemId, comment);
          }
          sendToWebview({ type: 'composeCommentResult', success: true, mode, workItemId });
        } catch (err) {
          sendToWebview({
            type: 'composeCommentResult',
            success: false,
            mode,
            workItemId,
            error: String(err),
          });
        }
      })().catch(() => {
        sendToWebview({ type: 'composeCommentResult', success: false, mode, workItemId });
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

const activationLogger = createScopedLogger('activation', shouldLogDebug);
const verbose = activationLogger.debug;

// Self-test tracking (prove Svelte webview round-trip works)
// Self-test pending promise handlers (typed loosely to avoid unused param lint churn)
let selfTestPending:
  | { nonce: string; resolve: Function; reject: Function; timeout: NodeJS.Timeout }
  | undefined;

type TimerConnectionInfo = {
  id?: string;
  label?: string;
  organization?: string;
  project?: string;
};

let timerConnectionInfo: TimerConnectionInfo = {};

const DEFAULT_QUERY = 'My Activity';
const activeQueryByConnection = new Map<string, string>();

let nextAuthConnectionIndex = 0;
const INTERACTIVE_REAUTH_THROTTLE_MS = 5 * 60 * 1000;

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
    const stateItems = field.options.map((option) => ({
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
    console.error('Error updating work item:', error);
    vscode.window.showErrorMessage(
      `Error updating work item: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function dispatchApplicationEvent(event: unknown): void {
  // Route work item action events to legacy handleMessage which has implementations
  if (event && typeof event === 'object' && 'type' in event) {
    const evt = event as any;

    switch (evt.type) {
      case 'START_TIMER_INTERACTIVE':
        // Route to legacy handler with correct message format
        try {
          handleMessage({ type: 'startTimer', workItemId: evt.workItemId });
        } catch (error) {
          console.error('Error starting timer:', error);
          vscode.window.showErrorMessage(
            `Failed to start timer: ${error instanceof Error ? error.message : String(error)}`
          );
        }
        break;
      case 'STOP_TIMER':
        // Show comment dialog for time entry
        (async () => {
          try {
            const appActor = getApplicationStoreActor();
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

            // Stop the timer (send to FSM)
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
                console.error('Error adding time entry:', error);
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
            console.error('Error stopping timer:', error);
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
          console.error('Error editing work item:', error);
          vscode.window.showErrorMessage(
            `Failed to edit work item: ${error instanceof Error ? error.message : String(error)}`
          );
        }
        break;
      case 'OPEN_IN_BROWSER':
      case 'OPEN_WORK_ITEM':
        // Open work item in browser
        if (evt.workItemId && client) {
          const url = client.getBrowserUrl(`/_workitems/edit/${evt.workItemId}`);
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
                    console.error('Error creating branch:', error);
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
            console.error('Error in branch creation:', error);
            vscode.window.showErrorMessage(
              `Failed to create branch: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        })();
        break;
    }
  }

  // Always send event to FSM for state management
  sendApplicationStoreEvent(event);
}

async function signInWithEntra(
  context: vscode.ExtensionContext,
  connectionId?: string,
  options: { showSuccessMessage?: boolean; forceInteractive?: boolean } = {}
): Promise<void> {
  await ensureConnectionsInitialized(context);
  const targetId = connectionId ?? activeConnectionId;

  if (!targetId) {
    vscode.window.showWarningMessage('No active connection to sign in with.');
    return;
  }

  dispatchApplicationEvent({
    type: 'SIGN_IN_ENTRA',
    connectionId: targetId,
    forceInteractive: options.forceInteractive,
  });
}

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

function safeCommandHandler<Args extends unknown[], Result>(
  handler: (...args: Args) => Result
): (...args: Args) => void {
  return (...args: Args) => {
    if (isDeactivating) {
      console.log('[AzureDevOpsInt] [Command] Ignoring command execution during deactivation');
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
            console.error('[AzureDevOpsInt] [Command] Unhandled command error:', error);
          }
        });
      }
    } catch (error) {
      if (!isDeactivating) {
        console.error('[AzureDevOpsInt] [Command] Synchronous command error:', error);
      }
    }
  };
}

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
        verbose(`[context-bridge] ${message}`, meta);
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
    verbose('[authReminder] Failed to read pending reminders from actor', { error });
  }

  return new Map();
}

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

async function updateAuthStatusBar(): Promise<void> {
  if (!authStatusBarItem) return;

  if (!activeConnectionId) {
    clearAuthReminder(activeConnectionId);
    authStatusBarItem.hide();
    return;
  }

  const state = connectionStates.get(activeConnectionId);
  if (!state) {
    authStatusBarItem.hide();
    return;
  }

  // Show status bar for BOTH PAT and Entra connections
  const authMethod = state.authMethod || state.config?.authMethod || 'pat';

  authStatusBarItem.command = {
    title: 'Sign in with Microsoft Entra',
    command: 'azureDevOpsInt.signInWithEntra',
    arguments: [activeConnectionId],
  };

  try {
    const connectionLabel = describeConnection(state.config);

    // Get FSM connection state to determine actual auth status
    const actor = getApplicationActor();
    const snapshot = actor?.getSnapshot?.();
    const fsmConnectionStates = snapshot?.context?.connectionStates;
    const fsmConnectionState = fsmConnectionStates?.get(activeConnectionId);

    // Check multiple indicators of connection status
    const isConnected = Boolean(
      fsmConnectionState?.client ||
        fsmConnectionState?.provider ||
        (typeof fsmConnectionState?.isConnected === 'boolean' && fsmConnectionState.isConnected) ||
        // Also check legacy connectionStates map for connected clients/providers
        (state.client && state.provider)
    );

    const hasAuthFailure = Boolean(
      fsmConnectionState?.reauthInProgress ||
        fsmConnectionState?.lastError ||
        state.reauthInProgress
    );

    // Check if there's an active device code session for this connection
    const hasActiveDeviceCode = Boolean(
      snapshot?.context?.deviceCodeSession?.connectionId === activeConnectionId &&
        snapshot?.context?.deviceCodeSession?.expiresAt > Date.now()
    );

    // Only log status check if debug logging is enabled to prevent excessive logging
    if (shouldLogDebug()) {
      console.log('[AzureDevOpsInt][updateAuthStatusBar] Status check', {
        activeConnectionId,
        isConnected,
        hasAuthFailure,
        hasActiveDeviceCode,
        hasClient: !!state.client,
        hasProvider: !!state.provider,
        fsmIsConnected: fsmConnectionState?.isConnected,
        fsmClient: !!fsmConnectionState?.client,
        fsmProvider: !!fsmConnectionState?.provider,
      });
    }

    if (isConnected && !hasAuthFailure && !hasActiveDeviceCode) {
      // Show successful auth status
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
    } else if (hasAuthFailure) {
      // Show auth failure status
      const authLabel = authMethod === 'entra' ? 'Entra' : 'PAT';
      authStatusBarItem.text = `$(error) ${authLabel}: Auth Failed`;
      authStatusBarItem.tooltip = `Authentication failed for ${connectionLabel}. Click to manage connections.`;
      authStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      authStatusBarItem.command = 'azureDevOpsInt.setup';
      authStatusBarItem.show();
    } else if (hasActiveDeviceCode) {
      // Show device code flow in progress (Entra only)
      authStatusBarItem.text = '$(sync~spin) Entra: Device Code Active';
      authStatusBarItem.tooltip = `Device code authentication in progress for ${connectionLabel}`;
      authStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      authStatusBarItem.command = 'azureDevOpsInt.signInWithEntra';
      authStatusBarItem.show();
    } else {
      // Show sign-in/auth required status
      if (authMethod === 'entra') {
        authStatusBarItem.text = '$(warning) Entra: Sign In Required';
        authStatusBarItem.tooltip = `Sign in required for ${connectionLabel}`;
        authStatusBarItem.command = 'azureDevOpsInt.signInWithEntra';
      } else {
        authStatusBarItem.text = '$(warning) PAT: Auth Required';
        authStatusBarItem.tooltip = `Personal Access Token required for ${connectionLabel}. Click to manage connections.`;
        authStatusBarItem.command = 'azureDevOpsInt.setup';
      }
      authStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      authStatusBarItem.show();
    }
  } catch (error) {
    console.error('[AzureDevOpsInt] [updateAuthStatusBar] Error updating auth status:', error);
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

function ensureAuthReminder(
  connectionId: string,
  reason: AuthReminderReason,
  options: { detail?: string } = {}
): void {
  dispatchApplicationEvent({
    type: 'AUTH_REMINDER_REQUESTED',
    connectionId,
    reason,
    detail: options.detail,
  });
}

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
      console.error(
        '[AzureDevOpsInt] [triggerAuthReminderSignIn] Interactive Entra sign-in failed',
        error
      );
      ensureAuthReminder(connectionId, reason, detail ? { detail } : {});
    } finally {
      state.reauthInProgress = false;
    }
  })().catch((error) => {
    console.error(
      '[AzureDevOpsInt] [triggerAuthReminderSignIn] Unexpected Entra sign-in error',
      error
    );
    state.reauthInProgress = false;
    ensureAuthReminder(connectionId, reason, detail ? { detail } : {});
  });
}

function clearAuthReminder(connectionId: string | undefined): void {
  if (!connectionId) {
    return;
  }

  dispatchApplicationEvent({ type: 'AUTH_REMINDER_CLEARED', connectionId });

  if (panel) {
    sendToWebview({
      type: 'authReminderClear',
      connectionId,
    });
  }

  if (getPendingAuthReminderMap().size === 0) {
    nextAuthConnectionIndex = 0;
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
  activeQueryByConnection.set(connectionId, base);
  return base;
}

function setStoredQueryForConnection(connectionId: string, query?: string): string {
  const resolvedDefault = getDefaultQuery(getConfig());
  const normalized = normalizeQuery(query) ?? resolvedDefault ?? DEFAULT_QUERY;
  activeQueryByConnection.set(connectionId, normalized);
  return normalized;
}

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
  const adapter = getConnectionAdapterInstance();

  const result = (await adapter.ensureActiveConnection(context, connection.id, options)) as
    | ConnectionState
    | undefined;

  if (result?.client && result?.provider) {
    (result as any).id = connection.id;
    result.config = connection;
    result.authMethod = connection.authMethod || 'pat';

    const settings = getConfig();
    await finalizeConnectionSuccess(connection, result, options, settings);
    return result;
  }

  verbose('[ensureActiveConnection] FSM connection did not produce a usable provider.', {
    connectionId: connection.id,
    hasResult: !!result,
    hasClient: !!result?.client,
    hasProvider: !!result?.provider,
  });

  return undefined;
}

function getConnectionAdapterInstance(): ConnectionAdapter {
  if (!connectionAdapterInstance) {
    const manager = getConnectionFSMManager();
    // The fallback function is no longer needed as we are fully on FSM.
    connectionAdapterInstance = new ConnectionAdapter(manager, async () => undefined, true);
    connectionAdapterInstance.setUseFSM(true);
  }
  return connectionAdapterInstance;
}

async function resolveActiveConnectionTarget(
  context: vscode.ExtensionContext,
  connectionId?: string,
  options: EnsureActiveConnectionOptions = {}
): Promise<{ connection: ProjectConnection; connectionId: string } | undefined> {
  await ensureConnectionsInitialized(context);

  const targetId = connectionId ?? activeConnectionId ?? connections[0]?.id;
  verbose('[ensureActiveConnection] evaluating target', {
    requested: connectionId,
    activeConnectionId,
    resolved: targetId,
    connectionCount: connections.length,
  });

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

  const connection = connections.find((item) => item.id === targetId);
  if (!connection) {
    console.warn('[azureDevOpsInt] Connection not found for id', targetId);
    return undefined;
  }

  verbose('[ensureActiveConnection] using connection', {
    id: connection.id,
    organization: connection.organization,
    project: connection.project,
    baseUrl: connection.baseUrl,
    apiBaseUrl: connection.apiBaseUrl,
    authMethod: connection.authMethod || 'pat',
    hasIdentityName: !!connection.identityName,
    identityName: connection.identityName,
  });

  return { connection, connectionId: targetId };
}

function configureProviderForConnection(
  connection: ProjectConnection,
  state: ConnectionState
): void {
  if (!state.provider) {
    return;
  }

  const providerLogger = createScopedLogger(`provider:${connection.id}`, shouldLogDebug);
  const branchSource = { id: connection.id, client: state.client };

  if (typeof state.provider.updateClient === 'function' && state.client) {
    state.provider.updateClient(state.client);
  }

  state.provider.setPostMessage?.((msg: unknown) => forwardProviderMessage(connection.id, msg));
  state.provider.setLogger?.(providerLogger);
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

  setTimerConnectionFrom(connection);

  await vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', true);
  await updateAuthStatusBar();

  if (options.refresh !== false && state.provider) {
    const fallbackQuery = getDefaultQuery(settings);
    const selectedQuery = getStoredQueryForConnection(connection.id, fallbackQuery);

    if (!initialRefreshedConnections.has(connection.id)) {
      initialRefreshedConnections.add(connection.id);
    }

    verbose('[ensureActiveConnection] triggering provider refresh', {
      id: connection.id,
      query: selectedQuery,
    });

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

async function loadConnectionsFromConfig(
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
      verbose('[connections] Saved migrated connections', summary);
    } catch (error) {
      console.warn('[AzureDevOpsInt] [connections] Failed to save migrated connections', error);
    }
  }

  // Migrate any existing global PAT into per-connection secret keys so
  // credentials are always connection-scoped (no global PAT sharing).
  if (connections.length > 0) {
    try {
      await migrateGlobalPATToConnections(context, connections);
    } catch (error) {
      console.warn('[azureDevOpsInt] migrateGlobalPATToConnections failed', error);
    }
  }

  verbose('[connections] Loaded connections from config', {
    count: connections.length,
    ids: connections.map((c) => c.id),
  });

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

async function ensureConnectionsInitialized(context: vscode.ExtensionContext) {
  if (connections.length === 0) await loadConnectionsFromConfig(context);
  return connections;
}

/**
 * LEGACY AUTH REMOVED - Device code callback no longer used in FSM architecture
 * Device code callback for Entra ID authentication
 * Shows VS Code notification with device code and verification URL
 */
const createDeviceCodeCallback =
  (_context: vscode.ExtensionContext, connection?: ProjectConnection): any =>
  async (_deviceCode: any, userCode: any, verificationUrl: any, expiresIn: any) => {
    verbose('[EntraAuth] Device code received', { userCode, verificationUrl, expiresIn });

    const connectionLabel = connection ? describeConnection(connection) : 'Microsoft Entra ID';
    const action = await vscode.window.showInformationMessage(
      `Sign in to ${connectionLabel} with Microsoft Entra ID. Selecting “Open Browser” copies the code to your clipboard automatically.\n\nGo to ${verificationUrl} and enter code:\n\n${userCode}\n\nCode expires in ${Math.floor(expiresIn / 60)} minutes.`,
      { modal: false },
      'Open Browser'
    );

    if (action === 'Open Browser') {
      try {
        await vscode.env.clipboard.writeText(userCode);
      } catch (error) {
        console.warn('[AzureDevOpsInt] [EntraAuth] Failed to copy device code to clipboard', error);
      }
      await vscode.env.openExternal(vscode.Uri.parse(verificationUrl));
      vscode.window.showInformationMessage(
        `Device code ${userCode} copied to clipboard. Paste it into the browser to finish signing in.`
      );
    }
  };

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
            /* ignore pause error */
          }
          if (pomodoroBreakTimeout) {
            try {
              clearTimeout(pomodoroBreakTimeout);
            } catch {
              /* ignore clear error */
            }
            pomodoroBreakTimeout = undefined;
          }
          pomodoroBreakTimeout = setTimeout(
            () => {
              try {
                timer?.resume();
              } catch {
                /* ignore resume error */
              }
              pomodoroBreakTimeout = undefined;
            },
            5 * 60 * 1000
          );
        })
        .then(
          () => {},
          (error) => {
            console.error(
              '[AzureDevOpsInt] ❌ [TIMER] Failed to show Pomodoro break dialog:',
              error
            );
          }
        );
    },
    persist: (data: { state?: any; timeEntries?: any[]; updateLastSave?: boolean }) =>
      persistTimer(context, data),
    restorePersisted: () => restoreTimer(context),
    onState: (s: any) => {
      sendToWebview({
        type: 'timerUpdate',
        timer: s,
        connectionId: timerConnectionInfo.id,
        connectionLabel: timerConnectionInfo.label,
        connectionOrganization: timerConnectionInfo.organization,
        connectionProject: timerConnectionInfo.project,
      });
      updateTimerContext(s);
    },
    onInfo: (m: any) => verbose('[timer]', m),
    onWarn: (m: any) => console.warn('[AzureDevOpsInt] [timer]', m),
    onError: (m: any) => console.error('[AzureDevOpsInt] [timer]', m),
  });
  timer.loadFromPersisted();
  return timer;
}

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

type SendToWebviewOptions = {
  panel?: vscode.WebviewView;
  logger?: LoggerFn;
};

type SendWorkItemsSnapshotOptions = Omit<PostWorkItemsSnapshotParams, 'panel' | 'logger'> &
  SendToWebviewOptions;

function sendToWebview(message: any): void {
  const messageType = message?.type;

  if (messageType === 'workItemsLoaded') {
    const items = Array.isArray(message.workItems) ? [...message.workItems] : [];
    console.log('[AzureDevOpsInt][sendToWebview] Processing workItemsLoaded:', {
      messageType,
      hasWorkItems: !!message.workItems,
      workItemsIsArray: Array.isArray(message.workItems),
      itemsCount: items.length,
      connectionId: message.connectionId,
    });

    dispatchApplicationEvent({
      type: 'WORK_ITEMS_LOADED',
      workItems: items,
      connectionId: typeof message.connectionId === 'string' ? message.connectionId : undefined,
      query: typeof message.query === 'string' ? message.query : undefined,
      kanbanView: !!message.kanbanView,
      types: Array.isArray(message.types) ? [...message.types] : undefined,
    });

    console.log('[AzureDevOpsInt][sendToWebview] Dispatched WORK_ITEMS_LOADED event to FSM');
  }

  if (!panel) {
    verbose?.('[sendToWebview] dropping message (no panel)', { type: messageType });
    return;
  }

  try {
    panel.webview.postMessage(message);
  } catch (error) {
    verbose?.(
      '[sendToWebview] failed to post message',
      error instanceof Error ? error.message : error
    );
  }
}

function forwardProviderMessage(connectionId: string, message: unknown) {
  // Forward provider messages directly, not wrapped in envelope
  // This allows sendToWebview to recognize workItemsLoaded and other message types
  console.log('[AzureDevOpsInt][forwardProviderMessage] Received from provider:', {
    connectionId,
    messageType: (message as any)?.type,
    hasWorkItems: !!(message as any)?.workItems,
    workItemsCount: Array.isArray((message as any)?.workItems)
      ? (message as any).workItems.length
      : 'n/a',
  });

  if (message && typeof message === 'object' && 'type' in message) {
    sendToWebview({
      ...(message as any),
      connectionId,
    });
  } else {
    // Fallback for messages without type
    sendToWebview({
      type: 'providerMessage',
      connectionId,
      message,
    });
  }
}

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

function sendWorkItemsSnapshot(options: SendWorkItemsSnapshotOptions): void {
  const connectionId = options.connectionId ?? activeConnectionId;
  const items = Array.isArray(options.items) ? options.items : [];
  const branchContext = resolveBranchContextPayload(connectionId, options.branchContext);
  const types = resolveSnapshotTypes(options.provider, options.types, verbose);

  sendToWebview({
    type: 'workItemsLoaded',
    connectionId,
    workItems: items,
    kanbanView: options.kanbanView,
    provider: options.provider,
    types,
    query: options.query,
    branchContext,
  });

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
      const metadata = inspectFn<string>('workItemQuery');
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

async function setOpenAIApiKey(context: vscode.ExtensionContext) {
  const apiKey = await vscode.window.showInputBox({
    prompt: 'Enter your OpenAI API Key',
    password: true,
  });
  if (apiKey) {
    await context.secrets.store(OPENAI_SECRET_KEY, apiKey);
    vscode.window.showInformationMessage('OpenAI API Key saved successfully.');
    openAiClient = new OpenAI({ apiKey });
  }
}

function getExtensionVersion(context: vscode.ExtensionContext): string {
  if (cachedExtensionVersion) return cachedExtensionVersion;
  try {
    const pkgPath = path.join(context.extensionPath, 'package.json');
    const pkgRaw = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(pkgRaw);
    cachedExtensionVersion = String(pkg.version || 'dev');
  } catch {
    // Swallow errors and fall back to 'dev'
    cachedExtensionVersion = 'dev';
  }
  return cachedExtensionVersion;
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
    console.warn('[azureDevOpsInt] migrateLegacyConfigIfNeeded failed', e);
  }
}

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
      console.log('[azureDevOpsInt] Applied patch: 1.0.0-clientid-removal');
    }

    // Future patches can be added here following the same pattern:
    // if (!appliedPatches.includes('1.1.0-some-other-fix')) {
    //   await applySomeOtherPatch();
    //   appliedPatches.push('1.1.0-some-other-fix');
    //   await patchState.update(PATCH_VERSION_KEY, appliedPatches);
    //   console.log('[azureDevOpsInt] Applied patch: 1.1.0-some-other-fix');
    // }
  } catch (error) {
    console.warn('[azureDevOpsInt] Failed to apply startup patches:', error);
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
  try {
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
      console.log(
        `[azureDevOpsInt] Startup patch: Removed clientId from ${patchedCount} connection(s)`
      );
    }
  } catch (error) {
    console.warn('[azureDevOpsInt] Client ID removal patch failed:', error);
    throw error; // Re-throw to be caught by applyStartupPatches
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
        reason.stack.includes('src\\fsm\\') ||
        reason.stack.includes('src/fsm/'));

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
        verbose('[azureDevOpsInt] Promise cancelled during shutdown (normal)');
        return;
      }
    }
    console.error('[azureDevOpsInt] Unhandled Promise Rejection:', reason);
    console.error('[azureDevOpsInt] Promise:', promise);
  };

  // Add global unhandled promise rejection handler
  process.on('unhandledRejection', rejectionHandler);

  // Add global uncaught exception handler
  process.on('uncaughtException', (error) => {
    console.error('[azureDevOpsInt] Uncaught Exception:', error);
  });

  extensionContextRef = context;
  setExtensionContextRefBridge(context);

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
    logLine('[activate] Debug logging enabled');
    // Bridge console logging to Output Channel for better debugging
    bridgeConsoleToOutputChannel();
  }
  // Status bar (hidden until connected or timer active)
  statusBarItem = vscode.window.createStatusBarItem(
    'azureDevOpsInt.timer',
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = 'azureDevOpsInt.stopTimer';
  context.subscriptions.push(statusBarItem);

  // Auth status bar item (shows Entra ID token status)
  authStatusBarItem = vscode.window.createStatusBarItem(
    'azureDevOpsInt.authStatus',
    vscode.StatusBarAlignment.Left,
    99
  );
  authStatusBarItem.command = 'azureDevOpsInt.signInWithEntra';
  context.subscriptions.push(authStatusBarItem);
  authStatusBarItem.hide(); // Hidden by default, shown only for Entra ID connections

  // LEGACY AUTH REMOVED - EntraAuthenticationProvider replaced by FSM authentication
  const authenticationProviderOptions: vscode.AuthenticationProviderOptions & {
    supportsAccountManagement?: boolean;
  } = {
    supportsMultipleAccounts: true,
    supportsAccountManagement: true,
  };
  // LEGACY AUTH REMOVED - Authentication provider registration replaced by FSM authentication

  // Ensure applicationStore is initialized before registering webview provider
  // This prevents race conditions where the webview panel resolves before the FSM actor is available
  verbose('[activation] Ensuring application store is initialized before webview registration');
  await ensureSharedContextBridge(context);
  verbose('[activation] Application store initialized, FSM actor available');

  // Register the work items webview view resolver (guard against duplicate registration)
  if (!viewProviderRegistered) {
    verbose('[azureDevOpsInt] Registering webview view provider: azureDevOpsWorkItems');
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        'azureDevOpsWorkItems',
        new AzureDevOpsIntViewProvider(context),
        { webviewOptions: { retainContextWhenHidden: true } }
      )
    );
    viewProviderRegistered = true;
  }
  // Register FSM trace commands for full replay capability
  registerTraceCommands(context);

  // Register quick debug commands for instant troubleshooting
  registerQuickDebugCommands(context);
  verbose('[ACTIVATION] Quick debug commands registered');

  // Register output channel reader for programmatic log access
  import('./fsm/commands/outputChannelReader.js')
    .then(({ registerOutputChannelReader }) => {
      registerOutputChannelReader(context);
      verbose('[ACTIVATION] Output channel reader registered for automated debugging');
    })
    .catch((error) => {
      console.error(
        '[AzureDevOpsInt] ❌ [ACTIVATION] Failed to import output channel reader:',
        error
      );
    });

  // AUTO-START FSM TRACING AND SHOW OUTPUT FOR DEBUGGING
  verbose('[ACTIVATION] Starting FSM tracing session automatically...');

  // Import FSM tracing modules
  import('./fsm/logging/FSMTracer.js')
    .then(({ startTraceSession, fsmTracer }) => {
      try {
        const sessionId = startTraceSession('Extension Activation - Auto Debug Session');
        verbose(`[ACTIVATION] FSM tracing started: ${sessionId}`);

        // Show the FSM output channel immediately for visibility
        import('./fsm/logging/FSMLogger.js')
          .then(({ fsmLogger, FSMComponent }) => {
            fsmLogger.showOutputChannel();
            verbose('[ACTIVATION] FSM Output Channel opened for debugging visibility');

            // Log activation start
            fsmLogger.info(FSMComponent.APPLICATION, 'Extension activation started', {
              component: FSMComponent.APPLICATION,
              event: 'ACTIVATE',
              state: 'activating',
            });
          })
          .catch((error) => {
            console.error(
              '[AzureDevOpsInt] ❌ [ACTIVATION] Failed to import FSM logger for activation:',
              error
            );
          });
      } catch (error) {
        console.error('[AzureDevOpsInt] ❌ [ACTIVATION] Failed to start FSM tracing:', error);
      }
    })
    .catch((error) => {
      console.error(
        '[AzureDevOpsInt] ❌ [ACTIVATION] Failed to import FSM tracing modules:',
        error
      );
    });

  // FSM and Bridge setup
  const fsmSetupService = new FSMSetupService(context);

  const appActor = getApplicationStoreActor();

  // Activate the FSM with extension context
  if (appActor && typeof (appActor as any).send === 'function') {
    verbose('[activation] Sending ACTIVATE event to FSM');
    (appActor as any).send({ type: 'ACTIVATE', context });
  }

  if (appActor && typeof (appActor as any).subscribe === 'function') {
    (appActor as any).subscribe((snapshot: any) => {
      if (panel && snapshot) {
        // Pre-compute all state matches since snapshot.matches() doesn't survive JSON serialization
        const matches = {
          // Top-level states
          inactive: snapshot.matches('inactive'),
          activating: snapshot.matches('activating'),
          activation_failed: snapshot.matches('activation_failed'),
          active: snapshot.matches('active'),
          error_recovery: snapshot.matches('error_recovery'),
          deactivating: snapshot.matches('deactivating'),

          // Active sub-states
          'active.setup': snapshot.matches({ active: 'setup' }),
          'active.setup.loading_connections': snapshot.matches({
            active: { setup: 'loading_connections' },
          }),
          'active.setup.waiting_for_panel': snapshot.matches({
            active: { setup: 'waiting_for_panel' },
          }),
          'active.setup.panel_ready': snapshot.matches({ active: { setup: 'panel_ready' } }),
          'active.setup.setup_error': snapshot.matches({ active: { setup: 'setup_error' } }),

          // Active.ready sub-states
          'active.ready': snapshot.matches({ active: 'ready' }),
          'active.ready.idle': snapshot.matches({ active: { ready: 'idle' } }),
          'active.ready.loadingData': snapshot.matches({ active: { ready: 'loadingData' } }),
          'active.ready.managingConnections': snapshot.matches({
            active: { ready: 'managingConnections' },
          }),
          'active.ready.error': snapshot.matches({ active: { ready: 'error' } }),
        };

        const serializableState = {
          fsmState: snapshot.value,
          context: getSerializableContext(snapshot.context),
          matches, // Include pre-computed state matches
        };

        // Reduce excessive logging - only log state changes if debug logging is enabled
        if (shouldLogDebug()) {
          console.log('[AzureDevOpsInt][activation] Sending state to webview:', {
            value: snapshot.value,
            matchesActive: matches.active,
            matchesActiveReady: matches['active.ready'],
            matchesActivating: matches.activating,
          });
        }

        panel.webview.postMessage({
          type: 'syncState',
          payload: serializableState,
        });

        // If activeQuery changed, persist and trigger provider refresh
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
              // Ensure provider exists before refresh
              if (!provider && extensionContextRef) {
                ensureActiveConnection(extensionContextRef, newConn, { refresh: false }).catch(
                  () => {}
                );
              }
              try {
                provider?.refresh(newQuery);
              } catch (e) {
                verbose('[activation] provider.refresh failed after query change', e);
              }
              lastQueriedActiveConnectionId = newConn;
              lastQueriedQuery = newQuery;
            }
          }
        } catch (e) {
          verbose('[activation] Failed handling activeQuery change', e);
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
    timer,
    sessionTelemetry,
    client,
    statusBarItem,
    authStatusBarItem,
  };

  const commandDisposables = registerCommands(context, commandContext);
  context.subscriptions.push(...commandDisposables);

  // Set up listeners and handlers
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration(CONFIG_NS)) {
        await loadConnectionsFromConfig(context);
        // Don't block on connection refresh during config changes
        ensureActiveConnection(context, activeConnectionId, { refresh: true }).catch((error) => {
          verbose('[onDidChangeConfiguration] Connection refresh failed:', error);
        });
      }
    })
  );

  // The webview will initialize immediately and show auth UI when ready
  ensureActiveConnection(context, activeConnectionId, { refresh: true }).catch((error) => {
    verbose('[activation] Initial connection failed:', error);
  });

  // Start periodic cache cleanup
  startCacheCleanup();

  // Start memory optimizer
  const memoryOptimizer = new MemoryOptimizer();

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
        verbose('[GC] Periodic garbage collection triggered');
      },
      5 * 60 * 1000
    ); // every 5 minutes
  }
}

export function deactivate(): Thenable<void> {
  isDeactivating = true;
  verbose('[deactivate] starting');

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
  verbose('[deactivate] complete');

  return Promise.resolve();
}

// Helper function to extract only serializable properties from FSM context
function getSerializableContext(context: any): Record<string, any> {
  if (!context) {
    return {};
  }

  // Debug: log what we're serializing
  // Only log context serialization if debug logging is enabled
  if (shouldLogDebug()) {
    console.log('[AzureDevOpsInt][getSerializableContext] Original context:', {
      hasConnections: !!context.connections,
      connectionsType: typeof context.connections,
      connectionsIsArray: Array.isArray(context.connections),
      connectionsValue: context.connections,
      activeConnectionId: context.activeConnectionId,
      isActivated: context.isActivated,
    });
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
  };

  // Only log serialization if debug logging is enabled to prevent log spam
  if (shouldLogDebug()) {
    console.log('[AzureDevOpsInt][getSerializableContext] Serialized context:', {
      connectionsLength: serialized.connections.length,
      activeConnectionId: serialized.activeConnectionId,
      hasDeviceCodeSession: !!serialized.deviceCodeSession,
      hasPendingWorkItems: !!serialized.pendingWorkItems,
      workItemsCount: serialized.workItems?.length || 0,
      viewMode: serialized.viewMode,
    });
  }

  return serialized;
}

class AzureDevOpsIntViewProvider implements vscode.WebviewViewProvider {
  public view?: vscode.WebviewView;
  private readonly extensionUri: vscode.Uri;
  private readonly fsm: ReturnType<typeof getApplicationActor>;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.extensionUri = context.extensionUri;
    this.fsm = getApplicationActor();
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.view = webviewView;
    panel = webviewView; // Store in global for snapshot subscription
    const webview = webviewView.webview;
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
        <div id="svelte-root"></div>
        <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>
    `;

    // Set up message handler to receive events from webview
    webview.onDidReceiveMessage((message) => {
      if (message.type === 'fsmEvent' && message.event) {
        // Forward webview events to the FSM
        console.log('[AzureDevOpsIntViewProvider] Received event from webview:', {
          eventType: message.event.type,
          event: message.event,
        });
        dispatchApplicationEvent(message.event);
      }
    });

    // Notify FSM that webview panel is ready
    this.fsm?.send?.({ type: 'UPDATE_WEBVIEW_PANEL', webviewPanel: webviewView });

    // Send initial FSM state to webview
    const appActor = getApplicationStoreActor();
    console.log('[AzureDevOpsIntViewProvider] Attempting to send initial state:', {
      hasActor: !!appActor,
      hasGetSnapshot: typeof (appActor as any)?.getSnapshot === 'function',
    });
    if (appActor && typeof (appActor as any).getSnapshot === 'function') {
      const snapshot = (appActor as any).getSnapshot();
      console.log('[AzureDevOpsIntViewProvider] Got snapshot:', {
        hasSnapshot: !!snapshot,
        value: snapshot?.value,
      });
      if (snapshot) {
        // Pre-compute state matches
        const matches = {
          inactive: snapshot.matches('inactive'),
          activating: snapshot.matches('activating'),
          activation_failed: snapshot.matches('activation_failed'),
          active: snapshot.matches('active'),
          error_recovery: snapshot.matches('error_recovery'),
          deactivating: snapshot.matches('deactivating'),
          'active.setup': snapshot.matches({ active: 'setup' }),
          'active.setup.loading_connections': snapshot.matches({
            active: { setup: 'loading_connections' },
          }),
          'active.setup.waiting_for_panel': snapshot.matches({
            active: { setup: 'waiting_for_panel' },
          }),
          'active.setup.panel_ready': snapshot.matches({ active: { setup: 'panel_ready' } }),
          'active.setup.setup_error': snapshot.matches({ active: { setup: 'setup_error' } }),
          'active.ready': snapshot.matches({ active: 'ready' }),
          'active.ready.idle': snapshot.matches({ active: { ready: 'idle' } }),
          'active.ready.loadingData': snapshot.matches({ active: { ready: 'loadingData' } }),
          'active.ready.managingConnections': snapshot.matches({
            active: { ready: 'managingConnections' },
          }),
          'active.ready.error': snapshot.matches({ active: { ready: 'error' } }),
        };

        const serializableState = {
          fsmState: snapshot.value,
          context: getSerializableContext(snapshot.context),
          matches,
        };
        console.log('[AzureDevOpsIntViewProvider] Posting initial syncState message with matches');
        webview.postMessage({
          type: 'syncState',
          payload: serializableState,
        });
      }
    }
  }
}

async function diagnoseWorkItemsIssue(context: vscode.ExtensionContext) {
  const log = (message: string) => getOutputChannel()?.appendLine(`[DIAGNOSTIC] ${message}`);
  log('Starting work items diagnostic...');

  const config = getConfig();
  const connections = config.get<ProjectConnection[]>('connections', []);
  const activeId = context.globalState.get<string>(ACTIVE_CONNECTION_STATE_KEY);

  log(`Found ${connections.length} connections.`);
  log(`Active connection ID: ${activeId}`);

  if (!activeId) {
    log('No active connection. Aborting.');
    getOutputChannel()?.show();
    return;
  }

  const activeConn = connections.find((c) => c.id === activeId);
  if (!activeConn) {
    log('Active connection not found in config. Aborting.');
    getOutputChannel()?.show();
    return;
  }

  log(`Active connection: ${activeConn.label} (${activeConn.organization}/${activeConn.project})`);

  const fsm = getApplicationActor();
  if (!fsm) {
    log('FSM actor not available. Aborting.');
    return;
  }

  const snapshot = fsm.getSnapshot?.();
  if (!snapshot) {
    log('FSM snapshot not available. Aborting.');
    return;
  }
  log('FSM state: ' + snapshot.value);

  const webviewReady = snapshot.context.flags.isWebviewReady;
  log('Webview ready state: ' + webviewReady);

  if (!webviewReady) {
    log('Webview is not ready. Cannot proceed with full diagnostic.');
  }

  log('Diagnostic complete.');
  getOutputChannel()?.show();
}
