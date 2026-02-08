/**
 * Snapshot Testing Tests
 *
 * Tests for snapshot testing utilities.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSnapshotTest,
  compareSnapshots,
  validateScenarioSnapshots,
} from '../../src/testing/snapshotTesting.js';
import { resetEngine, dispatch } from '../../src/testing/helpers.js';
import { frontendEngine } from '../../src/webview/praxis/frontendEngine.js';
import { ActivateEvent } from '../../src/praxis/application/facts.js';
import type { ApplicationEngineContext } from '../../src/praxis/application/engine.js';
import type { TestScenario } from '../../src/testing/historyTestRecorder.js';

describe('Snapshot Testing', () => {
  beforeEach(async () => {
    await resetEngine();
  });

  it('should create snapshot test function', () => {
    const testFn = createSnapshotTest({
      name: 'test-snapshot',
      events: [ActivateEvent.create({})], // Need at least one event to create history
      expectedSnapshots: [
        {
          index: 0,
          state: 'activating',
          contextChecks: (ctx) => ctx.applicationState === 'activating',
        },
      ],
    });

    expect(typeof testFn).toBe('function');

    // Should not throw
    expect(() => testFn()).not.toThrow();
  });

  it('should validate snapshot state', () => {
    const testFn = createSnapshotTest({
      name: 'state-validation',
      events: [ActivateEvent.create({})], // Need at least one event
      expectedSnapshots: [
        {
          index: 0,
          state: 'activating',
          contextChecks: (ctx) => ctx.applicationState === 'activating',
        },
      ],
    });

    expect(() => testFn()).not.toThrow();
  });

  it('should throw error on invalid state', async () => {
    await resetEngine();

    // Change state to something else
    const modifiedContext: ApplicationEngineContext = {
      ...frontendEngine.getContext(),
      applicationState: 'active',
    };
    frontendEngine.updateContext(() => modifiedContext);

    const testFn = createSnapshotTest({
      name: 'invalid-state-test',
      events: [],
      expectedSnapshots: [
        {
          index: 0,
          state: 'inactive', // Expects inactive but we set it to active
          contextChecks: () => true,
        },
      ],
    });

    expect(() => testFn()).toThrow();
  });

  it('should compare snapshots correctly', () => {
    const snapshot1: ApplicationEngineContext = {
      applicationState: 'inactive',
      isActivated: false,
      connections: [],
    } as ApplicationEngineContext;

    const snapshot2: ApplicationEngineContext = {
      applicationState: 'active',
      isActivated: true,
      connections: [],
    } as ApplicationEngineContext;

    const comparison = compareSnapshots(snapshot1, snapshot2);

    expect(comparison.match).toBe(false);
    expect(comparison.differences.length).toBeGreaterThan(0);
    expect(comparison.summary.differentFields).toBeGreaterThan(0);
  });

  it('should detect matching snapshots', () => {
    const snapshot: ApplicationEngineContext = {
      applicationState: 'inactive',
      isActivated: false,
      connections: [],
    } as ApplicationEngineContext;

    const comparison = compareSnapshots(snapshot, snapshot);

    expect(comparison.match).toBe(true);
    expect(comparison.differences.length).toBe(0);
  });

  it('should ignore specified fields in comparison', () => {
    const snapshot1: ApplicationEngineContext = {
      applicationState: 'inactive',
      isActivated: false,
      connections: [],
    } as ApplicationEngineContext;

    const snapshot2: ApplicationEngineContext = {
      applicationState: 'inactive',
      isActivated: false,
      connections: [],
      debugLoggingEnabled: true, // Different but ignored
    } as ApplicationEngineContext;

    const comparison = compareSnapshots(snapshot1, snapshot2, {
      ignoreFields: ['debugLoggingEnabled'],
    });

    // Should match if we ignore the different field
    expect(comparison.match).toBe(true);
  });
});
