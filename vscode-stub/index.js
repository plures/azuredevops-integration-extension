import path from 'node:path';
import { promises as fs } from 'node:fs';

const noop = () => {};
const asyncNoop = async () => undefined;

class Disposable {
  constructor(dispose = noop) {
    this.dispose = dispose;
  }
}

const createEmitter = () => {
  const listeners = new Set();
  const event = (listener) => {
    listeners.add(listener);
    return new Disposable(() => listeners.delete(listener));
  };
  const fire = (value) => {
    for (const listener of Array.from(listeners)) {
      try {
        listener(value);
      } catch {
        // ignore listener errors in stub
      }
    }
  };
  return { event, fire, dispose: () => listeners.clear() };
};

const toFileUri = (fsPath) => {
  const normalized = fsPath.replace(/\\/g, '/');
  const prefix = normalized.startsWith('/') ? 'file://' : 'file:///';
  return `${prefix}${normalized}`;
};

const resolveFsPath = (target) => {
  if (!target) return '';
  if (typeof target === 'string') return target;
  if (typeof target.fsPath === 'string') return target.fsPath;
  if (typeof target.path === 'string') return target.path;
  return '';
};

const createUri = (fsPath) => ({
  fsPath,
  path: fsPath,
  scheme: 'file',
  toJSON: () => ({ fsPath }),
  toString: () => toFileUri(fsPath),
  with: (changes = {}) => (
    createUri(changes.fsPath ?? fsPath)
  ),
});

const onDidSaveEmitter = createEmitter();
const onDidChangeConfigEmitter = createEmitter();
const onDidChangeWorkspaceFoldersEmitter = createEmitter();

const commandRegistry = new Map();

export const commands = {
  registerCommand: (id, handler) => {
    commandRegistry.set(id, handler);
    return new Disposable(() => commandRegistry.delete(id));
  },
  executeCommand: async (id, ...args) => {
    const handler = commandRegistry.get(id);
    if (!handler) return undefined;
    return await handler(...args);
  },
  get commands() {
    return Array.from(commandRegistry.keys());
  },
};

const statusBarItem = () => ({
  alignment: 0,
  priority: 0,
  text: '',
  tooltip: undefined,
  command: undefined,
  show: noop,
  hide: noop,
  dispose: noop,
});

const outputChannel = (name) => ({
  name,
  append: noop,
  appendLine: noop,
  clear: noop,
  dispose: noop,
  hide: noop,
  show: noop,
});

const webviewViewProviderDisposable = new Disposable();

export const window = {
  showInformationMessage: asyncNoop,
  showErrorMessage: asyncNoop,
  showWarningMessage: asyncNoop,
  showQuickPick: async () => undefined,
  showInputBox: async () => undefined,
  createStatusBarItem: statusBarItem,
  createOutputChannel: outputChannel,
  registerWebviewViewProvider: () => webviewViewProviderDisposable,
  withProgress: async (_options, task) => task({ report: noop }),
  createWebviewPanel: () => ({
    webview: {
      html: '',
      cspSource: 'vscode-resource:',
      postMessage: asyncNoop,
      onDidReceiveMessage: () => new Disposable(),
    },
    reveal: noop,
    dispose: noop,
  }),
};

const configuration = {
  get: (_key, fallback) => fallback,
  update: asyncNoop,
  has: () => false,
  inspect: () => undefined,
};

export const workspace = {
  getConfiguration: () => configuration,
  onDidSaveTextDocument: onDidSaveEmitter.event,
  onDidChangeConfiguration: onDidChangeConfigEmitter.event,
  onDidChangeWorkspaceFolders: onDidChangeWorkspaceFoldersEmitter.event,
  workspaceFolders: [],
  fs: {
    readFile: async (uri) => {
      const filePath = resolveFsPath(uri);
      const contents = await fs.readFile(filePath);
      return new Uint8Array(contents);
    },
    writeFile: async (uri, content) => {
      const filePath = resolveFsPath(uri);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      const buffer = Buffer.isBuffer(content)
        ? content
        : content instanceof Uint8Array
          ? Buffer.from(content)
          : Buffer.from(content ?? []);
      await fs.writeFile(filePath, buffer);
    },
    createDirectory: async (uri) => {
      const dirPath = resolveFsPath(uri);
      await fs.mkdir(dirPath, { recursive: true });
    },
    delete: async (uri, options = {}) => {
      const filePath = resolveFsPath(uri);
      await fs.rm(filePath, { recursive: !!options.recursive, force: !!options.force });
    },
    stat: async (uri) => {
      const filePath = resolveFsPath(uri);
      const stats = await fs.stat(filePath);
      return {
        type: stats.isDirectory() ? 2 : 1,
        ctime: stats.ctimeMs,
        mtime: stats.mtimeMs,
        size: stats.size,
      };
    },
  },
  triggerDidSaveTextDocument: (document) => onDidSaveEmitter.fire(document),
  updateWorkspaceFolders: asyncNoop,
  openTextDocument: async (uriOrPath) => ({
    uri: typeof uriOrPath === 'string' ? createUri(uriOrPath) : uriOrPath,
    getText: () => '',
  }),
};

export const env = {
  openExternal: async () => true,
  clipboard: {
    writeText: asyncNoop,
    readText: async () => '',
  },
};

export const languages = {
  registerHoverProvider: () => new Disposable(),
};

export const Uri = {
  file: (fsPath) => createUri(fsPath),
  joinPath: (...segments) => createUri(path.join(...segments.map((segment) => (typeof segment === 'string' ? segment : segment.fsPath ?? '')))),
  parse: (value) => {
    if (value.startsWith('file://')) {
      const withoutScheme = value.replace(/^file:\/\//, '');
      return createUri(withoutScheme);
    }
    return createUri(value);
  },
};

export const EventEmitter = class {
  constructor() {
    this._emitter = createEmitter();
  }
  event(listener) {
    return this._emitter.event(listener);
  }
  fire(value) {
    this._emitter.fire(value);
  }
  dispose() {
    this._emitter.dispose();
  }
};

export const SecretStorage = class {
  constructor() {
    this._store = new Map();
  }
  async get(key) {
    return this._store.get(key);
  }
  async store(key, value) {
    this._store.set(key, value);
  }
  async delete(key) {
    this._store.delete(key);
  }
};

export const ThemeColor = class {
  constructor(id) {
    this.id = id;
  }
};

export const StatusBarAlignment = {
  Left: 1,
  Right: 2,
};

export const ProgressLocation = {
  Notification: 15,
};

const vscode = {
  commands,
  window,
  workspace,
  env,
  languages,
  Uri,
  EventEmitter,
  Disposable,
  SecretStorage,
  ThemeColor,
  StatusBarAlignment,
  ProgressLocation,
  version: 'test',
};

export default vscode;

export const extensions = {
  getExtension: () => undefined,
  all: [],
};

export const authentication = {
  getSession: async () => undefined,
  onDidChangeSessions: () => new Disposable(),
};
