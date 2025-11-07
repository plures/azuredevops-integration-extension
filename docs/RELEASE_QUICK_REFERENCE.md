# Release Automation Quick Reference

**TL;DR**: Use conventional commits. Releases happen automatically when you merge to main. 🤖

## For Contributors

### Commit Message Format

```bash
# New feature (minor version bump)
git commit -m "feat: add timer pause button"

# Bug fix (patch version bump)
git commit -m "fix: resolve authentication timeout"

# Breaking change (major version bump, only if version >= 1.0.0)
git commit -m "feat!: redesign settings API

BREAKING CHANGE: Old settings format no longer supported"
```

### What Happens When You Merge

1. ✅ CI builds and tests your code
2. ✅ Quality checks run (30/100 minimum score required)
3. ✅ Version is automatically bumped
4. ✅ CHANGELOG.md is automatically updated
5. ✅ Release commit and tag are created
6. ✅ GitHub Release is published with VSIX
7. ✅ Extension is published to VS Code Marketplace

**Time**: ~25 minutes from merge to marketplace

## For Maintainers

### Check Release Status

```bash
# View recent releases
gh release list

# Check workflow status
gh run list --workflow=ci.yml
gh run list --workflow=release.yml

# View latest tag
git describe --tags --abbrev=0
```

### Manual Recovery (If Automation Fails)

```bash
# Option 1: Use GitHub Actions UI
# Go to: Actions → "Fix Missing Release Tag" → Run workflow

# Option 2: Use provided script
./scripts/fix-missing-release.sh

# Option 3: Manual tag creation
git tag -a v3.0.7 <commit-sha> -m "Release v3.0.7"
git push origin v3.0.7
```

## Version Bumping Rules

| Commit Type | Version Change | Example |
|-------------|----------------|---------|
| `feat:` | 1.0.0 → 1.2.0 (even minor) | New feature |
| `fix:` | 1.0.0 → 1.0.1 | Bug fix |
| `feat!:` or `BREAKING CHANGE:` | 1.0.0 → 2.0.0 | Breaking change (if >= 1.0.0) |
| `docs:`, `chore:`, `style:` | 1.0.0 → 1.0.1 | Patch bump |

**Note**: Minor versions are always even numbers (VS Code convention)

## Required Secrets

Configure in GitHub repository settings → Secrets:

- **GITHUB_TOKEN** - Auto-provided by GitHub
- **VSCE_TOKEN** - Optional, for marketplace publishing
  - Get from: https://dev.azure.com
  - Scope: Marketplace (Publish)

## Common Issues

### No release created after merge
**Cause**: Tag push may have failed  
**Fix**: Check Actions logs, use "Fix Missing Tag" workflow

### Release created but not on marketplace
**Cause**: Missing or expired VSCE_TOKEN  
**Fix**: Update VSCE_TOKEN secret

### Wrong version bump
**Cause**: Incorrect commit message format  
**Fix**: Version is already bumped, make a follow-up commit with correct type

## Quality Gates

Minimum requirements for release (30/100 points):
- ✅ Unit tests pass (20 pts)
- ✅ Code coverage > basic threshold (50 pts)
- ✅ No linting errors (10 pts)
- ✅ Type checking passes (5 pts)
- ✅ Docs exist (5 pts)
- ✅ No critical vulnerabilities (10 pts)

## Quick Links

- 📚 [Full Release Process Guide](./RELEASE_PROCESS.md)
- 📊 [Workflow Diagrams](./RELEASE_WORKFLOW_DIAGRAM.md)
- 📝 [Implementation Summary](./RELEASE_AUTOMATION_SUMMARY.md)
- 🔧 [Recovery Procedures](./MISSING_RELEASE_FIX.md)
- 🎯 [GitHub Actions](https://github.com/plures/azuredevops-integration-extension/actions)
- 📦 [Releases](https://github.com/plures/azuredevops-integration-extension/releases)

## Examples

### Single Feature

```bash
git checkout -b feature/add-pause-button
# ... make changes ...
git commit -m "feat: add pause button to timer"
# Create PR and merge
# Result: Version 3.0.6 → 3.2.0 (minor bump with even adjustment)
```

### Bug Fix

```bash
git checkout -b fix/timer-reset
# ... make changes ...
git commit -m "fix: resolve timer reset issue"
# Create PR and merge
# Result: Version 3.2.0 → 3.2.1 (patch bump)
```

### Multiple Commits

```bash
git checkout -b feature/authentication
git commit -m "feat: add OAuth support"
git commit -m "fix: resolve token expiry"
git commit -m "docs: update auth documentation"
# Create PR and merge
# Result: Version 3.2.1 → 3.4.0 (minor bump, highest priority wins)
```

## Monitoring

Watch for automated issue creation:
- Label: `release`, `automation`
- Auto-created when tagging fails
- Contains workflow run details and recovery steps

---

**Status**: Fully Automated ✅  
**Last Updated**: 2025-11-07  
**Contact**: Open an issue if you need help
