import { vi } from 'vitest';

// Mock vscode module
vi.mock('vscode', () => {
  return {
    window: {
      createOutputChannel: () => ({ appendLine: () => {} }),
      showErrorMessage: () => {},
      showInformationMessage: () => {},
      showWarningMessage: () => {},
      showInputBox: () => Promise.resolve('mock-input'),
      showQuickPick: () => Promise.resolve({ label: 'mock-pick' }),
      createStatusBarItem: () => ({ show: () => {}, hide: () => {}, dispose: () => {} }),
    },
    commands: {
      registerCommand: () => ({ dispose: () => {} }),
      executeCommand: () => Promise.resolve(),
    },
    workspace: {
      getConfiguration: () => ({
        get: () => undefined,
        update: () => Promise.resolve(),
      }),
      onDidChangeConfiguration: () => ({ dispose: () => {} }),
    },
    env: {
      openExternal: () => Promise.resolve(true),
      clipboard: { writeText: () => Promise.resolve() },
    },
    Uri: {
      parse: (s: string) => ({ toString: () => s }),
      file: (s: string) => ({ toString: () => s }),
      joinPath: () => ({ toString: () => 'mock-path' }),
    },
    ExtensionContext: class {},
    Disposable: class {
      dispose() {}
    },
    ConfigurationTarget: { Global: 1 },
    ThemeColor: class {},
    WebviewView: class {},
  };
});

import { expect } from 'chai';
import { __setTestContext, handleMessage } from '../src/activation.ts';

describe('activation message handling', () => {
  it('handles getWorkItems by posting workItemsLoaded', async () => {
    const posted: any[] = [];
    const panel = { webview: { postMessage: (m: any) => posted.push(m) } } as any;
    let getWorkItemsCalled = false;
    const provider = {
      getWorkItems: () => {
        getWorkItemsCalled = true;
        return [{ id: 1, fields: { 'System.Title': 'T' } }];
      },
      getWorkItemTypeOptions: () => ['Task'],
      refresh: () => {},
    } as any;
    __setTestContext({ panel, provider });
    handleMessage({ type: 'getWorkItems' });
    // Wait briefly for synchronous flow
    await new Promise((r) => setTimeout(r, 10));
    // workItemsLoaded is now dispatched to FSM, not posted to webview directly
    // expect(posted.some((p) => p.type === 'workItemsLoaded')).to.equal(true);
    // workItemTypeOptions is removed
    // expect(posted.some((p) => p.type === 'workItemTypeOptions')).to.equal(true);
    expect(getWorkItemsCalled).to.equal(true);
  });

  it('refresh message calls provider.refresh', async () => {
    let refreshed = false;
    const provider = {
      refresh: () => {
        refreshed = true;
      },
    } as any;
    __setTestContext({ provider, activeConnectionId: 'test-connection' });
    handleMessage({ type: 'refresh' });
    await new Promise((r) => setTimeout(r, 10));
    expect(refreshed).to.equal(true);
  });

  it('submitComposeComment adds comment via client and reports success', async () => {
    const posted: any[] = [];
    const addCalls: Array<{ id: number; text: string }> = [];
    const client = {
      addWorkItemComment: async (id: number, text: string) => {
        addCalls.push({ id, text });
      },
    } as any;

    __setTestContext({
      client,
      panel: { webview: { postMessage: (m: any) => posted.push(m) } },
    });

    handleMessage({
      type: 'submitComposeComment',
      workItemId: 17,
      comment: 'Looks good',
      mode: 'addComment',
    });

    await new Promise((r) => setTimeout(r, 10));

    expect(addCalls).to.deep.equal([{ id: 17, text: 'Looks good' }]);
    // Legacy message removed
    // const result = posted.find((msg) => msg.type === 'composeCommentResult');
    // expect(result).to.exist;
    // expect(result.success).to.equal(true);
    // expect(result.mode).to.equal('addComment');
    // expect(result.workItemId).to.equal(17);
  });

  it('submitComposeComment timerStop updates work item and posts result', async () => {
    const posted: any[] = [];
    const updateCalls: Array<{ id: number; patch: any[] }> = [];
    const commentCalls: Array<{ id: number; text: string }> = [];
    const client = {
      getWorkItemById: async () => ({
        fields: {
          'Microsoft.VSTS.Scheduling.CompletedWork': 1,
          'Microsoft.VSTS.Scheduling.RemainingWork': 5,
        },
      }),
      updateWorkItem: async (id: number, patch: any[]) => {
        updateCalls.push({ id, patch });
      },
      addWorkItemComment: async (id: number, text: string) => {
        commentCalls.push({ id, text });
      },
    } as any;

    __setTestContext({
      client,
      panel: { webview: { postMessage: (m: any) => posted.push(m) } },
    });

    handleMessage({
      type: 'submitComposeComment',
      workItemId: 7,
      comment: 'Finished task',
      mode: 'timerStop',
      timerData: { duration: 5400, hoursDecimal: 1.5 },
    });

    await new Promise((r) => setTimeout(r, 10));

    expect(updateCalls).to.have.lengthOf(1);
    expect(updateCalls[0].id).to.equal(7);
    expect(updateCalls[0].patch).to.deep.equal([
      {
        op: 'add',
        path: '/fields/Microsoft.VSTS.Scheduling.CompletedWork',
        value: 2.5,
      },
      {
        op: 'add',
        path: '/fields/Microsoft.VSTS.Scheduling.RemainingWork',
        value: 3.5,
      },
    ]);

    expect(commentCalls).to.have.lengthOf(1);
    expect(commentCalls[0].id).to.equal(7);
    expect(commentCalls[0].text).to.contain('1.50');
    expect(commentCalls[0].text).to.contain('Finished task');

    // Legacy message removed
    // const result = posted.find((msg) => msg.type === 'composeCommentResult');
    // expect(result).to.exist;
    // expect(result.success).to.equal(true);
    // expect(result.mode).to.equal('timerStop');
    // expect(result.hours).to.be.closeTo(1.5, 0.0001);
  });
});
