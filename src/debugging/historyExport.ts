/**
 * History Export/Import
 * 
 * Provides functionality to export and import history for bug reports and test scenarios.
 */

import type { ApplicationEngineContext } from '../praxis/application/engine.js';
import type { PraxisEvent } from '@plures/praxis';
import { history } from '../webview/praxis/store.js';
import { frontendEngine } from '../webview/praxis/frontendEngine.js';
import type { TestScenario } from '../testing/historyTestRecorder.js';

/**
 * Exported history format
 */
export interface ExportedHistory {
  version: string;
  timestamp: string;
  engineType: 'frontend' | 'backend';
  initialContext: ApplicationEngineContext;
  entries: Array<{
    index: number;
    timestamp: number;
    label?: string;
    events: PraxisEvent[];
    state: {
      state: string;
      context: ApplicationEngineContext;
    };
  }>;
  metadata?: {
    extensionVersion?: string;
    platform?: string;
    userAgent?: string;
  };
}

/**
 * Export current history
 */
export function exportHistory(metadata?: ExportedHistory['metadata']): ExportedHistory {
  const entries = history.getHistory();
  
  const exported: ExportedHistory = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    engineType: 'frontend',
    initialContext: entries[0]?.state.context as ApplicationEngineContext || frontendEngine.getContext(),
    entries: entries.map((entry, index) => ({
      index,
      timestamp: entry.timestamp,
      label: entry.label,
      events: entry.events || [],
      state: {
        state: entry.state.state,
        context: entry.state.context as ApplicationEngineContext,
      },
    })),
    metadata: {
      extensionVersion: '2.12.5', // Could be dynamic
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      ...metadata,
    },
  };
  
  return exported;
}

/**
 * Export history as JSON string
 */
export function exportHistoryAsJSON(metadata?: ExportedHistory['metadata']): string {
  const exported = exportHistory(metadata);
  return JSON.stringify(exported, null, 2);
}

/**
 * Import history from exported format
 */
export function importHistory(exported: ExportedHistory): void {
  // Reset engine to initial state
  frontendEngine.updateContext(() => exported.initialContext);
  history.clearHistory();
  
  // Replay events
  for (const entry of exported.entries) {
    if (entry.events.length > 0) {
      frontendEngine.step(entry.events);
    }
  }
  
  // Debug statement removed
}

/**
 * Import history from JSON string
 */
export function importHistoryFromJSON(json: string): void {
  try {
    const exported = JSON.parse(json) as ExportedHistory;
    importHistory(exported);
  } catch (error) {
    throw new Error(`Failed to parse history JSON: ${error}`);
  }
}

/**
 * Convert exported history to test scenario
 */
export function historyToTestScenario(
  exported: ExportedHistory,
  scenarioId: string,
  scenarioName: string,
  description?: string
): TestScenario {
  return {
    id: scenarioId,
    name: scenarioName,
    description,
    timestamp: exported.timestamp,
    initialContext: exported.initialContext,
    events: exported.entries.flatMap(entry => 
      entry.events.map(event => ({
        event,
        label: entry.label,
        timestamp: entry.timestamp,
        stateAfter: entry.state.state,
      }))
    ),
    finalContext: exported.entries[exported.entries.length - 1]?.state.context || exported.initialContext,
    metadata: {
      tags: ['imported', 'history'],
      version: exported.version,
    },
  };
}

/**
 * Copy history to clipboard (for bug reports)
 */
export async function copyHistoryToClipboard(metadata?: ExportedHistory['metadata']): Promise<void> {
  const json = exportHistoryAsJSON(metadata);
  
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(json);
    // Debug statement removed
  } else {
    // Fallback for environments without clipboard API
    // Log statement removed
    throw new Error('Clipboard API not available');
  }
}

