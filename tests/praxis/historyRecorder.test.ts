/**
 * History Test Recorder Tests
 *
 * Tests for the history test recorder functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  HistoryTestRecorder,
  startRecording,
  stopRecording,
  isRecording,
} from '../../src/testing/historyTestRecorder.js';
import { resetEngine, dispatch } from '../../src/testing/helpers.js';
import { frontendEngine } from '../../src/webview/praxis/frontendEngine.js';
import type { ApplicationEngineContext } from '../../src/praxis/application/engine.js';

describe('HistoryTestRecorder', () => {
  beforeEach(async () => {
    await resetEngine();
  });

  it('should start and stop recording', () => {
    const recorder = new HistoryTestRecorder();

    expect(recorder.isRecording()).toBe(false);

    recorder.startRecording('test-001', 'Test Scenario');
    expect(recorder.isRecording()).toBe(true);

    const scenario = recorder.stopRecording();
    expect(recorder.isRecording()).toBe(false);
    expect(scenario.id).toBe('test-001');
    expect(scenario.name).toBe('Test Scenario');
  });

  it('should record events during recording', () => {
    const recorder = new HistoryTestRecorder();
    recorder.startRecording('test-002', 'Event Recording Test');

    // Simulate events (in real usage, these would come from actual dispatches)
    // For now, we'll test the recording mechanism

    const scenario = recorder.stopRecording();
    expect(scenario.events).toBeDefined();
    expect(Array.isArray(scenario.events)).toBe(true);
  });

  it('should capture initial and final context', () => {
    const recorder = new HistoryTestRecorder();

    const initialContext = frontendEngine.getContext();
    recorder.startRecording('test-003', 'Context Capture Test');

    // Make some changes...
    const modifiedContext: ApplicationEngineContext = {
      ...initialContext,
      isActivated: true,
    };
    frontendEngine.updateContext(() => modifiedContext);

    const scenario = recorder.stopRecording();

    expect(scenario.initialContext).toBeDefined();
    expect(scenario.finalContext).toBeDefined();
    expect(scenario.finalContext.isActivated).toBe(true);
  });

  it('should throw error when starting recording while already recording', () => {
    const recorder = new HistoryTestRecorder();
    recorder.startRecording('test-004', 'Test');

    expect(() => {
      recorder.startRecording('test-005', 'Another Test');
    }).toThrow('Recording already in progress');
  });

  it('should throw error when stopping without starting', () => {
    const recorder = new HistoryTestRecorder();

    expect(() => {
      recorder.stopRecording();
    }).toThrow('No active recording');
  });

  it('should support global recorder functions', () => {
    expect(isRecording()).toBe(false);

    startRecording('test-006', 'Global Test');
    expect(isRecording()).toBe(true);

    const scenario = stopRecording();
    expect(scenario.id).toBe('test-006');
    expect(isRecording()).toBe(false);
  });

  it('should respect max duration option', async () => {
    const recorder = new HistoryTestRecorder({
      maxDuration: 100, // 100ms max
    });

    recorder.startRecording('test-007', 'Duration Test');

    // Wait longer than max duration
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Recording should have stopped automatically
    expect(recorder.isRecording()).toBe(false);
  });
});
