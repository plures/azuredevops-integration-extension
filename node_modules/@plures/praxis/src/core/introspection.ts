/**
 * Introspection and Visualization Utilities
 *
 * Provides APIs to introspect the registry, generate schemas,
 * and export graph representations for external tools.
 */

import type { PraxisRegistry, RuleDescriptor, ConstraintDescriptor } from './rules.js';

/**
 * Graph node representing a rule in the system
 */
export interface RuleNode {
  id: string;
  type: 'rule';
  description: string;
  meta?: Record<string, unknown>;
}

/**
 * Graph node representing a constraint in the system
 */
export interface ConstraintNode {
  id: string;
  type: 'constraint';
  description: string;
  meta?: Record<string, unknown>;
}

/**
 * Graph edge representing a dependency or relationship
 */
export interface GraphEdge {
  from: string;
  to: string;
  type: 'triggers' | 'constrains' | 'depends-on';
}

/**
 * Complete graph representation of the registry
 */
export interface RegistryGraph {
  nodes: (RuleNode | ConstraintNode)[];
  edges: GraphEdge[];
  meta: {
    nodeCount: number;
    ruleCount: number;
    constraintCount: number;
  };
}

/**
 * JSON Schema-like representation of a rule
 */
export interface RuleSchema {
  id: string;
  description: string;
  type: 'rule';
  meta?: Record<string, unknown>;
}

/**
 * JSON Schema-like representation of a constraint
 */
export interface ConstraintSchema {
  id: string;
  description: string;
  type: 'constraint';
  meta?: Record<string, unknown>;
}

/**
 * Complete registry schema
 */
export interface RegistrySchema {
  protocolVersion: string;
  rules: RuleSchema[];
  constraints: ConstraintSchema[];
  meta: {
    ruleCount: number;
    constraintCount: number;
  };
}

/**
 * Statistics about the registry
 */
export interface RegistryStats {
  ruleCount: number;
  constraintCount: number;
  moduleCount: number;
  rulesById: string[];
  constraintsById: string[];
}

/**
 * Introspection utilities for a Praxis registry
 */
export class RegistryIntrospector<TContext = unknown> {
  constructor(private registry: PraxisRegistry<TContext>) {}

  /**
   * Get basic statistics about the registry
   */
  getStats(): RegistryStats {
    return {
      ruleCount: this.registry.getRuleIds().length,
      constraintCount: this.registry.getConstraintIds().length,
      moduleCount: 0, // Modules are flattened in registry
      rulesById: this.registry.getRuleIds(),
      constraintsById: this.registry.getConstraintIds(),
    };
  }

  /**
   * Generate a JSON schema representation of the registry
   */
  generateSchema(protocolVersion: string): RegistrySchema {
    const rules: RuleSchema[] = this.registry.getAllRules().map((rule) => ({
      id: rule.id,
      description: rule.description,
      type: 'rule' as const,
      meta: rule.meta,
    }));

    const constraints: ConstraintSchema[] = this.registry.getAllConstraints().map((constraint) => ({
      id: constraint.id,
      description: constraint.description,
      type: 'constraint' as const,
      meta: constraint.meta,
    }));

    return {
      protocolVersion,
      rules,
      constraints,
      meta: {
        ruleCount: rules.length,
        constraintCount: constraints.length,
      },
    };
  }

  /**
   * Generate a graph representation of the registry
   *
   * This creates nodes for rules and constraints.
   * Edges can be inferred from metadata if rules/constraints
   * document their dependencies.
   */
  generateGraph(): RegistryGraph {
    const nodes: (RuleNode | ConstraintNode)[] = [];
    const edges: GraphEdge[] = [];

    // Add rule nodes
    for (const rule of this.registry.getAllRules()) {
      nodes.push({
        id: rule.id,
        type: 'rule',
        description: rule.description,
        meta: rule.meta,
      });

      // Check for dependency metadata
      if (rule.meta?.dependsOn) {
        const deps = Array.isArray(rule.meta.dependsOn)
          ? rule.meta.dependsOn
          : [rule.meta.dependsOn];
        for (const dep of deps) {
          edges.push({
            from: String(dep),
            to: rule.id,
            type: 'depends-on',
          });
        }
      }
    }

    // Add constraint nodes
    for (const constraint of this.registry.getAllConstraints()) {
      nodes.push({
        id: constraint.id,
        type: 'constraint',
        description: constraint.description,
        meta: constraint.meta,
      });

      // Check for constraint targets
      if (constraint.meta?.constrains) {
        const targets = Array.isArray(constraint.meta.constrains)
          ? constraint.meta.constrains
          : [constraint.meta.constrains];
        for (const target of targets) {
          edges.push({
            from: constraint.id,
            to: String(target),
            type: 'constrains',
          });
        }
      }
    }

    return {
      nodes,
      edges,
      meta: {
        nodeCount: nodes.length,
        ruleCount: nodes.filter((n) => n.type === 'rule').length,
        constraintCount: nodes.filter((n) => n.type === 'constraint').length,
      },
    };
  }

  /**
   * Export graph in DOT format (Graphviz)
   *
   * This can be rendered with Graphviz tools or online services.
   */
  exportDOT(): string {
    const graph = this.generateGraph();
    const lines: string[] = [];

    lines.push('digraph PraxisRegistry {');
    lines.push('  rankdir=TB;');
    lines.push('  node [shape=box, style=rounded];');
    lines.push('');

    // Add nodes
    for (const node of graph.nodes) {
      const shape = node.type === 'rule' ? 'box' : 'diamond';
      const color = node.type === 'rule' ? 'lightblue' : 'lightcoral';
      const label = `${node.id}\\n${node.description}`;
      lines.push(
        `  "${node.id}" [label="${label}", shape=${shape}, style=filled, fillcolor=${color}];`
      );
    }

    lines.push('');

    // Add edges
    for (const edge of graph.edges) {
      const style = edge.type === 'constrains' ? 'dashed' : 'solid';
      lines.push(`  "${edge.from}" -> "${edge.to}" [label="${edge.type}", style=${style}];`);
    }

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Export graph in Mermaid format
   *
   * Mermaid is a markdown-friendly diagramming language.
   */
  exportMermaid(): string {
    const graph = this.generateGraph();
    const lines: string[] = [];

    lines.push('graph TB');

    // Add nodes
    for (const node of graph.nodes) {
      const shape = node.type === 'rule' ? '[' : '{';
      const endShape = node.type === 'rule' ? ']' : '}';
      const label = `${node.id}<br/>${node.description}`;
      lines.push(`  ${node.id}${shape}"${label}"${endShape}`);
    }

    lines.push('');

    // Add edges
    for (const edge of graph.edges) {
      const arrow = edge.type === 'constrains' ? '-.->|constrains|' : '-->|' + edge.type + '|';
      lines.push(`  ${edge.from} ${arrow} ${edge.to}`);
    }

    return lines.join('\n');
  }

  /**
   * Get detailed information about a specific rule
   */
  getRuleInfo(ruleId: string): RuleDescriptor<TContext> | undefined {
    return this.registry.getRule(ruleId);
  }

  /**
   * Get detailed information about a specific constraint
   */
  getConstraintInfo(constraintId: string): ConstraintDescriptor<TContext> | undefined {
    return this.registry.getConstraint(constraintId);
  }

  /**
   * Search for rules by description text
   */
  searchRules(query: string): RuleDescriptor<TContext>[] {
    const lowerQuery = query.toLowerCase();
    return this.registry
      .getAllRules()
      .filter(
        (rule) =>
          rule.id.toLowerCase().includes(lowerQuery) ||
          rule.description.toLowerCase().includes(lowerQuery)
      );
  }

  /**
   * Search for constraints by description text
   */
  searchConstraints(query: string): ConstraintDescriptor<TContext>[] {
    const lowerQuery = query.toLowerCase();
    return this.registry
      .getAllConstraints()
      .filter(
        (constraint) =>
          constraint.id.toLowerCase().includes(lowerQuery) ||
          constraint.description.toLowerCase().includes(lowerQuery)
      );
  }
}

/**
 * Create a registry introspector
 */
export function createIntrospector<TContext = unknown>(
  registry: PraxisRegistry<TContext>
): RegistryIntrospector<TContext> {
  return new RegistryIntrospector(registry);
}
