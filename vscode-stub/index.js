// Minimal runtime stub of VS Code API for local unit tests. Expand as tests require.
const api = {
  workspace: {
    getConfiguration: () => ({
      get: () => undefined,
      update: async () => undefined,
    }),
  },
  window: {
    createOutputChannel: () => ({
      appendLine: () => {},
    }),
    registerWebviewViewProvider: () => {},
  },
  commands: {
    registerCommand: () => {},
    executeCommand: () => {},
  },
  SecretStorage: class {},
};

export default api;
