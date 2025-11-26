/**
 * Module: src/features/azure-client/http-client.ts
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
 *
 * URL invariants:
 * - apiBaseUrl: ALWAYS used for REST API calls. Must include project and end with '/_apis'.
 * - baseUrl:    ONLY used for browser/UI links. Never used for REST calls.
 */
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { RateLimiter } from '../../rateLimiter.js';
import { createLogger } from '../../logging/unifiedLogger.js';
import type { AuthType, ClientOptions } from './types.js';

const logger = createLogger('http-client');

export class AzureHttpClient {
  private axiosInstance: AxiosInstance;
  private rateLimiter: RateLimiter;
  private authType: AuthType;
  private credential: string;
  private organization: string;
  private project: string;
  private apiBaseUrl: string;
  private baseUrl: string;
  private encodedOrganization: string;
  private encodedProject: string;
  private encodedTeam?: string;

  constructor(
    organization: string,
    project: string,
    credential: string,
    authType: AuthType = 'pat',
    options: ClientOptions = {}
  ) {
    this.organization = organization;
    this.project = project;
    this.credential = credential;
    this.authType = authType;

    this.encodedOrganization = encodeURIComponent(organization);
    this.encodedProject = encodeURIComponent(project);

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter(options.ratePerSecond || 10, options.burst || 20);

    // Set up base URLs
    // baseUrl (browser/UI) is derived from apiBaseUrl host; apiBaseUrl must include '/_apis'
    this.baseUrl = this._determineBaseUrl(options.apiBaseUrl);
    this.apiBaseUrl = this._ensureApiSuffix(this.baseUrl);

    // Create axios instance
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AzureDevOpsIntegration/1.0',
      },
    });

    this._setupInterceptors();
  }

  private _determineBaseUrl(apiBaseUrl?: string): string {
    const fallback = `https://dev.azure.com/${this.encodedOrganization}`;

    if (!apiBaseUrl) {
      return fallback;
    }

    const withoutApis = apiBaseUrl.replace(/\/_apis\/?$/, '');

    if (/visualstudio\.com/i.test(withoutApis)) {
      return fallback;
    }

    if (/dev\.azure\.com/i.test(withoutApis)) {
      return `https://dev.azure.com/${this.encodedOrganization}`;
    }

    return withoutApis;
  }

  private _ensureApiSuffix(url: string): string {
    return url.endsWith('/_apis') ? url : `${url}/_apis`;
  }

  private _setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        await this.rateLimiter.acquire();

        // Add authentication
        if (this.authType === 'pat') {
          config.headers = (config.headers || {}) as any;
          config.headers['Authorization'] =
            `Basic ${Buffer.from(`:${this.credential}`).toString('base64')}`;
        } else if (this.authType === 'bearer') {
          config.headers = (config.headers || {}) as any;
          config.headers['Authorization'] = `Bearer ${this.credential}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (err) => {
        this._logResponseError(err);
        return Promise.reject(err);
      }
    );
  }

  private _logResponseError(err: any): void {
    const cfg = err.config || {};
    const url = cfg.url || 'unknown';

    if (!err.response) return;

    const { status, statusText, data } = err.response;

    if (status === 404) {
      this._log404Error(url, status, statusText, data);
    } else if (status === 401 && this.authType === 'bearer') {
      logger.error('HTTP 401 Unauthorized - authentication required');
    } else if (status === 400 && data) {
      this._log400Error(url, status, statusText, data);
    }
  }

  private _log404Error(url: string, status: number, statusText: string, data: any): void {
    logger.error('HTTP 404 Details', {
      meta: {
        url,
        status,
        statusText,
        data: data ? JSON.stringify(data).substring(0, 200) : 'no data',
      },
    });
  }

  private _log400Error(url: string, status: number, statusText: string, data: any): void {
    let snippet: string;
    try {
      snippet = JSON.stringify(data).substring(0, 200);
    } catch {
      snippet = 'Unable to stringify data';
    }

    logger.error('HTTP 400 Details', {
      meta: {
        url,
        status,
        statusText,
        data: snippet,
      },
    });
  }

  updateCredential(newCredential: string): void {
    this.credential = newCredential;
  }

  // Build a REST endpoint URL from apiBaseUrl (for HTTP calls)
  buildFullUrl(path: string): string {
    return `${this.apiBaseUrl}${path}`;
  }

  // Build a browser URL from baseUrl (for openExternal)
  getBrowserUrl(path: string): string {
    return `${this.baseUrl}/${this.encodedProject}${path}`;
  }

  buildTeamUrl(path: string): string {
    if (!this.encodedTeam) return this.buildFullUrl(path);
    // Insert team segment before _apis
    const teamSegment = `/${this.encodedTeam}`;
    const apiIndex = this.apiBaseUrl.indexOf('/_apis');
    if (apiIndex !== -1) {
      return `${this.apiBaseUrl.substring(0, apiIndex)}${teamSegment}${this.apiBaseUrl.substring(apiIndex)}${path}`;
    }
    return this.buildFullUrl(path);
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post<T>(url, data, config);
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.patch<T>(url, data, config);
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete<T>(url, config);
  }

  // Getters for external access
  get organizationName(): string {
    return this.organization;
  }

  get projectName(): string {
    return this.project;
  }

  get encodedOrg(): string {
    return this.encodedOrganization;
  }

  get encodedProj(): string {
    return this.encodedProject;
  }

  get encodedTeamName(): string | undefined {
    return this.encodedTeam;
  }

  setTeam(teamName: string): void {
    this.encodedTeam = encodeURIComponent(teamName);
  }
}
