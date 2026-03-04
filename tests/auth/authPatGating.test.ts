/**
 * AuthService PAT Gating Tests
 *
 * Verifies that isPatAllowed() correctly reads VS Code configuration.
 * The vscode-stub returns the fallback value (false) for all config gets.
 */

import { describe, it, expect } from 'vitest';
import { isPatAllowed } from '../../src/auth/authService.js';

describe('isPatAllowed', () => {
  it('returns false by default (opt-in required, vscode stub returns fallback)', () => {
    // The vscode-stub's getConfiguration().get() returns the fallback value.
    // The fallback for allowPat is false, so this should return false in tests.
    const result = isPatAllowed();
    expect(result).toBe(false);
  });
});
