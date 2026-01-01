/**
 * Work Item Lifecycle Test Example
 * 
 * Demonstrates testing work item creation, timer start, and related workflows
 * using the history testing infrastructure.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { startRecording, stopRecording } from '../../../src/testing/historyTestRecorder.js';
import { createSnapshotTest } from '../../../src/testing/snapshotTesting.js';
import { validateEventSequence, checkState, checkCondition } from '../../../src/testing/eventSequenceValidator.js';
import { resetEngine, waitForState, getContext, dispatch } from '../../../src/testing/helpers.js';
import {
  ActivateEvent,
  ActivationCompleteEvent,
  ConnectionsLoadedEvent,
  WorkItemsLoadedEvent,
  CreateWorkItemEvent,
  StartTimerEvent,
  PauseTimerEvent,
  StopTimerEvent,
} from '../../../src/praxis/application/facts.js';
import type { ProjectConnection } from '../../../src/praxis/connection/types.js';
import type { WorkItem } from '../../../src/praxis/application/types.js';

describe('Work Item Lifecycle - History Testing Examples', () => {
  beforeEach(async () => {
    await resetEngine();
  });

  describe('Work Item Creation Workflow', () => {
    it('should record complete work item creation and timer workflow', async () => {
      // Setup: Activate and load connection
      const testConnection: ProjectConnection = {
        id: 'test-connection-workitem',
        organization: 'test-org',
        project: 'test-project',
        label: 'Test Connection',
        baseUrl: 'https://dev.azure.com',
        apiBaseUrl: 'https://dev.azure.com/test-org/test-project/_apis',
        authMethod: 'entra',
      };

      dispatch([ActivateEvent.create({})]);
      dispatch([ActivationCompleteEvent.create({})]);
      dispatch([
        ConnectionsLoadedEvent.create({
          connections: [testConnection],
          activeId: testConnection.id,
        }),
      ]);

      await waitForState((ctx) => ctx.applicationState === 'active');

      // Start recording
      startRecording('workitem-lifecycle-001', 'Work item creation and timer workflow');

      // Step 1: Load work items
      const existingWorkItems: WorkItem[] = [
        {
          id: 1001,
          title: 'Existing Work Item',
          workItemType: 'Task',
          state: 'Active',
          assignedTo: null,
          url: 'https://dev.azure.com/test-org/test-project/_workitems/edit/1001',
        },
      ];

      dispatch([
        WorkItemsLoadedEvent.create({
          connectionId: testConnection.id,
          workItems: existingWorkItems,
        }),
      ]);

      await waitForState((ctx) => {
        const workItems = ctx.connectionWorkItems?.get(testConnection.id);
        return workItems && workItems.length > 0;
      });

      // Step 2: Create new work item
      dispatch([
        CreateWorkItemEvent.create({
          connectionId: testConnection.id,
          workItemType: 'Task',
          title: 'New Test Task',
          description: 'Test description',
        }),
      ]);

      await waitForState((ctx) => {
        const workItems = ctx.connectionWorkItems?.get(testConnection.id);
        return workItems && workItems.length > 1;
      });

      // Step 3: Start timer on work item
      const context = getContext();
      const workItems = context.connectionWorkItems?.get(testConnection.id) || [];
      const newWorkItem = workItems[workItems.length - 1];

      if (newWorkItem) {
        dispatch([
          StartTimerEvent.create({
            workItemId: newWorkItem.id,
            connectionId: testConnection.id,
          }),
        ]);

        await waitForState((ctx) => ctx.timerState === 'running');
      }

      // Stop recording
      const scenario = stopRecording();

      // Verify scenario
      expect(scenario.id).toBe('workitem-lifecycle-001');
      expect(scenario.events.length).toBeGreaterThan(0);
      expect(scenario.finalContext.applicationState).toBe('active');

      // Verify final state
      const finalContext = getContext();
      expect(finalContext.timerState).toBe('running');
      const finalWorkItems = finalContext.connectionWorkItems?.get(testConnection.id);
      expect(finalWorkItems?.length).toBeGreaterThan(1);
    });
  });

  describe('Timer State Validation', () => {
    it('should validate timer cannot start without work item', () => {
      const result = validateEventSequence({
        name: 'timer-validation',
        sequence: [
          ActivateEvent.create({}),
          ActivationCompleteEvent.create({}),
          StartTimerEvent.create({
            workItemId: null,
            connectionId: 'test-connection',
          }),
        ],
        validators: [
          {
            afterIndex: 2,
            validator: checkCondition(
              (ctx) => ctx.timerState === null || ctx.timerState === 'idle',
              'Timer should not start without valid work item'
            ),
            errorMessage: 'Timer should remain idle when no work item provided',
          },
        ],
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('Work Item State Snapshots', () => {
    it('should validate work items are loaded correctly', () => {
      const testConnection: ProjectConnection = {
        id: 'test-connection-snapshot',
        organization: 'test-org',
        project: 'test-project',
        label: 'Test Connection',
        baseUrl: 'https://dev.azure.com',
        apiBaseUrl: 'https://dev.azure.com/test-org/test-project/_apis',
        authMethod: 'entra',
      };

      const testWorkItems: WorkItem[] = [
        {
          id: 2001,
          title: 'Test Work Item 1',
          workItemType: 'Task',
          state: 'Active',
          assignedTo: null,
          url: 'https://dev.azure.com/test-org/test-project/_workitems/edit/2001',
        },
        {
          id: 2002,
          title: 'Test Work Item 2',
          workItemType: 'Bug',
          state: 'New',
          assignedTo: null,
          url: 'https://dev.azure.com/test-org/test-project/_workitems/edit/2002',
        },
      ];

      const testFn = createSnapshotTest({
        name: 'work-items-loaded-validation',
        events: [
          ActivateEvent.create({}),
          ActivationCompleteEvent.create({}),
          ConnectionsLoadedEvent.create({
            connections: [testConnection],
            activeId: testConnection.id,
          }),
          WorkItemsLoadedEvent.create({
            connectionId: testConnection.id,
            workItems: testWorkItems,
          }),
        ],
        expectedSnapshots: [
          {
            index: 3,
            state: 'active',
            contextChecks: (ctx) => {
              const workItems = ctx.connectionWorkItems?.get(testConnection.id);
              return workItems?.length === 2;
            },
            description: 'Two work items should be loaded',
          },
          {
            index: 3,
            state: 'active',
            contextChecks: (ctx) => {
              const workItems = ctx.connectionWorkItems?.get(testConnection.id);
              return workItems?.some((wi) => wi.id === 2001) && workItems?.some((wi) => wi.id === 2002);
            },
            description: 'Both work items should be present',
          },
        ],
      });

      expect(() => testFn()).not.toThrow();
    });
  });
});

