#!/bin/bash

# Fix Missing v1.3.0 Release Script
# 
# This script addresses issue #19 where the recent PR merge to main created a 
# release commit (chore(release): 1.3.0) but failed to push the corresponding tag,
# preventing the release workflow from triggering.
#
# The issue: 
# - package.json shows version 1.3.0
# - Commit 3ca0655d73b0c38d37ce35337af5e8f58bf94e4c exists with "chore(release): 1.3.0"
# - No v1.3.0 tag exists in the repository
# - Release workflow is triggered only by tags matching 'v*'
#
# The solution:
# - Create v1.3.0 tag pointing to the release commit
# - Push the tag to trigger the release workflow
#

set -e

echo "🔍 Checking repository state..."

# Verify we're on the correct commit
CURRENT_COMMIT=$(git rev-parse HEAD)
RELEASE_COMMIT="3ca0655d73b0c38d37ce35337af5e8f58bf94e4c"

if [[ "$CURRENT_COMMIT" != "$RELEASE_COMMIT" ]]; then
    echo "❌ Not on release commit. Checking out release commit..."
    git checkout "$RELEASE_COMMIT"
fi

# Verify package.json version
PACKAGE_VERSION=$(node -p "require('./package.json').version")
if [[ "$PACKAGE_VERSION" != "1.3.0" ]]; then
    echo "❌ Package version is not 1.3.0, got: $PACKAGE_VERSION"
    exit 1
fi

echo "✅ Package version confirmed: $PACKAGE_VERSION"

# Check if tag already exists
if git rev-parse v1.3.0 >/dev/null 2>&1; then
    echo "ℹ️  Tag v1.3.0 already exists locally"
    git show v1.3.0 --no-patch
else
    echo "📋 Creating tag v1.3.0..."
    git tag -a v1.3.0 "$RELEASE_COMMIT" -m "Release v1.3.0

This tag was created to fix the missing release for version 1.3.0.
The CI workflow successfully created the release commit but failed to push the tag.

Release commit: $RELEASE_COMMIT
Package version: $PACKAGE_VERSION
"
    echo "✅ Tag v1.3.0 created"
fi

# Check if tag exists on remote
if git ls-remote --tags origin | grep -q "refs/tags/v1.3.0"; then
    echo "✅ Tag v1.3.0 already exists on remote"
else
    echo "🚀 Pushing tag v1.3.0 to trigger release workflow..."
    git push origin v1.3.0
    echo "✅ Tag pushed successfully!"
    echo ""
    echo "📋 Release workflow should now be triggered automatically."
    echo "Check: https://github.com/plures/azuredevops-integration-extension/actions"
fi

echo ""
echo "🎉 Fix complete! The v1.3.0 release should be created automatically."
echo ""
echo "Expected outcomes:"
echo "- GitHub release created with tag v1.3.0"
echo "- VSIX artifact attached to the release" 
echo "- Extension published to VS Code Marketplace (if VSCE_TOKEN is configured)"