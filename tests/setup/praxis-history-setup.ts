/**
 * Praxis History Testing Setup
 *
 * Setup file for Vitest to configure Praxis history testing.
 * This file is automatically loaded by Vitest before tests run.
 */

import { expect } from 'vitest';
import {
  setupPraxisHistoryTesting,
  createMatchers,
} from '../../src/testing/vitest-plugin-praxis-history.js';
import { beforeEach, afterEach } from 'vitest';

// Setup Praxis history testing
const praxisHistory = setupPraxisHistoryTesting({
  exportOnFailure: true,
  artifactsDir: 'test-artifacts',
  maxHistorySize: 100,
  autoReset: true,
});

// Register custom matchers
const matchers = createMatchers();
expect.extend({
  toHaveStateTransition(received: any, from: string, to: string) {
    return matchers.toHaveStateTransition(received, from, to);
  },
  toHaveHistoryLength(received: any, expected: number) {
    return matchers.toHaveHistoryLength(received, expected);
  },
  toHaveState(received: any, expected: string) {
    return matchers.toHaveState(received, expected);
  },
});

// Auto-reset history before each test
beforeEach(() => {
  praxisHistory.reset();
});

// Export history on test failure
afterEach((test) => {
  if (test.result?.status === 'failed') {
    const testName = test.name || 'unknown-test';
    praxisHistory.exportHistory(testName);
  }
});

// Export utilities for use in tests
export { praxisHistory };
