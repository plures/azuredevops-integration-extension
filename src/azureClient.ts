/**
 * Module: AzureDevOpsIntClient (HTTP client)
 * Owner: connection
 * Reads: Connection configuration from FSM; ApplicationContext via selectors (read-only)
 * Writes: none (context updates happen via FSM reducers)
 * Receives: HTTP requests from provider/connection actors
 * Emits: onAuthFailure callback to FSM; HTTP responses/errors to callers
 * Prohibitions: Do not implement webview logic; Do not define or mutate ApplicationContext
 * Rationale: Single HTTP boundary with structured error classification
 *
 * LLM-GUARD:
 * - On 401 bearer: call onAuthFailure and throw; do not handle UI here
 * - Do not emit SELECT_CONNECTION or any UI events
 *
 * URL invariants:
 * - apiBaseUrl: ALWAYS used for REST API calls. Must include project and end with '/_apis'.
 * - baseUrl:    ONLY used for browser/UI links. Never used for REST calls.
 */
import axios, { AxiosInstance } from 'axios';
import { WorkItem, WorkItemBuildSummary } from './types.js';
import { RateLimiter } from './rateLimiter.js';
import { workItemCache, WorkItemCache } from './cache.js';
import { measureAsync } from './performance.js';
import { createLogger } from './logging/unifiedLogger.js';

const logger = createLogger('azureClient');

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stripProjectSegment = (url: string, encodedProject: string, rawProject?: string): string => {
  const candidates = new Set<string>();
  if (encodedProject) {
    candidates.add(encodedProject);
    const doubleEncoded = encodeURIComponent(encodedProject);
    if (doubleEncoded && doubleEncoded !== encodedProject) {
      candidates.add(doubleEncoded);
    }
  }

  if (rawProject?.trim()) {
    candidates.add(rawProject.trim());
  }

  try {
    const decoded = decodeURIComponent(encodedProject);
    if (decoded) {
      candidates.add(decoded);
      const fullyDecoded = decodeURIComponent(decoded);
      if (fullyDecoded) {
        candidates.add(fullyDecoded);
      }
    }
  } catch {
    // ignore decode issues
  }

  return Array.from(candidates).reduce((current, candidate) => {
    if (!candidate) {
      return current;
    }

    const pattern = new RegExp(`/${escapeRegExp(candidate)}$`);
    return current.replace(pattern, '');
  }, url);
};

type AuthType = 'pat' | 'bearer';

interface ClientOptions {
  ratePerSecond?: number;
  burst?: number;
  team?: string; // Optional team context for iteration APIs and @CurrentIteration resolution
  // If true (default), attempt to use [System.StateCategory] in WIQL filters until proven unsupported.
  wiqlPreferStateCategory?: boolean;
  baseUrl?: string; // Custom base URL for different Azure DevOps instances
  apiBaseUrl?: string; // Manual API base URL override (takes precedence over derived URL)
  authType?: AuthType; // 'pat' (default) or 'bearer' for Entra ID tokens
  identityName?: string; // Optional identity name for on-prem servers where @Me doesn't resolve
  onAuthFailure?: (error: Error) => void;
}

export class AzureDevOpsIntClient {
  public organization: string;
  public project: string;
  public encodedOrganization: string;
  public encodedProject: string;
  public axios: AxiosInstance;
  private _repoCache: any[] | undefined;
  private credential: string; // PAT or access token
  private authType: AuthType;
  private limiter: RateLimiter;
  private onAuthFailure?: (error: Error) => void;
  public team: string | undefined;
  public encodedTeam: string | undefined;
  // Capability cache: prefer using [System.StateCategory] unless Azure DevOps rejects it for this org/project
  private preferStateCategory: boolean;
  private cachedIdentity?: { id?: string; displayName?: string; uniqueName?: string };
  private identityName?: string; // Fallback identity name for on-prem servers
  // baseUrl is for browser/UI links only (e.g., openExternal). Never for REST calls.
  public baseUrl: string;
  // apiBaseUrl is the canonical root for REST calls (must include project + '/_apis').
  private apiBaseUrl: string;
  private static readonly connectionDataApiVersions = [
    '7.1-preview.1',
    '7.0-preview.1',
    '6.0-preview.1',
    '5.1-preview.2',
    '5.0-preview.3',
    '5.0-preview',
    '5.0',
  ];

  private _authorizedGet(url: string) {
    // Use existing axios instance so interceptors attach auth headers; override baseURL to avoid double prefixing
    return this.axios.get(url, { baseURL: undefined });
  }

  constructor(
    organization: string,
    project: string,
    credential: string,
    options: ClientOptions = {}
  ) {
    this.organization = organization;
    this.project = project;
    this.credential = credential;
    this.authType = options.authType ?? 'pat';
    this.onAuthFailure = options.onAuthFailure;
    this.team = options.team?.trim() ? options.team.trim() : undefined;
    this.preferStateCategory = options.wiqlPreferStateCategory ?? true;
    this.identityName = options.identityName?.trim() ? options.identityName.trim() : undefined;
    if (this.identityName) {
      logger.info('Configured with fallback identityName for on-prem', {
        meta: { identityName: this.identityName },
      });
    }
    this.encodedOrganization = encodeURIComponent(organization);
    this.encodedProject = encodeURIComponent(project);
    this.encodedTeam = this.team ? encodeURIComponent(this.team) : undefined;

    // Determine the base URL and API base URL
    // Priority: manual apiBaseUrl override > derived from baseUrl > default cloud
    const trimTrailingSlash = (value?: string) => (value ? value.replace(/\/+$/, '') : undefined);

    const normalizeBaseUrl = (value?: string): string => {
      const fallback = `https://dev.azure.com/${this.encodedOrganization}`;
      if (!value) {
        return fallback;
      }

      const trimmed = trimTrailingSlash(value) ?? fallback;
      const withoutApis = trimmed.replace(/\/_apis$/i, '');

      if (/visualstudio\.com/i.test(withoutApis)) {
        // Keep visualstudio.com host as-is for browser links
        return withoutApis;
      }

      if (/dev\.azure\.com/i.test(withoutApis)) {
        return `https://dev.azure.com/${this.encodedOrganization}`;
      }

      const normalized = stripProjectSegment(withoutApis, this.encodedProject, this.project);
      return trimTrailingSlash(normalized) ?? fallback;
    };

    const ensureApiSuffix = (value: string): string => {
      const trimmed = trimTrailingSlash(value) ?? value;
      return /\/_apis$/i.test(trimmed) ? trimmed : `${trimmed}/_apis`;
    };

    if (options.apiBaseUrl) {
      // TRUST the provided apiBaseUrl for REST calls; only ensure '/_apis' suffix and trim.
      const manualApi = ensureApiSuffix(options.apiBaseUrl).replace(/\/+$/, '');
      // Derive a browser baseUrl from the provided apiBaseUrl by removing the project segment.
      const baseCandidate = manualApi.replace(/\/_apis$/i, '');
      const derivedBase = stripProjectSegment(baseCandidate, this.encodedProject, this.project);
      const preferredBase = options.baseUrl
        ? normalizeBaseUrl(options.baseUrl)
        : normalizeBaseUrl(derivedBase);

      this.baseUrl = preferredBase;
      this.apiBaseUrl = manualApi;

      logger.info('Using apiBaseUrl from settings', {
        meta: { apiBaseUrl: this.apiBaseUrl, baseUrl: this.baseUrl },
      });
    } else if (options.baseUrl) {
      this.baseUrl = normalizeBaseUrl(options.baseUrl);
      this.apiBaseUrl = `${this.baseUrl}/${this.encodedProject}/_apis`;
    } else {
      // Default to dev.azure.com
      this.baseUrl = `https://dev.azure.com/${this.encodedOrganization}`;
      this.apiBaseUrl = `${this.baseUrl}/${this.encodedProject}/_apis`;
    }

    this.baseUrl = this.baseUrl.replace(/\/+$/, '');
    this.apiBaseUrl = this.apiBaseUrl.replace(/\/+$/, '');

    // IMPORTANT: axios baseURL must be apiBaseUrl, not baseUrl.
    this.axios = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: 30000, // 30s network timeout for slow Azure DevOps APIs
      headers: {
        'Content-Type': 'application/json',
      },
    });
    // Rate limiter: allow configurable burst & sustained rate (defaults)
    const rps = Math.max(1, Math.min(50, options.ratePerSecond ?? 5));
    const burst = Math.max(1, Math.min(100, options.burst ?? 10));
    this.limiter = new RateLimiter(rps, burst);

    // Attach auth header on each request
    this.axios.interceptors.request.use(async (cfg) => {
      await this.limiter.acquire();

      // Set authorization header based on auth type
      if (this.authType === 'pat') {
        (cfg.headers ||= {} as any)['Authorization'] =
          `Basic ${Buffer.from(':' + this.credential).toString('base64')}`;
      } else {
        // Bearer token for Entra ID
        (cfg.headers ||= {} as any)['Authorization'] = `Bearer ${this.credential}`;
      }

      (cfg as any).__start = Date.now();
      // Attach attempt counter for retries
      (cfg as any).__attempt = ((cfg as any).__attempt || 0) + 1;

      // Enhanced debugging: log token info (first/last chars only for security)
      const authHeader = cfg.headers?.['Authorization'] as string;
      const tokenDebug = authHeader
        ? `${authHeader.substring(0, 20)}...${authHeader.substring(authHeader.length - 10)}`
        : 'NO_AUTH_HEADER';

      logger.debug('HTTP request', {
        meta: {
          method: cfg.method?.toUpperCase(),
          url: cfg.url,
          attempt: (cfg as any).__attempt,
          token: tokenDebug,
        },
      });
      return cfg;
    });

    this.axios.interceptors.response.use(
      (resp) => {
        const ms = Date.now() - (resp.config as any).__start;
        logger.debug('HTTP response', {
          meta: {
            method: resp.config.method?.toUpperCase(),
            url: resp.config.url,
            status: resp.status,
            duration: `${ms}ms`,
          },
        });
        return resp;
      },
      async (err) => {
        const cfg = err.config || {};
        const ms = cfg.__start ? Date.now() - cfg.__start : 'n/a';
        if (err.response) {
          const { status, statusText, data } = err.response;

          // Enhanced error logging for 404s
          if (status === 404) {
            logger.error('HTTP 404 Details', {
              meta: {
                method: cfg.method?.toUpperCase(),
                url: cfg.url,
                fullUrl: cfg.baseURL + cfg.url,
                status,
                statusText,
                responseData: data,
                authType: this.authType,
                organization: this.organization,
                project: this.project,
              },
            });
          }

          logger.error('HTTP error', {
            meta: {
              method: cfg.method?.toUpperCase(),
              url: cfg.url,
              status,
              statusText,
              duration: `${ms}ms`,
            },
          });
          if (data) {
            let snippet: string;
            try {
              snippet =
                typeof data === 'string' ? data.slice(0, 500) : JSON.stringify(data).slice(0, 500);
            } catch {
              snippet = '[unserializable response data]';
            }
            logger.error('HTTP error body', { meta: { snippet } });
          }

          // Handle 401 for bearer token auth - throw error immediately to stop retry loops
          // Note: 404 is handled individually by methods since it can have different meanings
          if (status === 401 && this.authType === 'bearer') {
            logger.error('HTTP 401 Unauthorized - authentication required');
            const authError = new Error(
              `Authentication failed: 401 Unauthorized. Please re-authenticate.`
            );
            authError.name = 'AuthenticationError';
            (authError as any).status = status;
            try {
              this.onAuthFailure?.(authError);
            } catch (callbackError) {
              logger.error('onAuthFailure callback threw', { meta: callbackError });
            }
            throw authError;
          }

          // Handle 401 for PAT authentication when token is expired
          // Check error message for "expired" to detect PAT expiration vs other auth issues
          if (status === 401 && this.authType === 'pat') {
            const errorMessage = data?.message || (typeof data === 'string' ? data : '') || '';
            const isPatExpired =
              errorMessage.toLowerCase().includes('expired') ||
              errorMessage.toLowerCase().includes('personal access token used has expired');

            if (isPatExpired) {
              logger.error('HTTP 401 Unauthorized - PAT expired');
              const authError = new Error(
                `Personal Access Token has expired. Please update your PAT.`
              );
              authError.name = 'AuthenticationError';
              (authError as any).status = status;
              (authError as any).isPatExpired = true;
              try {
                this.onAuthFailure?.(authError);
              } catch (callbackError) {
                logger.error('onAuthFailure callback threw', { meta: callbackError });
              }
              throw authError;
            }
          }
        } else if (err.code === 'ECONNABORTED') {
          logger.error('HTTP timeout', {
            meta: { method: cfg.method?.toUpperCase(), url: cfg.url, duration: `${ms}ms` },
          });
        } else {
          logger.error('HTTP network error', { meta: { message: err.message } });
        }
        // Retry logic: 429 or >=500 (excluding 501/505 uncommon) with exponential backoff
        const status = err.response?.status;
        const attempt = (cfg as any).__attempt || 1;
        const maxAttempts = 4;
        if (
          status &&
          (status === 429 || (status >= 500 && status < 600)) &&
          attempt < maxAttempts
        ) {
          const backoffBase = 250 * Math.pow(2, attempt - 1);
          const jitter = Math.random() * backoffBase * 0.3;
          const delay = Math.min(4000, backoffBase + jitter);
          logger.warn('HTTP retry', {
            meta: { url: cfg.url, status, retryInMs: Math.round(delay), attempt: attempt + 1 },
          });
          return new Promise((resolve) => setTimeout(resolve, delay)).then(() => this.axios(cfg));
        }
        return Promise.reject(err);
      }
    );
  }

  /**
   * Update the credential (PAT or access token)
   * Useful for refreshing Entra ID tokens
   */
  updateCredential(newCredential: string): void {
    this.credential = newCredential;
  }

  // Build a REST endpoint URL from apiBaseUrl (for HTTP calls)
  buildFullUrl(path: string) {
    return `${this.apiBaseUrl}${path}`;
  }
  // Build a browser URL from baseUrl (for openExternal)
  getBrowserUrl(path: string) {
    return `${this.baseUrl}/${this.encodedProject}${path}`;
  }
  private buildTeamApiUrl(path: string) {
    if (!this.encodedTeam) return this.buildFullUrl(path);
    // Insert team segment before _apis
    const baseWithoutApis = this.apiBaseUrl.replace(/\/_apis$/, '');
    return `${baseWithoutApis}/${this.encodedTeam}/_apis${path}`;
  }

  // ---------------- Identity Helpers ----------------
  /**
   * Fetches the authenticated Azure DevOps user identity GUID using connectionData.
   * Falls back to null on error.
   */
  async getAuthenticatedUserId(): Promise<string | null> {
    logger.debug('Testing authentication...');
    const identity = await this._getAuthenticatedIdentity();

    if (identity?.id) {
      logger.info('Authentication successful', {
        meta: {
          displayName: identity.displayName || 'Unknown',
          uniqueName: identity.uniqueName || 'Unknown',
        },
      });
      logger.debug('Authentication method: Personal Access Token (PAT)');
      logger.debug('PAT has at least basic read permissions');
      logger.debug('If work item creation works, PAT also has work item write permissions');
    } else {
      logger.warn('Authentication failed - no user identity returned');
    }

    // Debug: log the entire identity object for diagnostics (no secrets)
    try {
      logger.debug('Resolved identity object', { meta: identity });
    } catch {
      // ignore stringify errors
    }

    return identity?.id ?? null;
  }

  private async _getAuthenticatedIdentity(): Promise<{
    id?: string;
    displayName?: string;
    uniqueName?: string;
  } | null> {
    if (this.cachedIdentity) return this.cachedIdentity;
    try {
      // Request connectionData. The endpoint location varies:
      // - Cloud (dev.azure.com): https://dev.azure.com/{org}/_apis/connectionData
      // - On-prem/TFS: https://server/collection/_apis/connectionData OR https://server/_apis/connectionData
      // Use api-version=5.0 (widely supported stable version)
      let resp: any;
      const attempts: Array<{ desc: string; url: string }> = [];

      const attemptConnectionData = async (
        basePath: string,
        desc: string,
        useAxiosBase: boolean
      ) => {
        let lastError: unknown;
        const sanitized = basePath.replace(/([&?]+)api-version=[^&]+/i, '').replace(/[&?]+$/, '');
        for (const version of AzureDevOpsIntClient.connectionDataApiVersions) {
          const separator = sanitized.includes('?') ? '&' : '?';
          const fullUrl = `${sanitized}${separator}api-version=${version}`;
          attempts.push({ desc: `${desc} (v=${version})`, url: fullUrl });
          try {
            return useAxiosBase
              ? await this.axios.get(fullUrl)
              : await this._authorizedGet(fullUrl);
          } catch (error) {
            lastError = error;
            if (!this._shouldRetryConnectionDataVersion(error)) {
              throw error;
            }
          }
        }
        throw lastError || new Error('connectionData api-version attempts exhausted');
      };

      try {
        const orgLevel = this.baseUrl.replace(/\/$/, '') + '/_apis/connectionData';
        resp = await attemptConnectionData(orgLevel, 'baseUrl org-level', false);
      } catch (err1) {
        try {
          const apiRoot = stripProjectSegment(
            this.apiBaseUrl.replace(/\/_apis\/?$/, ''),
            this.encodedProject,
            this.project
          );
          const apiConn = apiRoot.replace(/\/$/, '') + '/_apis/connectionData';
          resp = await attemptConnectionData(apiConn, 'apiBaseUrl without project', false);
        } catch (err2) {
          try {
            resp = await attemptConnectionData(
              '/connectionData',
              'relative to axios baseURL',
              true
            );
          } catch (err3) {
            logger.error('connectionData attempts failed', { meta: { attempts } });
            throw err1 || err2 || err3;
          }
        }
      }
      const user = resp.data?.authenticatedUser ?? {};
      // Tolerant identity extraction: accept string or numeric id, and look
      // for several possible unique-name fields used across Azure DevOps and TFS.
      const resolvedId =
        typeof user.id === 'string' || typeof user.id === 'number'
          ? String(user.id)
          : typeof user.descriptor === 'string'
            ? user.descriptor
            : typeof user.subjectDescriptor === 'string'
              ? user.subjectDescriptor
              : undefined;
      const displayName =
        typeof user.providerDisplayName === 'string'
          ? user.providerDisplayName
          : typeof user.displayName === 'string'
            ? user.displayName
            : undefined;
      const uniqueName =
        typeof user.uniqueName === 'string'
          ? user.uniqueName
          : typeof user.unique_name === 'string'
            ? user.unique_name
            : typeof user.mailAddress === 'string'
              ? user.mailAddress
              : typeof user.email === 'string'
                ? user.email
                : typeof user.principalName === 'string'
                  ? user.principalName
                  : typeof user.subjectDescriptor === 'string'
                    ? user.subjectDescriptor
                    : typeof user.descriptor === 'string'
                      ? user.descriptor
                      : undefined;

      const identity = {
        id: resolvedId,
        displayName,
        uniqueName,
      };
      this.cachedIdentity = identity;
      try {
        logger.debug('Resolved identity object', { meta: identity });
      } catch {
        /* ignore stringify errors */
      }

      // If we still don't have a uniqueName and identityName was provided (for on-prem),
      // use identityName as the fallback uniqueName
      if (!this.cachedIdentity.uniqueName && this.identityName) {
        logger.debug('Using provided identityName as fallback', {
          meta: { identityName: this.identityName },
        });
        this.cachedIdentity.uniqueName = this.identityName;
      }

      return this.cachedIdentity;
    } catch (e) {
      logger.error('Error fetching authenticated user identity', { meta: e });
      // If connectionData fails entirely and we have identityName, use it as a fallback
      if (this.identityName) {
        logger.debug('connectionData failed, using identityName fallback', {
          meta: { identityName: this.identityName },
        });
        this.cachedIdentity = {
          uniqueName: this.identityName,
        };
        return this.cachedIdentity;
      }
      return null;
    }
  }
  private _shouldRetryConnectionDataVersion(error: any): boolean {
    const status = error?.response?.status;
    if (status !== 400) {
      return false;
    }
    const message = String(
      error?.response?.data?.message ||
        error?.response?.data?.error?.message ||
        error?.response?.data ||
        error?.message ||
        ''
    );
    return /preview/i.test(message) || /api[- ]?version/i.test(message);
  }

  buildWIQL(queryNameOrText: string) {
    // Use capability cache to decide whether to include [System.StateCategory]
    return this._buildWIQL(queryNameOrText, this.preferStateCategory);
  }

  private _selectFields() {
    return `[System.Id], [System.Title], [System.State], [System.WorkItemType], 
                           [System.AssignedTo], [System.CreatedDate], [System.ChangedDate],
                           [System.IterationPath], [System.Tags], [Microsoft.VSTS.Common.Priority]`;
  }

  private _buildWIQL(queryNameOrText: string, useStateCategory: boolean) {
    const fields = this._selectFields();
    const selectedSprint: string | null = null; // placeholder; inject externally if needed
    const sprintClause = selectedSprint ? `AND [System.IterationPath] = '${selectedSprint}'` : '';
    const activeFilter = this._activeStateFilter(useStateCategory);
    switch (queryNameOrText) {
      case 'My Activity':
        return `SELECT ${fields} FROM WorkItems 
                        WHERE [System.TeamProject] = @Project
                        AND ([System.AssignedTo] = @Me OR [System.CreatedBy] = @Me OR [System.ChangedBy] = @Me)
                        ${activeFilter}
                        ${sprintClause}
                        ORDER BY [System.ChangedDate] DESC`;
      case 'Assigned to me':
      case 'My Work Items':
        return `SELECT ${fields} FROM WorkItems 
                        WHERE [System.TeamProject] = @Project
                        AND [System.AssignedTo] = @Me 
                        ${activeFilter}
                        ${sprintClause}
                        ORDER BY [System.ChangedDate] DESC`;
      case 'Current Sprint':
        return selectedSprint
          ? `SELECT ${fields} FROM WorkItems 
                            WHERE [System.IterationPath] = '${selectedSprint}'
                            ${activeFilter}
                            ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.Id] ASC`
          : `SELECT ${fields} FROM WorkItems 
                        WHERE [System.IterationPath] UNDER @CurrentIteration 
                        ${activeFilter}
                        ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.Id] ASC`;
      case 'All Active':
        return `SELECT ${fields} FROM WorkItems 
                        WHERE [System.TeamProject] = @Project
                        ${activeFilter}
                        ${sprintClause}
                        ORDER BY [System.ChangedDate] DESC`;
      case 'Recently Updated':
        return `SELECT ${fields} FROM WorkItems 
                        WHERE [System.TeamProject] = @Project
                        AND [System.ChangedDate] >= @Today - 3
                        ${activeFilter}
                        ${sprintClause}
                        ORDER BY [System.ChangedDate] DESC`;
      case 'Created By Me':
      case 'Created by Me':
      case 'Created by me':
        return `SELECT ${fields} FROM WorkItems 
                        WHERE [System.TeamProject] = @Project
                        AND [System.CreatedBy] = @Me 
                        ${activeFilter}
                        ${sprintClause}
                        ORDER BY [System.ChangedDate] DESC`;
      default:
        return queryNameOrText;
    }
  }

  private _activeStateFilter(useStateCategory: boolean) {
    if (useStateCategory) {
      return `AND [System.StateCategory] <> 'Completed' AND [System.State] <> 'Removed'`;
    }
    // Legacy fallback: exclude common terminal states across Basic/Agile/Scrum
    return `AND [System.State] NOT IN ('Closed','Done','Resolved','Removed')`;
  }

  private _isTooManyResultsError(err: any): boolean {
    const status = err?.response?.status;
    if (status !== 400) return false;
    const message = String(
      err?.response?.data?.message || err?.response?.data?.value?.Message || err?.message || ''
    );
    return (
      /exceeds the size limit/i.test(message) ||
      /WorkItemTrackingQueryResultSizeLimitExceededException/i.test(message) ||
      /VS402337/i.test(message)
    );
  }

  private _mapRawWorkItems(rawItems: any[]): WorkItem[] {
    if (!Array.isArray(rawItems)) return [];
    return rawItems
      .filter((item: any) => item && typeof item.id === 'number')
      .map((item: any) => {
        const mapped: WorkItem = {
          id: item.id,
          fields: item.fields || {},
        };

        if (Array.isArray(item.relations) && item.relations.length > 0) {
          const relations = item.relations
            .filter((rel: any) => rel && typeof rel === 'object')
            .map((rel: any) => {
              const attributes =
                rel.attributes && typeof rel.attributes === 'object'
                  ? { ...rel.attributes }
                  : undefined;
              return {
                url: typeof rel.url === 'string' ? rel.url : undefined,
                rel: typeof rel.rel === 'string' ? rel.rel : undefined,
                attributes,
              };
            })
            .filter(Boolean);

          if (relations.length > 0) {
            mapped.relations = relations;
          }
        }

        return mapped;
      });
  }

  private async _fetchWorkItemsByIds(ids: number[]): Promise<WorkItem[]> {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isFinite(id)))) as number[];
    if (uniqueIds.length === 0) return [];
    const results: WorkItem[] = [];
    const chunkSize = 200;
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      const chunk = uniqueIds.slice(i, i + chunkSize);
      if (chunk.length === 0) continue;
      try {
        const resp = await this.axios.get(
          `/wit/workitems?ids=${chunk.join(',')}&$expand=all&api-version=7.0`
        );
        const rawItems: any[] = resp.data?.value || [];
        results.push(...this._mapRawWorkItems(rawItems));
      } catch (err: any) {
        logger.warn('Failed to expand work item chunk', { meta: { error: err?.message || err } });
      }
    }
    return results;
  }

  private _filterItemsForProject(items: WorkItem[]): WorkItem[] {
    if (!Array.isArray(items) || !this.project) return Array.isArray(items) ? [...items] : [];
    const target = this.project.trim().toLowerCase();
    return items.filter((item) => {
      const projectName = item?.fields?.['System.TeamProject'];
      if (!projectName || typeof projectName !== 'string') return true;
      return projectName.trim().toLowerCase() === target;
    });
  }

  private _sortByChangedDateDesc(items: WorkItem[]): WorkItem[] {
    return [...items].sort((a, b) => {
      const aDate = new Date(a?.fields?.['System.ChangedDate'] || 0).getTime();
      const bDate = new Date(b?.fields?.['System.ChangedDate'] || 0).getTime();
      return bDate - aDate;
    });
  }

  private async _getFollowedWorkItems(): Promise<WorkItem[]> {
    try {
      const resp = await this.axios.get('/work/workitems/favorites?api-version=7.0');
      const entries = Array.isArray(resp.data?.value) ? resp.data.value : [];
      const ids = entries
        .map((entry: any) => {
          if (typeof entry?.workItemId === 'number') return entry.workItemId;
          if (typeof entry?.id === 'number') return entry.id;
          const nested = entry?.workItem?.id;
          return typeof nested === 'number' ? nested : NaN;
        })
        .filter((id: number) => Number.isFinite(id)) as number[];
      if (ids.length === 0) return [];
      const items = await this._fetchWorkItemsByIds(ids);
      const filtered = this._filterItemsForProject(items);
      return this._sortByChangedDateDesc(filtered);
    } catch (err: any) {
      logger.warn('Failed to fetch followed work items', { meta: { error: err?.message || err } });
      return [];
    }
  }

  private async _getMentionedWorkItems(): Promise<WorkItem[]> {
    const identity = await this._getAuthenticatedIdentity();
    if (!identity) return [];
    const terms = new Set<string>();
    if (typeof identity.displayName === 'string' && identity.displayName.trim()) {
      terms.add(identity.displayName.trim());
    }
    if (typeof identity.uniqueName === 'string' && identity.uniqueName.trim()) {
      terms.add(identity.uniqueName.trim());
    }
    if (terms.size === 0) return [];
    const clauses = Array.from(terms).map(
      (term) => `[System.History] CONTAINS '${this._escapeWIQL(term)}'`
    );
    const fields = this._selectFields();
    const stateFilter = this._activeStateFilter(this.preferStateCategory);
    const query = `SELECT ${fields} FROM WorkItems 
                        WHERE [System.TeamProject] = @Project
                        AND (${clauses.join(' OR ')})
                        ${stateFilter}
                        ORDER BY [System.ChangedDate] DESC`;
    try {
      return await this.runWIQL(query);
    } catch (err: any) {
      logger.warn('Failed to fetch mentioned work items', { meta: { error: err?.message || err } });
      return [];
    }
  }

  async getWorkItems(query: string): Promise<WorkItem[]> {
    return await measureAsync('getWorkItems', async () => {
      let wiql = ''; // Declare outside try block for error reporting
      let wiqlToSend = '';
      try {
        // Check cache first
        const cacheKey = WorkItemCache.generateWorkItemsKey(
          `${this.organization}-${this.project}`,
          query,
          { team: this.team }
        );

        const cached = workItemCache.get(cacheKey);
        if (cached) {
          logger.debug('Cache hit for query', { meta: { query } });
          return cached;
        }

        if (query === 'Following') {
          const result = await this._getFollowedWorkItems();
          workItemCache.setWorkItems(cacheKey, result);
          return result;
        }
        if (query === 'Mentioned') {
          const result = await this._getMentionedWorkItems();
          workItemCache.setWorkItems(cacheKey, result);
          return result;
        }
        wiql = this.buildWIQL(query);
        // If querying Current Sprint, prefer resolving the explicit current iteration path for configured team
        if (query === 'Current Sprint') {
          try {
            const cur = await this.getCurrentIteration();
            const iterPath = cur?.path;
            if (iterPath && typeof iterPath === 'string') {
              const safePath = this._escapeWIQL(iterPath);
              wiql = `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo], [System.CreatedDate], [System.ChangedDate], [System.IterationPath], [System.Tags], [Microsoft.VSTS.Common.Priority] FROM WorkItems WHERE [System.IterationPath] UNDER '${safePath}' AND [System.State] <> 'Closed' AND [System.State] <> 'Removed' ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.Id] ASC`;
            }
          } catch (e) {
            // Fallback to @CurrentIteration-based WIQL already produced
            logger.warn('getCurrentIteration failed, using @CurrentIteration', { meta: e });
          }
        }
        logger.debug('Fetching work items with query', {
          meta: { wiql, apiBaseUrl: this.axios.defaults.baseURL },
        });

        // Prepare the WIQL to send. Some on-prem/TFS servers don't reliably resolve the @Me token
        // so, when possible, replace @Me with an explicit identity string (uniqueName, displayName, or id).
        wiqlToSend = wiql;

        // For queries that might return many results, add a hard limit via client-side limiting
        // User-scoped queries (My Activity, Assigned to me) don't need limits as they're naturally bounded
        const knownUserScopedQueries = ['My Activity', 'Assigned to me', 'My Work Items'];
        const isKnownQuery = [
          'Recently Updated',
          'All Active',
          'Current Sprint',
          ...knownUserScopedQueries,
        ].includes(query);
        const needsLimit =
          !knownUserScopedQueries.includes(query) &&
          (['Recently Updated', 'All Active', 'Current Sprint'].includes(query) || !isKnownQuery);

        if (needsLimit) {
          logger.debug('Applying hard limit of 100 items for query', { meta: { query } });
        }

        try {
          if (/@Me\b/i.test(wiql)) {
            const resolved = await this._getAuthenticatedIdentity();
            if (resolved) {
              const idVal = resolved.uniqueName || resolved.displayName || resolved.id;
              if (idVal) {
                const escaped = this._escapeWIQL(String(idVal));
                wiqlToSend = wiql.replace(/@Me\b/g, `'${escaped}'`);
                logger.debug('Replacing @Me with explicit identity for compatibility', {
                  meta: { idVal },
                });
              } else {
                logger.debug('_getAuthenticatedIdentity returned no usable identifier');
              }
            } else {
              logger.debug('Could not resolve authenticated identity to replace @Me');
            }
          }
        } catch (identErr) {
          logger.warn('Failed resolving identity for @Me replacement', { meta: identErr });
        }

        // First, try the WIQL query
        const wiqlEndpoint = '/wit/wiql?api-version=7.0';

        let wiqlResp;
        try {
          wiqlResp = await this.axios.post(wiqlEndpoint, { query: wiqlToSend });
        } catch (err: any) {
          if (this._isMissingStateCategoryError(err)) {
            logger.warn('StateCategory unsupported in WIQL. Retrying with legacy state filters.');
            // Update capability cache so future queries avoid the failing path for this client lifetime
            this.preferStateCategory = false;
            // Rebuild the WIQL with legacy state filters and retry
            const wiqlLegacy = this._buildWIQL(query, false);
            logger.debug('Fallback WIQL', { meta: { wiqlLegacy } });
            // Apply the same @Me replacement logic to the legacy WIQL as well
            let legacyToSend = wiqlLegacy;
            try {
              if (/@Me\b/i.test(wiqlLegacy)) {
                const resolved2 = await this._getAuthenticatedIdentity();
                if (resolved2) {
                  const idVal2 = resolved2.uniqueName || resolved2.displayName || resolved2.id;
                  if (idVal2) {
                    legacyToSend = wiqlLegacy.replace(
                      /@Me\b/g,
                      `'${this._escapeWIQL(String(idVal2))}'`
                    );
                    logger.debug('Replacing @Me in fallback WIQL with explicit identity', {
                      meta: { idVal2 },
                    });
                  }
                }
              }
            } catch (e) {
              logger.warn('Identity resolution failed for fallback WIQL', { meta: e });
            }

            wiqlResp = await this.axios.post(wiqlEndpoint, { query: legacyToSend });
            // Also update wiql for subsequent logs/context
            wiql = wiqlLegacy;
          } else if (this._isTooManyResultsError(err)) {
            // Server indicates the result set is too large (e.g., >20k). 
            // Retry with progressively shorter date windows to stay under limit.
            // Try 1 day first (most restrictive), then fail if still too large.
            const DAYS = 1;
            const idx = wiqlToSend.lastIndexOf('ORDER BY');
            const head = idx > -1 ? wiqlToSend.slice(0, idx).trimEnd() : wiqlToSend;
            const tail = idx > -1 ? wiqlToSend.slice(idx) : 'ORDER BY [System.ChangedDate] DESC';
            
            // Check if query already has a ChangedDate filter - if so, replace it; otherwise add it
            let bounded: string;
            if (/\[System\.ChangedDate\]\s*>=\s*@Today/i.test(head)) {
              // Replace existing ChangedDate filter with shorter window
              bounded = head.replace(
                /\[System\.ChangedDate\]\s*>=\s*@Today\s*-\s*\d+/i,
                `[System.ChangedDate] >= @Today - ${DAYS}`
              ) + '\n' + tail;
            } else {
              // Add new ChangedDate filter
              bounded = `${head}\nAND [System.ChangedDate] >= @Today - ${DAYS}\n${tail}`;
            }
            
            // Ensure project filter is present for "Recently Updated" queries
            if (query === 'Recently Updated' && !/\[System\.TeamProject\]\s*=\s*@Project/i.test(bounded)) {
              const whereIdx = bounded.indexOf('WHERE');
              if (whereIdx > -1) {
                // Insert after 'WHERE' and any following space, or add a space if missing
                const afterWhere = bounded[whereIdx + 5] === ' ' ? whereIdx + 6 : whereIdx + 5;
                const prefix = bounded.slice(0, afterWhere);
                const suffix = bounded.slice(afterWhere);
                bounded = prefix + `[System.TeamProject] = @Project AND ` + suffix;
              }
            }
            
            // Apply @Me replacement again if present
            try {
              if (/@Me\b/i.test(bounded)) {
                const resolved3 = await this._getAuthenticatedIdentity();
                if (resolved3) {
                  const idVal3 = resolved3.uniqueName || resolved3.displayName || resolved3.id;
                  if (idVal3) {
                    bounded = bounded.replace(/@Me\b/g, `'${this._escapeWIQL(String(idVal3))}'`);
                  }
                }
              }
            } catch {
              /* ignore */
            }
            logger.warn('Result too large; retrying WIQL with shorter ChangedDate bound', {
              meta: { days: DAYS, query },
            });
            try {
              wiqlResp = await this.axios.post(wiqlEndpoint, { query: bounded });
              wiql = bounded;
            } catch (retryErr: any) {
              // If retry still fails, throw original error with helpful message
              if (this._isTooManyResultsError(retryErr)) {
                throw new Error(
                  `Query "${query}" returns too many work items (>20,000). ` +
                  `Try filtering by a specific area path, iteration, or work item type to narrow results.`
                );
              }
              throw retryErr;
            }
          } else {
            throw err;
          }
        }
        logger.debug('WIQL response status', { meta: { status: wiqlResp.status } });
        // Diagnostic: dump a truncated version of the response body to help debug empty results
        try {
          const bodySnippet = JSON.stringify(wiqlResp.data).slice(0, 2000);
          logger.debug('WIQL response body (truncated)', { meta: { bodySnippet } });
        } catch {
          /* ignore */
        }

        let refs = wiqlResp.data?.workItems || [];
        logger.debug('WIQL reference count', { meta: { count: refs.length } });

        // Apply client-side limiting for queries that might return many results
        if (needsLimit && refs.length > 100) {
          refs = refs.slice(0, 100);
          logger.debug('Applied client-side limit', { meta: { reducedTo: refs.length } });
        }

        if (refs.length === 0) {
          logger.debug('No work items matched query. Trying simpler query...');

          // Try a safer, bounded simple query to test authentication and data access
          // Bound by project, recent activity window, and exclude completed states to avoid server-side 20k limits
          const simpleWiql = `SELECT [System.Id], [System.Title] FROM WorkItems 
            WHERE [System.TeamProject] = @Project
            AND [System.ChangedDate] >= @Today - 90
            AND [System.State] NOT IN ('Closed','Done','Resolved','Removed')
            ORDER BY [System.ChangedDate] DESC`;
          const simpleResp = await this.axios.post('/wit/wiql?api-version=7.0', {
            query: simpleWiql,
          });
          // Diagnostic: log simple query response snippet
          try {
            const simpleSnippet = JSON.stringify(simpleResp.data).slice(0, 1500);
            logger.debug('simpleWIQL response body (truncated)', { meta: { simpleSnippet } });
          } catch {
            /* ignore */
          }
          const simpleRefs = simpleResp.data?.workItems || [];
          logger.debug('Simple query returned work items', { meta: { count: simpleRefs.length } });

          if (simpleRefs.length === 0) {
            logger.debug('No work items in project at all.');
            return [];
          }

          // Work items exist - fetch and return them instead of returning empty
          logger.debug('Original query matched nothing, fetching simple query results...');

          // Use simpleRefs instead of refs to fetch the work items (chunked)
          let simpleIdsArr = simpleRefs
            .map((w: any) => Number(w.id))
            .filter((id: any) => Number.isFinite(id)) as number[];
          if (simpleIdsArr.length === 0) {
            logger.debug('No valid IDs in simple query results.');
            return [];
          }

          if (simpleIdsArr.length > 200) {
            simpleIdsArr = simpleIdsArr.slice(0, 200);
            logger.debug('Applied limit to simple query IDs', {
              meta: { reducedTo: simpleIdsArr.length },
            });
          }
          logger.debug('Expanding simple query IDs (chunked)', {
            meta: { count: simpleIdsArr.length },
          });
          const fallbackItems: WorkItem[] = await this._fetchWorkItemsByIds(simpleIdsArr);

          logger.debug('Returning work items from simple query fallback', {
            meta: { count: fallbackItems.length },
          });

          // Cache the fallback result
          workItemCache.setWorkItems(cacheKey, fallbackItems);
          return fallbackItems;
        }

        // Apply a global hard cap to protect expansion and UI even for user-scoped queries
        if (refs.length > 500) {
          refs = refs.slice(0, 500);
          logger.debug('Applied global client-side limit', { meta: { reducedTo: refs.length } });
        }
        // Expand IDs using chunked requests to avoid very long URLs (HTTP 414)
        const idsArray = refs
          .map((w: any) => Number(w.id))
          .filter((id: any) => Number.isFinite(id)) as number[];
        logger.debug('Expanding IDs (chunked)', { meta: { count: idsArray.length } });
        const items: WorkItem[] = await this._fetchWorkItemsByIds(idsArray);

        logger.debug('Returning mapped work items', { meta: { count: items.length } });

        // Cache the result
        workItemCache.setWorkItems(cacheKey, items);
        return items;
      } catch (err: any) {
        logger.error('GETWI error', { meta: { error: err?.message || err } });

        // Build detailed error message for users
        let errorMessage = 'Failed to fetch work items';
        const status = err?.response?.status;

        if (status === 401 || status === 403) {
          errorMessage =
            `Authentication failed (${status}). Please check:\n` +
            '• Your Personal Access Token (PAT) is valid and not expired\n' +
            '• The PAT has "Work Items (Read)" permission\n' +
            '• You have access to this project';
        } else if (status === 404) {
          // Log 404 details for debugging
          logger.debug('GETWI 404 Not Found', {
            meta: {
              organization: this.organization,
              project: this.project,
              authType: this.authType,
              url: err?.request?.url || err?.config?.url,
            },
          });

          // For both PAT and Entra ID, treat 404 as project/access issue, not auth failure
          // Auth failures should return 401, not 404
          errorMessage =
            `Project not found (404). Please verify:\n` +
            `• Organization: "${this.organization}"\n` +
            `• Project: "${this.project}"\n` +
            '• The project name matches exactly (case-sensitive)';
        } else if (status === 400) {
          // 400 Bad Request - likely WIQL syntax or field name issue
          const apiError = err?.response?.data?.message || err?.response?.data?.value?.Message;
          if (apiError) {
            errorMessage = `Invalid query (400): ${apiError}`;
          } else {
            errorMessage = `Invalid query (400). The WIQL query may contain unsupported fields or syntax for this project.\nQuery name: "${query}"`;
          }
          // Log the actual WIQL that failed for debugging
          logger.error('WIQL that failed', { meta: { wiql: wiqlToSend || wiql } });
        } else if (status >= 500) {
          errorMessage = `Azure DevOps server error (${status}). The service may be temporarily unavailable.`;
        } else if (err?.code === 'ENOTFOUND' || err?.code === 'ECONNREFUSED') {
          errorMessage =
            `Network error: Cannot reach Azure DevOps.\n` +
            '• Check your internet connection\n' +
            '• Verify your base URL is correct\n' +
            `• Current URL: ${this.axios.defaults.baseURL}`;
        } else if (err?.message) {
          errorMessage = `${errorMessage}: ${err.message}`;
        }

        if (err?.response) {
          logger.error('GETWI HTTP status', { meta: { status } });
          try {
            logger.error('GETWI response data', {
              meta: { data: JSON.stringify(err.response.data).slice(0, 600) },
            });
          } catch {
            /* ignore */
          }
        }

        // Re-throw with detailed message instead of silently returning []
        throw new Error(errorMessage);
      }
    });
  }

  private _isMissingStateCategoryError(err: any) {
    const status = err?.response?.status;
    const bodyMessage = String(
      err?.response?.data?.message || err?.response?.data || err?.message || ''
    );
    // Some server versions or languages may return different wording. Test for 'statecategory' anywhere in the message.
    if (status === 400 && /statecategory/i.test(bodyMessage)) return true;
    // Also handle server responses where the error mentions an unknown field name without the exact 'System.StateCategory' token
    if (
      status === 400 &&
      /\bSystem\.State\b/i.test(bodyMessage) &&
      /not found|unknown|does not exist|is not valid/i.test(bodyMessage)
    )
      return true;
    return false;
  }

  async getWorkItemById(id: number): Promise<WorkItem | null> {
    try {
      const resp = await this.axios.get(`/wit/workitems/${id}?$expand=all&api-version=7.0`);
      return { id: resp.data.id, fields: resp.data.fields } as WorkItem;
    } catch (err) {
      logger.error('Error fetching work item by id', { meta: err });
      return null;
    }
  }

  async runWIQL(wiql: string): Promise<WorkItem[]> {
    try {
      const wiqlResp = await this.axios.post('/wit/wiql?api-version=7.0', { query: wiql });
      if (!wiqlResp.data.workItems || wiqlResp.data.workItems.length === 0) return [];
      const idsArray = wiqlResp.data.workItems
        .map((w: any) => Number(w.id))
        .filter((id: any) => Number.isFinite(id)) as number[];
      const limited = idsArray.length > 500 ? idsArray.slice(0, 500) : idsArray;
      return await this._fetchWorkItemsByIds(limited);
    } catch (err) {
      logger.error('runWIQL failed', { meta: err });
      return [];
    }
  }

  async searchWorkItems(term: string): Promise<WorkItem[]> {
    if (!term?.trim()) return [];
    const safe = this._escapeWIQL(term.trim());
    const wiql = `SELECT [System.Id], [System.Title], [System.State] FROM WorkItems 
                 WHERE [System.Title] CONTAINS '${safe}' OR [System.Id] = '${safe}'
                 ORDER BY [System.ChangedDate] DESC`;
    return this.runWIQL(wiql);
  }

  async filterWorkItems(filter: any): Promise<WorkItem[]> {
    const base =
      'SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType], [System.AssignedTo], [System.IterationPath] FROM WorkItems WHERE ';
    const clauses: string[] = [];
    if (filter?.sprint && filter.sprint !== 'All') {
      if (filter.sprint === '@CurrentIteration')
        clauses.push('[System.IterationPath] UNDER @CurrentIteration');
      else clauses.push(`[System.IterationPath] = '${this._escapeWIQL(filter.sprint)}'`);
    }
    if (filter?.includeState)
      clauses.push(`[System.State] = '${this._escapeWIQL(filter.includeState)}'`);
    else if (Array.isArray(filter?.excludeStates) && filter.excludeStates.length) {
      filter.excludeStates.forEach((st: string) =>
        clauses.push(`[System.State] <> '${this._escapeWIQL(st)}'`)
      );
    }
    if (filter?.type && filter.type !== 'All')
      clauses.push(`[System.WorkItemType] = '${this._escapeWIQL(filter.type)}'`);
    if (filter?.assignedTo === 'Me') clauses.push('[System.AssignedTo] = @Me');
    else if (filter?.assignedTo === 'Unassigned') clauses.push('[System.AssignedTo] = ""');
    if (clauses.length === 0) clauses.push('[System.State] <> "Removed"');
    const wiql = base + clauses.join(' AND ') + ' ORDER BY [System.ChangedDate] DESC';
    return this.runWIQL(wiql);
  }

  async createWorkItem(
    type: string,
    title: string,
    description?: string,
    assignedTo?: string,
    extraFields?: Record<string, unknown>
  ): Promise<WorkItem> {
    logger.debug('Creating work item', { meta: { type, title: title.substring(0, 50) + '...' } });

    const patch: any[] = [{ op: 'add', path: '/fields/System.Title', value: title }];
    if (description)
      patch.push({ op: 'add', path: '/fields/System.Description', value: description });
    if (assignedTo) patch.push({ op: 'add', path: '/fields/System.AssignedTo', value: assignedTo });
    if (extraFields && typeof extraFields === 'object') {
      for (const [field, value] of Object.entries(extraFields)) {
        if (value === undefined || value === null || value === '') continue;
        patch.push({ op: 'add', path: `/fields/${field}`, value });
      }
    }

    try {
      const resp = await this.axios.post(`/wit/workitems/$${type}?api-version=7.0`, patch, {
        headers: { 'Content-Type': 'application/json-patch+json' },
      });

      logger.info('Work item created successfully', { meta: { workItemId: resp.data.id } });
      logger.debug('Authentication has work item WRITE permissions');
      logger.debug('Required permission: vso.work_write (for PAT) or equivalent scope (for OAuth)');

      return { id: resp.data.id, fields: resp.data.fields } as WorkItem;
    } catch (error: any) {
      logger.error('Work item creation failed', {
        meta: { status: error.response?.status, statusText: error.response?.statusText },
      });
      if (error.response?.status === 403) {
        logger.error('Permission denied - authentication lacks work item write permissions');
        logger.error('Check your PAT scopes or Azure AD permissions');
      }
      throw error;
    }
  }

  async updateWorkItem(id: number, patchOps: any[]): Promise<WorkItem> {
    const resp = await this.axios.patch(`/wit/workitems/${id}?api-version=7.0`, patchOps, {
      headers: { 'Content-Type': 'application/json-patch+json' },
    });
    return { id: resp.data.id, fields: resp.data.fields } as WorkItem;
  }

  async addWorkItemComment(id: number, text: string) {
    const resp = await this.axios.post(`/wit/workitems/${id}/comments?api-version=7.0-preview.3`, {
      text,
    });
    return resp.data; // comment response shape not forced into WorkItem
  }

  async addTimeEntry(id: number, hours: number, note?: string) {
    if (typeof hours !== 'number' || hours <= 0) throw new Error('hours must be positive number');
    const patch = [
      { op: 'add', path: '/fields/Microsoft.VSTS.Scheduling.CompletedWork', value: hours },
    ];
    await this.updateWorkItem(id, patch);
    if (note) await this.addWorkItemComment(id, `Time tracked: ${hours} hours. ${note}`);
  }

  async getWorkItemTypes(): Promise<any[]> {
    try {
      const resp = await this.axios.get(`/wit/workitemtypes?api-version=7.0`);
      return resp.data.value || [];
    } catch (e) {
      logger.error('Error fetching work item types', { meta: e });
      return [];
    }
  }

  async getWorkItemTypeStates(workItemType: string): Promise<string[]> {
    try {
      const resp = await this.axios.get(
        `/wit/workitemtypes/${encodeURIComponent(workItemType)}?api-version=7.0`
      );
      const states = resp.data.states || [];
      return states.map((state: any) => state.name || state);
    } catch (e) {
      logger.error(`Error fetching states for work item type ${workItemType}`, { meta: e });
      return [];
    }
  }

  async getIterations() {
    try {
      const url = this.buildTeamApiUrl('/work/teamsettings/iterations?api-version=7.0');
      const resp = await this.axios.get(url);
      return resp.data.value || [];
    } catch (err) {
      logger.error('Error fetching iterations', { meta: err });
      return [];
    }
  }

  async getCurrentIteration() {
    return await measureAsync('getCurrentIteration', async () => {
      try {
        // Check cache first
        const cacheKey = WorkItemCache.generateMetadataKey(
          `${this.organization}-${this.project}`,
          `currentIteration-${this.team || 'default'}`
        );

        const cached = workItemCache.get(cacheKey);
        if (cached) {
          return cached;
        }

        const url = this.buildTeamApiUrl(
          '/work/teamsettings/iterations?$timeframe=current&api-version=7.0'
        );
        const resp = await this.axios.get(url);
        const result = resp.data.value?.[0] || null;

        // Cache the result
        workItemCache.setMetadata(cacheKey, result);
        return result;
      } catch (err) {
        logger.error('Error fetching current iteration', { meta: err });
        return null;
      }
    });
  }

  private _escapeWIQL(value: string) {
    return String(value).replace(/'/g, "''");
  }

  // ---------------- Git & PR Helpers ----------------
  async getTeams() {
    return await measureAsync('getTeams', async () => {
      try {
        // Check cache first
        const cacheKey = WorkItemCache.generateMetadataKey(
          `${this.organization}-${this.project}`,
          'teams'
        );

        const cached = workItemCache.get(cacheKey);
        if (cached) {
          return cached;
        }

        // Call the org-level projects API directly using the configured baseUrl so we target
        // the correct host regardless of axios.baseURL (which may include project/_apis).
        const orgTeamsUrl =
          this.baseUrl.replace(/\/$/, '') +
          `/_apis/projects/${this.encodedProject}/teams?api-version=7.0`;
        // Note: build the absolute URL so axios will call the intended host rather than prefixing baseURL.
        const resp = await this.axios.get(orgTeamsUrl);
        const result = resp.data?.value || [];

        // Cache the result
        workItemCache.setMetadata(cacheKey, result);
        return result;
      } catch (e) {
        logger.error('Error fetching teams', { meta: e });
        return [];
      }
    });
  }
  async getRepositories(force = false) {
    return await measureAsync('getRepositories', async () => {
      if (this._repoCache && !force) return this._repoCache;

      // Check cache first
      const cacheKey = WorkItemCache.generateMetadataKey(
        `${this.organization}-${this.project}`,
        'repositories'
      );

      if (!force) {
        const cached = workItemCache.get(cacheKey);
        if (cached) {
          this._repoCache = cached;
          return cached;
        }
      }

      try {
        const resp = await this.axios.get(`/git/repositories`);
        this._repoCache = resp.data.value || [];

        // Cache the result
        workItemCache.setMetadata(cacheKey, this._repoCache);
        return this._repoCache;
      } catch (e) {
        logger.error('Error fetching repositories', { meta: e });
        return [];
      }
    });
  }

  async getDefaultRepository() {
    const repos = await this.getRepositories();
    return Array.isArray(repos) ? repos[0] : undefined;
  }

  async getPullRequests(repositoryId: string, status: string = 'active') {
    try {
      const resp = await this.axios.get(`/git/pullrequests`, {
        params: { 'searchCriteria.repositoryId': repositoryId, 'searchCriteria.status': status },
      });
      const prs = resp.data.value || [];
      return prs.map((pr: any) => ({
        id: pr.pullRequestId,
        title: pr.title,
        status: pr.status,
        createdBy: pr.createdBy?.displayName,
        sourceRefName: pr.sourceRefName,
        targetRefName: pr.targetRefName,
        repository: pr.repository?.name,
        webUrl:
          pr._links?.web?.href ||
          this.getBrowserUrl(
            `/_git/${encodeURIComponent(pr.repository?.name)}/pullrequest/${pr.pullRequestId}`
          ),
      }));
    } catch (e) {
      logger.error('Error fetching pull requests', { meta: e });
      return [];
    }
  }

  /**
   * Fetch pull requests across all repositories in the project, filtered by creator or reviewer = current user.
   * Merges results for authored and reviewing PRs to emulate an OR filter. Duplicates are de-duplicated by PR id.
   */
  async getMyPullRequestsAcrossRepos(status: string = 'active') {
    const me = await this.getAuthenticatedUserId();
    if (!me) {
      logger.warn('Could not determine authenticated user id; returning empty PR list');
      return [] as Array<{
        id: number;
        title: string;
        status: string;
        createdBy?: string;
        sourceRefName?: string;
        targetRefName?: string;
        repository?: string;
        webUrl?: string;
      }>;
    }

    try {
      // Query without repositoryId to search across all repos in the project
      const [authoredResp, reviewingResp] = await Promise.all([
        this.axios.get(`/git/pullrequests`, {
          params: { 'searchCriteria.creatorId': me, 'searchCriteria.status': status },
        }),
        this.axios.get(`/git/pullrequests`, {
          params: { 'searchCriteria.reviewerId': me, 'searchCriteria.status': status },
        }),
      ]);
      const authored = authoredResp.data?.value || [];
      const reviewing = reviewingResp.data?.value || [];
      const combined = [...authored, ...reviewing];
      const seen = new Set<number>();
      const mapped = combined
        .filter((pr: any) => pr && typeof pr.pullRequestId === 'number')
        .filter((pr: any) => {
          if (seen.has(pr.pullRequestId)) return false;
          seen.add(pr.pullRequestId);
          return true;
        })
        .map((pr: any) => ({
          id: pr.pullRequestId,
          title: pr.title,
          status: pr.status,
          createdBy: pr.createdBy?.displayName,
          sourceRefName: pr.sourceRefName,
          targetRefName: pr.targetRefName,
          repository: pr.repository?.name,
          webUrl:
            pr._links?.web?.href ||
            this.getBrowserUrl(
              `/_git/${encodeURIComponent(pr.repository?.name)}/pullrequest/${pr.pullRequestId}`
            ),
          createdDate: pr.creationDate,
        }));
      // Sort by creation date desc if available
      mapped.sort((a: any, b: any) => {
        const at = a.createdDate ? new Date(a.createdDate).getTime() : 0;
        const bt = b.createdDate ? new Date(b.createdDate).getTime() : 0;
        return bt - at;
      });
      return mapped;
    } catch (e) {
      logger.error('Error fetching my pull requests across repos', { meta: e });
      return [];
    }
  }

  async createPullRequest(
    repositoryId: string,
    sourceRefName: string,
    targetRefName: string,
    title: string,
    description?: string
  ) {
    try {
      const payload: any = { sourceRefName, targetRefName, title };
      if (description) payload.description = description;
      const resp = await this.axios.post(
        `/git/repositories/${repositoryId}/pullrequests?api-version=7.0`,
        payload
      );
      return resp.data;
    } catch (e) {
      logger.error('Error creating pull request', { meta: e });
      throw e;
    }
  }

  // ---------------- Build Helpers ----------------
  async getRecentBuilds(
    options: {
      top?: number;
      branchName?: string;
      repositoryId?: string;
      definitions?: number | number[];
      resultFilter?: string;
      statusFilter?: string;
    } = {}
  ): Promise<WorkItemBuildSummary[]> {
    const { top = 10, branchName, repositoryId, definitions, resultFilter, statusFilter } = options;

    try {
      const params: Record<string, any> = {
        $top: top,
        queryOrder: 'finishTimeDescending',
        'api-version': '7.0',
      };
      if (branchName) params.branchName = branchName;
      if (repositoryId) params.repositoryId = repositoryId;
      if (definitions !== undefined) {
        params.definitions = Array.isArray(definitions) ? definitions.join(',') : definitions;
      }
      if (resultFilter) params.resultFilter = resultFilter;
      if (statusFilter) params.statusFilter = statusFilter;

      const resp = await this.axios.get(`/build/builds`, { params });
      const values = Array.isArray(resp.data?.value) ? resp.data.value : [];
      return values.map((b: any) => ({
        id: b.id,
        buildNumber: b.buildNumber,
        status: b.status,
        result: b.result,
        definition: b.definition?.name,
        queueTime: b.queueTime,
        finishTime: b.finishTime,
        webUrl: b._links?.web?.href,
      })) as WorkItemBuildSummary[];
    } catch (e) {
      logger.error('Error fetching builds', { meta: e });
      return [];
    }
  }
}

// Backward-compatible alias for extensions / docs still referencing AzureDevOpsClient
// Deprecated: prefer AzureDevOpsIntClient going forward.
export const AzureDevOpsClient = AzureDevOpsIntClient;
export default AzureDevOpsIntClient;
