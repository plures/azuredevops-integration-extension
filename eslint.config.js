// Minimal ESLint flat config for this extension
// Uses flat config (ESLint v9) with TypeScript support
import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' }
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'off',
      'no-console': 'off'
    }
  },
  {
    // Ignore legacy JS transpiled/duplicate sources for now
    ignores: ['src/**/*.js']
  }
];
