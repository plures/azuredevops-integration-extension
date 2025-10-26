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

      // FSM-First Development Rules
      'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
      'prefer-const': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
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
    // Ignore legacy JS transpiled/duplicate sources for now
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
    ],
  },
  {
    files: ['**/*.{js,ts,mjs,cjs}'],
    ignores: ['node_modules/**', 'out-tests/**', 'dist/**', 'media/**'],
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
];
