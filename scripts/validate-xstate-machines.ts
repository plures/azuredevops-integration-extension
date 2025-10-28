#!/usr/bin/env tsx
/**
 * XState v5 Machine Validator
 * 
 * Validates that all state machines follow XState v5 conventions:
 * - entry must be array or undefined
 * - exit must be array or undefined  
 * - actions must be array or undefined
 * - Catches the "entry is not iterable" error at build time
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface ValidationError {
  file: string;
  line: number;
  issue: string;
  suggestion: string;
}

const errors: ValidationError[] = [];

async function validateMachines() {
  console.log('🤖 Validating XState v5 machines...\n');

  // Find all machine files
  const machineFiles = await glob('src/fsm/machines/**/*.ts', {
    ignore: ['**/*.d.ts', '**/*.test.ts'],
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
      console.error(`${error.file}:${error.line}`);
      console.error(`  Issue: ${error.issue}`);
      console.error(`  Fix: ${error.suggestion}\n`);
    }
    
    process.exit(1);
  }
}

async function validateMachineFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check for entry/exit/actions that aren't arrays
    // Pattern: entry: assign(...) or entry: 'actionName'
    // Should be: entry: [assign(...)] or entry: ['actionName']

    // Match: entry: assign(...) or entry: 'actionName' (not in array)
    const entryMatch = line.match(/^\s*entry:\s*(assign\(|'|"|\w+\()/);
    if (entryMatch && !line.includes('[')) {
      errors.push({
        file: filePath,
        line: lineNum,
        issue: 'entry must be an array',
        suggestion: `entry: [${line.split(':')[1]?.trim()}]`,
      });
    }

    const exitMatch = line.match(/^\s*exit:\s*(assign\(|'|"|\w+\()/);
    if (exitMatch && !line.includes('[')) {
      errors.push({
        file: filePath,
        line: lineNum,
        issue: 'exit must be an array',
        suggestion: `exit: [${line.split(':')[1]?.trim()}]`,
      });
    }

    // Match: actions: assign(...) or actions: 'actionName' (not in array)
    // BUT skip if it's already actions: [ or actions: 'name', (array continuation)
    const actionsMatch = line.match(/^\s*actions:\s*(assign\(|'|"|\w+)/);
    if (actionsMatch && !line.includes('[') && !line.trim().endsWith(',')) {
      // Check if next line is a closing brace (means it's a single action)
      const nextLine = lines[i + 1];
      if (nextLine && nextLine.trim().startsWith('}')) {
        errors.push({
          file: filePath,
          line: lineNum,
          issue: 'actions must be an array',
          suggestion: `actions: [${line.split(':')[1]?.trim()}]`,
        });
      }
    }
  }
}

// Run validation
validateMachines().catch((error) => {
  console.error('💥 Validation script failed:', error);
  process.exit(1);
});

