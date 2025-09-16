import { expect } from 'chai';
import nock from 'nock';
import { AzureDevOpsIntClient } from '../src/azureClient';

// Tests for core client logic (WIQL build and basic fetch behaviors)
describe('AzureDevOpsIntClient', function () {
  afterEach(() => nock.cleanAll());

  it('buildWIQL returns expected string for "My Work Items"', function () {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    const wiql = client.buildWIQL('My Work Items');
    expect(wiql).to.match(/SELECT .* FROM WorkItems/);
    expect(wiql).to.include('WHERE [System.AssignedTo] = @Me');
  });

  it('getWorkItems handles empty WIQL response gracefully', async function () {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    // intercept WIQL POST
    nock('https://dev.azure.com').post(/.*wit\/wiql/).reply(200, { workItems: [] });
    const items = await client.getWorkItems('Some Query');
    expect(items).to.be.an('array').that.is.empty;
  });

  it('getWorkItems expands ids and returns mapped items', async function () {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    // WIQL response with refs
    nock('https://dev.azure.com').post(/.*wit\/wiql/).reply(200, { workItems: [{ id: 123 }] });
    // expanded endpoint
    nock('https://dev.azure.com').get(/.*wit\/workitems\?.*/).reply(200, { value: [{ id: 123, fields: { 'System.Title': 'Hello' } }] });
    const items = await client.getWorkItems('Some Query');
    expect(items).to.have.length(1);
    expect(items[0]).to.have.property('id', 123);
  });
});
