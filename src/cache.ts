/**
 * Module: src/cache.ts
 * Owner: application
 * Reads: (document)
 * Writes: (document)
 * Receives: (document)
 * Emits: (document)
 * Prohibitions: Do not mutate ApplicationContext directly; Do not define new *Context types
 * Rationale: (document)
 *
 * LLM-GUARD:
 * - Follow ownership boundaries; route events to Router; do not add UI logic here
 */
/**
 * Intelligent caching system for Azure DevOps Integration
 * Provides memory-efficient caching with TTL, LRU eviction, and performance metrics
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
  hitRate: number;
}

export interface CacheOptions {
  maxSize?: number;
  defaultTtl?: number;
  enableMetrics?: boolean;
  evictionPolicy?: 'lru' | 'ttl' | 'both';
}

export class IntelligentCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private metrics: CacheMetrics;
  private options: Required<CacheOptions>;

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize ?? 1000,
      defaultTtl: options.defaultTtl ?? 300000, // 5 minutes
      enableMetrics: options.enableMetrics ?? true,
      evictionPolicy: options.evictionPolicy ?? 'both',
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      maxSize: this.options.maxSize,
      hitRate: 0,
    };
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(key);
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.updateAccessOrder(key);

    this.metrics.hits++;
    this.updateHitRate();
    return entry.data;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: now,
      ttl: ttl ?? this.options.defaultTtl,
      accessCount: 0,
      lastAccessed: now,
    };

    // Check if we need to evict
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evict();
    }

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
    this.metrics.size = this.cache.size;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      this.metrics.size = this.cache.size;
    }
    return deleted;
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.metrics.size = 0;
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get all keys in the cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics for debugging
   */
  getStats(): {
    metrics: CacheMetrics;
    topKeys: Array<{ key: string; accessCount: number; lastAccessed: number }>;
    memoryUsage: number;
  } {
    const topKeys = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed,
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    // Rough memory usage estimation
    const memoryUsage = this.cache.size * 100; // Rough estimate

    return {
      metrics: this.getMetrics(),
      topKeys,
      memoryUsage,
    };
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private updateAccessOrder(key: string): void {
    // Remove from current position
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }

    // Add to end (most recently accessed)
    this.accessOrder.push(key);
  }

  private evict(): void {
    if (this.cache.size === 0) return;

    let keyToEvict: string | null = null;

    switch (this.options.evictionPolicy) {
      case 'lru':
        keyToEvict = this.accessOrder[0]; // Least recently used
        break;
      case 'ttl': {
        // Find the oldest entry
        let oldestTime = Date.now();
        for (const [key, entry] of this.cache.entries()) {
          if (entry.timestamp < oldestTime) {
            oldestTime = entry.timestamp;
            keyToEvict = key;
          }
        }
        break;
      }
      case 'both': {
        // Use LRU for frequently accessed items, TTL for old items
        const now = Date.now();
        const oldThreshold = now - this.options.defaultTtl * 2;

        // First try to evict old items
        for (const [key, entry] of this.cache.entries()) {
          if (entry.timestamp < oldThreshold) {
            keyToEvict = key;
            break;
          }
        }

        // If no old items, use LRU
        if (!keyToEvict) {
          keyToEvict = this.accessOrder[0];
        }
        break;
      }
    }

    if (keyToEvict) {
      this.delete(keyToEvict);
      this.metrics.evictions++;
    }
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }
}

/**
 * Specialized cache for work items with optimized serialization
 */
export class WorkItemCache extends IntelligentCache<any> {
  private static readonly WORK_ITEM_TTL = 300000; // 5 minutes
  private static readonly QUERY_TTL = 600000; // 10 minutes
  private static readonly METADATA_TTL = 1800000; // 30 minutes

  constructor() {
    super({
      maxSize: 2000,
      defaultTtl: WorkItemCache.WORK_ITEM_TTL,
      enableMetrics: true,
      evictionPolicy: 'both',
    });
  }

  /**
   * Cache work items with appropriate TTL
   */
  setWorkItems(key: string, workItems: any[]): void {
    this.set(key, workItems, WorkItemCache.WORK_ITEM_TTL);
  }

  /**
   * Cache query results with longer TTL
   */
  setQueryResult(key: string, result: any): void {
    this.set(key, result, WorkItemCache.QUERY_TTL);
  }

  /**
   * Cache metadata with longest TTL
   */
  setMetadata(key: string, metadata: any): void {
    this.set(key, metadata, WorkItemCache.METADATA_TTL);
  }

  /**
   * Generate cache key for work items query
   */
  static generateWorkItemsKey(connectionId: string, query: string, filters: any): string {
    const filterStr = JSON.stringify(filters);
    return `workitems:${connectionId}:${Buffer.from(query + filterStr).toString('base64')}`;
  }

  /**
   * Generate cache key for query
   */
  static generateQueryKey(connectionId: string, query: string): string {
    return `query:${connectionId}:${Buffer.from(query).toString('base64')}`;
  }

  /**
   * Generate cache key for metadata
   */
  static generateMetadataKey(connectionId: string, type: string): string {
    return `metadata:${connectionId}:${type}`;
  }
}

/**
 * Global cache instances
 */
export const workItemCache = new WorkItemCache();
export const apiCache = new IntelligentCache({ maxSize: 500, defaultTtl: 300000 });
export const metadataCache = new IntelligentCache({ maxSize: 100, defaultTtl: 1800000 });

/**
 * Cache cleanup interval (5 minutes)
 */
let cleanupInterval: NodeJS.Timeout | null = null;

export function startCacheCleanup(): void {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    workItemCache.cleanup();
    apiCache.cleanup();
    metadataCache.cleanup();
  }, 300000); // 5 minutes
}

export function stopCacheCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/**
 * Get comprehensive cache statistics
 */
export function getCacheStats(): {
  workItems: ReturnType<WorkItemCache['getStats']>;
  api: ReturnType<IntelligentCache['getStats']>;
  metadata: ReturnType<IntelligentCache['getStats']>;
  totalMemoryUsage: number;
} {
  const workItemsStats = workItemCache.getStats();
  const apiStats = apiCache.getStats();
  const metadataStats = metadataCache.getStats();

  return {
    workItems: workItemsStats,
    api: apiStats,
    metadata: metadataStats,
    totalMemoryUsage: workItemsStats.memoryUsage + apiStats.memoryUsage + metadataStats.memoryUsage,
  };
}
