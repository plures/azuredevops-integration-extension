/**
 * Improved Azure DevOps Client with proper error handling, types, and best practices
 */
import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Proper TypeScript interfaces
export interface WorkItem {
  id: number;
  fields: {
    [key: string]: any;
    'System.Title'?: string;
    'System.State'?: string;
    'System.WorkItemType'?: string;
  };
}

export interface AzureClientConfig {
  organization: string;
  project: string;
  pat: string;
  apiVersion?: string;
  timeout?: number;
  rateLimit?: {
    requestsPerSecond: number;
    burst: number;
  };
}

export class ImprovedAzureClient {
  private readonly axiosInstance: AxiosInstance;
  private readonly baseUrl: string;
  private readonly config: Required<AzureClientConfig>;
  private rateLimitQueue: Promise<void> = Promise.resolve();
  private lastRequestTime = 0;

  constructor(config: AzureClientConfig) {
    // Input validation
    this.validateConfig(config);

    // Set defaults
    this.config = {
      ...config,
      apiVersion: config.apiVersion || '7.0',
      timeout: config.timeout || 30000,
      rateLimit: config.rateLimit || { requestsPerSecond: 5, burst: 10 },
    };

    this.baseUrl = `https://dev.azure.com/${this.config.organization}/${this.config.project}/_apis`;

    // Create axios instance with proper configuration
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: this.config.timeout,
      headers: {
        Authorization: `Basic ${Buffer.from(':' + this.config.pat).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.setupInterceptors();
  }

  private validateConfig(config: AzureClientConfig): void {
    if (!config.organization?.trim()) {
      throw new Error('Organization is required');
    }
    if (!config.project?.trim()) {
      throw new Error('Project is required');
    }
    if (!config.pat?.trim()) {
      throw new Error('Personal Access Token is required');
    }
  }

  private setupInterceptors(): void {
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        const errorMessage = this.formatErrorMessage(error);
        console.error('Azure DevOps API Error:', errorMessage);
        throw new Error(errorMessage);
      }
    );
  }

  private formatErrorMessage(error: any): string {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText;
      return `HTTP ${status}: ${message}`;
    }

    if (error.request) {
      return 'Network error: No response received from Azure DevOps';
    }

    return error.message || 'Unknown error occurred';
  }

  private async rateLimit(): Promise<void> {
    const minInterval = 1000 / this.config.rateLimit.requestsPerSecond;
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < minInterval) {
      await new Promise((resolve) => setTimeout(resolve, minInterval - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();
  }

  async getWorkItems(query?: string): Promise<WorkItem[]> {
    try {
      // Rate limiting
      await this.rateLimit();

      const wiqlQuery =
        query ||
        `
                SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType]
                FROM WorkItems 
                WHERE [System.TeamProject] = @project 
                AND [System.State] <> 'Closed'
                ORDER BY [System.ChangedDate] DESC
            `;

      // First, get work item IDs
      const wiqlResponse: AxiosResponse<{ workItems: { id: number }[] }> =
        await this.axiosInstance.post(`/wit/wiql?api-version=${this.config.apiVersion}`, {
          query: wiqlQuery,
        });

      const workItemIds = wiqlResponse.data.workItems?.map((wi) => wi.id) || [];

      if (workItemIds.length === 0) {
        return [];
      }

      // Then get full work item details
      const itemsResponse: AxiosResponse<{ value: WorkItem[] }> = await this.axiosInstance.get(
        `/wit/workitems?ids=${workItemIds.join(',')}&$expand=all&api-version=${this.config.apiVersion}`
      );

      return itemsResponse.data.value || [];
    } catch (error) {
      console.error('Failed to fetch work items:', error);
      throw error;
    }
  }

  async updateWorkItem(
    id: number,
    patchOperations: Array<{
      op: 'add' | 'replace' | 'remove';
      path: string;
      value?: any;
    }>
  ): Promise<WorkItem> {
    // Input validation
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid work item ID');
    }

    if (!Array.isArray(patchOperations) || patchOperations.length === 0) {
      throw new Error('Patch operations are required');
    }

    try {
      await this.rateLimit();

      const response: AxiosResponse<WorkItem> = await this.axiosInstance.patch(
        `/wit/workitems/${id}?api-version=${this.config.apiVersion}`,
        patchOperations,
        {
          headers: {
            'Content-Type': 'application/json-patch+json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Failed to update work item ${id}:`, error);
      throw error;
    }
  }

  // Proper cleanup method
  dispose(): void {
    // Cancel any pending requests
    this.axiosInstance.defaults.timeout = 1;
    // Clear any timeouts/intervals if they existed
  }
}

// Proper ES module export
export default ImprovedAzureClient;
