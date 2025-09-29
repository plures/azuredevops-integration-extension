/**
 * Azure DevOps URL Parser
 *
 * Parses Azure DevOps URLs to extract organization, project, and base URL information.
 * Supports multiple Azure DevOps URL formats:
 * - https://dev.azure.com/{org}/{project}/_workitems/edit/{id}
 * - https://{org}.visualstudio.com/{project}/_workitems/edit/{id}
 * - https://{org}.dev.azure.com/{project}/_workitems/edit/{id}
 * - https://{org}.vsrm.visualstudio.com/{project}/_workitems/edit/{id}
 */

export interface ParsedAzureDevOpsUrl {
  organization: string;
  project: string;
  baseUrl: string;
  apiBaseUrl: string;
  workItemId?: number;
  isValid: boolean;
  error?: string;
}

export interface AzureDevOpsUrlPattern {
  pattern: RegExp;
  extractGroups: (match: RegExpMatchArray) => {
    organization: string;
    project: string;
    baseUrl: string;
    workItemId?: number;
  };
}

const URL_PATTERNS: AzureDevOpsUrlPattern[] = [
  // Pattern 1: https://dev.azure.com/{org}/{project}/_workitems/edit/{id}
  {
    pattern: /^https:\/\/dev\.azure\.com\/([^/]+)\/([^/]+)\/_workitems\/edit\/(\d+)(?:\/.*)?$/i,
    extractGroups: (match) => ({
      organization: match[1],
      project: match[2],
      baseUrl: `https://dev.azure.com/${match[1]}`,
      workItemId: parseInt(match[3], 10),
    }),
  },
  // Pattern 2: https://{org}.visualstudio.com/{project}/_workitems/edit/{id}
  {
    pattern: /^https:\/\/([^/]+)\.visualstudio\.com\/([^/]+)\/_workitems\/edit\/(\d+)(?:\/.*)?$/i,
    extractGroups: (match) => ({
      organization: match[1],
      project: match[2],
      baseUrl: `https://${match[1]}.visualstudio.com`,
      workItemId: parseInt(match[3], 10),
    }),
  },
  // Pattern 3: https://{org}.dev.azure.com/{project}/_workitems/edit/{id}
  {
    pattern: /^https:\/\/([^/]+)\.dev\.azure\.com\/([^/]+)\/_workitems\/edit\/(\d+)(?:\/.*)?$/i,
    extractGroups: (match) => ({
      organization: match[1],
      project: match[2],
      baseUrl: `https://${match[1]}.dev.azure.com`,
      workItemId: parseInt(match[3], 10),
    }),
  },
  // Pattern 4: https://{org}.vsrm.visualstudio.com/{project}/_workitems/edit/{id}
  {
    pattern:
      /^https:\/\/([^/]+)\.vsrm\.visualstudio\.com\/([^/]+)\/_workitems\/edit\/(\d+)(?:\/.*)?$/i,
    extractGroups: (match) => ({
      organization: match[1],
      project: match[2],
      baseUrl: `https://${match[1]}.visualstudio.com`,
      workItemId: parseInt(match[3], 10),
    }),
  },
  // Pattern 5: https://dev.azure.com/{org}/{project}/_workitems/edit/{id} (with additional path)
  {
    pattern: /^https:\/\/dev\.azure\.com\/([^/]+)\/([^/]+)\/_workitems\/edit\/(\d+)\/.*$/i,
    extractGroups: (match) => ({
      organization: match[1],
      project: match[2],
      baseUrl: `https://dev.azure.com/${match[1]}`,
      workItemId: parseInt(match[3], 10),
    }),
  },
  // Pattern 6: https://{org}.visualstudio.com/{project}/_workitems/edit/{id} (with additional path)
  {
    pattern: /^https:\/\/([^/]+)\.visualstudio\.com\/([^/]+)\/_workitems\/edit\/(\d+)\/.*$/i,
    extractGroups: (match) => ({
      organization: match[1],
      project: match[2],
      baseUrl: `https://${match[1]}.visualstudio.com`,
      workItemId: parseInt(match[3], 10),
    }),
  },
];

/**
 * Parses an Azure DevOps work item URL to extract organization, project, and base URL information.
 *
 * @param url - The Azure DevOps work item URL
 * @returns Parsed URL information or error details
 */
export function parseAzureDevOpsUrl(url: string): ParsedAzureDevOpsUrl {
  if (!url || typeof url !== 'string') {
    return {
      organization: '',
      project: '',
      baseUrl: '',
      apiBaseUrl: '',
      isValid: false,
      error: 'Invalid URL: URL must be a non-empty string',
    };
  }

  // Clean up the URL
  const cleanUrl = url.trim();

  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    return {
      organization: '',
      project: '',
      baseUrl: '',
      apiBaseUrl: '',
      isValid: false,
      error: 'Invalid URL: URL must start with http:// or https://',
    };
  }

  // Try to match against known patterns
  for (const pattern of URL_PATTERNS) {
    const match = cleanUrl.match(pattern.pattern);
    if (match) {
      try {
        const extracted = pattern.extractGroups(match);

        // Validate extracted values
        if (!extracted.organization || !extracted.project) {
          continue; // Try next pattern
        }

        // Determine the correct API base URL
        let apiBaseUrl: string;
        if (extracted.baseUrl.includes('dev.azure.com')) {
          apiBaseUrl = `${extracted.baseUrl}/${extracted.project}/_apis`;
        } else {
          // For visualstudio.com URLs, use the dev.azure.com API format
          apiBaseUrl = `https://dev.azure.com/${extracted.organization}/${extracted.project}/_apis`;
        }

        return {
          organization: extracted.organization,
          project: extracted.project,
          baseUrl: extracted.baseUrl,
          apiBaseUrl,
          workItemId: extracted.workItemId,
          isValid: true,
        };
      } catch {
        // Continue to next pattern if this one fails
        continue;
      }
    }
  }

  return {
    organization: '',
    project: '',
    baseUrl: '',
    apiBaseUrl: '',
    isValid: false,
    error: 'Unsupported URL format. Please provide a valid Azure DevOps work item URL.',
  };
}

/**
 * Validates if a URL looks like an Azure DevOps work item URL.
 *
 * @param url - The URL to validate
 * @returns True if the URL appears to be an Azure DevOps work item URL
 */
export function isAzureDevOpsWorkItemUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const cleanUrl = url.trim().toLowerCase();

  return (
    (cleanUrl.includes('dev.azure.com') || cleanUrl.includes('visualstudio.com')) &&
    cleanUrl.includes('_workitems/edit/')
  );
}

/**
 * Generates a PAT creation URL for the given organization.
 *
 * @param organization - The Azure DevOps organization name
 * @param baseUrl - The base URL for the organization
 * @returns The PAT creation URL
 */
export function generatePatCreationUrl(organization: string, baseUrl: string): string {
  if (baseUrl.includes('dev.azure.com')) {
    return `https://dev.azure.com/${organization}/_usersSettings/tokens`;
  } else {
    return `https://${organization}.visualstudio.com/_usersSettings/tokens`;
  }
}

/**
 * Generates a work item URL for the given organization, project, and work item ID.
 *
 * @param organization - The Azure DevOps organization name
 * @param project - The project name
 * @param workItemId - The work item ID
 * @param baseUrl - The base URL for the organization
 * @returns The work item URL
 */
export function generateWorkItemUrl(
  organization: string,
  project: string,
  workItemId: number,
  baseUrl: string
): string {
  if (baseUrl.includes('dev.azure.com')) {
    return `https://dev.azure.com/${organization}/${project}/_workitems/edit/${workItemId}`;
  } else {
    return `https://${organization}.visualstudio.com/${project}/_workitems/edit/${workItemId}`;
  }
}

/**
 * Tests the connection to Azure DevOps using the parsed URL information.
 *
 * @param parsedUrl - The parsed URL information
 * @param pat - The Personal Access Token
 * @returns Promise that resolves to true if connection is successful
 */
export async function testAzureDevOpsConnection(
  parsedUrl: ParsedAzureDevOpsUrl,
  pat: string
): Promise<{ success: boolean; error?: string }> {
  if (!parsedUrl.isValid) {
    return { success: false, error: 'Invalid URL configuration' };
  }

  if (!pat || !pat.trim()) {
    return { success: false, error: 'Personal Access Token is required' };
  }

  try {
    // Test the connection by making a simple API call
    const response = await fetch(`${parsedUrl.apiBaseUrl}/wit/workitemtypes?api-version=7.0`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`:${pat}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return { success: true };
    } else if (response.status === 401) {
      return {
        success: false,
        error: 'Invalid Personal Access Token. Please check your token and try again.',
      };
    } else if (response.status === 403) {
      return {
        success: false,
        error: 'Access denied. Please ensure your token has the required permissions.',
      };
    } else {
      return { success: false, error: `Connection failed with status ${response.status}` };
    }
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
