/**
 * VS Code Platform Adapter
 *
 * This adapter wraps VS Code APIs to implement the PlatformAdapter interface.
 * It allows the extension to work with VS Code while maintaining compatibility
 * with the platform abstraction layer.
 */

import * as vscode from 'vscode';
import type {
  PlatformAdapter,
  ExtensionContext,
  Disposable,
  Memento,
  WebviewPanel,
  ViewColumn,
  WebviewOptions,
  OutputChannel,
  StatusBarItem,
  StatusBarAlignment,
  WorkspaceFolder,
  Thenable,
  Configuration,
  ConfigurationChangeEvent,
  WorkspaceFoldersChangeEvent,
  WebviewViewProvider,
} from '../PlatformAdapter.js';
import { wrapWebviewPanel } from './webviewHelpers.js';
import { wrapStatusBarItem } from './statusBarHelpers.js';
import { createWebviewViewProviderWrapper } from './webviewViewHelpers.js';

/**
 * VS Code Adapter Implementation
 *
 * Wraps VS Code APIs to provide platform-agnostic interface
 */
export class VSCodeAdapter implements PlatformAdapter {
  constructor(private vscodeContext: vscode.ExtensionContext) {}

  async activate(_context: ExtensionContext): Promise<void> {
    // VS Code activation is handled by the extension host
    // This method can be used for platform-specific initialization
  }

  async deactivate(): Promise<void> {
    // VS Code deactivation is handled by the extension host
    // This method can be used for platform-specific cleanup
  }

  registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable {
    const disposable = vscode.commands.registerCommand(command, callback, thisArg);
    this.vscodeContext.subscriptions.push(disposable);
    return {
      dispose: () => {
        disposable.dispose();
      },
    };
  }

  createWebviewPanel(
    viewType: string,
    title: string,
    showOptions: ViewColumn | { viewColumn: ViewColumn; preserveFocus?: boolean },
    options?: WebviewOptions
  ): WebviewPanel {
    const vscodeShowOptions =
      typeof showOptions === 'number'
        ? (showOptions as number)
        : {
            viewColumn: showOptions.viewColumn as number,
            preserveFocus: showOptions.preserveFocus,
          };

    const vscodeOptions: vscode.WebviewOptions = {
      enableScripts: options?.enableScripts,
      enableCommandUris: options?.enableCommandUris,
      enableFindWidget: options?.enableFindWidget,
      retainContextWhenHidden: options?.retainContextWhenHidden,
      localResourceRoots: options?.localResourceRoots as vscode.Uri[] | undefined,
    };

    const panel = vscode.window.createWebviewPanel(
      viewType,
      title,
      vscodeShowOptions,
      vscodeOptions
    );

    return wrapWebviewPanel(panel);
  }

  registerWebviewViewProvider(
    viewType: string,
    provider: WebviewViewProvider,
    options?: { webviewOptions?: WebviewOptions }
  ): Disposable {
    const vscodeProvider = createWebviewViewProviderWrapper(provider);

    const disposable = vscode.window.registerWebviewViewProvider(viewType, vscodeProvider, options);
    this.vscodeContext.subscriptions.push(disposable);
    return {
      dispose: () => {
        disposable.dispose();
      },
    };
  }

  createOutputChannel(name: string): OutputChannel {
    const channel = vscode.window.createOutputChannel(name);
    return {
      get name() {
        return channel.name;
      },
      append: (value: string) => channel.append(value),
      appendLine: (value: string) => channel.appendLine(value),
      clear: () => channel.clear(),
      show: (columnOrPreserveFocus?: ViewColumn | boolean, preserveFocus?: boolean) => {
        if (typeof columnOrPreserveFocus === 'boolean') {
          channel.show(columnOrPreserveFocus);
        } else {
          channel.show(columnOrPreserveFocus as number, preserveFocus);
        }
      },
      hide: () => channel.hide(),
      dispose: () => channel.dispose(),
    };
  }

  createStatusBarItem(
    alignment?: StatusBarAlignment,
    priority?: number,
    id?: string
  ): StatusBarItem {
    const item = vscode.window.createStatusBarItem(
      alignment as vscode.StatusBarAlignment,
      priority,
      id
    );
    return wrapStatusBarItem(item);
  }

  showInformationMessage(message: string, ...items: string[]): Thenable<string | undefined> {
    return vscode.window.showInformationMessage(message, ...items);
  }

  showErrorMessage(message: string, ...items: string[]): Thenable<string | undefined> {
    return vscode.window.showErrorMessage(message, ...items);
  }

  showWarningMessage(message: string, ...items: string[]): Thenable<string | undefined> {
    return vscode.window.showWarningMessage(message, ...items);
  }

  getWorkspaceState(_context: ExtensionContext): Memento {
    return this.vscodeContext.workspaceState as Memento;
  }

  getGlobalState(_context: ExtensionContext): Memento {
    return this.vscodeContext.globalState as Memento;
  }

  async getSecret(_context: ExtensionContext, key: string): Promise<string | undefined> {
    if (!this.vscodeContext.secrets) {
      throw new Error('Secrets API not available');
    }
    return await this.vscodeContext.secrets.get(key);
  }

  async setSecret(_context: ExtensionContext, key: string, value: string): Promise<void> {
    if (!this.vscodeContext.secrets) {
      throw new Error('Secrets API not available');
    }
    await this.vscodeContext.secrets.store(key, value);
  }

  async deleteSecret(_context: ExtensionContext, key: string): Promise<void> {
    if (!this.vscodeContext.secrets) {
      throw new Error('Secrets API not available');
    }
    await this.vscodeContext.secrets.delete(key);
  }

  workspaceFolders(): WorkspaceFolder[] | undefined {
    return vscode.workspace.workspaceFolders as WorkspaceFolder[] | undefined;
  }

  getConfiguration(section?: string): Configuration {
    const config = vscode.workspace.getConfiguration(section);
    return {
      get: <T>(key: string, defaultValue?: T): T | undefined => {
        return config.get<T>(key, defaultValue);
      },
      has: (key: string) => {
        return config.has(key);
      },
      inspect: <T>(key: string) => {
        return config.inspect<T>(key) as any;
      },
      update: (key: string, value: any, target?: any, overrideInLanguage?: boolean) => {
        return config.update(key, value, target, overrideInLanguage);
      },
    };
  }

  onDidChangeConfiguration(listener: (e: ConfigurationChangeEvent) => any): Disposable {
    const disposable = vscode.workspace.onDidChangeConfiguration((e) => {
      listener({
        affectsConfiguration: (section: string, scope?: any) => {
          return e.affectsConfiguration(section, scope);
        },
      });
    });
    this.vscodeContext.subscriptions.push(disposable);
    return {
      dispose: () => {
        disposable.dispose();
      },
    };
  }

  onDidChangeWorkspaceFolders(listener: (e: WorkspaceFoldersChangeEvent) => any): Disposable {
    const disposable = vscode.workspace.onDidChangeWorkspaceFolders((e) => {
      listener({
        get added() {
          return e.added as WorkspaceFolder[];
        },
        get removed() {
          return e.removed as WorkspaceFolder[];
        },
      });
    });
    this.vscodeContext.subscriptions.push(disposable);
    return {
      dispose: () => {
        disposable.dispose();
      },
    };
  }
}
