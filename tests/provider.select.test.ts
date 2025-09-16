import { expect } from 'chai';
import { WorkItemsProvider } from '../src/provider';

describe('WorkItemsProvider selectWorkItem', () => {
  it('posts workItemSelected message when selectWorkItem called', () => {
    const posted: any[] = [];
    const post = (m: any) => posted.push(m);
    const provider = new WorkItemsProvider(undefined as any, post, {});
    const item = { id: 12, fields: { 'System.Title': 'X' } } as any;
    provider.selectWorkItem(item);
    expect(posted.some(p => p.type === 'workItemSelected')).to.equal(true);
    const msg = posted.find(p => p.type === 'workItemSelected');
    expect(msg.workItem).to.equal(item);
  });
});
