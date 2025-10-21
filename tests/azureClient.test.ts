import { expect } from 'chai';
import nock from 'nock';
import { AzureDevOpsIntClient } from '../src/azureClient.ts';
import { workItemCache } from '../src/cache.ts';

// Tests for core client logic (WIQL build and basic fetch behaviors)
describe('AzureDevOpsIntClient', function () {
  afterEach(() => {
    nock.cleanAll();
    workItemCache.clear();
  });

  it('buildWIQL returns expected string for "My Activity"', function () {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    const wiql = client.buildWIQL('My Activity');
    expect(wiql).to.match(/SELECT [\s\S]* FROM WorkItems/);
    expect(wiql).to.include('[System.TeamProject] = @Project');
    expect(wiql).to.include('[System.AssignedTo] = @Me');
    expect(wiql).to.include('[System.CreatedBy] = @Me');
    expect(wiql).to.include('[System.ChangedBy] = @Me');
  });

  it('buildWIQL returns expected string for "Assigned to me"', function () {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    const wiql = client.buildWIQL('Assigned to me');
    expect(wiql).to.match(/SELECT [\s\S]* FROM WorkItems/);
    expect(wiql).to.include('[System.TeamProject] = @Project');
    expect(wiql).to.include('WHERE [System.TeamProject] = @Project');
    expect(wiql).to.include('[System.AssignedTo] = @Me');
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

  it('getWorkItems fetches followed work items via favorites API', async function () {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    nock('https://dev.azure.com')
      .get('/org/proj/_apis/work/workitems/favorites?api-version=7.0')
      .reply(200, { value: [{ workItemId: 101 }, { workItemId: 202 }] });
    nock('https://dev.azure.com')
      .get(/\/org\/proj\/_apis\/wit\/workitems\?ids=101,202.*$/)
      .reply(200, {
        value: [
          {
            id: 101,
            fields: { 'System.TeamProject': 'proj', 'System.Title': 'Followed Item' },
          },
          {
            id: 202,
            fields: { 'System.TeamProject': 'other', 'System.Title': 'Other Project' },
          },
        ],
      });
    const items = await client.getWorkItems('Following');
    expect(items).to.have.length(1);
    expect(items[0]).to.have.property('id', 101);
  });

  it('getWorkItems builds mention query with authenticated identity', async function () {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    nock('https://dev.azure.com')
      .get(/\/org\/_apis\/connectionData\?api-version=.*/)
      .reply(200, {
        authenticatedUser: { displayName: 'Test User', uniqueName: 'user@example.com' },
      });
    const wiqlScope = nock('https://dev.azure.com')
      .post(/\/org\/proj\/_apis\/wit\/wiql.*$/, (body) => {
        expect(body.query).to.include('[System.History] CONTAINS');
        expect(body.query).to.include('user@example.com');
        expect(body.query).to.include('Test User');
        return true;
      })
      .reply(200, { workItems: [{ id: 303 }] });
    nock('https://dev.azure.com')
      .get(/\/org\/proj\/_apis\/wit\/workitems\?ids=303.*$/)
      .reply(200, {
        value: [
          {
            id: 303,
            fields: { 'System.TeamProject': 'proj', 'System.Title': 'Mentioned Item' },
          },
        ],
      });
    const items = await client.getWorkItems('Mentioned');
    expect(wiqlScope.isDone()).to.equal(true);
    expect(items).to.have.length(1);
  });

  it('getWorkItems handles empty WIQL response gracefully', async function () {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    // intercept WIQL POST
    nock('https://dev.azure.com')
      .post(/.*wit\/wiql/)
      .reply(200, { workItems: [] });
    nock('https://dev.azure.com')
      .post(/.*wit\/wiql/, (body) => {
        expect(body.query).to.match(/SELECT \[System.Id\], \[System.Title\]/);
        return true;
      })
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
    nock('https://dev.azure.com')
      .post(/.*wit\/wiql.*/)
      .reply(200, { workItems: [] });
    const items = await client.getWorkItems('Current Sprint');
    expect(items).to.be.an('array');
    expect(wiqlScope.isDone()).to.equal(true);
  });
});
