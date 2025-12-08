import { describe, it, expect, beforeEach } from 'vitest';
import { engine } from '../src/praxis-core/engine';
import { state } from '../src/praxis-core/state.svelte';
import { processEvent } from '../src/praxis-core/rules';

describe('Praxis Core Verification', () => {
  beforeEach(() => {
    // Reset state if possible, or just rely on fresh import in a real env
    // For this test, we assume a fresh start or we might need a reset method on the engine if state is global
  });

  it('should update state when CONNECTIONS_LOADED is dispatched', () => {
    const connections = [
      { id: 'conn1', name: 'Connection 1', orgUrl: 'https://dev.azure.com/org1', project: 'proj1' },
      { id: 'conn2', name: 'Connection 2', orgUrl: 'https://dev.azure.com/org2', project: 'proj2' },
    ];

    processEvent(engine.context, {
      type: 'CONNECTIONS_LOADED',
      payload: { connections, activeId: null },
    });

    expect(engine.context.connections).toHaveLength(2);
    expect(engine.context.connections[0].id).toBe('conn1');
    expect(engine.context.connections[1].id).toBe('conn2');
  });

  it('should update activeConnectionId when CONNECTION_SELECTED is dispatched', () => {
    const connections = [
      { id: 'conn1', name: 'Connection 1', orgUrl: 'https://dev.azure.com/org1', project: 'proj1' },
    ];

    // Setup initial state
    processEvent(engine.context, {
      type: 'CONNECTIONS_LOADED',
      payload: { connections, activeId: null },
    });

    // Select connection
    processEvent(engine.context, {
      type: 'CONNECTION_SELECTED',
      payload: { id: 'conn1' },
    });

    expect(engine.context.activeConnectionId).toBe('conn1');
  });

  it('should derive activeConnection correctly', () => {
    const connections = [
      { id: 'conn1', name: 'Connection 1', orgUrl: 'https://dev.azure.com/org1', project: 'proj1' },
    ];

    processEvent(engine.context, {
      type: 'CONNECTIONS_LOADED',
      payload: { connections, activeId: null },
    });
    processEvent(engine.context, {
      type: 'CONNECTION_SELECTED',
      payload: { id: 'conn1' },
    });

    expect(engine.context.activeConnection).toBeDefined();
    expect(engine.context.activeConnection?.id).toBe('conn1');
  });
});
