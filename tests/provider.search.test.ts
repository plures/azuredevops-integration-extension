import { expect } from 'chai';
import { WorkItemsProvider } from '../src/provider';

describe('WorkItemsProvider search/filter', () => {
  it('search calls client.search and shows items', async () => {
    const returned = [{ id: 1, fields: { 'System.Title': 'abc' } }];
    const client = { searchWorkItems: async (term: string) => returned } as any;
    const posted: any[] = [];
    const provider = new WorkItemsProvider(client, (m) => posted.push(m), {});
    const res = await provider.search('abc');
    expect(res).to.equal(returned);
    expect(posted.some(p => p.type === 'workItemsLoaded')).to.equal(true);
  });

  it('filter calls client.filterWorkItems and shows items', async () => {
    const returned = [{ id: 2, fields: { 'System.Title': 'xyz' } }];
    const client = { filterWorkItems: async (f: any) => returned } as any;
    const posted: any[] = [];
    const provider = new WorkItemsProvider(client, (m) => posted.push(m), {});
    const res = await provider.filter({ sprint: 'All' });
    expect(res).to.equal(returned);
    expect(posted.some(p => p.type === 'workItemsLoaded')).to.equal(true);
  });
});
