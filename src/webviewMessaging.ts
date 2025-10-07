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
  if (!panel) return;
  try {
    logger?.('[postToWebview] posting message', {
      type: message?.type,
      hasPanel: !!panel,
    });
    panel.webview.postMessage(message);
  } catch (err) {
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

export function postConnectionsUpdate({
  panel,
  connections,
  activeConnectionId,
  logger,
}: PostConnectionsUpdateParams): void {
  const entries = connections.map((connection) => ({
    id: connection.id,
    label: getConnectionLabel(connection),
    organization: connection.organization,
    project: connection.project,
    authMethod: connection.authMethod,
  }));

  postToWebview({
    panel,
    logger,
    message: {
      type: 'connectionsUpdate',
      connections: entries,
      activeConnectionId,
    },
  });
}
