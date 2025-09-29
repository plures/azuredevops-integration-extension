import { expect } from 'chai';
import { WorkItemsProvider } from '../src/provider.ts';

describe('WorkItemsProvider search/filter', () => {
  it('search calls client.search and shows items', async () => {
    const returned = [
      { id: 1, fields: { 'System.Title': 'abc', 'System.WorkItemType': 'User Story' } },
    ];
    const client = { searchWorkItems: async () => returned } as any;
    const posted: any[] = [];
    const provider = new WorkItemsProvider('connection', client, (m) => posted.push(m), {});
    const res = await provider.search('abc');
    expect(res).to.equal(returned);
    expect(posted.some((p) => p.type === 'workItemsLoaded')).to.equal(true);
    expect(posted.every((p) => p.connectionId === 'connection')).to.equal(true);
    const typeMessage = posted.find((p) => p.type === 'workItemTypeOptions');
    expect(typeMessage).to.exist;
    expect(typeMessage.types).to.include('User Story');
  });

  it('filter calls client.filterWorkItems and shows items', async () => {
    const returned = [{ id: 2, fields: { 'System.Title': 'xyz', 'System.WorkItemType': 'Bug' } }];
    const client = { filterWorkItems: async () => returned } as any;
    const posted: any[] = [];
    const provider = new WorkItemsProvider('connection', client, (m) => posted.push(m), {});
    const res = await provider.filter({ sprint: 'All' });
    expect(res).to.equal(returned);
    expect(posted.some((p) => p.type === 'workItemsLoaded')).to.equal(true);
    expect(posted.every((p) => p.connectionId === 'connection')).to.equal(true);
    const typeMessage = posted.find((p) => p.type === 'workItemTypeOptions');
    expect(typeMessage).to.exist;
    expect(typeMessage.types).to.include('Bug');
  });
});
