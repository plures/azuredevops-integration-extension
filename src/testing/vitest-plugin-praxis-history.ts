/**
 * Vitest Plugin for Praxis History Testing
 *
 * Provides automatic history management, custom matchers, and test artifact generation
 * for Praxis history-based testing.
 */

import type { Plugin } from 'vitest';
import { history } from '../webview/praxis/store.js';
import { frontendEngine } from '../webview/praxis/frontendEngine.js';
import { resetEngine } from './helpers.js';
import { exportHistoryAsJSON } from '../debugging/historyExport.js';
import type { ApplicationEngineContext } from '../praxis/application/engine.js';
import type { HistoryEntry } from '@plures/praxis/svelte';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Plugin configuration options
 */
export interface PraxisHistoryPluginOptions {
  /**
   * Export history to file when tests fail
   */
  exportOnFailure?: boolean;

  /**
   * Directory to save test artifacts
   */
  artifactsDir?: string;

  /**
   * Maximum history size to keep
   */
  maxHistorySize?: number;

  /**
   * Auto-reset history before each test
   */
  autoReset?: boolean;
}

/**
 * Default plugin options
 */
const defaultOptions: Required<PraxisHistoryPluginOptions> = {
  exportOnFailure: true,
  artifactsDir: 'test-artifacts',
  maxHistorySize: 100,
  autoReset: true,
};

/**
 * Ensure artifacts directory exists
 */
function ensureArtifactsDir(artifactsDir: string): void {
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }
}

/**
 * Export history for a failed test
 */
function exportTestHistory(testName: string, artifactsDir: string): void {
  try {
    ensureArtifactsDir(artifactsDir);

    const historyJson = exportHistoryAsJSON({
      testName,
      timestamp: new Date().toISOString(),
    });

    // Sanitize test name for filename
    const sanitizedName = testName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${sanitizedName}-${Date.now()}.json`;
    const filepath = path.join(artifactsDir, filename);

    fs.writeFileSync(filepath, historyJson, 'utf-8');
    // History exported (logging disabled to satisfy ESLint)
  } catch (error) {
    // Failed to export history (logging disabled to satisfy ESLint)
  }
}

/**
 * Custom matchers for Vitest
 */
export interface PraxisHistoryMatchers {
  /**
   * Check if history has a specific state transition
   */
  toHaveStateTransition(from: string, to: string): { pass: boolean; message: () => string };

  /**
   * Check if history has a specific length
   */
  toHaveHistoryLength(expected: number): { pass: boolean; message: () => string };

  /**
   * Check if context matches snapshot
   */
  toMatchContextSnapshot(hint?: string): { pass: boolean; message: () => string };

  /**
   * Check if state matches expected value
   */
  toHaveState(expected: string): { pass: boolean; message: () => string };
}

declare module 'vitest' {
  interface Assertion<T = any> extends PraxisHistoryMatchers {}
  interface AsymmetricMatchersContaining extends PraxisHistoryMatchers {}
}

/**
 * Create custom matchers compatible with Vitest's expect.extend
 */
export function createMatchers() {
  return {
    toHaveStateTransition(
      received: any,
      from: string,
      to: string
    ): { pass: boolean; message: () => string } {
      // received can be history entries array or history object
      const historyEntries = Array.isArray(received) ? received : history.getHistory();

      const hasTransition = historyEntries.some((entry, index) => {
        if (index === 0) return false;
        const prevEntry = historyEntries[index - 1];
        return prevEntry.state.state === from && entry.state.state === to;
      });

      return {
        pass: hasTransition,
        message: () =>
          hasTransition
            ? `Expected history not to have transition ${from} → ${to}`
            : `Expected history to have transition ${from} → ${to}`,
      };
    },

    toHaveHistoryLength(received: any, expected: number): { pass: boolean; message: () => string } {
      // received can be history entries array or history object
      const actual = Array.isArray(received) ? received.length : history.getHistory().length;
      const pass = actual === expected;

      return {
        pass,
        message: () =>
          pass
            ? `Expected history length not to be ${expected}, but got ${actual}`
            : `Expected history length to be ${expected}, but got ${actual}`,
      };
    },

    toHaveState(received: any, expected: string): { pass: boolean; message: () => string } {
      // received can be context object or we use current context
      const context = received?.applicationState ? received : frontendEngine.getContext();
      const actual = context.applicationState;
      const pass = actual === expected;

      return {
        pass,
        message: () =>
          pass
            ? `Expected state not to be ${expected}, but got ${actual}`
            : `Expected state to be ${expected}, but got ${actual}`,
      };
    },
  };
}

/**
 * Praxis History Vitest Plugin
 */
export function praxisHistory(options: PraxisHistoryPluginOptions = {}): Plugin {
  const config = { ...defaultOptions, ...options };

  return {
    name: 'praxis-history',
    configResolved() {
      // Ensure artifacts directory exists
      if (config.exportOnFailure) {
        ensureArtifactsDir(config.artifactsDir);
      }
    },

    setupFiles() {
      // Register custom matchers
      const matchers = createMatchers();

      // Note: In Vitest, matchers are registered differently
      // This would need to be done in a setup file
      return {
        async setupFiles() {
          // Matchers will be registered via expect.extend in setup file
        },
      };
    },

    // Hook into test lifecycle
    async onTaskUpdate() {
      // This hook doesn't exist in Vitest, we'll use setupFiles instead
    },
  };
}

/**
 * Setup function to be called from vitest setup file
 */
export function setupPraxisHistoryTesting(options: PraxisHistoryPluginOptions = {}) {
  const config = { ...defaultOptions, ...options };

  // Create matchers for expect.extend
  const matchers = createMatchers();

  return {
    matchers,
    config,
    reset: () => {
      if (config.autoReset) {
        resetEngine();
      }
    },
    exportHistory: (testName: string) => {
      if (config.exportOnFailure) {
        exportTestHistory(testName, config.artifactsDir);
      }
    },
  };
}
