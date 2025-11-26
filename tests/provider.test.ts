import { expect } from 'chai';
import { WorkItemsProvider } from '../src/provider.ts';

class DummyClient {
  _items: any[];
  constructor(items: any[]) {
    this._items = items;
  }
  async getWorkItems(_query?: string) {
    return this._items;
  }
}

describe('WorkItemsProvider', () => {
  it('refresh and getWorkItems returns fetched list', async () => {
    const client = new DummyClient([{ id: 1, fields: { 'System.Title': 'T' } }]);
    const provider = new WorkItemsProvider('default', client as any, () => {}, {});
    await provider.refresh();
    const items = provider.getWorkItems();
    expect(items).to.be.an('array').with.length.greaterThan(0);
  });

  it('refresh updates work item types', async () => {
    const posted: any[] = [];
    const client = {
      getWorkItems: async () => [
        {
          id: 42,
          fields: { 'System.Title': 'Sample', 'System.WorkItemType': 'Task' },
        },
      ],
      getWorkItemTypes: async () => [{ name: 'Task' }, { name: 'Bug' }],
    } as any;
    const provider = new WorkItemsProvider('connection', client, (msg) => posted.push(msg), {});
    await provider.refresh('My Activity');
    // workItemTypeOptions message removed, check internal state
    const types = provider.getWorkItemTypeOptions();
    expect(types).to.include('Task');
    expect(types).to.include('Bug');
  });
});
