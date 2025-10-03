/**
 * Useful TypeScript Code Snippets for VS Code Extensions and Azure DevOps Integration
 */

// ============================================================================
// SNIPPET 1: Error Handling Wrapper
// ============================================================================
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  logger?: (message: string) => void
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fullMessage = `${errorMessage}: ${message}`;

    if (logger) {
      logger(fullMessage);
    } else {
      console.error(fullMessage);
    }

    return null;
  }
}

// Usage example:
// const result = await withErrorHandling(
//     () => azureClient.getWorkItems(),
//     'Failed to fetch work items'
// );

// ============================================================================
// SNIPPET 2: Rate Limiter Class
// ============================================================================
export class RateLimiter {
  private queue: Array<() => void> = [];
  private running = false;
  private lastRequestTime = 0;

  constructor(
    private requestsPerSecond: number,
    private maxQueueSize = 100
  ) {}

  async acquire(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.queue.length >= this.maxQueueSize) {
        reject(new Error('Rate limiter queue is full'));
        return;
      }

      this.queue.push(resolve);
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.running || this.queue.length === 0) return;

    this.running = true;
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 1000 / this.requestsPerSecond;

    const delay = Math.max(0, minInterval - timeSinceLastRequest);

    setTimeout(() => {
      const resolve = this.queue.shift();
      this.lastRequestTime = Date.now();
      this.running = false;

      resolve?.();

      if (this.queue.length > 0) {
        this.processQueue();
      }
    }, delay);
  }
}

// Usage example:
// const rateLimiter = new RateLimiter(5); // 5 requests per second
// await rateLimiter.acquire();

// ============================================================================
// SNIPPET 3: Configuration Validator
// ============================================================================
interface ValidationRule<T> {
  validate: (value: T) => boolean;
  message: string;
}

export class ConfigValidator<T extends Record<string, any>> {
  private rules: Map<keyof T, ValidationRule<any>[]> = new Map();

  addRule<K extends keyof T>(field: K, validate: (value: T[K]) => boolean, message: string): this {
    if (!this.rules.has(field)) {
      this.rules.set(field, []);
    }
    this.rules.get(field)!.push({ validate, message });
    return this;
  }

  validate(config: T): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [field, rules] of this.rules) {
      const value = config[field];

      for (const rule of rules) {
        if (!rule.validate(value)) {
          errors.push(`${String(field)}: ${rule.message}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Usage example:
// const validator = new ConfigValidator<{ pat: string; org: string }>()
//     .addRule('pat', (val) => typeof val === 'string' && val.length > 0, 'PAT is required')
//     .addRule('org', (val) => typeof val === 'string' && val.length > 0, 'Organization is required');

// ============================================================================
// SNIPPET 4: Retry with Exponential Backoff
// ============================================================================
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
  maxDelay = 10000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 1000, maxDelay);

      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Usage example:
// const data = await retryWithBackoff(
//     () => fetch('/api/data').then(r => r.json()),
//     3, // max retries
//     1000, // base delay (1 second)
//     5000  // max delay (5 seconds)
// );

// ============================================================================
// SNIPPET 5: Event Emitter with TypeScript
// ============================================================================
type EventMap = Record<string, any>;

export class TypedEventEmitter<T extends EventMap> {
  private listeners: Map<keyof T, Array<(data: T[keyof T]) => void>> = new Map();

  on<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off<K extends keyof T>(event: K, listener: (data: T[K]) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit<K extends keyof T>(event: K, data: T[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Event listener error for '${String(event)}':`, error);
        }
      });
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}

// Usage example:
// interface AppEvents {
//     'work-item-updated': { id: number; title: string };
//     'error': { message: string };
// }
// const emitter = new TypedEventEmitter<AppEvents>();
// emitter.on('work-item-updated', (data) => console.log(data.title));

// ============================================================================
// SNIPPET 6: Disposable Resource Manager
// ============================================================================
export class DisposableManager {
  private disposables: Array<{ dispose(): void }> = [];

  add<T extends { dispose(): void }>(disposable: T): T {
    this.disposables.push(disposable);
    return disposable;
  }

  addCallback(callback: () => void): void {
    this.disposables.push({ dispose: callback });
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      try {
        disposable.dispose();
      } catch (error) {
        console.error('Error disposing resource:', error);
      }
    }
    this.disposables.length = 0;
  }
}

// Usage example:
// const manager = new DisposableManager();
// manager.add(vscode.commands.registerCommand('test', () => {}));
// manager.addCallback(() => console.log('cleanup'));

// ============================================================================
// SNIPPET 7: Debounced Function
// ============================================================================
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | undefined;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

// Usage example:
// const debouncedSave = debounce(() => saveDocument(), 500);

// ============================================================================
// SNIPPET 8: Cache with TTL
// ============================================================================
interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export class TTLCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();

  constructor(private defaultTTL: number = 300000) {} // 5 minutes default

  set(key: K, value: V, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) return undefined;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Usage example:
// const cache = new TTLCache<string, any>(60000); // 1 minute TTL
// cache.set('user:123', userData);

// ============================================================================
// SNIPPET 9: Promise Pool for Concurrent Operations
// ============================================================================
export class PromisePool {
  constructor(private concurrency: number = 5) {}

  async run<T>(
    tasks: Array<() => Promise<T>>
  ): Promise<Array<{ result?: T; error?: Error; index: number }>> {
    const results: Array<{ result?: T; error?: Error; index: number }> = [];
    const executing: Promise<void>[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];

      const promise = this.executeTask(task, i, results);
      executing.push(promise);

      if (executing.length >= this.concurrency) {
        await Promise.race(executing);
        // Remove completed promises
        for (let j = executing.length - 1; j >= 0; j--) {
          if (await this.isPromiseResolved(executing[j])) {
            executing.splice(j, 1);
          }
        }
      }
    }

    await Promise.all(executing);
    return results.sort((a, b) => a.index - b.index);
  }

  private async executeTask<T>(
    task: () => Promise<T>,
    index: number,
    results: Array<{ result?: T; error?: Error; index: number }>
  ): Promise<void> {
    try {
      const result = await task();
      results.push({ result, index });
    } catch (error) {
      results.push({
        error: error instanceof Error ? error : new Error(String(error)),
        index,
      });
    }
  }

  private async isPromiseResolved(promise: Promise<void>): Promise<boolean> {
    try {
      await Promise.race([promise, Promise.resolve()]);
      return true;
    } catch {
      return true; // Promise rejected, which means it's resolved
    }
  }
}

// Usage example:
// const pool = new PromisePool(3); // max 3 concurrent operations
// const tasks = urls.map(url => () => fetch(url));
// const results = await pool.run(tasks);
