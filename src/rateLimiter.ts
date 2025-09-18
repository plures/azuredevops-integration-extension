/**
 * Simple adaptive rate limiter + retry helper for Azure DevOps API.
 * Token bucket w/ refill + queue. Burst allowed up to `burst` then sustained `ratePerSecond`.
 */
export class RateLimiter {
  private tokens: number;
  private readonly queue: Array<() => void> = [];
  private lastRefill: number;
  private timer: NodeJS.Timeout | null = null;

  constructor(private ratePerSecond: number, private burst: number) {
    // Initialize token bucket at full burst capacity (uses burst param)
    this.tokens = burst;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    if (elapsed <= 0) return;
    this.lastRefill = now;
    this.tokens = Math.min(this.burst, this.tokens + elapsed * this.ratePerSecond);
  }

  private scheduleDrain() {
    if (this.timer || this.queue.length === 0) return;
    const delay = 50; // 20Hz check
    this.timer = setTimeout(() => {
      this.timer = null;
      this.refill();
      while (this.queue.length && this.tokens >= 1) {
        this.tokens -= 1;
        const resolve = this.queue.shift();
        resolve && resolve();
      }
      if (this.queue.length) this.scheduleDrain();
    }, delay);
  }

  acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1 && this.queue.length === 0) {
      this.tokens -= 1;
      return Promise.resolve();
    }
    return new Promise((res) => {
      this.queue.push(res);
      this.scheduleDrain();
    });
  }
}

export interface RetryOptions {
  retries?: number; // total attempts (default 4)
  baseDelayMs?: number; // initial backoff (default 250)
  maxDelayMs?: number; // cap (default 4000)
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  isRetryable: (err: any) => boolean,
  opts: RetryOptions = {}
): Promise<T> {
  const { retries = 4, baseDelayMs = 250, maxDelayMs = 4000 } = opts;
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      // If not retryable or attempts exhausted, rethrow immediately
      if (attempt > retries || !isRetryable(err)) throw err;
      const backoff = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
      const jitter = Math.random() * (backoff * 0.25);
      const sleep = backoff + jitter;
      await new Promise((r) => setTimeout(r, sleep));
    }
  }
}
