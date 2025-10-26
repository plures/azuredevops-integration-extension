/**
 * ESLint Rules for FSM-First Development
 * Enforces architectural patterns for traceability and maintainability
 */

module.exports = {
  plugins: ['@typescript-eslint'],
  rules: {
    // Prevent direct async chains that bypass FSM
    'no-restricted-syntax': [
      'error',
      {
        selector:
          'CallExpression[callee.type="MemberExpression"][callee.property.name="then"] ~ CallExpression[callee.type="MemberExpression"][callee.property.name="then"]',
        message:
          'Avoid chaining .then() calls. Use FSM actors with fromPromise instead for traceability.',
      },
      {
        selector:
          'CallExpression[callee.name="Promise"][property.name="all"] CallExpression[callee.type="MemberExpression"][callee.property.name="then"]',
        message:
          'Avoid Promise.all with .then chains. Use FSM coordination for complex async flows.',
      },
    ],

    // Encourage FSM context usage
    'prefer-const': 'error',

    // Function length limits to encourage small, focused functions
    'max-lines-per-function': ['warn', { max: 30, skipBlankLines: true, skipComments: true }],

    // Encourage pure functions - limit side effects
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    // Require explicit return types for better traceability
    '@typescript-eslint/explicit-function-return-type': [
      'warn',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
      },
    ],
  },

  overrides: [
    {
      // Special rules for FSM machine files
      files: ['src/fsm/machines/*.ts'],
      rules: {
        // FSM machines should use fromPromise actors
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
      // Special rules for pure function files
      files: ['src/fsm/functions/*.ts'],
      rules: {
        // Pure functions should not have side effects
        'no-restricted-syntax': [
          'error',
          {
            selector: 'CallExpression[callee.object.name="vscode"]',
            message:
              'Pure functions should not call VS Code APIs. Use FSM actors for side effects.',
          },
          {
            selector: 'CallExpression[callee.object.name="console"]',
            message: 'Pure functions should use FSM logging instead of console.log.',
          },
          {
            selector: 'AssignmentExpression[left.type="MemberExpression"]',
            message: 'Pure functions should not mutate external state. Return new state instead.',
          },
        ],

        // Pure functions should have explicit return types
        '@typescript-eslint/explicit-function-return-type': 'error',

        // Encourage immutability
        'prefer-const': 'error',
        'no-let': 'warn',
        'no-var': 'error',
      },
    },

    {
      // Rules for activation.ts - encourage migration to FSM
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
  ],
};

// Custom rule ideas for future implementation:
// 1. 'fsm-context-required': Functions in FSM context should accept FSM context parameter
// 2. 'no-direct-state-mutation': Prevent direct mutation of connection states
// 3. 'require-fsm-logging': Business logic should use FSM logging instead of console
// 4. 'max-function-dependencies': Limit function dependencies to encourage single responsibility
