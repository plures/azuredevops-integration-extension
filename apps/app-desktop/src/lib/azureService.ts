/**
 * Azure DevOps API Service for Desktop App
 * 
 * This module provides a service layer that bridges Tauri IPC commands
 * with the Azure DevOps REST API client from the parent repository.
 */

// Import types and client - using relative paths to parent repo
// Note: These imports work at runtime due to the monorepo structure
// @ts-ignore - Parent repo imports
import { AzureDevOpsIntClient } from '../../../src/azureClient.js';

// Type definitions for work items (inline to avoid import issues)
interface WorkItemFields {
  [key: string]: any;
  'System.Id'?: number;
  'System.Title'?: string;
  'System.State'?: string;
  'System.WorkItemType'?: string;
  'System.AssignedTo'?: any;
}

interface WorkItem {
  id?: number;
  fields: WorkItemFields;
  relations?: any[];
}

// Connection configuration interface matching Rust struct
interface ConnectionConfig {
  id: string;
  organization: string;
  project: string;
  baseUrl: string;
  label?: string;
  authMethod: string;
}

// Singleton client instances per connection
const clientCache = new Map<string, AzureDevOpsIntClient>();

/**
 * Get or create Azure DevOps client for a connection
 */
export async function getAzureClient(
  connection: ConnectionConfig,
  token: string
): Promise<AzureDevOpsIntClient> {
  const cacheKey = `${connection.id}`;
  
  // Return cached client if available
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }
  
  // Create new client
  const client = new AzureDevOpsIntClient(
    connection.organization,
    connection.project,
    token,
    {
      baseUrl: connection.baseUrl,
      authType: connection.authMethod === 'entra' ? 'bearer' : 'pat',
      onAuthFailure: (error: Error) => {
        console.error('[AzureService] Auth failure:', error);
        // Remove from cache on auth failure
        clientCache.delete(cacheKey);
      }
    }
  );
  
  // Cache the client
  clientCache.set(cacheKey, client);
  
  return client;
}

/**
 * Fetch work items using WIQL query
 */
export async function fetchWorkItems(
  connection: ConnectionConfig,
  token: string,
  wiql?: string
): Promise<WorkItem[]> {
  const client = await getAzureClient(connection, token);
  
  // Default query if none provided - fetch recent active work items
  const query = wiql || `
    SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.WorkItemType], [System.ChangedDate]
    FROM WorkItems
    WHERE [System.TeamProject] = @project
      AND [System.State] <> 'Closed'
      AND [System.State] <> 'Removed'
    ORDER BY [System.ChangedDate] DESC
  `;
  
  console.log('[AzureService] Fetching work items for project:', connection.project);
  const items = await client.runWIQL(query);
  console.log('[AzureService] Fetched', items.length, 'work items');
  return items;
}

/**
 * Get a single work item by ID
 */
export async function getWorkItemById(
  connection: ConnectionConfig,
  token: string,
  id: number
): Promise<WorkItem | null> {
  const client = await getAzureClient(connection, token);
  return await client.getWorkItemById(id);
}

/**
 * Search work items
 */
export async function searchWorkItems(
  connection: ConnectionConfig,
  token: string,
  searchTerm: string
): Promise<WorkItem[]> {
  const client = await getAzureClient(connection, token);
  
  console.log('[AzureService] Searching work items for term:', searchTerm);
  
  // Use title search via WIQL
  const query = `
    SELECT [System.Id], [System.Title], [System.State], [System.AssignedTo], [System.WorkItemType], [System.ChangedDate]
    FROM WorkItems
    WHERE [System.TeamProject] = @project
      AND [System.Title] CONTAINS '${searchTerm.replace(/'/g, "''")}'
      AND [System.State] <> 'Closed'
      AND [System.State] <> 'Removed'
    ORDER BY [System.ChangedDate] DESC
  `;
  
  const items = await client.runWIQL(query);
  console.log('[AzureService] Found', items.length, 'work items matching search');
  return items;
}

/**
 * Update a work item
 */
export async function updateWorkItem(
  connection: ConnectionConfig,
  token: string,
  id: number,
  patchOps: any[]
): Promise<WorkItem> {
  const client = await getAzureClient(connection, token);
  return await client.updateWorkItem(id, patchOps);
}

/**
 * Create a new work item
 */
export async function createWorkItem(
  connection: ConnectionConfig,
  token: string,
  workItemType: string,
  title: string,
  description?: string
): Promise<WorkItem> {
  const client = await getAzureClient(connection, token);
  return await client.createWorkItem(workItemType, title, description);
}

/**
 * Get available work item types
 */
export async function getWorkItemTypes(
  connection: ConnectionConfig,
  token: string
): Promise<any[]> {
  const client = await getAzureClient(connection, token);
  return await client.getWorkItemTypes();
}

/**
 * Clear cached clients (e.g., on logout or connection change)
 */
export function clearClientCache(connectionId?: string) {
  if (connectionId) {
    clientCache.delete(connectionId);
  } else {
    clientCache.clear();
  }
}
