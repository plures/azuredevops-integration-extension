/**
 * FSM-based Connection Setup Machine
 * Replaces legacy SetupWizard with pure FSM architecture
 */

import { createMachine, assign, fromPromise } from 'xstate';
import * as vscode from 'vscode';
import { randomUUID } from 'crypto';
import {
  testAzureDevOpsConnection,
  type ParsedAzureDevOpsUrl,
} from '../../azureDevOpsUrlParser.js';

// Define the connection type locally since it's defined in activation.ts
type ProjectConnection = {
  id: string;
  organization: string;
  project: string;
  label?: string;
  team?: string;
  authMethod?: 'pat' | 'entra';
  patKey?: string;
  baseUrl?: string;
  identityName?: string;
  tenantId?: string;
  apiBaseUrl?: string;
};

export interface ExistingConnectionTestResult {
  success: boolean;
  message: string;
  error?: string;
}

// Setup machine context
export interface SetupMachineContext {
  // Step data
  workItemUrl?: string;
  organization?: string;
  project?: string;
  baseUrl?: string;
  apiBaseUrl?: string;
  authMethod?: 'pat' | 'entra';
  patKey?: string;
  tenantId?: string;
  identityName?: string;

  // Process state
  currentStep: 'url' | 'auth' | 'credentials' | 'test' | 'complete';
  existingConnections: ProjectConnection[];
  skipInitialChoice?: boolean;

  // Extension context (passed from service)
  extensionContext?: vscode.ExtensionContext;

  // Results
  connectionId?: string;
  removedConnectionId?: string;
  error?: string;
  testingExistingConnection?: ProjectConnection;
  lastExistingTestResult?: ExistingConnectionTestResult;
}

// Result type for FSM setup consumers
export interface FSMSetupResult {
  status: 'success' | 'removed' | 'cancelled';
  connectionId?: string;
  removedConnectionId?: string;
}

// Setup machine events
export type SetupMachineEvent =
  | { type: 'START'; skipInitialChoice?: boolean }
  | { type: 'URL_PROVIDED'; url: string }
  | { type: 'AUTH_METHOD_SELECTED'; method: 'pat' | 'entra' }
  | { type: 'PAT_PROVIDED'; token: string }
  | { type: 'ENTRA_CONFIG'; tenantId: string }
  | { type: 'TEST_CONNECTION' }
  | { type: 'SAVE_CONNECTION' }
  | { type: 'MANAGE_EXISTING' }
  | { type: 'REMOVE_CONNECTION'; connectionId: string }
  | { type: 'TEST_EXISTING_CONNECTION'; connection: ProjectConnection }
  | { type: 'CONTINUE_MANAGING' }
  | { type: 'CANCEL' }
  | { type: 'BACK' }
  | { type: 'RETRY' };

// Actors for async operations
const parseWorkItemUrl = fromPromise(async ({ input }: { input: { url: string } }) => {
  const { url } = input;

  // Parse Azure DevOps work item URL
  // Format: https://dev.azure.com/{org}/{project}/_workitems/edit/{id}
  // Format: https://{server}/{collection}/{project}/_workitems/edit/{id} (on-prem)

  const devAzureMatch = url.match(/https:\/\/dev\.azure\.com\/([^/]+)\/([^/]+)\/_workitems/);
  if (devAzureMatch) {
    return {
      organization: devAzureMatch[1],
      project: devAzureMatch[2],
      baseUrl: `https://dev.azure.com/${devAzureMatch[1]}`,
      apiBaseUrl: `https://dev.azure.com/${devAzureMatch[1]}`,
    };
  }

  // On-premises TFS/Azure DevOps Server
  const onPremMatch = url.match(/https?:\/\/([^/]+)\/([^/]+)\/([^/]+)\/_workitems/);
  if (onPremMatch) {
    const server = onPremMatch[1];
    const collection = onPremMatch[2];
    const project = onPremMatch[3];
    return {
      organization: collection,
      project: project,
      baseUrl: `https://${server}/${collection}`,
      apiBaseUrl: `https://${server}/${collection}`,
    };
  }

  throw new Error('Invalid work item URL format');
});

const testConnection = fromPromise(async ({ input }: { input: SetupMachineContext }) => {
  const { organization, project, baseUrl, authMethod, patKey } = input;

  if (!organization || !project || !baseUrl) {
    throw new Error('Missing connection details');
  }

  if (authMethod === 'pat') {
    if (!patKey) {
      throw new Error('PAT token is required');
    }

    // Test PAT connection by making a simple API call
    const testUrl = `${baseUrl}/_apis/projects/${project}?api-version=6.0`;
    const response = await fetch(testUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(`:${patKey}`).toString('base64')}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Connection test failed: ${response.status} ${response.statusText}`);
    }

    return { success: true };
  } else if (authMethod === 'entra') {
    // For Entra ID, we'll just validate the configuration format
    // Actual authentication will be handled by the FSM authentication flow
    // Client ID is now hardcoded in connection machine
    const { tenantId } = input;
    if (!tenantId) {
      throw new Error('Tenant ID is required for Entra ID authentication');
    }

    return { success: true };
  }

  throw new Error('Invalid authentication method');
});

const saveConnection = fromPromise(
  async ({
    input,
  }: {
    input: { context: SetupMachineContext; extensionContext: vscode.ExtensionContext };
  }) => {
    const { context: setupContext, extensionContext } = input;
    const {
      organization,
      project,
      baseUrl,
      apiBaseUrl,
      authMethod,
      patKey,
      tenantId,
      identityName,
    } = setupContext;

    if (!organization || !project || !baseUrl || !authMethod) {
      throw new Error('Missing required connection details');
    }

    // Create new connection config
    const connectionId = randomUUID();
    const connection: ProjectConnection = {
      id: connectionId,
      organization,
      project,
      baseUrl,
      apiBaseUrl: apiBaseUrl || baseUrl,
      authMethod,
      label: `${organization}/${project}`,
    };

    // Add auth-specific fields
    if (authMethod === 'entra') {
      // CRITICAL THINKING: Only store tenantId if it's NOT the default "organizations"
      // This allows tenant discovery during authentication for better tenant matching
      if (tenantId && tenantId !== 'organizations') {
        connection.tenantId = tenantId;
      }
      // Client ID is now hardcoded in connection machine authentication
      if (identityName) {
        connection.identityName = identityName;
      }
    }

    // Get existing connections
    const existingConnections = extensionContext.globalState.get<ProjectConnection[]>(
      'azureDevOpsInt.connections',
      []
    );

    // Check for duplicates
    const duplicate = existingConnections.find(
      (c) => c.organization === organization && c.project === project && c.baseUrl === baseUrl
    );

    if (duplicate) {
      throw new Error(`Connection to ${organization}/${project} already exists`);
    }

    // Save connection
    const updatedConnections = [...existingConnections, connection];
    await extensionContext.globalState.update('azureDevOpsInt.connections', updatedConnections);

    // Save PAT to secure storage if provided
    if (authMethod === 'pat' && patKey) {
      await extensionContext.secrets.store(`azureDevOpsInt.pat.${connectionId}`, patKey);
    }

    return { connectionId };
  }
);

const removeConnection = fromPromise(
  async ({
    input,
  }: {
    input: { connectionId: string; extensionContext: vscode.ExtensionContext };
  }) => {
    const { connectionId, extensionContext } = input;

    // Get existing connections
    const existingConnections = extensionContext.globalState.get<ProjectConnection[]>(
      'azureDevOpsInt.connections',
      []
    );

    // Find connection to remove
    const connectionToRemove = existingConnections.find((c) => c.id === connectionId);
    if (!connectionToRemove) {
      throw new Error('Connection not found');
    }

    // Remove connection
    const updatedConnections = existingConnections.filter((c) => c.id !== connectionId);
    await extensionContext.globalState.update('azureDevOpsInt.connections', updatedConnections);

    // Remove PAT from secure storage if it exists
    if (connectionToRemove.authMethod === 'pat') {
      try {
        await extensionContext.secrets.delete(`azureDevOpsInt.pat.${connectionId}`);
      } catch (error) {
        console.warn('Failed to delete PAT secret:', error);
      }
    }

    return { removedConnectionId: connectionId };
  }
);

const testExistingConnection = fromPromise(
  async ({
    input,
  }: {
    input: { connection: ProjectConnection; extensionContext: vscode.ExtensionContext };
  }): Promise<ExistingConnectionTestResult> => {
    const { connection, extensionContext } = input;

    if (!connection) {
      return {
        success: false,
        message: 'Connection configuration is missing.',
      };
    }

    if (connection.authMethod === 'pat') {
      if (!extensionContext?.secrets) {
        return {
          success: false,
          message: 'VS Code secret storage is unavailable. Cannot read stored PAT.',
        };
      }

      try {
        const patKey = `azureDevOpsInt.pat.${connection.id}`;
        const pat = await extensionContext.secrets.get(patKey);

        if (!pat) {
          return {
            success: false,
            message: 'Personal Access Token not found for this connection.',
          };
        }

        if (!connection.organization || !connection.project) {
          return {
            success: false,
            message: 'Connection is missing organization or project configuration.',
          };
        }

        const candidateBaseUrl = (connection.apiBaseUrl ?? connection.baseUrl ?? '').trim();
        if (!candidateBaseUrl) {
          return {
            success: false,
            message: 'Connection is missing an API base URL.',
          };
        }

        const trimmedBase = candidateBaseUrl.replace(/\/$/, '');
        const apiBaseUrl = trimmedBase.endsWith('_apis') ? trimmedBase : `${trimmedBase}/_apis`;

        const parsed: ParsedAzureDevOpsUrl = {
          organization: connection.organization,
          project: connection.project,
          baseUrl: connection.baseUrl ?? trimmedBase,
          apiBaseUrl,
          isValid: true,
        };

        const result = await testAzureDevOpsConnection(parsed, pat);
        return {
          success: result.success,
          message: result.success
            ? 'Azure DevOps API responded successfully using the stored PAT.'
            : (result.error ?? 'Connection test failed.'),
          error: result.error,
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to use stored PAT: ${error instanceof Error ? error.message : String(error)}`,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    if (connection.authMethod === 'entra') {
      const tenantMessage =
        connection.tenantId && connection.tenantId !== 'organizations'
          ? `Tenant ${connection.tenantId} is configured.`
          : 'Tenant discovery runs automatically during sign-in.';

      return {
        success: true,
        message: `Microsoft Entra ID connections authenticate during interactive sign-in. ${tenantMessage}`,
      };
    }

    return {
      success: false,
      message: 'Unsupported authentication method for connection test.',
    };
  }
);

// FSM-based Setup Machine
export const setupMachine = createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SzAFwK4AcB0BLCANmAMQDKAKgIIBK5A2gAwC6iomA9rLqruwHasQAD0QAmAJwBWbAA4AjKIAs4gOxyZANkUrFkgDQgAnonnYJ4i5slzFt8aIC+Dgygw4AxgAsw7gNa4+KABZdggSRhYkEA4uHn5BEQQZNWx7SQYGGVFJAGYcmQZ9I0QLVMkZPMKNUTysjScXNCxsLx9-QJCw4jo5SLZObl4BKMTkuVTsjKzc-MKDYwQbaTlyyorCyXEVhpBXZvd2AiJ3HkCAVQAnAmIz6gAZAH0ABWoAeQA1AEkAEQBRb4ighig3iI0QcgYOXE2EUGQYojUogYcjkOXmYiUMJ0FhUog02PE9WcuyaHkOx1OUEu1yClAAcpQAOK-B6-AAanwonzpjMBUWBcWGoESNgY0JUyWs4hyGjGuXRCCUomwGlROVEMhxm1EjmJezJRx8lOpxAAwvTTb87nz+rEhglwbDxZK5NLZWp5cUEJI8dhNnINOVspIg7rGm5sJgAIYXLjnK7ECD8MB4PgAN3YvhT+sjMbjVKuCACGfcUcFERt0QGgodiqksgUyjUmm0ugVumhFi7OQDkPxDBUOxz0djAQL1zAFwu7AukYIZYAZjOALbYYd5sfUovp9il8vMSsC+1guvSeRKVTqLQ6IoLGUqFXKCzlCohxTZIek7DoK6-Kcz4hqF+chqAATUPatj2FEwUjSKZslqOYvRyTZsBUPJ1WlHJFBkEM5E-CMfwIP9pwuM0LStCC7VBaCklgyZMgQ2Zb0QLQNFSRQA1WSRVS0cQCOaFAKTHSh0FQTxiEoM5yAACQeIJgJk15vgeUgrV+U1yH+KiQSFYREByFRpB1dI5HQwNbCQhYQ2VbCuwYRRDLMiwBJwISjREsSJIAIUoU0AGkdJrE8xgmdJGJmAoWO9DQGDKCpRFdTUkRlVy1zAYTAlE8TyLpS1rWYIFIJo-S6PGOCIsQ6KNEJR8uNwyR0JyBy0oOQ0TjHU0LkgMA+B4KMCFgYgnkochnjeL4-gBQr+WKvTEgkM9G0vFsbwVCF7GwAMNEDHjYq2dDWvJDzAi6nq+twAaht+OkQMoB5TVeOkADFPl5GbbV02tFobC9m2vNsvQsdj5B28p3xkAp5CO9rKTOsILqu4hfICoKoNKn7zybK9W2q7QVS7ZIdvsZKYcyqB4d6-rBty-K0ZKhb6yxlaAei1Edq2wmn10Hs0tQOA4f4PgPP4RNk1TDMs3SiN+dgQW+GFjr+G3EsyyGCsPqraj5pg8qGOmKr1uRcY7AsZEoRWHa+YFzqhZFvhiEnUi50XFdpeaWX5cVwUVd3NX+A1vota+kL6PCg3mPWlLOcsCV1GazIjoV+2SIAoCQPAzWjwZ8EIRyMxJRqFENBQ9D1ohB8ZCfcRCk0V1UST72hlTsiUcCrO5trFEIRhcLEpwwzlCN8oturyFcPhHjG5T-8yPNPLKI77Wu6dNCXTdOU0S9FE8i27FNQhbb1TS2AozTW3k6Vh2k2FiXM2zL9T-P067av3293Vg8l5D2jRWdIzXQyk3gqZK2ALaBmqDYBQOQT5nwvk3UWTsZwu1QEuC4q4cxP3gfbd+-s+CByKsvUO+c8QITxNoawNQFQqFqg5eqUhCSqhkLAtMYAW6AWAmBemOsyphXgpFKyJhIZgK2BAmoANmF6kfmfNhs9aaLyDtnHhoUKoRyitQxQ7FsL1SMlXQk+EpERmXFGPgUYoBjl+EIXAcsxwcKCB8Fkj06R0g0uQT4T1uFd2lNIH06RmrWEaisOQCpErilEbtXI75GppWMaY8xgRLHWMpPIgqijO4nkAT4yY-iVgemCUDGQfpOI7ShBIV09gwwkgjN1Zc7Bn4U1foKMWt9iz33djgGpdTsFv1aR-AOX80lENojUGufpDI+lyXHPEITEpFKPrFVE5lByGOaJ0+pppGlDEdrPFBaCMFfjWd0n2vS8EENmkMjGUI4q5CMolRqUyNAKhlPnf0O0K7eLuWlNZsjSIcIzp4k8pDypwhlJZCU0oQmyjMMUkuVdcQQy+WAWprD2Hzzpt-YKwzIYPlUH4jI4gKEqEeV6cwo8uw8QyI5HUThiR8FCHAQQ+pCE-1KgAWmJQsVl0guyEgYLFHQWg+WSPDM0fARBmWYtKqicYqoLywmSJCZqigjaKDMBeXFkhHKaIJa1bwfgxydDABK9GiQIFgOKSoNQJctiGRVWqp8RlNXYRqooMmJ1xzGpzosIuYCKgoSSuUVU0UagvPMFIMyCgJQSjSiOfM1JPXKPYgSCwGEzJKpCbYbAA4nxOoqFkROKycBERbgm2sspVXhQyCoSemodBPM1FmgkOFMhQxPhld12VPClpPIGOKyJwo1QkJxJQCo8KyH3qDDUNcDEioNOTSmiNBrdtou+Udpg8QSg7JxatRLrY2JfpfSVSiy35CzeFCuNV5CcSNvCNCF5NQ2stfiaeV8S3nJZSKHU7F0jVDUBKHsNVy67wRMoTUOEa5YRYUc9Gx6Mk6lVQGbIiUKj4lECA0ZMLciEmQ9YFhPyZzLtKtW-O4yMj4lsLC6hjUwHbU2BkSYGoYkmLMRYqx+6oCEZFLcrN2TFpIhDMPM9fqW1EoKIxwt2BDkHoQXpWDwyAzQh2khrVRkdohNdDRnaJcEQ2tlYi5F+GLicbEOhVVNcUOCryDxEJpR1UMOSJoJQR1lyYCIPzCAxnFjccnpCPjGwFRbGVHtXaKwCi+f03UyAnmETqjQkZSE1hVQrDQyS9QshwmwgkBKfjrUTHuAykQDz77JWJCVXrPxPZVD2GVV6LQhTsK4hsBqfIKFJA0ocEAA */
  id: 'setup',
  initial: 'idle',
  types: {
    context: {} as SetupMachineContext,
    events: {} as SetupMachineEvent,
  },
  context: ({ input }: { input?: Partial<SetupMachineContext> }) => ({
    ...input,
    currentStep: 'url' as const,
    existingConnections: input?.existingConnections ?? [],
    extensionContext: input?.extensionContext,
  }),
  states: {
    idle: {
      on: {
        START: {
          target: 'checkingMode',
          actions: assign({
            skipInitialChoice: ({ event }) => event.skipInitialChoice,
          }),
        },
      },
    },

    checkingMode: {
      always: [
        {
          guard: ({ context }) => context.skipInitialChoice === true,
          target: 'managingExisting',
        },
        {
          target: 'collectingUrl',
        },
      ],
    },

    collectingUrl: {
      entry: assign({
        currentStep: 'url',
      }),
      on: {
        URL_PROVIDED: {
          target: 'parsingUrl',
          actions: assign({
            workItemUrl: ({ event }) => event.url,
          }),
        },
        MANAGE_EXISTING: {
          target: 'managingExisting',
        },
        CANCEL: {
          target: 'cancelled',
        },
      },
    },

    parsingUrl: {
      invoke: {
        src: parseWorkItemUrl,
        input: ({ context }) => ({ url: context.workItemUrl! }),
        onDone: {
          target: 'selectingAuth',
          actions: assign({
            organization: ({ event }) => event.output.organization,
            project: ({ event }) => event.output.project,
            baseUrl: ({ event }) => event.output.baseUrl,
            apiBaseUrl: ({ event }) => event.output.apiBaseUrl,
          }),
        },
        onError: {
          target: 'urlError',
          actions: assign({
            error: ({ event }) =>
              (event.error instanceof Error ? event.error.message : String(event.error)) ||
              'Failed to parse URL',
          }),
        },
      },
    },

    urlError: {
      on: {
        RETRY: {
          target: 'collectingUrl',
          actions: assign({
            error: undefined,
          }),
        },
        CANCEL: {
          target: 'cancelled',
        },
      },
    },

    selectingAuth: {
      entry: assign({
        currentStep: 'auth',
      }),
      on: {
        AUTH_METHOD_SELECTED: {
          target: 'collectingCredentials',
          actions: assign({
            authMethod: ({ event }) => event.method,
          }),
        },
        BACK: {
          target: 'collectingUrl',
        },
        CANCEL: {
          target: 'cancelled',
        },
      },
    },

    collectingCredentials: {
      entry: assign({
        currentStep: 'credentials',
      }),
      on: {
        PAT_PROVIDED: {
          target: 'testingConnection',
          actions: assign({
            patKey: ({ event }) => event.token,
          }),
        },
        ENTRA_CONFIG: {
          target: 'testingConnection',
          actions: assign({
            tenantId: ({ event }) => event.tenantId,
            // Client ID is now hardcoded in connection machine
          }),
        },
        BACK: {
          target: 'selectingAuth',
        },
        CANCEL: {
          target: 'cancelled',
        },
      },
    },

    testingConnection: {
      entry: assign({
        currentStep: 'test',
      }),
      invoke: {
        src: testConnection,
        input: ({ context }) => context,
        onDone: {
          target: 'savingConnection',
        },
        onError: {
          target: 'connectionError',
          actions: assign({
            error: ({ event }) =>
              (event.error instanceof Error ? event.error.message : String(event.error)) ||
              'Connection test failed',
          }),
        },
      },
    },

    connectionError: {
      on: {
        RETRY: {
          target: 'testingConnection',
          actions: assign({
            error: undefined,
          }),
        },
        BACK: {
          target: 'collectingCredentials',
        },
        CANCEL: {
          target: 'cancelled',
        },
      },
    },

    savingConnection: {
      invoke: {
        src: saveConnection,
        input: ({ context }) => ({ context, extensionContext: context.extensionContext! }),
        onDone: {
          target: 'completed',
          actions: assign({
            connectionId: ({ event }) => event.output.connectionId,
            currentStep: 'complete',
          }),
        },
        onError: {
          target: 'saveError',
          actions: assign({
            error: ({ event }) =>
              (event.error instanceof Error ? event.error.message : String(event.error)) ||
              'Failed to save connection',
          }),
        },
      },
    },

    saveError: {
      on: {
        RETRY: {
          target: 'savingConnection',
          actions: assign({
            error: undefined,
          }),
        },
        CANCEL: {
          target: 'cancelled',
        },
      },
    },

    managingExisting: {
      on: {
        REMOVE_CONNECTION: {
          target: 'removingConnection',
          actions: assign({
            removedConnectionId: ({ event }) => event.connectionId,
          }),
        },
        TEST_EXISTING_CONNECTION: [
          {
            guard: ({ context }) => Boolean(context.extensionContext),
            target: 'testingExistingConnection',
            actions: assign({
              testingExistingConnection: ({ event }) => event.connection,
              lastExistingTestResult: () => undefined,
              error: () => undefined,
            }),
          },
          {
            target: 'testingExistingResult',
            actions: assign({
              testingExistingConnection: ({ event }) => event.connection,
              lastExistingTestResult: () => ({
                success: false,
                message: 'Extension context is not available. Cannot run connection test.',
              }),
            }),
          },
        ],
        CANCEL: {
          target: 'cancelled',
        },
      },
    },

    testingExistingConnection: {
      entry: assign({
        currentStep: 'test',
        error: () => undefined,
      }),
      invoke: {
        src: testExistingConnection,
        input: ({ context }) => ({
          connection: context.testingExistingConnection!,
          extensionContext: context.extensionContext!,
        }),
        onDone: {
          target: 'testingExistingResult',
          actions: assign({
            lastExistingTestResult: ({ event }) => event.output,
          }),
        },
        onError: {
          target: 'testingExistingResult',
          actions: assign({
            lastExistingTestResult: () => ({
              success: false,
              message: 'Connection test failed due to an unexpected error.',
            }),
            error: ({ event }) =>
              event.error instanceof Error ? event.error.message : String(event.error),
          }),
        },
      },
    },

    testingExistingResult: {
      on: {
        RETRY: {
          target: 'testingExistingConnection',
          actions: assign({
            lastExistingTestResult: () => undefined,
            error: () => undefined,
          }),
        },
        CONTINUE_MANAGING: {
          target: 'managingExisting',
          actions: assign({
            testingExistingConnection: () => undefined,
            lastExistingTestResult: () => undefined,
            error: () => undefined,
          }),
        },
        CANCEL: {
          target: 'cancelled',
        },
      },
    },

    removingConnection: {
      invoke: {
        src: removeConnection,
        input: ({ context }) => ({
          connectionId: context.removedConnectionId!,
          extensionContext: context.extensionContext!,
        }),
        onDone: {
          target: 'removed',
        },
        onError: {
          target: 'removeError',
          actions: assign({
            error: ({ event }) =>
              (event.error instanceof Error ? event.error.message : String(event.error)) ||
              'Failed to remove connection',
          }),
        },
      },
    },

    removeError: {
      on: {
        RETRY: {
          target: 'removingConnection',
          actions: assign({
            error: undefined,
          }),
        },
        CANCEL: {
          target: 'cancelled',
        },
      },
    },

    completed: {
      type: 'final',
    },

    removed: {
      type: 'final',
    },

    cancelled: {
      type: 'final',
    },
  },
});
