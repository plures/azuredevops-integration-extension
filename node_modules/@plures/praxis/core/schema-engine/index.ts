/**
 * Praxis Schema Engine
 *
 * The Schema Engine is the central module responsible for:
 * - Parsing and validating Praxis Schema Format (PSF)
 * - Compiling TS DSL to PSF
 * - Generating TS DSL from PSF
 * - Managing schema transformations
 *
 * PSF (Praxis Schema Format) is the canonical JSON/AST representation
 * that serves as the single source of truth for all Praxis applications.
 */

export * from './psf.js';
export * from './compiler.js';
export * from './generator.js';
export * from './validator.js';
export * from './types.js';
