/**
 * Praxis Code Generation
 *
 * Centralized code generation from PSF schemas.
 * Generates TypeScript, Svelte components, and documentation.
 */

export * from './docs-generator.js';
export * from './ts-generator.js';

// Re-export component generator
export {
  ComponentGenerator,
  createComponentGenerator,
  type GeneratorConfig,
  type GenerationResult,
  type GeneratedFile,
  type GenerationError,
} from '../../src/core/component/generator.js';

// Re-export logic generator
export {
  LogicGenerator,
  createLogicGenerator,
  type LogicGeneratorOptions,
  type GeneratedLogicFile,
} from '../../src/core/logic/generator.js';
