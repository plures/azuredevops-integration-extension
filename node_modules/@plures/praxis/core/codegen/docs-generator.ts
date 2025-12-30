/**
 * Documentation Generator
 *
 * Generates Markdown documentation from PSF schemas.
 * Produces API docs, architecture diagrams, and user guides.
 */

import type {
  PSFSchema,
  PSFFact,
  PSFEvent,
  PSFRule,
  PSFConstraint,
  PSFModel,
  PSFComponent,
  PSFFlow,
  PSFFieldType,
} from '../schema-engine/psf.js';

/**
 * Documentation generator options
 */
export interface DocsGeneratorOptions {
  /** Output directory */
  outputDir?: string;
  /** Include Mermaid diagrams */
  includeDiagrams?: boolean;
  /** Include code examples */
  includeExamples?: boolean;
  /** Include API reference */
  includeApiReference?: boolean;
  /** Include table of contents */
  includeToc?: boolean;
  /** Document format */
  format?: 'markdown' | 'html';
}

/**
 * Generated documentation file
 */
export interface GeneratedDoc {
  /** File path */
  path: string;
  /** File content */
  content: string;
  /** Document type */
  type: 'overview' | 'api' | 'model' | 'component' | 'flow' | 'diagram' | 'index';
}

/**
 * Documentation generation result
 */
export interface DocsGenerationResult {
  success: boolean;
  files: GeneratedDoc[];
  errors: string[];
}

/**
 * Documentation Generator class
 */
export class DocsGenerator {
  private options: Required<DocsGeneratorOptions>;

  constructor(options: DocsGeneratorOptions = {}) {
    this.options = {
      outputDir: options.outputDir || './docs',
      includeDiagrams: options.includeDiagrams ?? true,
      includeExamples: options.includeExamples ?? true,
      includeApiReference: options.includeApiReference ?? true,
      includeToc: options.includeToc ?? true,
      format: options.format || 'markdown',
    };
  }

  /**
   * Generate all documentation from schema
   */
  generate(schema: PSFSchema): DocsGenerationResult {
    const files: GeneratedDoc[] = [];
    const errors: string[] = [];

    try {
      // Generate overview
      files.push(this.generateOverview(schema));

      // Generate API reference
      if (this.options.includeApiReference) {
        files.push(this.generateApiReference(schema));
      }

      // Generate model docs
      if (schema.models.length > 0) {
        files.push(this.generateModelsDoc(schema.models));
      }

      // Generate component docs
      if (schema.components.length > 0) {
        files.push(this.generateComponentsDoc(schema.components));
      }

      // Generate flow docs
      if (schema.flows.length > 0) {
        files.push(this.generateFlowsDoc(schema.flows));
      }

      // Generate diagrams
      if (this.options.includeDiagrams) {
        files.push(this.generateDiagrams(schema));
      }

      // Generate index
      files.push(this.generateIndex(schema, files));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return {
      success: errors.length === 0,
      files,
      errors,
    };
  }

  /**
   * Generate overview document
   */
  private generateOverview(schema: PSFSchema): GeneratedDoc {
    const lines: string[] = [];

    lines.push(`# ${schema.name}`);
    lines.push('');

    if (schema.description) {
      lines.push(schema.description);
      lines.push('');
    }

    // Schema info
    lines.push('## Schema Information');
    lines.push('');
    lines.push(`- **Version**: ${schema.$version}`);
    lines.push(`- **ID**: ${schema.id}`);
    if (schema.createdAt) {
      lines.push(`- **Created**: ${new Date(schema.createdAt).toLocaleString()}`);
    }
    if (schema.modifiedAt) {
      lines.push(`- **Last Modified**: ${new Date(schema.modifiedAt).toLocaleString()}`);
    }
    lines.push('');

    // Quick stats
    lines.push('## Overview');
    lines.push('');
    lines.push(`| Type | Count |`);
    lines.push(`| ---- | ----- |`);
    lines.push(`| Facts | ${schema.facts.length} |`);
    lines.push(`| Events | ${schema.events.length} |`);
    lines.push(`| Rules | ${schema.rules.length} |`);
    lines.push(`| Constraints | ${schema.constraints.length} |`);
    lines.push(`| Models | ${schema.models.length} |`);
    lines.push(`| Components | ${schema.components.length} |`);
    lines.push(`| Flows | ${schema.flows.length} |`);
    lines.push('');

    // Schema documentation if available
    if (schema.docs) {
      if (schema.docs.overview) {
        lines.push('## About');
        lines.push('');
        lines.push(schema.docs.overview);
        lines.push('');
      }

      if (schema.docs.gettingStarted) {
        lines.push('## Getting Started');
        lines.push('');
        lines.push(schema.docs.gettingStarted);
        lines.push('');
      }
    }

    return {
      path: `${this.options.outputDir}/overview.md`,
      content: lines.join('\n'),
      type: 'overview',
    };
  }

  /**
   * Generate API reference
   */
  private generateApiReference(schema: PSFSchema): GeneratedDoc {
    const lines: string[] = [];

    lines.push('# API Reference');
    lines.push('');

    if (this.options.includeToc) {
      lines.push('## Table of Contents');
      lines.push('');
      lines.push('- [Facts](#facts)');
      lines.push('- [Events](#events)');
      lines.push('- [Rules](#rules)');
      lines.push('- [Constraints](#constraints)');
      lines.push('');
    }

    // Facts
    lines.push('## Facts');
    lines.push('');
    if (schema.facts.length === 0) {
      lines.push('No facts defined.');
    } else {
      for (const fact of schema.facts) {
        lines.push(this.generateFactDoc(fact));
      }
    }
    lines.push('');

    // Events
    lines.push('## Events');
    lines.push('');
    if (schema.events.length === 0) {
      lines.push('No events defined.');
    } else {
      for (const event of schema.events) {
        lines.push(this.generateEventDoc(event));
      }
    }
    lines.push('');

    // Rules
    lines.push('## Rules');
    lines.push('');
    if (schema.rules.length === 0) {
      lines.push('No rules defined.');
    } else {
      for (const rule of schema.rules) {
        lines.push(this.generateRuleDoc(rule));
      }
    }
    lines.push('');

    // Constraints
    lines.push('## Constraints');
    lines.push('');
    if (schema.constraints.length === 0) {
      lines.push('No constraints defined.');
    } else {
      for (const constraint of schema.constraints) {
        lines.push(this.generateConstraintDoc(constraint));
      }
    }

    return {
      path: `${this.options.outputDir}/api.md`,
      content: lines.join('\n'),
      type: 'api',
    };
  }

  /**
   * Generate fact documentation
   */
  private generateFactDoc(fact: PSFFact): string {
    const lines: string[] = [];

    lines.push(`### ${fact.tag}`);
    lines.push('');

    if (fact.description) {
      lines.push(fact.description);
      lines.push('');
    }

    if (fact.docs?.summary) {
      lines.push(`> ${fact.docs.summary}`);
      lines.push('');
    }

    // Payload schema
    if (fact.payload && Object.keys(fact.payload.properties).length > 0) {
      lines.push('**Payload**');
      lines.push('');
      lines.push('| Property | Type | Description |');
      lines.push('| -------- | ---- | ----------- |');
      for (const [name, prop] of Object.entries(fact.payload.properties)) {
        const type = this.formatFieldType(prop.type);
        const desc = prop.description || '-';
        lines.push(`| \`${name}\` | \`${type}\` | ${desc} |`);
      }
      lines.push('');
    }

    if (this.options.includeExamples) {
      lines.push('**Example**');
      lines.push('');
      lines.push('```typescript');
      lines.push(`const fact = ${fact.tag}.create({`);
      for (const [name, prop] of Object.entries(fact.payload.properties)) {
        const example = this.getExampleValue(prop.type);
        lines.push(`  ${name}: ${example},`);
      }
      lines.push('});');
      lines.push('```');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate event documentation
   */
  private generateEventDoc(event: PSFEvent): string {
    const lines: string[] = [];

    lines.push(`### ${event.tag}`);
    lines.push('');

    if (event.description) {
      lines.push(event.description);
      lines.push('');
    }

    if (event.docs?.summary) {
      lines.push(`> ${event.docs.summary}`);
      lines.push('');
    }

    // Payload schema
    if (event.payload && Object.keys(event.payload.properties).length > 0) {
      lines.push('**Payload**');
      lines.push('');
      lines.push('| Property | Type | Description |');
      lines.push('| -------- | ---- | ----------- |');
      for (const [name, prop] of Object.entries(event.payload.properties)) {
        const type = this.formatFieldType(prop.type);
        const desc = prop.description || '-';
        lines.push(`| \`${name}\` | \`${type}\` | ${desc} |`);
      }
      lines.push('');
    }

    if (this.options.includeExamples) {
      lines.push('**Example**');
      lines.push('');
      lines.push('```typescript');
      lines.push(`const event = ${event.tag}.create({`);
      for (const [name, prop] of Object.entries(event.payload.properties)) {
        const example = this.getExampleValue(prop.type);
        lines.push(`  ${name}: ${example},`);
      }
      lines.push('});');
      lines.push('```');
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate rule documentation
   */
  private generateRuleDoc(rule: PSFRule): string {
    const lines: string[] = [];

    lines.push(`### ${rule.name || rule.id}`);
    lines.push('');
    lines.push(`**ID**: \`${rule.id}\``);
    lines.push('');

    if (rule.description) {
      lines.push(rule.description);
      lines.push('');
    }

    if (rule.triggers && rule.triggers.length > 0) {
      lines.push(`**Triggers**: ${rule.triggers.map((t) => `\`${t}\``).join(', ')}`);
      lines.push('');
    }

    if (rule.priority !== undefined) {
      lines.push(`**Priority**: ${rule.priority}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate constraint documentation
   */
  private generateConstraintDoc(constraint: PSFConstraint): string {
    const lines: string[] = [];

    lines.push(`### ${constraint.name || constraint.id}`);
    lines.push('');
    lines.push(`**ID**: \`${constraint.id}\``);
    lines.push('');

    if (constraint.description) {
      lines.push(constraint.description);
      lines.push('');
    }

    if (constraint.severity) {
      lines.push(`**Severity**: ${constraint.severity}`);
      lines.push('');
    }

    if (constraint.errorMessage) {
      lines.push(`**Error Message**: "${constraint.errorMessage}"`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate models documentation
   */
  private generateModelsDoc(models: PSFModel[]): GeneratedDoc {
    const lines: string[] = [];

    lines.push('# Data Models');
    lines.push('');

    for (const model of models) {
      lines.push(`## ${model.name}`);
      lines.push('');

      if (model.description) {
        lines.push(model.description);
        lines.push('');
      }

      // Fields table
      lines.push('### Fields');
      lines.push('');
      lines.push('| Field | Type | Optional | Description |');
      lines.push('| ----- | ---- | -------- | ----------- |');
      for (const field of model.fields) {
        const type = this.formatFieldType(field.type);
        const optional = field.optional ? 'Yes' : 'No';
        const desc = field.description || '-';
        lines.push(`| \`${field.name}\` | \`${type}\` | ${optional} | ${desc} |`);
      }
      lines.push('');

      // Relationships
      if (model.relationships && model.relationships.length > 0) {
        lines.push('### Relationships');
        lines.push('');
        for (const rel of model.relationships) {
          lines.push(`- **${rel.name}** → \`${rel.target}\` (${rel.type})`);
        }
        lines.push('');
      }

      // Indexes
      if (model.indexes && model.indexes.length > 0) {
        lines.push('### Indexes');
        lines.push('');
        for (const idx of model.indexes) {
          const unique = idx.unique ? ' (unique)' : '';
          lines.push(`- **${idx.name}**: ${idx.fields.join(', ')}${unique}`);
        }
        lines.push('');
      }
    }

    return {
      path: `${this.options.outputDir}/models.md`,
      content: lines.join('\n'),
      type: 'model',
    };
  }

  /**
   * Generate components documentation
   */
  private generateComponentsDoc(components: PSFComponent[]): GeneratedDoc {
    const lines: string[] = [];

    lines.push('# UI Components');
    lines.push('');

    for (const comp of components) {
      lines.push(`## ${comp.name}`);
      lines.push('');
      lines.push(`**Type**: ${comp.type}`);
      lines.push('');

      if (comp.description) {
        lines.push(comp.description);
        lines.push('');
      }

      if (comp.model) {
        lines.push(`**Bound Model**: \`${comp.model}\``);
        lines.push('');
      }

      // Props
      if (comp.props.length > 0) {
        lines.push('### Props');
        lines.push('');
        lines.push('| Prop | Type | Required | Description |');
        lines.push('| ---- | ---- | -------- | ----------- |');
        for (const prop of comp.props) {
          const required = prop.required ? 'Yes' : 'No';
          const desc = prop.description || '-';
          lines.push(`| \`${prop.name}\` | \`${prop.type}\` | ${required} | ${desc} |`);
        }
        lines.push('');
      }

      // Events
      if (comp.events.length > 0) {
        lines.push('### Events');
        lines.push('');
        for (const event of comp.events) {
          lines.push(`- **${event.name}**${event.payload ? `: ${event.payload}` : ''}`);
          if (event.description) {
            lines.push(`  - ${event.description}`);
          }
        }
        lines.push('');
      }
    }

    return {
      path: `${this.options.outputDir}/components.md`,
      content: lines.join('\n'),
      type: 'component',
    };
  }

  /**
   * Generate flows documentation
   */
  private generateFlowsDoc(flows: PSFFlow[]): GeneratedDoc {
    const lines: string[] = [];

    lines.push('# Flows & Orchestration');
    lines.push('');

    for (const flow of flows) {
      lines.push(`## ${flow.name}`);
      lines.push('');
      lines.push(`**Type**: ${flow.type}`);
      lines.push('');

      if (flow.description) {
        lines.push(flow.description);
        lines.push('');
      }

      if (flow.initial) {
        lines.push(`**Initial Step**: \`${flow.initial}\``);
        lines.push('');
      }

      // Steps
      if (flow.steps.length > 0) {
        lines.push('### Steps');
        lines.push('');
        for (const step of flow.steps) {
          lines.push(`#### ${step.name || step.id}`);
          lines.push('');
          lines.push(`- **ID**: \`${step.id}\``);
          lines.push(`- **Type**: ${step.type}`);

          if (step.next) {
            if (typeof step.next === 'string') {
              lines.push(`- **Next**: \`${step.next}\``);
            } else {
              lines.push('- **Next**:');
              for (const [condition, target] of Object.entries(step.next)) {
                lines.push(`  - \`${condition}\` → \`${target}\``);
              }
            }
          }
          lines.push('');
        }
      }
    }

    return {
      path: `${this.options.outputDir}/flows.md`,
      content: lines.join('\n'),
      type: 'flow',
    };
  }

  /**
   * Generate Mermaid diagrams
   */
  private generateDiagrams(schema: PSFSchema): GeneratedDoc {
    const lines: string[] = [];

    lines.push('# Architecture Diagrams');
    lines.push('');

    // Entity Relationship Diagram
    lines.push('## Data Model Diagram');
    lines.push('');
    lines.push('```mermaid');
    lines.push('erDiagram');
    for (const model of schema.models) {
      for (const rel of model.relationships || []) {
        const cardinalityMap: Record<string, string> = {
          'one-to-one': '||--||',
          'one-to-many': '||--o{',
          'many-to-many': '}o--o{',
        };
        const cardinality = cardinalityMap[rel.type] || '||--||';
        lines.push(`    ${model.name} ${cardinality} ${rel.target} : "${rel.name}"`);
      }
    }
    for (const model of schema.models) {
      lines.push(`    ${model.name} {`);
      for (const field of model.fields) {
        const type = this.formatFieldTypeSimple(field.type);
        lines.push(`        ${type} ${field.name}`);
      }
      lines.push('    }');
    }
    lines.push('```');
    lines.push('');

    // Event Flow Diagram
    if (schema.rules.length > 0) {
      lines.push('## Event Flow Diagram');
      lines.push('');
      lines.push('```mermaid');
      lines.push('flowchart LR');

      for (const rule of schema.rules) {
        const ruleNode = `rule_${this.sanitizeId(rule.id)}`;
        lines.push(`    ${ruleNode}["${rule.name || rule.id}"]`);

        if (rule.triggers) {
          for (const trigger of rule.triggers) {
            lines.push(`    event_${trigger}((${trigger})) --> ${ruleNode}`);
          }
        }
      }

      lines.push('```');
      lines.push('');
    }

    // Component Diagram
    if (schema.components.length > 0) {
      lines.push('## Component Diagram');
      lines.push('');
      lines.push('```mermaid');
      lines.push('flowchart TB');
      lines.push('    subgraph UI[UI Layer]');
      for (const comp of schema.components) {
        lines.push(`        ${comp.name}[${comp.name}]`);
      }
      lines.push('    end');
      lines.push('    subgraph Data[Data Layer]');
      for (const model of schema.models) {
        lines.push(`        ${model.name}[(${model.name})]`);
      }
      lines.push('    end');

      // Bindings
      for (const comp of schema.components) {
        if (comp.model) {
          lines.push(`    ${comp.name} --> ${comp.model}`);
        }
      }

      lines.push('```');
      lines.push('');
    }

    return {
      path: `${this.options.outputDir}/diagrams.md`,
      content: lines.join('\n'),
      type: 'diagram',
    };
  }

  /**
   * Generate index document
   */
  private generateIndex(schema: PSFSchema, files: GeneratedDoc[]): GeneratedDoc {
    const lines: string[] = [];

    lines.push(`# ${schema.name} Documentation`);
    lines.push('');

    if (schema.description) {
      lines.push(schema.description);
      lines.push('');
    }

    lines.push('## Documentation');
    lines.push('');

    const docLinks: Record<string, { title: string; desc: string }> = {
      overview: { title: 'Overview', desc: 'Project overview and introduction' },
      api: { title: 'API Reference', desc: 'Facts, events, rules, and constraints' },
      model: { title: 'Data Models', desc: 'Entity definitions and relationships' },
      component: { title: 'UI Components', desc: 'Component documentation' },
      flow: { title: 'Flows', desc: 'Orchestration and workflows' },
      diagram: { title: 'Diagrams', desc: 'Architecture and flow diagrams' },
    };

    for (const file of files) {
      if (file.type === 'index') continue;
      const link = docLinks[file.type];
      if (link) {
        const relativePath = file.path.replace(`${this.options.outputDir}/`, '');
        lines.push(`- [${link.title}](${relativePath}) - ${link.desc}`);
      }
    }

    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`Generated from PSF Schema v${schema.$version}`);

    return {
      path: `${this.options.outputDir}/README.md`,
      content: lines.join('\n'),
      type: 'index',
    };
  }

  /**
   * Format field type for display
   */
  private formatFieldType(type: PSFFieldType | string): string {
    if (typeof type === 'string') return type;
    if ('array' in type) return `${this.formatFieldType(type.array)}[]`;
    if ('reference' in type) return type.reference;
    if ('enum' in type) return type.enum.join(' | ');
    if ('union' in type) return type.union.map((t) => this.formatFieldType(t)).join(' | ');
    return 'object';
  }

  /**
   * Format field type simple (for Mermaid)
   */
  private formatFieldTypeSimple(type: PSFFieldType): string {
    if (typeof type === 'string') return type;
    if ('array' in type) return 'array';
    if ('reference' in type) return 'ref';
    if ('enum' in type) return 'enum';
    return 'object';
  }

  /**
   * Get example value for type
   */
  private getExampleValue(type: PSFFieldType | string): string {
    if (typeof type === 'string') {
      switch (type) {
        case 'string':
          return '"example"';
        case 'number':
          return '42';
        case 'boolean':
          return 'true';
        case 'date':
        case 'datetime':
          return 'new Date()';
        case 'uuid':
          return '"550e8400-e29b-41d4-a716-446655440000"';
        default:
          return 'null';
      }
    }
    if ('array' in type) return '[]';
    if ('enum' in type && type.enum.length > 0) return `"${type.enum[0]}"`;
    return '{}';
  }

  /**
   * Sanitize ID for Mermaid
   */
  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_]/g, '_');
  }
}

/**
 * Create a docs generator
 */
export function createDocsGenerator(options?: DocsGeneratorOptions): DocsGenerator {
  return new DocsGenerator(options);
}

/**
 * Generate documentation from PSF schema (convenience function)
 */
export function generateDocs(
  schema: PSFSchema,
  options?: DocsGeneratorOptions
): DocsGenerationResult {
  const generator = new DocsGenerator(options);
  return generator.generate(schema);
}
