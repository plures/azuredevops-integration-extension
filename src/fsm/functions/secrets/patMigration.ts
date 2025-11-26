/**
 * Module: src/fsm/functions/secrets/patMigration.ts
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
import type * as vscode from 'vscode';
import type { ProjectConnection } from '../../machines/applicationTypes.js';
import { fsmLogger, FSMComponent } from '../../logging/FSMLogger.js';
import { GLOBAL_PAT_SECRET_KEY } from '../../../config/constants.js';

const componentContext = { component: FSMComponent.AUTH, scope: 'pat-migration' } as const;

export async function migrateGlobalPATToConnections(
  context: vscode.ExtensionContext,
  connections: ProjectConnection[]
): Promise<void> {
  if (!context?.secrets || connections.length === 0) {
    return;
  }

  try {
    const globalPat = await context.secrets.get(GLOBAL_PAT_SECRET_KEY);
    if (!globalPat) {
      return;
    }

    for (const connection of connections) {
      const patKey = typeof connection.patKey === 'string' ? connection.patKey.trim() : '';
      if (!patKey) {
        continue;
      }

      if (connection.authMethod === 'entra') {
        continue;
      }

      try {
        const existing = await context.secrets.get(patKey);
        if (!existing) {
          await context.secrets.store(patKey, globalPat);
          fsmLogger.info(FSMComponent.AUTH, 'Migrated global PAT to connection', componentContext, {
            connectionId: connection.id,
          });
        }
      } catch (error) {
        fsmLogger.warn(FSMComponent.AUTH, 'Failed migrating PAT to connection', componentContext, {
          connectionId: connection.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    try {
      await context.secrets.delete(GLOBAL_PAT_SECRET_KEY);
      fsmLogger.info(FSMComponent.AUTH, 'Deleted global PAT after migration', componentContext);
    } catch (error) {
      fsmLogger.warn(
        FSMComponent.AUTH,
        'Failed to delete global PAT after migration',
        componentContext,
        {
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  } catch (error) {
    fsmLogger.warn(FSMComponent.AUTH, 'Global PAT migration failed', componentContext, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
