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
