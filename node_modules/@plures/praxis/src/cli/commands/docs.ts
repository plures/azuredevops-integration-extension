/**
 * Docs Command
 *
 * Generate documentation from Praxis schemas using State-Docs integration.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createStateDocsGenerator } from '../../integrations/state-docs.js';
import { loadSchemaFromFile } from '../../core/schema/loader.js';
import type { PraxisRegistry } from '../../core/rules.js';

/**
 * Docs command options
 */
export interface DocsOptions {
  /** Output directory for generated docs */
  output?: string;
  /** Documentation title */
  title?: string;
  /** Include table of contents */
  toc?: boolean;
  /** Include timestamp */
  timestamp?: boolean;
  /** Visualization format */
  format?: 'mermaid' | 'dot';
  /** Custom header content */
  header?: string;
  /** Custom footer content */
  footer?: string;
  /** Generate from registry instead of schema */
  fromRegistry?: boolean;
}

/**
 * Generate documentation from schema or registry
 */
export async function docs(
  schemaOrRegistryPath: string | undefined,
  options: DocsOptions
): Promise<void> {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Praxis Documentation Generator                 ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  if (!schemaOrRegistryPath || !fs.existsSync(schemaOrRegistryPath)) {
    console.error('Error: Schema or registry file required');
    console.log('Usage: praxis docs <schema-file> [options]');
    console.log('\nOptions:');
    console.log('  --output <dir>       Output directory (default: ./docs)');
    console.log('  --title <title>      Documentation title');
    console.log('  --format <format>    Diagram format: mermaid (default) or dot');
    console.log('  --no-toc            Disable table of contents');
    console.log('  --no-timestamp      Disable timestamp');
    console.log('  --from-registry      Generate from registry instead of schema');
    process.exit(1);
  }

  const outputDir = options.output || './docs';
  const title = options.title || 'Praxis Application';

  // Create generator
  const generator = createStateDocsGenerator({
    projectTitle: title,
    target: outputDir,
    visualization: {
      format: options.format || 'mermaid',
      exportPng: false,
    },
    template: {
      toc: options.toc !== false,
      timestamp: options.timestamp !== false,
      header: options.header,
      footer: options.footer,
    },
  });

  console.log(`Source: ${schemaOrRegistryPath}`);
  console.log(`Output: ${outputDir}\n`);

  try {
    let generatedDocs;

    if (options.fromRegistry) {
      // Load registry module
      console.log('Loading registry module...');
      const module = await import(path.resolve(schemaOrRegistryPath));
      const registry: PraxisRegistry<unknown> =
        module.registry || module.default || module;

      if (!registry || typeof registry.getAllRules !== 'function') {
        console.error('Error: Invalid registry module');
        console.log('Expected: export const registry = new PraxisRegistry()');
        process.exit(1);
      }

      console.log('Generating documentation from registry...');
      // Create module object from registry
      const praxisModule = {
        rules: registry.getAllRules(),
        constraints: registry.getAllConstraints(),
      };
      generatedDocs = generator.generateFromModule(praxisModule);
    } else {
      // Load schema
      console.log('Loading schema...');
      const result = await loadSchemaFromFile(schemaOrRegistryPath);

      if (result.errors.length > 0 || !result.schema) {
        console.error(`Error loading schema: ${result.errors.join(', ')}`);
        process.exit(1);
      }

      console.log('Generating documentation from schema...');
      generatedDocs = generator.generateFromSchema(result.schema);
    }

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write all generated docs
    console.log('\nWriting documentation files:\n');
    for (const doc of generatedDocs) {
      const fullPath = path.resolve(doc.path);
      const dir = path.dirname(fullPath);

      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, doc.content);
      console.log(`  ✓ ${doc.path} (${doc.type})`);
    }

    console.log(`\n✓ Generated ${generatedDocs.length} documentation file(s)`);
    console.log(`\nView your documentation: ${path.resolve(outputDir, 'README.md')}`);
  } catch (error) {
    console.error(`Error generating documentation: ${error}`);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}
