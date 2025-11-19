/**
 * Platform Abstraction Layer
 *
 * This interface abstracts platform-specific APIs (VS Code vs Visual Studio)
 * to enable a single codebase that works on both platforms.
 *
 * All platform-specific operations should go through this interface rather
 * than directly calling vscode.* or Visual Studio APIs.
 */

/**
 * Platform-agnostic extension context
 */
export interface ExtensionContext {
  subscriptions: Disposable[];
  workspaceState: Memento;
  globalState: Memento;
  secrets?: SecretStorage;
  extensionUri?: Uri;
  extensionPath: string;
  storagePath?: string;
  globalStoragePath: string;
  logPath: string;
  extensionMode: ExtensionMode;
}

/**
 * Platform-agnostic disposable
 */
export interface Disposable {
  dispose(): void;
}

/**
 * Platform-agnostic memento (key-value storage)
 */
export interface Memento {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: any): Promise<void>;
  keys(): readonly string[];
}

/**
 * Platform-agnostic secret storage
 */
export interface SecretStorage {
  get(key: string): Promise<string | undefined>;
  store(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Platform-agnostic URI
 */
export interface Uri {
  scheme: string;
  authority: string;
  path: string;
  query: string;
  fragment: string;
  fsPath: string;
  toString(): string;
  with(change: {
    scheme?: string;
    authority?: string;
    path?: string;
    query?: string;
    fragment?: string;
  }): Uri;
}

/**
 * Extension mode (development, production, test)
 */
export enum ExtensionMode {
  Production = 1,
  Development = 2,
  Test = 3,
}

/**
 * View column for webview panels
 */
export enum ViewColumn {
  Active = -1,
  Beside = -2,
  One = 1,
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
}

/**
 * Webview panel interface
 */
export interface WebviewPanel {
  readonly webview: Webview;
  readonly viewColumn: ViewColumn | undefined;
  readonly visible: boolean;
  readonly active: boolean;
  readonly onDidDispose: Event<void>;
  readonly onDidChangeViewState: Event<WebviewPanelOnDidChangeViewStateEvent>;
  title: string;
  iconPath?: Uri | { light: Uri; dark: Uri };
  reveal(viewColumn?: ViewColumn, preserveFocus?: boolean): void;
  dispose(): void;
}

/**
 * Webview interface
 */
export interface Webview {
  readonly html: string;
  readonly options: WebviewOptions;
  readonly cspSource: string;
  html: string;
  options: WebviewOptions;
  postMessage(message: any): Thenable<boolean>;
  onDidReceiveMessage: Event<any>;
  asWebviewUri(localResource: Uri): Uri;
}

/**
 * Webview options
 */
export interface WebviewOptions {
  enableScripts?: boolean;
  enableCommandUris?: boolean;
  enableFindWidget?: boolean;
  retainContextWhenHidden?: boolean;
  localResourceRoots?: readonly Uri[];
}

/**
 * Webview panel state change event
 */
export interface WebviewPanelOnDidChangeViewStateEvent {
  readonly webviewPanel: WebviewPanel;
}

/**
 * Output channel interface
 */
export interface OutputChannel {
  readonly name: string;
  append(value: string): void;
  appendLine(value: string): void;
  clear(): void;
  show(preserveFocus?: boolean): void;
  show(column?: ViewColumn, preserveFocus?: boolean): void;
  hide(): void;
  dispose(): void;
}

/**
 * Workspace folder interface
 */
export interface WorkspaceFolder {
  readonly uri: Uri;
  readonly name: string;
  readonly index: number;
}

/**
 * Event interface
 */
export interface Event<T> {
  (listener: (e: T) => any, thisArg?: any): Disposable;
}

/**
 * Thenable interface (Promise-like)
 */
export interface Thenable<T> {
  then<TResult>(
    onfulfilled?: (value: T) => TResult | Thenable<TResult>,
    onrejected?: (reason: any) => TResult | Thenable<TResult>
  ): Thenable<TResult>;
  catch<TResult>(onrejected?: (reason: any) => TResult | Thenable<TResult>): Thenable<TResult>;
}

/**
 * Status bar item interface
 */
export interface StatusBarItem {
  readonly id: string;
  alignment: StatusBarAlignment;
  priority: number;
  text: string;
  tooltip: string | undefined;
  color: string | undefined;
  backgroundColor: string | undefined;
  command: string | undefined;
  accessibilityInformation: { label: string; role: string } | undefined;
  show(): void;
  hide(): void;
  dispose(): void;
}

/**
 * Status bar alignment
 */
export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

/**
 * Platform Adapter Interface
 *
 * This is the core abstraction that all platform-specific adapters must implement.
 * It provides a unified API for extension functionality across VS Code and Visual Studio.
 */
export interface PlatformAdapter {
  // Extension lifecycle
  activate(context: ExtensionContext): Promise<void>;
  deactivate(): Promise<void>;

  // Commands
  registerCommand(command: string, callback: (...args: any[]) => any, thisArg?: any): Disposable;

  // UI - Webviews
  createWebviewPanel(
    viewType: string,
    title: string,
    showOptions: ViewColumn | { viewColumn: ViewColumn; preserveFocus?: boolean },
    options?: WebviewOptions
  ): WebviewPanel;

  registerWebviewViewProvider(
    viewType: string,
    provider: WebviewViewProvider,
    options?: { webviewOptions?: WebviewOptions }
  ): Disposable;

  // UI - Output channels
  createOutputChannel(name: string): OutputChannel;

  // UI - Status bar
  createStatusBarItem(
    alignment?: StatusBarAlignment,
    priority?: number,
    id?: string
  ): StatusBarItem;

  // UI - Messages
  showInformationMessage(message: string, ...items: string[]): Thenable<string | undefined>;
  showErrorMessage(message: string, ...items: string[]): Thenable<string | undefined>;
  showWarningMessage(message: string, ...items: string[]): Thenable<string | undefined>;

  // Storage
  getWorkspaceState(context: ExtensionContext): Memento;
  getGlobalState(context: ExtensionContext): Memento;

  // Secrets
  getSecret(context: ExtensionContext, key: string): Promise<string | undefined>;
  setSecret(context: ExtensionContext, key: string, value: string): Promise<void>;
  deleteSecret(context: ExtensionContext, key: string): Promise<void>;

  // File system
  workspaceFolders(): WorkspaceFolder[] | undefined;

  // Configuration
  getConfiguration(section?: string): Configuration;
  onDidChangeConfiguration(listener: (e: ConfigurationChangeEvent) => any): Disposable;

  // Events
  onDidChangeWorkspaceFolders(listener: (e: WorkspaceFoldersChangeEvent) => any): Disposable;
}

/**
 * Webview view provider interface
 */
export interface WebviewViewProvider {
  resolveWebviewView(
    webviewView: WebviewView,
    context: WebviewViewResolveContext,
    token: CancellationToken
  ): void | Thenable<void>;
}

/**
 * Webview view interface
 */
export interface WebviewView {
  readonly webview: Webview;
  readonly onDidChangeVisibility: Event<void>;
  readonly visible: boolean;
  readonly badge?: string | number;
  readonly title: string | undefined;
  description?: string;
  badge: string | number | undefined;
  title: string | undefined;
  show(preserveFocus?: boolean): void;
}

/**
 * Webview view resolve context
 */
export interface WebviewViewResolveContext {
  readonly webview: Webview;
  readonly view: WebviewView;
}

/**
 * Cancellation token
 */
export interface CancellationToken {
  readonly isCancellationRequested: boolean;
  readonly onCancellationRequested: Event<any>;
}

/**
 * Configuration interface
 */
export interface Configuration {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  has(key: string): boolean;
  inspect<T>(key: string):
    | {
        key: string;
        defaultValue?: T;
        globalValue?: T;
        workspaceValue?: T;
        workspaceFolderValue?: T;
        defaultLanguageValue?: T;
        globalLanguageValue?: T;
        workspaceLanguageValue?: T;
        workspaceFolderLanguageValue?: T;
        languageIds?: string[];
      }
    | undefined;
  update(
    key: string,
    value: any,
    target?: ConfigurationTarget,
    overrideInLanguage?: boolean
  ): Thenable<void>;
}

/**
 * Configuration change event
 */
export interface ConfigurationChangeEvent {
  affectsConfiguration(section: string, scope?: ConfigurationScope): boolean;
}

/**
 * Configuration target
 */
export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

/**
 * Configuration scope
 */
export interface ConfigurationScope {
  uri?: Uri;
  languageId?: string;
}

/**
 * Workspace folders change event
 */
export interface WorkspaceFoldersChangeEvent {
  readonly added: readonly WorkspaceFolder[];
  readonly removed: readonly WorkspaceFolder[];
}
