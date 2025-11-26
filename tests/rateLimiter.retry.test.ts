import { expect } from 'chai';
import { describe, it } from 'vitest';
import { withRetry } from '../src/rateLimiter.ts';

describe('withRetry helper', () => {
  it('retries until success', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts < 3) throw new Error('fail');
      return 'ok';
    };
    const res = await withRetry(fn, () => true, { retries: 4, baseDelayMs: 10 });
    expect(res).to.equal('ok');
    expect(attempts).to.equal(3);
  }, 5000);

  it('throws after max retries', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      throw new Error('always');
    };
    try {
      await withRetry(fn, () => true, { retries: 2, baseDelayMs: 1 });
      throw new Error('should have thrown');
    } catch {
      expect(attempts).to.be.greaterThan(1);
    }
  }, 5000);
});
