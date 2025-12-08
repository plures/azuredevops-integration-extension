/* eslint-disable max-lines */
/**
 * Praxis Application Orchestrator Tests
 *
 * Tests for the Application Orchestrator module (Phase 5).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PraxisApplicationManager } from '../../src/praxis/application/manager.js';
import { getPraxisEventBus, resetPraxisEventBus } from '../../src/praxis/application/eventBus.js';
import type { ProjectConnection } from '../../src/praxis/connection/types.js';

describe('PraxisApplicationManager', () => {
  let manager: PraxisApplicationManager;

  beforeEach(() => {
    resetPraxisEventBus();
    PraxisApplicationManager.resetInstance();
    manager = new PraxisApplicationManager();
  });

  afterEach(() => {
    manager.stop();
    resetPraxisEventBus();
  });

  describe('Lifecycle', () => {
    it('should start in inactive state', () => {
      expect(manager.getApplicationState()).toBe('inactive');
    });

    it('should start and allow activation', () => {
      manager.start();

      const result = manager.activate();
      expect(result).toBe(true);
      expect(manager.getApplicationState()).toBe('activating');
    });

    it('should complete activation', () => {
      manager.start();
      manager.activate();

      const result = manager.activationComplete();
      expect(result).toBe(true);
      expect(manager.getApplicationState()).toBe('active');
    });

    it('should handle activation failure', () => {
      manager.start();
      manager.activate();

      const result = manager.activationFailed('Test error');
      expect(result).toBe(true);
      expect(manager.getApplicationState()).toBe('activation_error');
    });

    it('should deactivate from active state', () => {
      manager.start();
      manager.activate();
      manager.activationComplete();

      const result = manager.deactivate();
      expect(result).toBe(true);
      expect(manager.getApplicationState()).toBe('deactivating');
    });

    it('should complete deactivation', () => {
      manager.start();
      manager.activate();
      manager.activationComplete();
      manager.deactivate();

      const result = manager.deactivationComplete();
      expect(result).toBe(true);
      expect(manager.getApplicationState()).toBe('inactive');
    });

    it('should not activate if not started', () => {
      const result = manager.activate();
      expect(result).toBe(false);
      expect(manager.getApplicationState()).toBe('inactive');
    });
  });

  describe('Connection Management', () => {
    const testConnections: ProjectConnection[] = [
      {
        id: 'conn-1',
        label: 'Test Connection 1',
        organization: 'org1',
        project: 'proj1',
        authMethod: 'pat',
      },
      {
        id: 'conn-2',
        label: 'Test Connection 2',
        organization: 'org2',
        project: 'proj2',
        authMethod: 'entra',
      },
    ];

    beforeEach(() => {
      manager.start();
      manager.activate();
      manager.activationComplete();
    });

    it('should load connections', () => {
      manager.loadConnections(testConnections);

      const connections = manager.getConnections();
      expect(connections).toHaveLength(2);
      expect(connections[0].id).toBe('conn-1');
    });

    it('should auto-select first connection', () => {
      manager.loadConnections(testConnections);

      expect(manager.getActiveConnectionId()).toBe('conn-1');
    });

    it('should select a specific connection', () => {
      manager.loadConnections(testConnections);

      const result = manager.selectConnection('conn-2');
      expect(result).toBe(true);
      expect(manager.getActiveConnectionId()).toBe('conn-2');
    });

    it('should not select non-existent connection', () => {
      manager.loadConnections(testConnections);

      const result = manager.selectConnection('non-existent');
      expect(result).toBe(false);
      expect(manager.getActiveConnectionId()).toBe('conn-1');
    });

    it('should create auth manager for each connection', () => {
      manager.loadConnections(testConnections);

      expect(manager.getAuthManager('conn-1')).toBeDefined();
      expect(manager.getAuthManager('conn-2')).toBeDefined();
    });

    it('should create connection manager for each connection', () => {
      manager.loadConnections(testConnections);

      expect(manager.getConnectionManager('conn-1')).toBeDefined();
      expect(manager.getConnectionManager('conn-2')).toBeDefined();
    });
  });

  describe('Query and View Mode', () => {
    beforeEach(() => {
      manager.start();
      manager.activate();
      manager.activationComplete();
      manager.loadConnections([
        {
          id: 'conn-1',
          organization: 'org1',
          project: 'proj1',
          authMethod: 'pat',
        },
      ]);
    });

    it('should set and get active query', () => {
      manager.setQuery('My Activity');

      expect(manager.getActiveQuery()).toBe('My Activity');
    });

    it('should save query per connection', () => {
      manager.setQuery('Query 1', 'conn-1');

      const ctx = manager.getContext();
      expect(ctx.connectionQueries.get('conn-1')).toBe('Query 1');
    });

    it('should set and get view mode', () => {
      manager.setViewMode('kanban');

      expect(manager.getViewMode()).toBe('kanban');
    });

    it('should save view mode per connection', () => {
      manager.setViewMode('board');

      const ctx = manager.getContext();
      expect(ctx.connectionViewModes.get('conn-1')).toBe('board');
    });
  });

  describe('Work Items', () => {
    beforeEach(() => {
      manager.start();
      manager.activate();
      manager.activationComplete();
      manager.loadConnections([
        {
          id: 'conn-1',
          organization: 'org1',
          project: 'proj1',
          authMethod: 'pat',
        },
      ]);
    });

    it('should handle work items loaded', () => {
      const workItems = [
        { id: 1, fields: { 'System.Title': 'Test Item 1' } },
        { id: 2, fields: { 'System.Title': 'Test Item 2' } },
      ];

      manager.workItemsLoaded(workItems, 'conn-1', 'My Activity');

      const items = manager.getWorkItems('conn-1');
      expect(items).toHaveLength(2);
    });

    it('should store pending work items', () => {
      const workItems = [{ id: 1, fields: { 'System.Title': 'Test' } }];

      manager.workItemsLoaded(workItems, 'conn-1');

      const ctx = manager.getContext();
      expect(ctx.pendingWorkItems).toBeDefined();
      expect(ctx.pendingWorkItems?.workItems).toHaveLength(1);
    });

    it('should handle work items error', () => {
      manager.workItemsError('Failed to load', 'conn-1');

      const error = manager.getLastError();
      expect(error?.message).toBe('Failed to load');
      expect(error?.connectionId).toBe('conn-1');
    });
  });

  describe('Timer Integration', () => {
    beforeEach(() => {
      manager.start();
      manager.activate();
      manager.activationComplete();
    });

    it('should have timer manager after start', () => {
      expect(manager.getTimerManager()).toBeDefined();
    });

    it('should start timer for work item', () => {
      const result = manager.startTimer(123, 'Test Work Item');

      expect(result).toBe(true);
      expect(manager.getTimerManager()?.getTimerState()).toBe('running');
    });

    it('should pause timer', () => {
      manager.startTimer(123, 'Test');

      const result = manager.pauseTimer();
      expect(result).toBe(true);
      expect(manager.getTimerManager()?.getTimerState()).toBe('paused');
    });

    it('should resume timer', () => {
      manager.startTimer(123, 'Test');
      manager.pauseTimer();

      const result = manager.resumeTimer();
      expect(result).toBe(true);
      expect(manager.getTimerManager()?.getTimerState()).toBe('running');
    });

    it('should stop timer and return result', () => {
      manager.startTimer(123, 'Test');

      const result = manager.stopTimer();
      expect(result).not.toBeNull();
      expect(result?.workItemId).toBe(123);
    });
  });

  describe('Device Code Flow', () => {
    beforeEach(() => {
      manager.start();
      manager.activate();
      manager.activationComplete();
    });

    it('should handle device code started', () => {
      manager.deviceCodeStarted('conn-1', 'ABC123', 'https://microsoft.com/devicelogin', 900);

      const session = manager.getDeviceCodeSession();
      expect(session).toBeDefined();
      expect(session?.userCode).toBe('ABC123');
      expect(session?.connectionId).toBe('conn-1');
    });

    it('should handle device code completed', () => {
      manager.deviceCodeStarted('conn-1', 'ABC123', 'https://microsoft.com/devicelogin', 900);
      manager.deviceCodeCompleted('conn-1');

      const session = manager.getDeviceCodeSession();
      expect(session).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      manager.start();
      manager.activate();
      manager.activationComplete();
    });

    it('should report error', () => {
      manager.reportError('Test error', 'conn-1');

      const error = manager.getLastError();
      expect(error?.message).toBe('Test error');
    });

    it('should report error without changing state', () => {
      manager.reportError('Critical error');

      expect(manager.getApplicationState()).toBe('active');
    });

    it('should retry after activation error', () => {
      // Setup activation error state
      manager.reset();
      manager.start();
      manager.activate();
      manager.activationFailed('Error');

      const result = manager.retry();
      expect(result).toBe(true);
      expect(manager.getApplicationState()).toBe('active');
    });

    it('should reset application state', () => {
      manager.reportError('Error');

      manager.reset();
      expect(manager.getApplicationState()).toBe('inactive');
      expect(manager.getLastError()).toBeUndefined();
    });
  });

  describe('Auth Reminders', () => {
    beforeEach(() => {
      manager.start();
      manager.activate();
      manager.activationComplete();
    });

    it('should request auth reminder', () => {
      manager.requestAuthReminder('conn-1', 'token_expired', 'Token has expired');

      const reminders = manager.getPendingAuthReminders();
      expect(reminders.has('conn-1')).toBe(true);
    });

    it('should clear auth reminder', () => {
      manager.requestAuthReminder('conn-1', 'token_expired');
      manager.clearAuthReminder('conn-1');

      const reminders = manager.getPendingAuthReminders();
      expect(reminders.has('conn-1')).toBe(false);
    });
  });

  describe('Debug View', () => {
    beforeEach(() => {
      manager.start();
    });

    it('should toggle debug view', () => {
      expect(manager.isDebugViewVisible()).toBe(false);

      manager.toggleDebugView();
      expect(manager.isDebugViewVisible()).toBe(true);

      manager.toggleDebugView();
      expect(manager.isDebugViewVisible()).toBe(false);
    });

    it('should set debug view explicitly', () => {
      manager.toggleDebugView(true);
      expect(manager.isDebugViewVisible()).toBe(true);

      manager.toggleDebugView(false);
      expect(manager.isDebugViewVisible()).toBe(false);
    });
  });

  describe('Event Bus Integration', () => {
    beforeEach(() => {
      manager.start();
      manager.activate();
      manager.activationComplete();
    });

    it('should emit timer events to event bus', () => {
      const eventBus = manager.getEventBus();
      let timerStarted = false;

      eventBus.subscribe('timer:started', () => {
        timerStarted = true;
      });

      manager.startTimer(123, 'Test');

      expect(timerStarted).toBe(true);
    });

    it('should emit app events to event bus', () => {
      const eventBus = manager.getEventBus();
      let appError = false;

      eventBus.subscribe('app:error', () => {
        appError = true;
      });

      manager.reportError('Test error');

      expect(appError).toBe(true);
    });
  });

  describe('Snapshot and Status', () => {
    it('should return correct snapshot', () => {
      manager.start();
      manager.activate();
      manager.activationComplete();

      const snapshot = manager.getSnapshot();
      expect(snapshot.state).toBe('active');
      expect(snapshot.isActivated).toBe(true);
    });

    it('should return correct status', () => {
      manager.start();

      const status = manager.getStatus();
      expect(status.isStarted).toBe(true);
      expect(status.hasTimerManager).toBe(true);
    });

    it('should validate sync', () => {
      expect(manager.validateSync()).toBe(false);

      manager.start();
      expect(manager.validateSync()).toBe(true);
    });
  });
});

describe('PraxisEventBus', () => {
  beforeEach(() => {
    resetPraxisEventBus();
  });

  afterEach(() => {
    resetPraxisEventBus();
  });

  it('should subscribe to specific message types', () => {
    const eventBus = getPraxisEventBus();
    let received = false;

    eventBus.subscribe('timer:started', () => {
      received = true;
    });

    eventBus.emitTimerEvent('timer:started', { workItemId: 123 });

    expect(received).toBe(true);
  });

  it('should subscribe to all messages', () => {
    const eventBus = getPraxisEventBus();
    const messages: string[] = [];

    eventBus.subscribeAll((msg) => {
      messages.push(msg.type);
    });

    eventBus.emitTimerEvent('timer:started', {});
    eventBus.emitAuthEvent('auth:success', {}, 'conn-1');

    expect(messages).toEqual(['timer:started', 'auth:success']);
  });

  it('should unsubscribe correctly', () => {
    const eventBus = getPraxisEventBus();
    let count = 0;

    const unsubscribe = eventBus.subscribe('timer:started', () => {
      count++;
    });

    eventBus.emitTimerEvent('timer:started', {});
    expect(count).toBe(1);

    unsubscribe();

    eventBus.emitTimerEvent('timer:started', {});
    expect(count).toBe(1);
  });

  it('should maintain message history', () => {
    const eventBus = getPraxisEventBus();

    eventBus.emitTimerEvent('timer:started', {});
    eventBus.emitTimerEvent('timer:stopped', {});

    const history = eventBus.getHistory();
    expect(history).toHaveLength(2);
  });

  it('should filter history by connection', () => {
    const eventBus = getPraxisEventBus();

    eventBus.emitAuthEvent('auth:success', {}, 'conn-1');
    eventBus.emitAuthEvent('auth:success', {}, 'conn-2');

    const conn1History = eventBus.getConnectionHistory('conn-1');
    expect(conn1History).toHaveLength(1);
  });

  it('should filter history by engine', () => {
    const eventBus = getPraxisEventBus();

    eventBus.emitTimerEvent('timer:started', {});
    eventBus.emitAuthEvent('auth:success', {}, 'conn-1');

    const timerHistory = eventBus.getEngineHistory('timer');
    expect(timerHistory).toHaveLength(1);
  });
});
