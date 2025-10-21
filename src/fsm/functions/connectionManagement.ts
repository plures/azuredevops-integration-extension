import type { ApplicationContext, ProjectConnection } from '../machines/applicationMachine.js';

export function saveConnection(
  context: ApplicationContext,
  event: { type: 'SAVE_CONNECTION'; connection: ProjectConnection }
): ProjectConnection[] {
  const newConnection = event.connection;
  const existingIndex = context.connections.findIndex((c) => c.id === newConnection.id);
  const newConnections = [...context.connections];
  if (existingIndex > -1) {
    newConnections[existingIndex] = newConnection;
  } else {
    newConnections.push(newConnection);
  }
  // TODO: Persist to storage here
  return newConnections;
}

export function deleteConnection(
  context: ApplicationContext,
  event: { type: 'CONFIRM_DELETE_CONNECTION'; connectionId: string }
): ProjectConnection[] {
  const newConnections = context.connections.filter((c) => c.id !== event.connectionId);
  // TODO: Persist to storage here
  return newConnections;
}
