/**
 * FSM Trace Commands
 *
 * VS Code commands for interacting with the FSM tracing system:
 * - Show current trace status and statistics
 * - Export trace data for analysis
 * - Import trace data for replay
 * - Analyze trace sessions for performance insights
 * - Start/stop trace sessions
 */

import * as vscode from 'vscode';
import {
  fsmTracer,
  FSMTracer,
  analyzeCurrentTrace,
  exportCurrentTrace,
} from '../logging/FSMTracer.js';
import { fsmLogger, FSMComponent } from '../logging/FSMLogger.js';

export function registerTraceCommands(context: vscode.ExtensionContext): void {
  // Show FSM trace status
  context.subscriptions.push(
    vscode.commands.registerCommand('azureDevOpsInt.showFSMTraceStatus', async () => {
      await showTraceStatus();
    })
  );

  // Export current trace
  context.subscriptions.push(
    vscode.commands.registerCommand('azureDevOpsInt.exportFSMTrace', async () => {
      await exportTrace();
    })
  );

  // Import trace for analysis
  context.subscriptions.push(
    vscode.commands.registerCommand('azureDevOpsInt.importFSMTrace', async () => {
      await importTrace();
    })
  );

  // Analyze current trace
  context.subscriptions.push(
    vscode.commands.registerCommand('azureDevOpsInt.analyzeFSMTrace', async () => {
      await analyzeTrace();
    })
  );

  // Start new trace session
  context.subscriptions.push(
    vscode.commands.registerCommand('azureDevOpsInt.startFSMTraceSession', async () => {
      await startTraceSession();
    })
  );

  // Stop current trace session
  context.subscriptions.push(
    vscode.commands.registerCommand('azureDevOpsInt.stopFSMTraceSession', async () => {
      await stopTraceSession();
    })
  );

  // Show trace timeline
  context.subscriptions.push(
    vscode.commands.registerCommand('azureDevOpsInt.showFSMTraceTimeline', async () => {
      await showTraceTimeline();
    })
  );

  fsmLogger.info(FSMComponent.MACHINE, 'FSM trace commands registered');
}

async function showTraceStatus(): Promise<void> {
  try {
    const stats = fsmTracer.getStats();
    const currentSession = fsmTracer.getCurrentSession();

    const statusItems = [
      `📊 **FSM Trace Status**`,
      ``,
      `**Current Session:**`,
      currentSession ? `- ID: \`${currentSession.id}\`` : `- No active session`,
      currentSession ? `- Description: ${currentSession.description}` : ``,
      currentSession ? `- Started: ${new Date(currentSession.startTime).toLocaleString()}` : ``,
      currentSession ? `- Events: ${currentSession.entries.length}` : ``,
      ``,
      `**Statistics:**`,
      `- Total Sessions: ${stats.sessionsCount}`,
      `- Total Events: ${stats.totalEntries}`,
      `- Instrumented Actors: ${stats.instrumentedActors}`,
      ``,
      `**Actions:**`,
      `- Export current trace for analysis`,
      `- Import trace file for replay`,
      `- Analyze performance patterns`,
      `- Start/stop trace sessions`,
    ];

    const panel = vscode.window.createWebviewPanel(
      'fsmTraceStatus',
      'FSM Trace Status',
      vscode.ViewColumn.One,
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
          code { 
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 3px;
          }
          pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 3px;
            overflow-x: auto;
          }
        </style>
      </head>
      <body>
        ${statusItems
          .map((item) => {
            if (item.startsWith('- ')) {
              return `<p style="margin-left: 20px;">${item}</p>`;
            } else if (item.startsWith('**') && item.endsWith('**')) {
              return `<h3>${item.slice(2, -2)}</h3>`;
            } else if (item.includes('`')) {
              return `<p>${item.replace(/`([^`]+)`/g, '<code>$1</code>')}</p>`;
            } else {
              return item ? `<p>${item}</p>` : '<br>';
            }
          })
          .join('')}
      </body>
      </html>
    `;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to show trace status: ${error}`);
    fsmLogger.error(FSMComponent.MACHINE, 'Failed to show trace status', undefined, { error });
  }
}

async function exportTrace(): Promise<void> {
  try {
    const traceData = exportCurrentTrace();
    if (!traceData) {
      vscode.window.showWarningMessage('No active trace session to export');
      return;
    }

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`fsm-trace-${Date.now()}.json`),
      filters: {
        'FSM Trace Files': ['json'],
        'All Files': ['*'],
      },
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(traceData, 'utf8'));
      vscode.window.showInformationMessage(`FSM trace exported to: ${uri.fsPath}`);

      // Offer to analyze the exported trace
      const analyze = await vscode.window.showInformationMessage(
        'Trace exported successfully. Would you like to analyze it now?',
        'Yes',
        'No'
      );
      if (analyze === 'Yes') {
        await analyzeTrace();
      }
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to export trace: ${error}`);
    fsmLogger.error(FSMComponent.MACHINE, 'Failed to export trace', undefined, { error });
  }
}

async function importTrace(): Promise<void> {
  try {
    const uris = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectMany: false,
      filters: {
        'FSM Trace Files': ['json'],
        'All Files': ['*'],
      },
    });

    if (uris && uris.length > 0) {
      const content = await vscode.workspace.fs.readFile(uris[0]);
      const traceData = Buffer.from(content).toString('utf8');

      const sessionId = fsmTracer.importSession(traceData);
      vscode.window.showInformationMessage(`FSM trace imported: ${sessionId}`);

      // Offer to analyze the imported trace
      const analyze = await vscode.window.showInformationMessage(
        'Trace imported successfully. Would you like to analyze it?',
        'Yes',
        'No'
      );
      if (analyze === 'Yes') {
        // Analyze the imported session
        const analysis = fsmTracer.analyzeSession(sessionId);
        await showAnalysisResults(analysis, sessionId);
      }
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to import trace: ${error}`);
    fsmLogger.error(FSMComponent.MACHINE, 'Failed to import trace', undefined, { error });
  }
}

async function analyzeTrace(): Promise<void> {
  try {
    const analysis = analyzeCurrentTrace();
    if (!analysis) {
      vscode.window.showWarningMessage('No active trace session to analyze');
      return;
    }

    const currentSession = fsmTracer.getCurrentSession();
    await showAnalysisResults(analysis, currentSession?.id || 'current');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to analyze trace: ${error}`);
    fsmLogger.error(FSMComponent.MACHINE, 'Failed to analyze trace', undefined, { error });
  }
}

async function showAnalysisResults(analysis: any, sessionId: string): Promise<void> {
  const panel = vscode.window.createWebviewPanel(
    'fsmTraceAnalysis',
    `FSM Trace Analysis - ${sessionId}`,
    vscode.ViewColumn.One,
    { enableScripts: false }
  );

  const durationMs = analysis.summary.duration;
  const durationFormatted =
    durationMs > 60000
      ? `${Math.round(durationMs / 60000)} minutes`
      : `${Math.round(durationMs / 1000)} seconds`;

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
        .metric { 
          background: var(--vscode-textCodeBlock-background);
          padding: 10px;
          margin: 10px 0;
          border-radius: 5px;
          display: inline-block;
          min-width: 200px;
        }
        .metric-value { 
          font-size: 1.5em; 
          font-weight: bold; 
          color: var(--vscode-charts-blue);
        }
        .section {
          margin: 20px 0;
          padding: 10px;
          border-left: 3px solid var(--vscode-charts-blue);
          background: var(--vscode-editor-lineHighlightBackground);
        }
        .event-freq, .transitions {
          background: var(--vscode-textCodeBlock-background);
          padding: 10px;
          border-radius: 3px;
          margin: 10px 0;
        }
        .slow-transition {
          color: var(--vscode-charts-red);
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <h1>🔍 FSM Trace Analysis</h1>
      <p><strong>Session:</strong> <code>${sessionId}</code></p>
      
      <div class="section">
        <h2>📊 Summary</h2>
        <div class="metric">
          <div>Duration</div>
          <div class="metric-value">${durationFormatted}</div>
        </div>
        <div class="metric">
          <div>Total Events</div>
          <div class="metric-value">${analysis.summary.totalEvents}</div>
        </div>
        <div class="metric">
          <div>Unique States</div>
          <div class="metric-value">${analysis.summary.uniqueStates}</div>
        </div>
        <div class="metric">
          <div>Errors</div>
          <div class="metric-value" style="color: ${analysis.summary.errors > 0 ? 'var(--vscode-charts-red)' : 'var(--vscode-charts-green)'}">
            ${analysis.summary.errors}
          </div>
        </div>
      </div>

      <div class="section">
        <h2>📈 Event Frequency</h2>
        <div class="event-freq">
          ${Object.entries(analysis.eventFrequency)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([event, count]) => `<div>${event}: <strong>${count}</strong></div>`)
            .join('')}
        </div>
      </div>

      <div class="section">
        <h2>🔄 State Transitions</h2>
        <div class="transitions">
          ${Object.entries(analysis.stateTransitions)
            .map(
              ([from, toStates]) =>
                `<div><strong>${from}</strong> → ${(toStates as string[]).join(', ')}</div>`
            )
            .join('')}
        </div>
      </div>

      <div class="section">
        <h2>⚡ Performance</h2>
        <div class="metric">
          <div>Avg Transition Time</div>
          <div class="metric-value">${Math.round(analysis.performance.avgTransitionTime)}ms</div>
        </div>
        
        <h3>🐌 Slowest Transitions</h3>
        <div class="transitions">
          ${analysis.performance.slowestTransitions
            .slice(0, 5)
            .map(
              (t: any) =>
                `<div class="slow-transition">${t.from} → ${t.to} (${t.event}): ${t.duration}ms</div>`
            )
            .join('')}
        </div>
      </div>

      <div class="section">
        <h2>💡 Insights</h2>
        <ul>
          ${analysis.summary.errors > 0 ? `<li>⚠️ Found ${analysis.summary.errors} errors - investigate error patterns</li>` : ''}
          ${analysis.performance.avgTransitionTime > 100 ? `<li>🐌 Average transition time is high (${Math.round(analysis.performance.avgTransitionTime)}ms) - check for performance bottlenecks</li>` : ''}
          ${analysis.summary.uniqueStates > 20 ? `<li>🔄 High number of unique states (${analysis.summary.uniqueStates}) - consider state machine simplification</li>` : ''}
          ${Object.keys(analysis.eventFrequency).length > 10 ? `<li>📢 Many event types (${Object.keys(analysis.eventFrequency).length}) - review event design</li>` : ''}
          <li>✅ Use this data to optimize FSM performance and reliability</li>
        </ul>
      </div>
    </body>
    </html>
  `;
}

async function startTraceSession(): Promise<void> {
  try {
    const description = await vscode.window.showInputBox({
      prompt: 'Enter a description for the new trace session',
      value: 'Manual trace session',
    });

    if (description !== undefined) {
      const sessionId = fsmTracer.startNewSession(description);
      vscode.window.showInformationMessage(`Started new FSM trace session: ${sessionId}`);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to start trace session: ${error}`);
    fsmLogger.error(FSMComponent.MACHINE, 'Failed to start trace session', undefined, { error });
  }
}

async function stopTraceSession(): Promise<void> {
  try {
    const currentSession = fsmTracer.getCurrentSession();
    if (!currentSession) {
      vscode.window.showWarningMessage('No active trace session to stop');
      return;
    }

    fsmTracer.stopCurrentSession();

    const action = await vscode.window.showInformationMessage(
      `Stopped trace session: ${currentSession.id}`,
      'Analyze',
      'Export',
      'Close'
    );

    if (action === 'Analyze') {
      await analyzeTrace();
    } else if (action === 'Export') {
      await exportTrace();
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to stop trace session: ${error}`);
    fsmLogger.error(FSMComponent.MACHINE, 'Failed to stop trace session', undefined, { error });
  }
}

async function showTraceTimeline(): Promise<void> {
  try {
    const currentSession = fsmTracer.getCurrentSession();
    if (!currentSession) {
      vscode.window.showWarningMessage('No active trace session');
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'fsmTraceTimeline',
      `FSM Trace Timeline - ${currentSession.id}`,
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    // Generate timeline HTML with the last 100 events
    const recentEntries = currentSession.entries.slice(-100);
    const timelineData = recentEntries.map((entry) => ({
      timestamp: new Date(entry.timestamp).toLocaleTimeString(),
      event: entry.eventType,
      fromState: entry.fromState,
      toState: entry.toState,
      component: entry.component,
      duration: entry.duration || 0,
      hasError: !!entry.error,
    }));

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
          }
          .timeline-item {
            padding: 10px;
            margin: 5px 0;
            border-left: 3px solid var(--vscode-charts-blue);
            background: var(--vscode-editor-lineHighlightBackground);
            border-radius: 3px;
          }
          .timeline-item.error {
            border-color: var(--vscode-charts-red);
            background: var(--vscode-inputValidation-errorBackground);
          }
          .timestamp {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
          }
          .event-type {
            font-weight: bold;
            color: var(--vscode-charts-blue);
          }
          .state-transition {
            font-family: monospace;
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 3px;
          }
        </style>
      </head>
      <body>
        <h1>⏱️ FSM Trace Timeline</h1>
        <p><strong>Session:</strong> <code>${currentSession.id}</code></p>
        <p><strong>Showing:</strong> Last ${recentEntries.length} events</p>
        <hr>
        
        ${timelineData
          .map(
            (item) => `
          <div class="timeline-item ${item.hasError ? 'error' : ''}">
            <div class="timestamp">${item.timestamp}</div>
            <div>
              <span class="event-type">${item.event}</span>
              <span style="margin-left: 10px; color: var(--vscode-descriptionForeground);">[${item.component}]</span>
            </div>
            <div class="state-transition">${item.fromState} → ${item.toState}</div>
          </div>
        `
          )
          .join('')}
      </body>
      </html>
    `;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to show trace timeline: ${error}`);
    fsmLogger.error(FSMComponent.MACHINE, 'Failed to show trace timeline', undefined, { error });
  }
}
