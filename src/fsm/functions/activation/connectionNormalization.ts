/**
 * Module: src/fsm/functions/activation/connectionNormalization.ts
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
import { randomUUID } from 'crypto';
import type { ProjectConnection } from '../../machines/applicationTypes.js';

export interface LegacyConnectionFallback {
  organization?: string;
  project?: string;
  team?: string;
  label?: string;
}

export interface NormalizationDependencies {
  generateId?: () => string;
  createPatKey?: (connectionId: string) => string;
  computeDefaultBaseUrl?: (organization: string) => string;
  computeApiBaseUrl?: (baseUrl: string, organization: string, project: string) => string;
}

export interface NormalizationSummary {
  generatedIds: string[];
  addedPatKeys: string[];
  addedBaseUrls: string[];
  addedApiBaseUrls: string[];
  removedInvalidEntries: number;
}

export interface NormalizeConnectionsResult {
  connections: ProjectConnection[];
  requiresSave: boolean;
  summary: NormalizationSummary;
}

const defaultDependencies: Required<NormalizationDependencies> = {
  generateId: () =>
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : randomUUID(),
  createPatKey: (connectionId: string) => `azureDevOpsInt.pat.${connectionId}`,
  computeDefaultBaseUrl: (organization: string) => `https://dev.azure.com/${organization}`,
  computeApiBaseUrl: (baseUrl: string, organization: string, project: string) => {
    const trimmedBase = baseUrl.replace(/\/$/, '');
    const lower = trimmedBase.toLowerCase();
    if (lower.includes('dev.azure.com')) {
      return `${trimmedBase}/${organization}/${project}/_apis`;
    }
    if (lower.includes('visualstudio.com')) {
      return `${trimmedBase}/${project}/_apis`;
    }
    return `${trimmedBase}/${organization}/${project}/_apis`;
  },
};

export function normalizeConnections(
  rawConnections: unknown[],
  legacyFallback: LegacyConnectionFallback | undefined,
  dependencies: NormalizationDependencies = {}
): NormalizeConnectionsResult {
  const deps = { ...defaultDependencies, ...filterUndefined(dependencies) };
  const normalized: ProjectConnection[] = [];
  const generatedIds: string[] = [];
  const addedPatKeys: string[] = [];
  const addedBaseUrls: string[] = [];
  const addedApiBaseUrls: string[] = [];
  let removedInvalidEntries = 0;

  for (const raw of rawConnections) {
    const result = sanitizeConnection(raw, deps);
    if (!result.connection) {
      if (result.removed) {
        removedInvalidEntries += 1;
      }
      continue;
    }

    if (result.generatedId) {
      generatedIds.push(result.connection.id);
    }
    if (result.addedPatKey) {
      addedPatKeys.push(result.connection.id);
    }
    if (result.addedBaseUrl) {
      addedBaseUrls.push(result.connection.id);
    }
    if (result.addedApiBaseUrl) {
      addedApiBaseUrls.push(result.connection.id);
    }

    normalized.push(result.connection);
  }

  if (
    normalized.length === 0 &&
    legacyFallback &&
    legacyFallback.organization &&
    legacyFallback.project
  ) {
    const fallbackId = deps.generateId();
    normalized.push({
      id: fallbackId,
      organization: legacyFallback.organization,
      project: legacyFallback.project,
      team: legacyFallback.team,
      label: legacyFallback.label,
      authMethod: undefined,
      patKey: deps.createPatKey(fallbackId),
      baseUrl: deps.computeDefaultBaseUrl(legacyFallback.organization),
      apiBaseUrl: deps.computeApiBaseUrl(
        deps.computeDefaultBaseUrl(legacyFallback.organization),
        legacyFallback.organization,
        legacyFallback.project
      ),
    });
    generatedIds.push(fallbackId);
    addedPatKeys.push(fallbackId);
    addedBaseUrls.push(fallbackId);
    addedApiBaseUrls.push(fallbackId);
  }

  const requiresSave =
    generatedIds.length > 0 ||
    addedPatKeys.length > 0 ||
    addedBaseUrls.length > 0 ||
    addedApiBaseUrls.length > 0;

  return {
    connections: normalized,
    requiresSave,
    summary: {
      generatedIds,
      addedPatKeys,
      addedBaseUrls,
      addedApiBaseUrls,
      removedInvalidEntries,
    },
  };
}

export interface ResolveActiveConnectionResult {
  activeConnectionId?: string;
  requiresPersistence: boolean;
  reason: 'persisted' | 'defaulted-first' | 'cleared';
}

export function resolveActiveConnectionId(
  persistedActiveId: string | undefined,
  connections: ProjectConnection[]
): ResolveActiveConnectionResult {
  if (connections.length === 0) {
    return {
      activeConnectionId: undefined,
      requiresPersistence: Boolean(persistedActiveId),
      reason: 'cleared',
    };
  }

  if (persistedActiveId) {
    const exists = connections.some((connection) => connection.id === persistedActiveId);
    if (exists) {
      return {
        activeConnectionId: persistedActiveId,
        requiresPersistence: false,
        reason: 'persisted',
      };
    }
  }

  return {
    activeConnectionId: connections[0]?.id,
    requiresPersistence: true,
    reason: 'defaulted-first',
  };
}

interface SanitizeResult {
  connection: ProjectConnection | null;
  generatedId: boolean;
  addedPatKey: boolean;
  addedBaseUrl: boolean;
  addedApiBaseUrl: boolean;
  removed: boolean;
}

function sanitizeConnection(
  raw: unknown,
  deps: Required<NormalizationDependencies>
): SanitizeResult {
  if (!raw || typeof raw !== 'object') {
    return emptyResult(true);
  }

  const record = raw as Record<string, unknown>;
  // Decode any percent-encoded identifiers to ensure we persist raw values
  const decodeIfEncoded = (value: string): string => {
    try {
      const decoded = decodeURIComponent(value);
      // If decoding changes the string, prefer decoded raw value
      return decoded;
    } catch {
      return value;
    }
  };

  const organizationInput = readString(record.organization);
  const projectInput = readString(record.project);
  if (!organizationInput || !projectInput) {
    return emptyResult(true);
  }
  const organization = decodeIfEncoded(organizationInput);
  const project = decodeIfEncoded(projectInput);

  const id = readString(record.id) ?? deps.generateId();
  const generatedId = !readString(record.id);

  const label = readOptionalString(record.label);
  const teamRaw = readOptionalString(record.team);
  const team = teamRaw ? decodeIfEncoded(teamRaw) : undefined;
  const tenantId = readOptionalString(record.tenantId);
  const identityName = readOptionalString(record.identityName);

  const authMethodRaw = readOptionalString(record.authMethod);
  const authMethod = deriveAuthMethod(authMethodRaw, tenantId);

  let patKey = readOptionalString(record.patKey);
  let addedPatKey = false;
  if (!patKey && authMethod !== 'entra') {
    patKey = deps.createPatKey(id);
    addedPatKey = true;
  }

  let baseUrl = readOptionalString(record.baseUrl);
  let addedBaseUrl = false;
  if (!baseUrl) {
    baseUrl = deps.computeDefaultBaseUrl(organization);
    addedBaseUrl = true;
  }

  let apiBaseUrl = readOptionalString(record.apiBaseUrl);
  let addedApiBaseUrl = false;
  if (!apiBaseUrl && baseUrl) {
    apiBaseUrl = deps.computeApiBaseUrl(baseUrl, organization, project);
    addedApiBaseUrl = true;
  }

  const connection: ProjectConnection = {
    id,
    organization,
    project,
    team: team ?? undefined,
    label: label ?? undefined,
    authMethod: authMethod ?? undefined,
    patKey: patKey ?? undefined,
    baseUrl: baseUrl ?? undefined,
    apiBaseUrl: apiBaseUrl ?? undefined,
    tenantId: tenantId ?? undefined,
    identityName: identityName ?? undefined,
  };

  return {
    connection,
    generatedId,
    addedPatKey,
    addedBaseUrl,
    addedApiBaseUrl,
    removed: false,
  };
}

function deriveAuthMethod(
  authMethod: string | undefined,
  tenantId: string | undefined
): 'pat' | 'entra' | undefined {
  if (authMethod === 'entra' || authMethod === 'pat') {
    return authMethod;
  }
  if (tenantId) {
    return 'entra';
  }
  return undefined;
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readOptionalString(value: unknown): string | undefined {
  const result = readString(value);
  return result === null ? undefined : result;
}

function emptyResult(removed: boolean): SanitizeResult {
  return {
    connection: null,
    generatedId: false,
    addedPatKey: false,
    addedBaseUrl: false,
    addedApiBaseUrl: false,
    removed,
  };
}

function filterUndefined<T extends object>(input: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value as unknown;
    }
  }
  return result;
}

// Intentionally empty - helper retained for future dependency injection if needed.
