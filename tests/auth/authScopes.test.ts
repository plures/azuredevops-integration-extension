/**
 * Auth Scope Minimization Tests
 *
 * Verifies that MINIMUM_SCOPES uses specific vso.* scopes rather than /.default.
 */

import { describe, it, expect } from 'vitest';
import { MINIMUM_SCOPES } from '../../src/services/auth/authorizationCodeProvider.js';

const AZURE_DEVOPS_RESOURCE = '499b84ac-1321-427f-aa17-267ca6975798';

describe('MINIMUM_SCOPES', () => {
  it('does not request the broad /.default scope', () => {
    const hasDefault = MINIMUM_SCOPES.some((s) => s.endsWith('/.default'));
    expect(hasDefault).toBe(false);
  });

  it('includes vso.work_write for work item read/write', () => {
    expect(MINIMUM_SCOPES).toContain(`${AZURE_DEVOPS_RESOURCE}/vso.work_write`);
  });

  it('includes vso.code for source code read', () => {
    expect(MINIMUM_SCOPES).toContain(`${AZURE_DEVOPS_RESOURCE}/vso.code`);
  });

  it('includes vso.build for build definitions read', () => {
    expect(MINIMUM_SCOPES).toContain(`${AZURE_DEVOPS_RESOURCE}/vso.build`);
  });

  it('includes offline_access for silent refresh', () => {
    expect(MINIMUM_SCOPES).toContain('offline_access');
  });

  it('does not contain duplicate scopes', () => {
    const unique = new Set(MINIMUM_SCOPES);
    expect(unique.size).toBe(MINIMUM_SCOPES.length);
  });
});
