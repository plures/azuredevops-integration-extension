import { execSync } from 'child_process';
import path from 'path';

// Files which should always trigger full test suite when changed
const GLOBAL_TRIGGERS = [
  'package.json',
  'tsconfig.json',
  'vite.webview.config.ts',
  'esbuild.js',
  '.eslintrc.js',
  '.prettierrc',
  '.github/workflows/ci.yml',
];

// Map directories or file globs to test globs
const mapping = [
  { match: /^src\/azureClient/, tests: ['tests/azureClient*.test.ts', 'tests/**/*.test.ts'] },
  { match: /^src\/provider/, tests: ['tests/provider*.test.ts', 'tests/**/*.test.ts'] },
  { match: /^src\/timer/, tests: ['tests/timer*.test.ts', 'tests/**/*.test.ts'] },
  { match: /^src\//, tests: ['tests/**/*.test.ts'] },
  { match: /^tests\//, tests: ['tests/**/*.test.ts'] },
];

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function getChangedFiles() {
  try {
    const head = process.env.GITHUB_SHA || run('git rev-parse --verify HEAD');
    const base = process.env.GITHUB_BASE_SHA || run('git merge-base origin/main HEAD');
    const out = run(`git diff --name-only ${base} ${head}`);
    if (!out) return [];
    return out
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);
  } catch (e) {
    console.error('Failed to compute changed files, falling back to full test suite.', e.message);
    return null; // signal to run full suite
  }
}

function isGlobalTrigger(filePath) {
  return GLOBAL_TRIGGERS.some((g) => filePath === g || filePath.startsWith(g));
}

function testGlobsForSrcFile(filePath) {
  // src/<module>/.../<name>.ts -> tests/<module>*.test.ts and tests/**/*<name>*test.ts
  const parts = filePath.split('/');
  if (parts.length < 2) return [];
  const module = parts[1];
  const baseNameWithExt = parts[parts.length - 1];
  const baseName = baseNameWithExt.replace(/\.[^/.]+$/, '');
  const globs = new Set();
  if (module) {
    globs.add(`tests/${module}*.test.ts`);
    globs.add(`tests/${module}**/*.test.ts`);
  }
  globs.add(`tests/**/${baseName}*.test.ts`);
  // also include any tests that reference module by name
  globs.add(`tests/**/${module}*.test.ts`);
  return [...globs];
}

function selectTests(changedFiles) {
  if (!changedFiles) return null; // run full suite
  const selected = new Set();

  for (const f of changedFiles) {
    if (!f) continue;
    if (isGlobalTrigger(f)) {
      console.log('Global trigger changed:', f);
      return null; // run full suite
    }
    if (f.startsWith('tests/')) {
      // change in tests -> run that test file
      selected.add(f);
      continue;
    }
    if (f.startsWith('src/')) {
      const globs = testGlobsForSrcFile(f);
      globs.forEach((g) => selected.add(g));
      continue;
    }
    if (f.startsWith('scripts/') || f.startsWith('.github/')) {
      // Changes to scripts or workflows may require broader testing - run full suite
      console.log('Tooling/scripts changed:', f);
      return null;
    }
    // Unknown path -> conservative choice: run full suite
    console.log('Unknown path changed, running full suite:', f);
    return null;
  }

  return selected.size ? [...selected] : null;
}

function main() {
  const changed = getChangedFiles();
  const selected = selectTests(changed);
  if (!selected) {
    console.log('No selective mapping possible — running full test suite');
    process.exit(execSync('npm test', { stdio: 'inherit' }));
  }
  console.log('Running tests for changed files, patterns:', selected.join(', '));
  const mochaCmd = `node --loader ts-node/esm ./node_modules/mocha/bin/mocha --extensions ts ${selected.join(
    ' '
  )}`;
  try {
    execSync(mochaCmd, { stdio: 'inherit' });
  } catch (e) {
    process.exit(e.status || 1);
  }
}

main();
