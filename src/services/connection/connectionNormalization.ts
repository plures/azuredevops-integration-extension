import type { ProjectConnection } from '../../types/application.js';

export interface NormalizeConnectionsResult {
  connections: ProjectConnection[];
  requiresSave: boolean;
  summary: {
    normalized: number;
    added: number;
    migrated: number;
  };
}

export interface LegacyFallback {
  organization: string;
  project: string;
  team?: string;
  label?: string;
}

/**
 * Normalize connections from config, handling legacy formats and migration
 */
export function normalizeConnections(
  rawConnections: unknown[],
  legacyFallback?: LegacyFallback
): NormalizeConnectionsResult {
  const normalized: ProjectConnection[] = [];
  let requiresSave = false;
  let added = 0;
  let migrated = 0;

  // Process raw connections
  for (const raw of rawConnections) {
    if (!raw || typeof raw !== 'object') continue;

    const conn = raw as any;

    // Validate required fields
    if (!conn.organization || !conn.project) {
      continue; // Skip invalid connections
    }

    // Normalize connection
    const normalizedConn: ProjectConnection = {
      id: conn.id || `${conn.organization}-${conn.project}-${Date.now()}`,
      organization: String(conn.organization).trim(),
      project: String(conn.project).trim(),
      team: conn.team ? String(conn.team).trim() : undefined,
      label: conn.label ? String(conn.label).trim() : undefined,
      baseUrl: conn.baseUrl ? String(conn.baseUrl).trim() : undefined,
      apiBaseUrl: conn.apiBaseUrl ? String(conn.apiBaseUrl).trim() : undefined,
      authMethod: conn.authMethod === 'entra' ? 'entra' : 'pat',
      patKey: conn.patKey ? String(conn.patKey).trim() : undefined,
      tenantId: conn.tenantId ? String(conn.tenantId).trim() : undefined,
      identityName: conn.identityName ? String(conn.identityName).trim() : undefined,
    };

    // Check if ID was generated (migration needed)
    if (!conn.id) {
      requiresSave = true;
      added++;
    }

    // Check if other fields need normalization
    if (
      conn.organization !== normalizedConn.organization ||
      conn.project !== normalizedConn.project ||
      (conn.team || '') !== (normalizedConn.team || '') ||
      (conn.label || '') !== (normalizedConn.label || '')
    ) {
      requiresSave = true;
      migrated++;
    }

    normalized.push(normalizedConn);
  }

  // Add legacy fallback if no connections exist
  if (normalized.length === 0 && legacyFallback) {
    const legacyConn: ProjectConnection = {
      id: `${legacyFallback.organization}-${legacyFallback.project}-${Date.now()}`,
      organization: legacyFallback.organization,
      project: legacyFallback.project,
      team: legacyFallback.team,
      label: legacyFallback.label,
      authMethod: 'pat',
    };
    normalized.push(legacyConn);
    requiresSave = true;
    added++;
    migrated++;
  }

  return {
    connections: normalized,
    requiresSave,
    summary: {
      normalized: normalized.length,
      added,
      migrated,
    },
  };
}

export interface ResolveActiveConnectionIdResult {
  activeConnectionId: string | undefined;
  requiresPersistence: boolean;
}

/**
 * Resolve the active connection ID from persisted value and available connections
 */
export function resolveActiveConnectionId(
  persistedActive: string | undefined,
  connections: ProjectConnection[]
): ResolveActiveConnectionIdResult {
  // If no connections, return undefined
  if (connections.length === 0) {
    return {
      activeConnectionId: undefined,
      requiresPersistence: persistedActive !== undefined, // Clear if persisted but no connections
    };
  }

  // If persisted value exists and is valid, use it
  if (persistedActive) {
    const found = connections.find((c) => c.id === persistedActive);
    if (found) {
      return {
        activeConnectionId: persistedActive,
        requiresPersistence: false, // Already persisted and valid
      };
    }
  }

  // Otherwise, use first connection
  const firstConnectionId = connections[0]?.id;
  return {
    activeConnectionId: firstConnectionId,
    requiresPersistence: persistedActive !== firstConnectionId, // Persist if different
  };
}
