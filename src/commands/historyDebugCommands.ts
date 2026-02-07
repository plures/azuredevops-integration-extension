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
 * Register all history debug commands
 */
// eslint-disable-next-line max-lines-per-function
export function registerHistoryDebugCommands(context: vscode.ExtensionContext): void {
  // Export history for bug report
  const exportHistoryCommand = vscode.commands.registerCommand(
    'azureDevOpsInt.debug.history.export',
    async () => {
      try {
        const json = exportHistoryAsJSON();

        // Save to file
        const uri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file('history-export.json'),
          filters: {
            'JSON Files': ['json'],
          },
        });

        if (uri) {
          await vscode.workspace.fs.writeFile(uri, Buffer.from(json, 'utf-8'));
          vscode.window.showInformationMessage('History exported successfully');
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to export history: ${error}`);
      }
    }
  );

  // Import history from file
  const importHistoryCommand = vscode.commands.registerCommand(
    'azureDevOpsInt.debug.history.import',
    async () => {
      try {
        const uri = await vscode.window.showOpenDialog({
          filters: {
            'JSON Files': ['json'],
          },
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
  );

  // Copy history to clipboard
  const copyHistoryCommand = vscode.commands.registerCommand(
    'azureDevOpsInt.debug.history.copy',
    async () => {
      try {
        await copyHistoryToClipboard();
        vscode.window.showInformationMessage('History copied to clipboard');
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to copy history: ${error}`);
      }
    }
  );

  // Start recording test scenario
  const startRecordingCommand = vscode.commands.registerCommand(
    'azureDevOpsInt.debug.history.startRecording',
    async () => {
      try {
        const scenarioId = await vscode.window.showInputBox({
          prompt: 'Enter scenario ID',
          placeHolder: 'test-001',
        });

        if (!scenarioId) {
          return;
        }

        const scenarioName = await vscode.window.showInputBox({
          prompt: 'Enter scenario name',
          placeHolder: 'User workflow test',
        });

        if (!scenarioName) {
          return;
        }

        startRecording(scenarioId, scenarioName);
        vscode.window.showInformationMessage(`Started recording: ${scenarioName}`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to start recording: ${error}`);
      }
    }
  );

  // Stop recording and save scenario
  const stopRecordingCommand = vscode.commands.registerCommand(
    'azureDevOpsInt.debug.history.stopRecording',
    async () => {
      try {
        if (!isRecording()) {
          vscode.window.showWarningMessage('No active recording');
          return;
        }

        const scenario = stopRecording();

        // Save to file
        const uri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file(`${scenario.id}.json`),
          filters: {
            'JSON Files': ['json'],
          },
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
  );

  // Clear breakpoints
  const clearBreakpointsCommand = vscode.commands.registerCommand(
    'azureDevOpsInt.debug.history.clearBreakpoints',
    () => {
      const replayDebugger = getEventReplayDebugger();
      replayDebugger.clearBreakpoints();
      vscode.window.showInformationMessage('All breakpoints cleared');
    }
  );

  context.subscriptions.push(
    exportHistoryCommand,
    importHistoryCommand,
    copyHistoryCommand,
    startRecordingCommand,
    stopRecordingCommand,
    clearBreakpointsCommand
  );
}
