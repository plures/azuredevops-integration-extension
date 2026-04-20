/**
 * Documentation Generator Tests
 */

import { describe, it, expect } from 'vitest';
import { createEmptyPSFSchema } from '../../core/schema-engine/psf.js';
import { generateDocs, DocsGenerator } from '../../core/codegen/docs-generator.js';

describe('Documentation Generator', () => {
  it('should generate overview document', () => {
    const schema = createEmptyPSFSchema('test', 'Test App');
    schema.description = 'A test application';

    const result = generateDocs(schema);

    expect(result.success).toBe(true);
    const overview = result.files.find((f) => f.type === 'overview');
    expect(overview).toBeDefined();
    expect(overview?.content).toContain('# Test App');
    expect(overview?.content).toContain('A test application');
  });

  it('should generate API reference with facts and events', () => {
    const schema = createEmptyPSFSchema('test', 'Test App');
    schema.facts = [
      {
        id: 'fact_1',
        tag: 'UserCreated',
        description: 'User was created',
        payload: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
          },
        },
      },
    ];
    schema.events = [
      {
        id: 'event_1',
        tag: 'CreateUser',
        description: 'Create a user',
        payload: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
      },
    ];

    const result = generateDocs(schema, { includeApiReference: true, includeExamples: true });

    expect(result.success).toBe(true);
    const api = result.files.find((f) => f.type === 'api');
    expect(api).toBeDefined();
    expect(api?.content).toContain('UserCreated');
    expect(api?.content).toContain('CreateUser');
    expect(api?.content).toContain('User was created');
  });

  it('should generate models documentation', () => {
    const schema = createEmptyPSFSchema('test', 'Test App');
    schema.models = [
      {
        id: 'model_1',
        name: 'User',
        description: 'A user entity',
        fields: [
          { name: 'id', type: 'uuid', description: 'User ID' },
          { name: 'name', type: 'string', description: 'User name' },
          { name: 'email', type: 'string', optional: true },
        ],
      },
    ];

    const result = generateDocs(schema);

    expect(result.success).toBe(true);
    const models = result.files.find((f) => f.type === 'model');
    expect(models).toBeDefined();
    expect(models?.content).toContain('# Data Models');
    expect(models?.content).toContain('## User');
    expect(models?.content).toContain('| `id` | `uuid` | No | User ID |');
  });

  it('should generate components documentation', () => {
    const schema = createEmptyPSFSchema('test', 'Test App');
    schema.components = [
      {
        id: 'comp_1',
        name: 'UserForm',
        type: 'form',
        description: 'Form for creating users',
        props: [{ name: 'title', type: 'string', required: true, description: 'Form title' }],
        events: [{ name: 'submit', payload: 'User', description: 'Form submitted' }],
      },
    ];

    const result = generateDocs(schema);

    expect(result.success).toBe(true);
    const components = result.files.find((f) => f.type === 'component');
    expect(components).toBeDefined();
    expect(components?.content).toContain('# UI Components');
    expect(components?.content).toContain('## UserForm');
    expect(components?.content).toContain('Form for creating users');
  });

  it('should generate Mermaid diagrams', () => {
    const schema = createEmptyPSFSchema('test', 'Test App');
    schema.models = [
      {
        id: 'model_1',
        name: 'User',
        fields: [{ name: 'id', type: 'string' }],
        relationships: [{ name: 'posts', type: 'one-to-many', target: 'Post' }],
      },
      {
        id: 'model_2',
        name: 'Post',
        fields: [{ name: 'id', type: 'string' }],
      },
    ];
    schema.rules = [
      {
        id: 'user.create',
        name: 'Create User',
        description: 'Create a new user',
        triggers: ['CreateUser'],
        then: { inline: 'return []' },
      },
    ];

    const result = generateDocs(schema, { includeDiagrams: true });

    expect(result.success).toBe(true);
    const diagrams = result.files.find((f) => f.type === 'diagram');
    expect(diagrams).toBeDefined();
    expect(diagrams?.content).toContain('```mermaid');
    expect(diagrams?.content).toContain('erDiagram');
    expect(diagrams?.content).toContain('flowchart LR');
  });

  it('should generate index document', () => {
    const schema = createEmptyPSFSchema('test', 'Test App');
    schema.facts = [{ id: 'f1', tag: 'Test', payload: { type: 'object', properties: {} } }];

    const result = generateDocs(schema);

    expect(result.success).toBe(true);
    const index = result.files.find((f) => f.type === 'index');
    expect(index).toBeDefined();
    expect(index?.content).toContain('# Test App Documentation');
    expect(index?.content).toContain('overview.md');
  });

  it('should respect generator options', () => {
    const schema = createEmptyPSFSchema('test', 'Test App');

    const generator = new DocsGenerator({
      outputDir: './custom-docs',
      includeDiagrams: false,
      includeApiReference: false,
      includeExamples: false,
    });

    const result = generator.generate(schema);

    expect(result.success).toBe(true);
    expect(result.files.some((f) => f.type === 'diagram')).toBe(false);
    expect(result.files.some((f) => f.type === 'api')).toBe(false);
    expect(result.files[0].path).toContain('./custom-docs');
  });
});
