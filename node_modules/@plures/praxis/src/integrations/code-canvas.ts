/**
 * CodeCanvas Integration
 *
 * Integration with plures/code-canvas - A visual schema editor and FSM enforcement tool.
 * Provides visual editing capabilities for Praxis schemas and logic flows.
 *
 * Features:
 * - Visual Schema Editor: Drag-and-drop interface for schema design
 * - FSM Visualization: Mermaid and DOT graph generation
 * - State Lifecycle Management: Activity tracking and validation
 * - Canvas Export/Import: YAML and JSON Canvas formats
 * - Guardian Integration: Pre-commit validation and rules enforcement
 *
 * @see https://github.com/plures/code-canvas
 */

import type {
  PSFSchema,
  PSFModel,
  PSFComponent,
  PSFFact,
  PSFEvent,
  PSFRule,
  PSFConstraint,
  PSFFlow,
} from '../../core/schema-engine/psf.js';

/**
 * Canvas node representing a visual element
 */
export interface CanvasNode {
  /** Unique node identifier */
  id: string;
  /** Node type */
  type: 'model' | 'component' | 'event' | 'fact' | 'rule' | 'constraint' | 'state' | 'transition';
  /** Node label/name */
  label: string;
  /** X position */
  x: number;
  /** Y position */
  y: number;
  /** Width */
  width: number;
  /** Height */
  height: number;
  /** Node data (model, component, etc.) */
  data?: unknown;
  /** Node style */
  style?: CanvasNodeStyle;
  /** FSM state reference */
  fsmState?: string;
}

/**
 * Canvas edge representing a connection between nodes
 */
export interface CanvasEdge {
  /** Unique edge identifier */
  id: string;
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Edge label */
  label?: string;
  /** Edge type */
  type?: 'dependency' | 'transition' | 'trigger' | 'reference' | 'event';
  /** Edge style */
  style?: CanvasEdgeStyle;
}

/**
 * Node style configuration
 */
export interface CanvasNodeStyle {
  /** Background color */
  backgroundColor?: string;
  /** Border color */
  borderColor?: string;
  /** Border width */
  borderWidth?: number;
  /** Text color */
  textColor?: string;
  /** Font size */
  fontSize?: number;
  /** Border radius */
  borderRadius?: number;
}

/**
 * Edge style configuration
 */
export interface CanvasEdgeStyle {
  /** Stroke color */
  strokeColor?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Stroke style */
  strokeDasharray?: string;
  /** Arrow type */
  arrowType?: 'arrow' | 'none' | 'circle';
}

/**
 * Canvas document containing nodes and edges
 */
export interface CanvasDocument {
  /** Document identifier */
  id: string;
  /** Document name */
  name: string;
  /** Document version */
  version: string;
  /** All nodes in the canvas */
  nodes: CanvasNode[];
  /** All edges in the canvas */
  edges: CanvasEdge[];
  /** Logic flows */
  flows?: PSFFlow[];
  /** Document metadata */
  metadata?: {
    created: number;
    modified: number;
    author?: string;
    description?: string;
  };
  /** Viewport settings */
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

/**
 * FSM lifecycle state
 */
export interface LifecycleState {
  /** State identifier */
  id: string;
  /** State name */
  name: string;
  /** State description */
  description?: string;
  /** Allowed transitions from this state */
  transitions: string[];
  /** Entry actions */
  onEntry?: string[];
  /** Exit actions */
  onExit?: string[];
  /** Is this an initial state */
  initial?: boolean;
  /** Is this a final state */
  final?: boolean;
}

/**
 * Activity tracking for current work context
 */
export interface ActivityState {
  /** Current activity type */
  activity: 'designing' | 'implementing' | 'testing' | 'documenting' | 'reviewing';
  /** Actor performing the activity */
  actor: string;
  /** Current intent/goal */
  intent?: string;
  /** Started timestamp */
  startedAt: number;
  /** Allowed file patterns for this activity */
  allowedPaths?: string[];
}

/**
 * Canvas editor configuration
 */
export interface CanvasEditorConfig {
  /** Canvas document to edit */
  document?: CanvasDocument;
  /** Schema to visualize */
  schema?: PSFSchema;
  /** Enable FSM validation */
  enableFSM?: boolean;
  /** Custom node styles by type */
  nodeStyles?: Record<string, CanvasNodeStyle>;
  /** Custom edge styles by type */
  edgeStyles?: Record<string, CanvasEdgeStyle>;
  /** Auto-layout algorithm */
  layout?: 'hierarchical' | 'force' | 'grid' | 'circular';
}

/**
 * Guardian validation result
 */
export interface GuardianResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors */
  errors: GuardianError[];
  /** Validation warnings */
  warnings: GuardianWarning[];
  /** Files validated */
  filesChecked: string[];
  /** Current activity state */
  activity?: ActivityState;
}

/**
 * Guardian validation error
 */
export interface GuardianError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** File path (if applicable) */
  file?: string;
  /** Line number (if applicable) */
  line?: number;
  /** Rule that was violated */
  rule?: string;
}

/**
 * Guardian validation warning
 */
export interface GuardianWarning {
  /** Warning code */
  code: string;
  /** Warning message */
  message: string;
  /** File path (if applicable) */
  file?: string;
  /** Suggestion for resolution */
  suggestion?: string;
}

/**
 * Create a canvas document from a Praxis schema
 *
 * @example
 * ```typescript
 * import { schemaToCanvas } from '@plures/praxis/integrations/code-canvas';
 *
 * const canvas = schemaToCanvas(mySchema, {
 *   layout: 'hierarchical',
 * });
 *
 * // Export to YAML
 * const yaml = canvasToYaml(canvas);
 * ```
 */
export function schemaToCanvas(
  schema: PSFSchema,
  _options: { layout?: 'hierarchical' | 'force' | 'grid' | 'circular' } = {}
): CanvasDocument {
  // Note: layout option reserved for future auto-layout implementation
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];
  let nodeId = 0;
  let yOffset = 0;
  const xSpacing = 200;
  const ySpacing = 100;

  // Add model nodes
  if (schema.models) {
    schema.models.forEach((model: PSFModel, index: number) => {
      const pos =
        model.position && (model.position.x !== 0 || model.position.y !== 0)
          ? model.position
          : { x: 50, y: yOffset + index * ySpacing };

      const node: CanvasNode = {
        id: model.id || `model-${nodeId++}`,
        type: 'model',
        label: model.name,
        x: pos.x,
        y: pos.y,
        width: 150,
        height: 60,
        data: model,
        style: {
          backgroundColor: '#e3f2fd',
          borderColor: '#1976d2',
        },
      };
      nodes.push(node);
    });
    yOffset += schema.models.length * ySpacing + 50;
  }

  // Add component nodes
  if (schema.components) {
    schema.components.forEach((component: PSFComponent, index: number) => {
      const pos =
        component.position && (component.position.x !== 0 || component.position.y !== 0)
          ? component.position
          : { x: 50 + xSpacing, y: yOffset + index * ySpacing };

      const node: CanvasNode = {
        id: component.id || `component-${nodeId++}`,
        type: 'component',
        label: component.name,
        x: pos.x,
        y: pos.y,
        width: 150,
        height: 60,
        data: component,
        style: {
          backgroundColor: '#e8f5e9',
          borderColor: '#388e3c',
        },
      };
      nodes.push(node);

      // Add edges for component-model relationships
      if (component.model) {
        const modelNode = nodes.find((n) => n.type === 'model' && n.label === component.model);
        if (modelNode) {
          edges.push({
            id: `edge-${edges.length}`,
            source: node.id,
            target: modelNode.id,
            type: 'reference',
            label: 'uses',
          });
        }
      }
    });
    yOffset += schema.components.length * ySpacing + 50;
  }

  // Add events
  if (schema.events) {
    schema.events.forEach((event: PSFEvent, index: number) => {
      const pos =
        event.position && (event.position.x !== 0 || event.position.y !== 0)
          ? event.position
          : { x: 50 + xSpacing * 2, y: yOffset + index * ySpacing };

      const node: CanvasNode = {
        id: event.id || `event-${nodeId++}`,
        type: 'event',
        label: event.tag,
        x: pos.x,
        y: pos.y,
        width: 150,
        height: 50,
        data: event,
        style: {
          backgroundColor: '#fff3e0',
          borderColor: '#f57c00',
        },
      };
      nodes.push(node);
    });
    yOffset += schema.events.length * ySpacing + 30;
  }

  // Add facts
  if (schema.facts) {
    schema.facts.forEach((fact: PSFFact, index: number) => {
      const pos =
        fact.position && (fact.position.x !== 0 || fact.position.y !== 0)
          ? fact.position
          : { x: 50 + xSpacing * 3, y: yOffset + index * ySpacing };

      const node: CanvasNode = {
        id: fact.id || `fact-${nodeId++}`,
        type: 'fact',
        label: fact.tag,
        x: pos.x,
        y: pos.y,
        width: 150,
        height: 50,
        data: fact,
        style: {
          backgroundColor: '#fce4ec',
          borderColor: '#c2185b',
        },
      };
      nodes.push(node);
    });
    yOffset += schema.facts.length * ySpacing + 30;
  }

  // Add rules
  if (schema.rules) {
    schema.rules.forEach((rule: PSFRule, index: number) => {
      const pos =
        rule.position && (rule.position.x !== 0 || rule.position.y !== 0)
          ? rule.position
          : { x: 50 + xSpacing * 4, y: yOffset + index * ySpacing };

      const node: CanvasNode = {
        id: rule.id || `rule-${nodeId++}`,
        type: 'rule',
        label: rule.id,
        x: pos.x,
        y: pos.y,
        width: 150,
        height: 50,
        data: rule,
        style: {
          backgroundColor: '#e1f5fe',
          borderColor: '#0288d1',
        },
      };
      nodes.push(node);

      // Add edges for rule triggers
      if (rule.triggers) {
        rule.triggers.forEach((trigger: string) => {
          const eventNode = nodes.find((n) => n.type === 'event' && n.label === trigger);
          if (eventNode) {
            edges.push({
              id: `edge-${edges.length}`,
              source: eventNode.id,
              target: node.id,
              type: 'event',
              label: 'triggers',
            });
          }
        });
      }
    });
    yOffset += schema.rules.length * ySpacing + 30;
  }

  // Add constraints
  if (schema.constraints) {
    schema.constraints.forEach((constraint: PSFConstraint, index: number) => {
      const pos =
        constraint.position && (constraint.position.x !== 0 || constraint.position.y !== 0)
          ? constraint.position
          : { x: 50 + xSpacing * 5, y: yOffset + index * ySpacing };

      const node: CanvasNode = {
        id: constraint.id || `constraint-${nodeId++}`,
        type: 'constraint',
        label: constraint.id,
        x: pos.x,
        y: pos.y,
        width: 150,
        height: 50,
        data: constraint,
        style: {
          backgroundColor: '#ffebee',
          borderColor: '#c62828',
        },
      };
      nodes.push(node);
    });
  }

  return {
    id: `canvas-${Date.now()}`,
    name: schema.name || 'Praxis Schema',
    version: schema.$version || '1.0.0',
    nodes,
    edges,
    flows: schema.flows || [],
    metadata: {
      created: Date.now(),
      modified: Date.now(),
      description: schema.description,
    },
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

/**
 * Convert a canvas document back to a Praxis schema
 */
export function canvasToSchema(canvas: CanvasDocument): PSFSchema {
  const models: PSFModel[] = [];
  const components: PSFComponent[] = [];
  const events: PSFEvent[] = [];
  const facts: PSFFact[] = [];
  const rules: PSFRule[] = [];
  const constraints: PSFConstraint[] = [];

  for (const node of canvas.nodes) {
    const position = { x: node.x, y: node.y };

    switch (node.type) {
      case 'model':
        if (node.data) {
          models.push({ ...(node.data as PSFModel), position });
        }
        break;
      case 'component':
        if (node.data) {
          components.push({ ...(node.data as PSFComponent), position });
        }
        break;
      case 'event':
        if (node.data) {
          events.push({ ...(node.data as PSFEvent), position });
        }
        break;
      case 'fact':
        if (node.data) {
          facts.push({ ...(node.data as PSFFact), position });
        }
        break;
      case 'rule':
        if (node.data) {
          rules.push({ ...(node.data as PSFRule), position });
        }
        break;
      case 'constraint':
        if (node.data) {
          constraints.push({ ...(node.data as PSFConstraint), position });
        }
        break;
    }
  }

  return {
    $version: '1.0.0',
    id: canvas.id,
    name: canvas.name,
    description: canvas.metadata?.description,
    models,
    components,
    events,
    facts,
    rules,
    constraints,
    flows: canvas.flows || [],
    metadata: canvas.metadata,
  };
}

/**
 * Export canvas to YAML format (compatible with Obsidian Canvas)
 */
export function canvasToYaml(canvas: CanvasDocument): string {
  const lines: string[] = [
    `# ${canvas.name}`,
    `# Generated by Praxis CodeCanvas Integration`,
    `# Version: ${canvas.version}`,
    '',
    'nodes:',
  ];

  for (const node of canvas.nodes) {
    lines.push(`  - id: "${node.id}"`);
    lines.push(`    type: "${node.type}"`);
    lines.push(`    label: "${node.label}"`);
    lines.push(`    x: ${node.x}`);
    lines.push(`    y: ${node.y}`);
    lines.push(`    width: ${node.width}`);
    lines.push(`    height: ${node.height}`);
    if (node.fsmState) {
      lines.push(`    fsmState: "${node.fsmState}"`);
    }
    lines.push('');
  }

  lines.push('edges:');
  for (const edge of canvas.edges) {
    lines.push(`  - id: "${edge.id}"`);
    lines.push(`    source: "${edge.source}"`);
    lines.push(`    target: "${edge.target}"`);
    if (edge.label) {
      lines.push(`    label: "${edge.label}"`);
    }
    if (edge.type) {
      lines.push(`    type: "${edge.type}"`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Export canvas to Mermaid diagram format
 */
export function canvasToMermaid(canvas: CanvasDocument): string {
  const lines: string[] = ['graph TD'];

  // Add node definitions with styling
  for (const node of canvas.nodes) {
    let shape: string;
    switch (node.type) {
      case 'model':
        shape = `[${node.label}]`;
        break;
      case 'component':
        shape = `(${node.label})`;
        break;
      case 'event':
        shape = `{{${node.label}}}`;
        break;
      case 'fact':
        shape = `((${node.label}))`;
        break;
      case 'rule':
        shape = `[/${node.label}/]`;
        break;
      case 'constraint':
        shape = `[\\${node.label}\\]`;
        break;
      default:
        shape = `[${node.label}]`;
    }
    lines.push(`    ${node.id}${shape}`);
  }

  lines.push('');

  // Add edges
  for (const edge of canvas.edges) {
    const label = edge.label ? `|${edge.label}|` : '';
    lines.push(`    ${edge.source} -->${label} ${edge.target}`);
  }

  return lines.join('\n');
}

/**
 * Validate files against FSM lifecycle rules
 *
 * This provides integration with the CodeCanvas Guardian for pre-commit validation.
 */
export function validateWithGuardian(
  files: string[],
  activity: ActivityState,
  lifecycle: LifecycleState[]
): GuardianResult {
  const errors: GuardianError[] = [];
  const warnings: GuardianWarning[] = [];

  // Check if activity is in a valid state
  const currentState = lifecycle.find((s) => s.id === activity.activity);
  if (!currentState) {
    errors.push({
      code: 'INVALID_ACTIVITY',
      message: `Activity "${activity.activity}" is not a valid lifecycle state`,
      rule: 'lifecycle-state',
    });
  }

  // Validate file access based on allowed paths
  if (activity.allowedPaths) {
    for (const file of files) {
      const allowed = activity.allowedPaths.some((pattern) => {
        // Simple glob matching
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(file);
      });

      if (!allowed) {
        errors.push({
          code: 'PATH_NOT_ALLOWED',
          message: `File "${file}" is not allowed during "${activity.activity}" activity`,
          file,
          rule: 'allowed-paths',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    filesChecked: files,
    activity,
  };
}

/**
 * Create a CodeCanvas editor instance
 *
 * Note: This is a placeholder for the visual editor integration.
 * The actual visual editor requires a browser environment.
 */
export function createCanvasEditor(config: CanvasEditorConfig): {
  document: CanvasDocument;
  addNode: (node: Omit<CanvasNode, 'id'>) => CanvasNode;
  removeNode: (id: string) => void;
  addEdge: (edge: Omit<CanvasEdge, 'id'>) => CanvasEdge;
  removeEdge: (id: string) => void;
  toSchema: () => PSFSchema;
  toYaml: () => string;
  toMermaid: () => string;
} {
  const document =
    config.document ||
    (config.schema
      ? schemaToCanvas(config.schema, { layout: config.layout })
      : {
          id: `canvas-${Date.now()}`,
          name: 'New Canvas',
          version: '1.0.0',
          nodes: [],
          edges: [],
          metadata: { created: Date.now(), modified: Date.now() },
          viewport: { x: 0, y: 0, zoom: 1 },
        });

  let nodeIdCounter = document.nodes.length;
  let edgeIdCounter = document.edges.length;

  return {
    document,

    addNode(node: Omit<CanvasNode, 'id'>): CanvasNode {
      const fullNode: CanvasNode = {
        ...node,
        id: `node-${nodeIdCounter++}`,
      };
      document.nodes.push(fullNode);
      document.metadata!.modified = Date.now();
      return fullNode;
    },

    removeNode(id: string): void {
      const index = document.nodes.findIndex((n) => n.id === id);
      if (index !== -1) {
        document.nodes.splice(index, 1);
        // Also remove connected edges
        document.edges = document.edges.filter((e) => e.source !== id && e.target !== id);
        document.metadata!.modified = Date.now();
      }
    },

    addEdge(edge: Omit<CanvasEdge, 'id'>): CanvasEdge {
      const fullEdge: CanvasEdge = {
        ...edge,
        id: `edge-${edgeIdCounter++}`,
      };
      document.edges.push(fullEdge);
      document.metadata!.modified = Date.now();
      return fullEdge;
    },

    removeEdge(id: string): void {
      const index = document.edges.findIndex((e) => e.id === id);
      if (index !== -1) {
        document.edges.splice(index, 1);
        document.metadata!.modified = Date.now();
      }
    },

    toSchema(): PSFSchema {
      return canvasToSchema(document);
    },

    toYaml(): string {
      return canvasToYaml(document);
    },

    toMermaid(): string {
      return canvasToMermaid(document);
    },
  };
}
