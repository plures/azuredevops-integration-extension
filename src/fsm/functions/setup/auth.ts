/**
 * Module: src/fsm/functions/setup/auth.ts
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
import { sendApplicationStoreEvent } from '../../services/extensionHostBridge.js';
import type { ProjectConnection } from '../../machines/applicationMachine.js';

function dispatchApplicationEvent(event: unknown): void {
  sendApplicationStoreEvent(event);
}

export async function signInWithEntra(
  connections: ProjectConnection[],
  activeConnectionId: string | undefined
): Promise<void> {
  const entraConnections = connections.filter((c) => c.authMethod === 'entra');
  if (entraConnections.length === 0) {
    vscode.window.showInformationMessage('No Microsoft Entra ID connections are configured.');
    return;
  }

  let targetId: string | undefined;

  if (entraConnections.length === 1) {
    targetId = entraConnections[0].id;
  } else {
    const choice = await vscode.window.showQuickPick(
      entraConnections.map((c) => ({
        label: c.label || `${c.organization}/${c.project}`,
        id: c.id,
      })),
      { placeHolder: 'Select a connection to sign in with' }
    );
    if (choice) {
      targetId = choice.id;
    }
  }

  if (!targetId) {
    const activeIsEntra = connections.find(
      (c) => c.id === activeConnectionId && c.authMethod === 'entra'
    );
    if (activeIsEntra) {
      targetId = activeConnectionId;
    }
  }

  if (!targetId) {
    vscode.window.showWarningMessage('No active connection to sign in with.');
    return;
  }

  dispatchApplicationEvent({
    type: 'SIGN_IN_ENTRA',
    connectionId: targetId,
    forceInteractive: true,
  });
}

export async function signOutEntra(
  connections: ProjectConnection[],
  activeConnectionId: string | undefined
): Promise<void> {
  const entraConnections = connections.filter((c) => c.authMethod === 'entra');
  if (entraConnections.length === 0) {
    vscode.window.showInformationMessage('No Microsoft Entra ID connections are configured.');
    return;
  }

  let targetId: string | undefined;

  if (entraConnections.length === 1) {
    targetId = entraConnections[0].id;
  } else {
    const choice = await vscode.window.showQuickPick(
      entraConnections.map((c) => ({
        label: c.label || `${c.organization}/${c.project}`,
        id: c.id,
      })),
      { placeHolder: 'Select a connection to sign out from' }
    );
    if (choice) {
      targetId = choice.id;
    }
  }

  if (!targetId) {
    const activeIsEntra = connections.find(
      (c) => c.id === activeConnectionId && c.authMethod === 'entra'
    );
    if (activeIsEntra) {
      targetId = activeConnectionId;
    }
  }

  if (!targetId) {
    vscode.window.showWarningMessage('No active connection to sign out from.');
    return;
  }

  dispatchApplicationEvent({ type: 'SIGN_OUT_ENTRA', connectionId: targetId });
}
