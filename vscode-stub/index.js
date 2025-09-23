// Minimal runtime stub of VS Code API for local unit tests. Expand as tests require.
export const workspace = {
  // Allow tests to override behavior by reassigning this function
  getConfiguration: () => ({
    get: () => undefined,
    update: async () => undefined,
  }),
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
// Lightweight Uri helper sufficient for unit tests that call Uri.joinPath
export const Uri = {
  joinPath: (_base, ...segs) => {
    const pathStr = segs.join('/');
    return {
      path: pathStr,
      toString: () => pathStr,
    };
  },
};
export class SecretStorage {}

const api = { workspace, window, commands, Uri, SecretStorage };

export default api;
