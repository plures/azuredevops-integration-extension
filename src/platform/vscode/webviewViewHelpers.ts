/**
 * VS Code Webview View Helper Functions
 *
 * Helper functions for wrapping VS Code webview view APIs to match PlatformAdapter interface
 */

import * as vscode from 'vscode';
import type {
  WebviewViewProvider,
  WebviewView,
  WebviewViewResolveContext,
  WebviewOptions,
  CancellationToken,
} from '../PlatformAdapter.js';

/**
 * Wrap a VS Code webview view to match PlatformAdapter interface
 */
export function wrapWebviewView(webviewView: vscode.WebviewView): WebviewView {
  return {
    get webview() {
      return {
        get html() {
          return webviewView.webview.html;
        },
        set html(value: string) {
          webviewView.webview.html = value;
        },
        get options() {
          return {
            enableScripts: webviewView.webview.options.enableScripts,
            enableCommandUris: webviewView.webview.options.enableCommandUris,
            enableFindWidget: webviewView.webview.options.enableFindWidget,
            retainContextWhenHidden: webviewView.webview.options.retainContextWhenHidden,
            localResourceRoots: webviewView.webview.options.localResourceRoots,
          };
        },
        set options(value: WebviewOptions) {
          webviewView.webview.options = value as vscode.WebviewOptions;
        },
        get cspSource() {
          return webviewView.webview.cspSource;
        },
        postMessage: (message: any) => webviewView.webview.postMessage(message),
        get onDidReceiveMessage() {
          return webviewView.webview.onDidReceiveMessage;
        },
        asWebviewUri: (localResource: any) => webviewView.webview.asWebviewUri(localResource),
      };
    },
    get onDidChangeVisibility() {
      return webviewView.onDidChangeVisibility;
    },
    get visible() {
      return webviewView.visible;
    },
    get badge() {
      return webviewView.badge;
    },
    set badge(value: string | number | undefined) {
      webviewView.badge = value;
    },
    get title() {
      return webviewView.title;
    },
    set title(value: string | undefined) {
      webviewView.title = value;
    },
    get description() {
      return webviewView.description;
    },
    set description(value: string | undefined) {
      webviewView.description = value;
    },
    show: (preserveFocus?: boolean) => {
      webviewView.show(preserveFocus);
    },
  };
}

/**
 * Create a VS Code webview view provider wrapper
 */
export function createWebviewViewProviderWrapper(
  provider: WebviewViewProvider
): vscode.WebviewViewProvider {
  return {
    resolveWebviewView: (webviewView, _context, token) => {
      const wrappedView = wrapWebviewView(webviewView);

      const wrappedContext: WebviewViewResolveContext = {
        get webview() {
          return wrappedView.webview;
        },
        get view() {
          return wrappedView;
        },
      };

      const result = provider.resolveWebviewView(wrappedView, wrappedContext, token);
      if (result instanceof Promise) {
        return result;
      }
    },
  };
}
