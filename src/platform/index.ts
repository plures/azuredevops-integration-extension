/**
 * Platform Abstraction Layer - Public API
 *
 * This module exports the platform abstraction layer components.
 * Use these exports to access platform-agnostic functionality.
 */

export type {
  PlatformAdapter,
  ExtensionContext,
  Disposable,
  Memento,
  SecretStorage,
  Uri,
  WebviewPanel,
  ViewColumn,
  WebviewOptions,
  OutputChannel,
  StatusBarItem,
  StatusBarAlignment,
  WorkspaceFolder,
  Thenable,
  Event,
  Configuration,
  ConfigurationChangeEvent,
  ConfigurationTarget,
  ConfigurationScope,
  WorkspaceFoldersChangeEvent,
  WebviewViewProvider,
  WebviewView,
  WebviewViewResolveContext,
  CancellationToken,
} from './PlatformAdapter.js';

export {
  ExtensionMode,
  ViewColumn,
  StatusBarAlignment,
  ConfigurationTarget,
} from './PlatformAdapter.js';

export { VSCodeAdapter } from './vscode/VSCodeAdapter.js';
export { VisualStudioAdapter } from './visualstudio/VisualStudioAdapter.js';

export {
  detectPlatform,
  createPlatformAdapter,
  setPlatformAdapter,
  getPlatformAdapter,
  isPlatformAdapterInitialized,
  type Platform,
} from './detect.js';
