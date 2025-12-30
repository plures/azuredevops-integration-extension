/**
 * PSF Generator
 *
 * Generates TypeScript DSL code from PSF schema.
 * This enables schema → code synchronization.
 */

import type {
  PSFSchema,
  PSFFact,
  PSFEvent,
  PSFRule,
  PSFConstraint,
  PSFModel,
  PSFComponent,
  PSFFieldType,
  PSFExpression,
} from './psf.js';

/**
 * Generator options
 */
export interface GeneratorOptions {
  /** Output directory */
  outputDir?: string;
  /** Include TypeScript types */
  typescript?: boolean;
  /** Include documentation comments */
  includeDocs?: boolean;
  /** File naming convention */
  fileNaming?: 'camelCase' | 'kebab-case' | 'PascalCase';
  /** Module format */
  moduleFormat?: 'esm' | 'commonjs';
  /** Generate barrel file (index.ts) */
  generateIndex?: boolean;
}

/**
 * Generated file
 */
export interface GeneratedFile {
  /** File path */
  path: string;
  /** File content */
  content: string;
  /** File type */
  type: 'facts' | 'events' | 'rules' | 'constraints' | 'models' | 'components' | 'index' | 'types';
}

/**
 * Generation result
 */
export interface GenerationResult {
  success: boolean;
  files: GeneratedFile[];
  errors: string[];
}

/**
 * PSF Generator class
 */
export class PSFGenerator {
  private options: Required<GeneratorOptions>;

  constructor(options: GeneratorOptions = {}) {
    this.options = {
      outputDir: options.outputDir || './generated',
      typescript: options.typescript ?? true,
      includeDocs: options.includeDocs ?? true,
      fileNaming: options.fileNaming || 'camelCase',
      moduleFormat: options.moduleFormat || 'esm',
      generateIndex: options.generateIndex ?? true,
    };
  }

  /**
   * Generate code from PSF schema
   */
  generate(schema: PSFSchema): GenerationResult {
    const files: GeneratedFile[] = [];
    const errors: string[] = [];

    try {
      // Generate facts file
      if (schema.facts.length > 0) {
        files.push(this.generateFactsFile(schema.facts));
      }

      // Generate events file
      if (schema.events.length > 0) {
        files.push(this.generateEventsFile(schema.events));
      }

      // Generate rules file
      if (schema.rules.length > 0) {
        files.push(this.generateRulesFile(schema.rules));
      }

      // Generate constraints file
      if (schema.constraints.length > 0) {
        files.push(this.generateConstraintsFile(schema.constraints));
      }

      // Generate models file
      if (schema.models.length > 0) {
        files.push(this.generateModelsFile(schema.models));
      }

      // Generate components file
      if (schema.components.length > 0) {
        files.push(this.generateComponentsFile(schema.components));
      }

      // Generate types file
      files.push(this.generateTypesFile(schema));

      // Generate index file
      if (this.options.generateIndex) {
        files.push(this.generateIndexFile(schema));
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown generation error');
    }

    return {
      success: errors.length === 0,
      files,
      errors,
    };
  }

  /**
   * Generate facts file
   */
  private generateFactsFile(facts: PSFFact[]): GeneratedFile {
    const lines: string[] = [];
    const ext = this.options.typescript ? 'ts' : 'js';

    lines.push(`/**`);
    lines.push(` * Fact Definitions`);
    lines.push(` * Generated from PSF Schema`);
    lines.push(` */`);
    lines.push('');
    lines.push(`import { defineFact } from '@plures/praxis';`);
    lines.push('');

    for (const fact of facts) {
      if (this.options.includeDocs && fact.description) {
        lines.push(`/** ${fact.description} */`);
      }

      const payloadType = this.generatePayloadType(fact.payload);
      lines.push(
        `export const ${fact.tag} = defineFact<"${fact.tag}", ${payloadType}>("${fact.tag}");`
      );
      lines.push('');
    }

    return {
      path: `${this.options.outputDir}/facts.${ext}`,
      content: lines.join('\n'),
      type: 'facts',
    };
  }

  /**
   * Generate events file
   */
  private generateEventsFile(events: PSFEvent[]): GeneratedFile {
    const lines: string[] = [];
    const ext = this.options.typescript ? 'ts' : 'js';

    lines.push(`/**`);
    lines.push(` * Event Definitions`);
    lines.push(` * Generated from PSF Schema`);
    lines.push(` */`);
    lines.push('');
    lines.push(`import { defineEvent } from '@plures/praxis';`);
    lines.push('');

    for (const event of events) {
      if (this.options.includeDocs && event.description) {
        lines.push(`/** ${event.description} */`);
      }

      const payloadType = this.generatePayloadType(event.payload);
      lines.push(
        `export const ${event.tag} = defineEvent<"${event.tag}", ${payloadType}>("${event.tag}");`
      );
      lines.push('');
    }

    return {
      path: `${this.options.outputDir}/events.${ext}`,
      content: lines.join('\n'),
      type: 'events',
    };
  }

  /**
   * Generate rules file
   */
  private generateRulesFile(rules: PSFRule[]): GeneratedFile {
    const lines: string[] = [];
    const ext = this.options.typescript ? 'ts' : 'js';

    lines.push(`/**`);
    lines.push(` * Rule Definitions`);
    lines.push(` * Generated from PSF Schema`);
    lines.push(` */`);
    lines.push('');
    lines.push(`import { defineRule } from '@plures/praxis';`);
    lines.push(`import * as Facts from './facts.js';`);
    lines.push(`import * as Events from './events.js';`);
    lines.push('');

    for (const rule of rules) {
      if (this.options.includeDocs && rule.description) {
        lines.push(`/** ${rule.description} */`);
      }

      const ruleName = this.sanitizeIdentifier(rule.id);
      lines.push(`export const ${ruleName}Rule = defineRule({`);
      lines.push(`  id: '${rule.id}',`);
      lines.push(`  description: '${this.escapeString(rule.description)}',`);

      if (rule.priority !== undefined) {
        lines.push(`  priority: ${rule.priority},`);
      }

      lines.push(`  impl: (state, events) => {`);

      // Generate trigger filtering
      if (rule.triggers && rule.triggers.length > 0) {
        lines.push(`    // Filter for triggering events: ${rule.triggers.join(', ')}`);
        lines.push(`    const triggerTags = [${rule.triggers.map((t) => `'${t}'`).join(', ')}];`);
        lines.push(`    const triggeringEvents = events.filter(e => triggerTags.includes(e.tag));`);
        lines.push(`    if (triggeringEvents.length === 0) return [];`);
        lines.push('');
      }

      // Generate condition check
      if (rule.when) {
        const condition = this.expressionToCode(rule.when);
        lines.push(`    // Condition`);
        lines.push(`    if (!(${condition})) return [];`);
        lines.push('');
      }

      // Generate action
      const action = this.expressionToCode(rule.then);
      lines.push(`    // Action`);
      lines.push(`    ${action}`);

      lines.push(`  },`);
      lines.push(`});`);
      lines.push('');
    }

    // Export all rules array
    lines.push('/** All rules */');
    lines.push('export const rules = [');
    for (const rule of rules) {
      lines.push(`  ${this.sanitizeIdentifier(rule.id)}Rule,`);
    }
    lines.push('];');

    return {
      path: `${this.options.outputDir}/rules.${ext}`,
      content: lines.join('\n'),
      type: 'rules',
    };
  }

  /**
   * Generate constraints file
   */
  private generateConstraintsFile(constraints: PSFConstraint[]): GeneratedFile {
    const lines: string[] = [];
    const ext = this.options.typescript ? 'ts' : 'js';

    lines.push(`/**`);
    lines.push(` * Constraint Definitions`);
    lines.push(` * Generated from PSF Schema`);
    lines.push(` */`);
    lines.push('');
    lines.push(`import { defineConstraint } from '@plures/praxis';`);
    lines.push('');

    for (const constraint of constraints) {
      if (this.options.includeDocs && constraint.description) {
        lines.push(`/** ${constraint.description} */`);
      }

      const constraintName = this.sanitizeIdentifier(constraint.id);
      const checkCode = this.expressionToCode(constraint.check);

      lines.push(`export const ${constraintName}Constraint = defineConstraint({`);
      lines.push(`  id: '${constraint.id}',`);
      lines.push(`  description: '${this.escapeString(constraint.description)}',`);
      lines.push(`  impl: (state) => {`);
      lines.push(`    const check = ${checkCode};`);
      lines.push(`    return check || '${this.escapeString(constraint.errorMessage)}';`);
      lines.push(`  },`);
      lines.push(`});`);
      lines.push('');
    }

    // Export all constraints array
    lines.push('/** All constraints */');
    lines.push('export const constraints = [');
    for (const constraint of constraints) {
      lines.push(`  ${this.sanitizeIdentifier(constraint.id)}Constraint,`);
    }
    lines.push('];');

    return {
      path: `${this.options.outputDir}/constraints.${ext}`,
      content: lines.join('\n'),
      type: 'constraints',
    };
  }

  /**
   * Generate models file
   */
  private generateModelsFile(models: PSFModel[]): GeneratedFile {
    const lines: string[] = [];
    const ext = this.options.typescript ? 'ts' : 'js';

    lines.push(`/**`);
    lines.push(` * Model Definitions`);
    lines.push(` * Generated from PSF Schema`);
    lines.push(` */`);
    lines.push('');

    if (this.options.typescript) {
      for (const model of models) {
        if (this.options.includeDocs && model.description) {
          lines.push(`/** ${model.description} */`);
        }

        lines.push(`export interface ${model.name} {`);
        for (const field of model.fields) {
          const optional = field.optional ? '?' : '';
          const type = this.fieldTypeToTS(field.type);

          if (this.options.includeDocs && field.description) {
            lines.push(`  /** ${field.description} */`);
          }
          lines.push(`  ${field.name}${optional}: ${type};`);
        }
        lines.push(`}`);
        lines.push('');
      }
    } else {
      lines.push('// Models are defined as TypeScript interfaces.');
      lines.push('// For JavaScript, use JSDoc annotations or TypeScript for type checking.');
    }

    return {
      path: `${this.options.outputDir}/models.${ext}`,
      content: lines.join('\n'),
      type: 'models',
    };
  }

  /**
   * Generate components file
   */
  private generateComponentsFile(components: PSFComponent[]): GeneratedFile {
    const lines: string[] = [];
    const ext = this.options.typescript ? 'ts' : 'js';

    lines.push(`/**`);
    lines.push(` * Component Definitions`);
    lines.push(` * Generated from PSF Schema`);
    lines.push(` */`);
    lines.push('');

    for (const component of components) {
      if (this.options.includeDocs && component.description) {
        lines.push(`/** ${component.description} */`);
      }

      lines.push(`export const ${component.name}Config = {`);
      lines.push(`  name: '${component.name}',`);
      lines.push(`  type: '${component.type}',`);

      if (component.model) {
        lines.push(`  model: '${component.model}',`);
      }

      if (component.props.length > 0) {
        lines.push(`  props: [`);
        for (const prop of component.props) {
          lines.push(
            `    { name: '${prop.name}', type: '${prop.type}', required: ${prop.required ?? false} },`
          );
        }
        lines.push(`  ],`);
      }

      if (component.events.length > 0) {
        lines.push(`  events: [`);
        for (const event of component.events) {
          lines.push(
            `    { name: '${event.name}'${event.payload ? `, payload: '${event.payload}'` : ''} },`
          );
        }
        lines.push(`  ],`);
      }

      lines.push(`}${this.options.typescript ? ' as const' : ''};`);
      lines.push('');
    }

    // Export all components array
    lines.push('/** All component configs */');
    lines.push('export const components = [');
    for (const component of components) {
      lines.push(`  ${component.name}Config,`);
    }
    lines.push('];');

    return {
      path: `${this.options.outputDir}/components.${ext}`,
      content: lines.join('\n'),
      type: 'components',
    };
  }

  /**
   * Generate types file
   */
  private generateTypesFile(schema: PSFSchema): GeneratedFile {
    const lines: string[] = [];
    const ext = this.options.typescript ? 'ts' : 'js';

    lines.push(`/**`);
    lines.push(` * Type Definitions`);
    lines.push(` * Generated from PSF Schema: ${schema.name}`);
    lines.push(` */`);
    lines.push('');

    if (this.options.typescript) {
      // Generate payload types for facts
      if (schema.facts.length > 0) {
        lines.push('// Fact payload types');
        for (const fact of schema.facts) {
          const payloadType = this.generatePayloadType(fact.payload);
          lines.push(`export type ${fact.tag}Payload = ${payloadType};`);
        }
        lines.push('');
      }

      // Generate payload types for events
      if (schema.events.length > 0) {
        lines.push('// Event payload types');
        for (const event of schema.events) {
          const payloadType = this.generatePayloadType(event.payload);
          lines.push(`export type ${event.tag}Payload = ${payloadType};`);
        }
        lines.push('');
      }

      // Generate union types
      if (schema.facts.length > 0) {
        lines.push('// All fact tags');
        const factTags = schema.facts.map((f) => `'${f.tag}'`).join(' | ');
        lines.push(`export type FactTag = ${factTags};`);
        lines.push('');
      }

      if (schema.events.length > 0) {
        lines.push('// All event tags');
        const eventTags = schema.events.map((e) => `'${e.tag}'`).join(' | ');
        lines.push(`export type EventTag = ${eventTags};`);
        lines.push('');
      }
    }

    return {
      path: `${this.options.outputDir}/types.${ext}`,
      content: lines.join('\n'),
      type: 'types',
    };
  }

  /**
   * Generate index file
   */
  private generateIndexFile(schema: PSFSchema): GeneratedFile {
    const lines: string[] = [];
    const ext = this.options.typescript ? 'ts' : 'js';

    lines.push(`/**`);
    lines.push(` * ${schema.name}`);
    if (schema.description) {
      lines.push(` * ${schema.description}`);
    }
    lines.push(` * Generated from PSF Schema`);
    lines.push(` */`);
    lines.push('');

    if (schema.facts.length > 0) {
      lines.push(`export * from './facts.js';`);
    }
    if (schema.events.length > 0) {
      lines.push(`export * from './events.js';`);
    }
    if (schema.rules.length > 0) {
      lines.push(`export * from './rules.js';`);
    }
    if (schema.constraints.length > 0) {
      lines.push(`export * from './constraints.js';`);
    }
    if (schema.models.length > 0) {
      lines.push(`export * from './models.js';`);
    }
    if (schema.components.length > 0) {
      lines.push(`export * from './components.js';`);
    }
    lines.push(`export * from './types.js';`);

    return {
      path: `${this.options.outputDir}/index.${ext}`,
      content: lines.join('\n'),
      type: 'index',
    };
  }

  /**
   * Generate TypeScript type from payload schema
   */
  private generatePayloadType(payload: {
    properties: Record<string, { type: PSFFieldType | string; description?: string }>;
  }): string {
    const props = Object.entries(payload.properties)
      .map(([key, value]) => `${key}: ${this.fieldTypeToTS(value.type)}`)
      .join('; ');
    return `{ ${props} }`;
  }

  /**
   * Convert PSF field type to TypeScript type
   */
  private fieldTypeToTS(type: PSFFieldType | string): string {
    if (typeof type === 'string') {
      switch (type) {
        case 'string':
        case 'uuid':
          return 'string';
        case 'number':
          return 'number';
        case 'boolean':
          return 'boolean';
        case 'date':
        case 'datetime':
          return 'Date';
        case 'array':
          return 'unknown[]';
        case 'object':
          return 'Record<string, unknown>';
        default:
          return 'unknown';
      }
    }

    if ('array' in type) {
      return `${this.fieldTypeToTS(type.array)}[]`;
    }

    if ('reference' in type) {
      return type.reference;
    }

    if ('enum' in type) {
      return type.enum.map((v) => `'${v}'`).join(' | ');
    }

    if ('union' in type) {
      return type.union.map((t) => this.fieldTypeToTS(t)).join(' | ');
    }

    if ('object' in type) {
      const props = Object.entries(type.object)
        .map(([key, field]) => {
          const optional = field.optional ? '?' : '';
          return `${key}${optional}: ${this.fieldTypeToTS(field.type)}`;
        })
        .join('; ');
      return `{ ${props} }`;
    }

    return 'unknown';
  }

  /**
   * Convert PSF expression to code
   */
  private expressionToCode(expr: PSFExpression): string {
    if ('inline' in expr) {
      return expr.inline;
    }
    if ('ref' in expr) {
      return `/* ref: ${expr.ref} */`;
    }
    return '/* unknown expression */';
  }

  /**
   * Sanitize string for use as identifier
   */
  private sanitizeIdentifier(str: string): string {
    return str.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  /**
   * Escape string for use in code
   */
  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\') // Escape backslashes first
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
}

/**
 * Create a PSF generator
 */
export function createPSFGenerator(options?: GeneratorOptions): PSFGenerator {
  return new PSFGenerator(options);
}

/**
 * Generate code from PSF schema (convenience function)
 */
export function generateFromPSF(schema: PSFSchema, options?: GeneratorOptions): GenerationResult {
  const generator = new PSFGenerator(options);
  return generator.generate(schema);
}
