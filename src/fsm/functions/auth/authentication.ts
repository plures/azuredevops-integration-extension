import type { ExtensionContext } from 'vscode';

export async function getPat(context: ExtensionContext, patKey?: string): Promise<string> {
  if (!patKey) {
    throw new Error('PAT key is not defined for this connection.');
  }
  const pat = await context.secrets.get(patKey);
  if (!pat) {
    throw new Error(`PAT not found in secret storage for key: ${patKey}`);
  }
  return pat;
}

export async function getEntraIdToken(
  context: ExtensionContext,
  tenantId?: string
): Promise<string> {
  if (!tenantId) {
    throw new Error('Tenant ID is not defined for this connection.');
  }
  // Placeholder for Entra ID token acquisition logic
  // This will be implemented in a future step
  console.log(`Attempting to get Entra ID token for tenant: ${tenantId}`);
  return 'dummy-entra-id-token';
}
