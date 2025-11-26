import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const desktopDir = path.join(rootDir, 'apps', 'app-desktop');
const tauriDir = path.join(desktopDir, 'src-tauri');

const rootPackagePath = path.join(rootDir, 'package.json');
const desktopPackagePath = path.join(desktopDir, 'package.json');
const tauriConfigPath = path.join(tauriDir, 'tauri.conf.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function parseVersion(version) {
  const parts = version.split('.').map(Number);
  return {
    major: parts[0],
    minor: parts[1],
    patch: parts[2],
    original: version,
  };
}

function compareVersions(v1, v2) {
  if (v1.major > v2.major) return 1;
  if (v1.major < v2.major) return -1;
  if (v1.minor > v2.minor) return 1;
  if (v1.minor < v2.minor) return -1;
  if (v1.patch > v2.patch) return 1;
  if (v1.patch < v2.patch) return -1;
  return 0;
}

try {
  console.log('Reading version files...');
  const rootPackage = readJson(rootPackagePath);
  const desktopPackage = readJson(desktopPackagePath);
  const tauriConfig = readJson(tauriConfigPath);

  const v1 = parseVersion(rootPackage.version);
  const v2 = parseVersion(desktopPackage.version);
  const v3 = parseVersion(tauriConfig.version);

  console.log(`Root package version: ${v1.original}`);
  console.log(`Desktop package version: ${v2.original}`);
  console.log(`Tauri config version: ${v3.original}`);

  let maxVersion = v1;
  if (compareVersions(v2, maxVersion) > 0) maxVersion = v2;
  if (compareVersions(v3, maxVersion) > 0) maxVersion = v3;

  console.log(`Highest version found: ${maxVersion.original}`);

  let updated = false;

  if (rootPackage.version !== maxVersion.original) {
    console.log(`Updating root package.json to ${maxVersion.original}`);
    rootPackage.version = maxVersion.original;
    writeJson(rootPackagePath, rootPackage);
    updated = true;
  }

  if (desktopPackage.version !== maxVersion.original) {
    console.log(`Updating desktop package.json to ${maxVersion.original}`);
    desktopPackage.version = maxVersion.original;
    writeJson(desktopPackagePath, desktopPackage);
    updated = true;
  }

  if (tauriConfig.version !== maxVersion.original) {
    console.log(`Updating tauri.conf.json to ${maxVersion.original}`);
    tauriConfig.version = maxVersion.original;
    writeJson(tauriConfigPath, tauriConfig);
    updated = true;
  }

  if (updated) {
    console.log('Versions synced successfully.');
  } else {
    console.log('All versions are already in sync.');
  }
} catch (error) {
  console.error('Error syncing versions:', error);
  process.exit(1);
}
