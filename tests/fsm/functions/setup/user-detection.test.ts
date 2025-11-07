/**
 * Tests for user detection utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectWindowsUser,
  validateUsernameFormat,
  formatUsername,
} from '../../../../src/fsm/functions/setup/user-detection.js';

// Store original values
const originalPlatform = process.platform;
const originalEnv = { ...process.env };

describe('User Detection', () => {
  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
  });

  describe('detectWindowsUser', () => {
    it('should return null on non-Windows platforms', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin', // macOS
        writable: true,
        configurable: true,
      });

      const result = detectWindowsUser();
      expect(result).toBeNull();
    });

    it('should return null on Linux', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
        configurable: true,
      });

      const result = detectWindowsUser();
      expect(result).toBeNull();
    });

    // Note: Full Windows user detection testing requires actual Windows environment
    // or more sophisticated mocking. These tests verify the logic structure.
  });

  describe('validateUsernameFormat', () => {
    it('should accept DOMAIN\\user format', () => {
      expect(validateUsernameFormat('CORP\\john')).toBe(true);
      expect(validateUsernameFormat('DOMAIN\\user')).toBe(true);
    });

    it('should accept email format', () => {
      expect(validateUsernameFormat('john@domain.com')).toBe(true);
      expect(validateUsernameFormat('user@example.org')).toBe(true);
    });

    it('should accept plain username', () => {
      expect(validateUsernameFormat('john')).toBe(true);
      expect(validateUsernameFormat('user123')).toBe(true);
    });

    it('should reject empty strings', () => {
      expect(validateUsernameFormat('')).toBe(false);
      expect(validateUsernameFormat('   ')).toBe(false);
    });

    it('should reject null or undefined', () => {
      expect(validateUsernameFormat(null as any)).toBe(false);
      expect(validateUsernameFormat(undefined as any)).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(validateUsernameFormat(123 as any)).toBe(false);
      expect(validateUsernameFormat({} as any)).toBe(false);
    });
  });

  describe('formatUsername', () => {
    it('should uppercase DOMAIN\\user format', () => {
      expect(formatUsername('corp\\john')).toBe('CORP\\JOHN');
      expect(formatUsername('Domain\\User')).toBe('DOMAIN\\USER');
    });

    it('should convert email to DOMAIN\\user format', () => {
      expect(formatUsername('john@domain.com')).toBe('DOMAIN.COM\\JOHN');
      expect(formatUsername('user@example.org')).toBe('EXAMPLE.ORG\\USER');
    });

    it('should return plain username as-is', () => {
      expect(formatUsername('john')).toBe('john');
      expect(formatUsername('user123')).toBe('user123');
    });

    it('should handle empty strings', () => {
      expect(formatUsername('')).toBe('');
      expect(formatUsername('   ')).toBe(''); // Whitespace is trimmed
    });

    it('should handle null/undefined', () => {
      expect(formatUsername(null as any)).toBe('');
      expect(formatUsername(undefined as any)).toBe('');
    });
  });
});
