import { expect } from 'chai';
import nock from 'nock';
import { AzureDevOpsIntClient } from '../src/azureClient.ts';

describe('AzureDevOpsIntClient error handling', function () {
  afterEach(() => nock.cleanAll());

  it('getWorkItems surfaces detailed error on network failure', async function () {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    nock('https://dev.azure.com')
      .post(/.*wit\/wiql/)
      .replyWithError('network');

    try {
      await client.getWorkItems('Q');
      expect.fail('Expected network failure to throw');
    } catch (error) {
      expect(error).to.be.instanceOf(Error);
      expect((error as Error).message).to.include('Failed to fetch work items');
      expect((error as Error).message).to.include('network');
    }
  });
});
