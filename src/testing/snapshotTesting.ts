/**
 * Snapshot Testing Utilities
 * 
 * Provides utilities for comparing state snapshots and detecting regressions.
 */

import type { ApplicationEngineContext } from '../praxis/application/engine.js';
import type { PraxisEvent } from '@plures/praxis';
import { history } from '../webview/praxis/store.js';
import { frontendEngine } from '../webview/praxis/frontendEngine.js';
import type { TestScenario } from './historyTestRecorder.js';

/**
 * A snapshot test that validates state at specific points
 */
export interface SnapshotTest {
  name: string;
  description?: string;
  events: PraxisEvent[];
  expectedSnapshots: Array<{
    index: number;
    state: string;
    contextChecks: (ctx: ApplicationEngineContext) => boolean;
    description?: string;
  }>;
}

/**
 * Result of a snapshot comparison
 */
export interface SnapshotComparison {
  match: boolean;
  differences: Array<{
    path: string;
    expected: any;
    actual: any;
  }>;
  summary: {
    totalFields: number;
    matchingFields: number;
    differentFields: number;
  };
}

/**
 * Create a snapshot test function
 */
export function createSnapshotTest(test: SnapshotTest) {
  return () => {
    // Reset to initial state
    const initialContext = getInitialContext();
    frontendEngine.updateContext(() => initialContext);
    history.clearHistory();
    
    // Apply events
    for (const event of test.events) {
      frontendEngine.step([event]);
    }
    
    // Verify snapshots
    const historyEntries = history.getHistory();
    
    for (const expected of test.expectedSnapshots) {
      const entry = historyEntries[expected.index];
      
      if (!entry) {
        throw new Error(
          `Snapshot test "${test.name}": Expected snapshot at index ${expected.index} but history only has ${historyEntries.length} entries`
        );
      }
      
      // Verify state
      if (entry.state.state !== expected.state) {
        throw new Error(
          `Snapshot test "${test.name}" at index ${expected.index}: Expected state "${expected.state}", got "${entry.state.state}"`
        );
      }
      
      // Verify context checks
      const contextCheckResult = expected.contextChecks(entry.state.context as ApplicationEngineContext);
      if (!contextCheckResult) {
        throw new Error(
          `Snapshot test "${test.name}" at index ${expected.index}: Context check failed${expected.description ? `: ${expected.description}` : ''}`
        );
      }
    }
  };
}

/**
 * Compare two state snapshots
 */
export function compareSnapshots(
  expected: ApplicationEngineContext,
  actual: ApplicationEngineContext,
  options?: {
    ignoreFields?: string[];
    deep?: boolean;
  }
): SnapshotComparison {
  const differences: SnapshotComparison['differences'] = [];
  const ignoreFields = new Set(options?.ignoreFields || []);
  
  // Get all keys from both objects
  const allKeys = new Set([
    ...Object.keys(expected),
    ...Object.keys(actual),
  ]);
  
  let matchingFields = 0;
  let differentFields = 0;
  
  for (const key of allKeys) {
    if (ignoreFields.has(key)) {
      continue;
    }
    
    const expectedValue = (expected as any)[key];
    const actualValue = (actual as any)[key];
    
    if (options?.deep) {
      // Deep comparison
      if (!deepEqual(expectedValue, actualValue)) {
        differences.push({
          path: key,
          expected: expectedValue,
          actual: actualValue,
        });
        differentFields++;
      } else {
        matchingFields++;
      }
    } else {
      // Shallow comparison
      if (JSON.stringify(expectedValue) !== JSON.stringify(actualValue)) {
        differences.push({
          path: key,
          expected: expectedValue,
          actual: actualValue,
        });
        differentFields++;
      } else {
        matchingFields++;
      }
    }
  }
  
  return {
    match: differences.length === 0,
    differences,
    summary: {
      totalFields: allKeys.size - ignoreFields.size,
      matchingFields,
      differentFields,
    },
  };
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
 * Get initial context for testing
 */
function getInitialContext(): ApplicationEngineContext {
  // Return a clean initial state
  return {
    applicationState: 'inactive',
    applicationData: {},
    timerHistory: { entries: [] },
    isActivated: false,
    isDeactivating: false,
    connections: [],
    viewMode: 'list',
    errorRecoveryAttempts: 0,
    debugLoggingEnabled: false,
    debugViewVisible: false,
    connectionStates: new Map(),
    connectionWorkItems: new Map(),
    connectionQueries: new Map(),
    connectionFilters: new Map(),
    connectionViewModes: new Map(),
    pendingAuthReminders: new Map(),
    workItems: [],
    activeQuery: null,
    timerState: null,
    lastError: null,
    kanbanColumns: [],
    workItemsError: null,
    workItemsErrorConnectionId: null,
    deviceCodeSession: null,
    authCodeFlowSession: null,
  };
}

/**
 * Validate that a scenario produces expected snapshots
 */
export function validateScenarioSnapshots(
  scenario: TestScenario,
  expectedSnapshots: SnapshotTest['expectedSnapshots']
): void {
  // Reset to initial state
  frontendEngine.updateContext(() => scenario.initialContext);
  history.clearHistory();
  
  // Replay events
  for (const eventData of scenario.events) {
    frontendEngine.step([eventData.event]);
  }
  
  // Verify snapshots
  const historyEntries = history.getHistory();
  
  for (const expected of expectedSnapshots) {
    const entry = historyEntries[expected.index];
    
    if (!entry) {
      throw new Error(
        `Scenario "${scenario.name}": Expected snapshot at index ${expected.index} but history only has ${historyEntries.length} entries`
      );
    }
    
    if (entry.state.state !== expected.state) {
      throw new Error(
        `Scenario "${scenario.name}" at index ${expected.index}: Expected state "${expected.state}", got "${entry.state.state}"`
      );
    }
    
    const contextCheckResult = expected.contextChecks(entry.state.context as ApplicationEngineContext);
    if (!contextCheckResult) {
      throw new Error(
        `Scenario "${scenario.name}" at index ${expected.index}: Context check failed${expected.description ? `: ${expected.description}` : ''}`
      );
    }
  }
}

