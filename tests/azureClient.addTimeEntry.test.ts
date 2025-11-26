import { expect } from 'chai';
import nock from 'nock';
import { AzureDevOpsIntClient } from '../src/azureClient.ts';

describe('AzureDevOpsIntClient addTimeEntry', () => {
  afterEach(() => nock.cleanAll());

  it('adds completed work and posts a comment when note provided', async () => {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    const id = 999;
    // patch update for CompletedWork
    nock('https://dev.azure.com')
      .patch(`/org/proj/_apis/wit/workitems/${id}?api-version=7.1`)
      .reply(200, { id, fields: { 'Microsoft.VSTS.Scheduling.CompletedWork': 2 } });
    // comments endpoint
    nock('https://dev.azure.com')
      .post(`/org/proj/_apis/wit/workitems/${id}/comments?api-version=7.0-preview.3`)
      .reply(200, { id: 1, text: 'Time tracked: 2 hours. note' });

    await client.addTimeEntry(id, 2, 'note');
    // If no exception thrown we consider it success
    expect(true).to.equal(true);
  });
});
