/**
 * Praxis Generate Command
 *
 * Generates code from Praxis schema files.
 */

import { mkdir, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import { loadSchemaFromFile, validateForGeneration } from '../../core/schema/loader.js';
import { normalizeSchema, type NormalizedSchema } from '../../core/schema/normalize.js';
import { createLogicGenerator } from '../../core/logic/generator.js';
import { createComponentGenerator } from '../../core/component/generator.js';
import { createPluresDBGenerator } from '../../core/pluresdb/generator.js';

/**
 * Generate command options
 */
export interface GenerateOptions {
  /** Schema file path */
  schema?: string;
  /** Generation target */
  target?: 'all' | 'logic' | 'components' | 'pluresdb';
  /** Output directory */
  output?: string;
  /** Watch mode */
  watch?: boolean;
  /** Auto-indexing strategy for PluresDB: 'all' (default), 'explicit', or 'none' */
  autoIndex?: 'all' | 'explicit' | 'none';
}

/**
 * Execute the generate command
 */
export async function generate(options: GenerateOptions): Promise<void> {
  try {
    // Determine schema file path
    const schemaPath = options.schema || './praxis.schema.js';
    const resolvedSchemaPath = resolve(process.cwd(), schemaPath);

    console.log(`Loading schema from: ${resolvedSchemaPath}`);

    // Load the schema
    const loadResult = await loadSchemaFromFile(resolvedSchemaPath, {
      validate: true,
    });

    if (loadResult.errors.length > 0) {
      console.error('❌ Failed to load schema:');
      loadResult.errors.forEach((error) => console.error(`  - ${error}`));
      process.exit(1);
    }

    if (!loadResult.schema) {
      console.error('❌ No schema found');
      process.exit(1);
    }

    // Validate schema for generation
    const generationValidation = validateForGeneration(loadResult.schema);
    if (!generationValidation.valid) {
      console.error('❌ Schema validation failed:');
      generationValidation.errors.forEach((error) => console.error(`  - ${error.message}`));
      process.exit(1);
    }

    console.log('✓ Schema loaded successfully');

    // Normalize the schema
    console.log('Normalizing schema...');
    const normalizedSchema = normalizeSchema(loadResult.schema);
    console.log('✓ Schema normalized');

    // Determine output directory
    const outputDir = options.output || './generated';
    const resolvedOutputDir = resolve(process.cwd(), outputDir);

    // Generate based on target
    const target = options.target || 'all';
    let generatedFiles = 0;

    if (target === 'all' || target === 'logic') {
      console.log('\nGenerating logic module...');
      const logicOutputDir = `${resolvedOutputDir}/logic`;
      await generateLogic(normalizedSchema, logicOutputDir);
      generatedFiles += 5; // facts, events, rules, engine, index
      console.log(`✓ Logic module generated in ${logicOutputDir}`);
    }

    if (target === 'all' || target === 'components') {
      console.log('\nGenerating components...');
      const componentsOutputDir = `${resolvedOutputDir}/components`;
      const componentCount = await generateComponents(normalizedSchema, componentsOutputDir);
      generatedFiles += componentCount;
      console.log(`✓ ${componentCount} components generated in ${componentsOutputDir}`);
    }

    if (target === 'all' || target === 'pluresdb') {
      console.log('\nGenerating PluresDB configuration...');
      const dbOutputDir = resolvedOutputDir;
      await generatePluresDB(normalizedSchema, dbOutputDir, options.autoIndex);
      generatedFiles += 1;
      console.log(`✓ PluresDB config generated in ${dbOutputDir}`);
    }

    console.log(`\n✅ Generation complete! ${generatedFiles} files generated.`);

    if (options.watch) {
      console.log('\n👀 Watching for changes...');
      console.log('(Watch mode not yet implemented)');
    }
  } catch (error) {
    console.error('❌ Generation failed:');
    if (error instanceof Error) {
      console.error(error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
    } else {
      console.error('Unknown error');
    }
    process.exit(1);
  }
}

/**
 * Generate logic module
 */
async function generateLogic(schema: NormalizedSchema, outputDir: string): Promise<void> {
  const generator = createLogicGenerator(outputDir);
  const files = generator.generateLogic(schema);

  // Write files
  for (const file of files) {
    await ensureDir(dirname(file.path));
    await writeFile(file.path, file.content, 'utf-8');
  }
}

/**
 * Generate components
 */
async function generateComponents(schema: NormalizedSchema, outputDir: string): Promise<number> {
  if (!schema.components || schema.components.length === 0) {
    console.log('  No components defined in schema');
    return 0;
  }

  const generator = createComponentGenerator(outputDir, {
    typescript: true,
    includeTests: false,
    includeDocs: true,
  });

  let fileCount = 0;

  for (const component of schema.components) {
    // Find model if component references one
    const model = component.resolvedModel || undefined;

    const result = generator.generateComponent(component, model);

    if (!result.success) {
      console.error(`  ⚠️  Failed to generate ${component.name}:`);
      result.errors.forEach((error) => console.error(`    - ${error.message}`));
      continue;
    }

    // Write files
    for (const file of result.files) {
      await ensureDir(dirname(file.path));
      await writeFile(file.path, file.content, 'utf-8');
      fileCount++;
    }
  }

  return fileCount;
}

/**
 * Generate PluresDB configuration
 */
async function generatePluresDB(
  schema: NormalizedSchema,
  outputDir: string,
  autoIndex?: 'all' | 'explicit' | 'none'
): Promise<void> {
  const generator = createPluresDBGenerator(outputDir, {
    dbName: schema.name.toLowerCase(),
    enableSync: false,
    autoIndex: autoIndex || 'all',
  });

  const files = generator.generateConfig(schema);

  // Write files
  for (const file of files) {
    await ensureDir(dirname(file.path));
    await writeFile(file.path, file.content, 'utf-8');
  }
}

/**
 * Ensure directory exists
 */
async function ensureDir(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error: any) {
    // Only ignore if directory already exists
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}
