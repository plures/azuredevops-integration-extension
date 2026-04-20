import { describe, it, expect } from 'vitest';
import { createLogicGenerator } from '../core/logic/generator.js';
import { createComponentGenerator } from '../core/component/generator.js';
import { createPluresDBGenerator } from '../core/pluresdb/generator.js';
import { normalizeSchema } from '../core/schema/normalize.js';
import type { PraxisSchema } from '../core/schema/types.js';

describe('Code Generators', () => {
  const testSchema: PraxisSchema = {
    version: '1.0.0',
    name: 'TestApp',
    models: [
      {
        name: 'User',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'name', type: 'string' },
          { name: 'email', type: 'string' },
        ],
      },
    ],
    components: [
      {
        name: 'UserForm',
        type: 'form',
        model: 'User',
      },
    ],
    logic: [
      {
        id: 'user-logic',
        description: 'User logic',
        events: [
          {
            tag: 'CREATE_USER',
            payload: { name: 'string', email: 'string' },
          },
        ],
        facts: [
          {
            tag: 'UserCreated',
            payload: { userId: 'string' },
          },
        ],
      },
    ],
  };

  describe('LogicGenerator', () => {
    it('generates logic files', () => {
      const normalized = normalizeSchema(testSchema);
      const generator = createLogicGenerator('/tmp/test');

      const files = generator.generateLogic(normalized);

      expect(files).toHaveLength(5);
      expect(files.map((f) => f.type)).toContain('facts');
      expect(files.map((f) => f.type)).toContain('events');
      expect(files.map((f) => f.type)).toContain('rules');
      expect(files.map((f) => f.type)).toContain('engine');
      expect(files.map((f) => f.type)).toContain('index');
    });

    it('generates facts with correct types', () => {
      const normalized = normalizeSchema(testSchema);
      const generator = createLogicGenerator('/tmp/test');

      const files = generator.generateLogic(normalized);
      const factsFile = files.find((f) => f.type === 'facts');

      expect(factsFile).toBeDefined();
      expect(factsFile?.content).toContain('UserCreated');
      expect(factsFile?.content).toContain('defineFact');
      expect(factsFile?.content).toContain('userId: string');
    });

    it('generates events with correct types', () => {
      const normalized = normalizeSchema(testSchema);
      const generator = createLogicGenerator('/tmp/test');

      const files = generator.generateLogic(normalized);
      const eventsFile = files.find((f) => f.type === 'events');

      expect(eventsFile).toBeDefined();
      expect(eventsFile?.content).toContain('CREATE_USER');
      expect(eventsFile?.content).toContain('defineEvent');
      expect(eventsFile?.content).toContain('name: string');
      expect(eventsFile?.content).toContain('email: string');
    });

    it('generates engine with model types', () => {
      const normalized = normalizeSchema(testSchema);
      const generator = createLogicGenerator('/tmp/test');

      const files = generator.generateLogic(normalized);
      const engineFile = files.find((f) => f.type === 'engine');

      expect(engineFile).toBeDefined();
      expect(engineFile?.content).toContain('interface User');
      expect(engineFile?.content).toContain('id: string');
      expect(engineFile?.content).toContain('name: string');
      expect(engineFile?.content).toContain('email: string');
    });
  });

  describe('ComponentGenerator', () => {
    it('generates component files', () => {
      const component = testSchema.components![0];
      const model = testSchema.models![0];
      const generator = createComponentGenerator('/tmp/test', {
        typescript: true,
        includeDocs: true,
      });

      const result = generator.generateComponent(component, model);

      expect(result.success).toBe(true);
      expect(result.files.length).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
    });

    it('generates Svelte component with form fields', () => {
      const component = testSchema.components![0];
      const model = testSchema.models![0];
      const generator = createComponentGenerator('/tmp/test');

      const result = generator.generateComponent(component, model);
      const componentFile = result.files.find((f) => f.type === 'component');

      expect(componentFile).toBeDefined();
      expect(componentFile?.content).toContain('<form');
      expect(componentFile?.content).toContain('input');
      expect(componentFile?.content).toContain('id');
      expect(componentFile?.content).toContain('name');
      expect(componentFile?.content).toContain('email');
    });

    it('generates TypeScript types when enabled', () => {
      const component = testSchema.components![0];
      const model = testSchema.models![0];
      const generator = createComponentGenerator('/tmp/test', {
        typescript: true,
      });

      const result = generator.generateComponent(component, model);
      const typesFile = result.files.find((f) => f.type === 'types');

      expect(typesFile).toBeDefined();
      expect(typesFile?.content).toContain('interface User');
    });

    it('generates documentation when enabled', () => {
      const component = testSchema.components![0];
      const model = testSchema.models![0];
      const generator = createComponentGenerator('/tmp/test', {
        includeDocs: true,
      });

      const result = generator.generateComponent(component, model);
      const docsFile = result.files.find((f) => f.type === 'docs');

      expect(docsFile).toBeDefined();
      expect(docsFile?.content).toContain('# UserForm');
    });
  });

  describe('PluresDBGenerator', () => {
    it('generates PluresDB config', () => {
      const normalized = normalizeSchema(testSchema);
      const generator = createPluresDBGenerator('/tmp/test');

      const files = generator.generateConfig(normalized);

      expect(files).toHaveLength(1);
      expect(files[0].type).toBe('config');
    });

    it('generates stores for models', () => {
      const normalized = normalizeSchema(testSchema);
      const generator = createPluresDBGenerator('/tmp/test');

      const files = generator.generateConfig(normalized);
      const configFile = files[0];

      expect(configFile.content).toContain('users:');
      expect(configFile.content).toContain("keyPath: 'id'");
      expect(configFile.content).toContain('indexes:');
    });

    it('includes database name in config', () => {
      const normalized = normalizeSchema(testSchema);
      const generator = createPluresDBGenerator('/tmp/test', {
        dbName: 'custom-db',
      });

      const files = generator.generateConfig(normalized);
      const configFile = files[0];

      expect(configFile.content).toContain("name: 'custom-db'");
    });

    it('includes sync config when enabled', () => {
      const normalized = normalizeSchema(testSchema);
      const generator = createPluresDBGenerator('/tmp/test', {
        enableSync: true,
        syncEndpoint: 'ws://example.com/sync',
      });

      const files = generator.generateConfig(normalized);
      const configFile = files[0];

      expect(configFile.content).toContain('sync:');
      expect(configFile.content).toContain('enabled: true');
      expect(configFile.content).toContain('ws://example.com/sync');
    });

    it('respects autoIndex "all" strategy', () => {
      const normalized = normalizeSchema(testSchema);
      const generator = createPluresDBGenerator('/tmp/test', {
        autoIndex: 'all',
      });

      const files = generator.generateConfig(normalized);
      const configFile = files[0];

      // Should include all string/number/date fields
      expect(configFile.content).toContain("indexes: ['name', 'email']");
      expect(configFile.content).toContain('auto-indexed by default');
    });

    it('respects autoIndex "explicit" strategy', () => {
      const schemaWithIndexes = {
        ...testSchema,
        models: [
          {
            ...testSchema.models![0],
            indexes: [{ name: 'email_idx', fields: ['email'] }],
          },
        ],
      };
      const normalized = normalizeSchema(schemaWithIndexes);
      const generator = createPluresDBGenerator('/tmp/test', {
        autoIndex: 'explicit',
      });

      const files = generator.generateConfig(normalized);
      const configFile = files[0];

      // Should only include explicitly defined indexes
      expect(configFile.content).toContain("indexes: ['email']");
      expect(configFile.content).toContain('explicitly defined in schema');
    });

    it('respects autoIndex "none" strategy', () => {
      const normalized = normalizeSchema(testSchema);
      const generator = createPluresDBGenerator('/tmp/test', {
        autoIndex: 'none',
      });

      const files = generator.generateConfig(normalized);
      const configFile = files[0];

      // Should indicate auto-indexing is disabled in comment
      expect(configFile.content).toContain('Auto-indexing disabled');
      // Store config should not have indexes array (since none are auto-generated)
      expect(configFile.content).not.toMatch(/users:\s*\{\s*keyPath:\s*'id',\s*indexes:/);
    });
  });
});
