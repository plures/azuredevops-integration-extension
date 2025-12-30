/**
 * Terminal Node Runtime Adapter
 *
 * Handles terminal command execution and state management.
 * Integrates with pluresDB for state synchronization.
 */

// Declare process for TypeScript in non-Node environments (e.g., Deno)
declare const process: { env: { [key: string]: string | undefined } } | undefined;

import type { TerminalNodeProps } from '../core/schema/types.js';
import type { PraxisDB } from '../core/pluresdb/adapter.js';

/**
 * Terminal command execution result
 */
export interface TerminalExecutionResult {
  /** Command that was executed */
  command: string;
  /** Output from the command */
  output: string;
  /** Exit code (0 for success) */
  exitCode: number;
  /** Execution timestamp */
  timestamp: number;
  /** Error message if execution failed */
  error?: string;
}

/**
 * Terminal node state
 */
export interface TerminalNodeState extends TerminalNodeProps {
  /** Node identifier */
  nodeId: string;
  /** Current working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
}

/**
 * Terminal adapter options
 */
export interface TerminalAdapterOptions {
  /** Node identifier */
  nodeId: string;
  /** Initial props */
  props?: Partial<TerminalNodeProps>;
  /** PluresDB path for input binding */
  inputPath?: string;
  /** PluresDB path for output binding */
  outputPath?: string;
  /** Current working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** PluresDB instance for state persistence */
  db?: PraxisDB;
  /** Command executor function (for custom execution environments) */
  executor?: CommandExecutor;
}

/**
 * Command executor function type
 */
export type CommandExecutor = (
  command: string,
  options: { cwd?: string; env?: Record<string, string> }
) => Promise<{ output: string; exitCode: number; error?: string }>;

/**
 * Default command executor using child_process
 * Note: This only works in Node.js environments
 */
async function defaultExecutor(
  command: string,
  options: { cwd?: string; env?: Record<string, string> }
): Promise<{ output: string; exitCode: number; error?: string }> {
  try {
    // Dynamic import to support environments without child_process
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Get process.env safely (only available in Node.js environments)
    const processEnv = typeof process !== 'undefined' ? process.env : {};

    const result = await execAsync(command, {
      cwd: options.cwd,
      env: { ...processEnv, ...options.env },
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 60000, // 60 second timeout
    });

    return {
      output: result.stdout + (result.stderr ? `\n${result.stderr}` : ''),
      exitCode: 0,
    };
  } catch (error: unknown) {
    const execError = error as {
      stdout?: string;
      stderr?: string;
      code?: number;
      message?: string;
    };
    return {
      output: (execError.stdout || '') + (execError.stderr || ''),
      exitCode: execError.code || 1,
      error: execError.message || 'Command execution failed',
    };
  }
}

/**
 * Terminal Runtime Adapter
 *
 * Manages terminal node execution and state.
 * Supports command execution with history tracking and PluresDB integration.
 */
export class TerminalAdapter {
  private state: TerminalNodeState;
  private inputPath?: string;
  private outputPath?: string;
  private db?: PraxisDB;
  private executor: CommandExecutor;

  constructor(options: TerminalAdapterOptions) {
    this.state = {
      nodeId: options.nodeId,
      inputMode: options.props?.inputMode || 'text',
      history: options.props?.history || [],
      lastOutput: options.props?.lastOutput || null,
      cwd: options.cwd,
      env: options.env,
    };
    this.inputPath = options.inputPath;
    this.outputPath = options.outputPath;
    this.db = options.db;
    this.executor = options.executor || defaultExecutor;
  }

  /**
   * Execute a terminal command
   *
   * @param command - Command to execute
   * @returns Execution result
   */
  async executeCommand(command: string): Promise<TerminalExecutionResult> {
    // Add to history
    this.state.history.push(command);

    const timestamp = Date.now();

    // Execute the command
    const { output, exitCode, error } = await this.executor(command, {
      cwd: this.state.cwd,
      env: this.state.env,
    });

    const result: TerminalExecutionResult = {
      command,
      output,
      exitCode,
      timestamp,
      error,
    };

    // Update last output
    this.state.lastOutput = output;

    // Sync to PluresDB if configured
    if (this.db && this.outputPath) {
      await this.syncToPluresDB(this.outputPath, result);
    }

    return result;
  }

  /**
   * Get current terminal state
   */
  getState(): Readonly<TerminalNodeState> {
    return { ...this.state };
  }

  /**
   * Update terminal props
   */
  updateProps(props: Partial<TerminalNodeProps>): void {
    this.state = {
      ...this.state,
      ...props,
    };
  }

  /**
   * Set working directory
   */
  setCwd(cwd: string): void {
    this.state.cwd = cwd;
  }

  /**
   * Set environment variables
   */
  setEnv(env: Record<string, string>): void {
    this.state.env = { ...this.state.env, ...env };
  }

  /**
   * Clear command history
   */
  clearHistory(): void {
    this.state.history = [];
  }

  /**
   * Get command history
   */
  getHistory(): ReadonlyArray<string> {
    return [...this.state.history];
  }

  /**
   * Sync state to PluresDB
   *
   * @param path - PluresDB path for storing results
   * @param data - Data to sync
   */
  private async syncToPluresDB(path: string, data: TerminalExecutionResult): Promise<void> {
    if (!this.db) return;

    try {
      // Store the execution result
      await this.db.set(path, {
        ...data,
        nodeId: this.state.nodeId,
        syncedAt: Date.now(),
      });

      // Also append to history path
      const historyPath = `${path}/history`;
      const historyKey = `${historyPath}/${data.timestamp}`;
      await this.db.set(historyKey, data);
    } catch (error) {
      console.warn('Failed to sync to PluresDB:', error);
    }
  }

  /**
   * Load state from PluresDB
   */
  async loadFromPluresDB(): Promise<void> {
    if (!this.db || !this.inputPath) return;

    try {
      const data = await this.db.get(this.inputPath);
      if (data && typeof data === 'object') {
        const savedState = data as Partial<TerminalNodeState>;
        if (savedState.history) {
          this.state.history = savedState.history;
        }
        if (savedState.lastOutput !== undefined) {
          this.state.lastOutput = savedState.lastOutput;
        }
        if (savedState.cwd) {
          this.state.cwd = savedState.cwd;
        }
        if (savedState.env) {
          this.state.env = savedState.env;
        }
      }
    } catch (error) {
      console.warn('Failed to load from PluresDB:', error);
    }
  }

  /**
   * Subscribe to input changes from PluresDB
   */
  watchInput(callback: (command: string) => void): (() => void) | null {
    if (!this.db || !this.inputPath) return null;

    return this.db.watch(this.inputPath, (data) => {
      if (data && typeof data === 'object' && 'command' in data) {
        callback((data as { command: string }).command);
      }
    });
  }
}

/**
 * Create a terminal adapter instance
 *
 * @param options - Terminal adapter options
 * @returns Terminal adapter instance
 */
export function createTerminalAdapter(options: TerminalAdapterOptions): TerminalAdapter {
  return new TerminalAdapter(options);
}

/**
 * Run a terminal command (convenience function)
 *
 * @param nodeId - Terminal node identifier
 * @param command - Command to execute
 * @param options - Additional options
 * @returns Execution result
 */
export async function runTerminalCommand(
  nodeId: string,
  command: string,
  options?: { cwd?: string; env?: Record<string, string>; db?: PraxisDB; executor?: CommandExecutor }
): Promise<TerminalExecutionResult> {
  const adapter = createTerminalAdapter({
    nodeId,
    cwd: options?.cwd,
    env: options?.env,
    db: options?.db,
    executor: options?.executor,
  });
  return adapter.executeCommand(command);
}

/**
 * Create a mock executor for testing
 * Returns a function that returns predefined outputs
 */
export function createMockExecutor(
  responses: Record<string, { output: string; exitCode: number; error?: string }>
): CommandExecutor {
  return async (command: string) => {
    const response = responses[command] ||
      responses['*'] || {
        output: `Mock output for: ${command}`,
        exitCode: 0,
      };
    return response;
  };
}
