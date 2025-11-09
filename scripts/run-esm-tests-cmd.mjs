#!/usr/bin/env node
/**
 * Simple test runner wrapper for ESM projects.
 * Runs vitest in "run" mode with inherited stdio and exits with the same code.
 */
import { spawnSync } from 'node:child_process';

const result = spawnSync('npx', ['vitest', 'run'], {
	stdio: 'inherit',
	shell: true
});

process.exit(result.status ?? 1);


