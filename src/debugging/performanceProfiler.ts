/**
 * Performance Profiler
 * 
 * Tracks and analyzes state transition performance.
 */

import type { ApplicationEngineContext } from '../praxis/application/engine.js';
import { history } from '../webview/praxis/store.js';
import type { HistoryEntry } from '@plures/praxis/svelte';

/**
 * Performance metrics for a single transition
 */
export interface TransitionMetrics {
  from: string;
  to: string;
  duration: number; // milliseconds
  eventCount: number;
  contextSize: number; // bytes (JSON stringified)
  timestamp: number;
  label?: string;
}

/**
 * Performance profile summary
 */
export interface PerformanceProfile {
  transitions: TransitionMetrics[];
  summary: {
    totalTransitions: number;
    averageTransitionTime: number;
    slowestTransitions: TransitionMetrics[];
    fastestTransitions: TransitionMetrics[];
    totalDuration: number;
    averageContextSize: number;
  };
}

/**
 * Performance Profiler
 * 
 * Analyzes state transition performance from history.
 */
export class PerformanceProfiler {
  /**
   * Profile history and return performance metrics
   */
  static profileHistory(): PerformanceProfile {
    const entries = history.getHistory();
    
    if (entries.length < 2) {
      return {
        transitions: [],
        summary: {
          totalTransitions: 0,
          averageTransitionTime: 0,
          slowestTransitions: [],
          fastestTransitions: [],
          totalDuration: 0,
          averageContextSize: 0,
        },
      };
    }
    
    const transitions: TransitionMetrics[] = [];
    
    // Calculate metrics for each transition
    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i - 1];
      const curr = entries[i];
      
      const duration = curr.timestamp - prev.timestamp;
      const from = prev.state.state;
      const to = curr.state.state;
      const eventCount = curr.events?.length || 0;
      const contextSize = JSON.stringify(curr.state.context).length;
      
      transitions.push({
        from,
        to,
        duration,
        eventCount,
        contextSize,
        timestamp: curr.timestamp,
        label: curr.label,
      });
    }
    
    // Calculate summary statistics
    const totalDuration = transitions.reduce((sum, t) => sum + t.duration, 0);
    const averageTransitionTime = transitions.length > 0 
      ? totalDuration / transitions.length 
      : 0;
    const averageContextSize = transitions.length > 0
      ? transitions.reduce((sum, t) => sum + t.contextSize, 0) / transitions.length
      : 0;
    
    // Find slowest and fastest transitions
    const sortedByDuration = [...transitions].sort((a, b) => b.duration - a.duration);
    const slowestTransitions = sortedByDuration.slice(0, 10);
    const fastestTransitions = sortedByDuration.slice(-10).reverse();
    
    return {
      transitions,
      summary: {
        totalTransitions: transitions.length,
        averageTransitionTime,
        slowestTransitions,
        fastestTransitions,
        totalDuration,
        averageContextSize,
      },
    };
  }
  
  /**
   * Get slow transitions (above threshold)
   */
  static getSlowTransitions(thresholdMs: number = 100): TransitionMetrics[] {
    const profile = this.profileHistory();
    return profile.transitions.filter(t => t.duration > thresholdMs);
  }
  
  /**
   * Get transitions by state
   */
  static getTransitionsByState(state: string): TransitionMetrics[] {
    const profile = this.profileHistory();
    return profile.transitions.filter(t => t.from === state || t.to === state);
  }
  
  /**
   * Get average transition time for a specific state transition
   */
  static getAverageTransitionTime(from: string, to: string): number {
    const profile = this.profileHistory();
    const matching = profile.transitions.filter(t => t.from === from && t.to === to);
    
    if (matching.length === 0) return 0;
    
    return matching.reduce((sum, t) => sum + t.duration, 0) / matching.length;
  }
  
  /**
   * Format performance profile for display
   */
  static formatProfile(profile: PerformanceProfile): string {
    const lines: string[] = [];
    
    lines.push('Performance Profile');
    lines.push('='.repeat(50));
    lines.push('');
    lines.push(`Total Transitions: ${profile.summary.totalTransitions}`);
    lines.push(`Average Transition Time: ${profile.summary.averageTransitionTime.toFixed(2)}ms`);
    lines.push(`Total Duration: ${profile.summary.totalDuration.toFixed(2)}ms`);
    lines.push(`Average Context Size: ${(profile.summary.averageContextSize / 1024).toFixed(2)}KB`);
    lines.push('');
    
    if (profile.summary.slowestTransitions.length > 0) {
      lines.push('Slowest Transitions:');
      lines.push('-'.repeat(50));
      for (const transition of profile.summary.slowestTransitions) {
        lines.push(
          `  ${transition.from} → ${transition.to}: ${transition.duration.toFixed(2)}ms ` +
          `(${transition.eventCount} events, ${(transition.contextSize / 1024).toFixed(2)}KB)`
        );
        if (transition.label) {
          lines.push(`    Label: ${transition.label}`);
        }
      }
      lines.push('');
    }
    
    if (profile.summary.fastestTransitions.length > 0) {
      lines.push('Fastest Transitions:');
      lines.push('-'.repeat(50));
      for (const transition of profile.summary.fastestTransitions) {
        lines.push(
          `  ${transition.from} → ${transition.to}: ${transition.duration.toFixed(2)}ms ` +
          `(${transition.eventCount} events)`
        );
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * Export performance data as JSON
   */
  static exportProfile(): string {
    const profile = this.profileHistory();
    return JSON.stringify(profile, null, 2);
  }
}

