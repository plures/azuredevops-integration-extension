/**
 * Diagnostic helper functions for work items diagnostics
 */

import { logLine } from '../../logging.js';
import type { ProjectConnection } from '../../types/application.js';

export interface DiagnosticContext {
  connections: ProjectConnection[];
  activeConnectionId?: string;
  snapshot: any;
}

/**
 * Check and log connection information
 */
export function checkConnections(context: DiagnosticContext): boolean {
  logLine('1. Checking Connections...');
  logLine(`   Found ${context.connections.length} connection(s)`);

  if (context.connections.length === 0) {
    logLine('   ❌ ERROR: No connections configured');
    logLine('   → Run "Azure DevOps Int: Setup Wizard" to configure a connection');
    return false;
  }

  logLine(`   Active connection: ${context.activeConnectionId || 'None'}`);

  if (!context.activeConnectionId) {
    logLine('   ⚠️  WARNING: No active connection selected');
    logLine('   → Select a connection in the webview');
  }

  return true;
}

/**
 * Check and log active connection state
 */
export async function checkActiveConnectionState(context: DiagnosticContext): Promise<boolean> {
  if (!context.activeConnectionId) {
    return false;
  }

  logLine('');
  logLine('2. Checking Active Connection State...');
  const connection = context.connections.find((c: any) => c.id === context.activeConnectionId);

  if (!connection) {
    logLine(
      `   ❌ ERROR: Active connection ${context.activeConnectionId} not found in connections list`
    );
    return false;
  }

  logLine(`   Connection ID: ${connection.id}`);
  logLine(`   Organization: ${connection.organization || 'Not set'}`);
  logLine(`   Project: ${connection.project || 'Not set'}`);
  logLine(`   Auth Method: ${connection.authMethod || 'pat'}`);
  logLine(`   Base URL: ${connection.baseUrl || connection.apiBaseUrl || 'Not set'}`);

  // Check connection state
  const connectionStates = context.snapshot?.context?.connectionStates;
  const connState = connectionStates?.get?.(context.activeConnectionId);
  const isConnected = connState?.isConnected === true;
  logLine(`   Connection Status: ${isConnected ? '✅ Connected' : '❌ Not Connected'}`);

  // Check ConnectionService state
  try {
    const { ConnectionService } = await import('../../praxis/connection/service.js');
    const connectionService = ConnectionService.getInstance();
    const manager = connectionService.getConnectionManager(context.activeConnectionId);
    if (manager) {
      const state = manager.getConnectionState();
      logLine(`   Connection Manager State: ${state || 'Unknown'}`);
      const data = manager.getConnectionData();
      if (data.lastError) {
        logLine(`   ❌ Last Error: ${data.lastError}`);
      }
    }
  } catch (error: any) {
    logLine(`   ⚠️  Could not check connection manager: ${error.message}`);
  }

  return isConnected;
}

/**
 * Check and log work items state
 */
export function checkWorkItemsState(context: DiagnosticContext): void {
  logLine('');
  logLine('3. Checking Work Items State...');
  const pendingWorkItems = context.snapshot?.context?.pendingWorkItems;
  const connectionWorkItems = context.snapshot?.context?.connectionWorkItems;

  if (pendingWorkItems) {
    const count = Array.isArray(pendingWorkItems.workItems) ? pendingWorkItems.workItems.length : 0;
    logLine(`   Pending Work Items: ${count} item(s)`);
    logLine(`   Connection ID: ${pendingWorkItems.connectionId || 'None'}`);
    logLine(`   Query: ${pendingWorkItems.query || 'Not set'}`);
  } else {
    logLine('   ⚠️  No pending work items found');
  }

  if (connectionWorkItems && context.activeConnectionId) {
    const connWorkItems = connectionWorkItems.get?.(context.activeConnectionId);
    if (connWorkItems) {
      const count = Array.isArray(connWorkItems.workItems) ? connWorkItems.workItems.length : 0;
      logLine(`   Connection Work Items: ${count} item(s) for active connection`);
    } else {
      logLine('   ⚠️  No work items found for active connection');
    }
  }
}

/**
 * Check and log active query
 */
export function checkActiveQuery(context: DiagnosticContext): string | undefined {
  logLine('');
  logLine('4. Checking Active Query...');
  const activeQuery = context.snapshot?.context?.activeQuery;
  logLine(`   Active Query: ${activeQuery || 'Not set'}`);

  if (!activeQuery) {
    logLine('   ⚠️  WARNING: No active query selected');
    logLine('   → Select a query in the webview');
  }

  return activeQuery;
}

/**
 * Check and log errors
 */
export function checkErrors(context: DiagnosticContext): string | undefined {
  logLine('');
  logLine('5. Checking for Errors...');
  const workItemsError = context.snapshot?.context?.workItemsError;
  const lastError = context.snapshot?.context?.lastError;

  if (workItemsError) {
    logLine(`   ❌ Work Items Error: ${workItemsError}`);
    logLine(
      `   Connection ID: ${context.snapshot?.context?.workItemsErrorConnectionId || 'Unknown'}`
    );
  } else {
    logLine('   ✅ No work items errors found');
  }

  if (lastError) {
    logLine(`   ❌ Last Application Error: ${lastError.message || lastError}`);
    if (lastError.stack) {
      logLine(`   Stack: ${lastError.stack}`);
    }
  }

  return workItemsError;
}

/**
 * Test connection if available
 */
export async function testConnection(context: DiagnosticContext): Promise<void> {
  logLine('');
  logLine('6. Testing Connection...');
  if (!context.activeConnectionId) {
    logLine('   ⚠️  Skipped: No active connection');
    return;
  }

  try {
    const { ConnectionService } = await import('../../praxis/connection/service.js');
    const connectionService = ConnectionService.getInstance();
    const manager = connectionService.getConnectionManager(context.activeConnectionId);

    if (!manager) {
      logLine('   ⚠️  Connection manager not found');
      return;
    }

    const data = manager.getConnectionData();
    if (data.client && data.provider) {
      logLine('   ✅ Client and Provider available');

      // Try to get work item types as a connectivity test
      try {
        if (typeof data.provider.getWorkItemTypeOptions === 'function') {
          const types = data.provider.getWorkItemTypeOptions();
          logLine(
            `   ✅ Work Item Types: ${Array.isArray(types) ? types.length : 0} type(s) available`
          );
        }
      } catch (error: any) {
        logLine(`   ⚠️  Could not fetch work item types: ${error.message}`);
      }
    } else {
      logLine('   ❌ Client or Provider not available');
      logLine(`   Has Client: ${!!data.client}`);
      logLine(`   Has Provider: ${!!data.provider}`);
    }
  } catch (error: any) {
    logLine(`   ❌ Connection test failed: ${error.message}`);
  }
}

/**
 * Generate recommendations based on diagnostic results
 */
export function generateRecommendations(
  context: DiagnosticContext,
  isConnected: boolean,
  activeQuery?: string,
  workItemsError?: string
): void {
  logLine('');
  logLine('7. Recommendations...');

  if (!context.activeConnectionId) {
    logLine('   → Select a connection in the webview');
  } else if (!isConnected) {
    logLine('   → Run "Azure DevOps Int: Sign In with Microsoft Entra ID" to authenticate');
  } else if (!activeQuery) {
    logLine('   → Select a query in the webview (e.g., "My Activity", "All Active")');
  } else if (workItemsError) {
    logLine('   → Check authentication and permissions');
    logLine('   → Verify PAT scopes include "Work Items (Read & Write)"');
    logLine('   → Verify you have access to the project');
  } else {
    logLine('   ✅ Configuration looks good');
    logLine("   → If work items still don't appear, check the query scope");
    logLine('   → Try switching to a different query (e.g., "All Active")');
  }
}
