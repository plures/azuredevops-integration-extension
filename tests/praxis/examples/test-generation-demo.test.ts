/**
 * Test Generation Demo
 *
 * Demonstrates generating test code from recorded scenarios.
 */

import { describe, it, expect } from 'vitest';
import { startRecording, stopRecording } from '../../../src/testing/historyTestRecorder.js';
import {
  generateTestFromScenario,
  generateSnapshotTest,
} from '../../../src/testing/testGenerator.js';
import { resetEngine, dispatch, waitForStateValue } from '../../../src/testing/helpers.js';
import { ActivateEvent, ActivationCompleteEvent } from '../../../src/praxis/application/facts.js';

describe('Test Generation Demo', () => {
  it('should generate test code from recorded scenario', async () => {
    await resetEngine();

    // Record a scenario
    startRecording('demo-001', 'Test Generation Demo');

    dispatch([ActivateEvent.create({})]);
    await waitForStateValue('activating');

    dispatch([ActivationCompleteEvent.create({})]);
    await waitForStateValue('active');

    const scenario = stopRecording();

    // Generate test code
    const testCode = generateTestFromScenario(scenario, {
      framework: 'vitest',
      testName: 'generated-test',
      includeSnapshots: true,
      includeComments: true,
    });

    // Verify test code was generated
    expect(testCode).toContain('describe');
    expect(testCode).toContain('it(');
    expect(testCode).toContain('dispatch');
    expect(testCode).toContain('ActivateEvent');
    expect(testCode).toContain('ActivationCompleteEvent');

    // Log generated code (for demonstration)
    console.log('Generated test code:');
    console.log(testCode);
  });

  it('should generate snapshot test code', async () => {
    await resetEngine();

    // Record a scenario
    startRecording('demo-002', 'Snapshot Test Generation');

    dispatch([ActivateEvent.create({})]);
    await waitForStateValue('activating');

    dispatch([ActivationCompleteEvent.create({})]);
    await waitForStateValue('active');

    const scenario = stopRecording();

    // Generate snapshot test code
    const snapshotTestCode = generateSnapshotTest(scenario, {
      framework: 'vitest',
      testName: 'generated-snapshot-test',
    });

    // Verify snapshot test code was generated
    expect(snapshotTestCode).toContain('createSnapshotTest');
    expect(snapshotTestCode).toContain('expectedSnapshots');
    expect(snapshotTestCode).toContain('contextChecks');

    // Log generated code (for demonstration)
    console.log('Generated snapshot test code:');
    console.log(snapshotTestCode);
  });
});
