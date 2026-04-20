#!/usr/bin/env node

/**
 * Praxis CLI
 *
 * Command-line interface for the Praxis framework.
 */

import { Command } from 'commander';
import { generate } from './commands/generate.js';

const program = new Command();

program
  .name('praxis')
  .description('Praxis Framework - Full-stack application development')
  .version('0.2.1');

// Authentication command
program
  .command('login')
  .description('Authenticate with GitHub for Praxis Cloud access')
  .option('--token <token>', 'Use a personal access token instead of device flow')
  .action(async (options) => {
    try {
      const { loginCommand } = await import('./commands/auth.js');
      await loginCommand(options);
    } catch (error) {
      console.error('Error during login:', error);
      process.exit(1);
    }
  });

program
  .command('logout')
  .description('Log out from Praxis Cloud')
  .action(async () => {
    try {
      const { logoutCommand } = await import('./commands/auth.js');
      await logoutCommand();
    } catch (error) {
      console.error('Error during logout:', error);
      process.exit(1);
    }
  });

program
  .command('whoami')
  .description('Show current authenticated user')
  .action(async () => {
    try {
      const { whoamiCommand } = await import('./commands/auth.js');
      await whoamiCommand();
    } catch (error) {
      console.error('Error checking authentication:', error);
      process.exit(1);
    }
  });

// Create commands
program
  .command('create <type> [name]')
  .description('Create a new Praxis project or component')
  .option('-t, --template <template>', 'Template to use', 'basic')
  .option('-d, --directory <dir>', 'Output directory')
  .option('--features <features...>', 'Features to include')
  .action(async (type, name, options) => {
    try {
      const { create } = await import('./commands/create.js');
      await create(type, name, options);
    } catch (error) {
      console.error('Error creating:', error);
      process.exit(1);
    }
  });

program
  .command('generate')
  .description('Generate code from schemas')
  .option('-s, --schema <file>', 'Schema file path')
  .option('-t, --target <target>', 'Generation target (all, logic, components, pluresdb)', 'all')
  .option('-o, --output <dir>', 'Output directory', './generated')
  .option('-w, --watch', 'Watch for changes')
  .option(
    '--auto-index <strategy>',
    'Auto-indexing strategy for PluresDB (all, explicit, none)',
    'all'
  )
  .action(async (options) => {
    await generate(options);
  });

program
  .command('docs [schema]')
  .description('Generate documentation from schemas or registries')
  .option('-o, --output <dir>', 'Output directory', './docs')
  .option('--title <title>', 'Documentation title')
  .option('--format <format>', 'Diagram format (mermaid, dot)', 'mermaid')
  .option('--no-toc', 'Disable table of contents')
  .option('--no-timestamp', 'Disable timestamp')
  .option('--from-registry', 'Generate from registry instead of schema')
  .option('--header <content>', 'Custom header content')
  .option('--footer <content>', 'Custom footer content')
  .action(async (schema, options) => {
    try {
      const { docs } = await import('./commands/docs.js');
      await docs(schema, options);
    } catch (error) {
      console.error('Error generating documentation:', error);
      process.exit(1);
    }
  });

program
  .command('canvas [schema]')
  .description('Open CodeCanvas for visual editing')
  .option('-p, --port <port>', 'Port for Canvas server', '3000')
  .option('-m, --mode <mode>', 'Mode (edit, view, present)', 'edit')
  .option('-e, --export <format>', 'Export format (yaml, mermaid, json)')
  .option('-o, --output <file>', 'Output file for export')
  .action(async (schema, options) => {
    try {
      const { canvas } = await import('./commands/canvas.js');
      await canvas(schema, options);
    } catch (error) {
      console.error('Error with canvas:', error);
      process.exit(1);
    }
  });

program
  .command('orchestrate')
  .description('Manage orchestration and distributed coordination')
  .option('-c, --config <file>', 'Orchestration configuration file')
  .option('-n, --nodes <count>', 'Number of nodes', '1')
  .option('-a, --action <action>', 'Action (init, start, stop, status)', 'status')
  .action(async (options) => {
    try {
      const { orchestrate } = await import('./commands/orchestrate.js');
      await orchestrate(options);
    } catch (error) {
      console.error('Error with orchestration:', error);
      process.exit(1);
    }
  });

program
  .command('dev')
  .description('Start development server')
  .option('-p, --port <port>', 'Port number', '5173')
  .option('-h, --host <host>', 'Host to bind to', 'localhost')
  .option('-o, --open', 'Open browser')
  .action(async (options) => {
    try {
      const { dev } = await import('./commands/dev.js');
      await dev(options);
    } catch (error) {
      console.error('Error starting dev server:', error);
      process.exit(1);
    }
  });

program
  .command('build')
  .description('Build application for production')
  .option('-o, --output <dir>', 'Output directory', './dist')
  .option('--target <target>', 'Build target (web, desktop, mobile)', 'web')
  .option('--minify', 'Minify output', true)
  .option('--sourcemap', 'Generate source maps', false)
  .action(async (options) => {
    try {
      const { build } = await import('./commands/build.js');
      await build(options);
    } catch (error) {
      console.error('Error building:', error);
      process.exit(1);
    }
  });

// Cloud commands
const cloudCmd = program
  .command('cloud')
  .description('Manage Praxis Cloud connection and synchronization');

cloudCmd
  .command('init')
  .description('Connect to Praxis Cloud (setup wizard)')
  .option('-e, --endpoint <url>', 'Azure Function App endpoint URL')
  .option('-a, --app-id <id>', 'Application identifier')
  .option('--auto-sync', 'Enable automatic synchronization', false)
  .option('--interval <ms>', 'Sync interval in milliseconds', '5000')
  .action(async (options) => {
    try {
      // Dynamic import to avoid loading cloud module unless needed
      const { cloudInit } = await import('./commands/cloud.js');
      await cloudInit(options);
    } catch (error) {
      console.error('Error initializing cloud connection:', error);
      process.exit(1);
    }
  });

cloudCmd
  .command('status')
  .description('Check Praxis Cloud connection status')
  .action(async () => {
    try {
      const { cloudStatus } = await import('./commands/cloud.js');
      await cloudStatus();
    } catch (error) {
      console.error('Error checking cloud status:', error);
      process.exit(1);
    }
  });

cloudCmd
  .command('sync')
  .description('Manually trigger cloud synchronization')
  .action(async () => {
    try {
      const { cloudSync } = await import('./commands/cloud.js');
      await cloudSync();
    } catch (error) {
      console.error('Error syncing to cloud:', error);
      process.exit(1);
    }
  });

cloudCmd
  .command('usage')
  .description('View cloud usage metrics')
  .action(async () => {
    try {
      const { cloudUsage } = await import('./commands/cloud.js');
      await cloudUsage();
    } catch (error) {
      console.error('Error retrieving usage metrics:', error);
      process.exit(1);
    }
  });

// Verify command
program
  .command('verify <type>')
  .description('Verify project implementation (e.g., implementation)')
  .option('-d, --detailed', 'Show detailed analysis')
  .action(async (type, options) => {
    try {
      const { verify } = await import('./commands/verify.js');
      await verify(type, options);
    } catch (error) {
      console.error('Error verifying:', error);
      process.exit(1);
    }
  });

program.parse();
