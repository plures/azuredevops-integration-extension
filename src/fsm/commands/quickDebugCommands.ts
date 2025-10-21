/**
 * Quick Debug Commands
 * 
 * Instant access to debugging information without having to hunt through menus.
 * These commands are designed to be used when features are broken and you need
 * immediate visibility into what's happening.
 */

import * as vscode from 'vscode';
import { fsmLogger, FSMComponent } from '../logging/FSMLogger.js';
import { fsmTracer, analyzeCurrentTrace, exportCurrentTrace } from '../logging/FSMTracer.js';

export function registerQuickDebugCommands(context: vscode.ExtensionContext): void {
  // INSTANT DEBUG PANEL - Everything you need in one command
  context.subscriptions.push(
    vscode.commands.registerCommand('azureDevOpsInt.quickDebug', async () => {
      await showInstantDebugPanel();
    })
  );

  // AUTO-OPEN FSM LOGS - Show the output channel immediately
  context.subscriptions.push(
    vscode.commands.registerCommand('azureDevOpsInt.showFSMLogs', async () => {
      showFSMLogsNow();
    })
  );

  // BROKEN FEATURE TRIAGE - Quick assessment of current state
  context.subscriptions.push(
    vscode.commands.registerCommand('azureDevOpsInt.triageBrokenFeature', async () => {
      await triageBrokenFeature();
    })
  );

  fsmLogger.info(FSMComponent.MACHINE, 'Quick debug commands registered');
}

async function showInstantDebugPanel(): Promise<void> {
  try {
    // Open FSM logs immediately
    showFSMLogsNow();
    
    // Get current status
    const stats = fsmTracer.getStats();
    const currentSession = fsmTracer.getCurrentSession();
    const analysis = analyzeCurrentTrace();
    
    // Create instant debug panel
    const panel = vscode.window.createWebviewPanel(
      'instantDebug',
      '🚨 Instant Debug Panel',
      vscode.ViewColumn.Beside, // Open beside current editor
      { enableScripts: false }
    );

    const recentErrors = fsmLogger.getLogBuffer()
      .filter((entry: any) => entry.level >= 2) // WARN and ERROR
      .slice(-10)
      .reverse();

    panel.webview.html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: var(--vscode-font-family); 
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
          }
          .status-ok { color: var(--vscode-charts-green); }
          .status-warn { color: var(--vscode-charts-orange); }
          .status-error { color: var(--vscode-charts-red); }
          .metric {
            background: var(--vscode-textCodeBlock-background);
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
            border-left: 3px solid var(--vscode-charts-blue);
          }
          .error-item {
            background: var(--vscode-inputValidation-errorBackground);
            padding: 8px;
            margin: 5px 0;
            border-radius: 3px;
            border-left: 3px solid var(--vscode-charts-red);
          }
          .command-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            padding: 8px 16px;
            border: none;
            border-radius: 3px;
            margin: 5px;
            cursor: pointer;
          }
          .section {
            margin: 20px 0;
            padding: 15px;
            background: var(--vscode-editor-lineHighlightBackground);
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <h1>🚨 Instant Debug Panel</h1>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        
        <div class="section">
          <h2>📊 Current Status</h2>
          <div class="metric">
            <strong>FSM Tracing:</strong> 
            <span class="${currentSession ? 'status-ok' : 'status-error'}">
              ${currentSession ? `Active (${currentSession.entries.length} events)` : 'Inactive'}
            </span>
          </div>
          <div class="metric">
            <strong>Instrumented Actors:</strong> 
            <span class="${stats.instrumentedActors > 0 ? 'status-ok' : 'status-warn'}">
              ${stats.instrumentedActors}
            </span>
          </div>
          <div class="metric">
            <strong>Recent Errors:</strong> 
            <span class="${recentErrors.length === 0 ? 'status-ok' : 'status-error'}">
              ${recentErrors.length}
            </span>
          </div>
          ${analysis ? `
          <div class="metric">
            <strong>FSM Performance:</strong> 
            <span class="${analysis.performance.avgTransitionTime < 100 ? 'status-ok' : 'status-warn'}">
              ${Math.round(analysis.performance.avgTransitionTime)}ms avg
            </span>
          </div>
          ` : ''}
        </div>

        ${recentErrors.length > 0 ? `
        <div class="section">
          <h2>🔴 Recent Errors</h2>
          ${recentErrors.map((error: any) => `
            <div class="error-item">
              <strong>${new Date(error.timestamp).toLocaleTimeString()}</strong> 
              [${error.component}] ${error.message}
              ${error.data ? `<br><small>${JSON.stringify(error.data, null, 2)}</small>` : ''}
            </div>
          `).join('')}
        </div>
        ` : ''}

        <div class="section">
          <h2>🔧 Quick Actions</h2>
          <p>Use Command Palette (Ctrl+Shift+P) to run:</p>
          <ul>
            <li><code>Azure DevOps Int (Debug): Show FSM Logs</code> - View detailed logs</li>
            <li><code>Azure DevOps Int (Debug): Export FSM Trace</code> - Save current trace</li>
            <li><code>Azure DevOps Int (Debug): Analyze FSM Trace</code> - Performance analysis</li>
            <li><code>Azure DevOps Int (Debug): Show FSM Trace Timeline</code> - Event timeline</li>
          </ul>
        </div>

        <div class="section">
          <h2>📋 System Info</h2>
          <div class="metric">
            <strong>Total FSM Sessions:</strong> ${stats.sessionsCount}<br>
            <strong>Total FSM Events:</strong> ${stats.totalEntries}<br>
            <strong>Current Session Events:</strong> ${stats.currentSessionEntries}
          </div>
        </div>

        <div class="section">
          <h2>💡 Debugging Tips</h2>
          <ul>
            <li>Check the <strong>FSM Output Channel</strong> for real-time logs</li>
            <li>Look for <code>🔴</code> error symbols in the console output</li>
            <li>Export traces when issues occur for later analysis</li>
            <li>Use timeline view to see event sequences</li>
          </ul>
        </div>
      </body>
      </html>
    `;

    vscode.window.showInformationMessage(
      '🚨 Debug panel opened! Check the FSM Output Channel for live logs.',
      'OK'
    );

  } catch (error) {
    vscode.window.showErrorMessage(`Failed to show debug panel: ${error}`);
  }
}

function showFSMLogsNow(): void {
  try {
    // Show FSM output channel immediately
    fsmLogger.showOutputChannel();
    
    // Also show developer console logs
    vscode.window.showInformationMessage(
      '📺 FSM Output Channel opened. Also check Developer Console (Help > Toggle Developer Tools) for console.log output.',
      'Open Developer Tools'
    ).then(selection => {
      if (selection === 'Open Developer Tools') {
        vscode.commands.executeCommand('workbench.action.toggleDevTools');
      }
    });

    // Log a marker to help identify current session
    fsmLogger.info(FSMComponent.MACHINE, '🔍 MANUAL DEBUG SESSION STARTED', {
      component: FSMComponent.MACHINE,
      event: 'DEBUG_SESSION_START'
    }, {
      timestamp: new Date().toISOString(),
      reason: 'User requested debug logs'
    });

    fsmLogger.info(FSMComponent.APPLICATION, 'FSM Output Channel opened - logs are now visible');
    
  } catch (error) {
    console.error('❌ Failed to show FSM logs:', error);
    vscode.window.showErrorMessage(`Failed to show FSM logs: ${error}`);
  }
}

async function triageBrokenFeature(): Promise<void> {
  try {
    const featureName = await vscode.window.showInputBox({
      prompt: 'What feature is broken? (e.g., "sign-in button", "query sync", "timer")',
      placeHolder: 'Enter feature name...'
    });

    if (!featureName) return;

    // Start a targeted debug session
    const sessionId = fsmTracer.startNewSession(`Triage: ${featureName}`);
    
    // Show logs immediately
    showFSMLogsNow();
    
    // Log the triage start
    fsmLogger.info(FSMComponent.MACHINE, `🔍 FEATURE TRIAGE STARTED: ${featureName}`, {
      component: FSMComponent.MACHINE,
      event: 'TRIAGE_START'
    }, {
      feature: featureName,
      sessionId: sessionId,
      timestamp: new Date().toISOString()
    });

    // Show instructions
    const panel = vscode.window.createWebviewPanel(
      'featureTriage',
      `🔍 Triaging: ${featureName}`,
      vscode.ViewColumn.Beside,
      { enableScripts: false }
    );

    panel.webview.html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: var(--vscode-font-family); 
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
          }
          .step {
            background: var(--vscode-textCodeBlock-background);
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
            border-left: 3px solid var(--vscode-charts-blue);
          }
          .highlight {
            background: var(--vscode-editor-selectionBackground);
            padding: 2px 4px;
            border-radius: 3px;
          }
        </style>
      </head>
      <body>
        <h1>🔍 Feature Triage: ${featureName}</h1>
        <p><strong>Debug session started:</strong> ${sessionId}</p>
        
        <h2>📋 Triage Steps</h2>
        
        <div class="step">
          <h3>1. Reproduce the Issue</h3>
          <p>Try to use the <span class="highlight">${featureName}</span> feature now.</p>
          <p>The FSM Output Channel is open and logging all activity.</p>
        </div>
        
        <div class="step">
          <h3>2. Watch for Errors</h3>
          <p>Look for <code>🔴</code> error messages in the FSM Output Channel.</p>
          <p>Also check the Developer Console (Help > Toggle Developer Tools).</p>
        </div>
        
        <div class="step">
          <h3>3. Capture the Trace</h3>
          <p>After reproducing the issue, run:</p>
          <p><code>Azure DevOps Int (Debug): Export FSM Trace</code></p>
        </div>
        
        <div class="step">
          <h3>4. Analyze Results</h3>
          <p>Run <code>Azure DevOps Int (Debug): Analyze FSM Trace</code> to see patterns.</p>
          <p>Check the timeline with <code>Show FSM Trace Timeline</code>.</p>
        </div>
        
        <h2>🎯 What to Look For</h2>
        <ul>
          <li><strong>Missing Events:</strong> Expected FSM events that don't appear</li>
          <li><strong>Error Messages:</strong> Red error logs with stack traces</li>
          <li><strong>State Transitions:</strong> FSM getting stuck in wrong states</li>
          <li><strong>Message Flow:</strong> Webview ↔ Extension communication issues</li>
        </ul>
        
        <p><strong>Pro tip:</strong> This triage session is being traced. Export it when done!</p>
      </body>
      </html>
    `;

    vscode.window.showInformationMessage(
      `🔍 Triage started for "${featureName}". Try to reproduce the issue now - everything is being logged!`,
      'OK'
    );

  } catch (error) {
    vscode.window.showErrorMessage(`Failed to start feature triage: ${error}`);
  }
}