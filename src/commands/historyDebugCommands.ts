/**
 * History Debug Commands
 *
 * VS Code commands for history debugging functionality.
 */

import * as vscode from 'vscode';
import {
  exportHistoryAsJSON,
  importHistoryFromJSON,
  copyHistoryToClipboard,
} from '../debugging/historyExport.js';
import { startRecording, stopRecording, isRecording } from '../testing/historyTestRecorder.js';
import { getEventReplayDebugger } from '../debugging/eventReplayDebugger.js';

/**
 * Export history to file
 */
async function handleExportHistory(): Promise<void> {
  try {
    const json = exportHistoryAsJSON();

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('history-export.json'),
      filters: { 'JSON Files': ['json'] },
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(json, 'utf-8'));
      vscode.window.showInformationMessage('History exported successfully');
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to export history: ${error}`);
  }
}

/**
 * Import history from file
 */
async function handleImportHistory(): Promise<void> {
  try {
    const uri = await vscode.window.showOpenDialog({
      filters: { 'JSON Files': ['json'] },
      canSelectMany: false,
    });

    if (uri && uri[0]) {
      const content = await vscode.workspace.fs.readFile(uri[0]);
      const json = content.toString();
      importHistoryFromJSON(json);
      vscode.window.showInformationMessage('History imported successfully');
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to import history: ${error}`);
  }
}

/**
 * Start recording test scenario
 */
async function handleStartRecording(): Promise<void> {
  try {
    const scenarioId = await vscode.window.showInputBox({
      prompt: 'Enter scenario ID',
      placeHolder: 'test-001',
    });

    if (!scenarioId) return;

    const scenarioName = await vscode.window.showInputBox({
      prompt: 'Enter scenario name',
      placeHolder: 'User workflow test',
    });

    if (!scenarioName) return;

    startRecording(scenarioId, scenarioName);
    vscode.window.showInformationMessage(`Started recording: ${scenarioName}`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to start recording: ${error}`);
  }
}

/**
 * Stop recording and save scenario
 */
async function handleStopRecording(): Promise<void> {
  try {
    if (!isRecording()) {
      vscode.window.showWarningMessage('No active recording');
      return;
    }

    const scenario = stopRecording();
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`${scenario.id}.json`),
      filters: { 'JSON Files': ['json'] },
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(
        uri,
        Buffer.from(JSON.stringify(scenario, null, 2), 'utf-8')
      );
      vscode.window.showInformationMessage(`Scenario saved: ${scenario.name}`);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to stop recording: ${error}`);
  }
}

/**
 * Register all history debug commands
 */
export function registerHistoryDebugCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('azureDevOpsInt.debug.history.export', handleExportHistory),
    vscode.commands.registerCommand('azureDevOpsInt.debug.history.import', handleImportHistory),
    vscode.commands.registerCommand('azureDevOpsInt.debug.history.copy', async () => {
      try {
        await copyHistoryToClipboard();
        vscode.window.showInformationMessage('History copied to clipboard');
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to copy history: ${error}`);
      }
    }),
    vscode.commands.registerCommand(
      'azureDevOpsInt.debug.history.startRecording',
      handleStartRecording
    ),
    vscode.commands.registerCommand(
      'azureDevOpsInt.debug.history.stopRecording',
      handleStopRecording
    ),
    vscode.commands.registerCommand('azureDevOpsInt.debug.history.clearBreakpoints', () => {
      const replayDebugger = getEventReplayDebugger();
      replayDebugger.clearBreakpoints();
      vscode.window.showInformationMessage('All breakpoints cleared');
    })
  );
}
