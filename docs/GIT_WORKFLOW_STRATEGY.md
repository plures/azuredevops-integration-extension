# Git Workflow Strategy

**Version**: 2.0  
**Effective Date**: 2025-10-27  
**Status**: Active

---

## Overview

This document defines the Git workflow for the Azure DevOps Integration Extension development. It ensures clean history, proper review processes, and safe integration of changes.

---

## Core Principles

1. **Never commit directly to `main`** - All changes via pull requests
2. **One feature/fix per branch** - Clear scope and easy review
3. **Test before merge** - User approval required
4. **Clean history** - Squash commits before merging
5. **Descriptive names** - Clear branch and commit naming

---

## Branch Strategy

### Branch Types

| Type         | Prefix      | Purpose            | Example                     |
| ------------ | ----------- | ------------------ | --------------------------- |
| Feature      | `feat/`     | New functionality  | `feat/rune-first-migration` |
| Bug Fix      | `fix/`      | Bug fixes          | `fix/pat-authentication`    |
| Refactor     | `refactor/` | Code improvements  | `refactor/fsm-actions`      |
| Docs         | `docs/`     | Documentation only | `docs/api-guide`            |
| Chore        | `chore/`    | Build/tooling      | `chore/update-deps`         |
| Experimental | `exp/`      | Experimental work  | `exp/webgl-renderer`        |

### Branch Naming Convention

```
<type>/<issue-number>-<short-description>

Examples:
- feat/123-action-buttons
- fix/456-css-loading
- refactor/789-fsm-centric-actions
```

### Protected Branches

- **`main`** - Production-ready code, requires PR + review
- **`develop`** (optional) - Integration branch for features

---

## Workflow Process

### 1. Start New Work

**Option A: Using Worktree (Recommended for Parallel Development)**

```bash
# Ensure main is up to date
cd C:/Projects/azuredevops-integration-extension
git checkout main
git pull origin main

# Create feature branch worktree
git worktree add ../worktrees/azuredevops-integration-extension/feat-123-my-feature -b feat/123-my-feature

# Work in the worktree
cd ../worktrees/azuredevops-integration-extension/feat-123-my-feature
npm install

# Make changes and commit frequently
git add .
git commit -m "feat: add initial structure"
git commit -m "feat: implement core logic"
git commit -m "fix: handle edge cases"
```

**Option B: Traditional Branch (Single Branch Development)**

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Create feature branch
git checkout -b feat/123-my-feature

# Make changes and commit frequently
git add .
git commit -m "feat: add initial structure"
git commit -m "feat: implement core logic"
git commit -m "fix: handle edge cases"
```

### 2. Keep Branch Updated

```bash
# Regularly sync with main
git fetch origin
git rebase origin/main

# If conflicts, resolve and continue
git add .
git rebase --continue
```

### 3. Prepare for PR

```bash
# Interactive rebase to clean up history
git rebase -i origin/main

# Squash related commits into logical units
# Keep: 1-3 well-described commits per PR

# Example squash strategy:
# - Keep: "feat: implement action buttons"
# - Squash: "fix typo", "update logging", "fix lint"
# - Keep: "docs: add usage guide"
```

### 4. Create Pull Request

```bash
# Push branch to remote
git push origin feat/123-my-feature

# Create PR via GitHub UI or CLI:
gh pr create \
  --title "feat: implement action buttons" \
  --body "Implements Timer, Edit, Branch action buttons.

  Fixes #123

  ## Changes
  - Add timer UI to work item cards
  - Implement in-VSCode field editing
  - Add branch creation with work item linking

  ## Testing
  - [x] Timer starts and displays
  - [x] Edit updates work item fields
  - [x] Branch created and linked"

# Request review (or self-review if solo)
```

### 5. Review & Test

**User/Reviewer Actions**:

1. Checkout PR branch locally
2. Run `npm install && npm run build`
3. Test all changes
4. Leave feedback or approve

```bash
# Test PR locally
git fetch origin
git checkout feat/123-my-feature
npm install
npm run build

# Test in VS Code (F5 to debug)
# Verify all functionality works

# If approved:
gh pr review --approve

# If changes needed:
gh pr review --request-changes --body "Please add error handling for X"
```

### 6. Merge to Main

After approval:

```bash
# Squash and merge via GitHub UI (preferred)
# OR via CLI:
gh pr merge --squash --delete-branch

# This creates one clean commit on main:
# "feat: implement action buttons (#123)"

# If using worktree, clean up after merge:
cd C:/Projects/azuredevops-integration-extension
git worktree remove ../worktrees/azuredevops-integration-extension/feat-123-my-feature
git branch -d feat/123-my-feature  # If not auto-deleted
```

---

## Commit Message Format

### Structure

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build/tooling changes
- `perf`: Performance improvements

### Examples

**Good**:

```
feat(ui): add action buttons to work item cards

Implement timer, edit, branch, and open actions:
- Timer starts on click and displays in card
- Edit opens in-VSCode field editor
- Branch creates and links to work item
- Open launches browser to work item

Fixes #123
```

**Bad**:

```
update stuff
```

---

## PR Best Practices

### PR Size

- **Small**: 1-200 lines changed (ideal)
- **Medium**: 200-500 lines (acceptable)
- **Large**: 500+ lines (break into smaller PRs)

### PR Checklist

- [ ] Branch name follows convention
- [ ] Commits are squashed into logical units
- [ ] PR description explains what/why
- [ ] Manual testing completed
- [ ] No lint errors
- [ ] Documentation updated if needed
- [ ] No sensitive data in commits

### PR Description Template

```markdown
## Summary

Brief description of changes

## Changes

- Bullet list of key changes

## Testing

- [ ] Tested scenario A
- [ ] Tested scenario B

## Screenshots (if UI changes)

![before](url)
![after](url)

## Related Issues

Fixes #123
Related to #456
```

---

## Emergency Hotfix Process

For critical production bugs:

```bash
# Create hotfix branch from main
git checkout main
git pull
git checkout -b hotfix/critical-auth-bug

# Fix and commit
git commit -m "hotfix: fix critical auth failure"

# Create PR marked as hotfix
gh pr create --title "🚨 HOTFIX: Fix critical auth failure" --label hotfix

# After approval, merge immediately
gh pr merge --squash

# Backport to develop if using
git checkout develop
git merge main
```

---

## Common Scenarios

### Scenario: Multiple Related Features

**Option A**: Separate PRs (preferred)

```bash
git checkout -b feat/timer-ui
# Implement timer UI
# Create PR #1

git checkout main
git checkout -b feat/edit-dialog
# Implement edit dialog
# Create PR #2 (depends on #1 mention in description)
```

**Option B**: Single PR with multiple commits

```bash
git checkout -b feat/action-buttons-complete
git commit -m "feat(timer): add timer UI"
git commit -m "feat(edit): add in-vscode editing"
git commit -m "feat(branch): add work item linking"
# Create single PR with 3 logical commits
```

### Scenario: PR Needs Changes

```bash
# Make requested changes
git add .
git commit -m "refactor: address PR feedback"

# Squash with previous if just a fix
git rebase -i HEAD~2
# Mark second commit as 'fixup' or 'squash'

# Force push (safe on feature branch)
git push --force-with-lease
```

### Scenario: Abandoned Branch

```bash
# Delete local branch
git branch -D feat/abandoned-feature

# Delete remote branch
git push origin --delete feat/abandoned-feature
```

---

## Git Configuration Recommendations

```bash
# Set up default branch
git config init.defaultBranch main

# Enable rebase by default for pull
git config pull.rebase true

# Auto-setup tracking for push
git config push.autoSetupRemote true

# Worktree configuration
git config worktree.prune true

# Helpful aliases
git config alias.lg "log --graph --oneline --decorate --all"
git config alias.cleanup "!git branch --merged main | grep -v '\\*\\|main\\|develop' | xargs -n 1 git branch -d"
git config alias.wt "worktree list"
git config alias.wt-add "worktree add"
git config alias.wt-remove "worktree remove"
git config alias.wt-prune "worktree prune"
```

### Worktree Setup

This project uses Git worktrees for parallel development. See [Git Worktree Setup Guide](./GIT_WORKTREE_SETUP.md) for detailed configuration.

**Quick Start**:
```bash
# List all worktrees
git worktree list

# Create new worktree for feature branch
git worktree add ../worktrees/azuredevops-integration-extension/feat-123-my-feature -b feat/123-my-feature

# Remove worktree after PR merge
git worktree remove ../worktrees/azuredevops-integration-extension/feat-123-my-feature
```

**Note**: Cursor automatically creates worktrees when switching branches. Manual worktree management is optional.

---

## Review Checklist

Before approving PR:

### Code Quality

- [ ] Follows TypeScript best practices
- [ ] FSM patterns applied correctly
- [ ] No console.log in production code (use logger)
- [ ] Error handling present
- [ ] No hardcoded values

### Testing

- [ ] Extension activates without errors
- [ ] Feature works as described
- [ ] No regressions in existing features
- [ ] Edge cases handled

### Documentation

- [ ] README updated if public API changed
- [ ] JSDoc comments for new functions
- [ ] CHANGELOG.md entry added

---

## Anti-Patterns to Avoid

### ❌ Don't Do This:

1. **Direct commits to main**

   ```bash
   git commit -m "quick fix"
   git push origin main  # ❌ NO!
   ```

2. **Force push to main**

   ```bash
   git push --force origin main  # ❌ NEVER!
   ```

3. **Merge without squash**

   ```bash
   # This creates messy history with "fix typo" commits
   git merge feat/my-feature  # ❌ Use squash merge
   ```

4. **Large unfocused PRs**
   ```bash
   # PR that does 10 unrelated things
   feat/everything-at-once  # ❌ Break it up
   ```

---

## Success Metrics

### Good Git Hygiene Indicators:

- ✅ Main branch only has meaningful commits
- ✅ Each commit message describes value added
- ✅ PRs are reviewed before merge
- ✅ History is linear (no merge commits)
- ✅ Easy to find when a feature was added
- ✅ Easy to revert if needed

### Warning Signs:

- ⚠️ "fix", "update", "stuff" commit messages
- ⚠️ 50+ commits for a simple feature
- ⚠️ Merge commits in history
- ⚠️ Can't tell what a commit does
- ⚠️ Breaking changes in main

---

## Tools

### GitHub CLI (gh)

```bash
# Install
winget install GitHub.cli

# Authenticate
gh auth login

# Create PR
gh pr create

# List PRs
gh pr list

# Checkout PR
gh pr checkout 123

# Merge PR
gh pr merge 123 --squash
```

### VS Code GitLens Extension

Provides PR management directly in VS Code.

---

## Transition Plan

### Phase 1: Immediate (Next PR)

- Start using feature branches
- Create PRs for review
- Test before merging

### Phase 2: Clean Up (Next Week)

- Review recent commits on main
- Create retroactive PR documentation
- Set up branch protection rules

### Phase 3: Automation (Future)

- CI/CD on PR creation
- Automated tests before merge
- Release automation

---

## Examples

### Example 1: Bug Fix

```bash
# 1. Create branch
git checkout -b fix/action-button-not-working

# 2. Fix and commit
git commit -m "fix: wire action buttons to commands"
git commit -m "test: verify all buttons work"

# 3. Squash
git rebase -i origin/main
# Squash test commit into fix commit

# 4. Create PR
gh pr create --title "fix: action buttons not responding to clicks"

# 5. Test and merge
# User tests, approves, merges
```

### Example 2: Feature

```bash
# 1. Create branch
git checkout -b feat/rune-first-helpers

# 2. Multiple commits during development
git commit -m "feat: add PubSubBroker"
git commit -m "feat: add VSCodePubSubAdapter"
git commit -m "feat: add useApplicationMachine helper"
git commit -m "docs: add migration guide"

# 3. Clean up (optional - can keep logical commits)
# Keep all 4 commits as they're distinct features

# 4. Create PR with full description
gh pr create --title "feat: implement Svelte 5 rune-first helpers"

# 5. Review, test, squash-merge
# Results in: "feat: implement Svelte 5 rune-first helpers (#45)"
```

---

**Status**: Document active, ready for implementation  
**Next Action**: Create feature branch for next work item

---

_End of Git Workflow Strategy_
