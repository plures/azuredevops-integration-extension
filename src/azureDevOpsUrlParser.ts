export interface ParsedAzureDevOpsUrl {
  organization: string;
  project: string;
  baseUrl: string;
  apiBaseUrl: string;
  workItemId?: number;
  isValid: boolean;
  error?: string;
}

const UNSUPPORTED_URL_ERROR =
  'Unsupported URL format. Provide an Azure DevOps URL that includes the organization and project.';

function trimSegment(segment: string | undefined): string {
  return typeof segment === 'string' ? segment.trim() : '';
}

function buildApiBaseUrl(
  baseUrl: string,
  organization: string,
  project: string,
  isSimplifiedOnPrem: boolean = false
): string {
  const trimmedBase = baseUrl.replace(/\/$/, '');
  const lowerBase = trimmedBase.toLowerCase();

  if (
    lowerBase.includes('visualstudio.com') ||
    lowerBase.endsWith('.dev.azure.com') ||
    lowerBase.includes('dev.azure.com/') ||
    lowerBase === 'https://dev.azure.com'
  ) {
    return `https://dev.azure.com/${organization}/${project}/_apis`;
  }

  if (lowerBase.includes('dev.azure.com')) {
    return `https://dev.azure.com/${organization}/${project}/_apis`;
  }

  const apiUrl = isSimplifiedOnPrem
    ? `${trimmedBase}/${project}/_apis`
    : `${trimmedBase}/${organization}/${project}/_apis`;
  return apiUrl;
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

function makeInvalid(error: string): ParsedAzureDevOpsUrl {
  return {
    organization: '',
    project: '',
    baseUrl: '',
    apiBaseUrl: '',
    isValid: false,
    error,
  };
}

function splitPathSegments(parsed: URL): {
  segments: string[];
  pathSegments: string[];
  trailingSegments: string[];
} {
  const segments = parsed.pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  const specialIndex = segments.findIndex((segment) => segment.startsWith('_'));
  if (specialIndex < 0) {
    return { segments, pathSegments: segments, trailingSegments: [] };
  }

  return {
    segments,
    pathSegments: segments.slice(0, specialIndex),
    trailingSegments: segments.slice(specialIndex),
  };
}

function resolveCloudRoot(
  parsed: URL,
  pathSegments: string[]
): { organization: string; project: string; baseUrl: string } | null {
  if (pathSegments.length < 2) {
    return null;
  }

  const organization = trimSegment(pathSegments[0]);
  const project = trimSegment(pathSegments[1]);
  if (!organization || !project) {
    return null;
  }

  return {
    organization,
    project,
    baseUrl: `${parsed.protocol}//${parsed.host}/${organization}`,
  };
}

function resolveCloudSubdomain(
  parsed: URL,
  pathSegments: string[]
): { organization: string; project: string; baseUrl: string } | null {
  const parts = parsed.hostname.split('.');
  const organization = trimSegment(parts[0]);
  const project = trimSegment(pathSegments[0]);
  if (!organization || !project) {
    return null;
  }

  return {
    organization,
    project,
    baseUrl: `${parsed.protocol}//${parsed.host}`,
  };
}

function resolveVisualStudio(
  parsed: URL,
  pathSegments: string[]
): { organization: string; project: string; baseUrl: string } | null {
  const parts = parsed.hostname.split('.');
  const organization = trimSegment(parts[0]);
  const project = trimSegment(pathSegments[0]);
  if (!organization || !project) {
    return null;
  }

  const canonicalHost = parsed.hostname.includes('.vsrm.')
    ? parsed.hostname.replace('.vsrm.', '.')
    : parsed.hostname;

  return {
    organization,
    project,
    baseUrl: `${parsed.protocol}//${canonicalHost}`,
  };
}

function resolveOnPrem(
  parsed: URL,
  pathSegments: string[]
): {
  organization: string;
  project: string;
  baseUrl: string;
  isSimplified: boolean;
} | null {
  if (pathSegments.length < 2) {
    return null;
  }

  const collection = trimSegment(pathSegments[0]);
  const project = trimSegment(pathSegments[pathSegments.length - 1]);
  if (!collection || !project) {
    return null;
  }

  const hasSeparateOrg = pathSegments.length >= 3;
  const organization = hasSeparateOrg
    ? trimSegment(pathSegments[pathSegments.length - 2])
    : collection;
  if (!organization) {
    return null;
  }

  return {
    organization,
    project,
    baseUrl: `${parsed.protocol}//${parsed.host}/${collection}`,
    isSimplified: !hasSeparateOrg,
  };
}

export function parseAzureDevOpsUrl(url: string): ParsedAzureDevOpsUrl {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return makeInvalid('Invalid URL: URL must be a non-empty string');
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch (_error) {
    return makeInvalid('Invalid URL: URL must include a valid protocol (http or https)');
  }

  const { segments, pathSegments, trailingSegments } = splitPathSegments(parsed);
  if (trailingSegments.length === 0) {
    return makeInvalid(UNSUPPORTED_URL_ERROR);
  }

  const firstSpecial = trailingSegments[0].toLowerCase();
  const isWorkItemPath = firstSpecial === '_workitems';
  const isBoardsPath = firstSpecial === '_boards';
  if (!isWorkItemPath && !isBoardsPath) {
    return makeInvalid(UNSUPPORTED_URL_ERROR);
  }

  const host = parsed.hostname.toLowerCase();
  const isCloudRoot = host === 'dev.azure.com' || host === 'vsrm.dev.azure.com';
  const isCloudSubdomain = host.endsWith('.dev.azure.com');
  const isVisualStudio = host.endsWith('.visualstudio.com') || host.endsWith('.vsrm.visualstudio.com');

  let organization = '';
  let project = '';
  let baseUrl = '';
  let isSimplifiedOnPrem = false;

  if (isCloudRoot) {
    const resolved = resolveCloudRoot(parsed, pathSegments);
    if (!resolved) {
      return makeInvalid(UNSUPPORTED_URL_ERROR);
    }
    organization = resolved.organization;
    project = resolved.project;
    baseUrl = resolved.baseUrl;
  } else if (isCloudSubdomain) {
    const resolved = resolveCloudSubdomain(parsed, pathSegments);
    if (!resolved) {
      return makeInvalid(UNSUPPORTED_URL_ERROR);
    }
    organization = resolved.organization;
    project = resolved.project;
    baseUrl = resolved.baseUrl;
  } else if (isVisualStudio) {
    const resolved = resolveVisualStudio(parsed, pathSegments);
    if (!resolved) {
      return makeInvalid(UNSUPPORTED_URL_ERROR);
    }
    organization = resolved.organization;
    project = resolved.project;
    baseUrl = resolved.baseUrl;
  } else {
    const resolved = resolveOnPrem(parsed, pathSegments);
    if (!resolved) {
      return makeInvalid(UNSUPPORTED_URL_ERROR);
    }
    organization = resolved.organization;
    project = resolved.project;
    baseUrl = resolved.baseUrl;
    isSimplifiedOnPrem = resolved.isSimplified;
  }

  const workItemId = extractWorkItemId(segments, parsed.searchParams);
  const mode = trailingSegments[1]?.toLowerCase();
  const requiresId = isWorkItemPath && (mode === 'edit' || mode === 'view');
  if (requiresId && !workItemId) {
    return makeInvalid(UNSUPPORTED_URL_ERROR);
  }

  const apiBaseUrl = buildApiBaseUrl(baseUrl, organization, project, isSimplifiedOnPrem);

  return {
    organization,
    project,
    baseUrl,
    apiBaseUrl,
    workItemId,
    isValid: true,
  };
}

export function isAzureDevOpsWorkItemUrl(url: string): boolean {
  const parsed = parseAzureDevOpsUrl(url);
  if (!parsed.isValid) {
    return false;
  }
  return typeof parsed.workItemId === 'number' && !Number.isNaN(parsed.workItemId);
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
