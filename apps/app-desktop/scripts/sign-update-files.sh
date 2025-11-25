#!/bin/bash

# Sign update files for Tauri updater
# This script signs the update bundles and generates signature files

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PRIVATE_KEY_PATH="${TAURI_SIGNING_KEY:-~/.tauri/azuredevops-integration.key}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 Signing update files...${NC}"

# Check if private key exists
if [ ! -f "$PRIVATE_KEY_PATH" ]; then
    echo -e "${RED}❌ Private key not found at: $PRIVATE_KEY_PATH${NC}"
    echo -e "${YELLOW}💡 Generate a keypair with: npx tauri signer generate -w $PRIVATE_KEY_PATH${NC}"
    exit 1
fi

# Find all update bundles
BUNDLE_DIR="$PROJECT_ROOT/src-tauri/target/release/bundle"

if [ ! -d "$BUNDLE_DIR" ]; then
    echo -e "${RED}❌ Bundle directory not found: $BUNDLE_DIR${NC}"
    echo -e "${YELLOW}💡 Build the app first with: npm run tauri build${NC}"
    exit 1
fi

# Sign each bundle type
sign_bundle() {
    local bundle_type=$1
    local extension=$2

    echo -e "${GREEN}📦 Signing $bundle_type bundles...${NC}"

    find "$BUNDLE_DIR" -name "*.$extension" -type f | while read -r file; do
        if [ -f "$file" ]; then
            echo "  Signing: $(basename "$file")"
            npx tauri signer sign "$PRIVATE_KEY_PATH" "$file" || {
                echo -e "${RED}❌ Failed to sign: $file${NC}"
                exit 1
            }
        fi
    done
}

# Sign different bundle types
sign_bundle "MSI" "msi"
sign_bundle "DMG" "dmg"
sign_bundle "App" "app.tar.gz"
sign_bundle "AppImage" "AppImage.tar.gz"
sign_bundle "DEB" "deb"
sign_bundle "RPM" "rpm"

echo -e "${GREEN}✅ All update files signed successfully!${NC}"
