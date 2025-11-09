/**
 * Module: src/fsm/functions/setup/manage.ts
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
import type { ProjectConnection } from '../../machines/applicationMachine.js';
import { addOrEditConnection } from './connection.js';

export async function manageConnections(
  context: vscode.ExtensionContext,
  connections: ProjectConnection[],
  saveFn: (connections: ProjectConnection[]) => Promise<void>,
  ensureActiveFn: (
    context: vscode.ExtensionContext,
    connectionId?: string,
    options?: { refresh?: boolean }
  ) => Promise<any>
): Promise<void> {
  const connectionItems = connections.map((c) => ({
    label: c.label || `${c.organization}/${c.project}`,
    description: c.id,
    connection: c,
  }));

  const choice = await vscode.window.showQuickPick(connectionItems, {
    placeHolder: 'Select a connection to manage',
  });

  if (!choice) return;

  const selectedConnection = choice.connection;

  const action = await vscode.window.showQuickPick(['Edit', 'Delete'], {
    placeHolder: `What do you want to do with "${selectedConnection.label || selectedConnection.id}"?`,
  });

  if (!action) return;

  if (action === 'Edit') {
    await addOrEditConnection(context, connections, saveFn, ensureActiveFn, selectedConnection);
  } else if (action === 'Delete') {
    const newConnections = connections.filter((c) => c.id !== selectedConnection.id);
    await saveFn(newConnections);
    vscode.window.showInformationMessage('Connection deleted.');

    const activeConnectionId = context.globalState.get<string>('azureDevOpsInt.activeConnectionId');
    if (activeConnectionId === selectedConnection.id) {
      const nextActive = newConnections.length > 0 ? newConnections[0].id : undefined;
      await ensureActiveFn(context, nextActive, { refresh: true });
    }
  }
}
