// Internal ESLint plugin to enforce Praxis guardrails
// ESM-compatible for ESLint flat config

const disallowedCallNames = new Set([
  'Date.now',
  'Math.random',
  'setTimeout',
  'setInterval',
  'fetch',
  'crypto.randomUUID',
]);

function calleeName(node) {
  if (!node) return '';
  switch (node.type) {
    case 'Identifier':
      return node.name;
    case 'MemberExpression': {
      const obj = calleeName(node.object);
      const prop = node.property && (node.property.name || node.property.value);
      return obj && prop ? `${obj}.${prop}` : prop || obj;
    }
    case 'CallExpression':
      return calleeName(node.callee);
    default:
      return '';
  }
}

function isTypeDeclaration(decl) {
  return (
    decl &&
    (decl.type === 'TSTypeAliasDeclaration' ||
      decl.type === 'TSInterfaceDeclaration' ||
      decl.type === 'TSEnumDeclaration')
  );
}

const rulePurity = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow side-effectful primitives in Praxis rules (time, randomness, console, VS Code APIs).',
    },
    schema: [],
    messages: {
      disallowed: 'Disallowed side-effectful call "{{name}}" inside Praxis rule.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const name = calleeName(node.callee);
        if (!name) return;
        if (disallowedCallNames.has(name)) {
          context.report({ node, messageId: 'disallowed', data: { name } });
          return;
        }
        if (name.startsWith('console.')) {
          context.report({ node, messageId: 'disallowed', data: { name } });
          return;
        }
        if (name.startsWith('vscode.')) {
          context.report({ node, messageId: 'disallowed', data: { name } });
          return;
        }
      },
      NewExpression(node) {
        const name = calleeName(node.callee);
        if (name === 'Date') {
          context.report({ node, messageId: 'disallowed', data: { name: 'new Date()' } });
        }
      },
    };
  },
};

const ruleSingleExport = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce one runtime rule export per file to keep rules small and focused.',
    },
    schema: [],
    messages: {
      tooMany:
        'Limit to a single non-type export per rule file. Split additional exports into separate files.',
    },
  },
  create(context) {
    let runtimeExportCount = 0;
    return {
      ExportNamedDeclaration(node) {
        if (node.declaration) {
          if (!isTypeDeclaration(node.declaration)) {
            runtimeExportCount += 1;
          }
        } else if (node.specifiers && node.specifiers.length > 0) {
          runtimeExportCount += 1;
        }
        if (runtimeExportCount > 1) {
          context.report({ node, messageId: 'tooMany' });
        }
      },
      ExportDefaultDeclaration(node) {
        runtimeExportCount += 1;
        if (runtimeExportCount > 1) {
          context.report({ node, messageId: 'tooMany' });
        }
      },
    };
  },
};

export default {
  rules: {
    purity: rulePurity,
    'single-export': ruleSingleExport,
  },
};
