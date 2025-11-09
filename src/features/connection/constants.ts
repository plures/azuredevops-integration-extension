/**
 * Module: src/features/connection/constants.ts
 * Owner: connection
 * Reads: (document)
 * Writes: (document)
 * Receives: (document)
 * Emits: (document)
 * Prohibitions: Do not mutate ApplicationContext directly; Do not define new *Context types
 * Rationale: (document)
 *
 * LLM-GUARD:
 * - Follow ownership boundaries; route events to Router; do not add UI logic here
 */
/**
 * Connection Constants
 *
 * Core Azure DevOps identifiers used across authentication flows.
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

// Core Azure DevOps identifiers used across authentication flows
export const AZURE_DEVOPS_PUBLIC_CLIENT_ID = '872cd9fa-d31f-45e0-9eab-6e460a02d1f1';
export const AZURE_DEVOPS_SCOPE = '499b84ac-1321-427f-aa17-267ca6975798/.default';

// Connection configuration constants
export const MAX_RETRY_COUNT = 3;
export const REFRESH_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes
export const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiry
export const INTERACTIVE_AUTH_COOLDOWN_MS = 30 * 1000; // 30 seconds

// Default connection settings
export const DEFAULT_AUTH_METHOD = 'pat' as const;
export const DEFAULT_BASE_URL = 'https://dev.azure.com';
