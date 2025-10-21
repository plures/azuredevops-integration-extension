import { assign } from 'xstate';
import type { ApplicationContext, ProjectConnection } from '../machines/applicationMachine.js';

export const saveConnection = assign({
  connections: ({ context, event }: { context: ApplicationContext; event: { type: 'SAVE_CONNECTION'; connection: ProjectConnection } }) => {
    const newConnection = event.connection;
    const existingIndex = context.connections.findIndex(c => c.id === newConnection.id);
    const newConnections = [...context.connections];
    if (existingIndex > -1) {
      newConnections[existingIndex] = newConnection;
    } else {
      newConnections.push(newConnection);
    }
    // TODO: Persist to storage here
    return newConnections;
  },
});

export const deleteConnection = assign({
  connections: ({ context, event }: { context: ApplicationContext; event: { type: 'CONFIRM_DELETE_CONNECTION'; connectionId: string } }) => {
    const newConnections = context.connections.filter(c => c.id !== event.connectionId);
    // TODO: Persist to storage here
    return newConnections;
  },
});
