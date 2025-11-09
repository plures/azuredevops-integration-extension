# Screenshot Prerequisites Auto-Install

## Summary

Enhanced screenshot generation scripts to automatically check for and install prerequisites (like Playwright browsers) instead of failing with cryptic error messages.

## Problem

Previously, when running screenshot generation scripts without Playwright browsers installed, the scripts would fail with:

```
browserType.launch: Executable doesn't exist at C:\Users\...\chromium_headless_shell-1194\chrome-win\headless_shell.exe
╔═════════════════════════════════════════════════════════════════════════╗
║ Looks like Playwright Test or Playwright was just installed or updated. ║
║ Please run the following command to download new browsers:              ║
║                                                                         ║
║     npx playwright install                                              ║
║                                                                         ║
║ <3 Playwright Team                                                      ║
╚═════════════════════════════════════════════════════════════════════════╝
```

This required manual intervention and was not user-friendly.

## Solution

### 1. Created Prerequisites Check Utility (`check-prerequisites.mjs`)

Created a reusable utility module that:

- Checks if Playwright browsers are installed
- Automatically installs them if missing
- Provides clear feedback during the process
- Verifies installation success

**Key Features:**

- Detects missing Playwright browsers by attempting to get the executable path
- Automatically runs `npx playwright install chromium` if browsers are missing
- Verifies installation before proceeding
- Provides helpful error messages if installation fails

### 2. Updated Screenshot Scripts

Both screenshot generation scripts now check prerequisites before starting:

**`generate-loading-sequence.mjs`:**

```javascript
import { ensurePrerequisites } from './check-prerequisites.mjs';

async function main() {
  // Check and install prerequisites
  console.log('[loading-gif] Checking prerequisites...');
  const prerequisitesOk = await ensurePrerequisites();
  if (!prerequisitesOk) {
    console.error('[loading-gif] Prerequisites check failed');
    process.exit(1);
  }
  // ... rest of script
}
```

**`generate-screenshots.mjs`:**

```javascript
import { ensurePrerequisites } from './check-prerequisites.mjs';

async function main() {
  // Check and install prerequisites
  console.log('[screenshots] Checking prerequisites...');
  const prerequisitesOk = await ensurePrerequisites();
  if (!prerequisitesOk) {
    console.error('[screenshots] Prerequisites check failed');
    process.exit(1);
  }
  // ... rest of script
}
```

## Implementation Details

### Prerequisites Check Function

The `checkPlaywrightBrowsers()` function:

1. Attempts to get the Chromium executable path using `chromium.executablePath()`
2. Verifies the file actually exists on disk
3. Returns `false` if browsers aren't installed (catches the expected error)
4. Re-throws unexpected errors for debugging

### Auto-Installation

The `installPlaywrightBrowsers()` function:

1. Runs `npx playwright install chromium` with inherited stdio
2. Provides progress feedback during installation
3. Returns success/failure status
4. Includes helpful error messages with manual installation instructions

### Verification

After installation, the script:

1. Re-checks that browsers are now available
2. Provides clear success/failure feedback
3. Exits gracefully if verification fails

## User Experience

### Before

```
❌ Error: Executable doesn't exist...
   (User must manually run: npx playwright install)
```

### After

```
[prerequisites] Checking prerequisites...
[prerequisites] Playwright browsers not found
[prerequisites] Installing Playwright browsers...
[prerequisites] This may take a few minutes on first run...
✓ Playwright browsers installed successfully
[prerequisites] ✓ Playwright browsers verified
[loading-gif] Starting screenshot generation...
```

## Files Modified

1. **`scripts/screenshots/check-prerequisites.mjs`** (new):
   - Prerequisites checking and installation utility
   - Can be run standalone or imported by other scripts
   - Exports `ensurePrerequisites()` function

2. **`scripts/screenshots/generate-loading-sequence.mjs`**:
   - Added prerequisite check at start of `main()` function
   - Imports and calls `ensurePrerequisites()`

3. **`scripts/screenshots/generate-screenshots.mjs`**:
   - Added prerequisite check at start of `main()` function
   - Imports and calls `ensurePrerequisites()`

## Testing

### Test Prerequisites Check

```bash
# Run the prerequisites check directly
node scripts/screenshots/check-prerequisites.mjs
```

**Expected output if browsers are installed:**

```
[prerequisites] ✓ Playwright browsers already installed
[prerequisites] ✓ All prerequisites are available
```

**Expected output if browsers are missing:**

```
[prerequisites] Playwright browsers not found
[prerequisites] Installing Playwright browsers...
[prerequisites] This may take a few minutes on first run...
✓ Playwright browsers installed successfully
[prerequisites] ✓ Playwright browsers verified
[prerequisites] ✓ All prerequisites are available
```

### Test Screenshot Generation

```bash
# This will now auto-install Playwright if needed
npm run screenshots:loading-gif
npm run screenshots:capture
```

## Benefits

1. **Better User Experience**: No more cryptic error messages
2. **Automatic Setup**: Prerequisites install automatically
3. **Clear Feedback**: Users see what's happening during installation
4. **Graceful Failure**: Helpful error messages if installation fails
5. **Reusable**: The check utility can be used by other scripts

## Future Enhancements

Potential additions to the prerequisites check:

- Check for other dependencies (gifenc, pngjs)
- Check for required build artifacts (svelte.html)
- Check for sufficient disk space
- Cache prerequisite status to avoid repeated checks

## Related Documentation

- [SCREENSHOT_PACKAGING_FIX.md](./SCREENSHOT_PACKAGING_FIX.md) - HTML file generation fix
- [SCREENSHOT_GENERATION_FIX.md](./SCREENSHOT_GENERATION_FIX.md) - Original screenshot fixes
- [SCREENSHOT_GENERATION_IMPROVEMENTS.md](./SCREENSHOT_GENERATION_IMPROVEMENTS.md) - GIF generation improvements
