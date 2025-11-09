/**
 * Module: src/performance.ts
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
 * Performance monitoring and optimization utilities
 * Tracks metrics, provides performance insights, and optimizes operations
 */

import { performance } from 'perf_hooks';
import { getCacheStats } from './cache.js';

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  memoryUsage?: number;
  cacheHit?: boolean;
  error?: string;
}

export interface PerformanceStats {
  totalOperations: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  errorRate: number;
  cacheHitRate: number;
  memoryUsage: {
    current: number;
    peak: number;
    average: number;
  };
}

export interface MemoryUsage {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 1000;
  private memoryPeak = 0;
  private isEnabled = true;

  /**
   * Start timing an operation
   */
  startTiming(operation: string): () => PerformanceMetrics {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    return (error?: string, cacheHit?: boolean): PerformanceMetrics => {
      const endTime = performance.now();
      const endMemory = this.getMemoryUsage();

      const metric: PerformanceMetrics = {
        operation,
        duration: endTime - startTime,
        timestamp: Date.now(),
        memoryUsage: endMemory.heapUsed - startMemory.heapUsed,
        cacheHit,
        error,
      };

      this.recordMetric(metric);
      return metric;
    };
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetrics): void {
    if (!this.isEnabled) return;

    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Update memory peak
    if (metric.memoryUsage && metric.memoryUsage > this.memoryPeak) {
      this.memoryPeak = metric.memoryUsage;
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): PerformanceStats {
    if (this.metrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        errorRate: 0,
        cacheHitRate: 0,
        memoryUsage: {
          current: this.getMemoryUsage().heapUsed,
          peak: this.memoryPeak,
          average: 0,
        },
      };
    }

    const durations = this.metrics.map((m) => m.duration);
    const errors = this.metrics.filter((m) => m.error).length;
    const cacheHits = this.metrics.filter((m) => m.cacheHit === true).length;
    const memoryUsages = this.metrics
      .filter((m) => m.memoryUsage !== undefined)
      .map((m) => m.memoryUsage!);

    return {
      totalOperations: this.metrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      errorRate: errors / this.metrics.length,
      cacheHitRate: cacheHits / this.metrics.length,
      memoryUsage: {
        current: this.getMemoryUsage().heapUsed,
        peak: this.memoryPeak,
        average:
          memoryUsages.length > 0
            ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length
            : 0,
      },
    };
  }

  /**
   * Get metrics for a specific operation
   */
  getOperationStats(operation: string): PerformanceStats {
    const operationMetrics = this.metrics.filter((m) => m.operation === operation);

    if (operationMetrics.length === 0) {
      return this.getStats();
    }

    const durations = operationMetrics.map((m) => m.duration);
    const errors = operationMetrics.filter((m) => m.error).length;
    const cacheHits = operationMetrics.filter((m) => m.cacheHit === true).length;

    return {
      totalOperations: operationMetrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      errorRate: errors / operationMetrics.length,
      cacheHitRate: cacheHits / operationMetrics.length,
      memoryUsage: {
        current: this.getMemoryUsage().heapUsed,
        peak: this.memoryPeak,
        average: 0,
      },
    };
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(count: number = 50): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.memoryPeak = 0;
  }

  /**
   * Enable or disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): MemoryUsage {
    return process.memoryUsage();
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport(): {
    stats: PerformanceStats;
    cacheStats: ReturnType<typeof getCacheStats>;
    memoryUsage: MemoryUsage;
    recommendations: string[];
  } {
    const stats = this.getStats();
    const cacheStats = getCacheStats();
    const memoryUsage = this.getMemoryUsage();
    const recommendations: string[] = [];

    // Performance recommendations
    if (stats.averageDuration > 1000) {
      recommendations.push('Consider optimizing slow operations (>1s average)');
    }

    if (stats.errorRate > 0.1) {
      recommendations.push('High error rate detected - investigate error handling');
    }

    if (stats.cacheHitRate < 0.5) {
      recommendations.push('Low cache hit rate - consider improving caching strategy');
    }

    if (memoryUsage.heapUsed > 100 * 1024 * 1024) {
      // 100MB
      recommendations.push('High memory usage - consider memory optimization');
    }

    if (cacheStats.totalMemoryUsage > 50 * 1024 * 1024) {
      // 50MB
      recommendations.push('Cache memory usage is high - consider reducing cache size');
    }

    return {
      stats,
      cacheStats,
      memoryUsage,
      recommendations,
    };
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Performance decorator for methods
 */
export function measurePerformance(operationName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const endTiming = performanceMonitor.startTiming(`${operationName}.${propertyName}`);

      try {
        const result = await method.apply(this, args);
        endTiming();
        return result;
      } catch (error) {
        endTiming(error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
    };
  };
}

/**
 * Utility function to measure async operations
 */
export async function measureAsync<T>(
  operation: string,
  fn: () => Promise<T>,
  cacheHit?: boolean
): Promise<T> {
  const endTiming = performanceMonitor.startTiming(operation);

  try {
    const result = await fn();
    endTiming(undefined, cacheHit);
    return result;
  } catch (error) {
    endTiming(error instanceof Error ? error.message : 'Unknown error', cacheHit);
    throw error;
  }
}

/**
 * Utility function to measure sync operations
 */
export function measureSync<T>(operation: string, fn: () => T, cacheHit?: boolean): T {
  const endTiming = performanceMonitor.startTiming(operation);

  try {
    const result = fn();
    endTiming(undefined, cacheHit);
    return result;
  } catch (error) {
    endTiming(error instanceof Error ? error.message : 'Unknown error', cacheHit);
    throw error;
  }
}

/**
 * Debounce function with performance tracking
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  operation: string = 'debounced'
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      measureSync(operation, () => func(...args));
    }, wait);
  };
}

/**
 * Throttle function with performance tracking
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
  operation: string = 'throttled'
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      measureSync(operation, () => func(...args));
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memory usage utilities
 */
export class MemoryOptimizer {
  private static readonly GC_THRESHOLD = 50 * 1024 * 1024; // 50MB
  private static lastGC = 0;
  private static readonly GC_INTERVAL = 30000; // 30 seconds

  /**
   * Force garbage collection if needed
   */
  static forceGCIfNeeded(): boolean {
    const memoryUsage = performanceMonitor.getMemoryUsage();
    const now = Date.now();

    if (memoryUsage.heapUsed > this.GC_THRESHOLD && now - this.lastGC > this.GC_INTERVAL) {
      if (global.gc) {
        global.gc();
        this.lastGC = now;
        return true;
      }
    }

    return false;
  }

  /**
   * Get memory usage summary
   */
  static getMemorySummary(): {
    current: MemoryUsage;
    peak: number;
    recommendations: string[];
  } {
    const current = performanceMonitor.getMemoryUsage();
    const peak = performanceMonitor.getStats().memoryUsage.peak;
    const recommendations: string[] = [];

    if (current.heapUsed > 100 * 1024 * 1024) {
      // 100MB
      recommendations.push('Consider reducing memory usage');
    }

    if (current.external > 50 * 1024 * 1024) {
      // 50MB
      recommendations.push('High external memory usage - check for memory leaks');
    }

    return {
      current,
      peak,
      recommendations,
    };
  }
}

/**
 * Performance optimization utilities
 */
export class PerformanceOptimizer {
  /**
   * Optimize work item loading with batching
   */
  static async batchWorkItems<T>(
    items: T[],
    batchSize: number = 50,
    processor: (batch: T[]) => Promise<any[]>
  ): Promise<any[]> {
    const results: any[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await measureAsync(`batchWorkItems.${batchSize}`, () =>
        processor(batch)
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Optimize API calls with request batching
   */
  static async batchApiCalls<T>(
    calls: (() => Promise<T>)[],
    concurrency: number = 5
  ): Promise<T[]> {
    const results: T[] = [];

    for (let i = 0; i < calls.length; i += concurrency) {
      const batch = calls.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((call) => measureAsync('batchApiCall', call))
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Optimize data processing with chunking
   */
  static processInChunks<T, R>(
    data: T[],
    chunkSize: number = 1000,
    processor: (chunk: T[]) => R[]
  ): R[] {
    const results: R[] = [];

    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const chunkResults = measureSync(`processInChunks.${chunkSize}`, () => processor(chunk));
      results.push(...chunkResults);
    }

    return results;
  }
}
