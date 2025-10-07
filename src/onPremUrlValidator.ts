import axios from 'axios';

/**
 * Result from attempting to validate an on-prem URL structure
 */
interface ValidationAttempt {
  organization: string;
  project: string;
  baseUrl: string;
  apiBaseUrl: string;
  pathSegments: string[];
  success: boolean;
  error?: string;
}

/**
 * Validates an on-prem Azure DevOps URL by trying to access the project's _apis endpoint
 * @param protocol - http: or https:
 * @param host - server hostname
 * @param pathSegments - path segments from URL (e.g., ['tfs', 'CEDialtone', 'One'])
 * @param pat - Personal Access Token for authentication
 * @returns ValidationAttempt with success status
 */
async function validateOnPremStructure(
  protocol: string,
  host: string,
  pathSegments: string[],
  pat: string
): Promise<ValidationAttempt> {
  // For on-prem, we need to determine:
  // 1. Which segments form the baseUrl (everything before project)
  // 2. Which segment is the project (usually the last non-_apis segment before _workitems, _git, etc.)
  // 3. What's in between (could be org, collection, or both)

  // Strategy: The project name is most likely the segment just before special folders like:
  // _workitems, _git, _apis, _boards, etc.
  const specialFolders = [
    '_workitems',
    '_git',
    '_apis',
    '_boards',
    '_backlogs',
    '_sprints',
    '_queries',
    '_wiki',
    '_build',
    '_release',
    '_test',
  ];

  // Find the project: it's the segment before any special folder
  let projectIndex = -1;
  for (let i = 0; i < pathSegments.length; i++) {
    if (specialFolders.includes(pathSegments[i].toLowerCase())) {
      projectIndex = i - 1;
      break;
    }
  }

  // If no special folder found, assume last segment might be project
  if (projectIndex === -1 && pathSegments.length > 0) {
    projectIndex = pathSegments.length - 1;
  }

  if (projectIndex < 0) {
    return {
      organization: '',
      project: '',
      baseUrl: '',
      apiBaseUrl: '',
      pathSegments,
      success: false,
      error: 'Could not determine project from URL structure',
    };
  }

  const project = pathSegments[projectIndex];

  // Everything before the project forms the base path
  const basePath = pathSegments.slice(0, projectIndex);

  // If there's exactly one segment before project: baseUrl/org/project
  // If there are two segments before project: baseUrl/collection/org/project
  // If there are no segments before project: baseUrl/project (rare)

  const baseUrl =
    basePath.length > 0 ? `${protocol}//${host}/${basePath.join('/')}` : `${protocol}//${host}`;

  // Organization is typically the segment right before project, or same as first basePath segment
  const organization =
    projectIndex > 0 ? pathSegments[projectIndex - 1] : pathSegments[0] || project;

  // Construct API URL: everything up to and including project + /_apis
  const apiPath = pathSegments.slice(0, projectIndex + 1).join('/');
  const apiBaseUrl = `${protocol}//${host}/${apiPath}/_apis`;

  // Try to validate by calling a simple API endpoint
  try {
    const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
    const response = await axios.get(`${apiBaseUrl}/projects/${project}?api-version=7.0`, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
      validateStatus: (status) => status < 500, // Accept 401, 404 as "valid" structure (auth/project issues, not URL issues)
    });

    // If we get any response (even 401/404), the URL structure is probably correct
    const success = response.status < 500;

    return {
      organization,
      project,
      baseUrl,
      apiBaseUrl,
      pathSegments: basePath,
      success,
      error: success ? undefined : `HTTP ${response.status}`,
    };
  } catch (error: any) {
    // Network errors or timeouts suggest wrong URL structure
    return {
      organization,
      project,
      baseUrl,
      apiBaseUrl,
      pathSegments: basePath,
      success: false,
      error: error.code || error.message,
    };
  }
}

/**
 * Intelligently parses an on-prem Azure DevOps URL by trying different structural interpretations
 * and validating them against the server.
 *
 * @param url - Full URL to a work item, board, or other Azure DevOps resource
 * @param pat - Personal Access Token for validation
 * @returns Best validated structure or best guess if validation fails
 */
export async function parseAndValidateOnPremUrl(
  url: string,
  pat: string
): Promise<{
  organization: string;
  project: string;
  baseUrl: string;
  apiBaseUrl: string;
  validated: boolean;
  attempts: ValidationAttempt[];
}> {
  const parsed = new URL(url);
  const protocol = parsed.protocol;
  const host = parsed.host;
  const segments = parsed.pathname
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log('[parseAndValidateOnPremUrl] Analyzing URL:', {
    host,
    segments,
  });

  // Try to validate the structure
  const attempt = await validateOnPremStructure(protocol, host, segments, pat);

  console.log('[parseAndValidateOnPremUrl] Validation result:', {
    organization: attempt.organization,
    project: attempt.project,
    baseUrl: attempt.baseUrl,
    apiBaseUrl: attempt.apiBaseUrl,
    success: attempt.success,
    error: attempt.error,
  });

  return {
    organization: attempt.organization,
    project: attempt.project,
    baseUrl: attempt.baseUrl,
    apiBaseUrl: attempt.apiBaseUrl,
    validated: attempt.success,
    attempts: [attempt],
  };
}

/**
 * Extracts project name from URL by looking for it before special Azure DevOps folders
 */
export function extractProjectFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname
      .split('/')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const specialFolders = [
      '_workitems',
      '_git',
      '_apis',
      '_boards',
      '_backlogs',
      '_sprints',
      '_queries',
      '_wiki',
      '_build',
      '_release',
      '_test',
    ];

    // Find the segment before any special folder
    for (let i = 0; i < segments.length; i++) {
      if (specialFolders.includes(segments[i].toLowerCase())) {
        return i > 0 ? segments[i - 1] : null;
      }
    }

    // If no special folder, last segment might be project
    return segments.length > 0 ? segments[segments.length - 1] : null;
  } catch {
    return null;
  }
}
