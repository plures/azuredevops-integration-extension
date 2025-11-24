# Auto-Update Feature Setup

This guide explains how to configure and use the auto-update feature in the Azure DevOps Integration desktop application.

## ⚠️ Required Pre-Distribution Setup

Before distributing the application, you **MUST**:
1. Generate a signing key pair (see [Setup Steps](#setup-steps) below)
2. Add the public key to `tauri.conf.json`
3. Sign all update bundles before uploading to releases

**The `pubkey` field in `tauri.conf.json` is currently empty as a placeholder. Updates will NOT be verified without a valid public key configured.**

## 🎯 Overview

The auto-update feature allows the application to:
- ✅ Automatically check for updates (enabled by default)
- ✅ Download and install updates automatically
- ✅ Show update notifications to users
- ✅ Allow users to toggle auto-update on/off via Settings

## 📋 Features

### Auto-Update Service
- Checks for updates every hour (when enabled)
- Automatically checks on app startup (if enabled)
- Respects user preference (stored persistently)

### Settings Store
- **Auto-Update Toggle**: Enable/disable automatic updates
- Persistent settings using Tauri's store plugin

## ⚙️ Configuration

### Updater Configuration (`src-tauri/tauri.conf.json`)

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/plures/azuredevops-integration-extension/releases/download/latest/latest.json"
      ],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

### Using GitHub Releases

The application uses GitHub Releases for hosting updates. The project includes automated workflows to generate update manifests.

#### Setup Steps

1. **Generate Signing Key**
   ```bash
   npx tauri signer generate -w ~/.tauri/azuredevops-integration.key
   npx tauri signer generate -w ~/.tauri/azuredevops-integration.key --print-public-key
   ```
   Copy the public key and add it to `tauri.conf.json` as `pubkey`.

2. **Create a GitHub Release**
   - Build your app: `npm run tauri build`
   - Sign update files: `bash scripts/sign-update-files.sh`
   - Create a new release on GitHub (tag: `v0.1.0`, etc.)
   - Upload signed bundles (.msi, .dmg, .AppImage, etc.) and their .sig files

3. **Generate Update Manifest**
   - The `.github/workflows/desktop-update-manifest.yml` workflow automatically:
     - Generates the manifest JSON
     - Uploads it to the release
   - Or run manually: `node scripts/generate-update-manifest.js`

#### Update Manifest Format

The generated manifest follows this format:
```json
{
  "version": "0.1.1",
  "notes": "Bug fixes and improvements",
  "pub_date": "2024-01-15T12:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "signature_from_sig_file",
      "url": "https://github.com/plures/azuredevops-integration-extension/releases/download/v0.1.1/Azure_DevOps_Integration_0.1.1_x64_en-US.msi"
    },
    "darwin-x86_64": {
      "signature": "signature_from_sig_file",
      "url": "https://github.com/plures/azuredevops-integration-extension/releases/download/v0.1.1/Azure_DevOps_Integration_0.1.1_x64.dmg"
    },
    "darwin-aarch64": {
      "signature": "signature_from_sig_file",
      "url": "https://github.com/plures/azuredevops-integration-extension/releases/download/v0.1.1/Azure_DevOps_Integration_0.1.1_aarch64.dmg"
    },
    "linux-x86_64": {
      "signature": "signature_from_sig_file",
      "url": "https://github.com/plures/azuredevops-integration-extension/releases/download/v0.1.1/Azure_DevOps_Integration_0.1.1_amd64.AppImage.tar.gz"
    }
  }
}
```

## 🔧 Usage

### For Users

1. **Toggle Auto-Update**
   - Use the settings to enable/disable auto-updates
   - Setting is saved automatically

2. **Manual Update Check**
   - App can check for updates on demand
   - Notification appears when update is available

3. **Install Updates**
   - When update is available, user can install it
   - App downloads, installs, and restarts automatically

### For Developers

#### Testing Auto-Update

1. **Local Testing**
   ```bash
   # Build app
   cd apps/app-desktop
   npm run tauri build
   
   # Serve update manifest locally (for testing)
   # Update endpoint in tauri.conf.json to point to local server
   ```

2. **Update Flow**
   - Increment version in `src-tauri/tauri.conf.json`
   - Build new version
   - Sign update files
   - Upload to GitHub Release
   - Update manifest JSON

#### Disable Auto-Update (Development)

Set in `src-tauri/tauri.conf.json`:
```json
{
  "plugins": {
    "updater": {
      "active": false
    }
  }
}
```

## 📁 File Structure

```
apps/app-desktop/
├── src/
│   └── lib/
│       ├── stores/
│       │   └── settings.ts          # Settings store with persistence
│       └── services/
│           └── updater.ts           # Auto-update service
├── scripts/
│   ├── generate-update-manifest.js  # Manifest generation script
│   └── sign-update-files.sh         # Bundle signing script
└── src-tauri/
    ├── tauri.conf.json              # Updater configuration
    └── capabilities/
        └── desktop.json             # Updater permissions
```

## 🔐 Security

- **Code Signing**: Updates must be signed with your private key
- **Public Key**: Stored in `tauri.conf.json` for verification
- **HTTPS**: Update endpoints should use HTTPS
- **Signature Verification**: Tauri verifies signatures before installing

## 🐛 Troubleshooting

### Auto-Update Not Working

1. **Check Configuration**
   - Verify `updater.active` is `true` in `tauri.conf.json`
   - Check endpoint URL is correct
   - Ensure public key is set

2. **Check Permissions**
   - Verify `updater:default` permission in `desktop.json`
   - Check app has network access

3. **Check Logs**
   - Open DevTools (F12) to see update check logs
   - Check console for errors

### Settings Not Persisting

- Verify `store:default` permission is in `desktop.json`
- Check browser console for store errors
- Settings are stored in `.settings.dat` file

### Update Check Fails

- Verify update server is accessible
- Check endpoint URL format matches expected pattern
- Ensure update manifest JSON is valid
- Check network connectivity

## 🔄 Release Workflow

### Automated Release Process

1. **Build and Sign**
   ```bash
   cd apps/app-desktop
   npm run tauri build
   bash scripts/sign-update-files.sh
   ```

2. **Create GitHub Release**
   - Tag: `v0.1.0` (matches version in tauri.conf.json)
   - Upload all signed bundles (.msi, .dmg, .AppImage, etc.)
   - Upload corresponding .sig files

3. **Manifest Generation**
   - The `desktop-update-manifest.yml` workflow automatically:
     - Generates `latest.json` manifest
     - Points to GitHub Releases download URLs
     - Uploads manifest to release

## ✅ Setup Checklist

- [x] Updater plugin installed (Cargo.toml)
- [x] Updater plugin registered (lib.rs)
- [x] Updater permissions added (capabilities/desktop.json)
- [x] Frontend updater service created
- [x] Settings persistence configured
- [x] Manifest generation script created
- [x] GitHub workflow for manifests created
- [ ] Signing keys generated (one-time setup)
- [ ] Public key added to tauri.conf.json
- [ ] Update endpoint configured
- [ ] End-to-end update flow tested

## 📚 Resources

- [Tauri Updater Documentation](https://v2.tauri.app/plugin/updater/)
- [Tauri Signer Documentation](https://v2.tauri.app/cli/signer/)
- [GitHub Releases API](https://docs.github.com/en/rest/releases/releases)

---

**Note**: The updater endpoint URL and public key in `tauri.conf.json` are placeholders. Update them with your actual values before distribution.
