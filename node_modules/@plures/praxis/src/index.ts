/**
 * Praxis - Practical, Provable Application Logic
 *
 * A typed, functional application logic engine built on strong types.
 *
 * Core concepts:
 * - Facts: typed propositions about the domain
 * - Events: temporally ordered facts meant to drive change
 * - Rules: pure functions that derive new facts from context + events
 * - Constraints: invariants that must always hold
 * - Flows: orchestrated behaviors
 * - Actors: effectful units that perform side effects
 *
 * @example
 * ```typescript
 * import { createPraxisEngine, PraxisRegistry, defineFact, defineEvent, defineRule } from "@plures/praxis";
 *
 * // Define facts and events
 * const UserLoggedIn = defineFact<"UserLoggedIn", { userId: string }>("UserLoggedIn");
 * const Login = defineEvent<"LOGIN", { username: string }>("LOGIN");
 *
 * // Define rules
 * const loginRule = defineRule({
 *   id: "auth.login",
 *   description: "Process login event",
 *   impl: (state, events) => {
 *     const loginEvent = events.find(Login.is);
 *     if (loginEvent) {
 *       return [UserLoggedIn.create({ userId: loginEvent.payload.username })];
 *     }
 *     return [];
 *   }
 * });
 *
 * // Create engine
 * const registry = new PraxisRegistry();
 * registry.registerRule(loginRule);
 *
 * const engine = createPraxisEngine({
 *   initialContext: {},
 *   registry
 * });
 *
 * // Dispatch events
 * const result = engine.step([Login.create({ username: "alice" })]);
 * console.log(result.state.facts); // [{ tag: "UserLoggedIn", payload: { userId: "alice" } }]
 * ```
 */

// Core protocol (language-neutral types)
export type {
  PraxisFact,
  PraxisEvent,
  PraxisState,
  PraxisDiagnostics,
  PraxisStepConfig,
  PraxisStepResult,
  PraxisStepFn,
} from './core/protocol.js';
export { PRAXIS_PROTOCOL_VERSION } from './core/protocol.js';

// Rules and constraints
export type {
  RuleId,
  ConstraintId,
  RuleFn,
  ConstraintFn,
  RuleDescriptor,
  ConstraintDescriptor,
  PraxisModule,
} from './core/rules.js';
export { PraxisRegistry } from './core/rules.js';

// Engine
export type { PraxisEngineOptions } from './core/engine.js';
export { LogicEngine, createPraxisEngine } from './core/engine.js';
export * from './core/reactive-engine.svelte.js';

// Framework-agnostic Reactive Engine
export {
  ReactiveLogicEngine as FrameworkAgnosticReactiveEngine,
  createReactiveEngine as createFrameworkAgnosticReactiveEngine,
  type ReactiveEngineOptions as FrameworkAgnosticReactiveEngineOptions,
  type StateChangeCallback,
} from './core/reactive-engine.js';

// Actors
export type { Actor } from './core/actors.js';
export { ActorManager, createTimerActor } from './core/actors.js';

// Introspection
export type {
  RuleNode,
  ConstraintNode,
  GraphEdge,
  RegistryGraph,
  RuleSchema,
  ConstraintSchema,
  RegistrySchema,
  RegistryStats,
} from './core/introspection.js';
export { RegistryIntrospector, createIntrospector } from './core/introspection.js';

// DSL helpers
export {
  defineFact,
  defineEvent,
  defineRule,
  defineConstraint,
  defineModule,
  filterEvents,
  filterFacts,
  findEvent,
  findFact,
} from './dsl/index.js';
export type {
  FactDefinition,
  EventDefinition,
  DefineRuleOptions,
  DefineConstraintOptions,
  DefineModuleOptions,
} from './dsl/index.js';

// Terminal Node Runtime
export type {
  TerminalExecutionResult,
  TerminalNodeState,
  TerminalAdapterOptions,
  CommandExecutor,
} from './runtime/terminal-adapter.js';
export {
  TerminalAdapter,
  createTerminalAdapter,
  runTerminalCommand,
  createMockExecutor,
} from './runtime/terminal-adapter.js';

// Schema Types (including Terminal Node types)
export type {
  PraxisSchema,
  NodeDefinition,
  NodeBindings,
  TerminalNodeProps,
  OrchestrationDefinition,
  ValidationResult,
  ValidationError,
  ModelDefinition,
  ComponentDefinition,
  LogicDefinition,
} from './core/schema/types.js';
export { validateSchema, createSchemaTemplate } from './core/schema/types.js';

// Schema Loader (supports JSON, YAML, and TS)
export type { LoaderOptions, LoaderResult } from './core/schema/loader.js';
export {
  loadSchema,
  loadSchemaFromJson,
  loadSchemaFromYaml,
  loadSchemaFromFile,
  validateForGeneration,
} from './core/schema/loader.js';

// PluresDB Integration
export type {
  PraxisDB,
  UnsubscribeFn,
  PluresDBInstance,
  PluresDBAdapterConfig,
  EventStreamEntry,
  PraxisDBStoreOptions,
  StoredSchema,
  PluresDBGeneratorOptions,
  GeneratedPluresDBFile,
  PluresDBAdapter,
  PluresDBAdapterOptions,
} from './integrations/pluresdb.js';
export {
  InMemoryPraxisDB,
  createInMemoryDB,
  PluresDBPraxisAdapter,
  createPluresDB,
  PraxisDBStore,
  createPraxisDBStore,
  PRAXIS_PATHS,
  getFactPath,
  getEventPath,
  generateId,
  PraxisSchemaRegistry,
  createSchemaRegistry,
  registerSchema,
  getSchemaPath,
  PluresDBGenerator,
  createPluresDBGenerator,
  createPluresDBAdapter,
  attachToEngine,
} from './integrations/pluresdb.js';

// Unum Integration (Identity & Channels)
export type {
  UnumStore,
  UnumChannel,
  UnumMessage,
  UnumIdentity,
  UnumAdapterConfig,
  UnumAdapter,
} from './integrations/unum.js';
export { createUnumAdapter, attachUnumToEngine } from './integrations/unum.js';

// CodeCanvas Integration (Visual Schema Editor)
export type {
  CanvasNode,
  CanvasEdge,
  CanvasNodeStyle,
  CanvasEdgeStyle,
  CanvasDocument,
  LifecycleState,
  ActivityState,
  CanvasEditorConfig,
  GuardianResult,
  GuardianError,
  GuardianWarning,
} from './integrations/code-canvas.js';
export {
  schemaToCanvas,
  canvasToSchema,
  canvasToYaml,
  canvasToMermaid,
  validateWithGuardian,
  createCanvasEditor,
} from './integrations/code-canvas.js';

// State-Docs Integration (Documentation Generation)
export type {
  StateDocsConfig,
  GeneratedDoc,
  StateMachineDoc,
  StateDoc,
  TransitionDoc,
} from './integrations/state-docs.js';
export {
  StateDocsGenerator,
  createStateDocsGenerator,
  generateDocs,
} from './integrations/state-docs.js';

// Tauri Integration (Desktop Apps)
export type {
  TauriAppConfig,
  TauriWindowConfig,
  TauriSecurityConfig,
  TauriUpdateConfig,
  TauriPlugin,
  TauriCommand,
  TauriEvent,
  TauriFS,
  TauriFileEntry,
  TauriTray,
  TauriMenuItem,
  TauriNotification,
  TauriNotificationOptions,
  TauriBridge,
  TauriUpdateInfo,
  TauriPraxisAdapter,
} from './integrations/tauri.js';
export {
  createMockTauriBridge,
  createTauriPraxisAdapter,
  attachTauriToEngine,
  generateTauriConfig,
} from './integrations/tauri.js';

// Unified Integration Helpers
export type { UnifiedAppConfig, UnifiedApp } from './integrations/unified.js';
export { createUnifiedApp, attachAllIntegrations } from './integrations/unified.js';
