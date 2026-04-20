/**
 * Praxis Schema Normalizer
 *
 * Expands and normalizes schema definitions for code generation.
 */

import type {
  PraxisSchema,
  ModelDefinition,
  ComponentDefinition,
  LogicDefinition,
  FieldDefinition,
} from './types.js';

/**
 * Normalized schema with expanded and validated definitions
 */
export interface NormalizedSchema extends PraxisSchema {
  /** Normalized models with expanded references */
  models: NormalizedModel[];
  /** Normalized components */
  components: NormalizedComponent[];
  /** Normalized logic */
  logic: NormalizedLogic[];
}

/**
 * Normalized model definition
 */
export interface NormalizedModel extends ModelDefinition {
  /** Fully qualified name */
  fullName: string;
  /** All fields including inherited ones */
  allFields: FieldDefinition[];
  /** Model dependencies */
  dependencies: string[];
}

/**
 * Normalized component definition
 */
export interface NormalizedComponent extends ComponentDefinition {
  /** Fully qualified name */
  fullName: string;
  /** Resolved model reference */
  resolvedModel?: NormalizedModel;
}

/**
 * Normalized logic definition
 */
export interface NormalizedLogic extends LogicDefinition {
  /** Fully qualified identifier */
  fullId: string;
}

/**
 * Normalization options
 */
export interface NormalizationOptions {
  /** Schema name prefix for fully qualified names */
  schemaPrefix?: string;
  /** Expand all field references */
  expandReferences?: boolean;
  /** Include computed metadata */
  includeMetadata?: boolean;
}

/**
 * Normalize a Praxis schema for code generation
 */
export function normalizeSchema(
  schema: PraxisSchema,
  options: NormalizationOptions = {}
): NormalizedSchema {
  const schemaPrefix = options.schemaPrefix || schema.name;

  // Normalize models
  const normalizedModels = normalizeModels(schema.models || [], schemaPrefix, options);

  // Create model lookup map
  const modelMap = new Map(normalizedModels.map((model) => [model.name, model]));

  // Normalize components
  const normalizedComponents = normalizeComponents(
    schema.components || [],
    schemaPrefix,
    modelMap,
    options
  );

  // Normalize logic
  const normalizedLogic = normalizeLogic(schema.logic || [], schemaPrefix, options);

  return {
    ...schema,
    models: normalizedModels,
    components: normalizedComponents,
    logic: normalizedLogic,
  };
}

/**
 * Normalize model definitions
 */
function normalizeModels(
  models: ModelDefinition[],
  schemaPrefix: string,
  _options: NormalizationOptions
): NormalizedModel[] {
  return models.map((model) => {
    const fullName = `${schemaPrefix}.${model.name}`;
    const dependencies = extractModelDependencies(model);

    // For now, allFields is the same as fields
    // In the future, this could include inherited fields
    const allFields = [...model.fields];

    return {
      ...model,
      fullName,
      allFields,
      dependencies,
    };
  });
}

/**
 * Extract model dependencies from field references
 */
function extractModelDependencies(model: ModelDefinition): string[] {
  const dependencies = new Set<string>();

  for (const field of model.fields) {
    if (typeof field.type === 'object' && 'reference' in field.type) {
      dependencies.add(field.type.reference);
    }
  }

  // Add relationship dependencies
  if (model.relationships) {
    for (const rel of model.relationships) {
      dependencies.add(rel.target);
    }
  }

  return Array.from(dependencies);
}

/**
 * Normalize component definitions
 */
function normalizeComponents(
  components: ComponentDefinition[],
  schemaPrefix: string,
  modelMap: Map<string, NormalizedModel>,
  _options: NormalizationOptions
): NormalizedComponent[] {
  return components.map((component) => {
    const fullName = `${schemaPrefix}.${component.name}`;
    const resolvedModel = component.model ? modelMap.get(component.model) : undefined;

    return {
      ...component,
      fullName,
      resolvedModel,
    };
  });
}

/**
 * Normalize logic definitions
 */
function normalizeLogic(
  logic: LogicDefinition[],
  schemaPrefix: string,
  _options: NormalizationOptions
): NormalizedLogic[] {
  return logic.map((logicDef) => {
    const fullId = `${schemaPrefix}.${logicDef.id}`;

    return {
      ...logicDef,
      fullId,
    };
  });
}

/**
 * Expand field type to fully qualified type string
 */
export function expandFieldType(fieldType: any, schemaPrefix: string = ''): string {
  if (typeof fieldType === 'string') {
    return fieldType;
  }

  if (typeof fieldType === 'object') {
    if ('array' in fieldType) {
      const innerType = expandFieldType(fieldType.array, schemaPrefix);
      return `${innerType}[]`;
    }

    if ('object' in fieldType) {
      return 'object';
    }

    if ('reference' in fieldType) {
      const refName = fieldType.reference;
      return schemaPrefix ? `${schemaPrefix}.${refName}` : refName;
    }
  }

  return 'unknown';
}

/**
 * Generate TypeScript type from field type
 */
export function fieldTypeToTypeScript(fieldType: any): string {
  if (typeof fieldType === 'string') {
    switch (fieldType) {
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

  if (typeof fieldType === 'object') {
    if ('array' in fieldType) {
      const innerType = fieldTypeToTypeScript(fieldType.array);
      return `${innerType}[]`;
    }

    if ('object' in fieldType) {
      const fields = fieldType.object;
      const fieldTypes = Object.entries(fields)
        .map(([key, field]: [string, any]) => {
          const type = fieldTypeToTypeScript(field.type || field);
          return `${key}: ${type}`;
        })
        .join('; ');
      return `{ ${fieldTypes} }`;
    }

    if ('reference' in fieldType) {
      return fieldType.reference;
    }
  }

  return 'unknown';
}

/**
 * Sort models by dependency order (models with no dependencies first)
 */
export function sortModelsByDependencies(models: NormalizedModel[]): NormalizedModel[] {
  const sorted: NormalizedModel[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(model: NormalizedModel) {
    if (visited.has(model.name)) {
      return;
    }

    if (visiting.has(model.name)) {
      // Circular dependency detected, just add it
      visiting.delete(model.name);
      sorted.push(model);
      visited.add(model.name);
      return;
    }

    visiting.add(model.name);

    // Visit dependencies first
    for (const depName of model.dependencies) {
      const dep = models.find((m) => m.name === depName);
      if (dep) {
        visit(dep);
      }
    }

    visiting.delete(model.name);
    visited.add(model.name);
    sorted.push(model);
  }

  for (const model of models) {
    visit(model);
  }

  return sorted;
}
