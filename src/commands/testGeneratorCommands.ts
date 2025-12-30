/**
 * Test Generator Commands
 * 
 * VS Code commands for generating tests from history.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { generateTestFromHistory, generateTestFromHistoryFile } from '../testing/testGenerator.js';
import { exportHistoryAsJSON } from '../debugging/historyExport.js';

/**
 * Register test generator commands
 */
export function registerTestGeneratorCommands(context: vscode.ExtensionContext): void {
  // Generate test from current history
  const generateFromHistoryCommand = vscode.commands.registerCommand(
    'azureDevOpsInt.debug.test.generateFromHistory',
    async () => {
      try {
        // Get test name
        const testName = await vscode.window.showInputBox({
          prompt: 'Enter test name',
          placeHolder: 'connection-authentication-test',
        });
        
        if (!testName) {
          return;
        }
        
        // Get framework
        const framework = await vscode.window.showQuickPick(
          ['vitest', 'jest', 'mocha'],
          {
            placeHolder: 'Select test framework',
          }
        );
        
        if (!framework) {
          return;
        }
        
        // Export current history
        const historyJson = exportHistoryAsJSON();
        
        // Generate test code
        const { generateTestFromHistory } = await import('../testing/testGenerator.js');
        const exported = JSON.parse(historyJson);
        const testCode = generateTestFromHistory(exported, {
          framework: framework as 'vitest' | 'jest' | 'mocha',
          testName,
          includeSnapshots: true,
          includeComments: true,
        });
        
        // Save to file
        const uri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file(`${testName}.test.ts`),
          filters: {
            'TypeScript Files': ['ts'],
          },
        });
        
        if (uri) {
          await fs.writeFile(uri.fsPath, testCode, 'utf-8');
          vscode.window.showInformationMessage(`Test generated: ${path.basename(uri.fsPath)}`);
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to generate test: ${error}`);
      }
    }
  );
  
  // Generate test from history file
  const generateFromFileCommand = vscode.commands.registerCommand(
    'azureDevOpsInt.debug.test.generateFromFile',
    async () => {
      try {
        // Select history file
        const uri = await vscode.window.showOpenDialog({
          filters: {
            'JSON Files': ['json'],
          },
          canSelectMany: false,
        });
        
        if (!uri || !uri[0]) {
          return;
        }
        
        // Get test name
        const testName = await vscode.window.showInputBox({
          prompt: 'Enter test name',
          placeHolder: 'generated-test',
        });
        
        if (!testName) {
          return;
        }
        
        // Get framework
        const framework = await vscode.window.showQuickPick(
          ['vitest', 'jest', 'mocha'],
          {
            placeHolder: 'Select test framework',
          }
        );
        
        if (!framework) {
          return;
        }
        
        // Generate test
        const outputUri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file(`${testName}.test.ts`),
          filters: {
            'TypeScript Files': ['ts'],
          },
        });
        
        if (outputUri) {
          await generateTestFromHistoryFile(
            uri[0].fsPath,
            outputUri.fsPath,
            {
              framework: framework as 'vitest' | 'jest' | 'mocha',
              testName,
              includeSnapshots: true,
              includeComments: true,
            }
          );
          
          vscode.window.showInformationMessage(`Test generated: ${path.basename(outputUri.fsPath)}`);
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to generate test: ${error}`);
      }
    }
  );
  
  context.subscriptions.push(generateFromHistoryCommand, generateFromFileCommand);
}

