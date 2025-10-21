import { createMachine, assign, fromPromise } from "xstate";
import { createComponentLogger, FSMComponent, fsmLogger } from "../logging/FSMLogger";
import { isTokenValid } from "../functions/authFunctions";
import {
  getExtensionContextRef,
  getSecretPAT as getSecretPATFromBridge,
  forwardProviderMessage as forwardProviderMessageBridge
} from "../services/extensionHostBridge.js";
const logger = createComponentLogger(FSMComponent.CONNECTION, "connectionMachine");
const AZURE_DEVOPS_PUBLIC_CLIENT_ID = "872cd9fa-d31f-45e0-9eab-6e460a02d1f1";
const AZURE_DEVOPS_SCOPE = "499b84ac-1321-427f-aa17-267ca6975798/.default";
const normalizeExpiryToMs = (expiresAt) => {
  if (!expiresAt) {
    return void 0;
  }
  if (expiresAt instanceof Date) {
    return expiresAt.getTime();
  }
  if (typeof expiresAt === "number") {
    return Number.isFinite(expiresAt) ? expiresAt : void 0;
  }
  if (typeof expiresAt === "string") {
    const parsed = Date.parse(expiresAt);
    return Number.isNaN(parsed) ? void 0 : parsed;
  }
  return void 0;
};
async function discoverTenantFromOrganization(organizationUrl) {
  const context = { component: FSMComponent.AUTH, connectionId: "tenant-discovery" };
  try {
    logger.debug("Starting enhanced tenant discovery", context, { organizationUrl });
    let orgName;
    if (organizationUrl.includes("dev.azure.com")) {
      const match = organizationUrl.match(/https?:\/\/dev\.azure\.com\/([^\/]+)/);
      orgName = match?.[1] || "";
      logger.debug("Parsed organization from dev.azure.com format", context, { orgName, pattern: "dev.azure.com" });
    } else if (organizationUrl.includes("visualstudio.com")) {
      const match = organizationUrl.match(/https?:\/\/([^\.]+)\.visualstudio\.com/);
      orgName = match?.[1] || "";
      logger.debug("Parsed organization from visualstudio.com format", context, { orgName, pattern: "visualstudio.com" });
    } else {
      logger.warn("Unsupported organization URL format", context, { organizationUrl });
      return null;
    }
    if (!orgName) {
      logger.warn("Could not extract organization name from URL", context, { organizationUrl });
      return null;
    }
    logger.info("Extracted organization name for tenant discovery", context, { orgName, organizationUrl });
    const vsspsResult = await tryVSSpsTenantDiscovery(orgName, context);
    if (vsspsResult) {
      logger.info("\u2705 Tenant discovered via VSSPS API", context, { tenantId: vsspsResult, orgName });
      return vsspsResult;
    }
    const restApiResult = await tryRestApiTenantDiscovery(organizationUrl, orgName, context);
    if (restApiResult) {
      logger.info("\u2705 Tenant discovered via REST API", context, { tenantId: restApiResult, orgName });
      return restApiResult;
    }
    const armResult = await tryArmTenantDiscovery(orgName, context);
    if (armResult) {
      logger.info("\u2705 Tenant discovered via ARM API", context, { tenantId: armResult, orgName });
      return armResult;
    }
    logger.warn("\u274C All tenant discovery methods failed", context, {
      orgName,
      organizationUrl,
      message: "Organization might be private, use personal account, or require different tenant setup"
    });
    return null;
  } catch (error) {
    logger.error("Tenant discovery failed with exception", context, {
      error: error instanceof Error ? error.message : String(error),
      organizationUrl
    });
    return null;
  }
}
async function tryVSSpsTenantDiscovery(orgName, context) {
  try {
    const discoveryUrl = `https://app.vssps.visualstudio.com/_apis/organization/${orgName}/tenantinfo`;
    logger.debug("Trying VSSPS tenant discovery", context, { discoveryUrl, orgName });
    const response = await fetch(discoveryUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "AzureDevOpsIntegration-VSCode"
      }
    });
    if (!response.ok) {
      logger.debug("VSSPS tenant discovery failed", context, {
        status: response.status,
        statusText: response.statusText,
        reason: response.status === 404 ? "Organization not found or private" : "API error"
      });
      return null;
    }
    const data = await response.json();
    const tenantId = data?.tenantId;
    if (tenantId && typeof tenantId === "string" && tenantId.trim() !== "") {
      return tenantId.trim();
    }
    logger.debug("VSSPS API returned no valid tenant ID", context, { responseData: data });
    return null;
  } catch (error) {
    logger.debug("VSSPS tenant discovery error", context, {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}
async function tryRestApiTenantDiscovery(organizationUrl, orgName, context) {
  try {
    const apiUrl = `${organizationUrl}/_apis/connectionData`;
    logger.debug("Trying REST API tenant discovery", context, { apiUrl, orgName });
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "AzureDevOpsIntegration-VSCode"
      }
    });
    if (!response.ok) {
      logger.debug("REST API tenant discovery failed", context, {
        status: response.status,
        statusText: response.statusText
      });
      return null;
    }
    const data = await response.json();
    const authenticatedUser = data?.authenticatedUser;
    const tenantId = authenticatedUser?.descriptor?.split(";")[0];
    if (tenantId && typeof tenantId === "string" && tenantId.includes("-")) {
      logger.debug("Found potential tenant ID in connection data", context, { tenantId });
      return tenantId;
    }
    logger.debug("REST API returned no valid tenant ID", context, { responseData: data });
    return null;
  } catch (error) {
    logger.debug("REST API tenant discovery error", context, {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}
async function tryArmTenantDiscovery(orgName, context) {
  try {
    const armUrl = `https://management.azure.com/tenants?api-version=2020-01-01`;
    logger.debug("Trying ARM tenant discovery", context, { armUrl, orgName });
    const response = await fetch(armUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "AzureDevOpsIntegration-VSCode"
      }
    });
    if (!response.ok) {
      logger.debug("ARM tenant discovery failed (expected)", context, {
        status: response.status,
        reason: "ARM API requires authentication"
      });
      return null;
    }
    logger.debug("ARM API accessible but cannot match org to tenant", context);
    return null;
  } catch (error) {
    logger.debug("ARM tenant discovery error (expected)", context, {
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}
const connectionMachine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QGMD2A7dZkBcCWGAdBHrGptjpAMQDCA8gHKMCitAKgNoAMAuoqAAOqWHnwYBIAB6IAjACYAbPMIB2AJyaAHAGZuOnfIAsmgDQgAnokWyArIXW2tt1d3VHus10YC+P8+RYuAToxKSBlDQASiwAyixcfJLCouLokjIICsZqxupaqoo6Rfq25lYIJlpq3NzyOrJe8ty28rJ+ARhBaYQAhgCuOAAWYOj4yL346FDEYFQATgC2eOgrUAD6i3NDqBDUPPxIICliIRlyih4Omtpass6qsuWIWtxGNQ+Oiuqu6vIdIAiwSIA2Go3GkzWswWy1W002212+1khyEIlOEiOmVkl241xuWjuDyelkQqls6kItm4n10tlk6haAKBPVBIzGeAmUxmgkm6zZ1AgGDAhBWADdUABrEUskJ9QbsiHcwi8nD8hUIcWoLkhA4HZLotLnBDGLTvQryWyKWw6amEsqkhCaVRU6mWozFTTNdTMrqUOVs8GcyHTFV8gVgebzVDzFUAG0mADMY4tCLKQQqgzrQ6r1cNNegJTqMHqkkcTkasYhTeblFabXbnM8nW9CLJakpFF3jDZfRRgaFAxzszNwfNenmhmmRshJWt1mApKRuescFLRoLhaLC+u036B-KwcOQ6OxuPJ9PsHP4Yvl-O19L0AWi5CS3x9eXDWcqyajGa1HW1q2jSTaOrIhiKFSuiKNwhTqLIJjyKofbdAGmbHsqY4Tmyl6zvOt6wCuD4bkKWDbhK0p7v2rLoUqUJYReyAzteGwEUR65PlqxboHqKIGqk36gNicGEPoqh-uolzyFo9RGM22SyIQdY9qoxQ4sh-iAvuNFHnRoYMThTFXvhS6EfeHHUJG0axoICY4MmSxUahGa6cGmFnthCq4SxC6mexj7Ptqr48e+ZZogJmJCXIIliRJUkyToclgV47x-K0Tj5DYbgof6LmKm59EeReKwLL0wRimAk6bmRWqUemg60QV+lFThJWRmV+AVZOgXcaWqLHF+kXSNWf61paQGNg6FSNFolJ-sUtSeDYKU5QeQ56aeODnq1YzteVlURlGMbxkmKZOblDWuSOhAGV5bXjvt3VccFfX8Ri6Q-jWAHjQ2IFTXIbiQfoan1DS1riatPTIPMYAnusyBxng4LVSKtUytpcrQ7DK4I0jYw9S9oX9RWgnDQgyjNqa1SEraiiEiYRR2JDmMw3DuPI1Zx22adjn1WmrM44j4IE2kr2fhFH1ReTLRKeSi2STojKqPJTgqDaC0uEhloIczRBY3DgjRmKeAQJGKPkbufP6yuhuoMbpvzCLupE29lZS7aOiuot2Q0vcWjyVoXYOHS6iJYljzgbroTW-Otv22bnM2XZDmplbAux0bJuRk7b68B+4XvcaqjyJTzTvB6tp3AhbSPLYUfnbgNAACIAJKxAwzBsIkxODZLZNh17tQ+0S-uOtSnvtnUC3cNaTiKPXLI0B3rAcC3TDrAAYgAgi3AAyLBN-nA0S8aHuD548jNCP8nFJ7BgLToGiqLoOgL9pNDsPQADSLCMOsLAAA0AAKLcYiHzCsfQuP577n2Hn7ZsRgbSEA8FPWCBQPT5DftRaILAN4xFiAACXWFvAAquwAhR8SZDUyIYT2thqRD0vr7QkzZbQukcJ4cCDIWgyX+JpPmbJ1iJl6HgOMOD2BRAAJqUN7saBCNJCC6HEqoDQrQ-zgWbFaSClpnCvF0aHek9dBHCNEUvJgK9u6u1JtiMSyCTD5CqB4GCJcwJ-iBiHVSjNQ7z34RjPKQiRFiL2K3du5iu4yJPj+cC+RFGPyMCoxwpoNGOhMPYGCzg6YGBno0BeQsxgBNMXsGIEjpEQKoX3TIME0ly1qArJW8lxKQSKLaRkMl6StD4Z0aimM8lqhMUEugYSOARKgVLCk1SGGA0VrBeSo1RJOApB6GwgdpK5Lxn0wJzc27L3CWU2RP4Fmy0mXUmZrjEqEErhlau4kjCdK0t0ogccs7zAKQM4pUiRluzJioxSsFqTwWfvUcS6gA4qAMDcJwbDEpvHrk8h2ryzGd2GXsyJUtn6-LlgChKwLKaGFEigzwLQ-ytDNLCzO8L+lbNCUiyx4tRnfLuKJTFXhsUmEpoy8Si1lCqR+DiV+viHnRz8egBcR15jUHeaUnuqKyZtLbHWThjhyTiWbM-T2PCXBdncF2ZwWDnIisToMmlnzrEvEtPKy0iqXAuCStNHQ-5rS6MVvUOsvgBX6obmkUV1lqAhJ2ci6V9LMh3HsDiS1jQlU2ubMoT2iCp6BxxDNeuxERUw0TDDWAQxzZo09XKFN6w00ZqGDnEKecUVBsQA0Ohky4EsMdEod4DCFC2HmtkS0yaOIFrAOmuAWbE4nXsmdPm+bC29pLWLAuXzMhyypN7RQniKQuIqAYao1qFAMiMJcRobrNLoF2HASQ9UrHUMQAAWkUM2Rw+LaiqUaAock7h64kDIO-CAx6KkAwUHY7QjiZ51GjbUNsbpFY2iypoIxjURzvrkc62JyjVFJJ0NG4uhAr5umaUYHEbqukevWk1GYpsYQrHnFsYYuxoNRKMB6OD8SEPqKQ46QonsVHpXGroGSEGronjDGqNkFGpYITpjRhJai7gMYqPkRSrSXChzeJfZ+nH8rXVusMfjZMEJXCUbRxJ9H5Iz0pGhzwDRVJtB8Thi6h4lPcZU1OIyeEbx+XMo+NT2I-zUziSJxD8kvCKTjZaZofKW13IEZB6zLU7q7Qep1A6CoXPVnXW2S1ShHAegQqPaadhIJ2hcM4bhXwF7p3hOzMYcWTSzTxECikKjA6bttXIQwKhHX0LNF4edhgCvYwznbZ5pXDB4jSp4CkdMChmkprR5B0l6RuHHnUPVkQ310qnYgW5AdijypkzJB4xh2juos8YzZC3J2mrK64VDj8qvP0uJcZss0XRAQKKpWul9sP3I9cVjZhTetIPod7Jh18wLfEguJYoLh9A11aGS7rFKDulfpO8Gk5JH601UjJXFilnA3tNG4bVL2rbCu9TGWHlwHDKHibc6ugdlZgWhaJAwV27BOFgsF4VhAR3dqLbDhkokCg2lUlaFHS7K2PzbPYv4DisNaD8H4IAA */
  id: "connection",
  types: {},
  initial: "disconnected",
  context: {
    connectionId: "",
    config: {},
    authMethod: "pat",
    isConnected: false,
    retryCount: 0,
    refreshFailureCount: 0,
    reauthInProgress: false,
    forceInteractive: false,
    accessTokenExpiresAt: void 0
  },
  states: {
    disconnected: {
      entry: "clearConnectionState",
      on: {
        CONNECT: {
          target: "authenticating",
          actions: assign({
            config: ({ event }) => event.config,
            connectionId: ({ event }) => event.config.id,
            authMethod: ({ event }) => event.config.authMethod || "pat",
            retryCount: 0,
            lastError: void 0,
            forceInteractive: ({ event }) => !!event.forceInteractive,
            accessTokenExpiresAt: void 0
          })
        },
        RESET: {
          target: "disconnected",
          actions: "resetConnection"
        }
      }
    },
    authenticating: {
      initial: "determining_method",
      states: {
        determining_method: {
          always: [
            {
              target: "entra_auth",
              guard: "isEntraAuth"
            },
            {
              target: "pat_auth",
              guard: "isPATAuth"
            }
          ]
        },
        pat_auth: {
          invoke: {
            src: "authenticateWithPAT",
            input: ({ context }) => context,
            onDone: {
              target: "#connection.creating_client",
              actions: assign({
                credential: ({ event }) => event.output.credential,
                pat: ({ event }) => event.output.credential
              })
            },
            onError: {
              target: "#connection.auth_failed",
              actions: assign({
                lastError: ({ event }) => event.error?.message || "PAT authentication failed",
                retryCount: ({ context }) => context.retryCount + 1
              })
            }
          }
        },
        entra_auth: {
          initial: "checking_existing_token",
          states: {
            checking_existing_token: {
              always: [
                {
                  target: "interactive_auth",
                  guard: "shouldForceInteractiveAuth"
                }
              ],
              invoke: {
                src: "checkExistingEntraToken",
                input: ({ context }) => context,
                onDone: [
                  {
                    target: "#connection.creating_client",
                    guard: "hasValidToken",
                    actions: assign({
                      credential: ({ event }) => event.output.token,
                      accessToken: ({ event }) => event.output.token,
                      accessTokenExpiresAt: ({ event }) => normalizeExpiryToMs(event.output.expiresAt)
                      // LEGACY AUTH REMOVED - authService replaced by FSM authentication
                    })
                  },
                  {
                    target: "interactive_auth"
                  }
                ],
                onError: {
                  target: "interactive_auth"
                }
              }
            },
            interactive_auth: {
              invoke: {
                src: "performInteractiveEntraAuth",
                input: ({ context }) => context,
                onDone: {
                  target: "#connection.creating_client",
                  actions: assign({
                    credential: ({ event }) => event.output.token,
                    accessToken: ({ event }) => event.output.token,
                    accessTokenExpiresAt: ({ event }) => normalizeExpiryToMs(event.output.expiresAt),
                    // LEGACY AUTH REMOVED - authService replaced by FSM authentication
                    reauthInProgress: false,
                    forceInteractive: () => false
                  })
                },
                onError: {
                  target: "#connection.auth_failed",
                  actions: assign({
                    lastError: ({ event }) => event.error?.message || "Entra authentication failed",
                    retryCount: ({ context }) => context.retryCount + 1,
                    reauthInProgress: false,
                    forceInteractive: () => false
                  })
                }
              },
              entry: assign({
                reauthInProgress: true
              })
            }
          }
        }
      }
    },
    creating_client: {
      invoke: {
        src: "createAzureClient",
        input: ({ context }) => context,
        onDone: {
          target: "creating_provider",
          actions: assign({
            client: ({ event }) => event.output
          })
        },
        onError: {
          target: "client_failed",
          actions: assign({
            lastError: ({ event }) => event.error?.message || "Client creation failed"
          })
        }
      }
    },
    creating_provider: {
      invoke: {
        src: "createWorkItemsProvider",
        input: ({ context }) => context,
        onDone: {
          target: "connected",
          actions: assign({
            provider: ({ event }) => event.output,
            isConnected: true,
            retryCount: 0,
            lastError: void 0
          })
        },
        onError: {
          target: "provider_failed",
          actions: assign({
            lastError: ({ event }) => event.error?.message || "Provider creation failed"
          })
        }
      }
    },
    connected: {
      entry: "notifyConnectionSuccess",
      on: {
        DISCONNECT: "disconnected",
        CONNECTION_FAILED: "connection_error",
        TOKEN_EXPIRED: "token_refresh",
        REFRESH_AUTH: "token_refresh"
      }
    },
    auth_failed: {
      entry: "notifyAuthFailure",
      on: {
        RETRY: {
          target: "authenticating",
          guard: "canRetry"
        },
        CONNECT: {
          target: "authenticating",
          actions: assign({
            retryCount: 0
          })
        },
        DISCONNECT: "disconnected"
      }
    },
    client_failed: {
      entry: "notifyClientFailure",
      on: {
        RETRY: {
          target: "creating_client",
          guard: "canRetry"
        },
        CONNECT: "authenticating",
        DISCONNECT: "disconnected"
      }
    },
    provider_failed: {
      entry: "notifyProviderFailure",
      on: {
        RETRY: {
          target: "creating_provider",
          guard: "canRetry"
        },
        CONNECT: "authenticating",
        DISCONNECT: "disconnected"
      }
    },
    connection_error: {
      entry: "notifyConnectionError",
      on: {
        RETRY: {
          target: "authenticating",
          guard: "canRetry"
        },
        CONNECT: "authenticating",
        DISCONNECT: "disconnected"
      }
    },
    token_refresh: {
      invoke: {
        src: "refreshAuthToken",
        input: ({ context }) => context,
        onDone: {
          target: "connected",
          actions: assign({
            credential: ({ event }) => event.output.token,
            accessToken: ({ event }) => event.output.token,
            refreshFailureCount: 0,
            lastRefreshFailure: void 0,
            refreshBackoffUntil: void 0
          })
        },
        onError: {
          target: "auth_failed",
          actions: assign({
            lastError: ({ event }) => event.error?.message || "Token refresh failed",
            refreshFailureCount: ({ context }) => context.refreshFailureCount + 1,
            lastRefreshFailure: () => /* @__PURE__ */ new Date(),
            refreshBackoffUntil: ({ context }) => {
              const backoffMinutes = Math.min(60, Math.pow(2, context.refreshFailureCount) * 5);
              return new Date(Date.now() + backoffMinutes * 60 * 1e3);
            }
          })
        }
      }
    }
  }
}, {
  // Guards
  guards: {
    isEntraAuth: ({ context }) => context.authMethod === "entra",
    isPATAuth: ({ context }) => context.authMethod === "pat",
    canRetry: ({ context }) => context.retryCount < 3,
    hasValidToken: ({ event }) => {
      const output = event.output;
      const token = output?.token;
      const expiresAt = output?.expiresAt;
      if (!token) {
        logger.debug("Token validation: no token found");
        return false;
      }
      const valid = isTokenValid({ expiresAt });
      if (!valid) {
        logger.info("Token validation: cached token expired or near expiry");
        return false;
      }
      logger.debug(`Token validation: valid token found, length=${token.length}`);
      return true;
    },
    shouldForceInteractiveAuth: ({ context }) => context.forceInteractive === true
  },
  // Actions
  actions: {
    clearConnectionState: assign({
      client: void 0,
      provider: void 0,
      credential: void 0,
      pat: void 0,
      accessToken: void 0,
      accessTokenExpiresAt: void 0,
      // LEGACY AUTH REMOVED - authService replaced by FSM authentication
      isConnected: false,
      lastError: void 0,
      forceInteractive: false
    }),
    resetConnection: assign({
      retryCount: 0,
      refreshFailureCount: 0,
      lastRefreshFailure: void 0,
      refreshBackoffUntil: void 0,
      reauthInProgress: false,
      lastError: void 0,
      forceInteractive: false,
      accessTokenExpiresAt: void 0
    }),
    notifyConnectionSuccess: ({ context }) => {
      logger.info(`${context.connectionId} connected successfully`);
      if (context.provider) {
        logger.info(`Triggering initial work items refresh for ${context.connectionId}`);
        try {
          const defaultQuery = "My Activity";
          context.provider.refresh(defaultQuery);
        } catch (error) {
          logger.error(`Failed to trigger initial refresh: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else {
        logger.warn(`No provider available for initial refresh on ${context.connectionId}`);
      }
    },
    notifyAuthFailure: ({ context }) => {
      logger.error(`${context.connectionId} authentication failed: ${context.lastError}`);
      if (context.lastError?.includes("network_error")) {
        import("vscode").then((vscode) => {
          vscode.window.showErrorMessage(
            `Authentication failed due to network error. This might be caused by corporate firewall/proxy. Try: 1) Check internet connection, 2) Contact IT about Microsoft auth endpoints, 3) Try from a different network.`,
            "Retry Authentication",
            "View Logs"
          ).then((selection) => {
            if (selection === "View Logs") {
              vscode.commands.executeCommand("azureDevOpsInt.showFSMLogs");
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
    }
  },
  // Actors (service implementations)
  actors: {
    authenticateWithPAT: fromPromise(async ({ input }) => {
      logger.debug(`Authenticating with PAT for ${input.connectionId}`);
      try {
        const extensionContext = getExtensionContextRef();
        if (!extensionContext) {
          throw new Error("Extension context not available");
        }
        const credential = await getSecretPATFromBridge(extensionContext, input.connectionId);
        if (!credential) {
          throw new Error("PAT not found in secrets");
        }
        return { credential };
      } catch (error) {
        logger.error(`PAT authentication failed: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }),
    checkExistingEntraToken: fromPromise(async ({ input }) => {
      logger.debug(`Checking existing Entra token for ${input.connectionId}`);
      try {
        const { EntraAuthProvider } = await import("../../auth/entraAuthProvider.js");
        const context = globalThis.extensionContext;
        if (!context) {
          logger.warn("Extension context not available for Entra token check");
          return { token: null };
        }
        const clientId = AZURE_DEVOPS_PUBLIC_CLIENT_ID;
        let tenantId = input.config?.tenantId;
        const authContext = { component: FSMComponent.AUTH, connectionId: input.connectionId };
        let organizationName;
        let organizationUrl;
        if (input.config?.apiBaseUrl) {
          organizationUrl = input.config.apiBaseUrl;
          const apiUrlMatch = organizationUrl.match(/https:\/\/(?:([^.]+)\.visualstudio\.com|dev\.azure\.com\/([^\/]+))/);
          organizationName = apiUrlMatch?.[1] || apiUrlMatch?.[2];
          logger.debug("Using existing apiBaseUrl for token check tenant discovery", authContext, {
            apiBaseUrl: input.config.apiBaseUrl,
            extractedOrg: organizationName
          });
        } else if (input.config?.baseUrl) {
          organizationUrl = input.config.baseUrl;
          const baseUrlMatch = organizationUrl.match(/https:\/\/(?:([^.]+)\.visualstudio\.com|dev\.azure\.com\/([^\/]+))/);
          organizationName = baseUrlMatch?.[1] || baseUrlMatch?.[2];
          logger.debug("Using existing baseUrl for token check tenant discovery", authContext, {
            baseUrl: input.config.baseUrl,
            extractedOrg: organizationName
          });
        } else if (input.config?.organization) {
          organizationName = input.config.organization;
          organizationUrl = `https://dev.azure.com/${organizationName}`;
          logger.debug("Constructing URL from organization name for token check (last resort)", authContext, {
            organization: organizationName,
            constructedUrl: organizationUrl
          });
        }
        if (organizationName && organizationUrl) {
          logger.info("Attempting tenant discovery for token check", authContext, {
            organizationName,
            organizationUrl,
            source: input.config?.apiBaseUrl ? "apiBaseUrl" : input.config?.baseUrl ? "baseUrl" : "organization",
            originalTenantId: tenantId
          });
          const discoveredTenant = await discoverTenantFromOrganization(organizationUrl);
          if (discoveredTenant) {
            tenantId = discoveredTenant;
            logger.info("\u2705 Tenant discovered for existing token check", authContext, {
              discoveredTenant: tenantId,
              organizationName,
              organizationUrl,
              originalTenantId: input.config?.tenantId
            });
          } else {
            logger.warn("\u274C Tenant discovery failed for existing token check", authContext, {
              organizationName,
              organizationUrl,
              reason: "discoverTenantFromOrganization returned null",
              fallbackToOriginal: tenantId
            });
          }
        } else {
          logger.warn("\u274C Cannot discover tenant for token check - no organization information available", authContext, {
            hasApiBaseUrl: !!input.config?.apiBaseUrl,
            hasBaseUrl: !!input.config?.baseUrl,
            hasOrganization: !!input.config?.organization,
            config: input.config,
            usingOriginalTenant: tenantId
          });
        }
        const finalTenantId = tenantId || "organizations";
        if (finalTenantId === "organizations") {
          logger.warn('\u26A0\uFE0F Using fallback tenant "organizations" for token check', authContext, {
            originalTenantId: tenantId,
            configTenantId: input.config?.tenantId,
            discoveryAttempted: !input.config?.tenantId
          });
        } else {
          logger.info("\u2705 Using discovered/configured tenant for token check", authContext, {
            tenantId: finalTenantId,
            source: input.config?.tenantId ? "config" : "discovery"
          });
        }
        logger.debug("Using tenant for existing token check", authContext, { tenantId: finalTenantId, clientId });
        const authProvider = new EntraAuthProvider({
          config: {
            clientId,
            tenantId: finalTenantId,
            scopes: [AZURE_DEVOPS_SCOPE]
            // Azure DevOps
          },
          secretStorage: context.secrets,
          connectionId: input.connectionId
        });
        const isAuthenticated = await authProvider.isAuthenticated();
        if (isAuthenticated) {
          const tokenInfo = await authProvider.getTokenInfo();
          if (tokenInfo?.accessToken) {
            const expiresAt = tokenInfo.expiresAt;
            if (isTokenValid({ expiresAt })) {
              logger.info("Valid cached token found", authContext, { hasToken: true });
              return {
                token: tokenInfo.accessToken,
                expiresAt: expiresAt?.toISOString?.() ?? expiresAt
              };
            }
            logger.info("Cached token found but expired or near expiry", authContext, {
              expiresAt: expiresAt?.toISOString?.() ?? null
            });
          } else {
            logger.debug("Authenticated but token info unavailable", authContext);
          }
        }
        logger.debug("No valid cached token found", authContext);
        return { token: null };
      } catch (error) {
        const authContext = { component: FSMComponent.AUTH, connectionId: input.connectionId };
        logger.error("Failed to check existing token", authContext, {
          error: error instanceof Error ? error.message : String(error),
          errorType: error instanceof Error ? error.constructor.name : "Unknown"
        });
        return { token: null };
      }
    }),
    performInteractiveEntraAuth: fromPromise(async ({ input }) => {
      logger.info(`Starting interactive Entra authentication for ${input.connectionId}`);
      try {
        const { EntraAuthProvider } = await import("../../auth/entraAuthProvider.js");
        const context = globalThis.extensionContext;
        if (!context) {
          throw new Error("Extension context not available for Entra authentication");
        }
        const clientId = AZURE_DEVOPS_PUBLIC_CLIENT_ID;
        let tenantId = input.config?.tenantId;
        let discoveredTenant = null;
        const isForceInteractive = input.forceInteractive === true;
        const authContext = { component: FSMComponent.AUTH, connectionId: input.connectionId };
        let organizationName;
        let organizationUrl;
        if (input.config?.apiBaseUrl) {
          organizationUrl = input.config.apiBaseUrl;
          const apiUrlMatch = organizationUrl.match(/https:\/\/(?:([^.]+)\.visualstudio\.com|dev\.azure\.com\/([^\/]+))/);
          organizationName = apiUrlMatch?.[1] || apiUrlMatch?.[2];
          logger.debug("Using existing apiBaseUrl for tenant discovery", authContext, {
            apiBaseUrl: input.config.apiBaseUrl,
            extractedOrg: organizationName
          });
        } else if (input.config?.baseUrl) {
          organizationUrl = input.config.baseUrl;
          const baseUrlMatch = organizationUrl.match(/https:\/\/(?:([^.]+)\.visualstudio\.com|dev\.azure\.com\/([^\/]+))/);
          organizationName = baseUrlMatch?.[1] || baseUrlMatch?.[2];
          logger.debug("Using existing baseUrl for tenant discovery", authContext, {
            baseUrl: input.config.baseUrl,
            extractedOrg: organizationName
          });
        } else if (input.config?.organization) {
          organizationName = input.config.organization;
          organizationUrl = `https://dev.azure.com/${organizationName}`;
          logger.debug("Constructing URL from organization name (last resort)", authContext, {
            organization: organizationName,
            constructedUrl: organizationUrl
          });
        }
        if (organizationName && organizationUrl) {
          logger.info("Attempting tenant discovery for device code flow", authContext, {
            organizationName,
            organizationUrl,
            source: input.config?.apiBaseUrl ? "apiBaseUrl" : input.config?.baseUrl ? "baseUrl" : "organization",
            originalTenantId: tenantId
          });
          discoveredTenant = await discoverTenantFromOrganization(organizationUrl);
          if (discoveredTenant) {
            tenantId = discoveredTenant;
            logger.info("\u2705 Tenant discovered successfully for device code flow", authContext, {
              discoveredTenant: tenantId,
              organizationName,
              organizationUrl,
              originalTenantId: input.config?.tenantId
            });
          } else {
            logger.warn("\u274C Tenant discovery failed for device code flow", authContext, {
              organizationName,
              organizationUrl,
              reason: "discoverTenantFromOrganization returned null",
              fallbackToOriginal: tenantId
            });
          }
        } else {
          logger.warn("\u274C Cannot discover tenant - no organization information available", authContext, {
            hasApiBaseUrl: !!input.config?.apiBaseUrl,
            hasBaseUrl: !!input.config?.baseUrl,
            hasOrganization: !!input.config?.organization,
            config: input.config,
            usingOriginalTenant: tenantId
          });
        }
        let finalTenantId = tenantId;
        if (discoveredTenant) {
          finalTenantId = discoveredTenant;
          logger.info("\u2705 Using discovered tenant (most reliable)", authContext, {
            discoveredTenant: finalTenantId,
            source: "discovery",
            reliability: "high"
          });
        } else if (!input.config?.tenantId || tenantId === "organizations") {
          finalTenantId = "organizations";
          logger.info('\u2705 Using "organizations" tenant for MSAL automatic routing', authContext, {
            originalTenantId: tenantId,
            finalTenantId,
            reason: "v1.9.3 proven approach - let MSAL and Azure AD handle tenant routing",
            recommendation: "organizations endpoint supports work/school accounts with automatic tenant discovery"
          });
        } else {
          logger.info("\u2705 Using user-configured tenant", authContext, {
            tenantId: finalTenantId,
            source: "user-config",
            note: "Respecting user configuration despite discovery failure"
          });
        }
        logger.debug("Final tenant selection for device code authentication", authContext, {
          originalConfigTenant: input.config?.tenantId,
          discoveredTenant,
          finalTenantId,
          selectionReason: discoveredTenant ? "discovery" : !input.config?.tenantId || tenantId === "organizations" ? "organizations-fallback" : "user-config",
          authType: "device-code",
          organizationUrl: organizationUrl || "not-available"
        });
        logger.debug("Using tenant for interactive auth", authContext, { tenantId: finalTenantId, clientId });
        if (input.config?.tenantId && input.config.tenantId !== finalTenantId) {
          logger.info("\u{1F504} Tenant changed - clearing cached authentication", authContext, {
            originalTenant: input.config.tenantId,
            newTenant: finalTenantId,
            reason: "Prevent authentication conflicts from cached tokens"
          });
          try {
            const cacheKey = `entra-cache-${input.connectionId}`;
            await context.secrets.delete(cacheKey);
            logger.debug("Cleared cached authentication for tenant change", authContext, { cacheKey });
          } catch (error) {
            logger.warn("Failed to clear authentication cache on tenant change", authContext, {
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
        const authProvider = new EntraAuthProvider({
          config: {
            clientId,
            tenantId: finalTenantId,
            scopes: [AZURE_DEVOPS_SCOPE]
            // Azure DevOps
          },
          secretStorage: context.secrets,
          connectionId: input.connectionId,
          // Device code callback to show the device code to user
          deviceCodeCallback: async (deviceCode, userCode, verificationUri, expiresIn) => {
            const authContext2 = { component: FSMComponent.AUTH, connectionId: input.connectionId };
            logger.info("Device Code Flow started", authContext2, {
              userCode,
              verificationUri,
              expiresInSeconds: expiresIn,
              expiresInMinutes: Math.floor(expiresIn / 60)
            });
            const vscode = await import("vscode");
            const expiresInMinutes = Math.floor(expiresIn / 60);
            const connectionName = input.config?.organization || input.connectionId;
            const action = await vscode.window.showInformationMessage(
              `Authentication code for ${connectionName}: ${userCode} (expires in ${expiresInMinutes}min)`,
              "Open Browser & Copy Code"
            );
            logger.info("Device code notification shown", authContext2, {
              userCode,
              verificationUri,
              connectionName,
              userAction: action
            });
            if (action === "Open Browser & Copy Code") {
              try {
                await vscode.env.clipboard.writeText(userCode);
                logger.info("Device code copied to clipboard", authContext2, { userCode });
                const uri = vscode.Uri.parse(verificationUri);
                logger.info("Opening external browser", authContext2, {
                  verificationUri,
                  parsedUri: uri.toString(),
                  scheme: uri.scheme,
                  authority: uri.authority
                });
                const openResult = await vscode.env.openExternal(uri);
                logger.info("Browser open result", authContext2, {
                  openResult,
                  verificationUri,
                  success: openResult
                });
                vscode.window.showInformationMessage(
                  `Code ${userCode} for ${connectionName} copied to clipboard - paste it in the browser!`,
                  { modal: false }
                );
                logger.debug("User code copied and browser opened", authContext2, {
                  userCode,
                  verificationUri,
                  openResult
                });
              } catch (error) {
                logger.error("Failed to open browser or copy code", authContext2, {
                  error: error instanceof Error ? error.message : String(error),
                  verificationUri,
                  userCode
                });
                vscode.window.showErrorMessage(
                  `Could not open browser automatically. Please manually go to ${verificationUri} and enter code: ${userCode}`,
                  "Copy Code"
                ).then((fallbackAction) => {
                  if (fallbackAction === "Copy Code") {
                    vscode.env.clipboard.writeText(userCode);
                  }
                });
              }
            }
          }
        });
        if (isForceInteractive) {
          logger.info("Force interactive authentication requested - clearing cached credentials", authContext, {
            requestSource: "manual-interactive-trigger"
          });
          try {
            await authProvider.resetToken();
          } catch (error) {
            logger.warn("Failed to reset cached credentials before forced interactive auth", authContext, {
              error: error instanceof Error ? error.message : String(error)
            });
          }
        } else {
          const isAuthenticated = await authProvider.isAuthenticated();
          if (isAuthenticated) {
            const accessToken = await authProvider.getAccessToken();
            if (accessToken) {
              const tokenInfo = await authProvider.getTokenInfo();
              const expiresAt = tokenInfo?.expiresAt;
              if (isTokenValid({ expiresAt })) {
                logger.info("Valid cached token found", authContext, { hasToken: true });
                return {
                  token: accessToken,
                  expiresAt: expiresAt?.toISOString?.() ?? expiresAt,
                  success: true,
                  message: "Entra authentication successful - using cached token"
                };
              }
              logger.info("Cached token available but expired or near expiry", authContext, {
                expiresAt: expiresAt?.toISOString?.() ?? null
              });
            }
          }
        }
        logger.info(isForceInteractive ? "Starting forced device code flow for authentication" : "Starting device code flow for authentication", authContext, {
          forceInteractive: isForceInteractive
        });
        const authResult = await authProvider.authenticate();
        if (authResult.success && authResult.accessToken) {
          logger.info("Interactive authentication successful", authContext, {
            hasAccessToken: !!authResult.accessToken
          });
          return {
            token: authResult.accessToken,
            expiresAt: authResult.expiresAt?.toISOString?.() ?? authResult.expiresAt,
            success: true,
            message: "Entra authentication successful"
          };
        } else {
          logger.error("Interactive authentication failed", authContext, {
            error: authResult.error,
            success: authResult.success
          });
          throw new Error(authResult.error || "Entra authentication failed");
        }
      } catch (error) {
        const authContext = { component: FSMComponent.AUTH, connectionId: input.connectionId };
        logger.error("Authentication failed", authContext, {
          error: error instanceof Error ? error.message : String(error),
          errorType: error instanceof Error ? error.constructor.name : "Unknown"
        });
        throw new Error(`Entra authentication failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),
    createAzureClient: fromPromise(async ({ input }) => {
      const connectionContext = { component: FSMComponent.CONNECTION, connectionId: input.connectionId };
      const { validateClientConfig, createAzureClient: createClient } = await import("../functions/azureClientFunctions.js");
      const validationResult = await validateClientConfig(input);
      if (!validationResult.isValid) {
        const errorMessage = `Client configuration validation failed: ${validationResult.errors?.join(", ")}`;
        fsmLogger.error(FSMComponent.CONNECTION, errorMessage, connectionContext, {
          errors: validationResult.errors
        });
        throw new Error(errorMessage);
      }
      const clientResult = await createClient(input, validationResult.config);
      fsmLogger.info(FSMComponent.CONNECTION, "Azure client created successfully via FSM", connectionContext, {
        organization: clientResult.config.organization,
        project: clientResult.config.project,
        authType: clientResult.config.options.authType
      });
      return clientResult.client;
    }),
    createWorkItemsProvider: fromPromise(async ({ input }) => {
      logger.debug(`Creating provider for ${input.connectionId}`);
      if (!input.client) {
        throw new Error("No client available for provider creation");
      }
      try {
        const { WorkItemsProvider } = await import("../../provider.js");
        const provider = new WorkItemsProvider(
          input.connectionId,
          input.client,
          (msg) => {
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
        logger.error(`Failed to create WorkItems provider: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }
    }),
    refreshAuthToken: fromPromise(async ({ input }) => {
      logger.debug(`Refreshing auth token for ${input.connectionId}`);
      if (input.authMethod === "pat") {
        try {
          const extensionContext = getExtensionContextRef();
          if (!extensionContext) {
            throw new Error("Extension context not available");
          }
          const credential = await getSecretPATFromBridge(extensionContext, input.connectionId);
          if (!credential) {
            throw new Error("PAT refresh failed - no PAT found");
          }
          return { token: credential };
        } catch (error) {
          logger.error(`PAT refresh failed: ${error instanceof Error ? error.message : String(error)}`);
          throw error;
        }
      } else {
        throw new Error("LEGACY AUTH REMOVED - FSM authentication implementation needed");
      }
    })
  }
});
export {
  AZURE_DEVOPS_PUBLIC_CLIENT_ID,
  AZURE_DEVOPS_SCOPE,
  connectionMachine
};
