import { expect } from 'chai';
import nock from 'nock';
import { AzureDevOpsIntClient } from '../src/azureClient.ts';

describe('AzureDevOpsIntClient create/update', function () {
  afterEach(() => nock.cleanAll());

  it('createWorkItem posts patch payload and returns created item', async function () {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    const type = 'Task';
    const title = 'New Item';
    const areaPath = 'Contoso/Trusted';
    const expectedPatch = [
      { op: 'add', path: '/fields/System.Title', value: title },
      { op: 'add', path: '/fields/System.Description', value: 'desc' },
      { op: 'add', path: '/fields/System.AreaPath', value: areaPath },
    ];
    nock('https://dev.azure.com')
      .post('/org/proj/_apis/wit/workitems/$Task?api-version=7.0', (body) => {
        const patchOps = typeof body === 'string' ? JSON.parse(body) : body;
        expect(patchOps).to.deep.include.members(expectedPatch);
        return true;
      })
      .reply(200, { id: 321, fields: { 'System.Title': title } });
    const created = await client.createWorkItem(type, title, 'desc', undefined, {
      'System.AreaPath': areaPath,
    });
    expect(created).to.have.property('id', 321);
    expect(created.fields['System.Title']).to.equal(title);
  });

  it('updateWorkItem patches and returns updated', async () => {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    const id = 444;
    nock('https://dev.azure.com')
      .patch(`/org/proj/_apis/wit/workitems/${id}?api-version=7.0`)
      .reply(200, { id, fields: { 'System.State': 'Resolved' } });
    const patched = await client.updateWorkItem(id, [
      { op: 'replace', path: '/fields/System.State', value: 'Resolved' },
    ]);
    expect(patched).to.have.property('id', id);
    expect(patched.fields['System.State']).to.equal('Resolved');
  });
});
