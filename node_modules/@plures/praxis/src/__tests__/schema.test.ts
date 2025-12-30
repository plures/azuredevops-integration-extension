import { describe, it, expect } from 'vitest';
import { validateSchema, createSchemaTemplate } from '../core/schema/types.js';
import { normalizeSchema } from '../core/schema/normalize.js';
import type { PraxisSchema } from '../core/schema/types.js';

describe('Schema System', () => {
  describe('validateSchema', () => {
    it('validates a valid schema', () => {
      const schema: PraxisSchema = {
        version: '1.0.0',
        name: 'TestSchema',
        models: [
          {
            name: 'User',
            fields: [
              { name: 'id', type: 'string' },
              { name: 'name', type: 'string' },
            ],
          },
        ],
      };

      const result = validateSchema(schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails validation when version is missing', () => {
      const schema = {
        name: 'TestSchema',
      } as PraxisSchema;

      const result = validateSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('version');
    });

    it('fails validation when name is missing', () => {
      const schema = {
        version: '1.0.0',
      } as PraxisSchema;

      const result = validateSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('name');
    });

    it('fails validation when model has no fields', () => {
      const schema: PraxisSchema = {
        version: '1.0.0',
        name: 'TestSchema',
        models: [
          {
            name: 'User',
            fields: [],
          },
        ],
      };

      const result = validateSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('fails validation when fact tag is not a valid identifier', () => {
      const schema: PraxisSchema = {
        version: '1.0.0',
        name: 'TestSchema',
        logic: [
          {
            id: 'test-logic',
            description: 'Test logic',
            facts: [
              {
                tag: 'Invalid-Tag',
                payload: { value: 'string' },
              },
            ],
          },
        ],
      };

      const result = validateSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('not a valid JavaScript identifier');
    });

    it('fails validation when event tag is not a valid identifier', () => {
      const schema: PraxisSchema = {
        version: '1.0.0',
        name: 'TestSchema',
        logic: [
          {
            id: 'test-logic',
            description: 'Test logic',
            events: [
              {
                tag: 'My Event',
                payload: { value: 'string' },
              },
            ],
          },
        ],
      };

      const result = validateSchema(schema);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('not a valid JavaScript identifier');
    });

    it('allows valid fact and event tags', () => {
      const schema: PraxisSchema = {
        version: '1.0.0',
        name: 'TestSchema',
        logic: [
          {
            id: 'test-logic',
            description: 'Test logic',
            facts: [
              {
                tag: 'ValidFactTag',
                payload: { value: 'string' },
              },
              {
                tag: 'ANOTHER_VALID_TAG',
                payload: { value: 'string' },
              },
            ],
            events: [
              {
                tag: 'ValidEvent',
                payload: { value: 'string' },
              },
            ],
          },
        ],
      };

      const result = validateSchema(schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('createSchemaTemplate', () => {
    it('creates a valid schema template', () => {
      const schema = createSchemaTemplate('MyApp');

      expect(schema.name).toBe('MyApp');
      expect(schema.version).toBe('1.0.0');
      expect(schema.description).toContain('MyApp');
      expect(schema.models).toBeDefined();
      expect(schema.components).toBeDefined();
      expect(schema.logic).toBeDefined();
    });
  });

  describe('normalizeSchema', () => {
    it('normalizes a schema with models', () => {
      const schema: PraxisSchema = {
        version: '1.0.0',
        name: 'TestApp',
        models: [
          {
            name: 'User',
            fields: [
              { name: 'id', type: 'string' },
              { name: 'name', type: 'string' },
            ],
          },
        ],
      };

      const normalized = normalizeSchema(schema);

      expect(normalized.models).toHaveLength(1);
      expect(normalized.models[0].fullName).toBe('TestApp.User');
      expect(normalized.models[0].allFields).toHaveLength(2);
    });

    it('resolves model references in components', () => {
      const schema: PraxisSchema = {
        version: '1.0.0',
        name: 'TestApp',
        models: [
          {
            name: 'User',
            fields: [{ name: 'id', type: 'string' }],
          },
        ],
        components: [
          {
            name: 'UserForm',
            type: 'form',
            model: 'User',
          },
        ],
      };

      const normalized = normalizeSchema(schema);

      expect(normalized.components).toHaveLength(1);
      expect(normalized.components[0].resolvedModel).toBeDefined();
      expect(normalized.components[0].resolvedModel?.name).toBe('User');
    });

    it('extracts model dependencies', () => {
      const schema: PraxisSchema = {
        version: '1.0.0',
        name: 'TestApp',
        models: [
          {
            name: 'User',
            fields: [{ name: 'id', type: 'string' }],
          },
          {
            name: 'Task',
            fields: [
              { name: 'id', type: 'string' },
              { name: 'userId', type: { reference: 'User' } },
            ],
          },
        ],
      };

      const normalized = normalizeSchema(schema);
      const taskModel = normalized.models.find((m) => m.name === 'Task');

      expect(taskModel).toBeDefined();
      expect(taskModel?.dependencies).toContain('User');
    });
  });
});
