# Release Automation Workflow Diagram

This document provides a visual representation of the automated release process.

## Complete Automation Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DEVELOPER WORKFLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

1. Developer creates feature branch
   └─> Makes changes
       └─> Commits with conventional commits
           └─> Creates Pull Request

2. Pull Request merged to main
   └─> Triggers CI Workflow
       │
       ├─> Build & Test Job
       │   ├─> Linting
       │   ├─> Type checking
       │   ├─> Unit tests
       │   └─> Build validation
       │
       ├─> Release Check Job (Quality Gates)
       │   ├─> Unit Tests (20 pts)
       │   ├─> Code Coverage (50 pts)
       │   ├─> Linting (10 pts)
       │   ├─> Type Checking (5 pts)
       │   ├─> Documentation (5 pts)
       │   └─> Security (10 pts)
       │   └─> Requires 30/100 minimum
       │
       ├─> Integration Tests Job
       │   └─> Run integration tests
       │
       └─> Version Bump & Tag Job ⭐ (AUTOMATED RELEASE)
           ├─> Analyze commits since last tag
           │   ├─> feat: → minor bump
           │   ├─> fix: → patch bump
           │   └─> BREAKING CHANGE: → major bump
           │
           ├─> Apply VS Code convention
           │   └─> Ensure even minor version
           │
           ├─> Update files
           │   ├─> package.json
           │   ├─> package-lock.json
           │   └─> CHANGELOG.md
           │
           ├─> Create release commit
           │   └─> "chore(release): X.Y.Z"
           │
           ├─> Create and push tag (with retry)
           │   ├─> Attempt 1
           │   ├─> Attempt 2 (if failed)
           │   └─> Attempt 3 (if failed)
           │
           ├─> Verify tag on remote
           │   └─> Wait 10s and check
           │
           └─> On failure → Create GitHub Issue
               └─> Notify team of failure

3. Tag pushed (vX.Y.Z)
   └─> Triggers Release Workflow
       │
       ├─> Verify Release Job
       │   └─> Check tag is on main branch
       │
       └─> Build, Package & Publish Job
           ├─> Checkout at tagged commit
           ├─> Install dependencies (npm ci)
           ├─> Build extension (npm run build)
           ├─> Create VSIX package (npm run package:vsix)
           │   └─> azuredevops-integration-extension-X.Y.Z.vsix
           │
           ├─> Create GitHub Release
           │   ├─> Title: "Release vX.Y.Z"
           │   ├─> Body: Link to CHANGELOG.md
           │   └─> Attach: VSIX file
           │
           └─> Publish to VS Code Marketplace (if VSCE_TOKEN exists)
               └─> Extension updated in marketplace

┌─────────────────────────────────────────────────────────────────────────┐
│                           RESULT                                         │
│  ✅ Version bumped                                                       │
│  ✅ CHANGELOG updated                                                    │
│  ✅ Git tag created                                                      │
│  ✅ GitHub Release created                                               │
│  ✅ VSIX package available                                               │
│  ✅ Extension published to marketplace                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Recovery Flow (If Automated Process Fails)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     MANUAL RECOVERY WORKFLOW                             │
└─────────────────────────────────────────────────────────────────────────┘

Scenario: Release commit created but tag push failed

1. Check GitHub Actions
   └─> Find failed workflow run
       └─> Note: Release commit exists but no tag

2. Run "Fix Missing Tag" Workflow
   ├─> Go to Actions → "Fix Missing Release Tag"
   ├─> Click "Run workflow"
   ├─> Input:
   │   ├─> version: X.Y.Z
   │   └─> commit_sha: abc123...
   └─> Click "Run workflow"

3. Workflow validates and creates tag
   ├─> Verify commit exists
   ├─> Verify commit is on main
   ├─> Create annotated tag
   └─> Push tag to remote

4. Tag push triggers Release Workflow
   └─> Normal release process proceeds
       └─> GitHub Release created
           └─> VSIX published
```

## Version Bumping Decision Tree

```
                    ┌─────────────────┐
                    │  Analyze Commits│
                    │  Since Last Tag │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Check commit    │
                    │ messages        │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
  ┌──────────┐         ┌──────────┐        ┌──────────┐
  │ feat:    │         │ fix:     │        │BREAKING  │
  │ feature  │         │ bug fix  │        │CHANGE:   │
  └────┬─────┘         └────┬─────┘        └────┬─────┘
       │                    │                    │
       │                    │                    │
  ┌────▼─────┐         ┌────▼─────┐        ┌────▼─────┐
  │ MINOR    │         │ PATCH    │        │ MAJOR*   │
  │ bump     │         │ bump     │        │ bump     │
  └────┬─────┘         └────┬─────┘        └────┬─────┘
       │                    │                    │
       │              ┌─────┴─────┐              │
       │              │           │              │
       │         ┌────▼────┐ ┌────▼────┐        │
       │         │1.2.3    │ │1.2.0    │        │
       │         │→ 1.2.4  │ │→ 1.2.1  │        │
       │         └─────────┘ └─────────┘        │
       │                                         │
  ┌────▼──────────────────────┐           ┌─────▼──────┐
  │ Check: Is minor odd?      │           │ Version >= │
  │                           │           │ 1.0.0?     │
  │ Yes: Increment to even    │           │            │
  │ No: Keep as is            │           └──────┬─────┘
  │                           │                  │
  │ Example:                  │            ┌─────┴─────┐
  │ 1.2.3 → 1.3.0 → 1.4.0    │            │           │
  │ (VS Code convention)      │         Yes│           │No
  └───────────────────────────┘            │           │
                                      ┌────▼────┐ ┌────▼────┐
                                      │1.2.3    │ │0.5.3    │
                                      │→ 2.0.0  │ │→ 0.6.0  │
                                      └─────────┘ └─────────┘

  *Major bumps only applied if version >= 1.0.0 AND explicit BREAKING CHANGE marker
```

## Conventional Commits Examples

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CONVENTIONAL COMMIT PATTERNS                      │
└─────────────────────────────────────────────────────────────────────┘

✅ MINOR BUMP (New Feature)
   feat: add timer pause functionality
   feat(auth): implement SSO authentication
   feat(ui): add dark mode support

✅ PATCH BUMP (Bug Fix)
   fix: resolve memory leak in timer
   fix(api): handle null responses correctly
   fix(ui): correct button alignment

✅ MAJOR BUMP (Breaking Change) - Version >= 1.0.0
   feat!: redesign authentication API

   BREAKING CHANGE: Authentication now requires email verification.
   The old phone-based auth is removed.

✅ PATCH BUMP (Documentation/Chore)
   docs: update installation guide
   chore: update dependencies
   style: format code with prettier
   test: add unit tests for timer
   refactor: simplify auth logic

❌ INVALID (No version bump)
   Updated the README
   Fixed a bug
   WIP: working on feature
```

## Quality Gate Scoring

```
┌─────────────────────────────────────────────────────────────────────┐
│                      RELEASE QUALITY GATES                           │
│                        (100 Point Scale)                             │
└─────────────────────────────────────────────────────────────────────┘

Unit Tests                    ████████████████████  20/20
  └─> All tests passing

Code Coverage                 ██████████████████████████████████████████████  50/50
  ├─> Lines Coverage >= 85%   (20 pts)
  ├─> Branches Coverage >= 80% (15 pts)
  └─> Functions Coverage >= 80% (15 pts)

Linting                       ██████████  10/10
  └─> No ESLint errors

Type Checking                 █████  5/5
  └─> No TypeScript errors

Documentation                 █████  5/5
  ├─> README.md exists
  ├─> CHANGELOG.md exists
  └─> CONTRIBUTING.md exists

Security                      ██████████  10/10
  └─> No critical/high vulnerabilities

────────────────────────────────────────────────────────────────────────
TOTAL SCORE                   100/100  ✅ READY FOR RELEASE

Minimum Required: 30/100
Recommended: 70/100
Production Ready: 90/100
```

## Key Files and Their Roles

```
Repository Structure (Release-Related)
│
├── .github/workflows/
│   ├── ci.yml                    ⭐ Main automation workflow
│   │   ├── build-and-test        - Validates code quality
│   │   ├── release-check         - Quality gates (30/100 min)
│   │   ├── integration-tests     - Full integration testing
│   │   └── version-bump-and-tag  - 🤖 AUTOMATED VERSIONING
│   │
│   ├── release.yml               ⭐ Release publishing workflow
│   │   ├── verify-release        - Tag validation
│   │   └── build-package-publish - 🤖 AUTOMATED PUBLISHING
│   │
│   └── fix-missing-tag.yml       🔧 Manual recovery workflow
│
├── scripts/
│   ├── update-changelog.js       - Auto-generate CHANGELOG entries
│   ├── release-check.js          - Quality gate scoring
│   ├── fix-missing-release.sh    - Manual tag creation helper
│   └── fix-missing-tags.sh       - Batch tag recovery
│
├── docs/
│   ├── RELEASE_PROCESS.md        📚 Complete release guide
│   ├── RELEASE_AUTOMATION_SUMMARY.md  📚 Implementation summary
│   ├── RELEASE_WORKFLOW_DIAGRAM.md    📚 This file
│   └── MISSING_RELEASE_FIX.md    📚 Recovery procedures
│
├── package.json                  - Version and scripts
├── CHANGELOG.md                  - Auto-updated changelog
└── README.md                     - User documentation
```

## Timeline of a Typical Release

```
T+0:00    Developer merges PR to main
T+0:01    CI workflow triggered
T+0:05    Build & tests complete
T+0:06    Quality gates pass (85/100)
T+0:07    Commits analyzed: 5 feat, 2 fix, 1 docs
T+0:08    Version bump determined: MINOR (even minor applied)
T+0:09    Files updated: package.json, CHANGELOG.md
T+0:10    Release commit created: "chore(release): 3.2.0"
T+0:11    Tag created and pushed: "v3.2.0"
T+0:12    Tag verified on remote ✓
T+0:13    Release workflow triggered
T+0:15    Extension built
T+0:16    VSIX package created
T+0:17    GitHub Release created
T+0:18    VSIX attached to release
T+0:20    Published to VS Code Marketplace ✓
T+0:25    Extension available to users

Total Time: ~25 minutes (fully automated)
```

## Required Secrets

```
GitHub Repository Secrets
│
├── GITHUB_TOKEN (auto-provided)
│   ├── Create releases
│   ├── Push tags
│   ├── Create issues
│   └── Read/write repository
│
└── VSCE_TOKEN (optional)
    └── Publish to VS Code Marketplace
        ├── Obtained from: dev.azure.com
        ├── Scope: Marketplace (Publish)
        └── Without this: VSIX created but not published
```

## Monitoring Points

```
Monitor Release Health
│
├── GitHub Actions
│   └── https://github.com/plures/azuredevops-integration-extension/actions
│       ├── CI workflow runs (every push)
│       ├── Release workflow runs (every tag)
│       └── Check for failed workflows
│
├── GitHub Releases
│   └── https://github.com/plures/azuredevops-integration-extension/releases
│       ├── Verify releases created
│       ├── Check VSIX attachments
│       └── Review release notes
│
├── VS Code Marketplace
│   └── Search: "Azure DevOps Integration"
│       ├── Verify version updated
│       ├── Check install count
│       └── Monitor ratings/reviews
│
└── GitHub Issues
    └── Filter by label: "release", "automation"
        └── Auto-created on release failures
```

## Best Practices Checklist

```
Before Merging to Main
├── ☑ Use conventional commit messages
├── ☑ Update relevant documentation
├── ☑ Run tests locally
├── ☑ Review PR for breaking changes
└── ☑ Add BREAKING CHANGE marker if needed

After Merge
├── ☑ Monitor CI workflow
├── ☑ Verify tag creation
├── ☑ Check GitHub Release
├── ☑ Verify VSIX attachment
└── ☑ Confirm marketplace update

If Something Fails
├── ☑ Check workflow logs
├── ☑ Review error messages
├── ☑ Use recovery workflow if needed
└── ☑ Document issue for prevention
```

---

**Last Updated**: 2025-11-07  
**Status**: Production Ready ✅  
**Automation Coverage**: 100% 🤖
