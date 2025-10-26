import { WorkItemsProvider, type ProviderLogger } from '../../../provider.js';
import type { AzureDevOpsIntClient } from '../../../azureClient.js';
import type { WorkItem } from '../../../types.js';
import { enrichWorkItemsForConnection, type ConnectionBranchSource } from './branchEnrichment.js';

type WorkItemsTransformPayload = {
  items: WorkItem[];
  connectionId: string;
};

type ProviderFactoryOptions = {
  connectionId: string;
  client: AzureDevOpsIntClient;
  postMessage: (message: unknown) => void;
  logger?: ProviderLogger;
  debounceMs?: number;
};

export function createBranchAwareTransform(
  source: ConnectionBranchSource
): (payload: WorkItemsTransformPayload) => Promise<WorkItem[]> {
  return async (payload: WorkItemsTransformPayload) => {
    return enrichWorkItemsForConnection(source, payload);
  };
}

export function createConnectionProvider(options: ProviderFactoryOptions): WorkItemsProvider {
  const { connectionId, client, postMessage, logger, debounceMs } = options;

  const provider = new WorkItemsProvider(connectionId, client, postMessage, {
    logger,
    debounceMs,
    transformWorkItems: createBranchAwareTransform({ id: connectionId, client }),
  });

  return provider;
}
