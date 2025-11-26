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
import { resolveDefaultQuery } from '../src/activation.ts';

type ConfigStub = {
  get<T>(section: string): T | undefined;
  inspect?<T>(section: string):
    | {
        key: string;
        defaultValue?: T;
        globalValue?: T;
        workspaceValue?: T;
        workspaceFolderValue?: T;
        globalLanguageValue?: T;
        workspaceLanguageValue?: T;
        workspaceFolderLanguageValue?: T;
      }
    | undefined;
};

type ConfigStubOptions = {
  defaults?: Record<string, any>;
  customKeys?: string[];
};

function makeConfig(values: Record<string, any>, options: ConfigStubOptions = {}): ConfigStub {
  const { defaults = {}, customKeys = [] } = options;
  return {
    get: <T>(section: string) => {
      if (Object.prototype.hasOwnProperty.call(values, section)) {
        return values[section] as T;
      }
      if (Object.prototype.hasOwnProperty.call(defaults, section)) {
        return defaults[section] as T;
      }
      return undefined;
    },
    inspect: <T>(section: string) => {
      const hasDefault = Object.prototype.hasOwnProperty.call(defaults, section);
      const hasCustom =
        customKeys.includes(section) && Object.prototype.hasOwnProperty.call(values, section);
      if (!hasDefault && !hasCustom) return undefined;
      const result: any = { key: section };
      if (hasDefault) result.defaultValue = defaults[section];
      if (hasCustom) result.globalValue = values[section];
      return result;
    },
  };
}

const DEFAULT_WORK_ITEM_QUERY =
  "SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.WorkItemType] FROM WorkItems WHERE [System.TeamProject] = @project AND [System.State] <> 'Closed' ORDER BY [System.CreatedDate] DESC";

describe('resolveDefaultQuery', () => {
  it('returns defaultQuery when provided', () => {
    const cfg = makeConfig({ defaultQuery: 'Current Sprint', workItemQuery: 'Legacy query' });
    expect(resolveDefaultQuery(cfg as any)).to.equal('Current Sprint');
  });

  it('falls back to workItemQuery when defaultQuery missing', () => {
    const cfg = makeConfig(
      { defaultQuery: '', workItemQuery: 'SELECT * FROM WorkItems' },
      { customKeys: ['workItemQuery'] }
    );
    expect(resolveDefaultQuery(cfg as any)).to.equal('SELECT * FROM WorkItems');
  });

  it('returns My Activity when no overrides provided', () => {
    const cfg = makeConfig({}, { defaults: { workItemQuery: DEFAULT_WORK_ITEM_QUERY } });
    expect(resolveDefaultQuery(cfg as any)).to.equal('My Activity');
  });

  it('falls back to workItemQuery when inspect not available', () => {
    const cfg: ConfigStub = {
      get: <T>(section: string) => {
        if (section === 'workItemQuery') return 'SELECT * FROM Legacy' as T;
        return undefined;
      },
    };
    expect(resolveDefaultQuery(cfg as any)).to.equal('SELECT * FROM Legacy');
  });
});
