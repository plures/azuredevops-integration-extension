/**
 * Frontend Application Engine
 *
 * Initializes the Praxis Logic Engine for the webview.
 * This engine runs in "Replica" mode, receiving state updates from the backend.
 */

import { createPraxisEngine, PraxisRegistry } from '@plures/praxis';
import { applicationRules } from '../../praxis/application/rules/index.js';
import type { ApplicationEngineContext } from '../../praxis/application/engine.js';
import { DEFAULT_APPLICATION_CONFIG } from '../../praxis/application/types.js';

// Initial empty context - will be hydrated by SyncStateEvent
const initialContext: ApplicationEngineContext = {
  ...DEFAULT_APPLICATION_CONFIG,
  applicationState: 'inactive',
  applicationData: { ...DEFAULT_APPLICATION_CONFIG },
  timerHistory: { entries: [] },
  isActivated: false,
  isDeactivating: false,
  connections: [],
  viewMode: 'list',
  errorRecoveryAttempts: 0,
  debugLoggingEnabled: false,
  debugViewVisible: false,
  connectionStates: new Map(),
  connectionWorkItems: new Map(),
};

const registry = new PraxisRegistry<ApplicationEngineContext>();
for (const rule of applicationRules) {
  registry.registerRule(rule);
}

export const frontendEngine = createPraxisEngine<ApplicationEngineContext>({
  initialContext,
  registry,
});
