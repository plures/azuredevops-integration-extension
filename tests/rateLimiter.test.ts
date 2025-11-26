import { RateLimiter } from '../src/rateLimiter.ts';
import { expect } from 'chai';
import { describe, it } from 'vitest';

describe('RateLimiter', () => {
  it('allows immediate burst up to capacity then throttles', async () => {
    const limiter = new RateLimiter(5, 5); // 5 tokens/sec, burst 5
    const start = Date.now();
    let acquired = 0;
    // Acquire 5 immediately
    for (let i = 0; i < 5; i++) {
      await limiter.acquire();
      acquired++;
    }
    // Next acquire should wait roughly >= 180ms (since 5 rps => 200ms per token) allow some jitter
    await limiter.acquire();
    const elapsed = Date.now() - start;
    expect(acquired).to.equal(5);
    expect(elapsed).to.be.greaterThan(150); // allow timing variance
  }, 4000);

  it('refills over time', async () => {
    const limiter = new RateLimiter(2, 2); // 2 rps
    await limiter.acquire();
    await limiter.acquire(); // bucket empty now
    const t0 = Date.now();
    await limiter.acquire(); // waits ~500ms
    const dt = Date.now() - t0;
    expect(dt).to.be.greaterThan(200);
  }, 4000);
});
