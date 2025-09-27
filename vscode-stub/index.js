import { Buffer } from 'node:buffer';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Minimal runtime stub of VS Code API for local unit tests. Expand as tests require.
const saveListeners = new Set();

const ensureUriFsPath = (uri, method) => {
  const fsPath = uri?.fsPath ?? uri?.path;
  if (!fsPath) {
    throw new Error(`workspace.fs.${method} requires a Uri with fsPath`);
  }
  return String(fsPath);
};

const ensureUint8Array = (data) => {
  if (data instanceof Uint8Array) return data;
  if (typeof data === 'string') return Buffer.from(data);
  if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer);
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return Buffer.from([]);
};

export const workspace = {
  // Allow tests to override behavior by reassigning this function
  getConfiguration: () => ({
    get: () => undefined,
    update: async () => undefined,
  }),
  fs: {
    writeFile: async (uri, data) => {
      const target = ensureUriFsPath(uri, 'writeFile');
      await fs.writeFile(target, ensureUint8Array(data));
    },
    readFile: async (uri) => {
      const target = ensureUriFsPath(uri, 'readFile');
      const result = await fs.readFile(target);
      return result instanceof Uint8Array ? result : new Uint8Array(result);
    },
    createDirectory: async (uri) => {
      const target = ensureUriFsPath(uri, 'createDirectory');
      await fs.mkdir(target, { recursive: true });
    },
  },
  workspaceFolders: [],
  onDidSaveTextDocument: (listener) => {
    saveListeners.add(listener);
    return {
      dispose: () => saveListeners.delete(listener),
    };
  },
  triggerDidSaveTextDocument: (event) => {
    for (const listener of Array.from(saveListeners)) {
      try {
        listener(event);
      } catch {
        /* ignore listener errors in tests */
      }
    }
  },
  getWorkspaceFolder: (uri) => {
    const targetPath = typeof uri === 'string' ? uri : (uri?.fsPath ?? uri?.path);
    if (!targetPath) return undefined;
    const normalizedTarget = normalizeFsPath(targetPath);
    return workspace.workspaceFolders?.find((folder) => {
      const folderPath = folder?.uri?.fsPath ?? folder?.uri?.path;
      if (!folderPath) return false;
      const normalizedFolder = normalizeFsPath(folderPath);
      return normalizedTarget.startsWith(normalizedFolder);
    });
  },
  asRelativePath: (uri, includeWorkspaceFolder) => {
    const targetPath = typeof uri === 'string' ? uri : (uri?.fsPath ?? uri?.path ?? '');
    const folder = workspace.getWorkspaceFolder(uri);
    if (folder?.uri?.fsPath) {
      const rel = path.relative(folder.uri.fsPath, targetPath) || path.basename(targetPath);
      if (!includeWorkspaceFolder) {
        return toPosixPath(rel);
      }
      const withFolder = path.join(path.basename(folder.uri.fsPath), rel);
      return toPosixPath(withFolder);
    }
    return toPosixPath(targetPath);
  },
};
export const window = {
  createOutputChannel: () => ({
    appendLine: () => {},
  }),
  registerWebviewViewProvider: () => {},
  showInformationMessage: () => {},
  showWarningMessage: () => {},
  showErrorMessage: () => {},
};
export const commands = {
  registerCommand: () => {},
  executeCommand: () => {},
};
export const extensions = {
  getExtension: () => undefined,
};

const toPosixPath = (value) => value.replace(/\\/g, '/');
const normalizeFsPath = (value) => toPosixPath(path.resolve(value));

const createFileUri = (inputPath) => {
  const absolute = path.resolve(inputPath);
  const fileUrl = pathToFileURL(absolute);
  const pathname = fileUrl.pathname;
  const uri = {
    scheme: 'file',
    fsPath: absolute,
    path: pathname,
    toString: () => fileUrl.toString(),
    with: (changes = {}) => {
      if (changes.fsPath || changes.path) {
        const next = changes.fsPath ?? changes.path ?? absolute;
        return createFileUri(next);
      }
      return uri;
    },
  };
  return uri;
};

const createExternalUri = (url) => {
  const parsed = new globalThis.URL(url);
  const uri = {
    scheme: parsed.protocol.replace(/:$/, ''),
    authority: parsed.host,
    path: toPosixPath(parsed.pathname || ''),
    query: parsed.search ? parsed.search.slice(1) : '',
    fragment: parsed.hash ? parsed.hash.slice(1) : '',
    toString: () => parsed.toString(),
    with: () => uri,
  };
  if (parsed.protocol === 'file:') {
    const fsPath = fileURLToPath(parsed);
    return createFileUri(fsPath);
  }
  return uri;
};

// Lightweight Uri helper sufficient for unit tests that call Uri.joinPath or Uri.file
export const Uri = {
  file: (fsPath) => createFileUri(fsPath),
  joinPath: (base, ...segs) => {
    const basePath = base?.fsPath ?? base?.path ?? '';
    const joined = path.join(basePath, ...segs);
    return createFileUri(joined);
  },
  parse: (value) => createExternalUri(value),
};
export class SecretStorage {}

const api = { workspace, window, commands, extensions, Uri, SecretStorage };

export default api;
