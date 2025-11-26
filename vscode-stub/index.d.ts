export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export enum ProgressLocation {
  SourceControl = 1,
  Window = 10,
  Notification = 15,
}

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

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

export class ExtensionContext {
  subscriptions: { dispose(): any }[];
  workspaceState: Memento;
  globalState: Memento & { setKeysForSync(keys: string[]): void };
  secrets: SecretStorage;
  extensionUri: Uri;
  extensionPath: string;
  environmentVariableCollection: any;
  storageUri: Uri | undefined;
  globalStorageUri: Uri;
  logUri: Uri;
  extensionMode: number;
  extension: any;
  asAbsolutePath(relativePath: string): string;
  constructor();
}

export interface Memento {
  keys(): readonly string[];
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: any): Thenable<void>;
}

export interface SecretStorage {
  get(key: string): Thenable<string | undefined>;
  store(key: string, value: string): Thenable<void>;
  delete(key: string): Thenable<void>;
  onDidChange: Event<SecretStorageChangeEvent>;
}

export interface SecretStorageChangeEvent {
  key: string;
}

export interface Event<T> {
  (listener: (e: T) => any, thisArgs?: any, disposables?: any[]): any;
}

export interface WorkspaceConfiguration {
  get<T>(section: string): T | undefined;
  get<T>(section: string, defaultValue: T): T;
  has(section: string): boolean;
  inspect<T>(section: string):
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
    section: string,
    value: any,
    configurationTarget?: ConfigurationTarget | boolean,
    overrideInLanguage?: boolean
  ): Thenable<void>;
}

export interface QuickPickItem {
  label: string;
  description?: string;
  detail?: string;
  picked?: boolean;
  alwaysShow?: boolean;
  buttons?: any[];
}

export interface QuickPickOptions {
  title?: string;
  matchOnDescription?: boolean;
  matchOnDetail?: boolean;
  placeHolder?: string;
  ignoreFocusOut?: boolean;
  canPickMany?: boolean;
  onDidSelectItem?: (item: QuickPickItem | string) => any;
}

export interface InputBoxOptions {
  title?: string;
  value?: string;
  valueSelection?: [number, number];
  prompt?: string;
  placeHolder?: string;
  password?: boolean;
  ignoreFocusOut?: boolean;
  validateInput?: (
    value: string
  ) => string | undefined | null | Thenable<string | undefined | null>;
}

export interface CancellationToken {
  isCancellationRequested: boolean;
  onCancellationRequested: Event<any>;
}

export interface WebviewOptions {
  enableScripts?: boolean;
  enableForms?: boolean;
  enableCommandUris?: boolean;
  localResourceRoots?: Uri[];
  portMapping?: { webviewPort: number; extensionHostPort: number }[];
}

export interface Webview {
  options: WebviewOptions;
  html: string;
  onDidReceiveMessage: Event<any>;
  postMessage(message: any): Thenable<boolean>;
  asWebviewUri(localResource: Uri): Uri;
  cspSource: string;
}

export interface WebviewPanel {
  viewType: string;
  title: string;
  iconPath?: Uri | { light: Uri; dark: Uri };
  webview: Webview;
  options: any;
  viewColumn?: ViewColumn;
  active: boolean;
  visible: boolean;
  onDidDispose: Event<void>;
  onDidChangeViewState: Event<any>;
  reveal(viewColumn?: ViewColumn, preserveFocus?: boolean): void;
  dispose(): void;
}

export interface WebviewView {
  webview: Webview;
  visible: boolean;
  onDidDispose: Event<void>;
  show(preserveFocus?: boolean): void;
}

export interface WebviewViewResolveContext {
  state?: any;
}

export interface WebviewViewProvider {
  resolveWebviewView(
    webviewView: WebviewView,
    context: WebviewViewResolveContext,
    token: CancellationToken
  ): Thenable<void> | void;
}

export interface StatusBarItem {
  alignment: StatusBarAlignment;
  priority?: number;
  text: string;
  tooltip: string | undefined;
  color: string | ThemeColor | undefined;
  backgroundColor: ThemeColor | undefined;
  command: string | any | undefined;
  show(): void;
  hide(): void;
  dispose(): void;
}

export class ThemeColor {
  constructor(id: string);
}

export class Disposable {
  constructor(callOnDispose: Function);
  dispose(): any;
  static from(...disposableLikes: { dispose: () => any }[]): Disposable;
}

export interface AuthenticationProviderOptions {
  supportsMultipleAccounts?: boolean;
}

export interface FileSystem {
  stat(uri: Uri): Thenable<any>;
  readDirectory(uri: Uri): Thenable<[string, any][]>;
  createDirectory(uri: Uri): Thenable<void>;
  readFile(uri: Uri): Thenable<Uint8Array>;
  writeFile(uri: Uri, content: Uint8Array): Thenable<void>;
  delete(uri: Uri, options?: { recursive?: boolean; useTrash?: boolean }): Thenable<void>;
  rename(source: Uri, target: Uri, options?: { overwrite?: boolean }): Thenable<void>;
  copy(source: Uri, target: Uri, options?: { overwrite?: boolean }): Thenable<void>;
}

export namespace commands {
  export function registerCommand(
    command: string,
    callback: (...args: any[]) => any,
    thisArg?: any
  ): Disposable;
  export function executeCommand<T = unknown>(command: string, ...rest: any[]): Thenable<T>;
  export function getCommands(filterInternal?: boolean): Thenable<string[]>;
}

export namespace env {
  export const clipboard: {
    readText(): Thenable<string>;
    writeText(value: string): Thenable<void>;
  };
  export function openExternal(target: Uri): Thenable<boolean>;
  export const logUri: Uri;
}

export namespace window {
  export function showInformationMessage<T extends string>(
    message: string,
    ...items: T[]
  ): Thenable<T | undefined>;
  export function showInformationMessage(
    message: string,
    options: any,
    ...items: any[]
  ): Thenable<any | undefined>;
  export function showWarningMessage<T extends string>(
    message: string,
    ...items: T[]
  ): Thenable<T | undefined>;
  export function showWarningMessage(
    message: string,
    options: any,
    ...items: any[]
  ): Thenable<any | undefined>;
  export function showErrorMessage<T extends string>(
    message: string,
    ...items: T[]
  ): Thenable<T | undefined>;
  export function showErrorMessage(
    message: string,
    options: any,
    ...items: any[]
  ): Thenable<any | undefined>;
  export function showQuickPick(
    items: string[] | Thenable<string[]>,
    options?: QuickPickOptions,
    token?: any
  ): Thenable<string | undefined>;
  export function showQuickPick<T extends QuickPickItem>(
    items: T[] | Thenable<T[]>,
    options?: QuickPickOptions,
    token?: any
  ): Thenable<T | undefined>;
  export function showInputBox(
    options?: InputBoxOptions,
    token?: any
  ): Thenable<string | undefined>;
  export function createStatusBarItem(
    alignment?: StatusBarAlignment,
    priority?: number
  ): StatusBarItem;
  export function createOutputChannel(name: string): OutputChannel;
  export function registerWebviewViewProvider(
    viewId: string,
    provider: WebviewViewProvider,
    options?: { webviewOptions?: { retainContextWhenHidden?: boolean } }
  ): Disposable;
  export function showTextDocument(
    document: any,
    column?: any,
    preserveFocus?: boolean
  ): Thenable<any>;
  export function createWebviewPanel(
    viewType: string,
    title: string,
    showOptions: ViewColumn | { viewColumn: ViewColumn; preserveFocus?: boolean },
    options?: WebviewOptions
  ): WebviewPanel;
  export function showSaveDialog(options?: {
    defaultUri?: Uri;
    saveLabel?: string;
    filters?: { [name: string]: string[] };
    title?: string;
  }): Thenable<Uri | undefined>;
  export function showOpenDialog(options?: {
    canSelectFiles?: boolean;
    canSelectFolders?: boolean;
    canSelectMany?: boolean;
    defaultUri?: Uri;
    openLabel?: string;
    filters?: { [name: string]: string[] };
    title?: string;
  }): Thenable<Uri[] | undefined>;
  export const state: { focused: boolean };
}

export interface OutputChannel {
  name: string;
  append(value: string): void;
  appendLine(value: string): void;
  clear(): void;
  show(preserveFocus?: boolean): void;
  show(column?: ViewColumn, preserveFocus?: boolean): void;
  hide(): void;
  dispose(): void;
  replace(value: string): void;
}

export interface Extension<T> {
  id: string;
  extensionUri: Uri;
  extensionPath: string;
  isActive: boolean;
  packageJSON: any;
  exports: T;
  activate(): Thenable<T>;
}

export namespace extensions {
  export function getExtension<T = any>(extensionId: string): Extension<T> | undefined;
  export const all: readonly Extension<any>[];
  export const onDidChange: Event<void>;
}

export interface WorkspaceFolder {
  uri: Uri;
  name: string;
  index: number;
}

export namespace workspace {
  export function getConfiguration(section?: string, scope?: any): WorkspaceConfiguration;
  export const onDidChangeConfiguration: Event<any>;
  export function openTextDocument(
    options?: { language?: string; content?: string } | Uri | string
  ): Thenable<any>;
  export const fs: FileSystem;
  export const workspaceFolders: readonly WorkspaceFolder[] | undefined;
  export function getWorkspaceFolder(uri: Uri): WorkspaceFolder | undefined;
  export function asRelativePath(pathOrUri: string | Uri, includeWorkspaceFolder?: boolean): string;
  export const onDidSaveTextDocument: Event<any>;
}

export class Uri {
  static parse(value: string, strict?: boolean): Uri;
  static file(path: string): Uri;
  static joinPath(uri: Uri, ...pathSegments: string[]): Uri;
  scheme: string;
  authority: string;
  path: string;
  query: string;
  fragment: string;
  fsPath: string;
  with(change: {
    scheme?: string;
    authority?: string;
    path?: string;
    query?: string;
    fragment?: string;
  }): Uri;
  toString(skipEncoding?: boolean): string;
}

export const version: string;

declare global {
  interface Thenable<T> {
    then<TResult>(
      onfulfilled?: (value: T) => TResult | Thenable<TResult>,
      onrejected?: (reason: any) => TResult | Thenable<TResult>
    ): Thenable<TResult>;
    then<TResult>(
      onfulfilled?: (value: T) => TResult | Thenable<TResult>,
      onrejected?: (reason: any) => void
    ): Thenable<TResult>;
  }
}
