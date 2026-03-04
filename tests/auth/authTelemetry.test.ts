/**
 * Auth Telemetry Unit Tests
 *
 * Tests for the classifyAuthFailure function and telemetry event helpers.
 */

import { describe, it, expect } from 'vitest';
import { classifyAuthFailure } from '../../src/auth/authTelemetry.js';

describe('classifyAuthFailure', () => {
  it('returns "admin_block" for AADSTS90094', () => {
    expect(classifyAuthFailure('AADSTS90094: Admin blocked this application')).toBe('admin_block');
  });

  it('returns "admin_block" for ADMIN_POLICY keyword', () => {
    expect(classifyAuthFailure('ADMIN_POLICY prevents this')).toBe('admin_block');
  });

  it('returns "user_cancelled" for AADSTS65004', () => {
    expect(classifyAuthFailure('AADSTS65004: User declined consent')).toBe('user_cancelled');
  });

  it('returns "user_cancelled" for ACCESS_DENIED keyword', () => {
    expect(classifyAuthFailure('access_denied: User cancelled')).toBe('user_cancelled');
  });

  it('returns "consent_required" for AADSTS65001', () => {
    expect(classifyAuthFailure('AADSTS65001: Consent required')).toBe('consent_required');
  });

  it('returns "mfa_required" for AADSTS50076', () => {
    expect(classifyAuthFailure('AADSTS50076: MFA required')).toBe('mfa_required');
  });

  it('returns "mfa_required" for MFA keyword', () => {
    expect(classifyAuthFailure('Multi-factor authentication required')).toBe('mfa_required');
  });

  it('returns "tenant_not_found" for AADSTS50058', () => {
    expect(classifyAuthFailure('AADSTS50058: Tenant not found')).toBe('tenant_not_found');
  });

  it('returns "app_not_registered" for AADSTS700016', () => {
    expect(classifyAuthFailure('AADSTS700016: Application not found in tenant')).toBe(
      'app_not_registered'
    );
  });

  it('returns "timeout" for timeout message', () => {
    expect(classifyAuthFailure('Authentication timeout after 900 seconds')).toBe('timeout');
  });

  it('returns "token_exchange_failed" for token exchange error', () => {
    expect(classifyAuthFailure('Token exchange failed: invalid code')).toBe(
      'token_exchange_failed'
    );
  });

  it('returns "unknown" for unrecognised error', () => {
    expect(classifyAuthFailure('Some random error with no known code')).toBe('unknown');
  });

  it('returns "unknown" for empty string', () => {
    expect(classifyAuthFailure('')).toBe('unknown');
  });
});
