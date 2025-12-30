/**
 * State-Docs Integration
 *
 * Integration with plures/state-docs - FSM documentation generator for XState projects.
 * Generates Markdown and Mermaid documentation from Praxis state machines and logic.
 *
 * Features:
 * - Auto-generate documentation from Praxis schemas
 * - Markdown output with Mermaid diagrams
 * - State machine visualization
 * - Transition documentation
 * - Integration with Praxis logic engine
 *
 * @see https://github.com/plures/state-docs
 */

import type { PraxisSchema, LogicDefinition } from '../core/schema/types.js';
import type { RuleDescriptor, ConstraintDescriptor, PraxisModule } from '../core/rules.js';

/**
 * State-Docs configuration
 */
export interface StateDocsConfig {
  /** Project title */
  projectTitle: string;
  /** Source directory containing schemas */
  source?: string;
  /** Target directory for generated docs */
  target?: string;
  /** File patterns to include */
  globs?: string[];
  /** Visualization settings */
  visualization?: {
    /** Output format */
    format?: 'mermaid' | 'dot';
    /** Export as PNG */
    exportPng?: boolean;
    /** Diagram theme */
    theme?: 'default' | 'dark' | 'forest' | 'neutral';
  };
  /** Template settings */
  template?: {
    /** Include table of contents */
    toc?: boolean;
    /** Include timestamp */
    timestamp?: boolean;
    /** Custom header content */
    header?: string;
    /** Custom footer content */
    footer?: string;
  };
}

/**
 * Generated documentation file
 */
export interface GeneratedDoc {
  /** File path */
  path: string;
  /** File content */
  content: string;
  /** File type */
  type: 'markdown' | 'mermaid' | 'dot' | 'json';
}

/**
 * State machine representation for documentation
 */
export interface StateMachineDoc {
  /** Machine identifier */
  id: string;
  /** Machine name */
  name: string;
  /** Machine description */
  description?: string;
  /** Initial state */
  initial?: string;
  /** All states */
  states: StateDoc[];
  /** All transitions */
  transitions: TransitionDoc[];
  /** Context type description */
  context?: string;
  /** Events that this machine handles */
  events?: string[];
}

/**
 * State documentation
 */
export interface StateDoc {
  /** State identifier */
  id: string;
  /** State name */
  name: string;
  /** State description */
  description?: string;
  /** Is this an initial state */
  initial?: boolean;
  /** Is this a final state */
  final?: boolean;
  /** Entry actions */
  onEntry?: string[];
  /** Exit actions */
  onExit?: string[];
  /** State tags */
  tags?: string[];
}

/**
 * Transition documentation
 */
export interface TransitionDoc {
  /** Source state */
  from: string;
  /** Target state */
  to: string;
  /** Event that triggers the transition */
  event: string;
  /** Transition guard condition */
  guard?: string;
  /** Actions executed during transition */
  actions?: string[];
  /** Transition description */
  description?: string;
}

/**
 * Documentation generator for Praxis schemas
 */
export class StateDocsGenerator {
  private config: StateDocsConfig;

  constructor(config: StateDocsConfig) {
    this.config = {
      target: './docs',
      globs: ['**/*.ts', '**/*.js'],
      visualization: {
        format: 'mermaid',
        exportPng: false,
        theme: 'default',
      },
      template: {
        toc: true,
        timestamp: true,
      },
      ...config,
    };
  }

  /**
   * Generate documentation from a Praxis schema
   */
  generateFromSchema(schema: PraxisSchema): GeneratedDoc[] {
    const docs: GeneratedDoc[] = [];

    // Generate main README
    docs.push(this.generateSchemaReadme(schema));

    // Generate model documentation
    if (schema.models && schema.models.length > 0) {
      docs.push(this.generateModelsDoc(schema));
    }

    // Generate component documentation
    if (schema.components && schema.components.length > 0) {
      docs.push(this.generateComponentsDoc(schema));
    }

    // Generate logic documentation with state diagrams
    if (schema.logic && schema.logic.length > 0) {
      for (const logic of schema.logic) {
        docs.push(this.generateLogicDoc(logic));
        docs.push(this.generateLogicDiagram(logic));
      }
    }

    return docs;
  }

  /**
   * Generate documentation from a Praxis registry
   */
  generateFromModule<TContext>(module: PraxisModule<TContext>): GeneratedDoc[] {
    const docs: GeneratedDoc[] = [];

    // Get all rules and constraints
    const rules = module.rules;
    const constraints = module.constraints;

    // Generate rules documentation
    docs.push(this.generateRulesDoc(rules));

    // Generate constraints documentation
    docs.push(this.generateConstraintsDoc(constraints));

    // Generate state diagram
    docs.push(this.generateRegistryDiagram(rules, constraints));

    return docs;
  }

  /**
   * Generate the main schema README
   */
  private generateSchemaReadme(schema: PraxisSchema): GeneratedDoc {
    const lines: string[] = [];

    // Header
    if (this.config.template?.header) {
      lines.push(this.config.template.header);
      lines.push('');
    }

    lines.push(`# ${schema.name || this.config.projectTitle}`);
    lines.push('');

    if (schema.description) {
      lines.push(schema.description);
      lines.push('');
    }

    // Table of contents
    if (this.config.template?.toc) {
      lines.push('## Table of Contents');
      lines.push('');
      lines.push('- [Overview](#overview)');
      if (schema.models && schema.models.length > 0) {
        lines.push('- [Models](#models)');
      }
      if (schema.components && schema.components.length > 0) {
        lines.push('- [Components](#components)');
      }
      if (schema.logic && schema.logic.length > 0) {
        lines.push('- [Logic](#logic)');
      }
      lines.push('');
    }

    // Overview
    lines.push('## Overview');
    lines.push('');
    lines.push(`**Version:** ${schema.version}`);
    lines.push('');

    // Summary statistics
    lines.push('### Statistics');
    lines.push('');
    lines.push('| Category | Count |');
    lines.push('|----------|-------|');
    lines.push(`| Models | ${schema.models?.length || 0} |`);
    lines.push(`| Components | ${schema.components?.length || 0} |`);
    lines.push(`| Logic Modules | ${schema.logic?.length || 0} |`);
    lines.push('');

    // Models summary
    if (schema.models && schema.models.length > 0) {
      lines.push('## Models');
      lines.push('');
      for (const model of schema.models) {
        lines.push(`### ${model.name}`);
        lines.push('');
        if (model.description) {
          lines.push(model.description);
          lines.push('');
        }
        lines.push('**Fields:**');
        lines.push('');
        lines.push('| Name | Type | Required |');
        lines.push('|------|------|----------|');
        for (const field of model.fields) {
          const required = field.optional ? 'No' : 'Yes';
          lines.push(`| ${field.name} | ${field.type} | ${required} |`);
        }
        lines.push('');
      }
    }

    // Components summary
    if (schema.components && schema.components.length > 0) {
      lines.push('## Components');
      lines.push('');
      for (const component of schema.components) {
        lines.push(`### ${component.name}`);
        lines.push('');
        lines.push(`**Type:** ${component.type}`);
        lines.push('');
        if (component.description) {
          lines.push(component.description);
          lines.push('');
        }
        if (component.model) {
          lines.push(`**Model:** ${component.model}`);
          lines.push('');
        }
      }
    }

    // Logic summary
    if (schema.logic && schema.logic.length > 0) {
      lines.push('## Logic');
      lines.push('');
      for (const logic of schema.logic) {
        lines.push(`### ${logic.id}`);
        lines.push('');
        if (logic.description) {
          lines.push(logic.description);
          lines.push('');
        }

        // Events
        if (logic.events && logic.events.length > 0) {
          lines.push('**Events:**');
          lines.push('');
          for (const event of logic.events) {
            lines.push(`- \`${event.tag}\`: ${event.description || ''}`);
          }
          lines.push('');
        }

        // Facts
        if (logic.facts && logic.facts.length > 0) {
          lines.push('**Facts:**');
          lines.push('');
          for (const fact of logic.facts) {
            lines.push(`- \`${fact.tag}\`: ${fact.description || ''}`);
          }
          lines.push('');
        }

        // Rules
        if (logic.rules && logic.rules.length > 0) {
          lines.push('**Rules:**');
          lines.push('');
          for (const rule of logic.rules) {
            lines.push(`- \`${rule.id}\`: ${rule.description || ''}`);
          }
          lines.push('');
        }
      }
    }

    // Timestamp
    if (this.config.template?.timestamp) {
      lines.push('---');
      lines.push('');
      lines.push(`*Generated on ${new Date().toISOString()} by State-Docs*`);
    }

    // Footer
    if (this.config.template?.footer) {
      lines.push('');
      lines.push(this.config.template.footer);
    }

    return {
      path: `${this.config.target}/README.md`,
      content: lines.join('\n'),
      type: 'markdown',
    };
  }

  /**
   * Generate models documentation
   */
  private generateModelsDoc(schema: PraxisSchema): GeneratedDoc {
    const lines: string[] = [
      '# Models',
      '',
      'This document describes all data models defined in the schema.',
      '',
    ];

    if (schema.models) {
      for (const model of schema.models) {
        lines.push(`## ${model.name}`);
        lines.push('');

        if (model.description) {
          lines.push(model.description);
          lines.push('');
        }

        lines.push('### Fields');
        lines.push('');
        lines.push('| Name | Type | Required | Description |');
        lines.push('|------|------|----------|-------------|');

        for (const field of model.fields) {
          const required = field.optional ? 'No' : 'Yes';
          const description = field.description || '-';
          lines.push(`| ${field.name} | \`${field.type}\` | ${required} | ${description} |`);
        }

        lines.push('');

        // Indexes
        if (model.indexes && model.indexes.length > 0) {
          lines.push('### Indexes');
          lines.push('');
          for (const index of model.indexes) {
            lines.push(`- **${index.name}**: \`${index.fields.join(', ')}\``);
          }
          lines.push('');
        }
      }
    }

    return {
      path: `${this.config.target}/models.md`,
      content: lines.join('\n'),
      type: 'markdown',
    };
  }

  /**
   * Generate components documentation
   */
  private generateComponentsDoc(schema: PraxisSchema): GeneratedDoc {
    const lines: string[] = [
      '# Components',
      '',
      'This document describes all UI components defined in the schema.',
      '',
    ];

    if (schema.components) {
      for (const component of schema.components) {
        lines.push(`## ${component.name}`);
        lines.push('');
        lines.push(`**Type:** ${component.type}`);
        lines.push('');

        if (component.description) {
          lines.push(component.description);
          lines.push('');
        }

        if (component.model) {
          lines.push(
            `**Associated Model:** [${component.model}](./models.md#${component.model.toLowerCase()})`
          );
          lines.push('');
        }
      }
    }

    return {
      path: `${this.config.target}/components.md`,
      content: lines.join('\n'),
      type: 'markdown',
    };
  }

  /**
   * Generate logic documentation
   */
  private generateLogicDoc(logic: LogicDefinition): GeneratedDoc {
    const lines: string[] = [`# ${logic.id}`, ''];

    if (logic.description) {
      lines.push(logic.description);
      lines.push('');
    }

    // Events
    if (logic.events && logic.events.length > 0) {
      lines.push('## Events');
      lines.push('');
      lines.push('| Event | Description | Payload |');
      lines.push('|-------|-------------|---------|');

      for (const event of logic.events) {
        const payload = event.payload
          ? Object.entries(event.payload)
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ')
          : '-';
        lines.push(`| \`${event.tag}\` | ${event.description || '-'} | ${payload} |`);
      }
      lines.push('');
    }

    // Facts
    if (logic.facts && logic.facts.length > 0) {
      lines.push('## Facts');
      lines.push('');
      lines.push('| Fact | Description | Payload |');
      lines.push('|------|-------------|---------|');

      for (const fact of logic.facts) {
        const payload = fact.payload
          ? Object.entries(fact.payload)
              .map(([k, v]) => `${k}: ${v}`)
              .join(', ')
          : '-';
        lines.push(`| \`${fact.tag}\` | ${fact.description || '-'} | ${payload} |`);
      }
      lines.push('');
    }

    // Rules
    if (logic.rules && logic.rules.length > 0) {
      lines.push('## Rules');
      lines.push('');

      for (const rule of logic.rules) {
        lines.push(`### ${rule.id}`);
        lines.push('');

        if (rule.description) {
          lines.push(rule.description);
          lines.push('');
        }

        if (rule.priority !== undefined) {
          lines.push(`**Priority:** ${rule.priority}`);
          lines.push('');
        }
      }
    }

    // Constraints
    if (logic.constraints && logic.constraints.length > 0) {
      lines.push('## Constraints');
      lines.push('');

      for (const constraint of logic.constraints) {
        lines.push(`### ${constraint.id}`);
        lines.push('');

        if (constraint.description) {
          lines.push(constraint.description);
          lines.push('');
        }

        if (constraint.message) {
          lines.push(`**Error Message:** ${constraint.message}`);
          lines.push('');
        }
      }
    }

    return {
      path: `${this.config.target}/logic/${logic.id}.md`,
      content: lines.join('\n'),
      type: 'markdown',
    };
  }

  /**
   * Generate Mermaid diagram for logic
   */
  private generateLogicDiagram(logic: LogicDefinition): GeneratedDoc {
    const lines: string[] = ['stateDiagram-v2'];

    // Add events as transitions
    if (logic.events && logic.facts) {
      lines.push('    [*] --> Processing');

      for (const event of logic.events) {
        lines.push(`    Processing --> ${event.tag.replace(/[^a-zA-Z0-9]/g, '')}: ${event.tag}`);
      }

      for (const fact of logic.facts) {
        lines.push(`    ${fact.tag.replace(/[^a-zA-Z0-9]/g, '')} --> [*]`);
      }
    }

    return {
      path: `${this.config.target}/logic/${logic.id}.mmd`,
      content: lines.join('\n'),
      type: 'mermaid',
    };
  }

  /**
   * Generate rules documentation
   */
  private generateRulesDoc<TContext>(rules: RuleDescriptor<TContext>[]): GeneratedDoc {
    const lines: string[] = [
      '# Rules',
      '',
      'This document describes all rules registered in the Praxis engine.',
      '',
    ];

    for (const rule of rules) {
      lines.push(`## ${rule.id}`);
      lines.push('');

      if (rule.description) {
        lines.push(rule.description);
        lines.push('');
      }

      if (rule.meta?.eventType) {
        lines.push(`**Triggers on:** \`${rule.meta.eventType}\``);
        lines.push('');
      }

      if (rule.meta?.priority !== undefined) {
        lines.push(`**Priority:** ${rule.meta.priority}`);
        lines.push('');
      }
    }

    return {
      path: `${this.config.target}/rules.md`,
      content: lines.join('\n'),
      type: 'markdown',
    };
  }

  /**
   * Generate constraints documentation
   */
  private generateConstraintsDoc<TContext>(
    constraints: ConstraintDescriptor<TContext>[]
  ): GeneratedDoc {
    const lines: string[] = [
      '# Constraints',
      '',
      'This document describes all constraints (invariants) registered in the Praxis engine.',
      '',
    ];

    for (const constraint of constraints) {
      lines.push(`## ${constraint.id}`);
      lines.push('');

      if (constraint.description) {
        lines.push(constraint.description);
        lines.push('');
      }

      if (constraint.meta?.errorMessage) {
        lines.push(`**Error Message:** ${constraint.meta.errorMessage}`);
        lines.push('');
      }
    }

    return {
      path: `${this.config.target}/constraints.md`,
      content: lines.join('\n'),
      type: 'markdown',
    };
  }

  /**
   * Generate state diagram from registry
   */
  private generateRegistryDiagram<TContext>(
    rules: RuleDescriptor<TContext>[],
    constraints: ConstraintDescriptor<TContext>[]
  ): GeneratedDoc {
    const lines: string[] = ['graph TD', '    subgraph Rules'];

    for (const rule of rules) {
      const id = rule.id.replace(/[^a-zA-Z0-9]/g, '_');
      lines.push(`        ${id}["${rule.id}"]`);
    }

    lines.push('    end');
    lines.push('    subgraph Constraints');

    for (const constraint of constraints) {
      const id = constraint.id.replace(/[^a-zA-Z0-9]/g, '_');
      lines.push(`        ${id}["${constraint.id}"]`);
    }

    lines.push('    end');

    return {
      path: `${this.config.target}/state-diagram.mmd`,
      content: lines.join('\n'),
      type: 'mermaid',
    };
  }
}

/**
 * Create a State-Docs generator instance
 *
 * @example
 * ```typescript
 * import { createStateDocsGenerator } from '@plures/praxis/integrations/state-docs';
 *
 * const generator = createStateDocsGenerator({
 *   projectTitle: 'My Project',
 *   target: './docs/api',
 * });
 *
 * const docs = generator.generateFromSchema(mySchema);
 * for (const doc of docs) {
 *   await writeFile(doc.path, doc.content);
 * }
 * ```
 */
export function createStateDocsGenerator(config: StateDocsConfig): StateDocsGenerator {
  return new StateDocsGenerator(config);
}

/**
 * Generate documentation from a schema (convenience function)
 */
export function generateDocs(schema: PraxisSchema, config: StateDocsConfig): GeneratedDoc[] {
  const generator = createStateDocsGenerator(config);
  return generator.generateFromSchema(schema);
}
