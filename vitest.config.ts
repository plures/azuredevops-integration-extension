import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      // Provide a lightweight vscode stub so unit tests that import modules
      // depending on the vscode API can run outside of the VS Code host.
      vscode: path.resolve(__dirname, 'vscode-stub/index.js'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['tests/setup/praxis-history-setup.ts'],
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: [
      'node_modules',
      'dist',
      'temp_extract',
      'tests/setup/**',
      // Exclude legacy xstate-based feature tests (now replaced by Praxis)
      'src/features/connection/*.test.ts',
      'src/features/timer/*.test.ts',
      // Exclude xstate-dependent FSM machine tests
      'tests/fsm/setupMachine.test.ts',
      'tests/fsm/requireAuthentication.test.ts',
      'tests/fsm/connectionMachine.test.ts',
      'tests/fsm/timerMachine.test.ts',
      'tests/fsm/applicationMachine.viewMode.test.ts',
      // Exclude xstate-dependent feature tests
      'tests/features/error-handling-integration.test.ts',
      'tests/features/error-handling-e2e.test.ts',
      'tests/features/timer-integration.test.ts',
      // Exclude integration tests that require VS Code runtime
      'tests/integration-tests/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      // Exclude tests for FSM modules that have been removed during migration to Praxis
      'tests/fsm/authFunctions.test.ts',
      'tests/fsm/authReminderActions.test.ts',
      'tests/fsm/buildAuthReminder.test.ts',
      'tests/fsm/kanbanColumns.test.ts',
      'tests/fsm/router.stamp.test.ts',
      'tests/fsm/functions/setup/auth-methods.test.ts',
      'tests/fsm/functions/setup/connection-defaults.test.ts',
      'tests/fsm/functions/setup/environment-detection.test.ts',
      'tests/fsm/functions/setup/user-detection.test.ts',
      'tests/fsm/functions/ui/error-handling.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'scripts/',
        'esbuild.mjs',
      ],
    },
    testTimeout: 10000,
  },
});
