/**
 * Tests for environment detection utilities
 */

import { describe, it, expect } from 'vitest';
import {
  detectEnvironmentType,
  getEnvironmentLabel,
} from '../../../../src/fsm/functions/setup/environment-detection.js';
import type { ParsedAzureDevOpsUrl } from '../../../../src/azureDevOpsUrlParser.js';

function makeParsedUrl(
  baseUrl: string,
  organization: string = 'testorg',
  project: string = 'testproject'
): ParsedAzureDevOpsUrl {
  const apiBaseUrl = baseUrl.includes('dev.azure.com')
    ? `https://dev.azure.com/${organization}/${project}/_apis`
    : `${baseUrl}/${organization}/${project}/_apis`;

  return {
    organization,
    project,
    baseUrl,
    apiBaseUrl,
    isValid: true,
  };
}

describe('Environment Detection', () => {
  describe('detectEnvironmentType', () => {
    it('should detect online for dev.azure.com', () => {
      const parsed = makeParsedUrl('https://dev.azure.com/testorg');
      expect(detectEnvironmentType(parsed)).toBe('online');
    });

    it('should detect online for subdomain dev.azure.com', () => {
      const parsed = makeParsedUrl('https://subdomain.dev.azure.com/testorg');
      expect(detectEnvironmentType(parsed)).toBe('online');
    });

    it('should detect online for visualstudio.com', () => {
      const parsed = makeParsedUrl('https://myorg.visualstudio.com');
      expect(detectEnvironmentType(parsed)).toBe('online');
    });

    it('should detect online for vsrm.visualstudio.com', () => {
      const parsed = makeParsedUrl('https://myorg.vsrm.visualstudio.com');
      expect(detectEnvironmentType(parsed)).toBe('online');
    });

    it('should detect onpremises for custom server', () => {
      const parsed = makeParsedUrl('https://tfs.contoso.com/DefaultCollection');
      expect(detectEnvironmentType(parsed)).toBe('onpremises');
    });

    it('should detect onpremises for localhost', () => {
      const parsed = makeParsedUrl('http://localhost:8080/tfs/DefaultCollection');
      expect(detectEnvironmentType(parsed)).toBe('onpremises');
    });

    it('should detect onpremises for IP address', () => {
      const parsed = makeParsedUrl('http://192.168.1.100:8080/tfs');
      expect(detectEnvironmentType(parsed)).toBe('onpremises');
    });

    it('should default to onpremises for invalid URL', () => {
      const parsed: ParsedAzureDevOpsUrl = {
        organization: '',
        project: '',
        baseUrl: '',
        apiBaseUrl: '',
        isValid: false,
        error: 'Invalid URL',
      };
      expect(detectEnvironmentType(parsed)).toBe('onpremises');
    });

    it('should default to onpremises for empty baseUrl', () => {
      const parsed: ParsedAzureDevOpsUrl = {
        organization: 'test',
        project: 'test',
        baseUrl: '',
        apiBaseUrl: '',
        isValid: true,
      };
      expect(detectEnvironmentType(parsed)).toBe('onpremises');
    });

    it('should handle malformed baseUrl gracefully', () => {
      const parsed: ParsedAzureDevOpsUrl = {
        organization: 'test',
        project: 'test',
        baseUrl: 'not-a-url',
        apiBaseUrl: '',
        isValid: true,
      };
      // Should default to onpremises on error
      expect(detectEnvironmentType(parsed)).toBe('onpremises');
    });
  });

  describe('getEnvironmentLabel', () => {
    it('should return correct label for online', () => {
      expect(getEnvironmentLabel('online')).toBe('Azure DevOps Services (Online)');
    });

    it('should return correct label for onpremises', () => {
      expect(getEnvironmentLabel('onpremises')).toBe('Azure DevOps Server (OnPremises)');
    });
  });
});
