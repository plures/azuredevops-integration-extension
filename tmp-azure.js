let loggerModulePromise;
async function getLoggerModule() {
  if (!loggerModulePromise) {
    loggerModulePromise = import('../logging/FSMLogger.js');
  }
  return loggerModulePromise;
}
async function getConnectionLogger(connectionId) {
  const { FSMComponent, fsmLogger } = await getLoggerModule();
  return {
    FSMComponent,
    fsmLogger,
    fsmContext: { component: FSMComponent.CONNECTION, connectionId },
  };
}
async function validateClientConfig(context) {
  const { FSMComponent, fsmLogger, fsmContext } = await getConnectionLogger(context.connectionId);
  fsmLogger.debug(FSMComponent.CONNECTION, 'Validating client configuration', fsmContext, {
    hasCredential: !!context.credential,
    hasConfig: !!context.config,
    organization: context.config.organization,
    project: context.config.project,
  });
  const errors = [];
  const project = context.config.project?.trim();
  let organization = context.config.organization?.trim();
  if (!context.credential) {
    errors.push('No credential available');
  }
  if (!project) {
    errors.push('Project not specified');
  }
  const baseUrl = sanitizeUrl(context.config.baseUrl);
  const apiBaseUrl = sanitizeUrl(context.config.apiBaseUrl);
  if (context.config.baseUrl && baseUrl !== context.config.baseUrl) {
    fsmLogger.debug(
      FSMComponent.CONNECTION,
      'Normalized baseUrl for client configuration',
      fsmContext,
      {
        original: context.config.baseUrl,
        normalized: baseUrl,
      }
    );
  }
  if (context.config.apiBaseUrl && apiBaseUrl !== context.config.apiBaseUrl) {
    fsmLogger.debug(
      FSMComponent.CONNECTION,
      'Normalized apiBaseUrl for client configuration',
      fsmContext,
      {
        original: context.config.apiBaseUrl,
        normalized: apiBaseUrl,
      }
    );
  }
  const derivedOrganization = resolveOrganizationName({
    organization,
    project,
    baseUrl,
    apiBaseUrl,
  });
  if (!organization || organization.length === 0) {
    if (derivedOrganization) {
      organization = derivedOrganization;
    }
  } else if (
    derivedOrganization &&
    project &&
    organization.toLowerCase() === project.toLowerCase() &&
    derivedOrganization.toLowerCase() !== organization.toLowerCase()
  ) {
    fsmLogger.info(
      FSMComponent.CONNECTION,
      'Organization name matched project; using derived organization from URL',
      fsmContext,
      {
        originalOrganization: organization,
        derivedOrganization,
        project,
      }
    );
    organization = derivedOrganization;
  }
  if (!organization) {
    errors.push('Organization not specified');
  }
  if (errors.length > 0) {
    fsmLogger.warn(FSMComponent.CONNECTION, 'Client configuration validation failed', fsmContext, {
      errors,
    });
    return { isValid: false, errors, context };
  }
  const safeOrganization = organization;
  const safeProject = project;
  const config = {
    organization: safeOrganization,
    project: safeProject,
    credential: context.credential,
    options: {
      ratePerSecond: 10,
      // Default rate limiting
      burst: 20,
      team: context.config.team,
      baseUrl,
      apiBaseUrl,
      authType: context.config.authMethod === 'entra' ? 'bearer' : 'pat',
      identityName: context.config.identityName,
      // onAuthFailure will be set by FSM
    },
  };
  fsmLogger.debug(
    FSMComponent.CONNECTION,
    'Client configuration validated successfully',
    fsmContext,
    {
      authType: config.options.authType,
      hasTeam: !!config.options.team,
      hasBaseUrl: !!config.options.baseUrl,
    }
  );
  return { isValid: true, config, context };
}
async function createAzureClient(context, config) {
  const { FSMComponent, fsmLogger, fsmContext } = await getConnectionLogger(context.connectionId);
  fsmLogger.debug(FSMComponent.CONNECTION, 'Creating Azure DevOps client', fsmContext, {
    organization: config.organization,
    project: config.project,
    authType: config.options.authType,
    hasBaseUrl: !!config.options.baseUrl,
  });
  try {
    const { AzureDevOpsIntClient } = await import('../../azureClient.js');
    const client = new AzureDevOpsIntClient(
      config.organization,
      config.project,
      config.credential,
      config.options
    );
    fsmLogger.info(
      FSMComponent.CONNECTION,
      'Azure DevOps client created successfully',
      fsmContext,
      {
        organization: config.organization,
        project: config.project,
        authType: config.options.authType,
      }
    );
    return { client, config, context };
  } catch (error) {
    fsmLogger.error(FSMComponent.CONNECTION, 'Failed to create Azure DevOps client', fsmContext, {
      error: error instanceof Error ? error.message : String(error),
      organization: config.organization,
      project: config.project,
    });
    throw error;
  }
}
async function testClientConnectivity(context, client) {
  const { FSMComponent, fsmLogger, fsmContext } = await getConnectionLogger(context.connectionId);
  fsmLogger.debug(FSMComponent.CONNECTION, 'Testing client connectivity', fsmContext);
  try {
    const userId = await client.getAuthenticatedUserId();
    if (userId) {
      fsmLogger.info(FSMComponent.CONNECTION, 'Client connectivity test successful', fsmContext, {
        userId,
      });
      return { success: true, userId, context };
    } else {
      fsmLogger.warn(
        FSMComponent.CONNECTION,
        'Client connectivity test failed - no user ID',
        fsmContext
      );
      return { success: false, error: 'Unable to authenticate user', context };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    fsmLogger.error(FSMComponent.CONNECTION, 'Client connectivity test failed', fsmContext, {
      error: errorMessage,
    });
    return { success: false, error: errorMessage, context };
  }
}
function normalizeConnectionConfig(rawConfig) {
  const errors = [];
  if (!rawConfig) {
    errors.push('Configuration is required');
    return { isValid: false, errors };
  }
  const organization = rawConfig.organization?.trim();
  const project = rawConfig.project?.trim();
  if (!organization) {
    errors.push('Organization is required');
  }
  if (!project) {
    errors.push('Project is required');
  }
  if (errors.length > 0) {
    return { isValid: false, errors };
  }
  const config = {
    organization,
    project,
    team: rawConfig.team?.trim(),
    baseUrl: rawConfig.baseUrl?.trim(),
    apiBaseUrl: rawConfig.apiBaseUrl?.trim(),
    authMethod: rawConfig.authMethod || 'pat',
    tenantId: rawConfig.tenantId?.trim(),
    identityName: rawConfig.identityName?.trim(),
  };
  return { isValid: true, config };
}
function sanitizeUrl(raw) {
  if (!raw) {
    return void 0;
  }
  const trimmed = raw.trim().replace(/\/+$/, '');
  try {
    const parsed = new URL(trimmed);
    parsed.pathname = parsed.pathname
      .split('/')
      .map((segment) => {
        if (!segment) {
          return segment;
        }
        try {
          return encodeURIComponent(decodeURIComponent(segment));
        } catch {
          return encodeURIComponent(segment);
        }
      })
      .join('/');
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return encodeURI(trimmed);
  }
}
function resolveOrganizationName(params) {
  const { organization, project, baseUrl, apiBaseUrl } = params;
  const candidates = [
    organization?.trim(),
    extractOrganizationFromUrl(baseUrl),
    extractOrganizationFromUrl(apiBaseUrl),
  ];
  const normalized = candidates
    .map((value) => (value ? value.trim() : void 0))
    .filter((value) => !!value && value.length > 0);
  if (normalized.length === 0) {
    return void 0;
  }
  if (!project) {
    return normalized[0];
  }
  const projectLower = project.toLowerCase();
  for (const candidate of normalized) {
    if (candidate.toLowerCase() !== projectLower) {
      return candidate;
    }
  }
  return normalized[0];
}
function extractOrganizationFromUrl(raw) {
  if (!raw) {
    return void 0;
  }
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    if (host.endsWith('.visualstudio.com')) {
      return host.replace('.visualstudio.com', '');
    }
    if (host === 'dev.azure.com') {
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        return decodeURIComponent(segments[0]);
      }
    }
  } catch {}
  return void 0;
}
export {
  createAzureClient,
  normalizeConnectionConfig,
  testClientConnectivity,
  validateClientConfig,
};
