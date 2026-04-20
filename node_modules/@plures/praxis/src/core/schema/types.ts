/**
 * Praxis Schema System
 *
 * Declarative schema definitions for generating models, components, logic, and documentation.
 */

/**
 * Base schema definition
 */
export interface PraxisSchema {
  /** Schema version (semver) */
  version: string;
  /** Schema name/identifier */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Data models */
  models?: ModelDefinition[];
  /** UI components */
  components?: ComponentDefinition[];
  /** Logic definitions */
  logic?: LogicDefinition[];
  /** Orchestration configuration */
  orchestration?: OrchestrationDefinition;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Model definition for data structures
 */
export interface ModelDefinition {
  /** Model name */
  name: string;
  /** Model description */
  description?: string;
  /** Model fields */
  fields: FieldDefinition[];
  /** Validation constraints */
  constraints?: ConstraintDefinition[];
  /** Indexes for queries */
  indexes?: IndexDefinition[];
  /** Relationships to other models */
  relationships?: RelationshipDefinition[];
}

/**
 * Field definition within a model
 */
export interface FieldDefinition {
  /** Field name */
  name: string;
  /** Field type */
  type: FieldType;
  /** Optional field */
  optional?: boolean;
  /** Default value */
  default?: unknown;
  /** Field description */
  description?: string;
  /** Validation rules */
  validation?: ValidationRule[];
}

/**
 * Supported field types
 */
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object'
  | 'reference'
  | { array: FieldType }
  | { object: Record<string, FieldDefinition> }
  | { reference: string };

/**
 * Validation rule for a field
 */
export interface ValidationRule {
  /** Validation type */
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  /** Validation value */
  value?: unknown;
  /** Error message */
  message?: string;
}

/**
 * Constraint definition for models
 */
export interface ConstraintDefinition {
  /** Constraint identifier */
  id: string;
  /** Constraint description */
  description: string;
  /** Constraint type */
  type: 'unique' | 'check' | 'foreign_key';
  /** Constraint fields */
  fields: string[];
  /** Additional constraint options */
  options?: Record<string, unknown>;
}

/**
 * Index definition for queries
 */
export interface IndexDefinition {
  /** Index name */
  name: string;
  /** Indexed fields */
  fields: string[];
  /** Unique index */
  unique?: boolean;
  /** Index type */
  type?: 'btree' | 'hash' | 'fulltext';
}

/**
 * Relationship definition between models
 */
export interface RelationshipDefinition {
  /** Relationship name */
  name: string;
  /** Relationship type */
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  /** Target model */
  target: string;
  /** Foreign key field */
  foreignKey?: string;
  /** Cascade delete */
  cascadeDelete?: boolean;
}

/**
 * Component definition for UI
 */
export interface ComponentDefinition {
  /** Component name */
  name: string;
  /** Component type */
  type: 'form' | 'display' | 'list' | 'navigation' | 'custom';
  /** Component description */
  description?: string;
  /** Model binding */
  model?: string;
  /** Component properties */
  props?: ComponentProp[];
  /** Component events */
  events?: ComponentEvent[];
  /** Component layout */
  layout?: LayoutDefinition;
  /** Component styling */
  styling?: StylingDefinition;
}

/**
 * Component property definition
 */
export interface ComponentProp {
  /** Property name */
  name: string;
  /** Property type */
  type: string;
  /** Required property */
  required?: boolean;
  /** Default value */
  default?: unknown;
  /** Property description */
  description?: string;
}

/**
 * Component event definition
 */
export interface ComponentEvent {
  /** Event name */
  name: string;
  /** Event payload type */
  payload?: string;
  /** Event description */
  description?: string;
}

/**
 * Layout definition for components
 */
export interface LayoutDefinition {
  /** Layout type */
  type: 'stack' | 'grid' | 'flex' | 'absolute';
  /** Layout direction */
  direction?: 'horizontal' | 'vertical';
  /** Layout gap */
  gap?: number;
  /** Layout padding */
  padding?: number;
  /** Layout alignment */
  alignment?: string;
}

/**
 * Styling definition for components
 */
export interface StylingDefinition {
  /** CSS classes */
  classes?: string[];
  /** Inline styles */
  styles?: Record<string, string>;
  /** Theme tokens */
  theme?: Record<string, string>;
}

/**
 * Logic definition for business rules
 */
export interface LogicDefinition {
  /** Logic identifier */
  id: string;
  /** Logic description */
  description: string;
  /** Facts definitions */
  facts?: FactDefinition[];
  /** Events definitions */
  events?: EventDefinition[];
  /** Rules definitions */
  rules?: RuleDefinition[];
  /** Constraints definitions */
  constraints?: LogicConstraint[];
}

/**
 * Fact definition
 */
export interface FactDefinition {
  /** Fact tag */
  tag: string;
  /** Fact payload type */
  payload: Record<string, string>;
  /** Fact description */
  description?: string;
}

/**
 * Event definition
 */
export interface EventDefinition {
  /** Event tag */
  tag: string;
  /** Event payload type */
  payload: Record<string, string>;
  /** Event description */
  description?: string;
}

/**
 * Rule definition
 */
export interface RuleDefinition {
  /** Rule identifier */
  id: string;
  /** Rule description */
  description: string;
  /** Input events */
  on?: string[];
  /** Rule condition */
  when?: string;
  /** Rule action */
  then: string;
  /** Rule priority */
  priority?: number;
}

/**
 * Logic constraint definition
 */
export interface LogicConstraint {
  /** Constraint identifier */
  id: string;
  /** Constraint description */
  description: string;
  /** Constraint check */
  check: string;
  /** Error message */
  message: string;
}

/**
 * Orchestration definition
 */
export interface OrchestrationDefinition {
  /** Orchestration type */
  type: 'dsc' | 'mcp' | 'custom';
  /** Node configurations */
  nodes?: NodeDefinition[];
  /** State synchronization */
  sync?: SyncDefinition;
  /** Health checks */
  health?: HealthDefinition;
}

/**
 * Node definition for orchestration
 */
export interface NodeDefinition {
  /** Node identifier */
  id: string;
  /** Node type */
  type: string;
  /** Node configuration */
  config: Record<string, unknown>;
  /** Node position (x, y coordinates for canvas) */
  x?: number;
  y?: number;
  /** Node props (type-specific properties) */
  props?: Record<string, unknown>;
  /** Node bindings (connections to pluresdb paths) */
  bindings?: NodeBindings;
}

/**
 * Node bindings for pluresdb path connections
 */
export interface NodeBindings {
  /** Output binding to pluresdb path */
  output?: string;
  /** Input binding to pluresdb path */
  input?: string;
  /** Additional custom bindings */
  [key: string]: string | undefined;
}

/**
 * Terminal node specific configuration
 */
export interface TerminalNodeProps {
  /** Input mode: text input or widget-based */
  inputMode: 'text' | 'widget';
  /** Command history */
  history: string[];
  /** Last command output */
  lastOutput: string | null;
}

/**
 * Sync definition for state synchronization
 */
export interface SyncDefinition {
  /** Sync interval in ms */
  interval: number;
  /** Conflict resolution strategy */
  conflictResolution: 'last-write-wins' | 'merge' | 'custom';
  /** Sync targets */
  targets: string[];
}

/**
 * Health check definition
 */
export interface HealthDefinition {
  /** Check interval in ms */
  interval: number;
  /** Health check endpoints */
  endpoints: string[];
  /** Timeout in ms */
  timeout: number;
}

/**
 * Schema validation result
 */
export interface ValidationResult {
  /** Validation success */
  valid: boolean;
  /** Validation errors */
  errors: ValidationError[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Error path in schema */
  path: string;
  /** Error message */
  message: string;
  /** Error code */
  code?: string;
}

/**
 * Validate a Praxis schema
 */
export function validateSchema(schema: PraxisSchema): ValidationResult {
  const errors: ValidationError[] = [];

  // Basic validation
  if (!schema.version) {
    errors.push({ path: 'version', message: 'Schema version is required' });
  }
  if (!schema.name) {
    errors.push({ path: 'name', message: 'Schema name is required' });
  }

  // Validate models
  if (schema.models) {
    schema.models.forEach((model, index) => {
      if (!model.name) {
        errors.push({
          path: `models[${index}].name`,
          message: 'Model name is required',
        });
      }
      if (!model.fields || model.fields.length === 0) {
        errors.push({
          path: `models[${index}].fields`,
          message: 'Model must have at least one field',
        });
      }
    });
  }

  // Validate components
  if (schema.components) {
    schema.components.forEach((component, index) => {
      if (!component.name) {
        errors.push({
          path: `components[${index}].name`,
          message: 'Component name is required',
        });
      }
      if (!component.type) {
        errors.push({
          path: `components[${index}].type`,
          message: 'Component type is required',
        });
      }
    });
  }

  // Validate logic definitions
  if (schema.logic) {
    schema.logic.forEach((logic, logicIndex) => {
      // Validate fact tags
      if (logic.facts) {
        logic.facts.forEach((fact, factIndex) => {
          if (!fact.tag) {
            errors.push({
              path: `logic[${logicIndex}].facts[${factIndex}].tag`,
              message: 'Fact tag is required',
            });
          } else if (!isValidIdentifier(fact.tag)) {
            errors.push({
              path: `logic[${logicIndex}].facts[${factIndex}].tag`,
              message: `Fact tag "${fact.tag}" is not a valid JavaScript identifier. Use only letters, numbers, underscores, and dollar signs, and do not start with a number.`,
            });
          }
        });
      }

      // Validate event tags
      if (logic.events) {
        logic.events.forEach((event, eventIndex) => {
          if (!event.tag) {
            errors.push({
              path: `logic[${logicIndex}].events[${eventIndex}].tag`,
              message: 'Event tag is required',
            });
          } else if (!isValidIdentifier(event.tag)) {
            errors.push({
              path: `logic[${logicIndex}].events[${eventIndex}].tag`,
              message: `Event tag "${event.tag}" is not a valid JavaScript identifier. Use only letters, numbers, underscores, and dollar signs, and do not start with a number.`,
            });
          }
        });
      }
    });
  }

  // Validate orchestration nodes
  if (schema.orchestration?.nodes) {
    schema.orchestration.nodes.forEach((node, index) => {
      if (!node.id) {
        errors.push({
          path: `orchestration.nodes[${index}].id`,
          message: 'Node id is required',
        });
      }
      if (!node.type) {
        errors.push({
          path: `orchestration.nodes[${index}].type`,
          message: 'Node type is required',
        });
      }

      // Validate terminal node specific props
      if (node.type === 'terminal' && node.props) {
        const props = node.props as Partial<TerminalNodeProps>;
        if (props.inputMode && !['text', 'widget'].includes(props.inputMode)) {
          errors.push({
            path: `orchestration.nodes[${index}].props.inputMode`,
            message: 'Terminal node inputMode must be "text" or "widget"',
          });
        }
        if (props.history && !Array.isArray(props.history)) {
          errors.push({
            path: `orchestration.nodes[${index}].props.history`,
            message: 'Terminal node history must be an array',
          });
        }
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a string is a valid JavaScript identifier
 */
function isValidIdentifier(str: string): boolean {
  // JavaScript identifier must start with letter, $, or _
  // and can contain letters, digits, $, or _
  const identifierRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

  // Also check that it's not a reserved keyword
  const reservedKeywords = [
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
  ];

  return identifierRegex.test(str) && !reservedKeywords.includes(str);
}

/**
 * Create a basic schema template
 */
export function createSchemaTemplate(name: string): PraxisSchema {
  return {
    version: '1.0.0',
    name,
    description: `Schema for ${name}`,
    models: [],
    components: [],
    logic: [],
  };
}
