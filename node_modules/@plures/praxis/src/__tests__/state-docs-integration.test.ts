/**
 * State-Docs Integration Tests
 */

import { describe, it, expect } from 'vitest';
import {
  createStateDocsGenerator,
  generateDocs,
  StateDocsGenerator,
} from '../integrations/state-docs.js';
import type { PraxisSchema } from '../core/schema/types.js';

describe('State-Docs Integration', () => {
  const testSchema: PraxisSchema = {
    version: '1.0.0',
    name: 'TestProject',
    description: 'A test project for documentation generation',
    models: [
      {
        name: 'User',
        description: 'User model',
        fields: [
          { name: 'id', type: 'string', description: 'User ID' },
          { name: 'name', type: 'string', description: 'User name' },
          { name: 'email', type: 'string', description: 'Email address', optional: true },
        ],
      },
      {
        name: 'Post',
        description: 'Blog post model',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'title', type: 'string' },
          { name: 'content', type: 'string' },
          { name: 'authorId', type: 'string' },
        ],
      },
    ],
    components: [
      {
        name: 'UserProfile',
        type: 'display',
        description: 'User profile display component',
        model: 'User',
      },
      {
        name: 'PostEditor',
        type: 'form',
        description: 'Post editing form',
        model: 'Post',
      },
    ],
    logic: [
      {
        id: 'auth-logic',
        description: 'Authentication logic module',
        events: [
          {
            tag: 'Login',
            payload: { username: 'string', password: 'string' },
            description: 'User login event',
          },
          { tag: 'Logout', payload: { userId: 'string' }, description: 'User logout event' },
        ],
        facts: [
          {
            tag: 'UserLoggedIn',
            payload: { userId: 'string', timestamp: 'number' },
            description: 'User is logged in',
          },
        ],
        rules: [
          {
            id: 'process-login',
            description: 'Process login request',
            then: 'validateCredentials()',
          },
        ],
        constraints: [
          {
            id: 'valid-session',
            description: 'Session must be valid',
            check: 'session.isValid()',
            message: 'Invalid session',
          },
        ],
      },
    ],
  };

  describe('createStateDocsGenerator', () => {
    it('should create a generator with default config', () => {
      const generator = createStateDocsGenerator({
        projectTitle: 'Test Project',
      });

      expect(generator).toBeInstanceOf(StateDocsGenerator);
    });

    it('should create a generator with custom config', () => {
      const generator = createStateDocsGenerator({
        projectTitle: 'Test Project',
        target: './custom-docs',
        visualization: {
          format: 'mermaid',
          theme: 'dark',
        },
        template: {
          toc: true,
          timestamp: false,
        },
      });

      expect(generator).toBeInstanceOf(StateDocsGenerator);
    });
  });

  describe('generateFromSchema', () => {
    it('should generate documentation from schema', () => {
      const generator = createStateDocsGenerator({
        projectTitle: 'Test Project',
      });

      const docs = generator.generateFromSchema(testSchema);

      expect(docs).toBeDefined();
      expect(docs.length).toBeGreaterThan(0);
    });

    it('should generate README', () => {
      const generator = createStateDocsGenerator({
        projectTitle: 'Test Project',
      });

      const docs = generator.generateFromSchema(testSchema);
      const readme = docs.find((d) => d.path.endsWith('README.md'));

      expect(readme).toBeDefined();
      expect(readme?.type).toBe('markdown');
      expect(readme?.content).toContain('TestProject');
    });

    it('should generate models documentation', () => {
      const generator = createStateDocsGenerator({
        projectTitle: 'Test Project',
      });

      const docs = generator.generateFromSchema(testSchema);
      const modelsDocs = docs.find((d) => d.path.endsWith('models.md'));

      expect(modelsDocs).toBeDefined();
      expect(modelsDocs?.content).toContain('User');
      expect(modelsDocs?.content).toContain('Post');
    });

    it('should generate components documentation', () => {
      const generator = createStateDocsGenerator({
        projectTitle: 'Test Project',
      });

      const docs = generator.generateFromSchema(testSchema);
      const componentsDocs = docs.find((d) => d.path.endsWith('components.md'));

      expect(componentsDocs).toBeDefined();
      expect(componentsDocs?.content).toContain('UserProfile');
      expect(componentsDocs?.content).toContain('PostEditor');
    });

    it('should generate logic documentation', () => {
      const generator = createStateDocsGenerator({
        projectTitle: 'Test Project',
      });

      const docs = generator.generateFromSchema(testSchema);
      const logicDocs = docs.find((d) => d.path.includes('auth-logic.md'));

      expect(logicDocs).toBeDefined();
      expect(logicDocs?.content).toContain('Login');
      expect(logicDocs?.content).toContain('Logout');
    });

    it('should generate Mermaid diagrams', () => {
      const generator = createStateDocsGenerator({
        projectTitle: 'Test Project',
      });

      const docs = generator.generateFromSchema(testSchema);
      const mermaidDocs = docs.filter((d) => d.type === 'mermaid');

      expect(mermaidDocs.length).toBeGreaterThan(0);
      expect(mermaidDocs[0].content).toContain('stateDiagram-v2');
    });

    it('should include table of contents when enabled', () => {
      const generator = createStateDocsGenerator({
        projectTitle: 'Test Project',
        template: { toc: true },
      });

      const docs = generator.generateFromSchema(testSchema);
      const readme = docs.find((d) => d.path.endsWith('README.md'));

      expect(readme?.content).toContain('Table of Contents');
    });

    it('should include timestamp when enabled', () => {
      const generator = createStateDocsGenerator({
        projectTitle: 'Test Project',
        template: { timestamp: true },
      });

      const docs = generator.generateFromSchema(testSchema);
      const readme = docs.find((d) => d.path.endsWith('README.md'));

      expect(readme?.content).toContain('Generated on');
    });

    it('should include statistics', () => {
      const generator = createStateDocsGenerator({
        projectTitle: 'Test Project',
      });

      const docs = generator.generateFromSchema(testSchema);
      const readme = docs.find((d) => d.path.endsWith('README.md'));

      expect(readme?.content).toContain('Statistics');
      expect(readme?.content).toContain('Models');
      expect(readme?.content).toContain('Components');
    });
  });

  describe('generateDocs (convenience function)', () => {
    it('should generate docs directly from schema', () => {
      const docs = generateDocs(testSchema, {
        projectTitle: 'Quick Project',
      });

      expect(docs).toBeDefined();
      expect(docs.length).toBeGreaterThan(0);
    });
  });

  describe('generateFromModule', () => {
    it('should generate documentation from a Praxis module', () => {
      const generator = createStateDocsGenerator({
        projectTitle: 'Test Project',
      });

      const docs = generator.generateFromModule({
        rules: [
          {
            id: 'test-rule',
            description: 'A test rule',
            impl: () => [],
          },
        ],
        constraints: [
          {
            id: 'test-constraint',
            description: 'A test constraint',
            impl: () => true,
          },
        ],
      });

      expect(docs.length).toBe(3); // rules.md, constraints.md, state-diagram.mmd
    });

    it('should generate rules documentation from module', () => {
      const generator = createStateDocsGenerator({
        projectTitle: 'Test Project',
      });

      const docs = generator.generateFromModule({
        rules: [
          {
            id: 'auth.login',
            description: 'Process user login',
            impl: () => [],
          },
        ],
        constraints: [],
      });

      const rulesDocs = docs.find((d) => d.path.endsWith('rules.md'));
      expect(rulesDocs).toBeDefined();
      expect(rulesDocs?.content).toContain('auth.login');
      expect(rulesDocs?.content).toContain('Process user login');
    });

    it('should generate constraints documentation from module', () => {
      const generator = createStateDocsGenerator({
        projectTitle: 'Test Project',
      });

      const docs = generator.generateFromModule({
        rules: [],
        constraints: [
          {
            id: 'user.valid',
            description: 'User must be valid',
            impl: () => true,
            meta: { errorMessage: 'User is invalid' },
          },
        ],
      });

      const constraintsDocs = docs.find((d) => d.path.endsWith('constraints.md'));
      expect(constraintsDocs).toBeDefined();
      expect(constraintsDocs?.content).toContain('user.valid');
      expect(constraintsDocs?.content).toContain('User must be valid');
    });
  });
});
