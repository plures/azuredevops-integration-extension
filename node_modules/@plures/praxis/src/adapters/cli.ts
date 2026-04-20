#!/usr/bin/env node
/**
 * Praxis CLI Adapter
 *
 * JSON-based CLI interface for cross-language Praxis engine invocation.
 * Reads JSON from stdin, processes through Praxis engine, outputs JSON to stdout.
 *
 * This enables PowerShell, Python, and other languages to use Praxis.
 */

import * as fs from 'fs';
import {
  createPraxisEngine,
  PraxisRegistry,
  type PraxisState,
  type PraxisEvent,
  type PraxisStepResult,
  type RuleDescriptor,
  type ConstraintDescriptor,
} from '../index.js';

interface CLIInput {
  state: PraxisState;
  events: PraxisEvent[];
  configPath: string;
}

interface RegistryConfig {
  rules: Array<{
    id: string;
    description: string;
    // Implementation loaded from separate files or inline
    impl?: string; // JavaScript code as string
  }>;
  constraints: Array<{
    id: string;
    description: string;
    impl?: string;
  }>;
}

/**
 * Load registry configuration from JSON file
 */
function loadRegistryConfig(configPath: string): RegistryConfig {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load registry config from ${configPath}: ${error}`);
  }
}

/**
 * Create a registry from configuration
 * Note: For simplicity, this uses eval for rule implementations.
 * In production, use a safer approach like loading from pre-compiled modules.
 */
function createRegistryFromConfig<TContext = unknown>(
  config: RegistryConfig
): PraxisRegistry<TContext> {
  const registry = new PraxisRegistry<TContext>();

  // Register rules
  for (const ruleConfig of config.rules) {
    if (!ruleConfig.impl) {
      throw new Error(`Rule ${ruleConfig.id} missing implementation`);
    }

    try {
      // Eval the implementation (for demo purposes)
      // In production, load from modules or use a safer evaluation method
      const impl = eval(ruleConfig.impl);

      const rule: RuleDescriptor<TContext> = {
        id: ruleConfig.id,
        description: ruleConfig.description,
        impl,
      };

      registry.registerRule(rule);
    } catch (error) {
      throw new Error(`Failed to load rule ${ruleConfig.id}: ${error}`);
    }
  }

  // Register constraints
  for (const constraintConfig of config.constraints) {
    if (!constraintConfig.impl) {
      throw new Error(`Constraint ${constraintConfig.id} missing implementation`);
    }

    try {
      const impl = eval(constraintConfig.impl);

      const constraint: ConstraintDescriptor<TContext> = {
        id: constraintConfig.id,
        description: constraintConfig.description,
        impl,
      };

      registry.registerConstraint(constraint);
    } catch (error) {
      throw new Error(`Failed to load constraint ${constraintConfig.id}: ${error}`);
    }
  }

  return registry;
}

/**
 * Process a step through the Praxis engine
 */
function processStep(input: CLIInput): PraxisStepResult {
  // Load registry configuration
  const config = loadRegistryConfig(input.configPath);
  const registry = createRegistryFromConfig(config);

  // Create engine with state from input
  const engine = createPraxisEngine({
    initialContext: input.state.context,
    initialFacts: input.state.facts,
    initialMeta: input.state.meta,
    registry,
  });

  // Process events
  return engine.step(input.events);
}

/**
 * Main CLI entry point
 */
async function main() {
  try {
    // Read input from stdin
    let inputData = '';

    for await (const chunk of process.stdin) {
      inputData += chunk;
    }

    if (!inputData.trim()) {
      throw new Error('No input provided');
    }

    // Parse input
    const input: CLIInput = JSON.parse(inputData);

    // Validate input
    if (!input.state || !input.events || !input.configPath) {
      throw new Error('Invalid input: must provide state, events, and configPath');
    }

    // Process step
    const result = processStep(input);

    // Output result as JSON
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        null,
        2
      )
    );
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { processStep, loadRegistryConfig, createRegistryFromConfig };
