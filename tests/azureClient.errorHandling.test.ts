import { expect } from 'chai';
import nock from 'nock';
import { AzureDevOpsIntClient } from '../src/azureClient.ts';

describe('AzureDevOpsIntClient error handling', function () {
  afterEach(() => nock.cleanAll());

  it('getWorkItems returns empty on network failure', async function () {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    nock('https://dev.azure.com')
      .post(/.*wit\/wiql/)
      .replyWithError('network');
    const items = await client.getWorkItems('Q');
    expect(items).to.be.an('array');
    expect(items.length).to.equal(0);
  });
});
