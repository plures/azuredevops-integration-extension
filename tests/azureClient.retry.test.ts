import { describe, it, afterEach, expect } from 'vitest';
import nock from 'nock';
import { AzureDevOpsIntClient } from '../src/azureClient.ts';

describe('AzureDevOpsIntClient retry behavior', () => {
  afterEach(() => nock.cleanAll());

  it('retries on 429 and eventually succeeds', async () => {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    // First call: WIQL returns 429, second attempt returns empty WIQL then 200
    const scope = nock('https://dev.azure.com')
      .post(/.*wit\/wiql/)
      .reply(429, 'rate limited')
      .post(/.*wit\/wiql/)
      .reply(200, { workItems: [{ id: 55 }] });
    // Expand call for ids
    nock('https://dev.azure.com')
      .get(/.*wit\/workitems\?.*/)
      .reply(200, { value: [{ id: 55, fields: {} }] });

    const items = await client.getWorkItems('My Activity');
    expect(items.length).toBeGreaterThan(0);
    expect(scope.isDone()).toBe(true);
  }, 10000);
});
