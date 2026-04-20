/**
 * Praxis Schema Format (PSF) Types
 *
 * PSF is the canonical AST format that serves as the single source of truth.
 * All code, canvas, and documentation are derived from or synchronized with PSF.
 *
 * Design principles:
 * - JSON-serializable for persistence and transmission
 * - Supports bidirectional code ↔ canvas sync
 * - Complete representation of all Praxis concepts
 * - Extensible with metadata and custom properties
 */

/**
 * PSF Schema version
 */
export const PSF_VERSION = '1.0.0' as const;

/**
 * Root PSF Schema Document
 */
export interface PSFSchema {
  /** PSF format version */
  $version: typeof PSF_VERSION;
  /** Schema identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description?: string;
  /** Creation timestamp */
  createdAt?: string;
  /** Last modified timestamp */
  modifiedAt?: string;
  /** Facts defined in this schema */
  facts: PSFFact[];
  /** Events defined in this schema */
  events: PSFEvent[];
  /** Rules defined in this schema */
  rules: PSFRule[];
  /** Constraints defined in this schema */
  constraints: PSFConstraint[];
  /** Data models */
  models: PSFModel[];
  /** UI Components */
  components: PSFComponent[];
  /** Flows/Orchestrations */
  flows: PSFFlow[];
  /** Documentation metadata */
  docs?: PSFDocs;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Canvas layout information for visual editing */
  canvas?: PSFCanvasLayout;
}

/**
 * PSF Fact Definition
 */
export interface PSFFact {
  /** Unique identifier */
  id: string;
  /** Fact tag (for type discrimination) */
  tag: string;
  /** Description */
  description?: string;
  /** Payload schema */
  payload: PSFPayloadSchema;
  /** Documentation hints */
  docs?: PSFDocsHint;
  /** Canvas position */
  position?: PSFPosition;
  /** Metadata */
  meta?: Record<string, unknown>;
}

/**
 * PSF Event Definition
 */
export interface PSFEvent {
  /** Unique identifier */
  id: string;
  /** Event tag (for type discrimination) */
  tag: string;
  /** Description */
  description?: string;
  /** Payload schema */
  payload: PSFPayloadSchema;
  /** Documentation hints */
  docs?: PSFDocsHint;
  /** Canvas position */
  position?: PSFPosition;
  /** Metadata */
  meta?: Record<string, unknown>;
}

/**
 * PSF Rule Definition
 */
export interface PSFRule {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name?: string;
  /** Description */
  description: string;
  /** Events that trigger this rule */
  triggers?: string[];
  /** Condition expression (DSL or reference) */
  when?: PSFExpression;
  /** Action expression (DSL or reference) */
  then: PSFExpression;
  /** Priority (higher executes first) */
  priority?: number;
  /** Documentation hints */
  docs?: PSFDocsHint;
  /** Canvas position */
  position?: PSFPosition;
  /** Metadata */
  meta?: Record<string, unknown>;
}

/**
 * PSF Constraint Definition
 */
export interface PSFConstraint {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name?: string;
  /** Description */
  description: string;
  /** Check expression */
  check: PSFExpression;
  /** Error message when violated */
  errorMessage: string;
  /** Severity level */
  severity?: 'error' | 'warning' | 'info';
  /** Documentation hints */
  docs?: PSFDocsHint;
  /** Canvas position */
  position?: PSFPosition;
  /** Metadata */
  meta?: Record<string, unknown>;
}

/**
 * PSF Data Model
 */
export interface PSFModel {
  /** Unique identifier */
  id: string;
  /** Model name */
  name: string;
  /** Description */
  description?: string;
  /** Fields */
  fields: PSFField[];
  /** Relationships to other models */
  relationships?: PSFRelationship[];
  /** Indexes */
  indexes?: PSFIndex[];
  /** Model-level constraints */
  constraints?: PSFModelConstraint[];
  /** Documentation hints */
  docs?: PSFDocsHint;
  /** Canvas position */
  position?: PSFPosition;
  /** Metadata */
  meta?: Record<string, unknown>;
}

/**
 * PSF Model Field
 */
export interface PSFField {
  /** Field name */
  name: string;
  /** Field type */
  type: PSFFieldType;
  /** Is optional */
  optional?: boolean;
  /** Default value */
  default?: unknown;
  /** Description */
  description?: string;
  /** Validation rules */
  validation?: PSFValidation[];
  /** UI hints for form generation */
  ui?: PSFUIHint;
}

/**
 * PSF Field Type
 */
export type PSFFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'uuid'
  | { array: PSFFieldType }
  | { object: Record<string, PSFField> }
  | { reference: string }
  | { enum: string[] }
  | { union: PSFFieldType[] };

/**
 * PSF Validation Rule
 */
export interface PSFValidation {
  /** Validation type */
  type:
    | 'required'
    | 'min'
    | 'max'
    | 'minLength'
    | 'maxLength'
    | 'pattern'
    | 'email'
    | 'url'
    | 'custom';
  /** Validation value */
  value?: unknown;
  /** Error message */
  message?: string;
}

/**
 * PSF Model Constraint
 */
export interface PSFModelConstraint {
  /** Constraint identifier */
  id: string;
  /** Constraint type */
  type: 'unique' | 'check' | 'foreign_key';
  /** Fields involved */
  fields: string[];
  /** Description */
  description?: string;
  /** Additional options */
  options?: Record<string, unknown>;
}

/**
 * PSF Relationship
 */
export interface PSFRelationship {
  /** Relationship name */
  name: string;
  /** Relationship type */
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  /** Target model */
  target: string;
  /** Foreign key field */
  foreignKey?: string;
  /** Cascade behavior */
  cascade?: boolean;
}

/**
 * PSF Index
 */
export interface PSFIndex {
  /** Index name */
  name: string;
  /** Fields to index */
  fields: string[];
  /** Is unique index */
  unique?: boolean;
  /** Index type */
  type?: 'btree' | 'hash' | 'fulltext';
}

/**
 * PSF Component Definition
 */
export interface PSFComponent {
  /** Unique identifier */
  id: string;
  /** Component name */
  name: string;
  /** Component type */
  type: 'form' | 'display' | 'list' | 'navigation' | 'editor' | 'custom';
  /** Description */
  description?: string;
  /** Bound model */
  model?: string;
  /** Component properties */
  props: PSFComponentProp[];
  /** Component events */
  events: PSFComponentEvent[];
  /** Layout configuration */
  layout?: PSFLayout;
  /** Styling configuration */
  styling?: PSFStyling;
  /** Documentation hints */
  docs?: PSFDocsHint;
  /** Canvas position */
  position?: PSFPosition;
  /** Metadata */
  meta?: Record<string, unknown>;
}

/**
 * PSF Component Property
 */
export interface PSFComponentProp {
  /** Property name */
  name: string;
  /** Property type */
  type: string;
  /** Is required */
  required?: boolean;
  /** Default value */
  default?: unknown;
  /** Description */
  description?: string;
  /** Binding expression */
  binding?: PSFExpression;
}

/**
 * PSF Component Event
 */
export interface PSFComponentEvent {
  /** Event name */
  name: string;
  /** Payload type */
  payload?: string;
  /** Description */
  description?: string;
  /** Handler expression */
  handler?: PSFExpression;
}

/**
 * PSF Layout Configuration
 */
export interface PSFLayout {
  /** Layout type */
  type: 'stack' | 'grid' | 'flex' | 'absolute';
  /** Direction */
  direction?: 'horizontal' | 'vertical';
  /** Gap between items */
  gap?: number | string;
  /** Padding */
  padding?: number | string;
  /** Alignment */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** Justify */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
}

/**
 * PSF Styling Configuration
 */
export interface PSFStyling {
  /** CSS classes */
  classes?: string[];
  /** Inline styles */
  styles?: Record<string, string>;
  /** Theme tokens */
  theme?: Record<string, string>;
  /** Variant */
  variant?: string;
}

/**
 * PSF Flow/Orchestration
 */
export interface PSFFlow {
  /** Unique identifier */
  id: string;
  /** Flow name */
  name: string;
  /** Description */
  description?: string;
  /** Flow type */
  type: 'sequence' | 'parallel' | 'state-machine' | 'saga';
  /** Flow steps */
  steps: PSFFlowStep[];
  /** Initial state/step */
  initial?: string;
  /** Error handling */
  errorHandling?: PSFErrorHandling;
  /** Documentation hints */
  docs?: PSFDocsHint;
  /** Canvas position */
  position?: PSFPosition;
  /** Metadata */
  meta?: Record<string, unknown>;
}

/**
 * PSF Flow Step
 */
export interface PSFFlowStep {
  /** Step identifier */
  id: string;
  /** Step name */
  name?: string;
  /** Step type */
  type: 'action' | 'condition' | 'wait' | 'parallel' | 'terminal';
  /** Action expression */
  action?: PSFExpression;
  /** Condition expression */
  condition?: PSFExpression;
  /** Next step(s) */
  next?: string | { [key: string]: string };
  /** Timeout in milliseconds */
  timeout?: number;
  /** Retry configuration */
  retry?: PSFRetry;
}

/**
 * PSF Retry Configuration
 */
export interface PSFRetry {
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Delay between retries (ms) */
  delay: number;
  /** Exponential backoff factor */
  backoff?: number;
}

/**
 * PSF Error Handling
 */
export interface PSFErrorHandling {
  /** Global error handler */
  handler?: PSFExpression;
  /** Compensation flow */
  compensation?: string;
  /** Error policy */
  policy: 'fail-fast' | 'continue' | 'compensate';
}

/**
 * PSF Documentation
 */
export interface PSFDocs {
  /** Overview */
  overview?: string;
  /** Getting started guide */
  gettingStarted?: string;
  /** Examples */
  examples?: PSFExample[];
  /** Additional sections */
  sections?: PSFDocSection[];
  /** API documentation configuration */
  api?: PSFAPIDoc;
}

/**
 * PSF Documentation Hint (for individual elements)
 */
export interface PSFDocsHint {
  /** Brief summary */
  summary?: string;
  /** Detailed description */
  details?: string;
  /** Examples */
  examples?: string[];
  /** See also references */
  seeAlso?: string[];
  /** Tags for categorization */
  tags?: string[];
  /** Deprecation notice */
  deprecated?: string | boolean;
}

/**
 * PSF Example
 */
export interface PSFExample {
  /** Example name */
  name: string;
  /** Description */
  description?: string;
  /** Code snippet */
  code: string;
  /** Language */
  language?: string;
}

/**
 * PSF Documentation Section
 */
export interface PSFDocSection {
  /** Section title */
  title: string;
  /** Section content (markdown) */
  content: string;
  /** Subsections */
  children?: PSFDocSection[];
}

/**
 * PSF API Documentation Configuration
 */
export interface PSFAPIDoc {
  /** Generate API docs */
  generate?: boolean;
  /** Output format */
  format?: 'markdown' | 'html' | 'json';
  /** Include private members */
  includePrivate?: boolean;
}

/**
 * PSF Expression (can be inline or reference)
 */
export type PSFExpression =
  | { inline: string; language?: 'typescript' | 'javascript' }
  | { ref: string };

/**
 * PSF Position (for canvas layout)
 */
export interface PSFPosition {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Width (optional) */
  width?: number;
  /** Height (optional) */
  height?: number;
}

/**
 * PSF UI Hint (for form generation)
 */
export interface PSFUIHint {
  /** Display label */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Help text */
  help?: string;
  /** Input type override */
  inputType?: string;
  /** Component to use */
  component?: string;
  /** Hidden from UI */
  hidden?: boolean;
  /** Read-only */
  readonly?: boolean;
  /** Display order */
  order?: number;
}

/**
 * PSF Payload Schema
 */
export interface PSFPayloadSchema {
  /** Schema type (usually 'object') */
  type: 'object';
  /** Properties */
  properties: Record<string, PSFPropertySchema>;
  /** Required properties */
  required?: string[];
}

/**
 * PSF Property Schema
 */
export interface PSFPropertySchema {
  /** Property type */
  type: PSFFieldType | 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** Description */
  description?: string;
  /** Default value */
  default?: unknown;
  /** Array items schema */
  items?: PSFPropertySchema;
  /** Nested properties (for object type) */
  properties?: Record<string, PSFPropertySchema>;
}

/**
 * PSF Canvas Layout (for visual editor)
 */
export interface PSFCanvasLayout {
  /** Viewport settings */
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  /** Grid settings */
  grid?: {
    enabled: boolean;
    size: number;
    snap: boolean;
  };
  /** Node groups */
  groups?: PSFCanvasGroup[];
  /** Connections between nodes */
  connections?: PSFCanvasConnection[];
}

/**
 * PSF Canvas Group
 */
export interface PSFCanvasGroup {
  /** Group identifier */
  id: string;
  /** Group name */
  name: string;
  /** Color */
  color?: string;
  /** Collapsed state */
  collapsed?: boolean;
  /** Position */
  position: PSFPosition;
  /** Member node IDs */
  members: string[];
}

/**
 * PSF Canvas Connection
 */
export interface PSFCanvasConnection {
  /** Connection identifier */
  id: string;
  /** Source node ID */
  source: string;
  /** Source port */
  sourcePort?: string;
  /** Target node ID */
  target: string;
  /** Target port */
  targetPort?: string;
  /** Connection type */
  type?: 'data' | 'control' | 'event';
  /** Label */
  label?: string;
}

/**
 * Create an empty PSF Schema
 */
export function createEmptyPSFSchema(id: string, name: string): PSFSchema {
  return {
    $version: PSF_VERSION,
    id,
    name,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    facts: [],
    events: [],
    rules: [],
    constraints: [],
    models: [],
    components: [],
    flows: [],
    docs: {},
  };
}

/**
 * Generate a unique ID for PSF elements
 */
export function generatePSFId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}
