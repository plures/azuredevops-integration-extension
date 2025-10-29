import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { registerCommands, safeCommandHandler } from './registration.js';
import { setupCommand, openLogsCommand } from './handlers.js';
import type { CommandContext } from './types.js';

// Mock vscode
vi.mock('vscode', () => ({
  commands: {
    registerCommand: vi.fn(),
  },
  window: {
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
  },
  workspace: {
    getConfiguration: vi.fn(),
  },
  ConfigurationTarget: {
    Global: 1,
  },
}));

describe('Commands Module', () => {
  let mockContext: vscode.ExtensionContext;
  let commandContext: CommandContext;

  beforeEach(() => {
    mockContext = {
      subscriptions: [],
    } as any;

    commandContext = {
      context: mockContext,
    };
  });

  describe('registerCommands', () => {
    it('should register all commands', () => {
      const disposables = registerCommands(mockContext, commandContext);

      expect(vscode.commands.registerCommand).toHaveBeenCalled();
      expect(disposables.length).toBeGreaterThan(0);
    });

    it('should handle command errors gracefully', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error('Test error'));

      vscode.commands.registerCommand('test.command', safeCommandHandler(mockHandler));

      // Simulate command execution
      const handler = vi.mocked(vscode.commands.registerCommand).mock.calls[0][1];
      await handler();

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
      const mockSetupService = {
        startSetup: vi.fn().mockResolvedValue(undefined),
      };

      // Mock the FSMSetupService
      vi.doMock('../../fsm/services/fsmSetupService.js', () => ({
        FSMSetupService: vi.fn().mockImplementation(() => mockSetupService),
      }));

      await setupCommand(commandContext);

      expect(mockSetupService.startSetup).toHaveBeenCalled();
    });

    it('should execute open logs command', async () => {
      const mockChannel = {
        show: vi.fn(),
      };

      // Mock the logging functions
      vi.doMock('../../logging.js', () => ({
        getOutputChannel: vi.fn().mockReturnValue(mockChannel),
        setOutputChannel: vi.fn(),
        logLine: vi.fn(),
      }));

      await openLogsCommand(commandContext);

      expect(mockChannel.show).toHaveBeenCalledWith(true);
    });
  });
});
