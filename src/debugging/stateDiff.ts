/**
 * State Diff Utilities
 * 
 * Provides utilities for comparing and visualizing differences between state snapshots.
 */

import type { ApplicationEngineContext } from '../praxis/application/engine.js';

/**
 * Result of a state diff operation
 */
export interface StateDiff {
  added: Record<string, any>;
  removed: Record<string, any>;
  changed: Record<string, { from: any; to: any }>;
  unchanged: Record<string, any>;
  summary: {
    totalFields: number;
    addedCount: number;
    removedCount: number;
    changedCount: number;
    unchangedCount: number;
  };
}

/**
 * Options for diffing states
 */
export interface DiffOptions {
  ignoreFields?: string[];
  deep?: boolean;
  includeUnchanged?: boolean;
}

/**
 * Compare two state snapshots and return differences
 */
export function diffStates(
  from: ApplicationEngineContext,
  to: ApplicationEngineContext,
  options: DiffOptions = {}
): StateDiff {
  const {
    ignoreFields = [],
    deep = true,
    includeUnchanged = false,
  } = options;
  
  const ignoreSet = new Set(ignoreFields);
  const diff: StateDiff = {
    added: {},
    removed: {},
    changed: {},
    unchanged: {},
  };
  
  // Get all keys from both objects
  const allKeys = new Set([
    ...Object.keys(from),
    ...Object.keys(to),
  ]);
  
  for (const key of allKeys) {
    if (ignoreSet.has(key)) {
      continue;
    }
    
    const fromValue = (from as any)[key];
    const toValue = (to as any)[key];
    
    if (!(key in from)) {
      diff.added[key] = toValue;
    } else if (!(key in to)) {
      diff.removed[key] = fromValue;
    } else {
      const isEqual = deep ? deepEqual(fromValue, toValue) : fromValue === toValue;
      
      if (isEqual) {
        if (includeUnchanged) {
          diff.unchanged[key] = fromValue;
        }
      } else {
        diff.changed[key] = { from: fromValue, to: toValue };
      }
    }
  }
  
  diff.summary = {
    totalFields: allKeys.size - ignoreSet.size,
    addedCount: Object.keys(diff.added).length,
    removedCount: Object.keys(diff.removed).length,
    changedCount: Object.keys(diff.changed).length,
    unchangedCount: Object.keys(diff.unchanged).length,
  };
  
  return diff;
}

/**
 * Deep equality check
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return false;
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a !== 'object') return a === b;
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
}

/**
 * Format diff for display
 */
export function formatDiff(diff: StateDiff, options?: { maxDepth?: number }): string {
  const maxDepth = options?.maxDepth || 3;
  const lines: string[] = [];
  
  lines.push('State Diff Summary:');
  lines.push(`  Total fields: ${diff.summary.totalFields}`);
  lines.push(`  Added: ${diff.summary.addedCount}`);
  lines.push(`  Removed: ${diff.summary.removedCount}`);
  lines.push(`  Changed: ${diff.summary.changedCount}`);
  lines.push(`  Unchanged: ${diff.summary.unchangedCount}`);
  lines.push('');
  
  if (diff.summary.addedCount > 0) {
    lines.push('Added Fields:');
    for (const [key, value] of Object.entries(diff.added)) {
      lines.push(`  + ${key}: ${formatValue(value, maxDepth)}`);
    }
    lines.push('');
  }
  
  if (diff.summary.removedCount > 0) {
    lines.push('Removed Fields:');
    for (const [key, value] of Object.entries(diff.removed)) {
      lines.push(`  - ${key}: ${formatValue(value, maxDepth)}`);
    }
    lines.push('');
  }
  
  if (diff.summary.changedCount > 0) {
    lines.push('Changed Fields:');
    for (const [key, change] of Object.entries(diff.changed)) {
      lines.push(`  ~ ${key}:`);
      lines.push(`    From: ${formatValue(change.from, maxDepth)}`);
      lines.push(`    To:   ${formatValue(change.to, maxDepth)}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Format a value for display
 */
function formatValue(value: any, maxDepth: number, currentDepth: number = 0): string {
  if (currentDepth >= maxDepth) {
    return '...';
  }
  
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      if (value.length > 3) {
        return `[${value.slice(0, 3).map(v => formatValue(v, maxDepth, currentDepth + 1)).join(', ')}, ...]`;
      }
      return `[${value.map(v => formatValue(v, maxDepth, currentDepth + 1)).join(', ')}]`;
    }
    
    if (value instanceof Map) {
      if (value.size === 0) return 'Map {}';
      const entries = Array.from(value.entries()).slice(0, 3);
      const formatted = entries.map(([k, v]) => 
        `${formatValue(k, maxDepth, currentDepth + 1)}: ${formatValue(v, maxDepth, currentDepth + 1)}`
      ).join(', ');
      return value.size > 3 ? `Map { ${formatted}, ... }` : `Map { ${formatted} }`;
    }
    
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    if (keys.length > 3) {
      const preview = keys.slice(0, 3).map(k => 
        `${k}: ${formatValue(value[k], maxDepth, currentDepth + 1)}`
      ).join(', ');
      return `{ ${preview}, ... }`;
    }
    return `{ ${keys.map(k => `${k}: ${formatValue(value[k], maxDepth, currentDepth + 1)}`).join(', ')} }`;
  }
  
  return String(value);
}

/**
 * Get a human-readable summary of changes
 */
export function getDiffSummary(diff: StateDiff): string {
  const parts: string[] = [];
  
  if (diff.summary.addedCount > 0) {
    parts.push(`${diff.summary.addedCount} added`);
  }
  if (diff.summary.removedCount > 0) {
    parts.push(`${diff.summary.removedCount} removed`);
  }
  if (diff.summary.changedCount > 0) {
    parts.push(`${diff.summary.changedCount} changed`);
  }
  
  if (parts.length === 0) {
    return 'No changes';
  }
  
  return parts.join(', ');
}

