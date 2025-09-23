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
    },
  },
  {
    // Ignore legacy JS transpiled/duplicate sources for now
    ignores: ['src/**/*.js'],
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
      ],
    },
  },
];
