#!/usr/bin/env node
// Compatibility wrapper for historical path used by npm scripts/docs.
// Delegates to the actual generator under scripts/screenshots/.
import './screenshots/generate-screenshots.mjs';
