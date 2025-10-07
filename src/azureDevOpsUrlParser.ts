export interface ParsedAzureDevOpsUrl {
  organization: string;
  project: string;
  baseUrl: string;
  apiBaseUrl: string;
  workItemId?: number;
  isValid: boolean;
  error?: string;
}

function buildApiBaseUrl(
  baseUrl: string,
  organization: string,
  project: string,
  isSimplifiedOnPrem: boolean = false
): string {
  const trimmedBase = baseUrl.replace(/\/$/, '');
  const lowerBase = trimmedBase.toLowerCase();

  if (lowerBase.includes('visualstudio.com')) {
    return `https://dev.azure.com/${organization}/${project}/_apis`;
  }

  if (lowerBase.includes('dev.azure.com')) {
    return `${trimmedBase}/${project}/_apis`;
  }

  // On-prem: baseUrl already includes collection
  // For simplified format (https://server/collection), don't add organization (it's same as collection)
  // For full format (https://server/collection with separate org), add org/project
  const apiUrl = isSimplifiedOnPrem
    ? `${trimmedBase}/${project}/_apis`
    : `${trimmedBase}/${organization}/${project}/_apis`;
  console.log('[buildApiBaseUrl] On-prem API URL:', apiUrl);
  return apiUrl;
}

function normalizeProjectSegment(segment: string | undefined): string {
  if (!segment) {
    return '';
  }

  return decodeURIComponent(segment.trim());
}

function extractWorkItemId(segments: string[], searchParams: URLSearchParams): number | undefined {
  const workItemsIndex = segments.findIndex((segment) => segment.toLowerCase() === '_workitems');
  if (workItemsIndex >= 0) {
    const next = segments[workItemsIndex + 1]?.toLowerCase();
    if (next === 'edit' || next === 'view') {
      const idSegment = segments[workItemsIndex + 2];
      const parsed = Number(idSegment);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  const queryId = searchParams.get('id');
  if (queryId) {
    const parsed = Number(queryId);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

/**
 * Simplified parser that extracts API base URL from a work item URL.
 * This approach works universally for cloud and on-premises without needing to understand
 * the collection/org/project structure.
 *
 * @param url - Work item URL (must contain _workitems)
 * @returns Parsed URL information with API base URL
 */
function parseWorkItemUrl(url: string): ParsedAzureDevOpsUrl {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return {
      organization: '',
      project: '',
      baseUrl: '',
      apiBaseUrl: '',
      isValid: false,
      error: 'Invalid URL: URL must be a non-empty string',
    };
  }

  const cleanUrl = url.trim();
  let parsed: URL;

  try {
    parsed = new URL(cleanUrl);
  } catch (_error) {
    void _error;
    return {
      organization: '',
      project: '',
      baseUrl: '',
      apiBaseUrl: '',
      isValid: false,
      error: 'Invalid URL: URL must include a valid protocol (http or https)',
    };
  }

  const segments = parsed.pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  // Find _workitems segment
  const workItemsIndex = segments.findIndex((s) => s.toLowerCase() === '_workitems');

  if (workItemsIndex < 0) {
    return {
      organization: '',
      project: '',
      baseUrl: '',
      apiBaseUrl: '',
      isValid: false,
      error: 'URL must be a work item URL (must contain _workitems)',
    };
  }

  if (workItemsIndex === 0) {
    return {
      organization: '',
      project: '',
      baseUrl: '',
      apiBaseUrl: '',
      isValid: false,
      error: 'Invalid URL structure: _workitems cannot be the first segment',
    };
  }

  // Project is the segment immediately before _workitems
  const project = normalizeProjectSegment(segments[workItemsIndex - 1]);

  // API base is everything up to (and including) project, then add /_apis
  const pathUpToProject = segments.slice(0, workItemsIndex).join('/');
  const apiBaseUrl = `${parsed.protocol}//${parsed.host}/${pathUpToProject}/_apis`;

  // For baseUrl, use the server root
  const baseUrl = `${parsed.protocol}//${parsed.host}`;

  // Organization: use the first segment as a fallback (works for cloud, approximation for on-prem)
  const organization = segments[0] || 'default';

  // Extract work item ID if present
  const workItemId = extractWorkItemId(segments, parsed.searchParams);

  console.log('[parseWorkItemUrl] Parsed:', {
    project,
    organization,
    baseUrl,
    apiBaseUrl,
    workItemId,
  });

  return {
    organization: normalizeProjectSegment(organization),
    project,
    baseUrl,
    apiBaseUrl,
    workItemId,
    isValid: true,
  };
}

/**
 * Parses an Azure DevOps URL to extract organization, project, and base URL information.
 * Accepts work item URLs as well as broader project URLs (boards, repos, etc.).
 */
export function parseAzureDevOpsUrl(url: string): ParsedAzureDevOpsUrl {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return {
      organization: '',
      project: '',
      baseUrl: '',
      apiBaseUrl: '',
      isValid: false,
      error: 'Invalid URL: URL must be a non-empty string',
    };
  }

  const cleanUrl = url.trim();

  // If it's a work item URL, use the simplified parser
  if (cleanUrl.includes('/_workitems/') || cleanUrl.includes('/_workitems?')) {
    return parseWorkItemUrl(cleanUrl);
  }

  // Otherwise fall back to the complex parser for non-work-item URLs
  let parsed: URL;

  try {
    parsed = new URL(cleanUrl);
  } catch (_error) {
    void _error;
    return {
      organization: '',
      project: '',
      baseUrl: '',
      apiBaseUrl: '',
      isValid: false,
      error: 'Invalid URL: URL must include a valid protocol (http or https)',
    };
  }

  const host = parsed.hostname.toLowerCase();
  const segments = parsed.pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  let organization = '';
  let project = '';
  let baseUrl = '';

  if (host === 'dev.azure.com' || host === 'vsrm.dev.azure.com') {
    organization = normalizeProjectSegment(segments[0]);
    project = normalizeProjectSegment(segments[1]);
    if (organization) {
      baseUrl = `https://dev.azure.com/${organization}`;
    }
  } else if (host.endsWith('.dev.azure.com')) {
    const parts = host.split('.');
    organization = decodeURIComponent(parts[0]);
    project = normalizeProjectSegment(segments[0]);
    baseUrl = `https://${parts[0]}.dev.azure.com`;
  } else if (host.endsWith('.visualstudio.com') || host.endsWith('.vsrm.visualstudio.com')) {
    const parts = host.split('.');
    organization = decodeURIComponent(parts[0]);
    project = normalizeProjectSegment(segments[0]);
    baseUrl = `https://${parts[0]}.visualstudio.com`;
  } else {
    // Handle on-premises Azure DevOps Server URLs
    // Format: https://server/collection/org/project/...
    // OR simplified format: https://server/collection/project/... (when collection serves as both)
    // We need at least 2 segments for minimal on-prem, but prefer 3 for full collection/org/project
    let isSimplifiedOnPrem = false;

    if (segments.length >= 3) {
      // Full on-prem format: collection/org/project
      const collection = normalizeProjectSegment(segments[0]);
      organization = normalizeProjectSegment(segments[1]);
      project = normalizeProjectSegment(segments[2]);
      // Base URL includes protocol, host, and collection
      baseUrl = `${parsed.protocol}//${parsed.host}/${collection}`;
      console.log('[parseAzureDevOpsUrl] Parsed on-prem URL (3-segment):', {
        collection,
        organization,
        project,
        baseUrl,
      });
    } else if (segments.length >= 2) {
      // Simplified on-prem format: collection/project (no separate org)
      const collection = normalizeProjectSegment(segments[0]);
      organization = collection; // Use collection as org for simplified format
      project = normalizeProjectSegment(segments[1]);
      baseUrl = `${parsed.protocol}//${parsed.host}/${collection}`;
      isSimplifiedOnPrem = true;
      console.log('[parseAzureDevOpsUrl] Parsed on-prem URL (2-segment):', {
        collection,
        organization,
        project,
        baseUrl,
        isSimplifiedOnPrem,
      });
    }

    if (!organization || !project) {
      return {
        organization: '',
        project: '',
        baseUrl: '',
        apiBaseUrl: '',
        isValid: false,
        error:
          'Unsupported URL format. Provide an Azure DevOps URL that includes the organization and project.',
      };
    }

    const apiBaseUrl = buildApiBaseUrl(baseUrl, organization, project, isSimplifiedOnPrem);
    const workItemId = extractWorkItemId(segments, parsed.searchParams);

    return {
      organization,
      project,
      baseUrl,
      apiBaseUrl,
      workItemId,
      isValid: true,
    };
  }

  // This should never be reached due to the else block above, but keeping for safety
  if (!organization || !project) {
    return {
      organization: '',
      project: '',
      baseUrl: '',
      apiBaseUrl: '',
      isValid: false,
      error:
        'Unsupported URL format. Provide an Azure DevOps URL that includes the organization and project.',
    };
  }

  const apiBaseUrl = buildApiBaseUrl(baseUrl, organization, project, false);
  const workItemId = extractWorkItemId(segments, parsed.searchParams);

  return {
    organization,
    project,
    baseUrl,
    apiBaseUrl,
    workItemId,
    isValid: true,
  };
}

/**
 * Validates if a URL looks like an Azure DevOps work item URL.
 *
 * @param url - The URL to validate
 * @returns True if the URL appears to be an Azure DevOps work item URL
 */
export function isAzureDevOpsWorkItemUrl(url: string): boolean {
  return parseAzureDevOpsUrl(url).isValid;
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
  } else if (baseUrl.includes('visualstudio.com')) {
    return `https://${organization}.visualstudio.com/_usersSettings/tokens`;
  } else {
    // For on-premises servers, use the base URL structure
    const trimmedBase = baseUrl.replace(/\/$/, '');
    return `${trimmedBase}/_usersSettings/tokens`;
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
  } else if (baseUrl.includes('visualstudio.com')) {
    return `https://${organization}.visualstudio.com/${project}/_workitems/edit/${workItemId}`;
  } else {
    // For on-premises servers, use the base URL structure
    const trimmedBase = baseUrl.replace(/\/$/, '');
    return `${trimmedBase}/${project}/_workitems/edit/${workItemId}`;
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
