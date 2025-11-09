/**
 * Module: src/fsm/functions/azure/azure-devops-client.ts
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
import * as azdo from 'azure-devops-node-api';

export function getAzureDevOpsApi(serverUrl: string, token: string): azdo.WebApi {
  const authHandler = azdo.getPersonalAccessTokenHandler(token);
  const connection = new azdo.WebApi(serverUrl, authHandler);
  return connection;
}

export async function getWorkItemTrackingApi(serverUrl: string, token: string) {
  const webApi = getAzureDevOpsApi(serverUrl, token);
  return await webApi.getWorkItemTrackingApi();
}
