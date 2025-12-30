/**
 * PSF Compiler
 *
 * Compiles TypeScript DSL definitions to PSF format.
 * This enables code → schema synchronization.
 */

import type {
  PSFSchema,
  PSFFact,
  PSFEvent,
  PSFRule,
  PSFConstraint,
  PSFModel,
  PSFComponent,
  PSFPayloadSchema,
  PSFField,
  PSFFieldType,
  PSFExpression,
} from './psf.js';
import { PSF_VERSION, generatePSFId } from './psf.js';

/**
 * Reserved JavaScript keywords (O(1) lookup)
 */
const RESERVED_KEYWORDS = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
  'let',
  'static',
  'enum',
  'await',
  'implements',
  'interface',
  'package',
  'private',
  'protected',
  'public',
]);

/**
 * Source location information for error reporting
 */
export interface SourceLocation {
  file?: string;
  line?: number;
  column?: number;
}

/**
 * Compilation error
 */
export interface CompilationError {
  message: string;
  code: string;
  location?: SourceLocation;
  severity: 'error' | 'warning';
}

/**
 * Compilation result
 */
export interface CompilationResult {
  success: boolean;
  schema?: PSFSchema;
  errors: CompilationError[];
  warnings: CompilationError[];
}

/**
 * DSL Fact definition input
 */
export interface DSLFact {
  tag: string;
  description?: string;
  payload: Record<string, string>;
}

/**
 * DSL Event definition input
 */
export interface DSLEvent {
  tag: string;
  description?: string;
  payload: Record<string, string>;
}

/**
 * DSL Rule definition input
 */
export interface DSLRule {
  id: string;
  description: string;
  triggers?: string[];
  when?: string;
  then: string;
  priority?: number;
}

/**
 * DSL Constraint definition input
 */
export interface DSLConstraint {
  id: string;
  description: string;
  check: string;
  errorMessage: string;
}

/**
 * DSL Model definition input
 */
export interface DSLModel {
  name: string;
  description?: string;
  fields: DSLModelField[];
}

/**
 * DSL Model Field input
 */
export interface DSLModelField {
  name: string;
  type: string;
  optional?: boolean;
  default?: unknown;
  description?: string;
}

/**
 * DSL Component definition input
 */
export interface DSLComponent {
  name: string;
  type: 'form' | 'display' | 'list' | 'navigation' | 'editor' | 'custom';
  description?: string;
  model?: string;
  props?: Array<{
    name: string;
    type: string;
    required?: boolean;
    default?: unknown;
    description?: string;
  }>;
  events?: Array<{
    name: string;
    payload?: string;
    description?: string;
  }>;
}

/**
 * DSL Schema input
 */
export interface DSLSchema {
  id?: string;
  name: string;
  description?: string;
  facts?: DSLFact[];
  events?: DSLEvent[];
  rules?: DSLRule[];
  constraints?: DSLConstraint[];
  models?: DSLModel[];
  components?: DSLComponent[];
}

/**
 * PSF Compiler class
 */
export class PSFCompiler {
  private errors: CompilationError[] = [];
  private warnings: CompilationError[] = [];

  /**
   * Compile DSL schema to PSF format
   */
  compile(input: DSLSchema): CompilationResult {
    this.errors = [];
    this.warnings = [];

    try {
      const schema = this.compileToPSF(input);

      return {
        success: this.errors.length === 0,
        schema: this.errors.length === 0 ? schema : undefined,
        errors: this.errors,
        warnings: this.warnings,
      };
    } catch (error) {
      this.addError(
        'compilation-failed',
        error instanceof Error ? error.message : 'Unknown compilation error'
      );
      return {
        success: false,
        errors: this.errors,
        warnings: this.warnings,
      };
    }
  }

  /**
   * Compile DSL to PSF schema
   */
  private compileToPSF(input: DSLSchema): PSFSchema {
    const now = new Date().toISOString();

    return {
      $version: PSF_VERSION,
      id: input.id || generatePSFId('schema'),
      name: input.name,
      description: input.description,
      createdAt: now,
      modifiedAt: now,
      facts: this.compileFacts(input.facts || []),
      events: this.compileEvents(input.events || []),
      rules: this.compileRules(input.rules || []),
      constraints: this.compileConstraints(input.constraints || []),
      models: this.compileModels(input.models || []),
      components: this.compileComponents(input.components || []),
      flows: [],
      docs: {},
    };
  }

  /**
   * Compile facts
   */
  private compileFacts(facts: DSLFact[]): PSFFact[] {
    return facts.map((fact) => {
      if (!this.isValidIdentifier(fact.tag)) {
        this.addError('invalid-identifier', `Invalid fact tag: ${fact.tag}`);
      }

      return {
        id: generatePSFId('fact'),
        tag: fact.tag,
        description: fact.description,
        payload: this.compilePayload(fact.payload),
      };
    });
  }

  /**
   * Compile events
   */
  private compileEvents(events: DSLEvent[]): PSFEvent[] {
    return events.map((event) => {
      if (!this.isValidIdentifier(event.tag)) {
        this.addError('invalid-identifier', `Invalid event tag: ${event.tag}`);
      }

      return {
        id: generatePSFId('event'),
        tag: event.tag,
        description: event.description,
        payload: this.compilePayload(event.payload),
      };
    });
  }

  /**
   * Compile payload to PSF format
   */
  private compilePayload(payload: Record<string, string>): PSFPayloadSchema {
    const properties: Record<string, { type: PSFFieldType; description?: string }> = {};

    for (const [key, typeStr] of Object.entries(payload)) {
      properties[key] = {
        type: this.parseFieldType(typeStr),
      };
    }

    return {
      type: 'object',
      properties,
      required: Object.keys(payload),
    };
  }

  /**
   * Compile rules
   */
  private compileRules(rules: DSLRule[]): PSFRule[] {
    return rules.map((rule) => ({
      id: rule.id,
      description: rule.description,
      triggers: rule.triggers,
      when: rule.when ? this.parseExpression(rule.when) : undefined,
      then: this.parseExpression(rule.then),
      priority: rule.priority,
    }));
  }

  /**
   * Compile constraints
   */
  private compileConstraints(constraints: DSLConstraint[]): PSFConstraint[] {
    return constraints.map((constraint) => ({
      id: constraint.id,
      description: constraint.description,
      check: this.parseExpression(constraint.check),
      errorMessage: constraint.errorMessage,
    }));
  }

  /**
   * Compile models
   */
  private compileModels(models: DSLModel[]): PSFModel[] {
    return models.map((model) => ({
      id: generatePSFId('model'),
      name: model.name,
      description: model.description,
      fields: this.compileFields(model.fields),
    }));
  }

  /**
   * Compile model fields
   */
  private compileFields(fields: DSLModelField[]): PSFField[] {
    return fields.map((field) => ({
      name: field.name,
      type: this.parseFieldType(field.type),
      optional: field.optional,
      default: field.default,
      description: field.description,
    }));
  }

  /**
   * Compile components
   */
  private compileComponents(components: DSLComponent[]): PSFComponent[] {
    return components.map((component) => ({
      id: generatePSFId('component'),
      name: component.name,
      type: component.type,
      description: component.description,
      model: component.model,
      props: (component.props || []).map((prop) => ({
        name: prop.name,
        type: prop.type,
        required: prop.required,
        default: prop.default,
        description: prop.description,
      })),
      events: (component.events || []).map((event) => ({
        name: event.name,
        payload: event.payload,
        description: event.description,
      })),
    }));
  }

  /**
   * Parse field type string to PSF field type
   */
  private parseFieldType(typeStr: string): PSFFieldType {
    // Handle array types
    if (typeStr.endsWith('[]')) {
      const innerType = typeStr.slice(0, -2);
      return { array: this.parseFieldType(innerType) };
    }

    // Handle reference types
    if (typeStr.startsWith('ref:')) {
      return { reference: typeStr.slice(4) };
    }

    // Handle enum types
    if (typeStr.startsWith('enum:')) {
      const values = typeStr
        .slice(5)
        .split('|')
        .map((v) => v.trim());
      return { enum: values };
    }

    // Handle basic types
    const basicTypes = ['string', 'number', 'boolean', 'date', 'datetime', 'uuid'] as const;
    if (basicTypes.includes(typeStr as (typeof basicTypes)[number])) {
      return typeStr as PSFFieldType;
    }

    // Default to string if unknown
    this.addWarning('unknown-type', `Unknown type "${typeStr}", defaulting to string`);
    return 'string';
  }

  /**
   * Parse expression string to PSF expression
   */
  private parseExpression(expr: string): PSFExpression {
    // Check if it's a reference
    if (expr.startsWith('$ref:')) {
      return { ref: expr.slice(5) };
    }

    // Otherwise treat as inline TypeScript
    return { inline: expr, language: 'typescript' };
  }

  /**
   * Check if string is valid JavaScript identifier
   */
  private isValidIdentifier(str: string): boolean {
    const identifierRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    return identifierRegex.test(str) && !RESERVED_KEYWORDS.has(str);
  }

  /**
   * Add error
   */
  private addError(code: string, message: string, location?: SourceLocation): void {
    this.errors.push({ code, message, location, severity: 'error' });
  }

  /**
   * Add warning
   */
  private addWarning(code: string, message: string, location?: SourceLocation): void {
    this.warnings.push({ code, message, location, severity: 'warning' });
  }
}

/**
 * Create a PSF compiler
 */
export function createPSFCompiler(): PSFCompiler {
  return new PSFCompiler();
}

/**
 * Compile DSL to PSF (convenience function)
 */
export function compileToPSF(input: DSLSchema): CompilationResult {
  const compiler = new PSFCompiler();
  return compiler.compile(input);
}
