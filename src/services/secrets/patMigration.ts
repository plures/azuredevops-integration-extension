import type { ExtensionContext } from 'vscode';
import type { ProjectConnection } from '../../types/application.js';

const LEGACY_PAT_KEY = 'azureDevOpsPersonalAccessToken';

/**
 * Migrate global PAT to per-connection secret keys
 * This ensures credentials are always connection-scoped (no global PAT sharing)
 */
export async function migrateGlobalPATToConnections(
  context: ExtensionContext,
  connections: ProjectConnection[]
): Promise<void> {
  try {
    // Get legacy global PAT if it exists
    const globalPAT = await context.secrets.get(LEGACY_PAT_KEY);

    if (!globalPAT) {
      return; // No migration needed
    }

    // Migrate to each connection that uses PAT auth and doesn't have a PAT yet
    let migratedCount = 0;
    for (const connection of connections) {
      if (connection.authMethod === 'pat' && connection.patKey) {
        const existingPAT = await context.secrets.get(connection.patKey);

        // Only migrate if connection doesn't have a PAT yet
        if (!existingPAT) {
          await context.secrets.store(connection.patKey, globalPAT);
          migratedCount++;
        }
      }
    }

    // If we migrated to at least one connection, delete the global PAT
    if (migratedCount > 0) {
      await context.secrets.delete(LEGACY_PAT_KEY);
    }
  } catch (error) {
    // Log but don't throw - migration failures shouldn't break activation

    console.debug('[PAT Migration] Failed to migrate global PAT:', error);
  }
}
