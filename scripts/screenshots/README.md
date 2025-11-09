# Screenshot Generation

This directory contains scripts for generating screenshots and animated demos of the extension.

## Prerequisites

The screenshot scripts automatically check for and install prerequisites (like Playwright browsers) if they're missing. No manual setup required!

## Static Screenshots

Generate PNG screenshots of list and kanban views:

```bash
npm run screenshots:capture
```

**Note:** Playwright browsers will be automatically installed if missing.

Output: `images/work-items-list.png`, `images/work-items-kanban.png`

## Animated Loading Sequence GIF

Generate an animated GIF showing the complete loading flow:

1. "Initializing extension..." (1 second)
2. "Loading work items..." (1 second)
3. Work items displayed (2 seconds)

```bash
npm run screenshots:loading-gif
```

Output: `images/loading-sequence.gif`

**✅ Fully automated!** No external dependencies required. Uses pure JavaScript libraries (`gifenc` + `pngjs`) to encode the GIF.

Individual frames are also saved to `images/loading-frames/` if you want to create alternative versions.

**Linux:**

```bash
apt install ffmpeg  # Debian/Ubuntu
dnf install ffmpeg  # Fedora/RHEL
```

If `ffmpeg` is not available, the script will save individual frames to `images/loading-frames/` which can be manually converted to a GIF.

## Files

- `generate-screenshots.mjs` - Static screenshot generator for list/kanban views
- `generate-loading-sequence.mjs` - Animated GIF generator for loading states
- `check-prerequisites.mjs` - Prerequisites checker and auto-installer
- `generate-sample-data.mjs` - Sample work item data generator
- `sample-data.json` - Fixture data for screenshots

## How It Works

1. **Static Server**: Starts a local HTTP server to serve webview assets
2. **Playwright**: Launches headless Chromium browser
3. **Mock API**: Injects `window.vscode` API mock to simulate extension messages
4. **State Control**: Programmatically transitions through loading states
5. **Capture**: Takes screenshots at each frame/state
6. **Post-processing**: Applies styling for polished marketing screenshots
7. **GIF Encoding**: Uses ffmpeg to convert PNG sequence to optimized GIF

## Customization

Edit `sample-data.json` to change:

- Number and content of work items
- Connection configurations
- Active work item selection
- Kanban columns and states

Edit the scripts to adjust:

- Frame rates and timing
- Screenshot dimensions
- Styling and colors
- Padding and shadows
