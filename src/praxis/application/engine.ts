/**
 * Praxis Application Engine
 *
 * Creates and configures the Application Orchestrator engine
 * using the Praxis logic engine.
 */

import { createPraxisEngine, PraxisRegistry, type LogicEngine } from '@plures/praxis';
import type {
  PraxisApplicationContext,
  PraxisApplicationState,
  ViewMode,
  WorkItem,
  KanbanColumn,
  DeviceCodeSession,
  PendingWorkItems,
} from './types.js';
import { DEFAULT_APPLICATION_CONFIG } from './types.js';
import type { ProjectConnection } from '../connection/types.js';
import type { PraxisTimerSnapshot } from '../timer/types.js';
import type { PraxisConnectionSnapshot } from '../connection/types.js';
import { applicationRules } from './rules/index.js';

/**
 * Application engine context structure
 */
export interface ApplicationEngineContext {
  applicationState: PraxisApplicationState;
  applicationData: PraxisApplicationContext;

  // Shortcut properties for cleaner rule access
  isActivated: boolean;
  isDeactivating: boolean;
  connections: ProjectConnection[];
  activeConnectionId?: string;
  activeQuery?: string;
  viewMode: ViewMode;
  pendingWorkItems?: PendingWorkItems;
  deviceCodeSession?: DeviceCodeSession;
  lastError?: { message: string; stack?: string; connectionId?: string };
  errorRecoveryAttempts: number;
  debugLoggingEnabled: boolean;
  debugViewVisible: boolean;

  // Per-connection maps
  connectionStates: Map<string, PraxisConnectionSnapshot>;
  connectionQueries: Map<string, string>;
  connectionWorkItems: Map<string, WorkItem[]>;
  connectionFilters: Map<string, Record<string, unknown>>;
  connectionViewModes: Map<string, ViewMode>;

  // Auth reminders
  pendingAuthReminders: Map<string, { connectionId: string; reason: string; status: string }>;

  // Timer snapshot from timer engine
  timerSnapshot?: PraxisTimerSnapshot;

  // Kanban columns
  kanbanColumns: KanbanColumn[];
}

/**
 * Create initial application engine context
 */
function createInitialContext(
  config?: Partial<PraxisApplicationContext>
): ApplicationEngineContext {
  const merged = { ...DEFAULT_APPLICATION_CONFIG, ...config };

  return {
    applicationState: 'inactive',
    applicationData: merged as PraxisApplicationContext,

    // Shortcut properties
    isActivated: merged.isActivated ?? false,
    isDeactivating: merged.isDeactivating ?? false,
    connections: merged.connections ?? [],
    activeConnectionId: merged.activeConnectionId,
    activeQuery: merged.activeQuery,
    viewMode: merged.viewMode ?? 'list',
    pendingWorkItems: merged.pendingWorkItems,
    deviceCodeSession: merged.deviceCodeSession,
    lastError: merged.lastError,
    errorRecoveryAttempts: merged.errorRecoveryAttempts ?? 0,
    debugLoggingEnabled: merged.debugLoggingEnabled ?? false,
    debugViewVisible: merged.debugViewVisible ?? false,

    // Per-connection maps
    connectionStates: merged.connectionStates ?? new Map(),
    connectionQueries: merged.connectionQueries ?? new Map(),
    connectionWorkItems: merged.connectionWorkItems ?? new Map(),
    connectionFilters: merged.connectionFilters ?? new Map(),
    connectionViewModes: merged.connectionViewModes ?? new Map(),

    // Auth reminders
    pendingAuthReminders: merged.pendingAuthReminders ?? new Map(),

    // Timer snapshot
    timerSnapshot: undefined,

    // Kanban columns
    kanbanColumns: merged.kanbanColumns ?? [],
  };
}

/**
 * Create the application engine
 */
export function createApplicationEngine(
  config?: Partial<PraxisApplicationContext>
): LogicEngine<ApplicationEngineContext> {
  const registry = new PraxisRegistry<ApplicationEngineContext>();

  // Register all application rules
  for (const rule of applicationRules) {
    registry.registerRule(rule);
  }

  return createPraxisEngine<ApplicationEngineContext>({
    initialContext: createInitialContext(config),
    registry,
    initialFacts: [],
  });
}
