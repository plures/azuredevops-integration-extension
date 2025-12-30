/**
 * PSF Validator
 *
 * Validates PSF schemas for correctness, completeness, and consistency.
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
} from './psf.js';
import { PSF_VERSION } from './psf.js';

/**
 * Validation error
 */
export interface ValidationError {
  /** Error path in schema */
  path: string;
  /** Error message */
  message: string;
  /** Error code */
  code: string;
  /** Severity */
  severity: 'error' | 'warning' | 'info';
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Is schema valid */
  valid: boolean;
  /** Validation errors */
  errors: ValidationError[];
  /** Validation warnings */
  warnings: ValidationError[];
  /** Info messages */
  info: ValidationError[];
}

/**
 * Validation options
 */
export interface ValidationOptions {
  /** Check for duplicate IDs */
  checkDuplicates?: boolean;
  /** Check references are valid */
  checkReferences?: boolean;
  /** Check identifier naming conventions */
  checkNaming?: boolean;
  /** Strict mode (treat warnings as errors) */
  strict?: boolean;
}

/**
 * Reserved JavaScript keywords
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
 * PSF Validator class
 */
export class PSFValidator {
  private options: Required<ValidationOptions>;
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];
  private info: ValidationError[] = [];

  constructor(options: ValidationOptions = {}) {
    this.options = {
      checkDuplicates: options.checkDuplicates ?? true,
      checkReferences: options.checkReferences ?? true,
      checkNaming: options.checkNaming ?? true,
      strict: options.strict ?? false,
    };
  }

  /**
   * Validate a PSF schema
   */
  validate(schema: PSFSchema): ValidationResult {
    this.errors = [];
    this.warnings = [];
    this.info = [];

    // Check version
    this.validateVersion(schema);

    // Check required fields
    this.validateRequiredFields(schema);

    // Validate individual sections (handle undefined arrays)
    this.validateFacts(schema.facts || []);
    this.validateEvents(schema.events || []);
    this.validateRules(schema.rules || [], schema);
    this.validateConstraints(schema.constraints || []);
    this.validateModels(schema.models || []);
    this.validateComponents(schema.components || [], schema);
    this.validateFlows(schema.flows || []);

    // Check for duplicate IDs
    if (this.options.checkDuplicates) {
      this.validateDuplicateIds(schema);
    }

    // Check references
    if (this.options.checkReferences) {
      this.validateReferences(schema);
    }

    const isValid = this.options.strict
      ? this.errors.length === 0 && this.warnings.length === 0
      : this.errors.length === 0;

    return {
      valid: isValid,
      errors: this.errors,
      warnings: this.warnings,
      info: this.info,
    };
  }

  /**
   * Validate schema version
   */
  private validateVersion(schema: PSFSchema): void {
    if (!schema.$version) {
      this.addError('$version', 'Schema version is required', 'missing-version');
    } else if (schema.$version !== PSF_VERSION) {
      this.addWarning(
        '$version',
        `Schema version ${schema.$version} does not match current PSF version ${PSF_VERSION}`,
        'version-mismatch'
      );
    }
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(schema: PSFSchema): void {
    if (!schema.id) {
      this.addError('id', 'Schema ID is required', 'missing-id');
    }
    if (!schema.name) {
      this.addError('name', 'Schema name is required', 'missing-name');
    }
  }

  /**
   * Validate facts
   */
  private validateFacts(facts: PSFFact[]): void {
    facts.forEach((fact, index) => {
      const path = `facts[${index}]`;

      if (!fact.id) {
        this.addError(`${path}.id`, 'Fact ID is required', 'missing-id');
      }

      if (!fact.tag) {
        this.addError(`${path}.tag`, 'Fact tag is required', 'missing-tag');
      } else if (this.options.checkNaming && !this.isValidIdentifier(fact.tag)) {
        this.addError(
          `${path}.tag`,
          `"${fact.tag}" is not a valid identifier`,
          'invalid-identifier'
        );
      }

      if (!fact.payload) {
        this.addError(`${path}.payload`, 'Fact payload is required', 'missing-payload');
      }
    });
  }

  /**
   * Validate events
   */
  private validateEvents(events: PSFEvent[]): void {
    events.forEach((event, index) => {
      const path = `events[${index}]`;

      if (!event.id) {
        this.addError(`${path}.id`, 'Event ID is required', 'missing-id');
      }

      if (!event.tag) {
        this.addError(`${path}.tag`, 'Event tag is required', 'missing-tag');
      } else if (this.options.checkNaming && !this.isValidIdentifier(event.tag)) {
        this.addError(
          `${path}.tag`,
          `"${event.tag}" is not a valid identifier`,
          'invalid-identifier'
        );
      }

      if (!event.payload) {
        this.addError(`${path}.payload`, 'Event payload is required', 'missing-payload');
      }
    });
  }

  /**
   * Validate rules
   */
  private validateRules(rules: PSFRule[], schema: PSFSchema): void {
    const eventTags = new Set((schema.events || []).map((e) => e.tag));

    rules.forEach((rule, index) => {
      const path = `rules[${index}]`;

      if (!rule.id) {
        this.addError(`${path}.id`, 'Rule ID is required', 'missing-id');
      }

      if (!rule.description) {
        this.addWarning(
          `${path}.description`,
          'Rule description is recommended',
          'missing-description'
        );
      }

      if (!rule.then) {
        this.addError(`${path}.then`, 'Rule action (then) is required', 'missing-action');
      }

      // Check that triggers reference valid events
      if (rule.triggers) {
        rule.triggers.forEach((trigger, triggerIndex) => {
          if (!eventTags.has(trigger)) {
            this.addWarning(
              `${path}.triggers[${triggerIndex}]`,
              `Trigger "${trigger}" does not match any defined event`,
              'unknown-trigger'
            );
          }
        });
      }
    });
  }

  /**
   * Validate constraints
   */
  private validateConstraints(constraints: PSFConstraint[]): void {
    constraints.forEach((constraint, index) => {
      const path = `constraints[${index}]`;

      if (!constraint.id) {
        this.addError(`${path}.id`, 'Constraint ID is required', 'missing-id');
      }

      if (!constraint.description) {
        this.addWarning(
          `${path}.description`,
          'Constraint description is recommended',
          'missing-description'
        );
      }

      if (!constraint.check) {
        this.addError(`${path}.check`, 'Constraint check is required', 'missing-check');
      }

      if (!constraint.errorMessage) {
        this.addWarning(
          `${path}.errorMessage`,
          'Constraint error message is recommended',
          'missing-error-message'
        );
      }
    });
  }

  /**
   * Validate models
   */
  private validateModels(models: PSFModel[]): void {
    models.forEach((model, index) => {
      const path = `models[${index}]`;

      if (!model.id) {
        this.addError(`${path}.id`, 'Model ID is required', 'missing-id');
      }

      if (!model.name) {
        this.addError(`${path}.name`, 'Model name is required', 'missing-name');
      } else if (this.options.checkNaming && !this.isValidTypeName(model.name)) {
        this.addError(
          `${path}.name`,
          `"${model.name}" is not a valid type name (should be PascalCase)`,
          'invalid-type-name'
        );
      }

      if (!model.fields || model.fields.length === 0) {
        this.addError(`${path}.fields`, 'Model must have at least one field', 'empty-fields');
      } else {
        this.validateModelFields(model.fields, `${path}.fields`);
      }
    });
  }

  /**
   * Validate model fields
   */
  private validateModelFields(
    fields: { name: string; type: PSFFieldType; optional?: boolean }[],
    basePath: string
  ): void {
    const fieldNames = new Set<string>();

    fields.forEach((field, index) => {
      const path = `${basePath}[${index}]`;

      if (!field.name) {
        this.addError(`${path}.name`, 'Field name is required', 'missing-name');
      } else {
        if (fieldNames.has(field.name)) {
          this.addError(`${path}.name`, `Duplicate field name "${field.name}"`, 'duplicate-field');
        }
        fieldNames.add(field.name);

        if (this.options.checkNaming && !this.isValidPropertyName(field.name)) {
          this.addWarning(
            `${path}.name`,
            `"${field.name}" should be camelCase`,
            'naming-convention'
          );
        }
      }

      if (!field.type) {
        this.addError(`${path}.type`, 'Field type is required', 'missing-type');
      }
    });
  }

  /**
   * Validate components
   */
  private validateComponents(components: PSFComponent[], schema: PSFSchema): void {
    const modelNames = new Set((schema.models || []).map((m) => m.name));

    components.forEach((component, index) => {
      const path = `components[${index}]`;

      if (!component.id) {
        this.addError(`${path}.id`, 'Component ID is required', 'missing-id');
      }

      if (!component.name) {
        this.addError(`${path}.name`, 'Component name is required', 'missing-name');
      }

      if (!component.type) {
        this.addError(`${path}.type`, 'Component type is required', 'missing-type');
      }

      // Check model reference
      if (component.model && !modelNames.has(component.model)) {
        this.addWarning(
          `${path}.model`,
          `Model "${component.model}" does not exist`,
          'unknown-model'
        );
      }
    });
  }

  /**
   * Validate flows
   */
  private validateFlows(flows: PSFFlow[]): void {
    flows.forEach((flow, index) => {
      const path = `flows[${index}]`;

      if (!flow.id) {
        this.addError(`${path}.id`, 'Flow ID is required', 'missing-id');
      }

      if (!flow.name) {
        this.addError(`${path}.name`, 'Flow name is required', 'missing-name');
      }

      if (!flow.type) {
        this.addError(`${path}.type`, 'Flow type is required', 'missing-type');
      }

      if (!flow.steps || flow.steps.length === 0) {
        this.addWarning(`${path}.steps`, 'Flow has no steps', 'empty-steps');
      } else {
        const stepIds = new Set(flow.steps.map((s) => s.id));

        // Check step references
        flow.steps.forEach((step, stepIndex) => {
          const stepPath = `${path}.steps[${stepIndex}]`;

          if (!step.id) {
            this.addError(`${stepPath}.id`, 'Step ID is required', 'missing-id');
          }

          // Check next step references
          if (step.next) {
            if (typeof step.next === 'string') {
              if (!stepIds.has(step.next)) {
                this.addError(
                  `${stepPath}.next`,
                  `Step "${step.next}" does not exist`,
                  'invalid-step-reference'
                );
              }
            } else {
              Object.values(step.next).forEach((nextId) => {
                if (!stepIds.has(nextId)) {
                  this.addError(
                    `${stepPath}.next`,
                    `Step "${nextId}" does not exist`,
                    'invalid-step-reference'
                  );
                }
              });
            }
          }
        });

        // Check initial step
        if (flow.initial && !stepIds.has(flow.initial)) {
          this.addError(
            `${path}.initial`,
            `Initial step "${flow.initial}" does not exist`,
            'invalid-step-reference'
          );
        }
      }
    });
  }

  /**
   * Validate for duplicate IDs across all sections
   */
  private validateDuplicateIds(schema: PSFSchema): void {
    const allIds = new Map<string, string[]>();

    const addId = (id: string, type: string) => {
      if (!allIds.has(id)) {
        allIds.set(id, []);
      }
      allIds.get(id)!.push(type);
    };

    (schema.facts || []).forEach((f) => addId(f.id, 'fact'));
    (schema.events || []).forEach((e) => addId(e.id, 'event'));
    (schema.rules || []).forEach((r) => addId(r.id, 'rule'));
    (schema.constraints || []).forEach((c) => addId(c.id, 'constraint'));
    (schema.models || []).forEach((m) => addId(m.id, 'model'));
    (schema.components || []).forEach((c) => addId(c.id, 'component'));
    (schema.flows || []).forEach((f) => addId(f.id, 'flow'));

    allIds.forEach((types, id) => {
      if (types.length > 1) {
        this.addError('', `Duplicate ID "${id}" found in: ${types.join(', ')}`, 'duplicate-id');
      }
    });
  }

  /**
   * Validate references between sections
   */
  private validateReferences(schema: PSFSchema): void {
    const modelNames = new Set((schema.models || []).map((m) => m.name));

    // Check model references in field types
    (schema.models || []).forEach((model, modelIndex) => {
      (model.fields || []).forEach((field, fieldIndex) => {
        this.checkFieldTypeReferences(
          field.type,
          modelNames,
          `models[${modelIndex}].fields[${fieldIndex}].type`
        );
      });

      // Check relationship references
      model.relationships?.forEach((rel, relIndex) => {
        if (!modelNames.has(rel.target)) {
          this.addError(
            `models[${modelIndex}].relationships[${relIndex}].target`,
            `Target model "${rel.target}" does not exist`,
            'invalid-reference'
          );
        }
      });
    });
  }

  /**
   * Check field type for references
   */
  private checkFieldTypeReferences(
    type: PSFFieldType,
    modelNames: Set<string>,
    path: string
  ): void {
    if (typeof type === 'object') {
      if ('reference' in type) {
        if (!modelNames.has(type.reference)) {
          this.addWarning(
            path,
            `Reference to unknown model "${type.reference}"`,
            'unknown-reference'
          );
        }
      } else if ('array' in type) {
        this.checkFieldTypeReferences(type.array, modelNames, path);
      } else if ('object' in type) {
        Object.entries(type.object).forEach(([key, field]) => {
          this.checkFieldTypeReferences(field.type, modelNames, `${path}.${key}`);
        });
      }
    }
  }

  /**
   * Check if string is valid JavaScript identifier
   */
  private isValidIdentifier(str: string): boolean {
    const identifierRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
    return identifierRegex.test(str) && !RESERVED_KEYWORDS.has(str);
  }

  /**
   * Check if string is valid type name (PascalCase)
   */
  private isValidTypeName(str: string): boolean {
    const pascalCaseRegex = /^[A-Z][a-zA-Z0-9]*$/;
    return pascalCaseRegex.test(str);
  }

  /**
   * Check if string is valid property name (camelCase)
   */
  private isValidPropertyName(str: string): boolean {
    const camelCaseRegex = /^[a-z][a-zA-Z0-9]*$/;
    return camelCaseRegex.test(str) || str.startsWith('_');
  }

  /**
   * Add error
   */
  private addError(path: string, message: string, code: string): void {
    this.errors.push({ path, message, code, severity: 'error' });
  }

  /**
   * Add warning
   */
  private addWarning(path: string, message: string, code: string): void {
    this.warnings.push({ path, message, code, severity: 'warning' });
  }
}

/**
 * Create a PSF validator
 */
export function createPSFValidator(options?: ValidationOptions): PSFValidator {
  return new PSFValidator(options);
}

/**
 * Validate a PSF schema (convenience function)
 */
export function validatePSFSchema(
  schema: PSFSchema,
  options?: ValidationOptions
): ValidationResult {
  const validator = new PSFValidator(options);
  return validator.validate(schema);
}
