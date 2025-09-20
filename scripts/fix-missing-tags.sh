#!/bin/bash

# Fix Missing Release Tags Script
# 
# This script addresses workflow automation issues where release commits exist
# but corresponding tags weren't pushed, preventing release workflows from triggering.
#
# Usage: ./scripts/fix-missing-tags.sh
#

set -e

echo "🔍 Analyzing repository for missing release tags..."

# Get current branch
current_branch=$(git branch --show-current)
echo "Current branch: $current_branch"

# Fetch latest tags and refs
echo "📥 Fetching latest tags and refs..."
git fetch --tags --force
git fetch origin

# Find release commits that don't have corresponding tags
echo "🔍 Looking for release commits without tags..."

missing_tags=()

# Check all commits with release messages
while IFS= read -r line; do
    if [ -n "$line" ]; then
        commit_hash=$(echo "$line" | cut -d' ' -f1)
        commit_msg=$(echo "$line" | cut -d' ' -f2-)
        
        # Extract version from commit message
        if [[ "$commit_msg" =~ chore\(release\):\ ([0-9]+\.[0-9]+\.[0-9]+) ]]; then
            version="${BASH_REMATCH[1]}"
            tag_name="v$version"
            
            echo "📋 Found release commit: $commit_hash -> $version"
            
            # Check if tag exists
            if git rev-parse "$tag_name" >/dev/null 2>&1; then
                echo "  ✅ Tag $tag_name already exists locally"
                
                # Check if tag exists on remote
                if git ls-remote --tags origin | grep -q "refs/tags/$tag_name"; then
                    echo "  ✅ Tag $tag_name exists on remote"
                else
                    echo "  ⚠️  Tag $tag_name missing on remote"
                    missing_tags+=("$tag_name:$commit_hash")
                fi
            else
                echo "  ❌ Tag $tag_name missing locally and on remote"
                missing_tags+=("$tag_name:$commit_hash")
            fi
        fi
    fi
done < <(git log --oneline --grep="chore(release)" --all)

# Create missing tags
if [ ${#missing_tags[@]} -eq 0 ]; then
    echo "✅ No missing tags found!"
    exit 0
fi

echo ""
echo "🏷️  Creating missing tags..."

for tag_info in "${missing_tags[@]}"; do
    tag_name=$(echo "$tag_info" | cut -d':' -f1)
    commit_hash=$(echo "$tag_info" | cut -d':' -f2)
    version=${tag_name#v}
    
    echo "📋 Creating tag $tag_name for commit $commit_hash..."
    
    # Verify the package.json version matches
    package_version=$(git show "$commit_hash:package.json" | grep '"version"' | sed 's/.*"version": "\([^"]*\)".*/\1/')
    
    if [[ "$package_version" != "$version" ]]; then
        echo "  ⚠️  WARNING: Package version ($package_version) doesn't match tag version ($version)"
    else
        echo "  ✅ Package version confirmed: $package_version"
    fi
    
    # Create the tag if it doesn't exist locally
    if ! git rev-parse "$tag_name" >/dev/null 2>&1; then
        git tag -a "$tag_name" "$commit_hash" -m "Release $tag_name

This tag was created to fix the missing release for version $version.
The CI workflow successfully created the release commit but failed to push the tag.

Release commit: $commit_hash
Package version: $package_version
Created by: fix-missing-tags.sh"
        echo "  ✅ Tag $tag_name created locally"
    fi
    
    # Check if we should push the tag
    if git ls-remote --tags origin | grep -q "refs/tags/$tag_name"; then
        echo "  ✅ Tag $tag_name already exists on remote"
    else
        echo "  🚀 Tag $tag_name needs to be pushed to remote"
        echo "     Run: git push origin $tag_name"
        echo "     This will trigger the release workflow automatically"
    fi
    
    echo ""
done

echo "📋 Summary of missing tags:"
for tag_info in "${missing_tags[@]}"; do
    tag_name=$(echo "$tag_info" | cut -d':' -f1)
    commit_hash=$(echo "$tag_info" | cut -d':' -f2)
    echo "  - $tag_name (commit: $commit_hash)"
done

echo ""
echo "🔧 To push all missing tags and trigger releases:"
echo "git push origin --tags"
echo ""
echo "⚠️  WARNING: Only run this if you have write access to the repository!"
echo "⚠️  This will trigger release workflows for all missing tags."
echo ""
echo "📋 Monitor releases at:"
echo "- Workflow runs: https://github.com/plures/azuredevops-integration-extension/actions"
echo "- Releases: https://github.com/plures/azuredevops-integration-extension/releases"