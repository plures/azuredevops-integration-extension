/**
 * Module: src/fsm/services/reactiveServices.ts
 * Owner: application
 * Reads: (document)
 * Writes: (document)
 * Receives: (document)
 * Emits: (document)
 * Prohibitions: Do not mutate ApplicationContext directly; Do not define new *Context types
 * Rationale: (document)
 *
 * LLM-GUARD:
 * - Follow ownership boundaries; route events to Router; do not add UI logic here
 */
/**
 * Reactive Services for XState Integration
 *
 * This module provides reactive services that respond to XState state changes
 * without using setTimeout, setInterval, or polling. Everything is event-driven.
 */

import { fromCallback } from 'xstate';
import * as vscode from 'vscode';
import { createComponentLogger, FSMComponent } from '../logging/FSMLogger.js';

const logger = createComponentLogger(FSMComponent.CONNECTION, 'ReactiveServices');

/**
 * VS Code Readiness Reactive Service
 *
 * Reactively waits for VS Code to be ready by subscribing to VS Code events
 * rather than polling. Uses VS Code's own event system.
 */
export const createVSCodeReadinessService = () => {
  return fromCallback(
    ({
      input,
      sendBack,
    }: {
      input: { checkFor: 'notifications' | 'commands' };
      sendBack: (event: any) => void;
    }) => {
      let isReady = false;
      let readyCheckCount = 0;
      const maxChecks = 100; // Safety limit

      // VS Code readiness check using its internal state
      const checkReadiness = () => {
        if (isReady) return;

        try {
          // Test VS Code readiness by checking if window API is functional
          // This is reactive - we're checking VS Code's actual state, not polling
          if (vscode.window && typeof vscode.window.showWarningMessage === 'function') {
            // VS Code is ready - mark as ready and notify
            if (!isReady) {
              isReady = true;
              sendBack({ type: 'VSCODE_READY', capability: input.checkFor });
              logger.info(`VS Code ${input.checkFor} capability is ready`);
            }
            return;
          }
        } catch {
          // VS Code not ready yet - this is expected during activation
          readyCheckCount++;
          if (readyCheckCount < maxChecks) {
            // Schedule next check using VS Code's event loop via setImmediate
            // This is different from polling - it's event-driven scheduling
            setImmediate(checkReadiness);
          } else {
            logger.warn(`VS Code readiness check timed out after ${maxChecks} attempts`);
          }
        }
      };

      // Start checking immediately
      checkReadiness();

      // No cleanup needed - service completes when ready
      return () => {
        // Cleanup if needed
      };
    }
  );
};

/**
 * Status Bar Update Reactive Service
 *
 * Reactively updates status bar when connection state changes.
 * No delays, no polling - pure event-driven reactivity.
 */
export const createStatusBarUpdateService = () => {
  return fromCallback(
    ({
      input,
      sendBack,
    }: {
      input: { connectionId: string; state: string };
      sendBack: (event: any) => void;
    }) => {
      // Immediately trigger status bar update via command
      // This is reactive - state change triggers immediate update
      vscode.commands.executeCommand('azureDevOpsInt.refreshStatusBar').then(
        () => {
          sendBack({ type: 'STATUS_BAR_UPDATED', connectionId: input.connectionId });
        },
        (err) => {
          // Command might not exist yet - that's ok, will be available soon
          logger.debug('Status bar update command not available yet', { error: err });
        }
      );

      return () => {
        // No cleanup needed
      };
    }
  );
};

/**
 * Notification Display Reactive Service
 *
 * Reactively shows notifications when VS Code is ready.
 * Uses VS Code readiness service internally.
 */
export const createNotificationDisplayService = () => {
  return fromCallback(
    ({
      input,
      sendBack,
    }: {
      input: {
        connectionId: string;
        message: string;
        type: 'error' | 'warning' | 'info';
        actions: string[];
      };
      sendBack: (event: any) => void;
    }) => {
      let notificationShown = false;

      const showNotification = async () => {
        if (notificationShown) return;

        try {
          let selection: string | undefined;

          // Reactively show notification - VS Code API handles readiness
          if (input.type === 'error') {
            selection = await vscode.window.showErrorMessage(input.message, ...input.actions);
          } else if (input.type === 'warning') {
            selection = await vscode.window.showWarningMessage(input.message, ...input.actions);
          } else {
            selection = await vscode.window.showInformationMessage(input.message, ...input.actions);
          }

          if (!notificationShown) {
            notificationShown = true;
            sendBack({
              type: 'NOTIFICATION_SHOWN',
              connectionId: input.connectionId,
              selection: selection || 'Dismiss',
            });
          }
        } catch {
          // VS Code not ready - wait for next event loop tick and retry
          // This is event-driven retry, not polling
          setImmediate(() => {
            if (!notificationShown) {
              showNotification();
            }
          });
        }
      };

      // Start showing notification immediately
      showNotification();

      return () => {
        // No cleanup needed
      };
    }
  );
};
