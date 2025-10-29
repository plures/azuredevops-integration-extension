/**
 * Connection State Machine
 *
 * Manages individual connection lifecycle, replacing the complex
 * ensureActiveConnection() function with structured state management.
 *
 * =============================================================================
 * AZURE DEVOPS CLIENT ID DOCUMENTATION (CRITICAL - READ BEFORE MODIFYING)
 * =============================================================================
 *
 * This extension ALWAYS uses Microsoft's public Azure DevOps client + resource:
 *
 *   CLIENT ID: 872cd9fa-d31f-45e0-9eab-6e460a02d1f1 (Visual Studio Code public client)
 *   RESOURCE:  499b84ac-1321-427f-aa17-267ca6975798 (Azure DevOps service principal)
 *   SCOPE:     499b84ac-1321-427f-aa17-267ca6975798/.default
 *
 * WHY THIS CLIENT ID?
 * 1. This is Microsoft's official Azure DevOps service principal client ID
 * 2. It's specifically designed for Azure DevOps API access via device code flow
 * 3. It works across all Azure DevOps domains (dev.azure.com, *.visualstudio.com)
 * 4. It supports both single-tenant and multi-tenant ("organizations") authentication
 *
 * WHY HARDCODED (NOT CONFIGURABLE)?
 * 1. This is an Azure DevOps-specific extension - no need for other service clients
 * 2. Prevents user configuration errors that caused authentication failures
 * 3. Ensures consistent authentication behavior across all connections
 * 4. Follows the principle: "Don't make configurable what should be constant"
 *
 * WHAT WAS THE PROBLEM WITH CONFIGURABLE CLIENT ID?
 * - Users removed the Microsoft-provided client ID and broke device code flow
 * - Wrong client IDs caused "AADSTS700016: Application not found" errors
 * - Different client IDs per connection created inconsistent authentication behavior
 * - Support burden increased due to user configuration mistakes
 *
 * DO NOT CHANGE THIS CLIENT ID UNLESS:
 * 1. Microsoft deprecates the Azure DevOps service principal (highly unlikely)
 * 2. Microsoft provides a newer/better official client ID for Azure DevOps
 * 3. You have explicit confirmation from Microsoft that this client ID is incorrect
 *
 * IF YOU NEED TO CHANGE IT:
 * 1. Update all instances in this file (search for the CLI/RESOURCE constants)
 * 2. Update the default in package.json and activation.ts
 * 3. Create a startup patch in activation.ts to handle existing installations
 * 4. Test thoroughly with both dev.azure.com and *.visualstudio.com organizations
 * 5. Update this documentation with the reason for the change
 *
 * =============================================================================
 */

import { createMachine, assign, fromPromise } from 'xstate';
import { createComponentLogger, FSMComponent, fsmLogger } from '../logging/FSMLogger.js';
import { isTokenValid } from '../functions/authFunctions.js';
import type { ConnectionContext, ConnectionEvent, ProjectConnection } from './connectionTypes.js';
import {
  getExtensionContextRef,
  getSecretPAT as getSecretPATFromBridge,
  forwardProviderMessage as forwardProviderMessageBridge,
  sendApplicationStoreEvent,
} from '../services/extensionHostBridge.js';

// Create logger for connection machine
const logger = createComponentLogger(FSMComponent.CONNECTION, 'connectionMachine');

// Core Azure DevOps identifiers used across authentication flows
export const AZURE_DEVOPS_PUBLIC_CLIENT_ID = '872cd9fa-d31f-45e0-9eab-6e460a02d1f1';
export const AZURE_DEVOPS_SCOPE = '499b84ac-1321-427f-aa17-267ca6975798/.default';

const normalizeExpiryToMs = (expiresAt?: Date | number | string): number | undefined => {
  if (!expiresAt) {
    return undefined;
  }

  if (expiresAt instanceof Date) {
    return expiresAt.getTime();
  }

  if (typeof expiresAt === 'number') {
    return Number.isFinite(expiresAt) ? expiresAt : undefined;
  }

  if (typeof expiresAt === 'string') {
    const parsed = Date.parse(expiresAt);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
};

// ============================================================================
// TENANT DISCOVERY UTILITIES
// ============================================================================

/**
 * Discover tenant ID from Azure DevOps organization URL using multiple fallback methods
 *
 * Based on research of Azure DevOps authentication patterns, personal Microsoft accounts
 * often use private organizations that don't expose tenant information via public APIs.
 * This function implements multiple discovery strategies with proper fallbacks.
 */
async function discoverTenantFromOrganization(organizationUrl: string): Promise<string | null> {
  const context = { component: FSMComponent.AUTH, connectionId: 'tenant-discovery' };

  try {
    logger.debug('Starting enhanced tenant discovery', context, { organizationUrl });

    // Parse organization name from URL
    let orgName: string;
    if (organizationUrl.includes('dev.azure.com')) {
      // Format: https://dev.azure.com/orgname
      const match = organizationUrl.match(/https?:\/\/dev\.azure\.com\/([^/]+)/);
      orgName = match?.[1] || '';
      logger.debug('Parsed organization from dev.azure.com format', context, {
        orgName,
        pattern: 'dev.azure.com',
      });
    } else if (organizationUrl.includes('visualstudio.com')) {
      // Format: https://orgname.visualstudio.com
      const match = organizationUrl.match(/https?:\/\/([^.]+)\.visualstudio\.com/);
      orgName = match?.[1] || '';
      logger.debug('Parsed organization from visualstudio.com format', context, {
        orgName,
        pattern: 'visualstudio.com',
      });
    } else {
      logger.warn('Unsupported organization URL format', context, { organizationUrl });
      return null;
    }

    if (!orgName) {
      logger.warn('Could not extract organization name from URL', context, { organizationUrl });
      return null;
    }

    logger.info('Extracted organization name for tenant discovery', context, {
      orgName,
      organizationUrl,
    });

    // Strategy 1: Try the VSSPS tenant info endpoint (works for public organizations)
    const vsspsResult = await tryVSSpsTenantDiscovery(orgName, context);
    if (vsspsResult) {
      logger.info('✅ Tenant discovered via VSSPS API', context, {
        tenantId: vsspsResult,
        orgName,
      });
      return vsspsResult;
    }

    // Strategy 2: Try Azure DevOps REST API organization info (may require auth but provides more info)
    const restApiResult = await tryRestApiTenantDiscovery(organizationUrl, orgName, context);
    if (restApiResult) {
      logger.info('✅ Tenant discovered via REST API', context, {
        tenantId: restApiResult,
        orgName,
      });
      return restApiResult;
    }

    // Strategy 3: Try Azure Resource Manager API for Azure DevOps organizations
    const armResult = await tryArmTenantDiscovery(orgName, context);
    if (armResult) {
      logger.info('✅ Tenant discovered via ARM API', context, { tenantId: armResult, orgName });
      return armResult;
    }

    // All discovery methods failed
    logger.warn('❌ All tenant discovery methods failed', context, {
      orgName,
      organizationUrl,
      message:
        'Organization might be private, use personal account, or require different tenant setup',
    });

    return null;
  } catch (error) {
    logger.error('Tenant discovery failed with exception', context, {
      error: error instanceof Error ? error.message : String(error),
      organizationUrl,
    });
    return null;
  }
}

/**
 * Strategy 1: Try VSSPS tenant discovery (current method)
 * Works for public organizations, may fail for private/personal orgs
 */
async function tryVSSpsTenantDiscovery(orgName: string, context: any): Promise<string | null> {
  try {
    const discoveryUrl = `https://app.vssps.visualstudio.com/_apis/organization/${orgName}/tenantinfo`;
    logger.debug('Trying VSSPS tenant discovery', context, { discoveryUrl, orgName });

    const response = await fetch(discoveryUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AzureDevOpsIntegration-VSCode',
      },
    });

    if (!response.ok) {
      logger.debug('VSSPS tenant discovery failed', context, {
        status: response.status,
        statusText: response.statusText,
        reason: response.status === 404 ? 'Organization not found or private' : 'API error',
      });
      return null;
    }

    const data = await response.json();
    const tenantId = data?.tenantId;

    if (tenantId && typeof tenantId === 'string' && tenantId.trim() !== '') {
      return tenantId.trim();
    }

    logger.debug('VSSPS API returned no valid tenant ID', context, { responseData: data });
    return null;
  } catch (error) {
    logger.debug('VSSPS tenant discovery error', context, {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Strategy 2: Try Azure DevOps REST API
 * May work for organizations where VSSPS fails
 */
async function tryRestApiTenantDiscovery(
  organizationUrl: string,
  orgName: string,
  context: any
): Promise<string | null> {
  try {
    // Try accessing organization info via REST API
    const apiUrl = `${organizationUrl}/_apis/connectionData`;
    logger.debug('Trying REST API tenant discovery', context, { apiUrl, orgName });

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AzureDevOpsIntegration-VSCode',
      },
    });

    if (!response.ok) {
      logger.debug('REST API tenant discovery failed', context, {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const data = await response.json();

    // Look for tenant information in connection data
    const authenticatedUser = data?.authenticatedUser;
    const tenantId = authenticatedUser?.descriptor?.split(';')[0]; // Extract tenant from descriptor

    if (tenantId && typeof tenantId === 'string' && tenantId.includes('-')) {
      logger.debug('Found potential tenant ID in connection data', context, { tenantId });
      return tenantId;
    }

    logger.debug('REST API returned no valid tenant ID', context, { responseData: data });
    return null;
  } catch (error) {
    logger.debug('REST API tenant discovery error', context, {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Strategy 3: Try Azure Resource Manager for tenant discovery
 * Last resort - may work for enterprise Azure DevOps setups
 */
async function tryArmTenantDiscovery(orgName: string, context: any): Promise<string | null> {
  try {
    // Try to discover tenant via Azure Resource Manager
    // This is a less common pattern but may work for some enterprise setups
    const armUrl = `https://management.azure.com/tenants?api-version=2020-01-01`;
    logger.debug('Trying ARM tenant discovery', context, { armUrl, orgName });

    const response = await fetch(armUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AzureDevOpsIntegration-VSCode',
      },
    });

    // ARM API typically requires authentication, so this will likely fail
    // but we try anyway for completeness
    if (!response.ok) {
      logger.debug('ARM tenant discovery failed (expected)', context, {
        status: response.status,
        reason: 'ARM API requires authentication',
      });
      return null;
    }

    // If by some chance this works, we won't be able to match org name to tenant
    // This is more of a future-proofing placeholder
    logger.debug('ARM API accessible but cannot match org to tenant', context);
    return null;
  } catch (error) {
    logger.debug('ARM tenant discovery error (expected)', context, {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ============================================================================
// CONNECTION STATE MACHINE IMPLEMENTATION
// ============================================================================

export const connectionMachine = createMachine(
  {
    /** @xstate-layout N4IgpgJg5mDOIC5QGMD2A7dZkBcCWGAdBHrGptjpAMQDCA8gHKMCitAKgNoAMAuoqAAOqWHnwYBIAB6IAjACYAbPMIB2AJyaAHAGZuOnfIAsmgDQgAnokWyArIXW2tt1d3VHus10YC+P8+RYuAToxKSBlDQASiwAyixcfJLCouLokjIICsZqxupaqoo6Rfq25lYIJlpq3NzyOrJe8ty28rJ+ARhBaYQAhgCuOAAWYOj4yL346FDEYFQATgC2eOgrUAD6i3NDqBDUPPxIICliIRlyih4Omtpass6qsuWIWtxGNQ+Oiuqu6vIdIAiwSIA2Go3GkzWswWy1W002212+1khyEIlOEiOmVkl241xuWjuDyelkQqls6kItm4n10tlk6haAKBPVBIzGeAmUxmgkm6zZ1AgGDAhBWADdUABrEUskJ9QbsiHcwi8nD8hUIcWoLkhA4HZLotLnBDGLTvQryWyKWw6amEsqkhCaVRU6mWozFTTNdTMrqUOVs8GcyHTFV8gVgebzVDzFUAG0mADMY4tCLKQQqgzrQ6r1cNNegJTqMHqkkcTkasYhTeblFabXbnM8nW9CLJakpFF3jDZfRRgaFAxzszNwfNenmhmmRshJWt1mApKRuescFLRoLhaLC+u036B-KwcOQ6OxuPJ9PsHP4Yvl-O19L0AWi5CS3x9eXDWcqyajGa1HW1q2jSTaOrIhiKFSuiKNwhTqLIJjyKofbdAGmbHsqY4Tmyl6zvOt6wCuD4bkKWDbhK0p7v2rLoUqUJYReyAzteGwEUR65PlqxboHqKIGqk36gNicGEPoqh-uolzyFo9RGM22SyIQdY9qoxQ4sh-iAvuNFHnRoYMThTFXvhS6EfeHHUJG0axoICY4MmSxUahGa6cGmFnthCq4SxC6mexj7Ptqr48e+ZZogJmJCXIIliRJUkyToclgV47x-K0Tj5DYbgof6LmKm59EeReKwLL0wRimAk6bmRWqUemg60QV+lFThJWRmV+AVZOgXcaWqLHF+kXSNWf61paQGNg6FSNFolJ-sUtSeDYKU5QeQ56aeODnq1YzteVlURlGMbxkmKZOblDWuSOhAGV5bXjvt3VccFfX8Ri6Q-jWAHjQ2IFTXIbiQfoan1DS1riatPTIPMYAnusyBxng4LVSKtUytpcrQ7DK4I0jYw9S9oX9RWgnDQgyjNqa1SEraiiEiYRR2JDmMw3DuPI1Zx22adjn1WmrM44j4IE2kr2fhFH1ReTLRKeSi2STojKqPJTgqDaC0uEhloIczRBY3DgjRmKeAQJGKPkbufP6yuhuoMbpvzCLupE29lZS7aOiuot2Q0vcWjyVoXYOHS6iJYljzgbroTW-Otv22bnM2XZDmplbAux0bJuRk7b68B+4XvcaqjyJTzTvB6tp3AhbSPLYUfnbgNAACIAJKxAwzBsIkxODZLZNh17tQ+0S-uOtSnvtnUC3cNaTiKPXLI0B3rAcC3TDrAAYgAgi3AAyLBN-nA0S8aHuD548jNCP8nFJ7BgLToGiqLoOgL9pNDsPQADSLCMOsLAAA0AAKLcYiHzCsfQuP577n2Hn7ZsRgbSEA8FPWCBQPT5DftRaILAN4xFiAACXWFvAAquwAhR8SZDUyIYT2thqRD0vr7QkzZbQukcJ4cCDIWgyX+JpPmbJ1iJl6HgOMOD2BRAAJqUN7saBCNJCC6HEqoDQrQ-zgWbFaSClpnCvF0aHek9dBHCNEUvJgK9u6u1JtiMSyCTD5CqB4GCJcwJ-iBiHVSjNQ7z34RjPKQiRFiL2K3du5iu4yJPj+cC+RFGPyMCoxwpoNGOhMPYGCzg6YGBno0BeQsxgBNMXsGIEjpEQKoX3TIME0ly1qArJW8lxKQSKLaRkMl6StD4Z0aimM8lqhMUEugYSOARKgVLCk1SGGA0VrBeSo1RJOApB6GwgdpK5Lxn0wJzc27L3CWU2RP4Fmy0mXUmZrjEqEErhlau4kjCdK0t0ogccs7zAKQM4pUiRluzJioxSsFqTwWfvUcS6gA4qAMDcJwbDEpvHrk8h2ryzGd2GXsyJUtn6-LlgChKwLKaGFEigzwLQ-ytDNLCzO8L+lbNCUiyx4tRnfLuKJTFXhsUmEpoy8Si1lCqR+DiV+viHnRz8egBcR15jUHeaUnuqKyZtLbHWThjhyTiWbM-T2PCXBdncF2ZwWDnIisToMmlnzrEvEtPKy0iqXAuCStNHQ-5rS6MVvUOsvgBX6obmkUV1lqAhJ2ci6V9LMh3HsDiS1jQlU2ubMoT2iCp6BxxDNeuxERUw0TDDWAQxzZo09XKFN6w00ZqGDnEKecUVBsQA0Ohky4EsMdEod4DCFC2HmtkS0yaOIFrAOmuAWbE4nXsmdPm+bC29pLWLAuXzMhyypN7RQniKQuIqAYao1qFAMiMJcRobrNLoF2HASQ9UrHUMQAAWkUM2Rw+LaiqUaAock7h64kDIO-CAx6KkAwUHY7QjiZ51GjbUNsbpFY2iypoIxjURzvrkc62JyjVFJJ0NG4uhAr5umaUYHEbqukevWk1GYpsYQrHnFsYYuxoNRKMB6OD8SEPqKQ46QonsVHpXGroGSEGronjDGqNkFGpYITpjRhJai7gMYqPkRSrSXChzeJfZ+nH8rXVusMfjZMEJXCUbRxJ9H5Iz0pGhzwDRVJtB8Thi6h4lPcZU1OIyeEbx+XMo+NT2I-zUziSJxD8kvCKTjZaZofKW13IEZB6zLU7q7Qep1A6CoXPVnXW2S1ShHAegQqPaadhIJ2hcM4bhXwF7p3hOzMYcWTSzTxECikKjA6bttXIQwKhHX0LNF4edhgCvYwznbZ5pXDB4jSp4CkdMChmkprR5B0l6RuHHnUPVkQ310qnYgW5AdijypkzJB4xh2juos8YzZC3J2mrK64VDj8qvP0uJcZss0XRAQKKpWul9sP3I9cVjZhTetIPod7Jh18wLfEguJYoLh9A11aGS7rFKDulfpO8Gk5JH601UjJXFilnA3tNG4bVL2rbCu9TGWHlwHDKHibc6ugdlZgWhaJAwV27BOFgsF4VhAR3dqLbDhkokCg2lUlaFHS7K2PzbPYv4DisNaD8H4IAA */
    id: 'connection',
    types: {} as {
      context: ConnectionContext;
      events: ConnectionEvent;
    },
    initial: 'disconnected',
    context: {
      connectionId: '',
      config: {} as ProjectConnection,
      authMethod: 'pat',
      isConnected: false,
      retryCount: 0,
      refreshFailureCount: 0,
      reauthInProgress: false,
      forceInteractive: false,
      accessTokenExpiresAt: undefined,
    },
    states: {
      disconnected: {
        entry: ['clearConnectionState'],
        on: {
          CONNECT: {
            target: 'authenticating',
            actions: assign({
              config: ({ event }) => event.config,
              connectionId: ({ event }) => event.config.id,
              authMethod: ({ event }) => event.config.authMethod || 'pat',
              retryCount: 0,
              lastError: undefined,
              forceInteractive: ({ event }) => !!event.forceInteractive,
              accessTokenExpiresAt: undefined,
            }),
          },
          RESET: {
            target: 'disconnected',
            actions: 'resetConnection',
          },
        },
      },

      authenticating: {
        initial: 'determining_method',
        states: {
          determining_method: {
            always: [
              {
                target: 'entra_auth',
                guard: 'isEntraAuth',
              },
              {
                target: 'pat_auth',
                guard: 'isPATAuth',
              },
            ],
          },

          pat_auth: {
            invoke: {
              src: 'authenticateWithPAT',
              input: ({ context }) => context,
              onDone: {
                target: '#connection.creating_client',
                actions: assign({
                  credential: ({ event }) => event.output.credential,
                  pat: ({ event }) => event.output.credential,
                }),
              },
              onError: {
                target: '#connection.auth_failed',
                actions: assign({
                  lastError: ({ event }) =>
                    (event.error as Error)?.message || 'PAT authentication failed',
                  retryCount: ({ context }) => context.retryCount + 1,
                }),
              },
            },
          },

          entra_auth: {
            initial: 'checking_existing_token',
            states: {
              checking_existing_token: {
                always: [
                  {
                    target: 'interactive_auth',
                    guard: 'shouldForceInteractiveAuth',
                  },
                ],
                invoke: {
                  src: 'checkExistingEntraToken',
                  input: ({ context }) => context,
                  onDone: [
                    {
                      target: '#connection.creating_client',
                      guard: 'hasValidToken',
                      actions: assign({
                        credential: ({ event }) => event.output.token,
                        accessToken: ({ event }) => event.output.token,
                        accessTokenExpiresAt: ({ event }) =>
                          normalizeExpiryToMs(event.output.expiresAt),
                        // LEGACY AUTH REMOVED - authService replaced by FSM authentication
                      }),
                    },
                    {
                      target: 'interactive_auth',
                    },
                  ],
                  onError: {
                    target: 'interactive_auth',
                  },
                },
              },

              interactive_auth: {
                invoke: {
                  src: 'performInteractiveEntraAuth',
                  input: ({ context }) => context,
                  onDone: {
                    target: '#connection.creating_client',
                    actions: assign({
                      credential: ({ event }) => event.output.token,
                      accessToken: ({ event }) => event.output.token,
                      accessTokenExpiresAt: ({ event }) =>
                        normalizeExpiryToMs(event.output.expiresAt),
                      // LEGACY AUTH REMOVED - authService replaced by FSM authentication
                      reauthInProgress: false,
                      forceInteractive: () => false,
                    }),
                  },
                  onError: {
                    target: '#connection.auth_failed',
                    actions: assign({
                      lastError: ({ event }) =>
                        (event.error as Error)?.message || 'Entra authentication failed',
                      retryCount: ({ context }) => context.retryCount + 1,
                      reauthInProgress: false,
                      forceInteractive: () => false,
                    }),
                  },
                },
                entry: [
                  assign({
                    reauthInProgress: true,
                  }),
                ],
              },
            },
          },
        },
      },

      creating_client: {
        invoke: {
          src: 'createAzureClient',
          input: ({ context }) => context,
          onDone: {
            target: 'creating_provider',
            actions: assign({
              client: ({ event }) =>
                event.output && 'client' in event.output ? event.output.client : event.output,
              credential: ({ event, context }) =>
                event.output && 'config' in event.output && event.output.config?.credential
                  ? event.output.config.credential
                  : context.credential,
            }),
          },
          onError: {
            target: 'client_failed',
            actions: assign({
              lastError: ({ event }) => (event.error as Error)?.message || 'Client creation failed',
            }),
          },
        },
      },

      creating_provider: {
        invoke: {
          src: 'createWorkItemsProvider',
          input: ({ context }) => context,
          onDone: {
            target: 'connected',
            actions: assign({
              provider: ({ event }) => event.output,
              isConnected: true,
              retryCount: 0,
              lastError: undefined,
            }),
          },
          onError: {
            target: 'provider_failed',
            actions: assign({
              lastError: ({ event }) =>
                (event.error as Error)?.message || 'Provider creation failed',
            }),
          },
        },
      },

      connected: {
        entry: ['notifyConnectionSuccess'],
        on: {
          DISCONNECT: 'disconnected',
          CONNECTION_FAILED: 'connection_error',
          TOKEN_EXPIRED: 'token_refresh',
          REFRESH_AUTH: 'token_refresh',
        },
      },

      auth_failed: {
        entry: ['notifyAuthFailure'],
        on: {
          RETRY: {
            target: 'authenticating',
            guard: 'canRetry',
          },
          CONNECT: {
            target: 'authenticating',
            actions: assign({
              retryCount: 0,
            }),
          },
          DISCONNECT: 'disconnected',
        },
      },

      client_failed: {
        entry: ['notifyClientFailure'],
        on: {
          RETRY: {
            target: 'creating_client',
            guard: 'canRetry',
          },
          CONNECT: 'authenticating',
          DISCONNECT: 'disconnected',
        },
      },

      provider_failed: {
        entry: ['notifyProviderFailure'],
        on: {
          RETRY: {
            target: 'creating_provider',
            guard: 'canRetry',
          },
          CONNECT: 'authenticating',
          DISCONNECT: 'disconnected',
        },
      },

      connection_error: {
        entry: ['notifyConnectionError'],
        on: {
          RETRY: {
            target: 'authenticating',
            guard: 'canRetry',
          },
          CONNECT: 'authenticating',
          DISCONNECT: 'disconnected',
        },
      },

      token_refresh: {
        invoke: {
          src: 'refreshAuthToken',
          input: ({ context }) => context,
          onDone: {
            target: 'connected',
            actions: assign({
              credential: ({ event }) => event.output.token,
              accessToken: ({ event }) => event.output.token,
              refreshFailureCount: 0,
              lastRefreshFailure: undefined,
              refreshBackoffUntil: undefined,
            }),
          },
          onError: {
            target: 'auth_failed',
            actions: assign({
              lastError: ({ event }) => (event.error as Error)?.message || 'Token refresh failed',
              refreshFailureCount: ({ context }) => context.refreshFailureCount + 1,
              lastRefreshFailure: () => new Date(),
              refreshBackoffUntil: ({ context }) => {
                const backoffMinutes = Math.min(60, Math.pow(2, context.refreshFailureCount) * 5);
                return new Date(Date.now() + backoffMinutes * 60 * 1000);
              },
            }),
          },
        },
      },
    },
  },
  {
    // Guards
    guards: {
      isEntraAuth: ({ context }) => context.authMethod === 'entra',
      isPATAuth: ({ context }) => context.authMethod === 'pat',
      canRetry: ({ context }) => context.retryCount < 3,
      hasValidToken: ({ event }) => {
        const output = (event as any).output;
        const token = output?.token;
        const expiresAt = output?.expiresAt;

        if (!token) {
          logger.debug('Token validation: no token found');
          return false;
        }

        const valid = isTokenValid({ expiresAt });

        if (!valid) {
          logger.info('Token validation: cached token expired or near expiry');
          return false;
        }

        logger.debug(`Token validation: valid token found, length=${token.length}`);
        return true;
      },
      shouldForceInteractiveAuth: ({ context }) => context.forceInteractive === true,
    },

    // Actions
    actions: {
      clearConnectionState: assign({
        client: undefined,
        provider: undefined,
        credential: undefined,
        pat: undefined,
        accessToken: undefined,
        accessTokenExpiresAt: undefined,
        // LEGACY AUTH REMOVED - authService replaced by FSM authentication
        isConnected: false,
        lastError: undefined,
        forceInteractive: false,
      }),

      resetConnection: assign({
        retryCount: 0,
        refreshFailureCount: 0,
        lastRefreshFailure: undefined,
        refreshBackoffUntil: undefined,
        reauthInProgress: false,
        lastError: undefined,
        forceInteractive: false,
        accessTokenExpiresAt: undefined,
      }),

      notifyConnectionSuccess: ({ context }) => {
        logger.info(`${context.connectionId} connected successfully`);

        // Trigger initial work items refresh after successful connection
        if (context.provider) {
          logger.info(`Triggering initial work items refresh for ${context.connectionId}`);
          try {
            // Get the default query (this should match activation.ts logic)
            const defaultQuery = 'My Activity'; // Default query that matches activation.ts
            context.provider.refresh(defaultQuery);
          } catch (error) {
            logger.error(
              `Failed to trigger initial refresh: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        } else {
          logger.warn(`No provider available for initial refresh on ${context.connectionId}`);
        }
      },

      notifyAuthFailure: ({ context }) => {
        logger.error(`${context.connectionId} authentication failed: ${context.lastError}`);

        // Check for network errors and provide helpful guidance
        if (context.lastError?.includes('network_error')) {
          // Import VS Code to show helpful error message
          import('vscode').then((vscode) => {
            vscode.window
              .showErrorMessage(
                `Authentication failed due to network error. This might be caused by corporate firewall/proxy. Try: 1) Check internet connection, 2) Contact IT about Microsoft auth endpoints, 3) Try from a different network.`,
                'Retry Authentication',
                'View Logs'
              )
              .then((selection) => {
                if (selection === 'View Logs') {
                  vscode.commands.executeCommand('azureDevOpsInt.showFSMLogs');
                }
              });
          });
        }
      },

      notifyClientFailure: ({ context }) => {
        logger.error(`${context.connectionId} client creation failed: ${context.lastError}`);
      },

      notifyProviderFailure: ({ context }) => {
        logger.error(`${context.connectionId} provider creation failed: ${context.lastError}`);
      },

      notifyConnectionError: ({ context }) => {
        logger.error(`${context.connectionId} connection error: ${context.lastError}`);
      },
    },

    // Actors (service implementations)
    actors: {
      authenticateWithPAT: fromPromise(async ({ input }: { input: ConnectionContext }) => {
        // Implementation: Get PAT from VS Code secrets
        logger.debug(`Authenticating with PAT for ${input.connectionId}`);

        try {
          const extensionContext = getExtensionContextRef();

          if (!extensionContext) {
            throw new Error('Extension context not available');
          }

          const credential = await getSecretPATFromBridge(extensionContext, input.connectionId);
          if (!credential) {
            throw new Error('PAT not found in secrets');
          }

          return { credential };
        } catch (error) {
          logger.error(
            `PAT authentication failed: ${error instanceof Error ? error.message : String(error)}`
          );
          throw error;
        }
      }),

      checkExistingEntraToken: fromPromise(async ({ input }: { input: ConnectionContext }) => {
        // Implementation: Check for existing valid Entra token using shared connection states
        logger.debug(`Checking existing Entra token for ${input.connectionId}`);

        try {
          // Import the Entra auth provider
          const { EntraAuthProvider } = await import('../../auth/entraAuthProvider.js');

          // Get extension context for secret storage
          const context = (globalThis as any).extensionContext;
          if (!context) {
            logger.warn('Extension context not available for Entra token check');
            return { token: null };
          }

          // HARDCODED AZURE DEVOPS CLIENT ID - See documentation at top of file for why this is not configurable
          // This is Microsoft's official Azure DevOps service principal - DO NOT CHANGE without reading docs above
          const clientId = AZURE_DEVOPS_PUBLIC_CLIENT_ID;
          let tenantId = input.config?.tenantId;

          // ALWAYS attempt tenant discovery for token check (backward compatible)
          // This ensures the correct tenant is discovered from organization URL, overriding stored "organizations"
          const authContext = { component: FSMComponent.AUTH, connectionId: input.connectionId };

          // CRITICAL THINKING: Use existing configuration instead of reconstructing URLs
          // Priority: apiBaseUrl > baseUrl > construct from organization
          let organizationName: string | undefined;
          let organizationUrl: string | undefined;

          if (input.config?.apiBaseUrl) {
            // Extract organization from existing apiBaseUrl
            organizationUrl = input.config.apiBaseUrl;
            // Parse organization from API URL patterns
            const apiUrlMatch = organizationUrl.match(
              /https:\/\/(?:([^.]+)\.visualstudio\.com|dev\.azure\.com\/([^/]+))/
            );
            organizationName = apiUrlMatch?.[1] || apiUrlMatch?.[2];
            logger.debug(
              'Using existing apiBaseUrl for token check tenant discovery',
              authContext,
              {
                apiBaseUrl: input.config.apiBaseUrl,
                extractedOrg: organizationName,
              }
            );
          } else if (input.config?.baseUrl) {
            // Use existing baseUrl
            organizationUrl = input.config.baseUrl;
            const baseUrlMatch = organizationUrl.match(
              /https:\/\/(?:([^.]+)\.visualstudio\.com|dev\.azure\.com\/([^/]+))/
            );
            organizationName = baseUrlMatch?.[1] || baseUrlMatch?.[2];
            logger.debug('Using existing baseUrl for token check tenant discovery', authContext, {
              baseUrl: input.config.baseUrl,
              extractedOrg: organizationName,
            });
          } else if (input.config?.organization) {
            // Only as last resort, use organization name to construct URL
            organizationName = input.config.organization;
            organizationUrl = `https://dev.azure.com/${organizationName}`;
            logger.debug(
              'Constructing URL from organization name for token check (last resort)',
              authContext,
              {
                organization: organizationName,
                constructedUrl: organizationUrl,
              }
            );
          }

          if (organizationName && organizationUrl) {
            logger.info('Attempting tenant discovery for token check', authContext, {
              organizationName,
              organizationUrl,
              source: input.config?.apiBaseUrl
                ? 'apiBaseUrl'
                : input.config?.baseUrl
                  ? 'baseUrl'
                  : 'organization',
              originalTenantId: tenantId,
            });

            const discoveredTenant = await discoverTenantFromOrganization(organizationUrl);
            if (discoveredTenant) {
              tenantId = discoveredTenant;
              logger.info('✅ Tenant discovered for existing token check', authContext, {
                discoveredTenant: tenantId,
                organizationName,
                organizationUrl,
                originalTenantId: input.config?.tenantId,
              });
            } else {
              logger.warn('❌ Tenant discovery failed for existing token check', authContext, {
                organizationName,
                organizationUrl,
                reason: 'discoverTenantFromOrganization returned null',
                fallbackToOriginal: tenantId,
              });
            }
          } else {
            logger.warn(
              '❌ Cannot discover tenant for token check - no organization information available',
              authContext,
              {
                hasApiBaseUrl: !!input.config?.apiBaseUrl,
                hasBaseUrl: !!input.config?.baseUrl,
                hasOrganization: !!input.config?.organization,
                config: input.config,
                usingOriginalTenant: tenantId,
              }
            );
          }

          // Fallback to 'organizations' if no tenant discovered
          const finalTenantId = tenantId || 'organizations';

          if (finalTenantId === 'organizations') {
            logger.warn('⚠️ Using fallback tenant "organizations" for token check', authContext, {
              originalTenantId: tenantId,
              configTenantId: input.config?.tenantId,
              discoveryAttempted: !input.config?.tenantId,
            });
          } else {
            logger.info('✅ Using discovered/configured tenant for token check', authContext, {
              tenantId: finalTenantId,
              source: input.config?.tenantId ? 'config' : 'discovery',
            });
          }

          logger.debug('Using tenant for existing token check', authContext, {
            tenantId: finalTenantId,
            clientId,
          });

          // Create Entra auth provider instance
          const authProvider = new EntraAuthProvider({
            config: {
              clientId: clientId,
              tenantId: finalTenantId,
              scopes: [AZURE_DEVOPS_SCOPE], // Azure DevOps
            },
            secretStorage: context.secrets,
            connectionId: input.connectionId,
          });

          // Check if already authenticated and token is valid
          const isAuthenticated = await authProvider.isAuthenticated();
          if (isAuthenticated) {
            const tokenInfo = await authProvider.getTokenInfo();
            if (tokenInfo?.accessToken) {
              const expiresAt = tokenInfo.expiresAt;
              if (isTokenValid({ expiresAt })) {
                logger.info('Valid cached token found', authContext, { hasToken: true });
                return {
                  token: tokenInfo.accessToken,
                  expiresAt: expiresAt?.toISOString?.() ?? expiresAt,
                };
              }

              logger.info('Cached token found but expired or near expiry', authContext, {
                expiresAt: expiresAt?.toISOString?.() ?? null,
              });
            } else {
              logger.debug('Authenticated but token info unavailable', authContext);
            }
          }

          logger.debug('No valid cached token found', authContext);
          return { token: null };
        } catch (error) {
          const authContext = { component: FSMComponent.AUTH, connectionId: input.connectionId };
          logger.error('Failed to check existing token', authContext, {
            error: error instanceof Error ? error.message : String(error),
            errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          });
          return { token: null };
        }
      }),

      performInteractiveEntraAuth: fromPromise(async ({ input }: { input: ConnectionContext }) => {
        // Implementation: Perform interactive Entra authentication using device code flow
        logger.info(`Starting interactive Entra authentication for ${input.connectionId}`);

        try {
          // Import the Entra auth provider
          const { EntraAuthProvider } = await import('../../auth/entraAuthProvider.js');

          // Get extension context for secret storage
          const context = (globalThis as any).extensionContext;
          if (!context) {
            throw new Error('Extension context not available for Entra authentication');
          }

          // HARDCODED AZURE DEVOPS CLIENT ID - See documentation at top of file for why this is not configurable
          // This is Microsoft's official Azure DevOps service principal - DO NOT CHANGE without reading docs above
          const clientId = AZURE_DEVOPS_PUBLIC_CLIENT_ID;
          let tenantId = input.config?.tenantId;
          let discoveredTenant: string | null = null;
          const isForceInteractive = input.forceInteractive === true;

          // ALWAYS attempt tenant discovery for device code flow (backward compatible)
          // This ensures the correct tenant is discovered from organization URL, overriding stored "organizations"
          const authContext = { component: FSMComponent.AUTH, connectionId: input.connectionId };

          // CRITICAL THINKING: Use existing configuration instead of reconstructing URLs
          // Priority: apiBaseUrl > baseUrl > construct from organization
          let organizationName: string | undefined;
          let organizationUrl: string | undefined;

          if (input.config?.apiBaseUrl) {
            // Extract organization from existing apiBaseUrl
            organizationUrl = input.config.apiBaseUrl;
            // Parse organization from API URL patterns
            const apiUrlMatch = organizationUrl.match(
              /https:\/\/(?:([^.]+)\.visualstudio\.com|dev\.azure\.com\/([^/]+))/
            );
            organizationName = apiUrlMatch?.[1] || apiUrlMatch?.[2];
            logger.debug('Using existing apiBaseUrl for tenant discovery', authContext, {
              apiBaseUrl: input.config.apiBaseUrl,
              extractedOrg: organizationName,
            });
          } else if (input.config?.baseUrl) {
            // Use existing baseUrl
            organizationUrl = input.config.baseUrl;
            const baseUrlMatch = organizationUrl.match(
              /https:\/\/(?:([^.]+)\.visualstudio\.com|dev\.azure\.com\/([^/]+))/
            );
            organizationName = baseUrlMatch?.[1] || baseUrlMatch?.[2];
            logger.debug('Using existing baseUrl for tenant discovery', authContext, {
              baseUrl: input.config.baseUrl,
              extractedOrg: organizationName,
            });
          } else if (input.config?.organization) {
            // Only as last resort, use organization name to construct URL
            organizationName = input.config.organization;
            organizationUrl = `https://dev.azure.com/${organizationName}`;
            logger.debug('Constructing URL from organization name (last resort)', authContext, {
              organization: organizationName,
              constructedUrl: organizationUrl,
            });
          }

          if (organizationName && organizationUrl) {
            logger.info('Attempting tenant discovery for device code flow', authContext, {
              organizationName,
              organizationUrl,
              source: input.config?.apiBaseUrl
                ? 'apiBaseUrl'
                : input.config?.baseUrl
                  ? 'baseUrl'
                  : 'organization',
              originalTenantId: tenantId,
            });

            discoveredTenant = await discoverTenantFromOrganization(organizationUrl);
            if (discoveredTenant) {
              tenantId = discoveredTenant;
              logger.info('✅ Tenant discovered successfully for device code flow', authContext, {
                discoveredTenant: tenantId,
                organizationName,
                organizationUrl,
                originalTenantId: input.config?.tenantId,
              });
            } else {
              logger.warn('❌ Tenant discovery failed for device code flow', authContext, {
                organizationName,
                organizationUrl,
                reason: 'discoverTenantFromOrganization returned null',
                fallbackToOriginal: tenantId,
              });
            }
          } else {
            logger.warn(
              '❌ Cannot discover tenant - no organization information available',
              authContext,
              {
                hasApiBaseUrl: !!input.config?.apiBaseUrl,
                hasBaseUrl: !!input.config?.baseUrl,
                hasOrganization: !!input.config?.organization,
                config: input.config,
                usingOriginalTenant: tenantId,
              }
            );
          }

          // Enhanced tenant selection based on Microsoft documentation and Azure DevOps patterns
          //
          // TENANT SELECTION STRATEGY:
          // 1. If tenant was discovered successfully -> use discovered tenant (most reliable)
          // 2. If discovery failed and using 'organizations' -> switch to 'common' (supports personal accounts)
          // 3. If specific tenant was configured -> use it (user knows their setup)
          // 4. Default fallback -> 'common' (works for both personal and work accounts)
          //
          // Based on: https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code
          let finalTenantId = tenantId;

          if (discoveredTenant) {
            // Best case: we successfully discovered the actual tenant
            finalTenantId = discoveredTenant;
            logger.info('✅ Using discovered tenant (most reliable)', authContext, {
              discoveredTenant: finalTenantId,
              source: 'discovery',
              reliability: 'high',
            });
          } else if (!input.config?.tenantId || tenantId === 'organizations') {
            // Discovery failed and we're using default 'organizations' or no tenant configured
            // KEEP using 'organizations' - this is what worked in v1.9.3!
            // 'organizations' lets Azure AD handle tenant routing automatically
            finalTenantId = 'organizations';
            logger.info('✅ Using "organizations" tenant for MSAL automatic routing', authContext, {
              originalTenantId: tenantId,
              finalTenantId: finalTenantId,
              reason: 'v1.9.3 proven approach - let MSAL and Azure AD handle tenant routing',
              recommendation:
                'organizations endpoint supports work/school accounts with automatic tenant discovery',
            });
          } else {
            // User specifically configured a tenant - respect their configuration
            logger.info('✅ Using user-configured tenant', authContext, {
              tenantId: finalTenantId,
              source: 'user-config',
              note: 'Respecting user configuration despite discovery failure',
            });
          }

          // Log final tenant decision for troubleshooting
          logger.debug('Final tenant selection for device code authentication', authContext, {
            originalConfigTenant: input.config?.tenantId,
            discoveredTenant,
            finalTenantId,
            selectionReason: discoveredTenant
              ? 'discovery'
              : !input.config?.tenantId || tenantId === 'organizations'
                ? 'organizations-fallback'
                : 'user-config',
            authType: 'device-code',
            organizationUrl: organizationUrl || 'not-available',
          });

          logger.debug('Using tenant for interactive auth', authContext, {
            tenantId: finalTenantId,
            clientId,
          });

          // If we're switching tenants (from discovery failure), clear cached auth to prevent conflicts
          if (input.config?.tenantId && input.config.tenantId !== finalTenantId) {
            logger.info('🔄 Tenant changed - clearing cached authentication', authContext, {
              originalTenant: input.config.tenantId,
              newTenant: finalTenantId,
              reason: 'Prevent authentication conflicts from cached tokens',
            });

            try {
              // Clear any existing cached tokens for this connection to prevent tenant conflicts
              const cacheKey = `entra-cache-${input.connectionId}`;
              await context.secrets.delete(cacheKey);
              logger.debug('Cleared cached authentication for tenant change', authContext, {
                cacheKey,
              });
            } catch (error) {
              logger.warn('Failed to clear authentication cache on tenant change', authContext, {
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }

          // Create Entra auth provider instance
          const authProvider = new EntraAuthProvider({
            config: {
              clientId: clientId,
              tenantId: finalTenantId,
              scopes: [AZURE_DEVOPS_SCOPE], // Azure DevOps
            },
            secretStorage: context.secrets,
            connectionId: input.connectionId,
            // Device code callback to show the device code to user
            deviceCodeCallback: async (
              deviceCode: string,
              userCode: string,
              verificationUri: string,
              expiresIn: number
            ) => {
              const authContext = {
                component: FSMComponent.AUTH,
                connectionId: input.connectionId,
              };

              logger.info('Device Code Flow started', authContext, {
                userCode,
                verificationUri,
                expiresInSeconds: expiresIn,
                expiresInMinutes: Math.floor(expiresIn / 60),
              });

              // Emit application-level event so UI can render active device code session
              try {
                sendApplicationStoreEvent({
                  type: 'DEVICE_CODE_SESSION_STARTED',
                  connectionId: input.connectionId,
                  userCode,
                  verificationUri,
                  expiresInSeconds: expiresIn,
                  startedAt: Date.now(),
                });
              } catch (error) {
                logger.warn('Failed to emit DEVICE_CODE_SESSION_STARTED event', authContext, {
                  error: error instanceof Error ? error.message : String(error),
                });
              }

              // Import VS Code to show notification with device code
              const vscode = await import('vscode');
              const expiresInMinutes = Math.floor(expiresIn / 60);
              const connectionName = input.config?.organization || input.connectionId;

              // Show a quick toast notification and immediately open browser with code copied
              const action = await vscode.window.showInformationMessage(
                `Authentication code for ${connectionName}: ${userCode} (expires in ${expiresInMinutes}min)`,
                'Open Browser & Copy Code'
              );

              logger.info('Device code notification shown', authContext, {
                userCode,
                verificationUri,
                connectionName,
                userAction: action,
              });

              if (action === 'Open Browser & Copy Code') {
                try {
                  // Copy code to clipboard first
                  await vscode.env.clipboard.writeText(userCode);
                  logger.info('Device code copied to clipboard', authContext, { userCode });

                  // Open browser with detailed logging
                  const uri = vscode.Uri.parse(verificationUri);
                  logger.info('Opening external browser', authContext, {
                    verificationUri,
                    parsedUri: uri.toString(),
                    scheme: uri.scheme,
                    authority: uri.authority,
                  });

                  const openResult = await vscode.env.openExternal(uri);
                  logger.info('Browser open result', authContext, {
                    openResult,
                    verificationUri,
                    success: openResult,
                  });

                  // Show quick confirmation
                  vscode.window.showInformationMessage(
                    `Code ${userCode} for ${connectionName} copied to clipboard - paste it in the browser!`,
                    { modal: false }
                  );

                  logger.debug('User code copied and browser opened', authContext, {
                    userCode,
                    verificationUri,
                    openResult,
                  });
                } catch (error) {
                  logger.error('Failed to open browser or copy code', authContext, {
                    error: error instanceof Error ? error.message : String(error),
                    verificationUri,
                    userCode,
                  });

                  // Fallback: show manual instructions
                  vscode.window
                    .showErrorMessage(
                      `Could not open browser automatically. Please manually go to ${verificationUri} and enter code: ${userCode}`,
                      'Copy Code'
                    )
                    .then((fallbackAction) => {
                      if (fallbackAction === 'Copy Code') {
                        vscode.env.clipboard.writeText(userCode);
                      }
                    });
                }
              }
            },
          });

          if (isForceInteractive) {
            logger.info(
              'Force interactive authentication requested - clearing cached credentials',
              authContext,
              {
                requestSource: 'manual-interactive-trigger',
              }
            );
            try {
              await authProvider.resetToken();
            } catch (error) {
              logger.warn(
                'Failed to reset cached credentials before forced interactive auth',
                authContext,
                {
                  error: error instanceof Error ? error.message : String(error),
                }
              );
            }
          } else {
            // Check if already authenticated and token is valid
            const isAuthenticated = await authProvider.isAuthenticated();
            if (isAuthenticated) {
              const accessToken = await authProvider.getAccessToken();
              if (accessToken) {
                const tokenInfo = await authProvider.getTokenInfo();
                const expiresAt = tokenInfo?.expiresAt;

                if (isTokenValid({ expiresAt })) {
                  logger.info('Valid cached token found', authContext, { hasToken: true });
                  return {
                    token: accessToken,
                    expiresAt: expiresAt?.toISOString?.() ?? expiresAt,
                    success: true,
                    message: 'Entra authentication successful - using cached token',
                  };
                }

                logger.info('Cached token available but expired or near expiry', authContext, {
                  expiresAt: expiresAt?.toISOString?.() ?? null,
                });
              }
            }
          }

          // Perform interactive authentication
          logger.info(
            isForceInteractive
              ? 'Starting forced device code flow for authentication'
              : 'Starting device code flow for authentication',
            authContext,
            {
              forceInteractive: isForceInteractive,
            }
          );
          const authResult = await authProvider.authenticate();

          if (authResult.success && authResult.accessToken) {
            logger.info('Interactive authentication successful', authContext, {
              hasAccessToken: !!authResult.accessToken,
            });
            // Emit application-level authentication success for FSM context update
            try {
              sendApplicationStoreEvent({
                type: 'AUTHENTICATION_SUCCESS',
                connectionId: input.connectionId,
                token: authResult.accessToken,
              });
              logger.info('Emitted AUTHENTICATION_SUCCESS event', authContext, {
                connectionId: input.connectionId,
              });
            } catch (error) {
              logger.warn('Failed to emit AUTHENTICATION_SUCCESS event', authContext, {
                error: error instanceof Error ? error.message : String(error),
              });
            }
            return {
              token: authResult.accessToken,
              expiresAt: authResult.expiresAt?.toISOString?.() ?? authResult.expiresAt,
              success: true,
              message: 'Entra authentication successful',
            };
          } else {
            logger.error('Interactive authentication failed', authContext, {
              error: authResult.error,
              success: authResult.success,
            });
            throw new Error(authResult.error || 'Entra authentication failed');
          }
        } catch (error) {
          const authContext = { component: FSMComponent.AUTH, connectionId: input.connectionId };
          logger.error('Authentication failed', authContext, {
            error: error instanceof Error ? error.message : String(error),
            errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          });
          throw new Error(
            `Entra authentication failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }),

      createAzureClient: fromPromise(async ({ input }: { input: ConnectionContext }) => {
        // FSM-First Implementation: Use pure functions for client creation
        const connectionContext = {
          component: FSMComponent.CONNECTION,
          connectionId: input.connectionId,
        };

        // Step 1: Validate configuration
        const { validateClientConfig, createAzureClient: createClient } = await import(
          '../functions/azureClientFunctions.js'
        );

        const validationResult = await validateClientConfig(input);
        if (!validationResult.isValid) {
          const errorMessage = `Client configuration validation failed: ${validationResult.errors?.join(', ')}`;
          fsmLogger.error(FSMComponent.CONNECTION, errorMessage, connectionContext, {
            errors: validationResult.errors,
          });
          throw new Error(errorMessage);
        }

        // Step 2: Create client using pure function
        const clientResult = await createClient(input, validationResult.config!);

        fsmLogger.info(
          FSMComponent.CONNECTION,
          'Azure client created successfully via FSM',
          connectionContext,
          {
            organization: clientResult.config.organization,
            project: clientResult.config.project,
            authType: clientResult.config.options.authType,
          }
        );

        return clientResult.client;
      }),

      createWorkItemsProvider: fromPromise(async ({ input }: { input: ConnectionContext }) => {
        // Implementation: Create WorkItemsProvider
        logger.debug(`Creating provider for ${input.connectionId}`);

        if (!input.client) {
          throw new Error('No client available for provider creation');
        }

        // Real implementation: Create WorkItemsProvider
        try {
          const { WorkItemsProvider } = await import('../../provider.js');

          const provider = new WorkItemsProvider(
            input.connectionId,
            input.client,
            (msg: any) => {
              // Forward provider messages to webview (same as activation.ts)
              logger.debug(`Provider ${input.connectionId}: ${msg}`);

              forwardProviderMessageBridge(input.connectionId, msg);
            },
            {
              // Provider options
            }
          );

          logger.info(`WorkItems provider created successfully for ${input.connectionId}`);
          return provider;
        } catch (error) {
          logger.error(
            `Failed to create WorkItems provider: ${error instanceof Error ? error.message : String(error)}`
          );
          throw error;
        }
      }),

      refreshAuthToken: fromPromise(async ({ input }: { input: ConnectionContext }) => {
        // Implementation: Refresh expired auth token
        logger.debug(`Refreshing auth token for ${input.connectionId}`);

        if (input.authMethod === 'pat') {
          // PAT doesn't expire, so this is likely a new PAT needed
          try {
            const extensionContext = getExtensionContextRef();

            if (!extensionContext) {
              throw new Error('Extension context not available');
            }

            const credential = await getSecretPATFromBridge(extensionContext, input.connectionId);
            if (!credential) {
              throw new Error('PAT refresh failed - no PAT found');
            }
            return { token: credential };
          } catch (error) {
            logger.error(
              `PAT refresh failed: ${error instanceof Error ? error.message : String(error)}`
            );
            throw error;
          }
        } else {
          // LEGACY AUTH REMOVED - Entra token refresh now handled by FSM authentication
          throw new Error('LEGACY AUTH REMOVED - FSM authentication implementation needed');
        }
      }),
    },
  }
);

// ============================================================================
// HELPER TYPES
// ============================================================================

export type { ConnectionContext, ConnectionEvent, ProjectConnection } from './connectionTypes.js';
