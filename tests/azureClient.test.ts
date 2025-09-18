import { expect } from 'chai';
import nock from 'nock';
import { AzureDevOpsIntClient } from '../src/azureClient.ts';

// Tests for core client logic (WIQL build and basic fetch behaviors)
describe('AzureDevOpsIntClient', function () {
  afterEach(() => nock.cleanAll());

  it('buildWIQL returns expected string for "My Work Items"', function () {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    const wiql = client.buildWIQL('My Work Items');
    expect(wiql).to.match(/SELECT [\s\S]* FROM WorkItems/);
    expect(wiql).to.include('WHERE [System.AssignedTo] = @Me');
  });

  it('buildWIQL returns expected string for "All Active"', function () {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    const wiql = client.buildWIQL('All Active');
    expect(wiql).to.match(/SELECT[\s\S]*FROM WorkItems/);
    expect(wiql).to.include("[System.StateCategory] <> 'Completed'");
    expect(wiql).to.include("[System.State] <> 'Removed'");
  });

  it('buildWIQL returns expected string for "Recently Updated"', function () {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    const wiql = client.buildWIQL('Recently Updated');
    expect(wiql).to.match(/SELECT[\s\S]*FROM WorkItems/);
    expect(wiql).to.include('[System.ChangedDate]');
    expect(wiql).to.include('ORDER BY [System.ChangedDate] DESC');
  });

  it('getWorkItems handles empty WIQL response gracefully', async function () {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    // intercept WIQL POST
    nock('https://dev.azure.com')
      .post(/.*wit\/wiql/)
      .reply(200, { workItems: [] });
    const items = await client.getWorkItems('Some Query');
    expect(items).to.be.an('array').that.is.empty;
  });

  it('getWorkItems expands ids and returns mapped items', async function () {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    // WIQL response with refs
    nock('https://dev.azure.com')
      .post(/.*wit\/wiql/)
      .reply(200, { workItems: [{ id: 123 }] });
    // expanded endpoint
    nock('https://dev.azure.com')
      .get(/.*wit\/workitems\?.*/)
      .reply(200, { value: [{ id: 123, fields: { 'System.Title': 'Hello' } }] });
    const items = await client.getWorkItems('Some Query');
    expect(items).to.have.length(1);
    expect(items[0]).to.have.property('id', 123);
  });

  it('Current Sprint uses explicit iteration path when team current iteration is available', async function () {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat', { team: 'My Team' });
    // Mock team-scoped current iteration (regex to include query params)
    nock('https://dev.azure.com')
      .get(/\/org\/proj\/My%20Team\/_apis\/work\/teamsettings\/iterations.*$/)
      .reply(200, {
        value: [{ id: 'iter1', name: 'Sprint 42', path: 'org\\proj\\My Team\\Sprint 42' }],
      });
    // WIQL query
    const wiqlScope = nock('https://dev.azure.com')
      .post(/.*wit\/wiql.*/)
      .reply(200, { workItems: [{ id: 1 }] });
    // Expand
    nock('https://dev.azure.com')
      .get(/.*wit\/workitems\?.*/)
      .reply(200, { value: [{ id: 1, fields: {} }] });
    const items = await client.getWorkItems('Current Sprint');
    expect(items).to.have.length(1);
    // Ensure WIQL was called
    expect(wiqlScope.isDone()).to.equal(true);
  });

  it('Current Sprint falls back to @CurrentIteration when current iteration fetch fails', async function () {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat', { team: 'Unknown Team' });
    // Mock failing current iteration
    nock('https://dev.azuredevops.com');
    nock('https://dev.azure.com')
      .get(/\/org\/proj\/Unknown%20Team\/_apis\/work\/teamsettings\/iterations.*$/)
      .reply(404, { message: 'Team not found' });
    // WIQL query still called
    const wiqlScope = nock('https://dev.azure.com')
      .post(/.*wit\/wiql.*/)
      .reply(200, { workItems: [] });
    const items = await client.getWorkItems('Current Sprint');
    expect(items).to.be.an('array');
    expect(wiqlScope.isDone()).to.equal(true);
  });
});
