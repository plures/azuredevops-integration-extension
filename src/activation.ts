import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AzureDevOpsIntClient } from './azureClient.js';
import { WorkItemsProvider } from './provider.js';
import { WorkItemTimer } from './timer.js';

// Basic state keys
const STATE_TIMER = 'azureDevOpsInt.timer.state';
const STATE_TIME_ENTRIES = 'azureDevOpsInt.timer.entries';
const STATE_LAST_SAVE = 'azureDevOpsInt.timer.lastSave';
const CONFIG_NS = 'azureDevOpsIntegration';
// Legacy settings lived under 'azureDevOps' before renaming; keep migration path
const LEGACY_CONFIG_NS = 'azureDevOps';

let panel: vscode.WebviewView | undefined;
let provider: WorkItemsProvider | undefined;
let timer: WorkItemTimer | undefined;
let client: AzureDevOpsIntClient | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;
const PAT_KEY = 'azureDevOpsInt.pat';
let viewProviderRegistered = false;
let initialRefreshed = false; // prevent duplicate initial refresh (silentInit + webview init)
let outputChannel: vscode.OutputChannel | undefined; // lazy created when debugLogging enabled
let extensionContextRef: vscode.ExtensionContext | undefined; // keep a reference for later ops
let cachedExtensionVersion: string | undefined; // cache package.json version for cache-busting
// Self-test tracking (prove Svelte webview round‑trip works)
// Self-test pending promise handlers (typed loosely to avoid unused param lint churn)
let selfTestPending:
  | { nonce: string; resolve: Function; reject: Function; timeout: NodeJS.Timeout }
  | undefined;

function getConfig() {
  return vscode.workspace.getConfiguration(CONFIG_NS);
}
function getExtensionVersion(context: vscode.ExtensionContext): string {
  if (cachedExtensionVersion) return cachedExtensionVersion;
  try {
    const pkgPath = path.join(context.extensionPath, 'package.json');
    const pkgRaw = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(pkgRaw);
    cachedExtensionVersion = String(pkg.version || 'dev');
  } catch {
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

export function activate(context: vscode.ExtensionContext) {
  extensionContextRef = context;
  const cfg = getConfig();
  if (cfg.get<boolean>('debugLogging')) {
    outputChannel = vscode.window.createOutputChannel('Azure DevOps Integration');
    outputChannel.appendLine('[activate] Debug logging enabled');
  }
  // Status bar (hidden until connected or timer active)
  statusBarItem = vscode.window.createStatusBarItem(
    'azureDevOpsInt.timer',
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = 'azureDevOpsInt.stopTimer';
  context.subscriptions.push(statusBarItem);

  // Register the work items webview view resolver (guard against duplicate registration)
  if (!viewProviderRegistered) {
    console.log('[azureDevOpsInt] Registering webview view provider: azureDevOpsWorkItems');
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        'azureDevOpsWorkItems',
        new AzureDevOpsIntViewProvider(context),
        { webviewOptions: { retainContextWhenHidden: true } }
      )
    );
    viewProviderRegistered = true;
  }

  // Core commands
  context.subscriptions.push(
    vscode.commands.registerCommand('azureDevOpsInt.setup', () => setupConnection(context)),
    vscode.commands.registerCommand('azureDevOpsInt.focusWorkItemsView', () =>
      revealWorkItemsView()
    ),
    vscode.commands.registerCommand('azureDevOpsInt.setDefaultElapsedLimit', async () => {
      try {
        const cfg = getConfig();
        const prev = cfg.get<number>('defaultElapsedLimitHours') ?? 3.5;
        const input = await vscode.window.showInputBox({
          prompt: 'Default elapsed hours to cap long-running timers (e.g. 3.5)',
          value: String(prev),
          validateInput: (v) => {
            const n = Number(v);
            if (isNaN(n) || !isFinite(n) || n < 0) return 'Enter a non-negative number';
            return null;
          },
        });
        if (typeof input === 'undefined') return; // cancelled
        const val = Number(input);
        await cfg.update('defaultElapsedLimitHours', val, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Default elapsed cap updated to ${val} hours.`);
        // Propagate to any running timer
        if (timer && typeof (timer as any).setDefaultElapsedLimitHours === 'function') {
          try {
            (timer as any).setDefaultElapsedLimitHours(val);
          } catch (e) {
            console.warn(
              '[azureDevOpsInt] Failed to propagate defaultElapsedLimitHours to running timer',
              e
            );
          }
        }
      } catch (err: any) {
        console.error('Failed to update default elapsed cap', err);
        vscode.window.showErrorMessage(
          'Failed to update default elapsed cap: ' + (err?.message || String(err))
        );
      }
    }),
    vscode.commands.registerCommand('azureDevOpsInt.showWorkItems', () => revealWorkItemsView()),
    vscode.commands.registerCommand('azureDevOpsInt.refreshWorkItems', () =>
      provider?.refresh(getConfig().get('defaultQuery') || 'My Work Items')
    ),
    vscode.commands.registerCommand('azureDevOpsInt.createWorkItem', () => quickCreateWorkItem()),
    vscode.commands.registerCommand('azureDevOpsInt.startTimer', () => startTimerInteractive()),
    vscode.commands.registerCommand('azureDevOpsInt.pauseTimer', () => timer?.pause()),
    vscode.commands.registerCommand('azureDevOpsInt.resumeTimer', () => timer?.resume()),
    vscode.commands.registerCommand('azureDevOpsInt.stopTimer', async () => {
      const stopped = timer?.stop();
      updateTimerContext(undefined);
      if (stopped) {
        try {
          await handleTimerStopAndOfferUpdate(stopped);
        } catch (e: any) {
          console.error('Error applying timer updates', e);
          vscode.window.showErrorMessage(
            'Failed to process timer update: ' + (e?.message || String(e))
          );
        }
      }
    }),
    vscode.commands.registerCommand('azureDevOpsInt.showTimeReport', () => showTimeReport()),
    vscode.commands.registerCommand('azureDevOpsInt.createBranch', () =>
      createBranchFromWorkItem()
    ),
    vscode.commands.registerCommand('azureDevOpsInt.createPullRequest', () =>
      createPullRequestInteractive()
    ),
    vscode.commands.registerCommand('azureDevOpsInt.showPullRequests', () => showMyPullRequests()),
    vscode.commands.registerCommand('azureDevOpsInt.showBuildStatus', () => showBuildStatus()),
    vscode.commands.registerCommand('azureDevOpsInt.toggleKanbanView', () => toggleKanbanView()),
    vscode.commands.registerCommand('azureDevOpsInt.selectTeam', () => selectTeam()),
    vscode.commands.registerCommand('azureDevOpsInt.resetPreferredRepositories', () =>
      resetPreferredRepositories()
    ),
    vscode.commands.registerCommand('azureDevOpsInt.selfTestWebview', () => selfTestWebview())
  );

  // Attempt silent init if settings already present
  migrateLegacyConfigIfNeeded().finally(() => silentInit(context));

  // React to configuration changes (org, project, PAT) to (re)initialize without requiring reload
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (
        e.affectsConfiguration(`${CONFIG_NS}.organization`) ||
        e.affectsConfiguration(`${CONFIG_NS}.project`) ||
        e.affectsConfiguration(`${CONFIG_NS}.personalAccessToken`)
      ) {
        try {
          await migrateLegacyPAT(context);
        } catch {
          /* ignore */
        }
        // Reset client/provider so silentInit can rebuild from new settings
        client = undefined;
        provider = undefined;
        await silentInit(context);
        // If a view is attached, refresh to reflect new connection via command
        try {
          await vscode.commands.executeCommand('azureDevOpsInt.refreshWorkItems');
        } catch {
          /* ignore */
        }
      }
    })
  );
}

export function deactivate() {
  // noop for now
}

class AzureDevOpsIntViewProvider implements vscode.WebviewViewProvider {
  private ctx: vscode.ExtensionContext;
  constructor(context: vscode.ExtensionContext) {
    this.ctx = context;
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
    console.log('[azureDevOpsInt] resolveWebviewView invoked for view:', webviewView.viewType);
    panel = webviewView;
    const webview = webviewView.webview;
    webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.ctx.extensionUri, 'media', 'webview')],
    };

    const nonce = getNonce();
    webview.onDidReceiveMessage((msg: any) => {
      handleMessage(msg);
    });

    const html = buildMinimalWebviewHtml(this.ctx, webview, nonce);
    webview.html = html;

    initDomainObjects(this.ctx, (msg: any) => webview.postMessage(msg));
  }
}

async function initDomainObjects(context: vscode.ExtensionContext, postMessage: any) {
  const config = getConfig();
  const org = config.get<string>('organization') || '';
  const project = config.get<string>('project') || '';
  const pat = await getSecretPAT(context);
  if (org && project && pat) {
    try {
      const rate = Math.max(1, Math.min(50, config.get<number>('apiRatePerSecond') ?? 5));
      const burst = Math.max(1, Math.min(100, config.get<number>('apiBurst') ?? 10));
      const team = config.get<string>('team') || undefined;
      client = new AzureDevOpsIntClient(org, project, pat, { ratePerSecond: rate, burst, team });
      vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', true);
    } catch (e: any) {
      console.error(e);
    }
  } else {
    vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', false);
  }
  provider = client ? new WorkItemsProvider(client, postMessage, {}) : undefined;
  // Pomodoro: show a simple break prompt and optionally auto-resume after 5 minutes
  let pomodoroBreakTimeout: any | undefined;
  timer = new WorkItemTimer({
    autoResumeOnActivity: config.get<boolean>('autoResumeOnActivity') ?? true,
    inactivityTimeoutSec: config.get<number>('timerInactivityTimeout') ?? 300,
    defaultElapsedLimitHours: config.get<number>('defaultElapsedLimitHours') ?? 3.5,
    pomodoroEnabled: config.get<boolean>('pomodoroEnabled') ?? false,
    breakPrompt: () => {
      // Only act if a timer is active and not already paused by user
      const snap = timer?.snapshot?.();
      if (!snap || snap.isPaused) return;
      vscode.window
        .showInformationMessage(
          'Time for a Pomodoro break?',
          { modal: true },
          'Start 5‑min break',
          'Skip'
        )
        .then((choice) => {
          if (!choice || choice === 'Skip') return;
          // Pause now and auto-resume after 5 minutes
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
        });
    },
    persist: (data: { state?: any; timeEntries?: any[]; updateLastSave?: boolean }) =>
      persistTimer(context, data),
    restorePersisted: () => restoreTimer(context),
    onState: (s: any) => {
      postMessage({ type: 'timerUpdate', timer: s });
      updateTimerContext(s);
    },
    onInfo: (m: any) => console.log('[timer]', m),
    onWarn: (m: any) => console.warn('[timer]', m),
    onError: (m: any) => console.error('[timer]', m),
  });
  timer.loadFromPersisted();
  if (!initialRefreshed) {
    provider?.refresh(config.get('defaultQuery') || 'My Work Items');
    initialRefreshed = true;
  }
}

async function handleMessage(msg: any) {
  verbose('[webview->ext]', JSON.stringify(msg));

  // Handle async cases first
  if (msg?.type === 'editWorkItemInEditor') {
    const id: number | undefined = typeof msg.workItemId === 'number' ? msg.workItemId : undefined;
    if (typeof id === 'number' && provider) {
      editWorkItemInEditor(id);
    }
    return;
  }

  switch (msg?.type) {
    case 'webviewReady': {
      // Re-send current cached state (avoid race where initial post happened before listener attached)
      if (panel) {
        const workItems = provider?.getWorkItems() || [];
        console.log('[azureDevOpsInt] Sending workItemsLoaded with', workItems.length, 'items');
        if (workItems.length > 0) {
          console.log('[azureDevOpsInt] First work item:', JSON.stringify(workItems[0], null, 2));
        }
        panel.webview.postMessage({ type: 'workItemsLoaded', workItems, kanbanView: false });
        const snap = timer?.snapshot?.();
        if (snap) panel.webview.postMessage({ type: 'timerUpdate', timer: snap });
        // If a self-test was queued before webview ready, trigger now
        if (selfTestPending) {
          panel.webview.postMessage({ type: 'selfTestPing', nonce: selfTestPending.nonce });
        }
      }
      break;
    }
    case 'selfTestAck': {
      if (selfTestPending && msg.nonce === selfTestPending.nonce) {
        clearTimeout(selfTestPending.timeout);
        selfTestPending.resolve({ ok: true, details: msg.signature || 'ack' });
        selfTestPending = undefined;
        vscode.window.showInformationMessage(
          `Webview self-test succeeded: ${msg.signature || 'ack'}`
        );
      }
      break;
    }
    case 'webviewRuntimeError': {
      const msgTxt = `[webviewRuntimeError] ${msg.message || 'Unknown error'}${
        msg.stack ? '\n' + msg.stack : ''
      }`;
      console.error(msgTxt);
      if (outputChannel) outputChannel.appendLine(msgTxt);
      if (getConfig().get<boolean>('debugLogging')) {
        vscode.window.showErrorMessage(`Webview runtime error: ${msg.message || 'Unknown'}`);
      }
      break;
    }
    case 'refresh':
      verbose('Refresh requested from webview');
      provider?.refresh();
      break;
    case 'getWorkItems': {
      verbose('Work items requested from webview');
      if (panel) {
        const workItems = provider?.getWorkItems() || [];
        panel.webview.postMessage({ type: 'workItemsLoaded', workItems });
      }
      break;
    }
    case 'viewWorkItem': {
      const id: number | undefined =
        typeof msg.workItemId === 'number' ? msg.workItemId : undefined;
      if (typeof id === 'number' && provider) {
        // Create work item URL for Azure DevOps
        const baseUrl = (provider as any).client?.getBrowserUrl?.('') || '';
        if (baseUrl) {
          const workItemUrl = `${baseUrl}/_workitems/edit/${id}`;
          vscode.env.openExternal(vscode.Uri.parse(workItemUrl));
        }
      }
      break;
    }
    case 'startTimer': {
      const id: number | undefined =
        typeof msg.workItemId === 'number'
          ? msg.workItemId
          : typeof msg.id === 'number'
            ? msg.id
            : undefined;
      if (typeof id === 'number') {
        const wi: any = provider
          ?.getWorkItems()
          .find((w: any) => (w as any).id === id || w.fields?.['System.Id'] === id);
        if (wi)
          timer?.start(
            Number(wi.id || wi.fields?.['System.Id']),
            wi.fields?.['System.Title'] || `#${id}`
          );
      }
      break;
    }
    case 'pauseTimer':
      timer?.pause();
      break;
    case 'resumeTimer':
      timer?.resume();
      break;
    case 'stopTimer': {
      const stopped = timer?.stop();
      updateTimerContext(undefined);
      if (stopped) {
        try {
          await handleTimerStopAndOfferUpdate(stopped);
        } catch (e: any) {
          console.error('Error applying timer updates', e);
          vscode.window.showErrorMessage(
            'Failed to process timer update: ' + (e?.message || String(e))
          );
        }
      }
      break;
    }
    case 'activity':
      verbose('Activity ping received');
      timer?.activityPing();
      break;
    case 'webviewConsole': {
      const lvl = msg.level || 'log';
      const text = `[webviewConsole][${lvl}] ${(msg.args || []).join(' ')}`;
      if (lvl === 'error') console.error(text);
      else if (lvl === 'warn') console.warn(text);
      else console.log(text);
      if (outputChannel) outputChannel.appendLine(text);
      break;
    }
    case 'preImportDescriptor': {
      const text = `[preImportDescriptor] ${JSON.stringify(msg.snapshot)}`;
      console.log(text);
      if (outputChannel) outputChannel.appendLine(text);
      break;
    }
    case 'generateCopilotPrompt': {
      const id: number | undefined =
        typeof msg.workItemId === 'number' ? msg.workItemId : undefined;
      // draftSummary (if provided) is available in msg.draftSummary but not required server-side
      if (!id) {
        vscode.window.showWarningMessage('No work item specified for Copilot prompt generation.');
        break;
      }
      try {
        const wi = await client?.getWorkItemById(id);
        const prompt = buildCopilotPrompt({ ...msg, workItemId: id }, wi);
        await vscode.env.clipboard.writeText(prompt);
        // reply to webview to show a confirmation UI
        panel?.webview.postMessage({ type: 'copilotPromptCopied', workItemId: id });
        vscode.window.showInformationMessage(
          'Copilot prompt copied to clipboard. Open Copilot chat and paste to generate a summary.'
        );
      } catch (e: any) {
        console.error('Failed to create Copilot prompt', e);
        vscode.window.showErrorMessage(
          'Failed to generate Copilot prompt: ' + (e?.message || String(e))
        );
      }
      break;
    }
    case 'stopAndApply': {
      const comment = typeof msg.comment === 'string' ? msg.comment : '';
      const stopped = timer?.stop(async (finishedId: number, hoursDecimal: number) => {
        try {
          const wi = await client?.getWorkItemById(finishedId);
          if (!wi) return;
          const currCompleted =
            Number(wi.fields?.['Microsoft.VSTS.Scheduling.CompletedWork'] || 0) || 0;
          const currRemaining =
            Number(wi.fields?.['Microsoft.VSTS.Scheduling.RemainingWork'] || 0) || 0;
          const finalCompleted = Number((currCompleted + hoursDecimal).toFixed(2));
          const finalRemaining = Number(Math.max(0, currRemaining - hoursDecimal).toFixed(2));
          const patch = [
            {
              op: 'add',
              path: '/fields/Microsoft.VSTS.Scheduling.CompletedWork',
              value: finalCompleted,
            },
            {
              op: 'add',
              path: '/fields/Microsoft.VSTS.Scheduling.RemainingWork',
              value: finalRemaining,
            },
          ];
          if (!client) throw new Error('Client not initialized');
          await client.updateWorkItem(finishedId, patch);
          if (comment && comment.trim()) if (!client) throw new Error('Client not initialized');
          await client.addWorkItemComment(
            finishedId,
            `Time tracked: ${hoursDecimal.toFixed(2)} hours. ${comment}`
          );
          panel?.webview.postMessage({
            type: 'stopAndApplyResult',
            workItemId: finishedId,
            hours: hoursDecimal,
          });
          vscode.window.showInformationMessage(
            `Work item #${finishedId} updated: Completed ${finalCompleted}h, Remaining ${finalRemaining}h.`
          );
        } catch (err: any) {
          console.error('stopAndApply failed', err);
          vscode.window.showErrorMessage(
            'Failed to apply time entry: ' + (err?.message || String(err))
          );
        }
      });
      // If stop returned null (no active timer) inform user
      if (!stopped) vscode.window.showInformationMessage('No active timer to stop.');
      updateTimerContext(undefined);
      break;
    }
    case 'addComment': {
      const workItemId: number | undefined =
        typeof msg.workItemId === 'number' ? msg.workItemId : undefined;
      let comment: string | undefined =
        typeof msg.comment === 'string' ? msg.comment.trim() : undefined;

      if (!workItemId) {
        vscode.window.showWarningMessage('No work item specified for comment.');
        break;
      }

      // If comment not provided by webview, prompt the user with VS Code input box
      if (!comment || comment.length === 0) {
        comment = await vscode.window.showInputBox({
          prompt: `Enter a comment for work item #${workItemId}`,
          placeHolder: 'Type your comment…',
          ignoreFocusOut: true,
        });
        if (!comment || comment.trim().length === 0) {
          // User cancelled or empty input
          break;
        }
        comment = comment.trim();
      }

      try {
        if (!client) throw new Error('Client not initialized');
        await client.addWorkItemComment(workItemId, comment);
        vscode.window.showInformationMessage(`Comment added to work item #${workItemId}.`);
      } catch (err: any) {
        console.error('Failed to add comment', err);
        vscode.window.showErrorMessage('Failed to add comment: ' + (err?.message || String(err)));
      }
      break;
    }
    default:
      console.warn('Unknown webview message', msg);
      verbose('Unknown message type');
  }
}

async function selfTestWebview() {
  try {
    const attempt = async (): Promise<{ ok: boolean; details: string }> => {
      if (!panel) revealWorkItemsView();
      // wait briefly for panel to initialize if needed
      if (!panel) {
        await new Promise((r) => setTimeout(r, 250));
      }
      if (!panel) throw new Error('Webview panel not available');
      if (selfTestPending) throw new Error('A self-test is already running');
      const nonce = getNonce();
      const promise = new Promise<{ ok: boolean; details: string }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (selfTestPending) {
            selfTestPending = undefined;
            reject(new Error('Self-test timeout waiting for ack'));
          }
        }, 4000);
        selfTestPending = { nonce, resolve, reject, timeout };
      });
      // If webview already ready we can post immediately; else it will be posted on webviewReady branch.
      panel.webview.postMessage({ type: 'selfTestPing', nonce });
      return promise;
    };
    const result = await attempt();
    verbose('[selfTest] success', result.details);
  } catch (e: any) {
    verbose('[selfTest] failed', e?.message || e);
    vscode.window.showErrorMessage(`Webview self-test failed: ${e?.message || e}`);
  }
}

async function getSecretPAT(context: vscode.ExtensionContext): Promise<string | undefined> {
  return context.secrets.get(PAT_KEY);
}

function persistTimer(
  context: vscode.ExtensionContext,
  data: {
    state?: any;
    timeEntries?: any[];
    updateLastSave?: boolean;
    defaultElapsedLimitHours?: number;
  }
) {
  if (data.updateLastSave) context.globalState.update(STATE_LAST_SAVE, Date.now());
  // Persist cap alongside state to ensure restored timers keep the same cap behavior
  const stateToPersist = data.state
    ? { ...(data.state as any), __defaultElapsedLimitHours: data.defaultElapsedLimitHours }
    : undefined;
  context.globalState.update(STATE_TIMER, stateToPersist);
  context.globalState.update(STATE_TIME_ENTRIES, data.timeEntries);
}
function restoreTimer(context: vscode.ExtensionContext) {
  const persistedState = context.globalState.get<any>(STATE_TIMER);
  return {
    state: persistedState,
    timeEntries: context.globalState.get<any[]>(STATE_TIME_ENTRIES) || [],
    defaultElapsedLimitHours: persistedState?.__defaultElapsedLimitHours,
  } as any;
}

function buildMinimalWebviewHtml(
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
  nonce: string
): string {
  // Read the static webview HTML file from media/webview (committed asset)
  const htmlPath = path.join(context.extensionPath, 'media', 'webview', 'index.html');
  let html: string;

  try {
    html = fs.readFileSync(htmlPath, 'utf8');
  } catch (error) {
    console.error('[azureDevOpsInt] Failed to read HTML file:', error);
    // Fallback to basic HTML if file read fails
    return `<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Failed to load webview</h1></body></html>`;
  }

  // Get media URIs for replacement
  const mediaRoot = vscode.Uri.joinPath(context.extensionUri, 'media', 'webview');
  const version = getExtensionVersion(context);
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, 'main.js'));
  // Append a cache-busting version query so VS Code doesn’t serve stale cached assets after upgrade
  const scriptUriWithVersion = scriptUri.with({ query: `v=${encodeURIComponent(version)}` });
  const scriptUriStr = scriptUriWithVersion.toString();

  // Update CSP and script nonces
  const csp = `default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource}`;
  const consoleBridge = `(function(){try{var vs=window.vscode||acquireVsCodeApi();['log','warn','error'].forEach(function(m){var orig=console[m];console[m]=function(){try{vs.postMessage({type:'webviewConsole', level:m, args:Array.from(arguments).map(a=>{try{return a&&a.stack?String(a.stack):typeof a==='object'?JSON.stringify(a):String(a);}catch{return String(a);}})});}catch{};return orig.apply(console,arguments);};});console.log('[webview] Azure DevOps Integration v${version}');}catch(e){/* ignore */}})();`;

  // Replace placeholders in the static HTML
  html = html.replace(
    '<meta charset="UTF-8">',
    `<meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="${csp}">`
  );
  html = html.replace('./main.js', scriptUriStr);
  html = html.replace(
    '<script type="module" crossorigin src="' + scriptUriStr + '"></script>',
    `<script nonce="${nonce}">(function(){try{if(!window.vscode){window.vscode=acquireVsCodeApi();}}catch(e){console.error('[webview] acquireVsCodeApi failed',e);}})();</script>` +
      `<script nonce="${nonce}">${consoleBridge}</script>` +
      `<script type="module" nonce="${nonce}" src="${scriptUriStr}"></script>`
  );

  return html;
}

function getNonce() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let v = '';
  for (let i = 0; i < 16; i++) v += chars.charAt(Math.floor(Math.random() * chars.length));
  return v;
}

// ---------------- Additional Helper Logic ----------------

async function setupConnection(context: vscode.ExtensionContext) {
  const org = await vscode.window.showInputBox({
    prompt: 'Azure DevOps organization (short name)',
    ignoreFocusOut: true,
  });
  if (!org) return;
  const project = await vscode.window.showInputBox({
    prompt: 'Azure DevOps project name',
    ignoreFocusOut: true,
  });
  if (!project) return;
  const pat = await vscode.window.showInputBox({
    prompt: 'Personal Access Token (scopes: Work Items Read/Write)',
    password: true,
    ignoreFocusOut: true,
  });
  if (!pat) return;
  const config = getConfig();
  await config.update('organization', org, vscode.ConfigurationTarget.Global);
  await config.update('project', project, vscode.ConfigurationTarget.Global);
  await context.secrets.store(PAT_KEY, pat.trim());
  vscode.window.showInformationMessage('Azure DevOps connection saved. Initializing...');
  client = undefined;
  provider = undefined;
  timer = undefined; // reset
  try {
    vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', true);
  } catch {
    // ignore context set failure; not fatal
  }
  if (panel) {
    await initDomainObjects(context, (m: any) => panel?.webview.postMessage(m));
  } else await silentInit(context);
}

async function silentInit(context: vscode.ExtensionContext) {
  await migrateLegacyPAT(context);
  const cfg = getConfig();
  const pat = await getSecretPAT(context);
  if (cfg.get('organization') && cfg.get('project') && pat) {
    if (!client) {
      try {
        const rate = Math.max(1, Math.min(50, cfg.get<number>('apiRatePerSecond') ?? 5));
        const burst = Math.max(1, Math.min(100, cfg.get<number>('apiBurst') ?? 10));
        const team = (cfg.get<string>('team') as string) || undefined;
        client = new AzureDevOpsIntClient(
          String(cfg.get('organization')),
          String(cfg.get('project')),
          pat,
          { ratePerSecond: rate, burst, team }
        );
        vscode.commands.executeCommand('setContext', 'azureDevOpsInt.connected', true);
      } catch (e) {
        console.error(e);
      }
      if (client && !provider)
        provider = new WorkItemsProvider(client, (msg: any) => panel?.webview.postMessage(msg), {});
      if (!timer) {
        // Pomodoro: show a simple break prompt and optionally auto-resume after 5 minutes
        let pomodoroBreakTimeout: NodeJS.Timeout | undefined;
        timer = new WorkItemTimer({
          autoResumeOnActivity: cfg.get<boolean>('autoResumeOnActivity') ?? true,
          inactivityTimeoutSec: cfg.get<number>('timerInactivityTimeout') ?? 300,
          defaultElapsedLimitHours: cfg.get<number>('defaultElapsedLimitHours') ?? 3.5,
          pomodoroEnabled: cfg.get<boolean>('pomodoroEnabled') ?? false,
          breakPrompt: () => {
            const snap = timer?.snapshot?.();
            if (!snap || snap.isPaused) return;
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
                  /* ignore update error */
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
              });
          },
          persist: (data: { state?: any; timeEntries?: any[]; updateLastSave?: boolean }) =>
            persistTimer(context, data),
          restorePersisted: () => restoreTimer(context),
          onState: (s: any) => {
            panel?.webview.postMessage({ type: 'timerUpdate', timer: s });
            updateTimerContext(s);
          },
        });
        timer.loadFromPersisted();
      }
      // Defer first refresh until webview attached to avoid double fetch
      if (panel && !initialRefreshed) {
        provider?.refresh(cfg.get('defaultQuery') || 'My Work Items');
        initialRefreshed = true;
      }
    }
  }
}

async function migrateLegacyPAT(context: vscode.ExtensionContext) {
  const NEW_KEY = PAT_KEY;
  const LEGACY_SECRET_KEY = 'azureDevOps.pat';
  // 1. Old globalState under new key (rare) -> secret
  const legacyGlobal = context.globalState.get<string>(NEW_KEY);
  const existing = await context.secrets.get(NEW_KEY);
  if (legacyGlobal && !existing) {
    try {
      await context.secrets.store(NEW_KEY, legacyGlobal);
      await context.globalState.update(NEW_KEY, undefined);
      console.log('[azureDevOpsInt] Migrated PAT (globalState new key -> secret)');
    } catch (e) {
      console.error('Failed migrating PAT (globalState new key)', e);
    }
  }
  // 2. Old secret key -> new secret key
  const legacySecret = await context.secrets.get(LEGACY_SECRET_KEY);
  if (legacySecret && !existing) {
    try {
      await context.secrets.store(NEW_KEY, legacySecret);
      await context.secrets.delete(LEGACY_SECRET_KEY); // optional cleanup
      console.log('[azureDevOpsInt] Migrated PAT (old secret key -> new secret key)');
    } catch (e) {
      console.error('Failed migrating PAT (old secret key)', e);
    }
  }

  // 3. Migrate from settings if user entered a PAT there (more discoverable), then clear it
  try {
    const cfg = getConfig();
    const patInSettings = String(cfg.get('personalAccessToken') || '').trim();
    const existingSecret = await context.secrets.get(NEW_KEY);
    if (patInSettings && !existingSecret) {
      await context.secrets.store(NEW_KEY, patInSettings);
      // Clear the setting to avoid storing secrets in settings.json
      await cfg.update('personalAccessToken', '', vscode.ConfigurationTarget.Global);
      console.log('[azureDevOpsInt] Migrated PAT from settings to secret store');
    }
  } catch (e) {
    console.warn('[azureDevOpsInt] migrate PAT from settings failed', e);
  }
}

function revealWorkItemsView() {
  // Show our custom Activity Bar container. Since it's the only view in the container,
  // revealing the container is sufficient and avoids potential focus race conditions.
  vscode.commands.executeCommand('workbench.view.extension.azureDevOpsIntegration');
  // Also explicitly focus the view to force creation/resolve if VS Code didn't materialize it yet.
  // VS Code generates a '<viewId>.focus' command for contributed views.
  setTimeout(() => {
    try {
      vscode.commands.executeCommand('azureDevOpsWorkItems.focus');
      verbose('Focused Work Items view');
    } catch {
      // ignore focus error
    }
  }, 0);
  verbose('Revealed Azure DevOps container');
}

async function quickCreateWorkItem() {
  if (!client || !provider) {
    vscode.window.showWarningMessage(
      'Connect to Azure DevOps first (Azure DevOps: Setup Connection).'
    );
    return;
  }
  const cfg = getConfig();
  const defaultType: string = cfg.get('defaultWorkItemType') || 'Task';
  const title = await vscode.window.showInputBox({ prompt: `New ${defaultType} title` });
  if (!title) return;
  try {
    const created = await provider.createWorkItem(defaultType, title);
    vscode.window.showInformationMessage(`Created work item #${created.id}`);
  } catch (e: any) {
    vscode.window.showErrorMessage(`Failed to create: ${e.message || e}`);
  }
}

async function selectTeam() {
  try {
    if (!client) {
      vscode.window.showWarningMessage('Connect to Azure DevOps first (Setup Connection).');
      return;
    }
    const teams = await (client as any).getTeams?.();
    if (!Array.isArray(teams) || teams.length === 0) {
      vscode.window.showInformationMessage('No teams found for this project.');
      return;
    }
    const picks = teams.map((t: any) => ({ label: t.name, description: t.id }));
    const chosen = await vscode.window.showQuickPick(picks, {
      placeHolder: 'Select your Team for sprint queries',
    });
    if (!chosen) return;
    const cfg = getConfig();
    await cfg.update('team', chosen.label, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(
      `Team set to "${chosen.label}". 'Current Sprint' will use this team context.`
    );
    // Re-initialize client to use new team without requiring reload
    const org = String(cfg.get('organization') || '');
    const project = String(cfg.get('project') || '');
    const pat = extensionContextRef ? await getSecretPAT(extensionContextRef) : undefined;
    // If we cannot rehydrate PAT in this context, silently skip re-init (next activation covers it)
    if (org && project && pat) {
      try {
        const rate = Math.max(1, Math.min(50, cfg.get<number>('apiRatePerSecond') ?? 5));
        const burst = Math.max(1, Math.min(100, cfg.get<number>('apiBurst') ?? 10));
        client = new AzureDevOpsIntClient(org, project, pat, {
          ratePerSecond: rate,
          burst,
          team: chosen.label,
        });
        provider = client
          ? new WorkItemsProvider(client, (m: any) => panel?.webview.postMessage(m), {})
          : provider;
        // refresh view if attached
        provider?.refresh(cfg.get('defaultQuery') || 'My Work Items');
      } catch {
        /* ignore */
      }
    }
  } catch (e: any) {
    vscode.window.showErrorMessage(`Failed to select team: ${e?.message || e}`);
  }
}

async function resetPreferredRepositories() {
  const cfg = getConfig();
  try {
    await cfg.update('preferredRepositoryIds', [], vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(
      'Preferred repositories cleared. You will be prompted next time you create a PR.'
    );
  } catch (e: any) {
    vscode.window.showErrorMessage(`Failed to clear preferred repositories: ${e?.message || e}`);
  }
}

function toggleKanbanView() {
  if (!panel) {
    revealWorkItemsView();
    return;
  }

  // Send message to webview to toggle the view
  panel.webview.postMessage({ type: 'toggleKanbanView' });
}

async function editWorkItemInEditor(workItemId: number) {
  if (!client || !provider) {
    vscode.window.showWarningMessage(
      'Connect to Azure DevOps first (Azure DevOps: Setup Connection).'
    );
    return;
  }

  try {
    // Find the work item in our cached list
    const workItems = provider.getWorkItems();
    const workItem = workItems.find(
      (w: any) => w.id === workItemId || w.fields?.['System.Id'] === workItemId
    );

    if (!workItem) {
      vscode.window.showErrorMessage(`Work item #${workItemId} not found in current list.`);
      return;
    }

    // Extract current values from fields only (typed WorkItem does not include direct props)
    const currentTitle = workItem.fields?.['System.Title'] || '';
    const currentDescription = workItem.fields?.['System.Description'] || '';
    const currentState = workItem.fields?.['System.State'] || '';
    const currentType = workItem.fields?.['System.WorkItemType'] || '';

    // Get new title
    const newTitle = await vscode.window.showInputBox({
      prompt: `Edit title for ${currentType} #${workItemId}`,
      value: currentTitle,
      placeHolder: 'Work item title',
    });

    if (newTitle === undefined) return; // User cancelled

    // Get new description
    const newDescription = await vscode.window.showInputBox({
      prompt: `Edit description for ${currentType} #${workItemId}`,
      value: currentDescription,
      placeHolder: 'Work item description (optional)',
    });

    if (newDescription === undefined) return; // User cancelled

    // Get valid states for this work item type dynamically
    let stateOptions: { label: string; description: string }[];
    try {
      const validStates = await client.getWorkItemTypeStates(currentType);
      if (validStates.length > 0) {
        stateOptions = validStates.map((state) => ({
          label: state,
          description: `${state} state`,
        }));
        // If current state is not in the valid states, add it to prevent user confusion
        if (!validStates.includes(currentState) && currentState) {
          stateOptions.unshift({
            label: currentState,
            description: `Current: ${currentState} state`,
          });
        }
      } else {
        // Fallback to common states if API returns empty
        stateOptions = [
          { label: 'New', description: 'New work item' },
          { label: 'Active', description: 'Work in progress' },
          { label: 'Resolved', description: 'Work completed' },
          { label: 'Closed', description: 'Work verified and closed' },
          { label: 'Removed', description: 'Work item removed' },
        ];
      }
    } catch (e) {
      console.error('Failed to fetch valid states, using fallback:', e);
      // Fallback to common states if API fails
      stateOptions = [
        { label: 'New', description: 'New work item' },
        { label: 'Active', description: 'Work in progress' },
        { label: 'Resolved', description: 'Work completed' },
        { label: 'Closed', description: 'Work verified and closed' },
        { label: 'Removed', description: 'Work item removed' },
      ];
      // Ensure current state is available if it's not in the fallback list
      const fallbackStates = stateOptions.map((opt) => opt.label);
      if (!fallbackStates.includes(currentState) && currentState) {
        stateOptions.unshift({
          label: currentState,
          description: `Current: ${currentState} state`,
        });
      }
    }

    const selectedState = await vscode.window.showQuickPick(stateOptions, {
      placeHolder: `Current state: ${currentState}. Select new state:`,
    });

    if (!selectedState) return; // User cancelled
    const newState = selectedState.label;

    // Build patch operations for changes
    const patchOps: any[] = [];

    if (newTitle !== currentTitle) {
      patchOps.push({
        op: 'replace',
        path: '/fields/System.Title',
        value: newTitle,
      });
    }

    if (newDescription !== currentDescription) {
      patchOps.push({
        op: 'replace',
        path: '/fields/System.Description',
        value: newDescription,
      });
    }

    if (newState !== currentState) {
      patchOps.push({
        op: 'replace',
        path: '/fields/System.State',
        value: newState,
      });
    }

    // Apply updates if there are any changes
    if (patchOps.length > 0) {
      await client.updateWorkItem(workItemId, patchOps);
      vscode.window.showInformationMessage(`Updated work item #${workItemId}`);

      // Refresh the work items list to show updated data
      provider.refresh();
    } else {
      vscode.window.showInformationMessage('No changes made.');
    }
  } catch (e: any) {
    vscode.window.showErrorMessage(`Failed to edit work item: ${e.message || e}`);
  }
}

async function startTimerInteractive() {
  if (!provider || !timer) {
    vscode.window.showWarningMessage('Provider not ready yet');
    return;
  }
  if (timer.snapshot()) {
    vscode.window.showInformationMessage('Timer already running');
    return;
  }
  const items = provider.getWorkItems();
  if (items.length === 0) {
    await provider.refresh();
  }
  const pick = await vscode.window.showQuickPick(
    provider.getWorkItems().map((w: any) => ({
      label: w.fields?.['System.Title'] || `#${w.id}`,
      description: `#${w.id}`,
      wi: w,
    })),
    { placeHolder: 'Select work item to start/stop timer' }
  );
  if (!pick) return;
  const wi: any = (pick as any).wi;
  timer.start(
    Number(wi.id || wi.fields?.['System.Id']),
    wi.fields?.['System.Title'] || `#${wi.id}`
  );
}

function showTimeReport() {
  if (!timer) {
    vscode.window.showInformationMessage('No timer data yet.');
    return;
  }
  const periods: Array<'Today' | 'This Week' | 'This Month' | 'All Time'> = [
    'Today',
    'This Week',
    'This Month',
    'All Time',
  ];
  vscode.window.showQuickPick(periods, { placeHolder: 'Select report period' }).then((p) => {
    if (!p || !timer) return; // guard
    const report = timer.timeReport(p as 'Today' | 'This Week' | 'This Month' | 'All Time');
    const lines: string[] = [];
    report.buckets.forEach((val: any, key: string | number) => {
      const hrs = (val.total / 3600).toFixed(2);
      lines.push(`#${key}: ${hrs}h`);
    });
    if (lines.length === 0) lines.push('No time entries in period');
    vscode.window.showInformationMessage(`${p} Time:\n${lines.join('\n')}`);
  });
}

function updateTimerContext(s: any) {
  const running = !!s && !s.isPaused;
  const paused = !!s && s.isPaused;
  vscode.commands.executeCommand('setContext', 'azureDevOpsInt.timerActive', !!s);
  vscode.commands.executeCommand('setContext', 'azureDevOpsInt.timerRunning', running);
  vscode.commands.executeCommand('setContext', 'azureDevOpsInt.timerPaused', paused);
  if (statusBarItem) {
    if (s) {
      const sec = s.elapsedSeconds || 0;
      const h = Math.floor(sec / 3600)
        .toString()
        .padStart(2, '0');
      const m = Math.floor((sec % 3600) / 60)
        .toString()
        .padStart(2, '0');
      const mini = `${h}:${m}`;
      statusBarItem.text = `$(watch) ${mini} #${s.workItemId}${s.isPaused ? ' (Paused)' : ''}`;
      statusBarItem.tooltip = `Azure DevOps Timer for #${s.workItemId}`;
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  }
}

function verbose(msg: string, extra?: any) {
  try {
    if (!outputChannel) return;
    if (extra !== undefined) {
      outputChannel.appendLine(
        `${new Date().toISOString()} ${msg} ${
          typeof extra === 'string' ? extra : JSON.stringify(extra)
        }`
      );
    } else {
      outputChannel.appendLine(`${new Date().toISOString()} ${msg}`);
    }
  } catch {
    /* ignore */
  }
}

// ---------------- Git / PR / Build Feature Helpers ----------------

async function createBranchFromWorkItem() {
  const gitExt = vscode.extensions.getExtension('vscode.git');
  if (!gitExt) {
    vscode.window.showErrorMessage('Git extension not available.');
    return;
  }
  const api: any = gitExt.isActive ? gitExt.exports.getAPI(1) : (await gitExt.activate()).getAPI(1);
  const repo = api.repositories?.[0];
  if (!repo) {
    vscode.window.showWarningMessage('No git repository open.');
    return;
  }
  if (!provider) {
    vscode.window.showWarningMessage('Work items not loaded yet.');
    return;
  }
  const pick = await vscode.window.showQuickPick(
    provider.getWorkItems().map((w: any) => ({
      label: w.fields?.['System.Title'] || `#${w.id}`,
      description: `#${w.id}`,
      wi: w,
    })),
    { placeHolder: 'Select work item for branch' }
  );
  if (!pick) return;
  const wi: any = (pick as any).wi;
  const id = wi.id || wi.fields?.['System.Id'];
  const rawTitle =
    (wi.fields?.['System.Title'] || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || `wi-${id}`;
  const branchName = await vscode.window.showInputBox({
    prompt: 'Branch name',
    value: `feature/wi-${id}-${rawTitle}`,
  });
  if (!branchName) return;
  try {
    await repo.createBranch(branchName, true);
    vscode.window.showInformationMessage(`Created and switched to ${branchName}`);
    const autoStart = getConfig().get<boolean>('autoStartTimerOnBranch');
    if (autoStart && timer && !timer.snapshot())
      timer.start(Number(id), wi.fields?.['System.Title'] || `#${id}`);
  } catch (e: any) {
    vscode.window.showErrorMessage(`Branch creation failed: ${e.message || e}`);
  }
}

async function createPullRequestInteractive() {
  if (!client) {
    vscode.window.showWarningMessage('Connect first.');
    return;
  }
  const repos = await client.getRepositories();
  if (!Array.isArray(repos) || repos.length === 0) {
    vscode.window.showWarningMessage('No repositories found via REST API.');
    return;
  }
  const cfg = getConfig();
  let preferred: string[] = (cfg.get<string[]>('preferredRepositoryIds') || []).filter(Boolean);
  // If none stored, prompt to select one or more repos and save for future
  if (!preferred.length) {
    const picks = await vscode.window.showQuickPick(
      repos.map((r: any) => ({ label: r.name, description: r.id, picked: false })),
      { placeHolder: 'Select default repositories for PR creation', canPickMany: true }
    );
    if (!picks || picks.length === 0) {
      vscode.window.showInformationMessage('No repositories selected.');
      return;
    }
    preferred = picks.map((p: any) => p.description!).filter(Boolean);
    try {
      await cfg.update('preferredRepositoryIds', preferred, vscode.ConfigurationTarget.Global);
    } catch (e: any) {
      console.warn('[azureDevOpsInt] Failed to persist preferredRepositoryIds', e);
    }
  }

  // Filter stored repo IDs to those that still exist
  const repoMap = new Map((repos || []).map((r: any) => [r.id, r] as const));
  const validPreferred = preferred.filter((id) => repoMap.has(id));
  if (!validPreferred.length) {
    vscode.window.showWarningMessage(
      'Your saved repositories are not found in this project. Please reselect.'
    );
    const picks = await vscode.window.showQuickPick(
      repos.map((r: any) => ({ label: r.name, description: r.id, picked: false })),
      { placeHolder: 'Select default repositories for PR creation', canPickMany: true }
    );
    if (!picks || picks.length === 0) return;
    const newIds = picks.map((p: any) => p.description!).filter(Boolean);
    await cfg.update('preferredRepositoryIds', newIds, vscode.ConfigurationTarget.Global);
  }

  // If more than one preferred, ask which to use for this PR. If single, auto-select
  const candidateRepos = (cfg.get<string[]>('preferredRepositoryIds') || [])
    .filter((id) => repoMap.has(id))
    .map((id) => repoMap.get(id));

  let repoPick: { label: string; description: string } | undefined;
  if (candidateRepos.length === 1) {
    const r = candidateRepos[0] as any;
    repoPick = { label: r.name, description: r.id };
  } else {
    repoPick = await vscode.window.showQuickPick(
      candidateRepos.map((r: any) => ({ label: r.name, description: r.id })),
      { placeHolder: 'Select repository for this PR' }
    );
    if (!repoPick) return;
  }
  const source = await vscode.window.showInputBox({
    prompt: 'Source branch (e.g. refs/heads/feature/x)',
    value: 'refs/heads/',
  });
  if (!source) return;
  const target = await vscode.window.showInputBox({
    prompt: 'Target branch',
    value: 'refs/heads/main',
  });
  if (!target) return;
  const title = await vscode.window.showInputBox({ prompt: 'Pull Request title' });
  if (!title) return;
  try {
    const pr = await client.createPullRequest(repoPick.description!, source, target, title);
    vscode.window.showInformationMessage(`PR created: ${pr.pullRequestId}`);
  } catch (e: any) {
    vscode.window.showErrorMessage(`Failed to create PR: ${e.message || e}`);
  }
}

async function showMyPullRequests() {
  if (!client) {
    vscode.window.showWarningMessage('Connect first.');
    return;
  }
  // Fetch PRs across all repos for the current user (author or reviewer)
  const prs: any[] = await (client as any).getMyPullRequestsAcrossRepos?.('active');
  if (!Array.isArray(prs) || prs.length === 0) {
    vscode.window.showInformationMessage('No active pull requests.');
    return;
  }

  const pick = await vscode.window.showQuickPick(
    prs.map((pr: any) => ({
      label: pr.title,
      description: `#${pr.pullRequestId ?? pr.id} ${pr.sourceRefName
        ?.split('/')
        .pop()} -> ${pr.targetRefName?.split('/').pop()}`,
      detail: pr.webUrl,
    })),
    { placeHolder: 'Open PR in browser' }
  );
  if (!pick) return;
  if (pick.detail) {
    vscode.env.openExternal(vscode.Uri.parse(pick.detail));
  }
}

async function showBuildStatus() {
  if (!client) {
    vscode.window.showWarningMessage('Connect first.');
    return;
  }
  // TODO: Implement build status fetch (placeholder to avoid parse issues)
  vscode.window.showInformationMessage('Build status feature not implemented yet.');
}

// Test helpers (no-op in production): allow tests to inject module-scoped dependencies
export function __setTestContext(
  ctx: Partial<{
    provider: any;
    panel: any;
    timer: any;
    client: any;
    statusBarItem: any;
    outputChannel: any;
  }>
) {
  if (ctx.provider !== undefined) provider = ctx.provider;
  if (ctx.panel !== undefined) panel = ctx.panel;
  if (ctx.timer !== undefined) timer = ctx.timer;
  if (ctx.client !== undefined) client = ctx.client;
  if (ctx.statusBarItem !== undefined) statusBarItem = ctx.statusBarItem;
  if (ctx.outputChannel !== undefined) outputChannel = ctx.outputChannel;
}
// Export handleMessage for testing
export { handleMessage };

// Export self test helper for tests
export { selfTestWebview };

// Export helpers for testing
export { migrateLegacyPAT, persistTimer, restoreTimer, getSecretPAT, migrateLegacyConfigIfNeeded };

// Export buildMinimalWebviewHtml for testing the webview HTML generation without changing runtime behavior.
export { buildMinimalWebviewHtml };

async function handleTimerStopAndOfferUpdate(entry: {
  workItemId: number;
  startTime: number;
  endTime: number;
  duration: number;
  hoursDecimal: number;
  capApplied?: boolean;
  capLimitHours?: number;
}) {
  if (!entry) return;
  if (!client) {
    vscode.window.showWarningMessage(
      'Timer stopped but the extension is not connected to Azure DevOps. Connect and try again to update the work item.'
    );
    return;
  }
  const id = Number(entry.workItemId);
  let workItem = await client.getWorkItemById(id);
  if (!workItem) {
    vscode.window.showErrorMessage(`Work item #${id} not found.`);
    return;
  }
  const fields = workItem.fields || {};
  const title = fields['System.Title'] || `#${id}`;
  const currCompleted = Number(fields['Microsoft.VSTS.Scheduling.CompletedWork'] || 0) || 0;
  const currRemaining = Number(fields['Microsoft.VSTS.Scheduling.RemainingWork'] || 0) || 0;
  const hours = Number(entry.hoursDecimal || entry.duration / 3600 || 0);
  const suggestedCompleted = Number((currCompleted + hours).toFixed(2));
  const suggestedRemaining = Number(Math.max(0, currRemaining - hours).toFixed(2));

  const initialOptions = ['Apply', 'Edit', 'Generate Copilot prompt'] as const;
  let promptMsg = `Add ${hours.toFixed(
    2
  )}h to Completed (${currCompleted} → ${suggestedCompleted}) and subtract from Remaining (${currRemaining} → ${suggestedRemaining}) for ${title}?`;
  if (entry.capApplied) {
    promptMsg += `\n\nNote: the timer elapsed exceeded the configured cap of ${
      entry.capLimitHours
    } hours and the recorded duration was limited to ${hours.toFixed(2)}h.`;
  }
  let action = await vscode.window.showInformationMessage(
    promptMsg,
    { modal: true },
    ...initialOptions
  );
  if (!action) return;

  // If user requested a Copilot prompt, generate it, copy to clipboard, and re-prompt
  if (action === 'Generate Copilot prompt') {
    const promptText = buildCopilotPrompt(entry, workItem);
    try {
      await vscode.env.clipboard.writeText(promptText);
    } catch (e) {
      console.error('Clipboard write failed', e);
    }
    vscode.window.showInformationMessage(
      'Copilot prompt copied to clipboard. Open the Copilot chat and paste to generate a concise summary.'
    );
    action = await vscode.window.showInformationMessage(
      `After generating the summary in Copilot, choose how to proceed for work item #${id}.`,
      { modal: true },
      'Apply',
      'Edit'
    );
    if (!action) return;
  }

  let finalCompleted = suggestedCompleted;
  let finalRemaining = suggestedRemaining;
  let comment = generateAutoSummary(entry, workItem);

  if (action === 'Edit') {
    const c = await vscode.window.showInputBox({
      prompt: 'Completed work (hours)',
      value: String(suggestedCompleted),
      ignoreFocusOut: true,
    });
    if (!c) return;
    finalCompleted = Number(c);
    const r = await vscode.window.showInputBox({
      prompt: 'Remaining work (hours)',
      value: String(suggestedRemaining),
      ignoreFocusOut: true,
    });
    if (!r) return;
    finalRemaining = Number(r);
    const edited = await vscode.window.showInputBox({
      prompt: 'Summary comment (will be added to the work item)',
      value: comment,
      ignoreFocusOut: true,
    });
    if (edited !== undefined) comment = edited;
  } else {
    const edited = await vscode.window.showInputBox({
      prompt: 'Summary comment (optional)',
      value: comment,
      ignoreFocusOut: true,
    });
    if (edited !== undefined) comment = edited;
  }

  try {
    const patch = [
      { op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.CompletedWork', value: finalCompleted },
      { op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.RemainingWork', value: finalRemaining },
    ];
    await client.updateWorkItem(id, patch);
    if (comment && comment.trim())
      await client.addWorkItemComment(id, `Time tracked: ${hours.toFixed(2)} hours. ${comment}`);
    vscode.window.showInformationMessage(
      `Work item #${id} updated: Completed ${finalCompleted}h, Remaining ${finalRemaining}h.`
    );
  } catch (err: any) {
    console.error('Failed to update work item', err);
    vscode.window.showErrorMessage('Failed to update work item: ' + (err?.message || String(err)));
  }
}

function generateAutoSummary(entry: any, workItem: any) {
  try {
    const title = workItem?.fields?.['System.Title'] || `#${entry.workItemId}`;
    const start = entry.startTime ? new Date(entry.startTime).toLocaleString() : '';
    const end = entry.endTime ? new Date(entry.endTime).toLocaleString() : '';
    const hrs = Number(entry.hoursDecimal || 0).toFixed(2);
    return `Auto-summary: Worked ${hrs}h on "${title}" (${start} → ${end}).`;
  } catch {
    return `Worked ${Number(entry.hoursDecimal || 0).toFixed(2)}h on work item #${
      entry.workItemId
    }.`;
  }
}

function buildCopilotPrompt(entry: any, workItem: any) {
  const title = workItem?.fields?.['System.Title'] || `#${entry.workItemId}`;
  const start = entry.startTime ? new Date(entry.startTime).toLocaleString() : '';
  const end = entry.endTime ? new Date(entry.endTime).toLocaleString() : '';
  const hrs = Number(entry.hoursDecimal || entry.duration / 3600 || 0).toFixed(2);
  return `You are my assistant. Summarize the work I performed on work item #${entry.workItemId} entitled "${title}" between ${start} and ${end} (total ${hrs} hours). Produce a concise 1-2 sentence summary suitable as a comment on the work item that highlights the outcome, key changes, and suggested next steps.`;
}
