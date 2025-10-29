import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { RateLimiter } from '../../rateLimiter.js';
import type { AuthType, ClientOptions } from './types.js';

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
        await this.rateLimiter.wait();

        // Add authentication
        if (this.authType === 'pat') {
          config.headers = config.headers || {};
          config.headers['Authorization'] =
            `Basic ${Buffer.from(`:${this.credential}`).toString('base64')}`;
        } else if (this.authType === 'bearer') {
          config.headers = config.headers || {};
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
        const cfg = err.config || {};
        const url = cfg.url || 'unknown';

        if (err.response) {
          const { status, statusText, data } = err.response;

          if (status === 404) {
            console.error('[azureDevOpsInt][HTTP][404_DETAILS]', {
              url,
              status,
              statusText,
              data: data ? JSON.stringify(data).substring(0, 200) : 'no data',
            });
          }

          if (status === 401 && this.authType === 'bearer') {
            console.error(`[azureDevOpsInt][HTTP] 401 Unauthorized - authentication required`);
          }

          // Handle specific error cases
          if (status === 400 && data) {
            let snippet: string;
            try {
              snippet = JSON.stringify(data).substring(0, 200);
            } catch {
              snippet = String(data).substring(0, 200);
            }
            console.error('[azureDevOpsInt][HTTP][400_DETAILS]', {
              url,
              status,
              statusText,
              data: snippet,
            });
          }
        }

        return Promise.reject(err);
      }
    );
  }

  updateCredential(newCredential: string): void {
    this.credential = newCredential;
  }

  buildFullUrl(path: string): string {
    return `${this.apiBaseUrl}${path}`;
  }

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
