import { expect } from 'chai';
import { describe, it } from 'vitest';
import { WorkItemsProvider } from '../src/provider.ts';

describe('WorkItemsProvider debounce/refresh behavior', () => {
  it('prevents overlapping refreshes and respects debounce', async () => {
    let calls = 0;
    class SlowClient {
      async getWorkItems(_query?: string) {
        calls++;
        // simulate slow network
        await new Promise((r) => setTimeout(r, 300));
        return [{ id: 1, fields: { 'System.Title': 'Hi' } }];
      }
    }
    const provider = new WorkItemsProvider('connection', new SlowClient() as any, () => {}, {});
    // Call refresh twice quickly
    provider.refresh();
    provider.refresh();
    // Wait for operations to complete
    await new Promise((r) => setTimeout(r, 700));
    expect(calls).to.equal(1);
  }, 2000);
});
