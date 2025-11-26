import { vi } from 'vitest';

vi.mock('vscode', () => {
  return {
    default: {
      workspace: {
        getConfiguration: () => ({
          get: () => undefined,
          update: () => Promise.resolve(),
        }),
        onDidChangeConfiguration: () => ({ dispose: () => {} }),
      },
      window: {
        showErrorMessage: () => Promise.resolve(),
        showInformationMessage: () => Promise.resolve(),
        createOutputChannel: () => ({
          append: () => {},
          appendLine: () => {},
          show: () => {},
          dispose: () => {},
        }),
      },
      commands: {
        registerCommand: () => ({ dispose: () => {} }),
        executeCommand: () => Promise.resolve(),
      },
      Uri: {
        file: (path: string) => ({ fsPath: path }),
        parse: (uri: string) => ({ toString: () => uri }),
      },
      ExtensionContext: class {},
    },
    workspace: {
      getConfiguration: () => ({
        get: () => undefined,
        update: () => Promise.resolve(),
      }),
      onDidChangeConfiguration: () => ({ dispose: () => {} }),
    },
    window: {
      showErrorMessage: () => Promise.resolve(),
      showInformationMessage: () => Promise.resolve(),
      createOutputChannel: () => ({
        append: () => {},
        appendLine: () => {},
        show: () => {},
        dispose: () => {},
      }),
    },
    commands: {
      registerCommand: () => ({ dispose: () => {} }),
      executeCommand: () => Promise.resolve(),
    },
    Uri: {
      file: (path: string) => ({ fsPath: path }),
      parse: (uri: string) => ({ toString: () => uri }),
    },
  };
});

import { expect } from 'chai';
import { migrateLegacyPAT } from '../src/activation.ts';
import { makeMockContext } from './helpers/mockContext.ts';

describe('activation migration helpers', () => {
  it('migrates PAT from globalState to secrets', async () => {
    const ctx = makeMockContext();
    await ctx.globalState.update('azureDevOpsInt.pat', 'old-value');
    // call migration
    await migrateLegacyPAT(ctx as any);
    const secret = await ctx.secrets.get('azureDevOpsInt.pat');
    expect(secret).to.equal('old-value');
  });
});
