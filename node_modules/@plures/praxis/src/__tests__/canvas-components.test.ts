/**
 * Canvas Components Tests
 *
 * Tests for the Praxis Canvas Svelte components infrastructure.
 */

import { describe, it, expect } from 'vitest';
import {
  CanvasStateManager,
  createCanvasStateManager,
  type CanvasState,
  type CanvasNodeState,
} from '../../ui/canvas/canvas-state.js';
import {
  CanvasProjection,
  createCanvasProjection,
  type LayoutResult,
} from '../../ui/canvas/canvas-projection.js';
import type { PSFSchema } from '../../core/schema-engine/psf.js';

describe('Canvas State Manager', () => {
  const testSchema: PSFSchema = {
    $version: '1.0.0',
    id: 'test-schema',
    name: 'Test Schema',
    description: 'Test schema for canvas',
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    facts: [
      { id: 'fact1', tag: 'UserLoggedIn', description: 'User logged in', payloadSchema: {} },
      { id: 'fact2', tag: 'CartUpdated', description: 'Cart was updated', payloadSchema: {} },
    ],
    events: [
      { id: 'event1', tag: 'Login', description: 'Login event', payloadSchema: {} },
      { id: 'event2', tag: 'AddToCart', description: 'Add to cart event', payloadSchema: {} },
    ],
    rules: [
      {
        id: 'rule1',
        name: 'Login Rule',
        description: 'Handle login',
        triggers: ['Login'],
        actions: [],
      },
    ],
    constraints: [
      {
        id: 'constraint1',
        name: 'Auth Required',
        description: 'User must be authenticated',
        expression: 'true',
      },
    ],
    models: [
      {
        id: 'model1',
        name: 'User',
        description: 'User model',
        fields: [
          { name: 'id', type: 'string', required: true },
          { name: 'name', type: 'string', required: true },
        ],
      },
    ],
    components: [
      {
        id: 'comp1',
        name: 'UserCard',
        type: 'display',
        model: 'User',
        description: 'User card component',
      },
    ],
    flows: [],
  };

  it('should create a canvas state manager', () => {
    const manager = createCanvasStateManager();
    expect(manager).toBeInstanceOf(CanvasStateManager);
  });

  it('should have initial state', () => {
    const manager = createCanvasStateManager();
    const state = manager.getState();

    expect(state).toBeDefined();
    expect(state.nodes).toBeInstanceOf(Map);
    expect(state.edges).toBeInstanceOf(Map);
    expect(state.viewport).toBeDefined();
    expect(state.viewport.zoom).toBe(1);
    expect(state.mode).toBe('select');
    expect(state.loading).toBe(true);
  });

  it('should load schema into canvas state', () => {
    const manager = createCanvasStateManager();
    manager.loadFromSchema(testSchema);
    const state = manager.getState();

    expect(state.loading).toBe(false);
    // 2 facts + 2 events + 1 rule + 1 constraint + 1 model + 1 component = 8 nodes
    expect(state.nodes.size).toBe(8);
  });

  it('should load facts as nodes', () => {
    const manager = createCanvasStateManager();
    manager.loadFromSchema(testSchema);
    const state = manager.getState();

    const fact1 = state.nodes.get('fact1');
    expect(fact1).toBeDefined();
    expect(fact1?.type).toBe('fact');
    expect(fact1?.label).toBe('UserLoggedIn');
  });

  it('should load events as nodes', () => {
    const manager = createCanvasStateManager();
    manager.loadFromSchema(testSchema);
    const state = manager.getState();

    const event1 = state.nodes.get('event1');
    expect(event1).toBeDefined();
    expect(event1?.type).toBe('event');
    expect(event1?.label).toBe('Login');
  });

  it('should load rules as nodes with trigger edges', () => {
    const manager = createCanvasStateManager();
    manager.loadFromSchema(testSchema);
    const state = manager.getState();

    const rule1 = state.nodes.get('rule1');
    expect(rule1).toBeDefined();
    expect(rule1?.type).toBe('rule');
    expect(rule1?.label).toBe('Login Rule');

    // Check for trigger edge from event to rule
    const edges = Array.from(state.edges.values());
    const triggerEdge = edges.find((e) => e.source === 'event1' && e.target === 'rule1');
    expect(triggerEdge).toBeDefined();
    expect(triggerEdge?.type).toBe('event');
    expect(triggerEdge?.label).toBe('triggers');
  });

  it('should select a node', () => {
    const manager = createCanvasStateManager();
    manager.loadFromSchema(testSchema);

    manager.selectNode('fact1');
    const state = manager.getState();

    expect(state.selection.nodes.has('fact1')).toBe(true);
    expect(state.nodes.get('fact1')?.selected).toBe(true);
  });

  it('should support multi-selection with addToSelection', () => {
    const manager = createCanvasStateManager();
    manager.loadFromSchema(testSchema);

    manager.selectNode('fact1');
    manager.selectNode('fact2', true);
    const state = manager.getState();

    expect(state.selection.nodes.has('fact1')).toBe(true);
    expect(state.selection.nodes.has('fact2')).toBe(true);
  });

  it('should move a node', () => {
    const manager = createCanvasStateManager();
    manager.loadFromSchema(testSchema);

    manager.moveNode('fact1', { x: 100, y: 200 });
    const state = manager.getState();

    const node = state.nodes.get('fact1');
    expect(node?.position.x).toBe(100);
    expect(node?.position.y).toBe(200);
  });

  it('should snap to grid when moving', () => {
    const manager = createCanvasStateManager();
    manager.loadFromSchema(testSchema);

    // Grid snap is enabled by default with size 20
    manager.moveNode('fact1', { x: 105, y: 215 });
    const state = manager.getState();

    const node = state.nodes.get('fact1');
    // With grid snap, 105 rounds to 100 (nearest multiple of 20)
    // and 215 rounds to 220
    expect(node?.position.x).toBe(100);
    expect(node?.position.y).toBe(220);
  });

  it('should clear selection', () => {
    const manager = createCanvasStateManager();
    manager.loadFromSchema(testSchema);

    manager.selectNode('fact1');
    manager.selectNode('fact2', true);
    manager.clearSelection();

    const state = manager.getState();
    expect(state.selection.nodes.size).toBe(0);
    expect(state.nodes.get('fact1')?.selected).toBe(false);
    expect(state.nodes.get('fact2')?.selected).toBe(false);
  });

  it('should set viewport', () => {
    const manager = createCanvasStateManager();

    manager.setViewport({ x: 50, y: 100, zoom: 1.5 });
    const state = manager.getState();

    expect(state.viewport.x).toBe(50);
    expect(state.viewport.y).toBe(100);
    expect(state.viewport.zoom).toBe(1.5);
  });

  it('should set mode', () => {
    const manager = createCanvasStateManager();

    manager.setMode('pan');
    expect(manager.getState().mode).toBe('pan');

    manager.setMode('connect');
    expect(manager.getState().mode).toBe('connect');
  });

  it('should toggle grid visibility', () => {
    const manager = createCanvasStateManager();
    const initialVisibility = manager.getState().grid.visible;

    manager.toggleGrid();
    expect(manager.getState().grid.visible).toBe(!initialVisibility);

    manager.toggleGrid();
    expect(manager.getState().grid.visible).toBe(initialVisibility);
  });

  it('should support undo/redo', () => {
    const manager = createCanvasStateManager();
    manager.loadFromSchema(testSchema);

    // Make a change with undo support
    manager.selectNode('fact1');

    // Undo should work
    const undoResult = manager.undo();
    expect(undoResult).toBe(true);

    // Redo should work
    const redoResult = manager.redo();
    expect(redoResult).toBe(true);
  });

  it('should subscribe to state changes', () => {
    const manager = createCanvasStateManager();
    let callCount = 0;
    let lastState: CanvasState | null = null;

    const unsubscribe = manager.subscribe((state) => {
      callCount++;
      lastState = state;
    });

    // Initial call happens immediately
    expect(callCount).toBe(1);
    expect(lastState).not.toBeNull();

    // Changes trigger subscriber
    manager.setMode('pan');
    expect(callCount).toBe(2);
    expect(lastState?.mode).toBe('pan');

    // Unsubscribe works
    unsubscribe();
    manager.setMode('select');
    expect(callCount).toBe(2); // No additional calls
  });

  it('should export canvas state to schema', () => {
    const manager = createCanvasStateManager();
    manager.loadFromSchema(testSchema);

    // Move a node
    manager.moveNode('fact1', { x: 150, y: 300 });

    // Export back to schema
    const updatedSchema = manager.exportToSchema(testSchema);

    expect(updatedSchema.modifiedAt).toBeDefined();

    // Check that position was updated (snapped to grid size of 20)
    const updatedFact = updatedSchema.facts.find((f) => f.id === 'fact1');
    // 150 rounded to nearest 20 = 160, 300 is already on grid
    expect(updatedFact?.position).toEqual({ x: 160, y: 300 });
  });
});

describe('Canvas Projection', () => {
  const testSchema: PSFSchema = {
    $version: '1.0.0',
    id: 'test-schema',
    name: 'Test Schema',
    description: 'Test schema for projection',
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    facts: [
      { id: 'fact1', tag: 'Fact1', description: 'Test fact', payloadSchema: {} },
      { id: 'fact2', tag: 'Fact2', description: 'Test fact 2', payloadSchema: {} },
    ],
    events: [{ id: 'event1', tag: 'Event1', description: 'Test event', payloadSchema: {} }],
    rules: [
      { id: 'rule1', name: 'Rule1', description: 'Test rule', triggers: ['Event1'], actions: [] },
    ],
    constraints: [],
    models: [],
    components: [],
    flows: [],
  };

  it('should create a canvas projection', () => {
    const projection = createCanvasProjection();
    expect(projection).toBeInstanceOf(CanvasProjection);
  });

  it('should project schema to layout', () => {
    const projection = createCanvasProjection();
    const result = projection.projectSchema(testSchema);

    expect(result).toBeDefined();
    expect(result.positions).toBeInstanceOf(Map);
    expect(result.viewport).toBeDefined();
    expect(result.bounds).toBeDefined();
  });

  it('should generate positions for all nodes', () => {
    const projection = createCanvasProjection();
    const result = projection.projectSchema(testSchema);

    // 2 facts + 1 event + 1 rule = 4 nodes
    expect(result.positions.size).toBe(4);

    expect(result.positions.has('fact1')).toBe(true);
    expect(result.positions.has('fact2')).toBe(true);
    expect(result.positions.has('event1')).toBe(true);
    expect(result.positions.has('rule1')).toBe(true);
  });

  it('should respect existing positions', () => {
    const schemaWithPositions: PSFSchema = {
      ...testSchema,
      facts: [
        {
          id: 'fact1',
          tag: 'Fact1',
          description: 'Test',
          payloadSchema: {},
          position: { x: 500, y: 500 },
        },
      ],
      events: [],
      rules: [],
    };

    const projection = createCanvasProjection({ respectExisting: true });
    const result = projection.projectSchema(schemaWithPositions);

    expect(result.positions.get('fact1')).toEqual({ x: 500, y: 500 });
  });

  it('should use hierarchical layout', () => {
    const projection = createCanvasProjection({ algorithm: 'hierarchical' });
    const result = projection.projectSchema(testSchema);

    expect(result.positions.size).toBe(4);
    // Each node should have a valid position
    for (const pos of result.positions.values()) {
      expect(typeof pos.x).toBe('number');
      expect(typeof pos.y).toBe('number');
    }
  });

  it('should use grid layout', () => {
    const projection = createCanvasProjection({ algorithm: 'grid' });
    const result = projection.projectSchema(testSchema);

    expect(result.positions.size).toBe(4);
    // Grid layout should have evenly spaced positions
    const positions = Array.from(result.positions.values());
    // All positions should be defined
    positions.forEach((pos) => {
      expect(pos).toBeDefined();
      expect(typeof pos.x).toBe('number');
      expect(typeof pos.y).toBe('number');
    });
  });

  it('should use circular layout', () => {
    const projection = createCanvasProjection({ algorithm: 'circular' });
    const result = projection.projectSchema(testSchema);

    expect(result.positions.size).toBe(4);
    // Circular layout positions should be centered around origin
    const positions = Array.from(result.positions.values());
    // Check that positions exist and are numbers
    positions.forEach((pos) => {
      expect(typeof pos.x).toBe('number');
      expect(typeof pos.y).toBe('number');
    });
  });

  it('should use force-directed layout', () => {
    const projection = createCanvasProjection({ algorithm: 'force' });
    const result = projection.projectSchema(testSchema);

    expect(result.positions.size).toBe(4);
    // Force layout should spread nodes apart
    const positions = Array.from(result.positions.values());
    positions.forEach((pos) => {
      expect(typeof pos.x).toBe('number');
      expect(typeof pos.y).toBe('number');
    });
  });

  it('should calculate bounds correctly', () => {
    const projection = createCanvasProjection({ algorithm: 'grid' });
    const result = projection.projectSchema(testSchema);

    expect(result.bounds.minX).toBeDefined();
    expect(result.bounds.minY).toBeDefined();
    expect(result.bounds.maxX).toBeDefined();
    expect(result.bounds.maxY).toBeDefined();
    expect(result.bounds.maxX).toBeGreaterThanOrEqual(result.bounds.minX);
    expect(result.bounds.maxY).toBeGreaterThanOrEqual(result.bounds.minY);
  });

  it('should center layout when requested', () => {
    const projection = createCanvasProjection({
      algorithm: 'grid',
      center: true,
    });
    const result = projection.projectSchema(testSchema);

    // With centering, the average position should be near (0, 0)
    let sumX = 0,
      sumY = 0;
    for (const pos of result.positions.values()) {
      sumX += pos.x;
      sumY += pos.y;
    }
    const avgX = sumX / result.positions.size;
    const avgY = sumY / result.positions.size;

    // Average should be close to 0 (allowing for rounding)
    expect(Math.abs(avgX)).toBeLessThan(100);
    expect(Math.abs(avgY)).toBeLessThan(100);
  });
});

describe('Canvas Component Props', () => {
  it('should export component prop types', async () => {
    const { createCanvasStateManager, createCanvasProjection } = await import(
      '../../ui/canvas/components/index.js'
    );

    expect(createCanvasStateManager).toBeDefined();
    expect(createCanvasProjection).toBeDefined();
  });
});
