import { describe, it } from 'vitest';
import { expect } from 'chai';
import { isTokenValid } from '../../src/fsm/functions/authFunctions.js';

describe('authFunctions.isTokenValid', () => {
  it('returns true for tokens expiring beyond the default buffer', () => {
    const future = new Date(Date.now() + 10 * 60 * 1000);
    expect(isTokenValid({ expiresAt: future })).to.be.true;
  });

  it('returns false for tokens already expired', () => {
    const past = new Date(Date.now() - 60 * 1000);
    expect(isTokenValid({ expiresAt: past })).to.be.false;
  });

  it('returns false for tokens expiring inside the buffer window', () => {
    const nearFuture = new Date(Date.now() + 60 * 1000);
    expect(isTokenValid({ expiresAt: nearFuture })).to.be.false;
  });

  it('handles numeric expiration timestamps', () => {
    const futureMs = Date.now() + 15 * 60 * 1000;
    expect(isTokenValid({ expiresAt: futureMs })).to.be.true;
  });

  it('returns false for invalid expiration values', () => {
    expect(isTokenValid({ expiresAt: 'not-a-date' })).to.be.false;
    expect(isTokenValid(undefined)).to.be.false;
  });
});
