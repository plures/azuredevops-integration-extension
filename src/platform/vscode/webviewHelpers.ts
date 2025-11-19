/**
 * VS Code Webview Helper Functions
 *
 * Helper functions for wrapping VS Code webview APIs to match PlatformAdapter interface
 */

import * as vscode from 'vscode';
import type { WebviewPanel, WebviewOptions, ViewColumn } from '../PlatformAdapter.js';

/**
 * Wrap a VS Code webview panel to match PlatformAdapter interface
 */
export function wrapWebviewPanel(panel: vscode.WebviewPanel): WebviewPanel {
  return {
    get webview() {
      return {
        get html() {
          return panel.webview.html;
        },
        set html(value: string) {
          panel.webview.html = value;
        },
        get options() {
          return {
            enableScripts: panel.webview.options.enableScripts,
            enableCommandUris: panel.webview.options.enableCommandUris,
            enableFindWidget: panel.webview.options.enableFindWidget,
            retainContextWhenHidden: panel.webview.options.retainContextWhenHidden,
            localResourceRoots: panel.webview.options.localResourceRoots,
          };
        },
        set options(value: WebviewOptions) {
          panel.webview.options = value as vscode.WebviewOptions;
        },
        get cspSource() {
          return panel.webview.cspSource;
        },
        postMessage: (message: any) => panel.webview.postMessage(message),
        get onDidReceiveMessage() {
          return panel.webview.onDidReceiveMessage;
        },
        asWebviewUri: (localResource: any) => panel.webview.asWebviewUri(localResource),
      };
    },
    get viewColumn() {
      return panel.viewColumn as ViewColumn | undefined;
    },
    get visible() {
      return panel.visible;
    },
    get active() {
      return panel.active;
    },
    get onDidDispose() {
      return panel.onDidDispose;
    },
    get onDidChangeViewState() {
      return panel.onDidChangeViewState as any;
    },
    get title() {
      return panel.title;
    },
    set title(value: string) {
      panel.title = value;
    },
    get iconPath() {
      return panel.iconPath as any;
    },
    set iconPath(value: any) {
      panel.iconPath = value;
    },
    reveal: (viewColumn?: ViewColumn, preserveFocus?: boolean) => {
      panel.reveal(viewColumn as number, preserveFocus);
    },
    dispose: () => {
      panel.dispose();
    },
  } as WebviewPanel;
}
