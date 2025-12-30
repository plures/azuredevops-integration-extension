/**
 * Praxis Logic Generator
 *
 * Generates logic module code from schema definitions.
 */

import type { FactDefinition, EventDefinition, RuleDefinition } from '../schema/types.js';
import type { NormalizedSchema } from '../schema/normalize.js';

/**
 * Logic generation options
 */
export interface LogicGeneratorOptions {
  /** Output directory */
  outputDir: string;
  /** Generate TypeScript */
  typescript?: boolean;
  /** Include documentation comments */
  includeDocs?: boolean;
}

/**
 * Generated logic file
 */
export interface GeneratedLogicFile {
  /** File path */
  path: string;
  /** File content */
  content: string;
  /** File type */
  type: 'facts' | 'events' | 'rules' | 'engine' | 'index';
}

/**
 * Logic generator class
 */
export class LogicGenerator {
  private options: LogicGeneratorOptions;

  constructor(options: LogicGeneratorOptions) {
    this.options = {
      typescript: true,
      includeDocs: true,
      ...options,
    };
  }

  /**
   * Generate all logic files from schema
   */
  generateLogic(schema: NormalizedSchema): GeneratedLogicFile[] {
    const files: GeneratedLogicFile[] = [];

    // Collect all logic definitions
    const allLogic = schema.logic || [];

    if (allLogic.length === 0) {
      // Generate minimal structure even without logic definitions
      files.push(this.generateFactsFile([]));
      files.push(this.generateEventsFile([]));
      files.push(this.generateRulesFile([]));
      files.push(this.generateEngineFile(schema));
      files.push(this.generateIndexFile());
      return files;
    }

    // Collect all facts, events, and rules from logic definitions
    const allFacts = allLogic.flatMap((logic) => logic.facts || []);
    const allEvents = allLogic.flatMap((logic) => logic.events || []);
    const allRules = allLogic.flatMap((logic) => logic.rules || []);

    // Generate individual files
    files.push(this.generateFactsFile(allFacts));
    files.push(this.generateEventsFile(allEvents));
    files.push(this.generateRulesFile(allRules));
    files.push(this.generateEngineFile(schema));
    files.push(this.generateIndexFile());

    return files;
  }

  /**
   * Generate facts.ts file
   */
  private generateFactsFile(facts: FactDefinition[]): GeneratedLogicFile {
    const ext = this.options.typescript ? 'ts' : 'js';
    const lines: string[] = [];

    lines.push("import { defineFact } from '@plures/praxis';");
    lines.push('');

    if (this.options.includeDocs) {
      lines.push('/**');
      lines.push(' * Fact definitions');
      lines.push(' */');
      lines.push('');
    }

    if (facts.length === 0) {
      lines.push('// No facts defined in schema');
      lines.push('// Example:');
      lines.push(
        '// export const UserCreated = defineFact<"UserCreated", { userId: string }>("UserCreated");'
      );
    } else {
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
    }

    return {
      path: `${this.options.outputDir}/facts.${ext}`,
      content: lines.join('\n'),
      type: 'facts',
    };
  }

  /**
   * Generate events.ts file
   */
  private generateEventsFile(events: EventDefinition[]): GeneratedLogicFile {
    const ext = this.options.typescript ? 'ts' : 'js';
    const lines: string[] = [];

    lines.push("import { defineEvent } from '@plures/praxis';");
    lines.push('');

    if (this.options.includeDocs) {
      lines.push('/**');
      lines.push(' * Event definitions');
      lines.push(' */');
      lines.push('');
    }

    if (events.length === 0) {
      lines.push('// No events defined in schema');
      lines.push('// Example:');
      lines.push(
        '// export const CreateUser = defineEvent<"CREATE_USER", { name: string; email: string }>("CREATE_USER");'
      );
    } else {
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
    }

    return {
      path: `${this.options.outputDir}/events.${ext}`,
      content: lines.join('\n'),
      type: 'events',
    };
  }

  /**
   * Generate rules.ts file
   */
  private generateRulesFile(rules: RuleDefinition[]): GeneratedLogicFile {
    const ext = this.options.typescript ? 'ts' : 'js';
    const lines: string[] = [];

    lines.push("import { defineRule } from '@plures/praxis';");
    lines.push("import * as Facts from './facts.js';");
    lines.push("import * as Events from './events.js';");
    lines.push('');

    if (this.options.includeDocs) {
      lines.push('/**');
      lines.push(' * Rule definitions');
      lines.push(' */');
      lines.push('');
    }

    if (rules.length === 0) {
      lines.push('// No rules defined in schema');
      lines.push('// Example:');
      lines.push('// export const createUserRule = defineRule({');
      lines.push("//   id: 'user.create',");
      lines.push("//   description: 'Create user on CREATE_USER event',");
      lines.push('//   impl: (state, events) => {');
      lines.push('//     const event = events.find(Events.CreateUser.is);');
      lines.push('//     if (event) {');
      lines.push('//       return [Facts.UserCreated.create({ userId: "new-id" })];');
      lines.push('//     }');
      lines.push('//     return [];');
      lines.push('//   },');
      lines.push('// });');
      lines.push('');
      lines.push('export const rules = [];');
    } else {
      for (const rule of rules) {
        if (this.options.includeDocs && rule.description) {
          lines.push(`/** ${rule.description} */`);
        }

        lines.push(`export const ${this.sanitizeIdentifier(rule.id)}Rule = defineRule({`);
        lines.push(`  id: '${rule.id}',`);
        lines.push(`  description: '${rule.description}',`);

        if (rule.priority !== undefined) {
          lines.push(`  priority: ${rule.priority},`);
        }

        // Generate implementation based on rule definition
        const eventTriggers = rule.on || [];
        const condition = rule.when || 'true';
        const action = rule.then;

        lines.push('  impl: (state, events) => {');

        // Add event filtering if triggers are specified
        if (eventTriggers.length > 0) {
          lines.push(`    // Filter for triggering events: ${eventTriggers.join(', ')}`);
          lines.push(`    const triggerEvents = events.filter(e => `);
          lines.push(`      [${eventTriggers.map((e) => `'${e}'`).join(', ')}].includes(e.tag)`);
          lines.push('    );');
          lines.push('    if (triggerEvents.length === 0) return [];');
          lines.push('');
        }

        // Add condition check
        if (condition && condition !== 'true') {
          lines.push(`    // Condition: ${condition}`);
          lines.push(`    // Implement condition logic here`);
          lines.push('');
        }

        // Parse action to generate appropriate response
        lines.push(`    // Action: ${action}`);

        // Try to generate a fact from the action
        const factMatch = action.match(/emit\s*\(\s*['"](\w+)['"]/);
        if (factMatch) {
          const factName = factMatch[1];
          lines.push(`    return [{ tag: '${factName}', payload: {} }];`);
        } else if (action.includes('return')) {
          // If action already has return, use it as-is
          lines.push(`    ${action}`);
        } else {
          // Default: return empty array
          lines.push('    return [];');
        }

        lines.push('  },');
        lines.push('});');
        lines.push('');
      }

      // Export all rules as array
      lines.push('export const rules = [');
      for (const rule of rules) {
        lines.push(`  ${this.sanitizeIdentifier(rule.id)}Rule,`);
      }
      lines.push('];');
    }

    return {
      path: `${this.options.outputDir}/rules.${ext}`,
      content: lines.join('\n'),
      type: 'rules',
    };
  }

  /**
   * Generate engine.ts file
   */
  private generateEngineFile(schema: NormalizedSchema): GeneratedLogicFile {
    const ext = this.options.typescript ? 'ts' : 'js';
    const lines: string[] = [];

    lines.push("import { createPraxisEngine, PraxisRegistry } from '@plures/praxis';");
    lines.push("import { rules } from './rules.js';");
    lines.push('');

    if (this.options.includeDocs) {
      lines.push('/**');
      lines.push(` * ${schema.name} Logic Engine`);
      if (schema.description) {
        lines.push(` * ${schema.description}`);
      }
      lines.push(' */');
      lines.push('');
    }

    // Generate context type from models
    if (this.options.typescript) {
      lines.push('/**');
      lines.push(' * Application context type');
      lines.push(' */');
      lines.push('export interface AppContext {');

      if (schema.models && schema.models.length > 0) {
        for (const model of schema.models) {
          lines.push(`  ${model.name.toLowerCase()}s: ${model.name}[];`);
        }
      } else {
        lines.push('  // Add your context properties here');
      }

      lines.push('}');
      lines.push('');

      // Generate model types
      if (schema.models && schema.models.length > 0) {
        for (const model of schema.models) {
          lines.push(`export interface ${model.name} {`);
          for (const field of model.fields) {
            const optional = field.optional ? '?' : '';
            const type = this.mapFieldType(field.type);
            lines.push(`  ${field.name}${optional}: ${type};`);
          }
          lines.push('}');
          lines.push('');
        }
      }
    }

    // Create registry and engine
    lines.push('/**');
    lines.push(' * Create the logic engine');
    lines.push(' */');
    lines.push('export function createEngine() {');
    lines.push('  const registry = new PraxisRegistry<AppContext>();');
    lines.push('');
    lines.push('  // Register all rules');
    lines.push('  for (const rule of rules) {');
    lines.push('    registry.registerRule(rule);');
    lines.push('  }');
    lines.push('');
    lines.push('  // Create engine with initial context');
    lines.push('  const initialContext: AppContext = {');

    if (schema.models && schema.models.length > 0) {
      for (const model of schema.models) {
        lines.push(`    ${model.name.toLowerCase()}s: [],`);
      }
    } else {
      lines.push('    // Initialize your context here');
    }

    lines.push('  };');
    lines.push('');
    lines.push('  return createPraxisEngine({');
    lines.push('    initialContext,');
    lines.push('    registry,');
    lines.push('  });');
    lines.push('}');

    return {
      path: `${this.options.outputDir}/engine.${ext}`,
      content: lines.join('\n'),
      type: 'engine',
    };
  }

  /**
   * Generate index.ts file
   */
  private generateIndexFile(): GeneratedLogicFile {
    const ext = this.options.typescript ? 'ts' : 'js';
    const lines: string[] = [];

    lines.push("export * from './facts.js';");
    lines.push("export * from './events.js';");
    lines.push("export * from './rules.js';");
    lines.push("export * from './engine.js';");

    return {
      path: `${this.options.outputDir}/index.${ext}`,
      content: lines.join('\n'),
      type: 'index',
    };
  }

  /**
   * Generate TypeScript type from payload definition
   */
  private generatePayloadType(payload: Record<string, string>): string {
    const fields = Object.entries(payload)
      .map(([key, type]) => `${key}: ${type}`)
      .join('; ');
    return `{ ${fields} }`;
  }

  /**
   * Map field type to TypeScript type
   */
  private mapFieldType(type: any): string {
    if (typeof type === 'string') {
      switch (type) {
        case 'string':
          return 'string';
        case 'number':
          return 'number';
        case 'boolean':
          return 'boolean';
        case 'date':
          return 'Date';
        case 'array':
          return 'unknown[]';
        case 'object':
          return 'Record<string, unknown>';
        default:
          return 'unknown';
      }
    }

    if (typeof type === 'object') {
      if ('array' in type) {
        const innerType = this.mapFieldType(type.array);
        return `${innerType}[]`;
      }
      if ('reference' in type) {
        return type.reference;
      }
    }

    return 'unknown';
  }

  /**
   * Sanitize identifier for variable names
   */
  private sanitizeIdentifier(id: string): string {
    return id.replace(/[^a-zA-Z0-9_]/g, '_');
  }
}

/**
 * Create a logic generator
 */
export function createLogicGenerator(
  outputDir: string,
  options?: Partial<LogicGeneratorOptions>
): LogicGenerator {
  return new LogicGenerator({
    outputDir,
    ...options,
  });
}
