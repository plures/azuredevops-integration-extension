/**
 * Module: src/fsm/functions/setup/ui.ts
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
import * as vscode from 'vscode';
import type { ProjectConnection } from '../../machines/applicationTypes.js';

export type SetupAction =
  | 'add'
  | 'manage'
  | 'switch'
  | 'entraSignIn'
  | 'entraSignOut'
  | 'convertToEntra';

export interface ShowSetupMenuOptions {
  connections?: ProjectConnection[];
  activeConnectionId?: string;
}

export async function showSetupMenu(
  options: ShowSetupMenuOptions = {}
): Promise<SetupAction | undefined> {
  const { connections = [], activeConnectionId } = options;

  // Determine active connection's auth method
  const activeConnection = connections.find((c) => c.id === activeConnectionId);
  const activeAuthMethod = activeConnection?.authMethod || 'pat';
  const hasPatConnections = connections.some((c) => c.authMethod !== 'entra');

  // Build menu items based on context
  const menuItems: Array<{ label: string; action: SetupAction }> = [
    { label: 'Add new connection', action: 'add' as SetupAction },
    { label: 'Manage existing connections', action: 'manage' as SetupAction },
    { label: 'Switch active connection', action: 'switch' as SetupAction },
  ];

  // Add Entra-specific options only if active connection is Entra
  if (activeAuthMethod === 'entra') {
    menuItems.push({
      label: '$(sign-in) Sign in with Microsoft Entra ID',
      action: 'entraSignIn' as SetupAction,
    });
    menuItems.push({
      label: '$(sign-out) Sign out from Microsoft Entra ID',
      action: 'entraSignOut' as SetupAction,
    });
  }

  // Add convert option only if there are PAT connections
  if (hasPatConnections) {
    menuItems.push({
      label: 'Convert PAT connection to Entra ID',
      action: 'convertToEntra' as SetupAction,
    });
  }

  const action = await vscode.window.showQuickPick(menuItems, {
    placeHolder: 'What would you like to do?',
  });

  return action?.action;
}
