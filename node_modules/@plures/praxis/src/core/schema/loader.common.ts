/**
 * Praxis Schema Loader (Common/Browser Compatible)
 *
 * Core schema loading and validation functions that don't depend on Node.js APIs.
 */

import { load as yamlLoad } from 'js-yaml';
import type { PraxisSchema, ValidationResult } from './types.js';
import { validateSchema } from './types.js';

/**
 * Loader options
 */
export interface LoaderOptions {
  /** Validate schema after loading */
  validate?: boolean;
  /** Base directory for resolving relative paths */
  baseDir?: string;
}

/**
 * Loader result
 */
export interface LoaderResult {
  /** Loaded schema */
  schema?: PraxisSchema;
  /** Validation result */
  validation?: ValidationResult;
  /** Load errors */
  errors: string[];
}

/**
 * Create a new empty schema
 */
export function createSchema(name: string): PraxisSchema {
  return {
    version: '1.0.0',
    name,
    description: `Schema for ${name}`,
    models: [],
    components: [],
    logic: [],
  };
}

/**
 * Load schema from JSON string
 */
export function loadSchemaFromJson(json: string, options: LoaderOptions = {}): LoaderResult {
  const errors: string[] = [];

  try {
    const schema = JSON.parse(json) as PraxisSchema;

    // Validate if requested
    let validation: ValidationResult | undefined;
    if (options.validate !== false) {
      validation = validateSchema(schema);
      if (!validation.valid) {
        errors.push('Schema validation failed:');
        validation.errors.forEach((error) => {
          errors.push(`  ${error.path}: ${error.message}`);
        });
      }
    }

    return {
      schema,
      validation,
      errors,
    };
  } catch (error) {
    if (error instanceof Error) {
      errors.push(`Failed to parse JSON: ${error.message}`);
    } else {
      errors.push('Failed to parse JSON: Unknown error');
    }
    return { errors };
  }
}

/**
 * Load schema from YAML string
 */
export function loadSchemaFromYaml(yaml: string, options: LoaderOptions = {}): LoaderResult {
  const errors: string[] = [];

  try {
    const schema = yamlLoad(yaml) as PraxisSchema;

    // Validate if requested
    let validation: ValidationResult | undefined;
    if (options.validate !== false) {
      validation = validateSchema(schema);
      if (!validation.valid) {
        errors.push('Schema validation failed:');
        validation.errors.forEach((error) => {
          errors.push(`  ${error.path}: ${error.message}`);
        });
      }
    }

    return {
      schema,
      validation,
      errors,
    };
  } catch (error) {
    if (error instanceof Error) {
      errors.push(`Failed to parse YAML: ${error.message}`);
    } else {
      errors.push('Failed to parse YAML: Unknown error');
    }
    return { errors };
  }
}

/**
 * Validate that a loaded schema has required fields for generation
 */
export function validateForGeneration(schema: PraxisSchema): ValidationResult {
  const errors: string[] = [];

  // Check for entities/models
  if (!schema.models || schema.models.length === 0) {
    errors.push('Schema must define at least one model for generation');
  }

  // Check that models have valid fields
  schema.models?.forEach((model, index) => {
    if (!model.fields || model.fields.length === 0) {
      errors.push(`Model "${model.name}" at index ${index} must have at least one field`);
    }

    model.fields?.forEach((field, fieldIndex) => {
      if (!field.name) {
        errors.push(`Field at index ${fieldIndex} in model "${model.name}" must have a name`);
      }
      if (!field.type) {
        errors.push(`Field "${field.name}" in model "${model.name}" must have a type`);
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors: errors.map((message) => ({ path: 'schema', message })),
  };
}
