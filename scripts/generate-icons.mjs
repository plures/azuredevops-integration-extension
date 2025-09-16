#!/usr/bin/env node
/* eslint-disable no-undef */
/**
 * Simple icon generation script.
 * Converts the source SVG workitems-icon.svg into PNG variants for VS Code Marketplace and light/dark usage.
 * Requires: sharp
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (e) {
  console.error('\n[generate-icons] Missing optional dependency "sharp".');
  console.error('Install it with: npm install --save-dev sharp');
  console.error('Original error:', e.message || e);
  process.exit(1);
}

const ROOT = path.resolve(process.cwd()); // process provided by Node.js
const mediaDir = path.join(ROOT, 'media');
const distDir = path.join(mediaDir, 'generated-icons');
const sourceSvg = path.join(mediaDir, 'workitems-icon.svg');

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function generate() {
  const svg = await readFile(sourceSvg);
  await ensureDir(distDir);
  const sizes = [16, 32, 48, 64, 128, 256];
  for (const size of sizes) {
    const out = path.join(distDir, `workitems-icon-${size}.png`);
    await sharp(svg).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
  console.log('Generated', out); // console provided by Node.js
  }
  // Pick a default size (128) to replace existing extension icon.
  const primary = path.join(distDir, 'workitems-icon-128.png');
  const target = path.join(mediaDir, 'icon.png');
  const png128 = await readFile(primary);
  await writeFile(target, png128);
  console.log('Replaced primary extension icon with 128px variant.');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
