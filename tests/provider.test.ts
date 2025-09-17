import { expect } from 'chai';
import { WorkItemsProvider } from '../src/provider.ts';

class DummyClient {
  _items: any[];
  constructor(items: any[]) {
    this._items = items;
  }
  async getWorkItems() {
    return this._items;
  }
}

describe('WorkItemsProvider', () => {
  it('refresh and getWorkItems returns fetched list', async () => {
    const client = new DummyClient([{ id: 1, fields: { 'System.Title': 'T' } }]);
    const provider = new WorkItemsProvider(client as any, () => {}, {});
    // patch client reference
    (provider as any).client = client;
    await provider.refresh();
    const items = provider.getWorkItems();
    expect(items).to.be.an('array').with.length.greaterThan(0);
  });
});
