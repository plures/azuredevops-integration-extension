/**
 * Build Command
 *
 * Builds a Praxis application for production.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Build options
 */
export interface BuildOptions {
  /** Output directory */
  output?: string;
  /** Build target */
  target?: 'web' | 'desktop' | 'mobile';
  /** Minify output */
  minify?: boolean;
  /** Generate source maps */
  sourcemap?: boolean;
}

/**
 * Build application for production
 */
export async function build(options: BuildOptions): Promise<void> {
  const output = options.output || './dist';
  const target = options.target || 'web';

  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Praxis Production Build                         ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  // Check if we're in a Praxis project
  const packageJsonPath = path.join(process.cwd(), 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    console.error('Error: No package.json found in current directory.');
    console.log('Make sure you are in a Praxis project directory.\n');
    process.exit(1);
  }

  // Read package.json to check for build script
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  if (!packageJson.scripts?.build) {
    console.error('Error: No "build" script found in package.json.');
    console.log('\nTo build your Praxis project, add a build script to your package.json:');
    console.log('  "scripts": {');
    console.log('    "build": "vite build"');
    console.log('  }\n');
    process.exit(1);
  }

  console.log(`Building for: ${target}`);
  console.log(`Output: ${output}`);
  console.log('');

  // Handle different build targets
  if (target === 'desktop') {
    await buildDesktop(options);
    return;
  }

  if (target === 'mobile') {
    await buildMobile(options);
    return;
  }

  // Web build (default)
  await buildWeb(options);
}

/**
 * Build for web
 */
async function buildWeb(options: BuildOptions): Promise<void> {
  const output = options.output || './dist';

  console.log('🌐 Building web application...\n');

  // Set up environment variables for Vite
  const env = {
    ...process.env,
    FORCE_COLOR: '1',
  };

  // Build args
  const args = ['run', 'build'];
  if (output !== './dist') {
    args.push('--', '--outDir', output);
  }

  return new Promise((resolve, reject) => {
    const child = spawn('npm', args, {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
      env,
    });

    child.on('error', (error) => {
      console.error('Build failed:', error.message);
      reject(error);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log('\n✅ Build completed successfully!');
        console.log(`\nOutput: ${output}/`);
        console.log('\nTo preview the build:');
        console.log('  npm run preview\n');
        resolve();
      } else {
        console.error(`\n❌ Build failed with code ${code}`);
        process.exit(code || 1);
      }
    });
  });
}

/**
 * Build for desktop (Tauri)
 */
async function buildDesktop(_options: BuildOptions): Promise<void> {
  console.log('🖥️  Building desktop application with Tauri...\n');

  // Check if Tauri is configured
  const tauriConfigPath = path.join(process.cwd(), 'src-tauri', 'tauri.conf.json');

  if (!fs.existsSync(tauriConfigPath)) {
    console.log('Tauri is not configured for this project.');
    console.log('\nTo add Tauri support:');
    console.log('  1. npm install -D @tauri-apps/cli');
    console.log('  2. npm run tauri init');
    console.log('  3. praxis build --target desktop\n');
    console.log('For more information, see the Tauri integration docs.');
    process.exit(1);
  }

  // Check for tauri build script
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
  );

  const buildScript = packageJson.scripts?.['tauri:build'] || packageJson.scripts?.['tauri'];

  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', buildScript ? 'tauri:build' : 'tauri', 'build'], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
      env: {
        ...process.env,
        FORCE_COLOR: '1',
      },
    });

    child.on('error', (error) => {
      console.error('Desktop build failed:', error.message);
      reject(error);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log('\n✅ Desktop build completed!');
        console.log('\nBundles are in: src-tauri/target/release/bundle/');
        resolve();
      } else {
        console.error(`\n❌ Desktop build failed with code ${code}`);
        process.exit(code || 1);
      }
    });
  });
}

/**
 * Build for mobile (Tauri mobile)
 */
async function buildMobile(_options: BuildOptions): Promise<void> {
  console.log('📱 Building mobile application...\n');

  // Check if Tauri mobile is configured
  const tauriConfigPath = path.join(process.cwd(), 'src-tauri', 'tauri.conf.json');

  if (!fs.existsSync(tauriConfigPath)) {
    console.log('Tauri is not configured for this project.');
    console.log('\nTo add mobile support:');
    console.log('  1. npm install -D @tauri-apps/cli');
    console.log('  2. npm run tauri init');
    console.log('  3. npm run tauri android init');
    console.log('  4. npm run tauri ios init');
    console.log('  5. praxis build --target mobile\n');
    console.log('For more information, see the Tauri mobile docs.');
    process.exit(1);
  }

  console.log('Mobile build requires platform-specific setup:');
  console.log('\n📱 Android:');
  console.log('  npm run tauri android build');
  console.log('\n🍎 iOS:');
  console.log('  npm run tauri ios build\n');
}
