import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: [
      'node_modules',
      'dist',
      'temp_extract',
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
