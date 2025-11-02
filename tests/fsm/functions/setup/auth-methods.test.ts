/**
 * Tests for authentication method utilities
 */

import { describe, it, expect } from 'vitest';
import {
  getAvailableAuthMethods,
  getRecommendedAuthMethod,
  isAuthMethodAvailable,
  type AuthMethodId,
} from '../../../../src/fsm/functions/setup/auth-methods.js';

describe('Authentication Methods', () => {
  describe('getAvailableAuthMethods', () => {
    it('should return Entra ID and PAT for online environment', () => {
      const methods = getAvailableAuthMethods('online');
      
      expect(methods).toHaveLength(2);
      
      const entra = methods.find((m) => m.id === 'entra');
      expect(entra).toBeDefined();
      expect(entra?.recommended).toBe(true);
      expect(entra?.available).toBe(true);
      
      const pat = methods.find((m) => m.id === 'pat');
      expect(pat).toBeDefined();
      expect(pat?.recommended).toBe(false);
      expect(pat?.available).toBe(true);
    });

    it('should return only PAT for onpremises environment', () => {
      const methods = getAvailableAuthMethods('onpremises');
      
      expect(methods).toHaveLength(1);
      expect(methods[0].id).toBe('pat');
      expect(methods[0].recommended).toBe(true);
      expect(methods[0].available).toBe(true);
    });

    it('should not include NTLM or Basic in online methods', () => {
      const methods = getAvailableAuthMethods('online');
      const ids = methods.map((m) => m.id);
      
      expect(ids).not.toContain('ntlm');
      expect(ids).not.toContain('basic');
    });

    it('should not include NTLM or Basic in onpremises methods', () => {
      const methods = getAvailableAuthMethods('onpremises');
      const ids = methods.map((m) => m.id);
      
      expect(ids).not.toContain('ntlm');
      expect(ids).not.toContain('basic');
    });
  });

  describe('getRecommendedAuthMethod', () => {
    it('should return entra for online', () => {
      const recommended = getRecommendedAuthMethod('online');
      expect(recommended).toBe('entra');
    });

    it('should return pat for onpremises', () => {
      const recommended = getRecommendedAuthMethod('onpremises');
      expect(recommended).toBe('pat');
    });
  });

    describe('isAuthMethodAvailable', () => {
      it('should return true for entra in online', () => {
        expect(isAuthMethodAvailable('entra', 'online')).toBe(true);
      });

      it('should return true for pat in online', () => {
        expect(isAuthMethodAvailable('pat', 'online')).toBe(true);
      });

      it('should return false for entra in onpremises', () => {
        expect(isAuthMethodAvailable('entra', 'onpremises')).toBe(false);
      });

      it('should return true for pat in onpremises', () => {
        expect(isAuthMethodAvailable('pat', 'onpremises')).toBe(true);
      });

      it('should return false for ntlm in online', () => {
        expect(isAuthMethodAvailable('ntlm', 'online')).toBe(false);
      });

      it('should return false for ntlm in onpremises', () => {
        expect(isAuthMethodAvailable('ntlm', 'onpremises')).toBe(false);
      });

      it('should return false for basic in online', () => {
        expect(isAuthMethodAvailable('basic', 'online')).toBe(false);
      });

      it('should return false for basic in onpremises', () => {
        expect(isAuthMethodAvailable('basic', 'onpremises')).toBe(false);
      });
    });
});

