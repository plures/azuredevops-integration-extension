/**
 * Helper functions for Entra sign-out operations
 */
import type { ExtensionContext } from "vscode";

/**
 * Clear all Entra ID tokens for a connection
 */
export async function clearAllEntraTokens(
  context: ExtensionContext,
  connection: any,
): Promise<void> {
  const authModule = await import("../../services/auth/authentication.js");
  const { clearEntraIdToken } = authModule;

  const tenantId = connection.tenantId || "organizations";
  const AZURE_DEVOPS_CLIENT_ID = "872cd9fa-d31f-45e0-9eab-6e460a02d1f1";
  const AZURE_CLI_CLIENT_ID = "04b07795-8ddb-461a-bbee-02f9e1bf7b46";

  // Clear tokens for all possible combinations
  await clearEntraIdToken(
    context,
    tenantId,
    connection.clientId || AZURE_DEVOPS_CLIENT_ID,
  );
  await clearEntraIdToken(context, tenantId, AZURE_DEVOPS_CLIENT_ID);
  await clearEntraIdToken(context, tenantId, AZURE_CLI_CLIENT_ID);
  await clearEntraIdToken(context, "organizations", AZURE_DEVOPS_CLIENT_ID);
  await clearEntraIdToken(context, "organizations", AZURE_CLI_CLIENT_ID);
  await clearEntraIdToken(context, "organizations", undefined); // Legacy key without client ID
}

/**
 * Clear auth code flow providers
 */
export async function clearAuthCodeFlowProviders(
  activeConnectionId: string,
): Promise<void> {
  const pendingAuthProviders = (globalThis as any).__pendingAuthProviders as
    | Map<string, any>
    | undefined;
  if (pendingAuthProviders) {
    const provider = pendingAuthProviders.get(activeConnectionId);
    if (provider && typeof provider.signOut === "function") {
      await provider.signOut();
    }
    pendingAuthProviders.delete(activeConnectionId);
  }

  // Also clear any MSAL account cache for this connection
  try {
    const { clearPendingAuthCodeFlowProvider } =
      await import("../../services/auth/authentication.js");
    clearPendingAuthCodeFlowProvider(activeConnectionId);
  } catch {
    // Ignore errors clearing provider
  }
}
