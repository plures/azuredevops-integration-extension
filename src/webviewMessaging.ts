import type { WebviewView } from 'vscode';
import type { WorkItemsProvider } from './provider.js';

export type LoggerFn = (message: string, extra?: unknown) => void;

type AuthMethod = 'pat' | 'entra';

export type ConnectionLike = {
  id: string;
  organization: string;
  project: string;
  label?: string;
  authMethod?: AuthMethod;
};

export type BranchContextPayload = {
  branchName?: string;
  branchRef?: string;
  repositoryId?: string;
  repositoryName?: string;
  remoteUrl?: string;
  lastUpdated?: number;
} | null;

export type PostToWebviewParams = {
  panel: WebviewView | undefined;
  message: any;
  logger?: LoggerFn;
};

export function postToWebview({ panel, message, logger }: PostToWebviewParams): void {
  console.log('🔍 [POST_TO_WEBVIEW] DEPRECATED - Use direct store updates instead');
  console.log('🔍 [POST_TO_WEBVIEW] Called with:', {
    hasPanel: !!panel,
    messageType: message?.type,
    messageSize: JSON.stringify(message).length
  });
  
  if (!panel) {
    console.log('🔍 [POST_TO_WEBVIEW] No panel available!');
    return;
  }
  
  try {
    logger?.('[postToWebview] DEPRECATED - posting message', {
      type: message?.type,
      hasPanel: !!panel,
    });
    console.log('🔍 [POST_TO_WEBVIEW] DEPRECATED - Posting message to webview:', message?.type);
    panel.webview.postMessage(message);
    console.log('🔍 [POST_TO_WEBVIEW] DEPRECATED - Message posted successfully!');
  } catch (err) {
    console.error('🔍 [POST_TO_WEBVIEW] Failed to post message:', err);
    console.warn('[azureDevOpsInt] Failed to post message to webview', err);
  }
}

export type PostWorkItemsSnapshotParams = {
  panel: WebviewView | undefined;
  connectionId?: string;
  items?: any[];
  kanbanView?: boolean;
  provider?: WorkItemsProvider;
  types?: string[];
  query?: string;
  logger?: LoggerFn;
  branchContext?: BranchContextPayload;
};

export function postWorkItemsSnapshot({
  panel,
  connectionId,
  items,
  kanbanView,
  provider,
  types,
  query,
  logger,
  branchContext,
}: PostWorkItemsSnapshotParams): void {
  const itemsArray = Array.isArray(items) ? items : [];
  postToWebview({
    panel,
    logger,
    message: {
      type: 'workItemsLoaded',
      connectionId,
      workItems: itemsArray,
      kanbanView: !!kanbanView,
      query,
      branchContext: branchContext ?? null,
    },
  });

  let typeList: string[] | undefined;
  if (Array.isArray(types)) {
    typeList = [...types];
  } else if (provider && typeof (provider as any).getWorkItemTypeOptions === 'function') {
    try {
      const raw = (provider as any).getWorkItemTypeOptions();
      if (Array.isArray(raw)) typeList = [...raw];
    } catch (err: unknown) {
      const errorMeta = err instanceof Error ? err.message : err;
      logger?.('[postWorkItemsSnapshot] failed to read provider type options', errorMeta);
    }
  }

  if (typeList) {
    postToWebview({
      panel,
      logger,
      message: {
        type: 'workItemTypeOptions',
        connectionId,
        types: typeList,
      },
    });
  }
}

export function getConnectionLabel(connection: ConnectionLike): string {
  if (connection.label && connection.label.trim()) return connection.label.trim();
  if (connection.project && connection.project.trim()) return connection.project.trim();
  return `${connection.organization}/${connection.project}`;
}

export type PostConnectionsUpdateParams = {
  panel: WebviewView | undefined;
  connections: ConnectionLike[];
  activeConnectionId?: string;
  logger?: LoggerFn;
};

export function postAuthRemindersUpdate(panel: WebviewView | undefined, authReminders: Map<string, any>): void {
  if (!panel) return;
  
  const reminderEntries = Array.from(authReminders.entries()).map(([connectionId, reminder]) => ({
    connectionId,
    ...reminder
  }));

  console.log('🔍 [UPDATE_AUTH_REMINDERS] Sending auth reminders to webview:', reminderEntries.length);

  try {
    panel.webview.postMessage({
      type: 'auth-reminders-update',
      authReminders: reminderEntries
    });
  } catch (err) {
    console.error('🔍 [UPDATE_AUTH_REMINDERS] Failed to send auth reminders:', err);
  }
}

export function postConnectionsUpdate({
  panel,
  connections,
  activeConnectionId,
  logger,
}: PostConnectionsUpdateParams): void {
  console.log('🔍 [UPDATE_CONNECTIONS_STORE] Directly updating webview store with:', {
    hasPanel: !!panel,
    connectionsCount: connections.length,
    activeConnectionId
  });
  
  if (!panel) {
    console.log('🔍 [UPDATE_CONNECTIONS_STORE] No panel available!');
    return;
  }
  
  const entries = connections.map((connection) => ({
    id: connection.id,
    name: getConnectionLabel(connection), // Changed from 'label' to 'name' to match webview interface
    label: getConnectionLabel(connection), // Keep label for backward compatibility
    organization: connection.organization,
    project: connection.project,
    authMethod: connection.authMethod,
    url: '', // Add required url field
    personalAccessToken: '', // Add required PAT field (empty for display)
  }));

  console.log('🔍 [UPDATE_CONNECTIONS_STORE] Connection entries prepared:', entries.map(e => ({
    id: e.id,
    label: e.label,
    organization: e.organization,
    project: e.project
  })));

  logger?.('[postConnectionsUpdate] Directly updating webview store', {
    connectionCount: entries.length,
    activeConnectionId,
    connectionLabels: entries.map(c => c.label),
  });

  try {
    // Send connections update directly via postMessage
    panel.webview.postMessage({
      type: 'connections-update',
      connections: entries,
      activeConnectionId: activeConnectionId
    });
    
    console.log('🔍 [UPDATE_CONNECTIONS_STORE] Connections update message sent successfully!');
  } catch (err) {
    console.error('🔍 [UPDATE_CONNECTIONS_STORE] Failed to update store:', err);
    logger?.('[postConnectionsUpdate] Failed to update webview store', { error: err });
  }
}

export type PostWorkItemsUpdateParams = {
  panel: WebviewView | undefined;
  workItems: any[];
  connectionId?: string;
  query?: string;
  logger?: LoggerFn;
};

export function postWorkItemsUpdate({
  panel,
  workItems,
  connectionId,
  query,
  logger,
}: PostWorkItemsUpdateParams): void {
  console.log('🔍 [UPDATE_WORKITEMS_STORE] Directly updating webview store with:', {
    hasPanel: !!panel,
    workItemsCount: workItems.length,
    connectionId,
    query,
  });
  
  if (!panel) {
    console.log('🔍 [UPDATE_WORKITEMS_STORE] No panel available!');
    return;
  }

  logger?.('[postWorkItemsUpdate] Directly updating webview store', {
    workItemsCount: workItems.length,
    connectionId,
    query,
    sampleWorkItemIds: workItems.slice(0, 3).map(wi => wi.id || wi.fields?.['System.Id']),
  });

  try {
    // Send work items update directly via postMessage
    panel.webview.postMessage({
      type: 'work-items-update',
      connectionId: connectionId,
      workItems: workItems,
      source: 'store-update',
      metadata: {
        workItemsCount: workItems.length,
        connectionId: connectionId,
        query: query,
        firstWorkItem: workItems[0] ? {
          id: workItems[0].id,
          title: workItems[0].title || workItems[0].fields?.['System.Title'],
          state: workItems[0].state || workItems[0].fields?.['System.State'],
        } : null,
      }
    });
    
    console.log('🔍 [UPDATE_WORKITEMS_STORE] Work items update message sent successfully!');
  } catch (err) {
    console.error('🔍 [UPDATE_WORKITEMS_STORE] Failed to update store:', err);
    logger?.('[postWorkItemsUpdate] Failed to update webview store', { error: err });
  }
}
