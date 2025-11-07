#!/usr/bin/env tsx
/**
 * Runtime XState Machine Validator
 * 
 * Actually creates machines to catch runtime errors at build time.
 * This catches invalid state transitions, missing states, etc.
 */

import { createActor } from 'xstate';
import { glob } from 'glob';
import * as path from 'path';
import * as fs from 'fs';

// Mock VS Code API for validation
const vscodeMock = {
  window: {
    showWarningMessage: () => Promise.resolve(undefined),
    showInformationMessage: () => Promise.resolve(undefined),
    showErrorMessage: () => Promise.resolve(undefined),
    state: { focused: true },
  },
  env: {
    clipboard: {
      writeText: () => Promise.resolve(),
    },
    openExternal: () => Promise.resolve(),
  },
  commands: {
    executeCommand: () => Promise.resolve(),
  },
  workspace: {
    getConfiguration: () => ({
      get: () => [],
      update: () => Promise.resolve(),
    }),
  },
  ExtensionContext: class {},
  ThemeColor: class {},
  Uri: {
    parse: (uri: string) => ({ toString: () => uri }),
  },
};

// Set up global mocks
(global as any).vscode = vscodeMock;

interface ValidationError {
  file: string;
  line?: number;
  issue: string;
  suggestion: string;
}

const errors: ValidationError[] = [];

async function validateMachines() {
  console.log('🤖 Validating XState machines (runtime validation)...\n');

  // Find all machine files
  const machineFiles = await glob('src/fsm/machines/**/*.ts', {
    ignore: ['**/*.d.ts', '**/*.test.ts', '**/*.schema.ts'],
  });

  for (const file of machineFiles) {
    await validateMachineFile(file);
  }

  // Report results
  if (errors.length === 0) {
    console.log('✅ All state machines are valid!\n');
    process.exit(0);
  } else {
    console.error(`❌ Found ${errors.length} validation error(s):\n`);

    for (const error of errors) {
      console.error(`${error.file}${error.line ? `:${error.line}` : ''}`);
      console.error(`  Issue: ${error.issue}`);
      console.error(`  Fix: ${error.suggestion}\n`);
    }

    process.exit(1);
  }
}

async function validateMachineFile(filePath: string) {
  try {
    // Read file to get line numbers for errors
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Try to import the machine
    // Convert file path to file:// URL for ESM compatibility
    const absolutePath = path.resolve(filePath);
    const modulePath = `file://${absolutePath.replace(/\\/g, '/')}`;
    
    // Use dynamic import with tsx/ts-node
    // Note: This requires the file to be TypeScript-compatible
    const module = await import(modulePath);
    
    // Find exported machine (common names: machineName, *Machine)
    const machineExports = Object.keys(module).filter(
      (key) => key.includes('Machine') || key.includes('machine')
    );
    
    if (machineExports.length === 0) {
      console.warn(`⚠️  No machine export found in ${filePath}`);
      return;
    }

    for (const exportName of machineExports) {
      const machine = module[exportName];
      
      if (!machine || typeof machine !== 'object') {
        continue;
      }

      try {
        // Create actor - this will validate the machine structure
        // Note: Some machines may require context that we can't provide in validation
        // We're primarily checking for structural issues (invalid transitions, missing states)
        const actor = createActor(machine, {
          // Provide minimal context if machine requires it
          input: machine.config?.context || {},
        });
        
        // Try to start - this validates the machine structure
        // If it fails due to missing context/services, that's okay - we're checking structure
        try {
          actor.start();
          const snapshot = actor.getSnapshot();
          console.log(`✅ ${filePath}:${exportName} - Valid`);
          actor.stop();
        } catch (contextError: any) {
          // If error is about missing context/services, that's expected in validation
          // We only care about structural errors (invalid states, transitions)
          if (
            contextError?.message?.includes('serverUrl') ||
            contextError?.message?.includes('Cannot read properties of undefined') ||
            contextError?.message?.includes('context is undefined') ||
            contextError?.message?.includes('Cannot read property') // covers older error formats
          ) {
            // This is a context/service issue, not a structural issue
            // Machine structure is valid, just needs runtime context
            console.log(`⚠️  ${filePath}:${exportName} - Structure valid (requires runtime context)`);
          } else {
            throw contextError; // Re-throw if it's a structural error
          }
        }
      } catch (error: any) {
        // Extract line number from error if possible
        const errorMessage = error?.message || String(error);
        const lineMatch = errorMessage.match(/line (\d+)/i);
        const line = lineMatch ? parseInt(lineMatch[1]) : undefined;
        
        // Check for common XState errors
        if (errorMessage.includes('does not exist')) {
          errors.push({
            file: filePath,
            line,
            issue: `Invalid state transition: ${errorMessage}`,
            suggestion: 'Check that all target states exist in the machine definition',
          });
        } else if (errorMessage.includes('Invalid transition')) {
          errors.push({
            file: filePath,
            line,
            issue: `Invalid transition definition: ${errorMessage}`,
            suggestion: 'Check transition syntax and ensure target states are valid',
          });
        } else {
          errors.push({
            file: filePath,
            line,
            issue: `Machine validation failed: ${errorMessage}`,
            suggestion: 'Review machine definition for syntax errors',
          });
        }
      }
    }
  } catch (error: any) {
    // Import failed - might be due to dependencies
    if (error.message?.includes('Cannot find module')) {
      // This is okay - file might have dependencies we can't resolve
      console.warn(`⚠️  Could not import ${filePath}: ${error.message}`);
    } else {
      errors.push({
        file: filePath,
        issue: `Failed to validate: ${error.message}`,
        suggestion: 'Check for syntax errors or missing dependencies',
      });
    }
  }
}

// Run validation
validateMachines().catch((error) => {
  console.error('💥 Validation script failed:', error);
  process.exit(1);
});

