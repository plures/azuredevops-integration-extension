# Release Process Documentation

This document describes the automated release process for the Azure DevOps Integration extension.

## Overview

The release process is **fully automated** using GitHub Actions workflows. When code is merged to the `main` branch, the following happens automatically:

1. **Version Bumping**: Analyzes commit messages and bumps the version
2. **Changelog Update**: Automatically updates CHANGELOG.md
3. **Tag Creation**: Creates a git tag for the new version
4. **Release Creation**: Creates a GitHub release with VSIX package
5. **Marketplace Publishing**: Publishes to VS Code Marketplace (if configured)

## Automated Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Trigger**: Push to `main` branch or Pull Request

**Jobs**:

- **build-and-test**: Runs linting, builds, and tests
- **release-check**: Validates release readiness (scoring system)
- **integration-tests**: Runs integration tests
- **version-bump-and-tag**: Automatically bumps version and creates tags

#### Version Bumping Logic

The automation follows **Conventional Commits** to determine version bumps:

| Commit Type                               | Version Bump  | Example                  |
| ----------------------------------------- | ------------- | ------------------------ |
| `feat:` or `feat(scope):`                 | Minor (x.Y.0) | `feat: add new feature`  |
| `fix:` or `fix(scope):`                   | Patch (x.y.Z) | `fix: resolve bug`       |
| `BREAKING CHANGE:` in body or `!` in type | Major (X.0.0) | `feat!: breaking change` |
| `docs:`, `chore:`, `style:`, etc.         | Patch (x.y.Z) | `docs: update readme`    |

**Special Rules**:

- **VS Code Convention**: Minor versions are always even numbers for releases
  - If bump would result in odd minor version, it's incremented to next even number
  - Example: `1.3.0` → `1.4.0` instead of `1.3.0`
- **Major Bumps**: Only applied if current version >= 1.0.0 and explicit BREAKING CHANGE marker present
- **Pre-1.0.0**: BREAKING CHANGE bumps minor version, not major

#### Release Readiness Scoring

The `release-check` job validates quality with a 100-point scoring system:

| Category      | Points | Requirement                               |
| ------------- | ------ | ----------------------------------------- |
| Unit Tests    | 20     | All tests must pass                       |
| Code Coverage | 50     | Lines: 85%, Branches: 80%, Functions: 80% |
| Linting       | 10     | No linting errors                         |
| Type Checking | 5      | No TypeScript errors                      |
| Documentation | 5      | README, CHANGELOG, CONTRIBUTING exist     |
| Security      | 10     | No critical/high vulnerabilities          |

**Minimum Score**: 30/100 to proceed with release

### 2. Release Workflow (`.github/workflows/release.yml`)

**Trigger**: Push of version tags (e.g., `v3.0.6`)

**Jobs**:

- **verify-release**: Ensures tag is on main branch
- **build-package-and-publish**: Builds, packages, and publishes

**Steps**:

1. Checkout code at tagged commit
2. Install dependencies (`npm ci`)
3. Build extension (`npm run build`)
4. Create VSIX package (`npm run package:vsix`)
5. Create GitHub Release with:
   - Release title: `Release v{version}`
   - Release body: Link to CHANGELOG.md
   - Attached file: `azuredevops-integration-extension-{version}.vsix`
6. Publish to VS Code Marketplace (if `VSCE_TOKEN` secret exists)

### 3. Fix Missing Tag Workflow (`.github/workflows/fix-missing-tag.yml`)

**Trigger**: Manual workflow dispatch

**Purpose**: Recovery mechanism for when automated tagging fails

**Inputs**:

- `version`: Version tag to create (e.g., `3.0.6`)
- `commit_sha`: Commit SHA to tag

**Use Case**: If the CI workflow creates a release commit but tag push fails

## How to Release

### Normal Release (Automated)

1. **Create Feature Branch**:

   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make Changes**: Implement your feature/fix

3. **Commit with Conventional Commits**:

   ```bash
   # For new features (minor bump)
   git commit -m "feat: add new time tracking feature"

   # For bug fixes (patch bump)
   git commit -m "fix: resolve timer sync issue"

   # For breaking changes (major bump, if version >= 1.0.0)
   git commit -m "feat!: redesign API

   BREAKING CHANGE: The old API is no longer supported"
   ```

4. **Push and Create PR**:

   ```bash
   git push origin feature/my-feature
   ```

5. **Merge PR**: When PR is merged to `main`, automation takes over:
   - CI runs build, tests, and quality checks
   - Version is bumped based on commits
   - CHANGELOG.md is updated
   - Release commit is created
   - Tag is created and pushed
   - Release workflow is triggered
   - GitHub release is created
   - Extension is published to marketplace

### Emergency/Manual Release

If automated release fails, use the manual recovery workflow:

1. **Identify the Release Commit**:

   ```bash
   git log --oneline | grep "chore(release)"
   ```

2. **Run Manual Workflow**:
   - Go to Actions → "Fix Missing Release Tag"
   - Click "Run workflow"
   - Enter version (e.g., `3.0.6`)
   - Enter commit SHA
   - Click "Run workflow"

3. **Verify**: Check that release is created

## Required Secrets

For full automation, configure these GitHub secrets:

| Secret         | Required            | Purpose                           |
| -------------- | ------------------- | --------------------------------- |
| `GITHUB_TOKEN` | Yes (auto-provided) | Creating releases, pushing tags   |
| `VSCE_TOKEN`   | No                  | Publishing to VS Code Marketplace |

### Getting VSCE_TOKEN

To publish to VS Code Marketplace:

1. Create a Personal Access Token at https://dev.azure.com
2. Organization: Select your publisher organization
3. Expiration: Set appropriate expiration
4. Scopes: Select "Marketplace (Publish)"
5. Add token to GitHub Secrets as `VSCE_TOKEN`

## Workflow Permissions

The workflows require these GitHub permissions (configured in workflow files):

```yaml
permissions:
  contents: write # For creating tags and releases
  issues: write # For creating failure notifications
```

## Changelog Management

CHANGELOG.md is automatically updated by the `update-changelog.js` script:

**Commit Categories**:

- `feat:` → "### Added"
- `fix:` → "### Fixed"
- `refactor:`, `style:` → "### Changed"
- `docs:` → "### Documentation"
- `test:`, `chore:` → "### Developer Experience"
- Others → "### Other"

**Format**:

```markdown
## [version] - YYYY-MM-DD

### Added

- New feature description

### Fixed

- Bug fix description
```

## Troubleshooting

### Release Not Created

**Symptom**: Commit merged but no release appeared

**Checks**:

1. Check if release commit was created:

   ```bash
   git log --oneline | grep "chore(release)"
   ```

2. Check if tag exists:

   ```bash
   git tag -l | grep v3.0
   ```

3. Check GitHub Actions logs

**Solution**: Use the "Fix Missing Tag" workflow

### Tag Exists But No Release

**Symptom**: Tag exists but GitHub release missing

**Checks**:

1. Check Release workflow logs
2. Verify tag is on main branch:
   ```bash
   git branch --contains <tag-name>
   ```

**Solution**: Delete and recreate tag (if not on main), or manually create release

### Marketplace Publish Failed

**Symptom**: GitHub release created but not on marketplace

**Checks**:

1. Verify `VSCE_TOKEN` secret exists and is valid
2. Check Release workflow logs for publish step
3. Verify publisher name matches in package.json

**Solution**:

- Update VSCE_TOKEN if expired
- Manually publish: `vsce publish --packagePath <vsix-file> --pat <token>`

## Version Strategy

Current version: **3.0.6**

**Versioning Scheme**: MAJOR.MINOR.PATCH

- **MAJOR** (3): Incremented for breaking changes (rare, currently frozen at 3)
- **MINOR** (0, 2, 4, ...): New features (always even for releases)
- **PATCH** (0-9): Bug fixes and minor improvements

**Example Progression**:

- `3.0.6` → `3.0.7` (patch: bug fix)
- `3.0.7` → `3.2.0` (minor: new feature, skipping odd 1)
- `3.2.0` → `4.0.0` (major: breaking change, only if version >= 1.0.0)

## Testing the Release Process

To test without triggering a real release:

1. **Test Build Locally**:

   ```bash
   npm run build
   npm run package:vsix
   ```

2. **Test Release Check**:

   ```bash
   npm run release-check
   ```

3. **Test in Fork**: Create a fork and test full workflow there

## Monitoring

Monitor releases through:

1. **GitHub Actions**: https://github.com/plures/azuredevops-integration-extension/actions
2. **Releases Page**: https://github.com/plures/azuredevops-integration-extension/releases
3. **Marketplace**: Search for "Azure DevOps Integration" in VS Code

## Best Practices

1. **Always use conventional commits** for clear version bumping
2. **Keep CHANGELOG manually curated** for major releases
3. **Test VSIX locally** before expecting marketplace publish
4. **Monitor first few automated releases** after setup changes
5. **Document breaking changes** clearly in commit messages
6. **Use PR descriptions** to document changes for CHANGELOG

## Related Documentation

- [MISSING_RELEASE_FIX.md](./MISSING_RELEASE_FIX.md) - Recovery from failed releases
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [CHANGELOG.md](../CHANGELOG.md) - Version history
