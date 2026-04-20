/**
 * CodeCanvas Integration Tests
 */

import { describe, it, expect } from 'vitest';
import {
  schemaToCanvas,
  canvasToSchema,
  canvasToYaml,
  canvasToMermaid,
  createCanvasEditor,
  validateWithGuardian,
} from '../integrations/code-canvas.js';
import type { PSFSchema } from '../../core/schema-engine/psf.js';

describe('CodeCanvas Integration', () => {
  const testSchema: PSFSchema = {
    $version: '1.0.0',
    id: 'test-schema',
    name: 'TestSchema',
    description: 'A test schema',
    models: [
      {
        name: 'User',
        description: 'User model',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'name', type: 'string' },
        ],
      },
    ],
    components: [
      {
        name: 'UserForm',
        type: 'form',
        description: 'User form component',
        model: 'User',
      },
    ],
    events: [
      { tag: 'UserCreated', payload: { userId: 'string' }, description: 'User was created' },
    ],
    facts: [{ tag: 'UserExists', payload: { userId: 'string' }, description: 'User exists' }],
    rules: [{ id: 'create-user', description: 'Create user rule', then: 'createUser()' }],
    constraints: [
      {
        id: 'user-name-required',
        description: 'Name is required',
        check: 'name !== null',
        message: 'Name is required',
      },
    ],
    flows: [],
  };

  describe('schemaToCanvas', () => {
    it('should convert a schema to canvas document', () => {
      const canvas = schemaToCanvas(testSchema);

      expect(canvas).toBeDefined();
      expect(canvas.name).toBe('TestSchema');
      expect(canvas.version).toBe('1.0.0');
      expect(canvas.nodes.length).toBeGreaterThan(0);
    });

    it('should create nodes for models', () => {
      const canvas = schemaToCanvas(testSchema);
      const modelNodes = canvas.nodes.filter((n) => n.type === 'model');

      expect(modelNodes.length).toBe(1);
      expect(modelNodes[0].label).toBe('User');
    });

    it('should create nodes for components', () => {
      const canvas = schemaToCanvas(testSchema);
      const componentNodes = canvas.nodes.filter((n) => n.type === 'component');

      expect(componentNodes.length).toBe(1);
      expect(componentNodes[0].label).toBe('UserForm');
    });

    it('should create nodes for events', () => {
      const canvas = schemaToCanvas(testSchema);
      const eventNodes = canvas.nodes.filter((n) => n.type === 'event');

      expect(eventNodes.length).toBe(1);
      expect(eventNodes[0].label).toBe('UserCreated');
    });

    it('should create edges for component-model relationships', () => {
      const canvas = schemaToCanvas(testSchema);

      expect(canvas.edges.length).toBeGreaterThan(0);
      expect(canvas.edges[0].type).toBe('reference');
    });
  });

  describe('canvasToSchema', () => {
    it('should convert canvas back to schema', () => {
      const canvas = schemaToCanvas(testSchema);
      const schema = canvasToSchema(canvas);

      expect(schema).toBeDefined();
      expect(schema.name).toBe('TestSchema');
      expect(schema.$version).toBe('1.0.0');
    });

    it('should preserve models', () => {
      const canvas = schemaToCanvas(testSchema);
      const schema = canvasToSchema(canvas);

      expect(schema.models?.length).toBe(1);
      expect(schema.models?.[0].name).toBe('User');
    });

    it('should preserve components', () => {
      const canvas = schemaToCanvas(testSchema);
      const schema = canvasToSchema(canvas);

      expect(schema.components?.length).toBe(1);
      expect(schema.components?.[0].name).toBe('UserForm');
    });
  });

  describe('canvasToYaml', () => {
    it('should export canvas to YAML format', () => {
      const canvas = schemaToCanvas(testSchema);
      const yaml = canvasToYaml(canvas);

      expect(yaml).toContain('# TestSchema');
      expect(yaml).toContain('nodes:');
      expect(yaml).toContain('edges:');
    });
  });

  describe('canvasToMermaid', () => {
    it('should export canvas to Mermaid format', () => {
      const canvas = schemaToCanvas(testSchema);
      const mermaid = canvasToMermaid(canvas);

      expect(mermaid).toContain('graph TD');
      expect(mermaid).toContain('User');
    });
  });

  describe('createCanvasEditor', () => {
    it('should create an editor from schema', () => {
      const editor = createCanvasEditor({ schema: testSchema });

      expect(editor).toBeDefined();
      expect(editor.document).toBeDefined();
      expect(editor.document.nodes.length).toBeGreaterThan(0);
    });

    it('should add nodes', () => {
      const editor = createCanvasEditor({ schema: testSchema });
      const initialCount = editor.document.nodes.length;

      editor.addNode({
        type: 'model',
        label: 'NewModel',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      });

      expect(editor.document.nodes.length).toBe(initialCount + 1);
    });

    it('should remove nodes', () => {
      const editor = createCanvasEditor({ schema: testSchema });
      const node = editor.document.nodes[0];
      const initialCount = editor.document.nodes.length;

      editor.removeNode(node.id);

      expect(editor.document.nodes.length).toBe(initialCount - 1);
    });

    it('should add edges', () => {
      const editor = createCanvasEditor({ schema: testSchema });
      const initialCount = editor.document.edges.length;

      const nodes = editor.document.nodes;
      if (nodes.length >= 2) {
        editor.addEdge({
          source: nodes[0].id,
          target: nodes[1].id,
          type: 'dependency',
        });

        expect(editor.document.edges.length).toBe(initialCount + 1);
      }
    });

    it('should export to schema', () => {
      const editor = createCanvasEditor({ schema: testSchema });
      const schema = editor.toSchema();

      expect(schema).toBeDefined();
      expect(schema.name).toBe('TestSchema');
    });

    it('should export to YAML', () => {
      const editor = createCanvasEditor({ schema: testSchema });
      const yaml = editor.toYaml();

      expect(yaml).toContain('# TestSchema');
    });

    it('should export to Mermaid', () => {
      const editor = createCanvasEditor({ schema: testSchema });
      const mermaid = editor.toMermaid();

      expect(mermaid).toContain('graph TD');
    });
  });

  describe('validateWithGuardian', () => {
    it('should validate files against activity', () => {
      const result = validateWithGuardian(
        ['src/models/user.ts'],
        {
          activity: 'implementing',
          actor: 'developer',
          startedAt: Date.now(),
          allowedPaths: ['src/**/*'],
        },
        [{ id: 'implementing', name: 'Implementing', transitions: ['testing'] }]
      );

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should fail for invalid activity', () => {
      const result = validateWithGuardian(
        ['src/models/user.ts'],
        {
          activity: 'invalid' as any,
          actor: 'developer',
          startedAt: Date.now(),
        },
        [{ id: 'implementing', name: 'Implementing', transitions: [] }]
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_ACTIVITY')).toBe(true);
    });

    it('should fail for disallowed paths', () => {
      const result = validateWithGuardian(
        ['config/secrets.json'],
        {
          activity: 'implementing',
          actor: 'developer',
          startedAt: Date.now(),
          allowedPaths: ['src/**/*'],
        },
        [{ id: 'implementing', name: 'Implementing', transitions: [] }]
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'PATH_NOT_ALLOWED')).toBe(true);
    });
  });
});
