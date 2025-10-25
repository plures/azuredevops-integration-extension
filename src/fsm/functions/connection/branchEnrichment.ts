import * as vscode from 'vscode';
import type { AzureDevOpsIntClient } from '../../../azureClient.js';
import type {
  WorkItem,
  WorkItemBranchLink,
  WorkItemBranchMetadata,
  WorkItemBuildSummary,
} from '../../../types.js';

export type BranchContext = {
  branchName?: string;
  branchRef?: string;
  repositoryId?: string;
  repositoryName?: string;
  remoteUrl?: string;
  lastUpdated: number;
};

export type BranchEnrichmentState = {
  context: BranchContext | null;
  hasActiveBuild: boolean;
  lastUpdated: number;
};

export type ConnectionBranchSource = {
  id: string;
  client?: AzureDevOpsIntClient;
};

type RepositoryCacheEntry = {
  fetchedAt: number;
  repos: any[];
};

type BuildCacheEntry = {
  fetchedAt: number;
  builds: WorkItemBuildSummary[];
};

const branchStateByConnection = new Map<string, BranchEnrichmentState>();
const repositoryCacheByConnection = new Map<string, RepositoryCacheEntry>();
const buildCacheByKey = new Map<string, BuildCacheEntry>();
const buildRefreshTimers = new Map<string, NodeJS.Timeout>();

let cachedGitApi: any | undefined;

export const BRANCH_REFRESH_INTERVAL_MS = 30 * 1000;
export const REPOSITORY_CACHE_TTL_MS = 5 * 60 * 1000;
export const BUILD_CACHE_TTL_MS = 20 * 1000;

function getGitCacheKey(connectionId: string, repositoryId?: string, branchRef?: string): string {
  return `${connectionId}|${repositoryId ?? 'any'}|${branchRef ?? 'unknown'}`;
}

export function getBranchContext(connectionId: string): BranchContext | null {
  return branchStateByConnection.get(connectionId)?.context ?? null;
}

export function getBranchEnrichmentState(connectionId: string): BranchEnrichmentState | undefined {
  return branchStateByConnection.get(connectionId);
}

export function clearConnectionCaches(connectionId: string): void {
  branchStateByConnection.delete(connectionId);
  repositoryCacheByConnection.delete(connectionId);

  for (const key of Array.from(buildCacheByKey.keys())) {
    if (key.startsWith(`${connectionId}|`)) {
      buildCacheByKey.delete(key);
    }
  }

  const timer = buildRefreshTimers.get(connectionId);
  if (timer) {
    try {
      clearTimeout(timer);
    } catch {
      /* ignore */
    }
    buildRefreshTimers.delete(connectionId);
  }
}

export function updateBuildRefreshTimer(
  connectionId: string,
  provider: { refresh: (query?: string) => unknown } | undefined,
  shouldPoll: boolean
): void {
  const existing = buildRefreshTimers.get(connectionId);

  if (!shouldPoll) {
    if (existing) {
      try {
        clearTimeout(existing);
      } catch {
        /* ignore */
      }
      buildRefreshTimers.delete(connectionId);
    }
    return;
  }

  if (existing || !provider) {
    return;
  }

  const timer = setTimeout(() => {
    buildRefreshTimers.delete(connectionId);
    Promise.resolve(provider.refresh())
      .catch((error) => {
        console.warn('[AzureDevOpsInt] [branchEnrichment] Build polling refresh failed', error);
      })
      .then(() => {
        /* noop */
      });
  }, BRANCH_REFRESH_INTERVAL_MS);

  buildRefreshTimers.set(connectionId, timer);
}

type ParsedRemote = {
  organization?: string;
  project?: string;
  repositoryName?: string;
};

type ParsedBranchLink = {
  projectId?: string;
  repositoryId?: string;
  refName?: string;
  shortName?: string;
};

function formatMeta(meta: unknown): string | undefined {
  if (meta === undefined || meta === null) {
    return undefined;
  }
  if (typeof meta === 'string') {
    return meta;
  }
  try {
    return JSON.stringify(meta);
  } catch {
    return undefined;
  }
}

async function getGitApi(): Promise<any | undefined> {
  if (cachedGitApi) {
    return cachedGitApi;
  }

  try {
    const gitExt = vscode.extensions.getExtension('vscode.git');
    if (!gitExt) {
      return undefined;
    }

    const exports = gitExt.isActive ? gitExt.exports : await gitExt.activate();
    const api = exports?.getAPI?.(1);
    cachedGitApi = api;
    return api;
  } catch (error) {
    console.warn(
      '[AzureDevOpsInt] [branchEnrichment] Failed to acquire git API',
      formatMeta(error)
    );
    return undefined;
  }
}

function normalizeRepositoryName(name?: string | null): string | undefined {
  if (!name) {
    return undefined;
  }

  const trimmed = name.trim().replace(/\.git$/i, '');
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseAzureRemote(remoteUrl?: string | null): ParsedRemote | undefined {
  if (!remoteUrl) {
    return undefined;
  }

  try {
    if (/^https?:/i.test(remoteUrl)) {
      const url = new URL(remoteUrl);
      const segments = url.pathname.split('/').filter(Boolean);
      const gitIndex = segments.findIndex((segment) => segment.toLowerCase() === '_git');

      if (gitIndex >= 0 && segments.length > gitIndex + 1) {
        return {
          organization: segments[0],
          project: segments[1],
          repositoryName: normalizeRepositoryName(segments[gitIndex + 1]),
        };
      }

      if (segments.length >= 3) {
        return {
          organization: segments[0],
          project: segments[1],
          repositoryName: normalizeRepositoryName(segments[segments.length - 1]),
        };
      }
    } else if (remoteUrl.includes('ssh.dev.azure.com')) {
      const marker = 'ssh.dev.azure.com:v3/';
      const idx = remoteUrl.indexOf(marker);

      if (idx >= 0) {
        const parts = remoteUrl
          .slice(idx + marker.length)
          .split(/[\\/]/)
          .filter(Boolean);

        if (parts.length >= 3) {
          return {
            organization: parts[0],
            project: parts[1],
            repositoryName: normalizeRepositoryName(parts[2]),
          };
        }
      }
    } else if (remoteUrl.includes('vs-ssh.visualstudio.com')) {
      const marker = 'vs-ssh.visualstudio.com:';
      const idx = remoteUrl.indexOf(marker);

      if (idx >= 0) {
        const after = remoteUrl.slice(idx + marker.length).replace(/^v[23]\//i, '');
        const parts = after.split(/[\\/]/).filter(Boolean);

        if (parts.length >= 3) {
          return {
            organization: parts[0],
            project: parts[1],
            repositoryName: normalizeRepositoryName(parts[2]),
          };
        }
      }
    }
  } catch (error) {
    console.warn(
      '[AzureDevOpsInt] [branchEnrichment] Failed to parse Azure remote URL',
      formatMeta({ remoteUrl, error })
    );
  }

  return undefined;
}

function normalizeBranchRef(ref?: string | null): { full: string; short: string } | null {
  if (!ref) {
    return null;
  }

  const trimmed = String(ref).trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('refs/')) {
    const short = trimmed.startsWith('refs/heads/') ? trimmed.slice('refs/heads/'.length) : trimmed;
    return { full: trimmed, short };
  }

  return { full: `refs/heads/${trimmed}`, short: trimmed };
}

function parseBranchArtifactLink(url?: string | null): ParsedBranchLink | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const prefix = 'vstfs:///Git/Ref/';
  if (!url.startsWith(prefix)) {
    return null;
  }

  try {
    const remainder = url.slice(prefix.length);
    const parts = remainder.split('%2F');
    if (parts.length < 3) {
      return null;
    }

    const projectId = decodeURIComponent(parts[0]);
    const repositoryId = decodeURIComponent(parts[1]);
    const encodedRef = parts.slice(2).join('%2F');
    const rawRef = decodeURIComponent(encodedRef);

    let refName = rawRef;
    let shortName: string | undefined;

    if (refName.startsWith('GB')) {
      shortName = refName.slice(2);
      if (shortName.startsWith('refs/')) {
        refName = shortName;
        shortName = refName.replace(/^refs\/heads\//, '');
      } else {
        refName = `refs/heads/${shortName}`;
      }
    } else if (refName.startsWith('GT')) {
      shortName = refName.slice(2);
      refName = `refs/tags/${shortName}`;
    } else if (refName.startsWith('refs/')) {
      shortName = refName.replace(/^refs\/heads\//, '');
    }

    return { projectId, repositoryId, refName, shortName };
  } catch (error) {
    console.warn(
      '[AzureDevOpsInt] [branchEnrichment] Failed to parse branch artifact link',
      formatMeta({ url, error })
    );
    return null;
  }
}

async function getAzureRepositoryByName(
  connectionId: string,
  client: AzureDevOpsIntClient,
  repoName?: string
): Promise<any | null> {
  if (!repoName) {
    return null;
  }

  const normalized = repoName.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const cached = repositoryCacheByConnection.get(connectionId);
  const now = Date.now();
  let repos: any[] | null = null;

  if (cached && now - cached.fetchedAt < REPOSITORY_CACHE_TTL_MS) {
    repos = cached.repos;
  } else {
    try {
      const fetched = await client.getRepositories();
      if (Array.isArray(fetched)) {
        repos = fetched;
        repositoryCacheByConnection.set(connectionId, { fetchedAt: now, repos: fetched });
      }
    } catch (error) {
      console.warn(
        '[AzureDevOpsInt] [branchEnrichment] Failed to fetch repositories',
        formatMeta(error)
      );
      return null;
    }
  }

  if (!Array.isArray(repos)) {
    return null;
  }

  return (
    repos.find(
      (r: any) => typeof r?.name === 'string' && r.name.trim().toLowerCase() === normalized
    ) ||
    repos.find((r: any) => typeof r?.id === 'string' && r.id.trim().toLowerCase() === normalized) ||
    null
  );
}

async function resolveBranchContext(source: ConnectionBranchSource): Promise<BranchContext | null> {
  const api = await getGitApi();
  if (!api) {
    return null;
  }

  const repo = Array.isArray(api.repositories) ? api.repositories[0] : undefined;
  if (!repo) {
    return null;
  }

  const head = repo.state?.HEAD;
  const normalized = normalizeBranchRef(head?.name || head?.upstream?.name);
  if (!normalized) {
    return null;
  }

  const remotes: any[] = Array.isArray(repo.state?.remotes) ? repo.state.remotes : [];
  const remote =
    remotes.find((r: any) => !r?.isReadOnly && (r?.pushUrl || r?.fetchUrl)) || remotes[0];
  const remoteUrl = remote?.pushUrl || remote?.fetchUrl;
  const parsedRemote = parseAzureRemote(remoteUrl);

  let repositoryId: string | undefined;
  let repositoryName = parsedRemote?.repositoryName;

  if (repositoryName && source.client) {
    const repoMeta = await getAzureRepositoryByName(source.id, source.client, repositoryName);
    if (repoMeta) {
      if (typeof repoMeta.id === 'string') {
        repositoryId = repoMeta.id;
      }
      if (typeof repoMeta.name === 'string' && repoMeta.name.trim().length > 0) {
        repositoryName = repoMeta.name.trim();
      }
    }
  }

  return {
    branchName: normalized.short,
    branchRef: normalized.full,
    repositoryId,
    repositoryName,
    remoteUrl,
    lastUpdated: Date.now(),
  };
}

async function getBuildsForBranch(
  connectionId: string,
  client: AzureDevOpsIntClient,
  branchRef: string,
  repositoryId?: string
): Promise<WorkItemBuildSummary[]> {
  const key = getGitCacheKey(connectionId, repositoryId, branchRef);
  const cached = buildCacheByKey.get(key);
  const now = Date.now();

  if (cached && now - cached.fetchedAt < BUILD_CACHE_TTL_MS) {
    return cached.builds;
  }

  try {
    const builds = await client.getRecentBuilds({
      top: 5,
      branchName: branchRef,
      repositoryId,
    });

    if (Array.isArray(builds)) {
      buildCacheByKey.set(key, { fetchedAt: now, builds });
      return builds;
    }
  } catch (error) {
    console.warn(
      '[AzureDevOpsInt] [branchEnrichment] Failed to fetch builds for branch',
      formatMeta(error)
    );
  }

  buildCacheByKey.set(key, { fetchedAt: now, builds: [] });
  return [];
}

const FINISHED_BUILD_STATUSES = new Set(['completed', 'postponed']);
const FINISHED_BUILD_RESULTS = new Set([
  'succeeded',
  'failed',
  'canceled',
  'cancelled',
  'partiallysucceeded',
]);

function isBuildActive(summary?: WorkItemBuildSummary | null): boolean {
  if (!summary) {
    return false;
  }

  const status = typeof summary.status === 'string' ? summary.status.toLowerCase() : '';
  if (status) {
    return !FINISHED_BUILD_STATUSES.has(status);
  }

  const result = typeof summary.result === 'string' ? summary.result.toLowerCase() : '';
  if (!result) {
    return true;
  }

  return !FINISHED_BUILD_RESULTS.has(result);
}

type BranchMatchResult = {
  relation: WorkItemBranchLink;
  parsed: ParsedBranchLink;
  confidence: WorkItemBranchMetadata['matchConfidence'];
};

function findBestBranchMatch(
  relations: WorkItemBranchLink[],
  targetBranchRef: string,
  targetBranchName: string,
  targetRepositoryId?: string
): BranchMatchResult | null {
  if (!Array.isArray(relations) || relations.length === 0) {
    return null;
  }

  let best: { score: number; result: BranchMatchResult } | null = null;

  for (const relation of relations) {
    const parsed = parseBranchArtifactLink(relation.url);
    if (!parsed) {
      continue;
    }

    const normalized = normalizeBranchRef(parsed.refName || relation.refName);
    const relationRef = normalized?.full?.toLowerCase();
    const relationShort = (normalized?.short || parsed.shortName || '').toLowerCase();
    const desiredRef = targetBranchRef.toLowerCase();
    const desiredShort = targetBranchName.toLowerCase();
    const refMatches = !!relationRef && relationRef === desiredRef;
    const nameMatches = relationShort === desiredShort && desiredShort.length > 0;

    if (!refMatches && !nameMatches) {
      continue;
    }

    const repoMatch =
      targetRepositoryId && parsed.repositoryId
        ? parsed.repositoryId.toLowerCase() === targetRepositoryId.toLowerCase()
        : !targetRepositoryId;

    let score = 0;
    let confidence: WorkItemBranchMetadata['matchConfidence'] = 'name';

    if (refMatches) {
      score += 2;
      confidence = repoMatch ? 'exact' : 'refOnly';
    } else if (nameMatches) {
      score += 1;
      confidence = 'name';
    }

    if (repoMatch) {
      score += 1;
    }

    if (!best || score > best.score) {
      const result: BranchMatchResult = {
        relation,
        parsed: {
          projectId: parsed.projectId,
          repositoryId: parsed.repositoryId,
          refName: normalized?.full || parsed.refName,
          shortName: normalized?.short || parsed.shortName,
        },
        confidence,
      };

      best = { score, result };
    }
  }

  return best?.result ?? null;
}

export async function enrichWorkItemsForConnection(
  source: ConnectionBranchSource,
  payload: { items: WorkItem[]; connectionId: string }
): Promise<WorkItem[]> {
  const sourceItems = Array.isArray(payload.items) ? payload.items : [];
  const client = source.client;

  if (!client || sourceItems.length === 0) {
    branchStateByConnection.set(source.id, {
      context: null,
      hasActiveBuild: false,
      lastUpdated: Date.now(),
    });
    return [...sourceItems];
  }

  const branchContext = await resolveBranchContext(source);
  if (!branchContext) {
    branchStateByConnection.set(source.id, {
      context: null,
      hasActiveBuild: false,
      lastUpdated: Date.now(),
    });
    return sourceItems.map((item) => {
      const clone: WorkItem = { ...item };
      if ((clone as any).branchMetadata) {
        delete (clone as any).branchMetadata;
      }
      if (Array.isArray(item.relations)) {
        clone.relations = item.relations.map((rel) => ({ ...rel }));
      }
      return clone;
    });
  }

  const normalizedContext = normalizeBranchRef(branchContext.branchRef || branchContext.branchName);
  if (!normalizedContext) {
    branchStateByConnection.set(source.id, {
      context: null,
      hasActiveBuild: false,
      lastUpdated: Date.now(),
    });
    return sourceItems;
  }

  const matchedItems: WorkItem[] = [];
  const unmatchedItems: WorkItem[] = [];
  const matches: Array<{ item: WorkItem; repositoryId?: string; parsed: ParsedBranchLink }> = [];

  for (const original of sourceItems) {
    const clone: WorkItem = { ...original };
    const relations = Array.isArray(original.relations)
      ? original.relations.map((rel) => {
          const relClone: WorkItemBranchLink = { ...rel };
          const parsed = parseBranchArtifactLink(rel.url);
          if (parsed) {
            relClone.repositoryId = parsed.repositoryId;
            relClone.projectId = parsed.projectId;
            relClone.refName = parsed.refName;
          }
          return relClone;
        })
      : [];

    if (relations.length > 0) {
      clone.relations = relations;
    }

    const match = findBestBranchMatch(
      relations,
      normalizedContext.full,
      normalizedContext.short,
      branchContext.repositoryId
    );

    if (match) {
      const repositoryIdForMatch = match.parsed.repositoryId ?? branchContext.repositoryId;
      const metadata: WorkItemBranchMetadata = {
        isCurrentBranch: true,
        branchName: normalizedContext.short,
        refName: normalizedContext.full,
        repositoryId: repositoryIdForMatch,
        repositoryName: branchContext.repositoryName,
        matchConfidence: match.confidence,
        link: { ...match.relation },
        hasActiveBuild: false,
        lastUpdated: new Date().toISOString(),
      };

      clone.branchMetadata = metadata;
      matches.push({ item: clone, repositoryId: repositoryIdForMatch, parsed: match.parsed });
      matchedItems.push(clone);
    } else {
      if ((clone as any).branchMetadata) {
        delete (clone as any).branchMetadata;
      }
      unmatchedItems.push(clone);
    }
  }

  let hasActiveBuild = false;
  let resolvedRepositoryId = branchContext.repositoryId ?? matches[0]?.repositoryId;

  if (matches.length > 0) {
    const buildInfoByRepo = new Map<string, { build?: WorkItemBuildSummary; hasActive: boolean }>();
    const repoKeys = new Set<string>();

    for (const entry of matches) {
      repoKeys.add(entry.repositoryId ?? '__default__');
    }

    for (const repoKey of repoKeys) {
      const resolvedRepoId = repoKey === '__default__' ? branchContext.repositoryId : repoKey;
      const builds = await getBuildsForBranch(
        source.id,
        client,
        normalizedContext.full,
        resolvedRepoId
      );
      const latest = Array.isArray(builds) && builds.length > 0 ? builds[0] : undefined;
      const active = isBuildActive(latest);

      if (active) {
        hasActiveBuild = true;
      }

      buildInfoByRepo.set(repoKey, { build: latest, hasActive: active });
    }

    for (const entry of matches) {
      const info = buildInfoByRepo.get(entry.repositoryId ?? '__default__');
      if (info && entry.item.branchMetadata) {
        entry.item.branchMetadata.build = info.build;
        entry.item.branchMetadata.hasActiveBuild = info.hasActive;
        entry.item.branchMetadata.lastUpdated = new Date().toISOString();
      }
    }
  }

  let resolvedRepositoryName = branchContext.repositoryName;
  if (!resolvedRepositoryName && resolvedRepositoryId && source.client) {
    const repoMeta = await getAzureRepositoryByName(source.id, source.client, resolvedRepositoryId);
    if (repoMeta?.name && typeof repoMeta.name === 'string') {
      resolvedRepositoryName = repoMeta.name.trim();
    }
  }

  if (resolvedRepositoryName) {
    for (const entry of matches) {
      if (entry.item.branchMetadata) {
        entry.item.branchMetadata.repositoryName = resolvedRepositoryName;
      }
    }
  }

  if (resolvedRepositoryId) {
    for (const entry of matches) {
      if (entry.item.branchMetadata && !entry.item.branchMetadata.repositoryId) {
        entry.item.branchMetadata.repositoryId = resolvedRepositoryId;
      }
    }
  }

  const sortedItems = [...matchedItems, ...unmatchedItems];

  resolvedRepositoryId = branchContext.repositoryId ?? resolvedRepositoryId;
  branchStateByConnection.set(source.id, {
    context: {
      ...branchContext,
      branchName: normalizedContext.short,
      branchRef: normalizedContext.full,
      repositoryId: resolvedRepositoryId,
      repositoryName: resolvedRepositoryName ?? branchContext.repositoryName,
    },
    hasActiveBuild,
    lastUpdated: Date.now(),
  });

  return sortedItems;
}
