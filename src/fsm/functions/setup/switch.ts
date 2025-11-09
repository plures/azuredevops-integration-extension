/**
 * Module: src/fsm/functions/setup/switch.ts
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

export async function switchConnection(
  context: vscode.ExtensionContext,
  connections: ProjectConnection[],
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
    placeHolder: 'Select a connection to make active',
  });

  if (!choice) return;

  await ensureActiveFn(context, choice.connection.id, { refresh: true });
  vscode.window.showInformationMessage(`Switched to connection: ${choice.label}`);
}
