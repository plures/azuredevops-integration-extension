/**
 * Development Server Command
 *
 * Starts the Praxis development server with Vite.
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Development server options
 */
export interface DevOptions {
  /** Port number */
  port?: string;
  /** Host to bind to */
  host?: string;
  /** Open browser */
  open?: boolean;
}

/**
 * Start development server
 */
export async function dev(options: DevOptions): Promise<void> {
  const port = options.port || '5173';
  const host = options.host || 'localhost';

  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║   Praxis Development Server                       ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  // Check if we're in a Praxis project
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const viteConfigPath = path.join(process.cwd(), 'vite.config.ts');
  void viteConfigPath; // Silence unused variable warning

  if (!fs.existsSync(packageJsonPath)) {
    console.error('Error: No package.json found in current directory.');
    console.log('Make sure you are in a Praxis project directory.\n');
    console.log('To create a new project, run:');
    console.log('  praxis create app my-app\n');
    process.exit(1);
  }

  // Read package.json to check for dev script
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  if (!packageJson.scripts?.dev) {
    console.error('Error: No "dev" script found in package.json.');
    console.log('\nTo use the Praxis dev server, add a dev script to your package.json:');
    console.log('  "scripts": {');
    console.log('    "dev": "vite"');
    console.log('  }\n');
    process.exit(1);
  }

  console.log(`Starting development server on http://${host}:${port}\n`);

  // Spawn npm run dev with port configuration
  const args = ['run', 'dev', '--', '--port', port, '--host', host];
  if (options.open) {
    args.push('--open');
  }

  const child = spawn('npm', args, {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd(),
    env: {
      ...process.env,
      FORCE_COLOR: '1',
    },
  });

  child.on('error', (error) => {
    console.error('Failed to start development server:', error.message);
    process.exit(1);
  });

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Development server exited with code ${code}`);
      process.exit(code);
    }
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n\nStopping development server...');
    child.kill('SIGTERM');
    process.exit(0);
  });
}
