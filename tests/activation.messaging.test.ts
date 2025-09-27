import { expect } from 'chai';
import { __setTestContext, handleMessage } from '../src/activation.ts';

describe('activation message handling', () => {
  it('handles getWorkItems by posting workItemsLoaded', async () => {
    const posted: any[] = [];
    const panel = { webview: { postMessage: (m: any) => posted.push(m) } } as any;
    const provider = {
      getWorkItems: () => [{ id: 1, fields: { 'System.Title': 'T' } }],
      getWorkItemTypeOptions: () => ['Task'],
      refresh: () => {},
    } as any;
    __setTestContext({ panel, provider });
    handleMessage({ type: 'getWorkItems' });
    // Wait briefly for synchronous flow
    await new Promise((r) => setTimeout(r, 10));
    expect(posted.some((p) => p.type === 'workItemsLoaded')).to.equal(true);
    expect(posted.some((p) => p.type === 'workItemTypeOptions')).to.equal(true);
  });

  it('startTimer triggers timer.start with id', async () => {
    const calls: any[] = [];
    const provider = {
      getWorkItems: () => [{ id: 123, fields: { 'System.Title': 'X' } }],
      refresh: () => {},
    } as any;
    const timer = { start: (id: number, title: string) => calls.push({ id, title }) } as any;
    __setTestContext({ provider, timer });
    handleMessage({ type: 'startTimer', workItemId: 123 });
    await new Promise((r) => setTimeout(r, 10));
    expect(calls.length).to.equal(1);
    expect(calls[0].id).to.equal(123);
  });

  it('refresh message calls provider.refresh', async () => {
    let refreshed = false;
    const provider = {
      refresh: () => {
        refreshed = true;
      },
    } as any;
    __setTestContext({ provider });
    handleMessage({ type: 'refresh' });
    await new Promise((r) => setTimeout(r, 10));
    expect(refreshed).to.equal(true);
  });
});
