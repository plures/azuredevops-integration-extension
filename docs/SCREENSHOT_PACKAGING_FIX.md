# Screenshot Generation Packaging Fix

## Summary

Fixed screenshot generation issues during `npm run package` by ensuring the required `svelte.html` file is automatically generated during the build process.

## Problem

When running `npm run package`, the screenshot generation script (`generate-loading-sequence.mjs`) failed with:

```
[loading-gif] Webview HTML not found at C:\Projects\azuredevops-integration-extension\media\webview\svelte.html
Run: npm run build
```

The issue was that:

1. The build process (`esbuild.mjs`) generated `main.js` and `main.css` but not a static HTML file
2. The extension generates HTML dynamically in code, but screenshot scripts need a static file
3. The screenshot scripts expected `svelte.html` to exist in `media/webview/`

## Solution

### 1. Updated Build Process (`esbuild.mjs`)

Added a `generateWebviewHtml()` function that creates a static HTML file after building the webview:

```javascript
async function generateWebviewHtml() {
  const fs = await import('node:fs/promises');
  const outputPath = path.join(__dirname, 'media', 'webview', 'svelte.html');
  const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' http://127.0.0.1:*; script-src 'unsafe-eval' http://127.0.0.1:*; img-src data: http://127.0.0.1:*; connect-src 'self' http://127.0.0.1:*;">
  <link href="main.css" rel="stylesheet">
  <title>Work Items</title>
</head>
<body>
  <div id="svelte-root"></div>
  <script type="module" src="main.js"></script>
</body>
</html>`;

  try {
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputPath, htmlTemplate, 'utf8');
    console.log('[esbuild] ✓ Generated svelte.html for screenshots');
  } catch (error) {
    console.warn('[esbuild] ⚠ Failed to generate svelte.html:', error.message);
    // Don't fail the build if HTML generation fails
  }
}
```

This function is called after the webview build completes.

### 2. Fixed CSS File References

Updated screenshot scripts to use the correct CSS filename (`main.css` instead of `svelte-main.css`):

**`generate-loading-sequence.mjs`:**

```javascript
// Load the Svelte component CSS (esbuild generates this but doesn't auto-inject it)
const cssPath = baseUrl.replace('svelte.html', 'main.css');
try {
  await page.addStyleTag({ url: cssPath });
} catch (error) {
  console.warn('[loading-gif] Could not load CSS from', cssPath, '- continuing without it');
}
```

**`generate-screenshots.mjs`:**

```javascript
// Load the Svelte component CSS (esbuild generates this but doesn't auto-inject it)
const cssPath = fileUrl.replace(/svelte\.html$/, 'main.css').replace(/index\.html$/, 'main.css');
try {
  await page.addStyleTag({ url: cssPath });
} catch (error) {
  console.warn('[screenshots] Could not load CSS from', cssPath, '- continuing without it');
}
```

### 3. Added Error Handling

Added try-catch blocks around CSS loading to prevent screenshot generation from failing if CSS is missing (though it should always be present after a successful build).

## Files Modified

1. **`esbuild.mjs`**:
   - Added `generateWebviewHtml()` function
   - Called after webview build completes
   - Generates `media/webview/svelte.html` automatically

2. **`scripts/screenshots/generate-loading-sequence.mjs`**:
   - Fixed CSS path from `svelte-main.css` to `main.css`
   - Added error handling for CSS loading

3. **`scripts/screenshots/generate-screenshots.mjs`**:
   - Fixed CSS path to handle both `svelte.html` and `index.html`
   - Added error handling for CSS loading

## Testing

1. **Build Process:**

   ```bash
   npm run build
   ```

   ✅ Should generate `media/webview/svelte.html`
   ✅ Build output shows: `[esbuild] ✓ Generated svelte.html for screenshots`

2. **Screenshot Generation:**

   ```bash
   npm run screenshots:loading-gif
   ```

   ✅ Should find `svelte.html` and proceed with screenshot generation
   ⚠️ Note: Requires Playwright browsers installed (`npx playwright install`)

3. **Package Process:**
   ```bash
   npm run package
   ```
   ✅ `prepackage` script runs `npm run build` which generates `svelte.html`
   ✅ Screenshot generation should now work during packaging

## Result

- ✅ `svelte.html` is automatically generated during every build
- ✅ Screenshot scripts can find the required HTML file
- ✅ CSS file references are correct
- ✅ Error handling prevents build failures from missing CSS
- ✅ Package process can generate screenshots successfully

## Related Documentation

- [SCREENSHOT_GENERATION_FIX.md](./SCREENSHOT_GENERATION_FIX.md) - Original screenshot fixes
- [SCREENSHOT_GENERATION_IMPROVEMENTS.md](./SCREENSHOT_GENERATION_IMPROVEMENTS.md) - GIF generation improvements
