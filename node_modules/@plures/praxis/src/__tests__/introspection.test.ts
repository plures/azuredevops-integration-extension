/**
 * Introspection tests
 */

import { describe, it, expect } from 'vitest';
import { PraxisRegistry } from '../core/rules.js';
import { defineRule, defineConstraint, defineModule } from '../dsl/index.js';
import { RegistryIntrospector, createIntrospector } from '../core/introspection.js';
import { PRAXIS_PROTOCOL_VERSION } from '../core/protocol.js';

describe('Registry Introspection', () => {
  describe('RegistryIntrospector', () => {
    it('should get basic statistics', () => {
      const registry = new PraxisRegistry<{ value: number }>();

      registry.registerRule(defineRule({ id: 'rule1', description: 'Rule 1', impl: () => [] }));
      registry.registerRule(defineRule({ id: 'rule2', description: 'Rule 2', impl: () => [] }));
      registry.registerConstraint(
        defineConstraint({ id: 'c1', description: 'Constraint 1', impl: () => true })
      );

      const introspector = new RegistryIntrospector(registry);
      const stats = introspector.getStats();

      expect(stats.ruleCount).toBe(2);
      expect(stats.constraintCount).toBe(1);
      expect(stats.rulesById).toEqual(['rule1', 'rule2']);
      expect(stats.constraintsById).toEqual(['c1']);
    });

    it('should generate schema', () => {
      const registry = new PraxisRegistry<{ value: number }>();

      registry.registerRule(
        defineRule({
          id: 'rule1',
          description: 'Test rule',
          impl: () => [],
          meta: { category: 'test' },
        })
      );
      registry.registerConstraint(
        defineConstraint({
          id: 'c1',
          description: 'Test constraint',
          impl: () => true,
          meta: { level: 'error' },
        })
      );

      const introspector = new RegistryIntrospector(registry);
      const schema = introspector.generateSchema(PRAXIS_PROTOCOL_VERSION);

      expect(schema.protocolVersion).toBe(PRAXIS_PROTOCOL_VERSION);
      expect(schema.rules).toHaveLength(1);
      expect(schema.constraints).toHaveLength(1);
      expect(schema.rules[0]?.id).toBe('rule1');
      expect(schema.rules[0]?.description).toBe('Test rule');
      expect(schema.rules[0]?.meta).toEqual({ category: 'test' });
      expect(schema.constraints[0]?.id).toBe('c1');
      expect(schema.constraints[0]?.meta).toEqual({ level: 'error' });
    });

    it('should generate graph', () => {
      const registry = new PraxisRegistry<{ value: number }>();

      registry.registerRule(defineRule({ id: 'rule1', description: 'Rule 1', impl: () => [] }));
      registry.registerRule(defineRule({ id: 'rule2', description: 'Rule 2', impl: () => [] }));
      registry.registerConstraint(
        defineConstraint({ id: 'c1', description: 'Constraint 1', impl: () => true })
      );

      const introspector = new RegistryIntrospector(registry);
      const graph = introspector.generateGraph();

      expect(graph.nodes).toHaveLength(3);
      expect(graph.nodes.filter((n) => n.type === 'rule')).toHaveLength(2);
      expect(graph.nodes.filter((n) => n.type === 'constraint')).toHaveLength(1);
      expect(graph.meta.nodeCount).toBe(3);
      expect(graph.meta.ruleCount).toBe(2);
      expect(graph.meta.constraintCount).toBe(1);
    });

    it('should generate graph with dependencies', () => {
      const registry = new PraxisRegistry<{ value: number }>();

      registry.registerRule(
        defineRule({
          id: 'rule1',
          description: 'Rule 1',
          impl: () => [],
          meta: {},
        })
      );
      registry.registerRule(
        defineRule({
          id: 'rule2',
          description: 'Rule 2 depends on Rule 1',
          impl: () => [],
          meta: { dependsOn: 'rule1' },
        })
      );

      const introspector = new RegistryIntrospector(registry);
      const graph = introspector.generateGraph();

      expect(graph.edges).toHaveLength(1);
      expect(graph.edges[0]).toEqual({
        from: 'rule1',
        to: 'rule2',
        type: 'depends-on',
      });
    });

    it('should generate graph with constraint relationships', () => {
      const registry = new PraxisRegistry<{ value: number }>();

      registry.registerRule(defineRule({ id: 'rule1', description: 'Rule 1', impl: () => [] }));
      registry.registerConstraint(
        defineConstraint({
          id: 'c1',
          description: 'Constrains rule1',
          impl: () => true,
          meta: { constrains: 'rule1' },
        })
      );

      const introspector = new RegistryIntrospector(registry);
      const graph = introspector.generateGraph();

      expect(graph.edges).toHaveLength(1);
      expect(graph.edges[0]).toEqual({
        from: 'c1',
        to: 'rule1',
        type: 'constrains',
      });
    });

    it('should export DOT format', () => {
      const registry = new PraxisRegistry<{ value: number }>();

      registry.registerRule(defineRule({ id: 'rule1', description: 'Rule 1', impl: () => [] }));
      registry.registerConstraint(
        defineConstraint({ id: 'c1', description: 'Constraint 1', impl: () => true })
      );

      const introspector = new RegistryIntrospector(registry);
      const dot = introspector.exportDOT();

      expect(dot).toContain('digraph PraxisRegistry');
      expect(dot).toContain('"rule1"');
      expect(dot).toContain('"c1"');
      expect(dot).toContain('shape=box');
      expect(dot).toContain('shape=diamond');
    });

    it('should export Mermaid format', () => {
      const registry = new PraxisRegistry<{ value: number }>();

      registry.registerRule(defineRule({ id: 'rule1', description: 'Rule 1', impl: () => [] }));
      registry.registerConstraint(
        defineConstraint({ id: 'c1', description: 'Constraint 1', impl: () => true })
      );

      const introspector = new RegistryIntrospector(registry);
      const mermaid = introspector.exportMermaid();

      expect(mermaid).toContain('graph TB');
      expect(mermaid).toContain('rule1');
      expect(mermaid).toContain('c1');
    });

    it('should get rule info', () => {
      const rule = defineRule({
        id: 'test.rule',
        description: 'Test rule',
        impl: () => [],
        meta: { version: '1.0.0' },
      });

      const registry = new PraxisRegistry<{ value: number }>();
      registry.registerRule(rule);

      const introspector = new RegistryIntrospector(registry);
      const info = introspector.getRuleInfo('test.rule');

      expect(info).toBeDefined();
      expect(info?.id).toBe('test.rule');
      expect(info?.description).toBe('Test rule');
      expect(info?.meta).toEqual({ version: '1.0.0' });
    });

    it('should get constraint info', () => {
      const constraint = defineConstraint({
        id: 'test.constraint',
        description: 'Test constraint',
        impl: () => true,
        meta: { severity: 'error' },
      });

      const registry = new PraxisRegistry<{ value: number }>();
      registry.registerConstraint(constraint);

      const introspector = new RegistryIntrospector(registry);
      const info = introspector.getConstraintInfo('test.constraint');

      expect(info).toBeDefined();
      expect(info?.id).toBe('test.constraint');
      expect(info?.description).toBe('Test constraint');
      expect(info?.meta).toEqual({ severity: 'error' });
    });

    it('should search rules by query', () => {
      const registry = new PraxisRegistry<{ value: number }>();

      registry.registerRule(
        defineRule({ id: 'auth.login', description: 'Login rule', impl: () => [] })
      );
      registry.registerRule(
        defineRule({ id: 'auth.logout', description: 'Logout rule', impl: () => [] })
      );
      registry.registerRule(
        defineRule({ id: 'cart.add', description: 'Add to cart', impl: () => [] })
      );

      const introspector = new RegistryIntrospector(registry);

      const authRules = introspector.searchRules('auth');
      expect(authRules).toHaveLength(2);

      const loginRules = introspector.searchRules('login');
      expect(loginRules).toHaveLength(1);
      expect(loginRules[0]?.id).toBe('auth.login');

      const cartRules = introspector.searchRules('cart');
      expect(cartRules).toHaveLength(1);
    });

    it('should search constraints by query', () => {
      const registry = new PraxisRegistry<{ value: number }>();

      registry.registerConstraint(
        defineConstraint({ id: 'auth.maxSessions', description: 'Max sessions', impl: () => true })
      );
      registry.registerConstraint(
        defineConstraint({
          id: 'cart.maxItems',
          description: 'Max items in cart',
          impl: () => true,
        })
      );

      const introspector = new RegistryIntrospector(registry);

      const authConstraints = introspector.searchConstraints('auth');
      expect(authConstraints).toHaveLength(1);
      expect(authConstraints[0]?.id).toBe('auth.maxSessions');

      const maxConstraints = introspector.searchConstraints('max');
      expect(maxConstraints).toHaveLength(2);
    });

    it('should work with empty registry', () => {
      const registry = new PraxisRegistry<{ value: number }>();
      const introspector = new RegistryIntrospector(registry);

      const stats = introspector.getStats();
      expect(stats.ruleCount).toBe(0);
      expect(stats.constraintCount).toBe(0);

      const graph = introspector.generateGraph();
      expect(graph.nodes).toHaveLength(0);
      expect(graph.edges).toHaveLength(0);

      const schema = introspector.generateSchema('1.0.0');
      expect(schema.rules).toHaveLength(0);
      expect(schema.constraints).toHaveLength(0);
    });

    it('should work with modules', () => {
      const module = defineModule({
        rules: [
          defineRule({ id: 'm1.rule1', description: 'Module rule 1', impl: () => [] }),
          defineRule({ id: 'm1.rule2', description: 'Module rule 2', impl: () => [] }),
        ],
        constraints: [
          defineConstraint({ id: 'm1.c1', description: 'Module constraint 1', impl: () => true }),
        ],
        meta: { moduleName: 'Module 1' },
      });

      const registry = new PraxisRegistry<{ value: number }>();
      registry.registerModule(module);

      const introspector = new RegistryIntrospector(registry);
      const stats = introspector.getStats();

      expect(stats.ruleCount).toBe(2);
      expect(stats.constraintCount).toBe(1);
    });
  });

  describe('createIntrospector', () => {
    it('should create introspector from registry', () => {
      const registry = new PraxisRegistry<{ value: number }>();
      const introspector = createIntrospector(registry);

      expect(introspector).toBeInstanceOf(RegistryIntrospector);
    });
  });
});
