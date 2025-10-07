# Screenshot Generation Fix

## Summary

Fixed screenshot generation to properly display VS Code Dark+ theme styling and ensure all screenshots are generated during the package process.

## Problems Fixed

### 1. Missing Screenshots in Package Process

**Issue:** The `prepackage` script only ran `screenshots:loading-gif`, not `screenshots:capture`.

**Solution:** Updated `package.json` to include both screenshot generation scripts:

```json
"prepackage": "npm install && npm run format && npm run lint && npm run build:all && npm run screenshots:capture && npm run screenshots:loading-gif"
```

### 2. Work Items Not Loading in Screenshots

**Issue:** The webview would initialize but work items wouldn't appear, causing screenshot capture to timeout.

**Solution:** Enhanced the fixture injection in `generate-screenshots.mjs`:

- Added automatic work item loading after `webviewReady` message
- Added debug logging to track message flow
- Sends `workItemsLoading` followed by `workItemsLoaded` messages

### 3. Kanban View Not Switching

**Issue:** Kanban screenshot would timeout because the view wasn't switching to kanban mode.

**Solution:** Added `toggleKanbanView` message after work items load when kanban view is requested:

```javascript
if (fixture.view === 'kanban') {
  setTimeout(() => {
    console.log('[screenshots] Sending toggleKanbanView message');
    window.postMessage({ type: 'toggleKanbanView' }, '*');
  }, 100);
}
```

### 4. Missing VS Code Theme Styling

**Issue:** Screenshots used hardcoded light theme colors, not VS Code's actual appearance.

**Solution:**

- Defined VS Code Dark+ theme color constants
- Inject VS Code CSS variables after page load
- Removed color overrides that forced light theme
- Added semantic color variables for status badges

### 5. Dark Screenshots on Light README Background

**Issue:** Dark-themed screenshots with dark backgrounds looked out of place on light README backgrounds (GitHub, VS Code Marketplace).

**Solution:**

- Changed page background from dark (#1e1e1e) to **transparent**
- Added `omitBackground: true` to Playwright screenshot options
- Screenshots now have transparent backgrounds that adapt to any README theme
- Subtle shadow provides visual separation without hard borders
- Inject VS Code CSS variables after page load
- Removed color overrides that forced light theme
- Added semantic color variables for status badges

## Technical Implementation

### VS Code Dark+ Theme Colors

```javascript
const VSCODE_THEME = {
  background: '#1e1e1e',
  sidebarBackground: '#252526',
  editorBackground: '#1e1e1e',
  foreground: '#cccccc',
  border: '#3e3e42',
  inputBackground: '#3c3c3c',
  buttonBackground: '#0e639c',
  listActiveBackground: '#094771',
  focusBorder: '#007acc',
  // ... and more
};
```

### CSS Variables Injected

The script now injects complete VS Code CSS variables:

- `--vscode-foreground`, `--vscode-sideBar-background`, `--vscode-editor-background`
- `--vscode-button-*`, `--vscode-input-*`
- `--vscode-list-*`, `--vscode-widget-border`
- `--vscode-editorWidget-border`, `--vscode-editorWidget-background` (for work item borders and column backgrounds)
- Semantic colors: `--primary-color`, `--success-color`, `--warning-color`
- Azure DevOps state colors: `--ado-blue`, `--ado-orange`, `--ado-green`, etc.

### Styling Approach

- **Before:** Forced light colors with `!important` overrides
- **After:** Inject VS Code theme variables and let CSS naturally apply them
- **Background:** Transparent instead of dark, works on any README theme
- **Minimal overrides:** Only for container sizing and presentation shadow

### Screenshot Options

```javascript
await target.screenshot({
  path: path.join(outDir, `${name}.png`),
  omitBackground: true, // Transparent background for light/dark compatibility
});
```

## Generated Screenshots

The package now includes three properly themed screenshots:

1. **work-items-list.png** - List view with work items, connection tabs, proper dark theme
2. **work-items-kanban.png** - Kanban board view with columns and cards
3. **loading-sequence.gif** - Animated loading sequence (80 frames)

All screenshots now show:

- ✅ VS Code Dark+ theme colors
- ✅ Proper text contrast
- ✅ Themed UI elements (buttons, inputs, cards)
- ✅ Colored status badges (blue/orange/green based on state)
- ✅ **Transparent background** - adapts to light or dark README themes
- ✅ Subtle shadow for depth without hard borders

## Testing

To regenerate screenshots:

```bash
npm run screenshots:capture
npm run screenshots:loading-gif
```

To run full prepackage (includes screenshot generation):

```bash
npm run prepackage
```

To create package with updated screenshots:

```bash
npm run package
```

## Files Modified

1. **package.json** - Added `screenshots:capture` to prepackage script
2. **scripts/screenshots/generate-screenshots.mjs**:
   - Replaced light theme constants with VS Code Dark+ theme
   - Added VS Code CSS variable injection
   - Removed color overrides that forced light theme
   - Enhanced fixture messaging for automatic work item loading
   - Added kanban view toggle message

## Result

Screenshots now accurately represent how the extension looks in VS Code with the Dark+ theme, making the marketplace listing and documentation more authentic and appealing.
