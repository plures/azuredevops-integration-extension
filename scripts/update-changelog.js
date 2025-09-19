#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Updates CHANGELOG.md with commits since the last tag
 * This script is meant to be run during CI before version bumping
 */

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (e) {
    return null;
  }
}

function getCommitsSinceLastTag() {
  const lastTag = run('git describe --tags --abbrev=0 2>/dev/null');
  if (!lastTag) {
    console.log('No previous tags found, skipping changelog update');
    return [];
  }

  const range = `${lastTag}..HEAD`;
  const commits = run(`git log --format="%s" ${range}`);
  if (!commits) {
    console.log('No commits since last tag');
    return [];
  }

  return commits.split('\n').filter(Boolean);
}

function categorizeCommits(commits) {
  const categories = {
    feat: [],
    fix: [],
    docs: [],
    style: [],
    refactor: [],
    test: [],
    chore: [],
    other: []
  };

  commits.forEach(commit => {
    const match = commit.match(/^(\w+)(\(.+\))?: (.+)/);
    if (match) {
      const [, type, , description] = match;
      if (categories[type]) {
        categories[type].push(description);
      } else {
        categories.other.push(commit);
      }
    } else {
      categories.other.push(commit);
    }
  });

  return categories;
}

function generateChangelogEntry(version, categories) {
  const today = new Date().toISOString().split('T')[0];
  let entry = `## [${version}] - ${today}\n\n`;

  if (categories.feat.length > 0) {
    entry += '### Added\n\n';
    categories.feat.forEach(item => {
      entry += `- ${item}\n`;
    });
    entry += '\n';
  }

  if (categories.fix.length > 0) {
    entry += '### Fixed\n\n';
    categories.fix.forEach(item => {
      entry += `- ${item}\n`;
    });
    entry += '\n';
  }

  if (categories.refactor.length > 0 || categories.style.length > 0) {
    entry += '### Changed\n\n';
    [...categories.refactor, ...categories.style].forEach(item => {
      entry += `- ${item}\n`;
    });
    entry += '\n';
  }

  if (categories.docs.length > 0) {
    entry += '### Documentation\n\n';
    categories.docs.forEach(item => {
      entry += `- ${item}\n`;
    });
    entry += '\n';
  }

  if (categories.test.length > 0 || categories.chore.length > 0) {
    entry += '### Developer Experience\n\n';
    [...categories.test, ...categories.chore].forEach(item => {
      entry += `- ${item}\n`;
    });
    entry += '\n';
  }

  if (categories.other.length > 0) {
    entry += '### Other\n\n';
    categories.other.forEach(item => {
      entry += `- ${item}\n`;
    });
    entry += '\n';
  }

  return entry;
}

function updateChangelog(newEntry) {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  const content = fs.readFileSync(changelogPath, 'utf8');
  
  // Find the position after the header and intro
  const lines = content.split('\n');
  let insertIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## [')) {
      insertIndex = i;
      break;
    }
  }
  
  // Insert the new entry
  lines.splice(insertIndex, 0, newEntry);
  fs.writeFileSync(changelogPath, lines.join('\n'));
  
  console.log('Updated CHANGELOG.md');
}

function main() {
  const version = process.argv[2];
  if (!version) {
    console.error('Usage: node update-changelog.js <version>');
    process.exit(1);
  }

  const commits = getCommitsSinceLastTag();
  if (commits.length === 0) {
    console.log('No commits to add to changelog');
    return;
  }

  const categories = categorizeCommits(commits);
  const entry = generateChangelogEntry(version, categories);
  updateChangelog(entry);
}

main();