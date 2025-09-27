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

  it('refresh posts work item type options', async () => {
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
    const typeMessage = posted.find((p) => p.type === 'workItemTypeOptions');
    expect(typeMessage).to.exist;
    expect(typeMessage.types).to.include('Task');
    expect(typeMessage.types).to.include('Bug');
  });
});
