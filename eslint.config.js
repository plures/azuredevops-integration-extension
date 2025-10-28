// Minimal ESLint flat config for this extension
// Uses flat config (ESLint v9) with TypeScript support
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  js.configs.recommended,
  {
    plugins: { '@typescript-eslint': tsPlugin },
    files: ['src/**/*.ts', 'tests/**/*.ts', 'packages/**/src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { varsIgnorePattern: '^_', argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'no-undef': 'off',
      'no-console': 'off',

      // Intelligent Statistical Architecture Rules
      'max-lines-per-function': ['error', { max: 100, skipBlankLines: true, skipComments: true }],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'prefer-const': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      
      // Statistical Complexity Rules (adaptive thresholds)
      'max-statements': ['warn', { max: 50 }],
      'max-depth': ['warn', { max: 4 }],
      'complexity': ['warn', { max: 10 }],
      
      // Purity and Side Effect Rules
      'no-console': 'off', // Allow console in development
      'no-var': 'error',
      'prefer-arrow-callback': 'warn',
    },
  },

  // FSM-specific rules
  {
    files: ['src/fsm/machines/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'NewExpression[callee.name="Promise"]',
          message:
            'FSM machines should use fromPromise actors instead of direct Promise constructors.',
        },
        {
          selector: 'CallExpression[callee.type="MemberExpression"][callee.property.name="then"]',
          message: 'FSM machines should use state transitions, not .then() chains.',
        },
      ],
    },
  },

  {
    files: ['tests/**/*.ts'],
    rules: {
      'max-lines-per-function': 'off',
    },
  },

  // Pure function rules
  {
    files: ['src/fsm/functions/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.object.name="vscode"]',
          message: 'Pure functions should not call VS Code APIs. Use FSM actors for side effects.',
        },
        {
          selector: 'CallExpression[callee.object.name="console"]',
          message: 'Pure functions should use FSM logging instead of console.log.',
        },
      ],
    },
  },

  // Activation.ts migration warnings
  {
    files: ['src/activation.ts'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'NewExpression[callee.name="AzureDevOpsIntClient"]',
          message: 'Consider using FSM-based client creation for better traceability.',
        },
        {
          selector:
            'CallExpression[callee.type="MemberExpression"][callee.property.name="then"] ~ CallExpression[callee.type="MemberExpression"][callee.property.name="then"]',
          message: 'Consider refactoring complex async chains to use FSM state machines.',
        },
      ],
    },
  },

  {
    // Ignore legacy JS transpiled/duplicate sources and temporary files
    ignores: [
      'src/**/*.js',
      'src/architecture/**',
      'src/webview/ContextDrivenDemo.svelte',
      'src/webview/ContextDrivenWorkItems.svelte',
      'src/webview/ContextDrivenDemo.ts',
      'src/webview/ContextIntegration.ts',
      'src/webview/ReactiveApp*.svelte',
      'src/webview/ReactiveDemo.svelte',
      'src/webview/reactive-main*.ts',
      'src/webview/context-demo-main.ts',
      // Temporary and generated files
      'tmp/**',
      'tmp-*.js',
      'tmp-*.mjs',
      'tmp_*.js',
      'tmp_*.mjs',
      'vscode-stub/**',
      'dist/**',
      'out-tests/**',
      'node_modules/**',
      'test-samples/**',
      'tests/workflow-improvements.mjs',
    ],
  },
  {
    files: ['**/*.{js,ts,mjs,cjs}'],
    ignores: [
      'node_modules/**', 
      'out-tests/**', 
      'dist/**', 
      'media/**',
      'tmp/**',
      'tmp-*.js',
      'tmp-*.mjs',
      'tmp_*.js',
      'tmp_*.mjs',
      'vscode-stub/**',
      'test-samples/**',
      'tests/workflow-improvements.mjs',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.name='require']",
          message: 'Use ESM `import` instead of `require()` in this ESM-first repository.',
        },
        {
          selector: "MemberExpression[object.name='module'][property.name='exports']",
          message: 'Use ESM `export` instead of `module.exports`.',
        },
        {
          selector: "AssignmentExpression[left.object.name='module'][left.property.name='exports']",
          message: 'Use ESM `export` instead of `module.exports`.',
        },

        // General anti-patterns for FSM-first development
        {
          selector:
            'CallExpression[callee.type="MemberExpression"][callee.property.name="then"] ~ CallExpression[callee.type="MemberExpression"][callee.property.name="then"]',
          message:
            'Avoid chaining .then() calls. Use FSM actors with fromPromise for better traceability.',
        },
      ],
    },
  },

  // TEMPORARY: Legacy files being refactored (REMOVE AFTER EXTRACTION)
  {
    files: ['src/activation.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'max-lines': 'off', // TODO: Extract into modules < 300 lines each
      'max-lines-per-function': 'off', // TODO: Extract functions < 100 lines each
      'max-statements': 'off', // TODO: Reduce complexity
    },
  },

  // TEMPORARY: Large files being refactored (REMOVE AFTER EXTRACTION)
  {
    files: ['src/azureClient.ts', 'src/bridge/sharedContextBridge.ts', 'src/fsm/machines/connectionMachine.ts', 'src/fsm/machines/applicationMachine.ts'],
    rules: {
      'max-lines': 'off', // TODO: Extract into modules < 300 lines each
      'max-lines-per-function': 'off', // TODO: Extract functions < 100 lines each
    },
  },
];
