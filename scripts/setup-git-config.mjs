#!/usr/bin/env node

/**
 * Setup script to automatically apply git configuration from .gitconfig.worktree
 * This runs during npm install to configure git worktree settings for the repository.
 */

import { execSync, spawnSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * Execute git command and return output
 */
function gitCommand(cmd) {
  try {
    return execSync(cmd, { cwd: rootDir, encoding: 'utf8' }).trim();
  } catch (error) {
    return null;
  }
}

/**
 * Check if we're in a git repository
 */
function isGitRepository() {
  return gitCommand('git rev-parse --git-dir') !== null;
}

/**
 * Check if a git config key exists (regardless of value)
 */
function configExists(key) {
  return gitCommand(`git config --local --get ${key}`) !== null;
}

/**
 * Check if a git config value is already set
 */
function isConfigSet(key, value) {
  const currentValue = gitCommand(`git config --local --get ${key}`);
  // For complex aliases with shell variables, just check if it exists
  if (key.startsWith('alias.') && (value.includes('$') || value.includes('!'))) {
    return currentValue !== null;
  }
  return currentValue === value;
}

/**
 * Set a git config value if not already set
 */
function setConfigIfNeeded(key, value) {
  if (isConfigSet(key, value)) {
    console.log(`  ✓ ${key} already set`);
    return false;
  }

  try {
    // Use spawn with array arguments to avoid shell escaping issues
    const result = spawnSync('git', ['config', '--local', key, value], {
      cwd: rootDir,
      encoding: 'utf8',
    });

    if (result.status !== 0) {
      throw new Error(result.stderr || 'Failed to set config');
    }

    console.log(`  ✓ Set ${key}`);
    return true;
  } catch (error) {
    console.warn(`  ⚠ Failed to set ${key}: ${error.message}`);
    return false;
  }
}

/**
 * Set a git config alias if not already set
 */
function setAliasIfNeeded(name, command) {
  return setConfigIfNeeded(`alias.${name}`, command);
}

/**
 * Apply git configuration from .gitconfig.worktree
 */
function applyGitConfig() {
  console.log('Setting up git configuration for worktrees...\n');

  if (!isGitRepository()) {
    console.log('⚠ Not in a git repository. Skipping git configuration setup.');
    return;
  }

  let changesApplied = false;

  // Core worktree settings
  console.log('Configuring worktree settings:');
  changesApplied = setConfigIfNeeded('worktree.prune', 'true') || changesApplied;

  // Pull settings
  console.log('\nConfiguring pull settings:');
  changesApplied = setConfigIfNeeded('pull.rebase', 'true') || changesApplied;

  // Push settings
  console.log('\nConfiguring push settings:');
  changesApplied = setConfigIfNeeded('push.autoSetupRemote', 'true') || changesApplied;

  // Init settings
  console.log('\nConfiguring init settings:');
  changesApplied = setConfigIfNeeded('init.defaultBranch', 'main') || changesApplied;

  // Useful aliases
  console.log('\nConfiguring git aliases:');
  changesApplied =
    setAliasIfNeeded('lg', 'log --graph --oneline --decorate --all --date=short') || changesApplied;
  changesApplied = setAliasIfNeeded('wt', 'worktree list') || changesApplied;
  changesApplied = setAliasIfNeeded('wt-add', 'worktree add') || changesApplied;
  changesApplied = setAliasIfNeeded('wt-remove', 'worktree remove') || changesApplied;
  changesApplied = setAliasIfNeeded('wt-prune', 'worktree prune') || changesApplied;

  // Branch cleanup alias
  changesApplied =
    setAliasIfNeeded(
      'cleanup',
      "!git branch --merged main | grep -v '\\*\\|main\\|develop' | xargs -n 1 git branch -d"
    ) || changesApplied;

  // Worktree cleanup alias
  changesApplied =
    setAliasIfNeeded(
      'wt-cleanup',
      "!git worktree prune && git branch --merged main | grep -v '\\*\\|main\\|develop' | while read branch; do git worktree list | grep \"\\[$branch\\]\" | awk '{print $1}' | xargs -I {} git worktree remove {} 2>/dev/null || true; done"
    ) || changesApplied;

  // Status across all worktrees
  changesApplied =
    setAliasIfNeeded(
      'wt-status',
      '!git worktree list | while read line; do path=$(echo $line | awk \'{print $1}\'); branch=$(echo $line | awk \'{print $NF}\' | tr -d \'[]\'); if [ -d "$path" ]; then echo "=== $branch ==="; (cd "$path" && git status --short); echo ""; fi; done'
    ) || changesApplied;

  if (changesApplied) {
    console.log('\n✓ Git configuration applied successfully to local repository.');
  } else {
    console.log('\n✓ Git configuration already up to date.');
  }

  console.log('\nNote: These settings are applied to .git/config (local repository only).');
  console.log('To apply globally, run: cat .gitconfig.worktree >> ~/.gitconfig\n');
}

// Run the setup
try {
  applyGitConfig();
} catch (error) {
  console.error('Error setting up git configuration:', error.message);
  // Don't fail the npm install if git config fails
  process.exit(0);
}
