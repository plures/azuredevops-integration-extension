/**
 * Module: src/fsm/integration-example.ts
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
 * FSM Integration Example
 *
 * This file demonstrates how to integrate the new FSM-based timer
 * with the existing extension architecture while maintaining backward compatibility.
 */

import * as vscode from 'vscode';
import { FSMManager, getFSMManager } from './FSMManager';
import { TimerAdapter, createTimerAdapter } from './adapters/TimerAdapter';
import { WorkItemTimer } from '../timer';
import { FSM_CONFIG } from './config';
import { createComponentLogger, FSMComponent } from './logging/FSMLogger';

// Example integration in activation.ts
export class FSMIntegration {
  private fsmManager: FSMManager;
  private timerAdapter: TimerAdapter;
  private legacyTimer: WorkItemTimer;
  private isEnabled: boolean;
  private logger = createComponentLogger(FSMComponent.APPLICATION, 'FSMIntegration');

  constructor(context: vscode.ExtensionContext, legacyTimer: WorkItemTimer) {
    this.legacyTimer = legacyTimer;
    this.fsmManager = getFSMManager();

    // Check if FSM is enabled via configuration
    const config = vscode.workspace.getConfiguration('azureDevOpsIntegration');
    this.isEnabled = config.get<boolean>('experimental.useFSM', false);

    // Create adapter for backward compatibility
    this.timerAdapter = createTimerAdapter(this.fsmManager, legacyTimer, {
      useFSM: this.isEnabled,
    });

    if (this.isEnabled) {
      this.logger.info('🚀 FSM Timer enabled - using state machine for timer operations');
      this.fsmManager.start();
    } else {
      this.logger.info('⚡ Using legacy timer implementation');
    }

    // Register configuration change listener
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('azureDevOpsIntegration.experimental.useFSM')) {
          this.handleConfigurationChange();
        }
      })
    );

    // Register commands for FSM debugging (development only)
    if (FSM_CONFIG.enableLogging) {
      this.registerDebugCommands(context);
    }
  }

  /**
   * Get the timer instance (either FSM or legacy based on configuration)
   */
  getTimer(): TimerAdapter {
    return this.timerAdapter;
  }

  /**
   * Enable or disable FSM at runtime
   */
  setFSMEnabled(enabled: boolean): void {
    if (enabled && !this.isEnabled) {
      this.logger.info('🔄 Enabling FSM timer...');
      this.fsmManager.start();
      this.timerAdapter.setUseFSM(true);
      this.isEnabled = true;
    } else if (!enabled && this.isEnabled) {
      this.logger.info('🔄 Disabling FSM timer...');
      this.timerAdapter.setUseFSM(false);
      this.fsmManager.stop();
      this.isEnabled = false;
    }
  }

  /**
   * Get FSM status for debugging
   */
  getFSMStatus(): any {
    return {
      enabled: this.isEnabled,
      manager: this.fsmManager.getStatus(),
      adapter: {
        isUsingFSM: this.timerAdapter.isUsingFSM(),
        validation: this.timerAdapter.validateSync(),
      },
    };
  }

  /**
   * Force synchronization between FSM and legacy timers (for debugging)
   */
  forceSync(): void {
    if (this.isEnabled) {
      this.timerAdapter.forceSync();
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.isEnabled) {
      this.fsmManager.stop();
    }
  }

  private handleConfigurationChange(): void {
    const config = vscode.workspace.getConfiguration('azureDevOpsIntegration');
    const newEnabled = config.get<boolean>('experimental.useFSM', false);

    if (newEnabled !== this.isEnabled) {
      this.setFSMEnabled(newEnabled);
      vscode.window.showInformationMessage(
        `FSM Timer ${newEnabled ? 'enabled' : 'disabled'}. Changes will take effect for new timer operations.`
      );
    }
  }

  private registerDebugCommands(context: vscode.ExtensionContext): void {
    // Command to show FSM status
    context.subscriptions.push(
      vscode.commands.registerCommand('azureDevOpsInt.showFSMStatus', () => {
        const status = this.getFSMStatus();
        const statusText = JSON.stringify(status, null, 2);

        vscode.window
          .showInformationMessage(
            `FSM Status: ${status.enabled ? 'Enabled' : 'Disabled'}`,
            'Show Details'
          )
          .then((selection) => {
            if (selection === 'Show Details') {
              vscode.workspace
                .openTextDocument({
                  content: statusText,
                  language: 'json',
                })
                .then((doc) => vscode.window.showTextDocument(doc));
            }
          });
      })
    );

    // Command to toggle FSM
    context.subscriptions.push(
      vscode.commands.registerCommand('azureDevOpsInt.toggleFSM', () => {
        this.setFSMEnabled(!this.isEnabled);
        vscode.window.showInformationMessage(
          `FSM Timer ${this.isEnabled ? 'enabled' : 'disabled'}`
        );
      })
    );

    // Command to validate timer sync
    context.subscriptions.push(
      vscode.commands.registerCommand('azureDevOpsInt.validateTimerSync', () => {
        const validation = this.timerAdapter.validateSync();

        if (validation.isSync) {
          vscode.window.showInformationMessage('✅ Timer states are synchronized');
        } else {
          vscode.window
            .showWarningMessage(
              `⚠️ Timer sync issues: ${validation.differences.join(', ')}`,
              'Show Details'
            )
            .then((selection) => {
              if (selection === 'Show Details') {
                this.forceSync();
              }
            });
        }
      })
    );
  }
}

/**
 * Example of how to modify the existing activation.ts to use FSM
 */
export function integrateWithActivation() {
  // This is how you would modify the existing activation.ts file:
  /*
  // In activation.ts, add this to the activate function:
  
  let fsmIntegration: FSMIntegration | undefined;
  
  export function activate(context: vscode.ExtensionContext) {
    // ... existing code ...
    
    // Initialize FSM integration
    fsmIntegration = new FSMIntegration(context, timer);
    
    // Use the FSM-aware timer instead of the legacy timer directly
    const smartTimer = fsmIntegration.getTimer();
    
    // Register commands using the smart timer
    vscode.commands.registerCommand('azureDevOpsInt.startTimer', () => {
      // Use smartTimer instead of timer
      // The adapter will route to FSM or legacy based on configuration
    });
    
    // ... rest of existing code ...
    
    // Add FSM integration to disposal
    context.subscriptions.push({
      dispose: () => fsmIntegration?.dispose()
    });
  }
  */
}

/**
 * Example configuration for package.json
 */
export const examplePackageJsonConfiguration = {
  contributes: {
    configuration: {
      properties: {
        'azureDevOpsIntegration.experimental.useFSM': {
          type: 'boolean',
          default: false,
          description:
            'Enable experimental FSM (Finite State Machine) architecture for improved reliability and debugging',
        },
        'azureDevOpsIntegration.experimental.fsmComponents': {
          type: 'array',
          items: {
            type: 'string',
            enum: ['timer', 'connection', 'webview', 'messaging'],
          },
          default: [],
          description: 'List of components to use FSM for (requires useFSM to be true)',
        },
        'azureDevOpsIntegration.experimental.enableFSMInspector': {
          type: 'boolean',
          default: false,
          description: 'Enable FSM visual inspector for development and debugging',
        },
      },
    },
    commands: [
      {
        command: 'azureDevOpsInt.showFSMStatus',
        title: 'Show FSM Status',
        category: 'Azure DevOps (Debug)',
      },
      {
        command: 'azureDevOpsInt.toggleFSM',
        title: 'Toggle FSM Timer',
        category: 'Azure DevOps (Debug)',
      },
      {
        command: 'azureDevOpsInt.validateTimerSync',
        title: 'Validate Timer Synchronization',
        category: 'Azure DevOps (Debug)',
      },
    ],
  },
};

/**
 * Migration checklist for developers
 */
export const migrationChecklist = `
# FSM Migration Checklist

## Phase 1: Setup (✅ Complete)
- [x] Install XState dependencies
- [x] Create FSM infrastructure
- [x] Implement timer state machine
- [x] Create adapter for backward compatibility
- [x] Add configuration options

## Phase 2: Integration (🔄 Current)
- [ ] Modify activation.ts to use FSMIntegration
- [ ] Update package.json with new configuration
- [ ] Add debug commands to command palette
- [ ] Test FSM timer with real workloads

## Phase 3: Rollout (⏳ Planned)
- [ ] Enable FSM for beta users via configuration
- [ ] Monitor performance and reliability
- [ ] Gather user feedback
- [ ] Fix any issues found

## Phase 4: Full Migration (⏳ Future)
- [ ] Make FSM the default (useFSM: true)
- [ ] Remove legacy timer code
- [ ] Update all documentation
- [ ] Release new major version

## Benefits Already Available:
- ✅ Predictable state transitions
- ✅ Visual state inspection (with inspector)
- ✅ Type-safe state management
- ✅ Comprehensive testing capability
- ✅ Zero-risk rollback option
- ✅ Side-by-side comparison with legacy
`;

export default FSMIntegration;
