import { describe, it } from 'mocha';
import { expect } from 'chai';
import { computeKanbanColumns } from '../../src/fsm/functions/workItems/kanbanColumns.js';

// Simple unit tests for the pure computeKanbanColumns function
// Verifies grouping logic, handling of missing ids/states, and empty input behavior.

describe('computeKanbanColumns', () => {
  it('returns empty array for empty input', () => {
    const result = computeKanbanColumns([]);
    expect(result).to.be.an('array').that.is.empty;
  });

  it('groups work items by System.State field', () => {
    const workItems = [
      { id: 101, fields: { 'System.State': 'New' } },
      { id: 102, fields: { 'System.State': 'Active' } },
      { id: 103, fields: { 'System.State': 'New' } },
      { id: 'bad', fields: { 'System.State': 'Resolved' } }, // skipped (non-numeric id)
      { id: 104, fields: {} }, // missing state -> Unknown
    ];

    const result = computeKanbanColumns(workItems);
    // Normalize to map for assertions
    const byId: Record<string, number[]> = {};
    for (const col of result) {
      byId[col.id] = col.itemIds.slice();
    }

    expect(byId['New']).to.have.members([101, 103]);
    expect(byId['Active']).to.have.members([102]);
    expect(byId['Unknown']).to.have.members([104]);
    // Ensure bad id was skipped
    expect(Object.values(byId).flat()).to.not.include('bad');
  });

  it('handles all items missing states by placing them in Unknown', () => {
    const workItems = [
      { id: 201, fields: {} },
      { id: 202, fields: {} },
    ];
    const result = computeKanbanColumns(workItems);
    expect(result).to.have.length(1);
    expect(result[0].id).to.equal('Unknown');
    expect(result[0].itemIds).to.have.members([201, 202]);
  });
});
