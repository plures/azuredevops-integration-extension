import { describe, it } from 'vitest';
import { expect } from 'chai';
import {
  parseAzureDevOpsUrl,
  isAzureDevOpsWorkItemUrl,
  generatePatCreationUrl,
  generateWorkItemUrl,
  testAzureDevOpsConnection,
} from '../src/azureDevOpsUrlParser.ts';

describe('Azure DevOps URL Parser', () => {
  describe('parseAzureDevOpsUrl', () => {
    it('should parse dev.azure.com URLs correctly', () => {
      const url = 'https://dev.azure.com/myorg/myproject/_workitems/edit/12345';
      const result = parseAzureDevOpsUrl(url);

      expect(result.isValid).to.be.true;
      expect(result.organization).to.equal('myorg');
      expect(result.project).to.equal('myproject');
      expect(result.baseUrl).to.equal('https://dev.azure.com/myorg');
      expect(result.apiBaseUrl).to.equal('https://dev.azure.com/myorg/myproject/_apis');
      expect(result.workItemId).to.equal(12345);
      expect(result.error).to.be.undefined;
    });

    it('should parse visualstudio.com URLs correctly', () => {
      const url = 'https://myorg.visualstudio.com/myproject/_workitems/edit/12345';
      const result = parseAzureDevOpsUrl(url);

      expect(result.isValid).to.be.true;
      expect(result.organization).to.equal('myorg');
      expect(result.project).to.equal('myproject');
      expect(result.baseUrl).to.equal('https://myorg.visualstudio.com');
      expect(result.apiBaseUrl).to.equal('https://dev.azure.com/myorg/myproject/_apis');
      expect(result.workItemId).to.equal(12345);
      expect(result.error).to.be.undefined;
    });

    it('should parse dev.azure.com subdomain URLs correctly', () => {
      const url = 'https://myorg.dev.azure.com/myproject/_workitems/edit/12345';
      const result = parseAzureDevOpsUrl(url);

      expect(result.isValid).to.be.true;
      expect(result.organization).to.equal('myorg');
      expect(result.project).to.equal('myproject');
      expect(result.baseUrl).to.equal('https://myorg.dev.azure.com');
      expect(result.apiBaseUrl).to.equal('https://dev.azure.com/myorg/myproject/_apis');
      expect(result.workItemId).to.equal(12345);
      expect(result.error).to.be.undefined;
    });

    it('should parse vsrm.visualstudio.com URLs correctly', () => {
      const url = 'https://myorg.vsrm.visualstudio.com/myproject/_workitems/edit/12345';
      const result = parseAzureDevOpsUrl(url);

      expect(result.isValid).to.be.true;
      expect(result.organization).to.equal('myorg');
      expect(result.project).to.equal('myproject');
      expect(result.baseUrl).to.equal('https://myorg.visualstudio.com');
      expect(result.apiBaseUrl).to.equal('https://dev.azure.com/myorg/myproject/_apis');
      expect(result.workItemId).to.equal(12345);
      expect(result.error).to.be.undefined;
    });

    it('should handle URLs with additional path segments', () => {
      const url =
        'https://dev.azure.com/myorg/myproject/_workitems/edit/12345/some/additional/path';
      const result = parseAzureDevOpsUrl(url);

      expect(result.isValid).to.be.true;
      expect(result.organization).to.equal('myorg');
      expect(result.project).to.equal('myproject');
      expect(result.workItemId).to.equal(12345);
    });

    it('should handle URLs without work item ID', () => {
      const url = 'https://dev.azure.com/myorg/myproject/_workitems/edit/';
      const result = parseAzureDevOpsUrl(url);

      expect(result.isValid).to.be.false;
      expect(result.error).to.include('Unsupported URL format');
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'https://example.com/workitems/edit/123',
        'https://dev.azure.com',
        'https://dev.azure.com/myorg',
        'https://dev.azure.com/myorg/myproject',
        '',
        null as any,
        undefined as any,
      ];

      for (const url of invalidUrls) {
        const result = parseAzureDevOpsUrl(url);
        expect(result.isValid).to.be.false;
        expect(result.error).to.be.a('string');
      }
    });

    it('should handle URLs with special characters in org/project names', () => {
      const url = 'https://dev.azure.com/my-org_123/My%20Project/_workitems/edit/12345';
      const result = parseAzureDevOpsUrl(url);

      expect(result.isValid).to.be.true;
      expect(result.organization).to.equal('my-org_123');
      expect(result.project).to.equal('My%20Project');
    });

    it('should parse on-premises Azure DevOps Server URLs correctly', () => {
      const url = 'https://myserver/DefaultCollection/MyProject/_workitems/edit/12345';
      const result = parseAzureDevOpsUrl(url);

      expect(result.isValid).to.be.true;
      expect(result.organization).to.equal('DefaultCollection');
      expect(result.project).to.equal('MyProject');
      expect(result.baseUrl).to.equal('https://myserver/DefaultCollection');
      expect(result.apiBaseUrl).to.equal('https://myserver/DefaultCollection/MyProject/_apis');
      expect(result.workItemId).to.equal(12345);
      expect(result.error).to.be.undefined;
    });

    it('should parse on-premises URLs with ports', () => {
      const url = 'https://server:8080/tfs/MyProject/_workitems/edit/123';
      const result = parseAzureDevOpsUrl(url);

      expect(result.isValid).to.be.true;
      expect(result.organization).to.equal('tfs');
      expect(result.project).to.equal('MyProject');
      expect(result.baseUrl).to.equal('https://server:8080/tfs');
      expect(result.apiBaseUrl).to.equal('https://server:8080/tfs/MyProject/_apis');
      expect(result.workItemId).to.equal(123);
    });

    it('should parse on-premises URLs without work item ID', () => {
      const url = 'https://onprem-server/Collection/Project/_boards';
      const result = parseAzureDevOpsUrl(url);

      expect(result.isValid).to.be.true;
      expect(result.organization).to.equal('Collection');
      expect(result.project).to.equal('Project');
      expect(result.baseUrl).to.equal('https://onprem-server/Collection');
      expect(result.apiBaseUrl).to.equal('https://onprem-server/Collection/Project/_apis');
      expect(result.workItemId).to.be.undefined;
    });

    it('should parse simplified on-premises URLs (2-segment) correctly', () => {
      // Edge case: https://server/collection should create API URL without duplicating collection
      const url = 'https://server/tfs/MyProject/_workitems/edit/123';
      const result = parseAzureDevOpsUrl(url);

      expect(result.isValid).to.be.true;
      expect(result.organization).to.equal('tfs');
      expect(result.project).to.equal('MyProject');
      expect(result.baseUrl).to.equal('https://server/tfs');
      // API URL should be baseUrl/project/_apis, NOT baseUrl/collection/project/_apis
      expect(result.apiBaseUrl).to.equal('https://server/tfs/MyProject/_apis');
      expect(result.workItemId).to.equal(123);
    });

    it('should parse full on-premises URLs (3-segment) correctly', () => {
      // Full format: https://server/collection/org/project
      const url = 'https://server/DefaultCollection/MyOrg/MyProject/_workitems/edit/456';
      const result = parseAzureDevOpsUrl(url);

      expect(result.isValid).to.be.true;
      expect(result.organization).to.equal('MyOrg');
      expect(result.project).to.equal('MyProject');
      expect(result.baseUrl).to.equal('https://server/DefaultCollection');
      // API URL should be baseUrl/org/project/_apis for 3-segment format
      expect(result.apiBaseUrl).to.equal('https://server/DefaultCollection/MyOrg/MyProject/_apis');
      expect(result.workItemId).to.equal(456);
    });
  });

  describe('isAzureDevOpsWorkItemUrl', () => {
    it('should identify valid Azure DevOps work item URLs', () => {
      const validUrls = [
        'https://dev.azure.com/myorg/myproject/_workitems/edit/12345',
        'https://myorg.visualstudio.com/myproject/_workitems/edit/12345',
        'https://myorg.dev.azure.com/myproject/_workitems/edit/12345',
        'https://myorg.vsrm.visualstudio.com/myproject/_workitems/edit/12345',
      ];

      for (const url of validUrls) {
        expect(isAzureDevOpsWorkItemUrl(url)).to.be.true;
      }
    });

    it('should reject non-Azure DevOps URLs', () => {
      const invalidUrls = [
        'https://example.com/workitems/edit/123',
        'https://github.com/user/repo/issues/123',
        'https://dev.azure.com/myorg/myproject',
        'not-a-url',
        '',
        null as any,
        undefined as any,
      ];

      for (const url of invalidUrls) {
        expect(isAzureDevOpsWorkItemUrl(url)).to.be.false;
      }
    });
  });

  describe('generatePatCreationUrl', () => {
    it('should generate correct PAT creation URL for dev.azure.com', () => {
      const url = generatePatCreationUrl('myorg', 'https://dev.azure.com/myorg');
      expect(url).to.equal('https://dev.azure.com/myorg/_usersSettings/tokens');
    });

    it('should generate correct PAT creation URL for visualstudio.com', () => {
      const url = generatePatCreationUrl('myorg', 'https://myorg.visualstudio.com');
      expect(url).to.equal('https://myorg.visualstudio.com/_usersSettings/tokens');
    });

    it('should generate correct PAT creation URL for on-premises', () => {
      const url = generatePatCreationUrl('collection', 'https://myserver/collection');
      expect(url).to.equal('https://myserver/collection/_usersSettings/tokens');
    });
  });

  describe('generateWorkItemUrl', () => {
    it('should generate correct work item URL for dev.azure.com', () => {
      const url = generateWorkItemUrl('myorg', 'myproject', 12345, 'https://dev.azure.com/myorg');
      expect(url).to.equal('https://dev.azure.com/myorg/myproject/_workitems/edit/12345');
    });

    it('should generate correct work item URL for visualstudio.com', () => {
      const url = generateWorkItemUrl(
        'myorg',
        'myproject',
        12345,
        'https://myorg.visualstudio.com'
      );
      expect(url).to.equal('https://myorg.visualstudio.com/myproject/_workitems/edit/12345');
    });

    it('should generate correct work item URL for on-premises', () => {
      const url = generateWorkItemUrl(
        'collection',
        'myproject',
        12345,
        'https://myserver/collection'
      );
      expect(url).to.equal('https://myserver/collection/myproject/_workitems/edit/12345');
    });
  });

  describe('testAzureDevOpsConnection', () => {
    it('should reject invalid URL configuration', async () => {
      const invalidUrl = {
        isValid: false,
        organization: '',
        project: '',
        baseUrl: '',
        apiBaseUrl: '',
      };

      const result = await testAzureDevOpsConnection(invalidUrl as any, 'some-pat');
      expect(result.success).to.be.false;
      expect(result.error).to.include('Invalid URL configuration');
    });

    it('should reject empty PAT', async () => {
      const validUrl = {
        isValid: true,
        organization: 'myorg',
        project: 'myproject',
        baseUrl: 'https://dev.azure.com/myorg',
        apiBaseUrl: 'https://dev.azure.com/myorg/myproject/_apis',
      };

      const result = await testAzureDevOpsConnection(validUrl as any, '');
      expect(result.success).to.be.false;
      expect(result.error).to.include('Personal Access Token is required');
    });

    // Note: We don't test actual network calls in unit tests
    // Integration tests would cover the actual connection testing
  });
});
