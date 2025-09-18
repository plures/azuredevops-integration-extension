import { expect } from 'chai';
import { toNormalized, getField } from '../src/workItemNormalize.ts';

describe('workItemNormalize', () => {
  it('getField returns nested field values', () => {
    const item = { id: 42, fields: { 'System.Title': 'Hello', 'System.State': 'Active' } };
    expect(getField(item, 'System.Title')).to.equal('Hello');
    expect(getField(item, 'System.State')).to.equal('Active');
    expect(getField(item, 'System.Id')).to.equal(42);
  });

  it('toNormalized maps fields correctly', () => {
    const item = {
      id: 10,
      fields: {
        'System.Title': 'T',
        'System.State': 'New',
        'System.WorkItemType': 'Task',
        'System.Tags': 'a;b',
      },
    };
    const n = toNormalized(item as any);
    expect(n.id).to.equal(10);
    expect(n.title).to.equal('T');
    expect(n.type).to.equal('Task');
    expect(n.tags).to.include('a');
    expect(n.tags).to.include('b');
  });
});
