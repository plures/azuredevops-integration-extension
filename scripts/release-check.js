import { execSync } from 'child_process';
import fs from 'fs';

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (e) {
    return null;
  }
}

function checkUnitTests() {
  const out = run('npm test --silent');
  return out === null ? 0 : 20; // pass/fail simple
}

function checkCoverage() {
  const out = run('npx c8 --reporter=text --reporter=lcov npm test --silent');
  if (!out) return 0;
  const lines = (out.match(/Lines:\s+(\d+\.\d+)%/i) || [])[1];
  const branches = (out.match(/Branches:\s+(\d+\.\d+)%/i) || [])[1];
  const funcs = (out.match(/Functions:\s+(\d+\.\d+)%/i) || [])[1];
  const l = parseFloat(lines || 0),
    b = parseFloat(branches || 0),
    f = parseFloat(funcs || 0);
  let score = 0;
  if (l >= 85) score += 20;
  if (b >= 80) score += 15;
  if (f >= 80) score += 15;
  return score;
}

function checkLint() {
  const out = run('npm run lint --silent');
  return out === null ? 0 : 10;
}

function checkTypes() {
  const out = run('npm run check-types --silent');
  return out === null ? 0 : 5;
}

function checkDocs() {
  const req = ['README.md', 'CHANGELOG.md', 'RELEASE_PLAN_1_0.md', 'CONTRIBUTING.md'];
  let ok = 0;
  for (const f of req) {
    try {
      fs.accessSync(f);
      ok++;
    } catch (e) {}
  }
  return ok === req.length ? 5 : 0;
}

function checkSecurity() {
  const out = run('npm audit --json');
  if (!out) return 0;
  try {
    const j = JSON.parse(out);
    const crit = j.metadata.vulnerabilities.critical || 0;
    const high = j.metadata.vulnerabilities.high || 0;
    return crit + high === 0 ? 10 : 0;
  } catch (e) {
    return 0;
  }
}

function computeScore() {
  let score = 0;
  score += checkUnitTests();
  score += checkCoverage();
  score += checkLint();
  score += checkTypes();
  score += checkDocs();
  score += checkSecurity();
  return score;
}

function suggestVersion(score) {
  if (score < 30) return '0.1.x';
  if (score < 50) return '0.2.x';
  if (score < 70) return '0.3.x';
  if (score < 85) return '0.5.x';
  if (score < 95) return '0.9.x';
  return '1.0.0-rc';
}

function main() {
  console.log('Running release-check (this may run tests)...');
  const score = computeScore();
  console.log('Score:', score, '/100');
  console.log('Suggested milestone version:', suggestVersion(score));
  if (score >= 90) console.log('Eligible for 1.0 release candidate');
  process.exit(score >= 30 ? 0 : 2);
}

main();
