/**
 * PSF Schema Engine Tests
 */

import { describe, it, expect } from 'vitest';
import {
  PSF_VERSION,
  createEmptyPSFSchema,
  generatePSFId,
  type PSFSchema,
} from '../../core/schema-engine/psf.js';
import {
  PSFCompiler,
  createPSFCompiler,
  compileToPSF,
  type DSLSchema,
} from '../../core/schema-engine/compiler.js';
import {
  PSFGenerator,
  createPSFGenerator,
  generateFromPSF,
} from '../../core/schema-engine/generator.js';
import {
  PSFValidator,
  createPSFValidator,
  validatePSFSchema,
} from '../../core/schema-engine/validator.js';

describe('PSF Schema Engine', () => {
  describe('PSF Types', () => {
    it('should have correct version', () => {
      expect(PSF_VERSION).toBe('1.0.0');
    });

    it('should create empty schema', () => {
      const schema = createEmptyPSFSchema('test-id', 'Test Schema');

      expect(schema.$version).toBe(PSF_VERSION);
      expect(schema.id).toBe('test-id');
      expect(schema.name).toBe('Test Schema');
      expect(schema.facts).toEqual([]);
      expect(schema.events).toEqual([]);
      expect(schema.rules).toEqual([]);
      expect(schema.constraints).toEqual([]);
      expect(schema.models).toEqual([]);
      expect(schema.components).toEqual([]);
      expect(schema.flows).toEqual([]);
    });

    it('should generate unique IDs', () => {
      const id1 = generatePSFId('fact');
      const id2 = generatePSFId('fact');

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^fact_/);
      expect(id2).toMatch(/^fact_/);
    });
  });

  describe('PSF Compiler', () => {
    it('should compile empty schema', () => {
      const input: DSLSchema = {
        name: 'Test App',
      };

      const result = compileToPSF(input);

      expect(result.success).toBe(true);
      expect(result.schema).toBeDefined();
      expect(result.schema?.name).toBe('Test App');
      expect(result.errors).toHaveLength(0);
    });

    it('should compile facts', () => {
      const input: DSLSchema = {
        name: 'Test App',
        facts: [
          {
            tag: 'UserCreated',
            description: 'User was created',
            payload: { userId: 'string', name: 'string' },
          },
        ],
      };

      const result = compileToPSF(input);

      expect(result.success).toBe(true);
      expect(result.schema?.facts).toHaveLength(1);
      expect(result.schema?.facts[0].tag).toBe('UserCreated');
      expect(result.schema?.facts[0].payload.properties.userId.type).toBe('string');
    });

    it('should compile events', () => {
      const input: DSLSchema = {
        name: 'Test App',
        events: [
          {
            tag: 'CreateUser',
            description: 'Create a new user',
            payload: { name: 'string', email: 'string' },
          },
        ],
      };

      const result = compileToPSF(input);

      expect(result.success).toBe(true);
      expect(result.schema?.events).toHaveLength(1);
      expect(result.schema?.events[0].tag).toBe('CreateUser');
    });

    it('should compile rules', () => {
      const input: DSLSchema = {
        name: 'Test App',
        rules: [
          {
            id: 'user.create',
            description: 'Create user on event',
            triggers: ['CreateUser'],
            then: 'return []',
          },
        ],
      };

      const result = compileToPSF(input);

      expect(result.success).toBe(true);
      expect(result.schema?.rules).toHaveLength(1);
      expect(result.schema?.rules[0].id).toBe('user.create');
      expect(result.schema?.rules[0].triggers).toContain('CreateUser');
    });

    it('should compile constraints', () => {
      const input: DSLSchema = {
        name: 'Test App',
        constraints: [
          {
            id: 'positive.count',
            description: 'Count must be positive',
            check: 'state.context.count >= 0',
            errorMessage: 'Count cannot be negative',
          },
        ],
      };

      const result = compileToPSF(input);

      expect(result.success).toBe(true);
      expect(result.schema?.constraints).toHaveLength(1);
      expect(result.schema?.constraints[0].id).toBe('positive.count');
    });

    it('should compile models', () => {
      const input: DSLSchema = {
        name: 'Test App',
        models: [
          {
            name: 'User',
            description: 'A user entity',
            fields: [
              { name: 'id', type: 'uuid' },
              { name: 'name', type: 'string' },
              { name: 'email', type: 'string' },
              { name: 'createdAt', type: 'datetime', optional: true },
            ],
          },
        ],
      };

      const result = compileToPSF(input);

      expect(result.success).toBe(true);
      expect(result.schema?.models).toHaveLength(1);
      expect(result.schema?.models[0].name).toBe('User');
      expect(result.schema?.models[0].fields).toHaveLength(4);
    });

    it('should report errors for invalid identifiers', () => {
      const input: DSLSchema = {
        name: 'Test App',
        facts: [
          {
            tag: '123Invalid', // Invalid - starts with number
            payload: {},
          },
        ],
      };

      const result = compileToPSF(input);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('invalid-identifier');
    });
  });

  describe('PSF Generator', () => {
    it('should generate code from schema', () => {
      const schema = createEmptyPSFSchema('test', 'Test App');
      schema.facts = [
        {
          id: 'fact_1',
          tag: 'UserCreated',
          description: 'User was created',
          payload: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
            },
          },
        },
      ];
      schema.events = [
        {
          id: 'event_1',
          tag: 'CreateUser',
          description: 'Create a new user',
          payload: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        },
      ];

      const result = generateFromPSF(schema);

      expect(result.success).toBe(true);
      expect(result.files.length).toBeGreaterThan(0);

      const factsFile = result.files.find((f) => f.type === 'facts');
      expect(factsFile).toBeDefined();
      expect(factsFile?.content).toContain('UserCreated');
      expect(factsFile?.content).toContain('defineFact');

      const eventsFile = result.files.find((f) => f.type === 'events');
      expect(eventsFile).toBeDefined();
      expect(eventsFile?.content).toContain('CreateUser');
      expect(eventsFile?.content).toContain('defineEvent');
    });

    it('should generate rules file', () => {
      const schema = createEmptyPSFSchema('test', 'Test App');
      schema.rules = [
        {
          id: 'user.create',
          description: 'Create user rule',
          triggers: ['CreateUser'],
          then: { inline: 'return []' },
        },
      ];

      const result = generateFromPSF(schema);

      const rulesFile = result.files.find((f) => f.type === 'rules');
      expect(rulesFile).toBeDefined();
      expect(rulesFile?.content).toContain('user_createRule');
      expect(rulesFile?.content).toContain('defineRule');
    });

    it('should generate models file', () => {
      const schema = createEmptyPSFSchema('test', 'Test App');
      schema.models = [
        {
          id: 'model_1',
          name: 'User',
          description: 'User model',
          fields: [
            { name: 'id', type: 'uuid' },
            { name: 'name', type: 'string' },
          ],
        },
      ];

      const result = generateFromPSF(schema);

      const modelsFile = result.files.find((f) => f.type === 'models');
      expect(modelsFile).toBeDefined();
      expect(modelsFile?.content).toContain('interface User');
      expect(modelsFile?.content).toContain('id: string');
      expect(modelsFile?.content).toContain('name: string');
    });

    it('should generate index file', () => {
      const schema = createEmptyPSFSchema('test', 'Test App');
      schema.facts = [{ id: 'f1', tag: 'TestFact', payload: { type: 'object', properties: {} } }];

      const result = generateFromPSF(schema, { generateIndex: true });

      const indexFile = result.files.find((f) => f.type === 'index');
      expect(indexFile).toBeDefined();
      expect(indexFile?.content).toContain("export * from './facts.js'");
    });
  });

  describe('PSF Validator', () => {
    it('should validate correct schema', () => {
      const schema = createEmptyPSFSchema('test', 'Test App');

      const result = validatePSFSchema(schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report missing required fields', () => {
      const schema = {} as PSFSchema;

      const result = validatePSFSchema(schema);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'missing-version')).toBe(true);
      expect(result.errors.some((e) => e.code === 'missing-id')).toBe(true);
      expect(result.errors.some((e) => e.code === 'missing-name')).toBe(true);
    });

    it('should report invalid fact tags', () => {
      const schema = createEmptyPSFSchema('test', 'Test App');
      schema.facts = [
        {
          id: 'fact_1',
          tag: 'class', // Reserved keyword
          payload: { type: 'object', properties: {} },
        },
      ];

      const result = validatePSFSchema(schema);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'invalid-identifier')).toBe(true);
    });

    it('should report missing rule action', () => {
      const schema = createEmptyPSFSchema('test', 'Test App');
      schema.rules = [
        {
          id: 'rule_1',
          description: 'Test rule',
          then: undefined as any, // Missing required field
        },
      ];

      const result = validatePSFSchema(schema);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'missing-action')).toBe(true);
    });

    it('should detect duplicate IDs', () => {
      const schema = createEmptyPSFSchema('test', 'Test App');
      schema.facts = [
        { id: 'duplicate_id', tag: 'Fact1', payload: { type: 'object', properties: {} } },
      ];
      schema.events = [
        { id: 'duplicate_id', tag: 'Event1', payload: { type: 'object', properties: {} } },
      ];

      const result = validatePSFSchema(schema, { checkDuplicates: true });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'duplicate-id')).toBe(true);
    });

    it('should warn about unknown model references', () => {
      const schema = createEmptyPSFSchema('test', 'Test App');
      schema.components = [
        {
          id: 'comp_1',
          name: 'UserForm',
          type: 'form',
          model: 'NonExistentModel',
          props: [],
          events: [],
        },
      ];

      const result = validatePSFSchema(schema, { checkReferences: true });

      expect(result.warnings.some((w) => w.code === 'unknown-model')).toBe(true);
    });
  });

  describe('Round-trip (Compile → Generate)', () => {
    it('should preserve schema through compile and generate', () => {
      const input: DSLSchema = {
        name: 'Round Trip App',
        description: 'Testing round-trip',
        facts: [
          {
            tag: 'ItemAdded',
            description: 'Item was added',
            payload: { itemId: 'string', name: 'string' },
          },
        ],
        events: [
          {
            tag: 'AddItem',
            description: 'Add an item',
            payload: { name: 'string', quantity: 'number' },
          },
        ],
        rules: [
          {
            id: 'item.add',
            description: 'Add item on event',
            triggers: ['AddItem'],
            then: 'return []',
          },
        ],
        models: [
          {
            name: 'Item',
            fields: [
              { name: 'id', type: 'uuid' },
              { name: 'name', type: 'string' },
              { name: 'quantity', type: 'number' },
            ],
          },
        ],
      };

      // Compile DSL to PSF
      const compileResult = compileToPSF(input);
      expect(compileResult.success).toBe(true);

      // Validate compiled schema
      const validationResult = validatePSFSchema(compileResult.schema!);
      expect(validationResult.valid).toBe(true);

      // Generate code from PSF
      const generateResult = generateFromPSF(compileResult.schema!);
      expect(generateResult.success).toBe(true);

      // Verify generated files contain expected content
      const factsFile = generateResult.files.find((f) => f.type === 'facts');
      expect(factsFile?.content).toContain('ItemAdded');

      const eventsFile = generateResult.files.find((f) => f.type === 'events');
      expect(eventsFile?.content).toContain('AddItem');

      const rulesFile = generateResult.files.find((f) => f.type === 'rules');
      expect(rulesFile?.content).toContain('item_addRule');

      const modelsFile = generateResult.files.find((f) => f.type === 'models');
      expect(modelsFile?.content).toContain('interface Item');
    });
  });
});
