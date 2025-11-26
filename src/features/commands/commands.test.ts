import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { registerCommands, safeCommandHandler } from './registration.js';
import { setupCommand, openLogsCommand } from './handlers.js';
import type { CommandContext } from './types.js';

// Mock vscode
vi.mock('vscode', () => ({
  commands: {
    registerCommand: vi.fn(),
    executeCommand: vi.fn(),
  },
  window: {
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    createOutputChannel: vi.fn().mockReturnValue({
      append: vi.fn(),
      appendLine: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn(),
    }),
    showInputBox: vi.fn(),
  },
  workspace: {
    getConfiguration: vi.fn().mockReturnValue({
      get: vi.fn(),
      update: vi.fn(),
    }),
  },
  env: {
    clipboard: {
      writeText: vi.fn(),
    },
    openExternal: vi.fn(),
  },
  ConfigurationTarget: {
    Global: 1,
  },
  Uri: {
    file: vi.fn(),
  },
}));

// Mock FSMSetupService
const mockStartSetup = vi.fn().mockResolvedValue(undefined);
vi.mock('../../fsm/services/fsmSetupService.js', () => ({
  FSMSetupService: class {
    startSetup = mockStartSetup;
  },
}));

// Mock logging
const { mockChannel } = vi.hoisted(() => ({
  mockChannel: {
    show: vi.fn(),
  },
}));

vi.mock('../../logging.js', () => ({
  getOutputChannel: vi.fn().mockReturnValue(mockChannel),
  setOutputChannel: vi.fn(),
  logLine: vi.fn(),
  getLogBufferSnapshot: vi.fn().mockReturnValue([]),
  createScopedLogger: vi.fn().mockReturnValue({
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  }),
}));

describe('Commands Module', () => {
  let mockContext: vscode.ExtensionContext;
  let commandContext: CommandContext;

  beforeEach(() => {
    mockContext = {
      subscriptions: [],
      globalState: {
        get: vi.fn(),
        update: vi.fn(),
      },
      secrets: {
        get: vi.fn(),
        store: vi.fn(),
        delete: vi.fn(),
      },
      extension: {
        packageJSON: {
          version: '1.0.0',
        },
      },
    } as any;

    commandContext = {
      context: mockContext,
    };

    vi.clearAllMocks();
  });

  describe('registerCommands', () => {
    it('should register all commands', () => {
      const disposables = registerCommands(mockContext, commandContext);

      expect(vscode.commands.registerCommand).toHaveBeenCalled();
      expect(disposables.length).toBeGreaterThan(0);
    });

    it('should handle command errors gracefully', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error('Test error'));

      // We need to manually invoke the safeCommandHandler logic because we can't easily
      // capture the wrapped function passed to registerCommand in this test structure
      // without more complex mocking.
      // Instead, let's test safeCommandHandler directly which is what wraps the commands.

      const safeHandler = safeCommandHandler(mockHandler);
      await safeHandler();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Command failed: Test error');
    });
  });

  describe('safeCommandHandler', () => {
    it('should wrap handlers with error handling', async () => {
      const mockHandler = vi.fn().mockResolvedValue(undefined);
      const safeHandler = safeCommandHandler(mockHandler);

      await safeHandler();

      expect(mockHandler).toHaveBeenCalled();
    });

    it('should catch and display errors', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error('Test error'));
      const safeHandler = safeCommandHandler(mockHandler);

      await safeHandler();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Command failed: Test error');
    });
  });

  describe('Command Handlers', () => {
    it('should execute setup command', async () => {
      await setupCommand(commandContext);
      expect(mockStartSetup).toHaveBeenCalled();
    });

    it('should execute open logs command', async () => {
      await openLogsCommand(commandContext);
      expect(mockChannel.show).toHaveBeenCalledWith(true);
    });
  });
});
