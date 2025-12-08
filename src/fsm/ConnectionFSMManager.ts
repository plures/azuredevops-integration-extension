import type { ProjectConnection } from '../features/connection/types.js';
import { PraxisApplicationManager } from '../praxis/application/manager.js';
import { ConnectionService } from '../praxis/connection/service.js';

/**
 * Compatibility layer for ConnectionFSMManager.
 * This replaces the deleted file to satisfy build requirements in activation.ts.
 * Delegates to PraxisApplicationManager to ensure single source of truth.
 */
class ConnectionFSMManager {
  private get appManager() {
    return PraxisApplicationManager.getInstance();
  }

  setEnabled(_enabled: boolean) {
    // No-op
  }

  async connectToConnection(connection: ProjectConnection, options: any) {
    // Get the connection manager from the application manager
    const connManager = this.appManager.getConnectionManager(connection.id);

    if (!connManager) {
      return { success: false, error: 'Connection manager not found' };
    }

    // Use ConnectionService to drive the connection process
    const result = await ConnectionService.getInstance().connectWithManager(connManager, {
      interactive: options?.interactive,
    });

    if (result.success) {
      const data = connManager.getConnectionData();
      return {
        success: true,
        client: data.client,
        provider: data.provider,
        state: {
          status: 'connected',
          connection: connection,
          authMethod: connection.authMethod || 'pat',
          client: data.client,
          provider: data.provider,
        } as any,
      };
    } else {
      return {
        success: false,
        error: result.error,
      };
    }
  }

  getConnectionState(id: string) {
    const manager = this.appManager.getConnectionManager(id);
    if (!manager) return undefined;

    const state = manager.getConnectionState();
    return {
      status: state,
      connection: manager.getConnectionData().config,
    } as any;
  }

  getConnectionActor(id: string) {
    const manager = this.appManager.getConnectionManager(id);
    if (!manager) return undefined;

    return {
      getSnapshot: () => {
        const data = manager.getConnectionData();
        const state = manager.getConnectionState();
        return {
          context: {
            ...data,
            connection: data.config,
          },
          value: state,
          state: state,
          error: data.lastError,
        };
      },
    };
  }

  getActiveConnection() {
    return undefined;
  }
}

const instance = new ConnectionFSMManager();
export function getConnectionFSMManager() {
  return instance;
}
