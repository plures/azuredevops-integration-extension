import { describe, it } from 'mocha';
import { expect } from 'chai';
import { AzureDevOpsIntClient } from '../src/azureClient.js';

describe('AzureDevOpsIntClient - baseUrl support', function () {
  describe('constructor with custom baseUrl', function () {
    it('should use custom baseUrl for API calls', function () {
      const client = new AzureDevOpsIntClient('myorg', 'myproject', 'fake-pat', {
        baseUrl: 'https://myserver/collection',
      });

      expect(client.baseUrl).to.equal('https://myserver/collection');
      expect(client.axios.defaults.baseURL).to.equal('https://myserver/collection/myproject/_apis');
    });

    it('should use dev.azure.com by default when no baseUrl provided', function () {
      const client = new AzureDevOpsIntClient('myorg', 'myproject', 'fake-pat');

      expect(client.baseUrl).to.equal('https://dev.azure.com/myorg');
      expect(client.axios.defaults.baseURL).to.equal('https://dev.azure.com/myorg/myproject/_apis');
    });

    it('should handle baseUrl with trailing slash', function () {
      const client = new AzureDevOpsIntClient('myorg', 'myproject', 'fake-pat', {
        baseUrl: 'https://myserver/collection/',
      });

      expect(client.axios.defaults.baseURL).to.equal('https://myserver/collection/myproject/_apis');
    });

    it('should handle baseUrl with port', function () {
      const client = new AzureDevOpsIntClient('myorg', 'myproject', 'fake-pat', {
        baseUrl: 'https://server:8080/tfs',
      });

      expect(client.axios.defaults.baseURL).to.equal('https://server:8080/tfs/myproject/_apis');
    });
  });

  describe('buildFullUrl', function () {
    it('should use custom baseUrl in buildFullUrl', function () {
      const client = new AzureDevOpsIntClient('myorg', 'myproject', 'fake-pat', {
        baseUrl: 'https://myserver/collection',
      });

      const url = client.buildFullUrl('/wit/workitems/123');
      expect(url).to.equal('https://myserver/collection/myproject/_apis/wit/workitems/123');
    });

    it('should use dev.azure.com in buildFullUrl when no custom baseUrl', function () {
      const client = new AzureDevOpsIntClient('myorg', 'myproject', 'fake-pat');

      const url = client.buildFullUrl('/wit/workitems/123');
      expect(url).to.equal('https://dev.azure.com/myorg/myproject/_apis/wit/workitems/123');
    });
  });

  describe('getBrowserUrl', function () {
    it('should use custom baseUrl in getBrowserUrl', function () {
      const client = new AzureDevOpsIntClient('myorg', 'myproject', 'fake-pat', {
        baseUrl: 'https://myserver/collection',
      });

      const url = client.getBrowserUrl('/_workitems/edit/123');
      expect(url).to.equal('https://myserver/collection/myproject/_workitems/edit/123');
    });

    it('should use dev.azure.com in getBrowserUrl when no custom baseUrl', function () {
      const client = new AzureDevOpsIntClient('myorg', 'myproject', 'fake-pat');

      const url = client.getBrowserUrl('/_workitems/edit/123');
      expect(url).to.equal('https://dev.azure.com/myorg/myproject/_workitems/edit/123');
    });
  });

  describe('buildTeamApiUrl (private method accessed indirectly)', function () {
    it('should construct team URLs with custom baseUrl', function () {
      const client = new AzureDevOpsIntClient('myorg', 'myproject', 'fake-pat', {
        baseUrl: 'https://myserver/collection',
        team: 'myteam',
      });

      // Test that team is properly encoded and set
      expect(client.team).to.equal('myteam');
      expect(client.encodedTeam).to.equal('myteam');
    });

    it('should handle team URLs with on-premises server', function () {
      const client = new AzureDevOpsIntClient('myorg', 'myproject', 'fake-pat', {
        baseUrl: 'https://server:8080/tfs',
        team: 'Team Alpha',
      });

      expect(client.team).to.equal('Team Alpha');
      expect(client.encodedTeam).to.equal('Team%20Alpha');
    });
  });
});
