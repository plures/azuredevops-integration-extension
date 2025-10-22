import * as vscode from 'vscode';
import type { ProjectConnection } from '../../machines/applicationMachine.js';

export async function convertConnectionToEntra(
  context: vscode.ExtensionContext,
  connections: ProjectConnection[],
  saveFn: (connections: ProjectConnection[]) => Promise<void>,
  ensureActiveFn: (
    context: vscode.ExtensionContext,
    connectionId?: string,
    options?: { refresh?: boolean }
  ) => Promise<any>
): Promise<void> {
  const patConnections = connections.filter((c) => c.authMethod !== 'entra');
  if (patConnections.length === 0) {
    vscode.window.showInformationMessage('No PAT-based connections to convert.');
    return;
  }

  const choice = await vscode.window.showQuickPick(
    patConnections.map((c) => ({
      label: c.label || `${c.organization}/${c.project}`,
      connection: c,
    })),
    {
      placeHolder: 'Select a connection to convert to Entra ID',
    }
  );

  if (!choice) return;

  const newConnections = connections.map((c) => {
    if (c.id === choice.connection.id) {
      return { ...c, authMethod: 'entra' as const };
    }
    return c;
  });

  await saveFn(newConnections);
  await ensureActiveFn(context, choice.connection.id, { refresh: true });

  vscode.window.showInformationMessage(
    `Connection "${choice.label}" converted to use Microsoft Entra ID.`
  );
}
