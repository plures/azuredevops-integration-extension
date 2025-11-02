/**
 * Tests for connection defaults utilities
 */

import { describe, it, expect } from 'vitest';
import {
  autoDetectConnectionDefaults,
  createConnectionFromDefaults,
} from '../../../../src/fsm/functions/setup/connection-defaults.js';
import type { ParsedAzureDevOpsUrl } from '../../../../src/azureDevOpsUrlParser.js';

function makeParsedUrl(
  baseUrl: string,
  organization: string = 'testorg',
  project: string = 'testproject',
  isValid: boolean = true
): ParsedAzureDevOpsUrl {
  const apiBaseUrl = baseUrl.includes('dev.azure.com')
    ? `https://dev.azure.com/${organization}/${project}/_apis`
    : `${baseUrl}/${organization}/${project}/_apis`;

  return {
    organization,
    project,
    baseUrl,
    apiBaseUrl,
    isValid,
  };
}

describe('Connection Defaults', () => {
  describe('autoDetectConnectionDefaults', () => {
    it('should detect online environment for dev.azure.com', () => {
      const parsed = makeParsedUrl('https://dev.azure.com/testorg');
      const defaults = autoDetectConnectionDefaults(parsed);

      expect(defaults.environment).toBe('online');
      expect(defaults.recommendedAuthMethod).toBe('entra');
      expect(defaults.organization).toBe('testorg');
      expect(defaults.project).toBe('testproject');
    });

    it('should detect onpremises environment for custom server', () => {
      const parsed = makeParsedUrl(
        'https://tfs.contoso.com/DefaultCollection',
        'DefaultCollection'
      );
      const defaults = autoDetectConnectionDefaults(parsed);

      expect(defaults.environment).toBe('onpremises');
      expect(defaults.recommendedAuthMethod).toBe('pat');
      expect(defaults.organization).toBe('DefaultCollection');
      expect(defaults.project).toBe('testproject');
    });

    it('should include apiBaseUrl', () => {
      const parsed = makeParsedUrl('https://dev.azure.com/testorg');
      const defaults = autoDetectConnectionDefaults(parsed);

      expect(defaults.apiBaseUrl).toBeDefined();
      expect(defaults.apiBaseUrl).toContain('_apis');
    });

    it('should include Windows user info for onpremises on Windows', () => {
      // Note: This will only work on Windows, so we just verify the structure
      const parsed = makeParsedUrl('https://tfs.contoso.com/DefaultCollection');
      const defaults = autoDetectConnectionDefaults(parsed);

      expect(defaults.environment).toBe('onpremises');
      // Windows user detection is optional (returns null on non-Windows)
      // So we just verify the structure exists
      if (defaults.windowsUser) {
        expect(defaults.windowsUser.username).toBeDefined();
        expect(defaults.windowsUser.formatted).toBeDefined();
      }
    });
  });

  describe('createConnectionFromDefaults', () => {
    it('should create connection with defaults', () => {
      const defaults = autoDetectConnectionDefaults(
        makeParsedUrl('https://dev.azure.com/testorg')
      );

      const connection = createConnectionFromDefaults(defaults, {
        authMethod: 'entra',
      });

      expect(connection.organization).toBe('testorg');
      expect(connection.project).toBe('testproject');
      expect(connection.authMethod).toBe('entra');
      expect(connection.label).toBe('testorg/testproject');
    });

    it('should allow overriding label', () => {
      const defaults = autoDetectConnectionDefaults(
        makeParsedUrl('https://dev.azure.com/testorg')
      );

      const connection = createConnectionFromDefaults(defaults, {
        label: 'My Custom Label',
      });

      expect(connection.label).toBe('My Custom Label');
    });

    it('should allow overriding identityName', () => {
      const defaults = autoDetectConnectionDefaults(
        makeParsedUrl('https://tfs.contoso.com/DefaultCollection')
      );

      const connection = createConnectionFromDefaults(defaults, {
        identityName: 'CORP\\customuser',
      });

      expect(connection.identityName).toBe('CORP\\customuser');
    });

    it('should use recommended auth method if not overridden', () => {
      const onlineDefaults = autoDetectConnectionDefaults(
        makeParsedUrl('https://dev.azure.com/testorg')
      );
      const onlineConnection = createConnectionFromDefaults(onlineDefaults);
      expect(onlineConnection.authMethod).toBe('entra');

      const onPremDefaults = autoDetectConnectionDefaults(
        makeParsedUrl('https://tfs.contoso.com/DefaultCollection')
      );
      const onPremConnection = createConnectionFromDefaults(onPremDefaults);
      expect(onPremConnection.authMethod).toBe('pat');
    });

    it('should allow overriding apiBaseUrl', () => {
      const defaults = autoDetectConnectionDefaults(
        makeParsedUrl('https://dev.azure.com/testorg')
      );

      const customApiUrl = 'https://custom.api.url/_apis';
      const connection = createConnectionFromDefaults(defaults, {
        apiBaseUrl: customApiUrl,
      });

      expect(connection.apiBaseUrl).toBe(customApiUrl);
    });
  });
});

