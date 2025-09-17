import { expect } from 'chai';
import nock from 'nock';
import { AzureDevOpsIntClient } from '../src/azureClient.ts';

describe('AzureDevOpsIntClient repositories & PRs', function () {
  afterEach(() => nock.cleanAll());

  it('getRepositories returns list', async function () {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    nock('https://dev.azure.com')
      .get('/org/proj/_apis/git/repositories')
      .reply(200, { value: [{ id: 'r1', name: 'repo1' }] });
    const repos = await client.getRepositories();
    expect(repos).to.be.an('array').with.length(1);
    expect(repos![0]).to.have.property('name', 'repo1');
  });

  it('getPullRequests returns mapped PRs', async function () {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    nock('https://dev.azure.com')
      .get('/org/proj/_apis/git/pullrequests')
      .query(true)
      .reply(200, { value: [{ pullRequestId: 7, title: 'Fix', repository: { name: 'repo1' } }] });
    const prs = await client.getPullRequests('repo-id', 'active');
    expect(prs).to.be.an('array');
    expect(prs[0]).to.have.property('id').that.is.ok;
  });

  it('createPullRequest returns server response', async function () {
    const client = new AzureDevOpsIntClient('org', 'proj', 'pat');
    const repositoryId = 'repo123';
    nock('https://dev.azure.com')
      .post(`/org/proj/_apis/git/repositories/${repositoryId}/pullrequests`)
      .query(true)
      .reply(200, { pullRequestId: 99, title: 'New PR' });
    const pr = await client.createPullRequest(
      repositoryId,
      'refs/heads/feature/x',
      'refs/heads/main',
      'New PR'
    );
    expect(pr).to.have.property('pullRequestId', 99);
  });
});
