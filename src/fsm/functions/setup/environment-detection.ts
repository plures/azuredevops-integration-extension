/**
 * Module: src/fsm/functions/setup/environment-detection.ts
 * Owner: application
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
 * Environment Detection Utilities
 *
 * Determines whether a parsed Azure DevOps URL is for Online (Azure DevOps Services)
 * or OnPremises (Azure DevOps Server) based on URL structure.
 */

import type { ParsedAzureDevOpsUrl } from '../../../azureDevOpsUrlParser.js';

export type EnvironmentType = 'online' | 'onpremises';

/**
 * Determines if a parsed Azure DevOps URL is for Online or OnPremises
 *
 * @param parsedUrl - Parsed Azure DevOps URL
 * @returns 'online' for Azure DevOps Services, 'onpremises' for Azure DevOps Server
 */
export function detectEnvironmentType(parsedUrl: ParsedAzureDevOpsUrl): EnvironmentType {
  if (!parsedUrl.isValid || !parsedUrl.baseUrl) {
    // Default to onpremises for invalid URLs (safer fallback)
    return 'onpremises';
  }

  try {
    const host = new URL(parsedUrl.baseUrl).hostname.toLowerCase();

    // Online environments
    if (
      host === 'dev.azure.com' ||
      host.endsWith('.dev.azure.com') ||
      host.endsWith('.visualstudio.com') ||
      host.endsWith('.vsrm.visualstudio.com')
    ) {
      return 'online';
    }

    // Everything else is onpremises
    return 'onpremises';
  } catch {
    // If URL parsing fails, default to onpremises
    return 'onpremises';
  }
}

/**
 * Gets a user-friendly label for the environment type
 *
 * @param environment - Environment type
 * @returns Human-readable label
 */
export function getEnvironmentLabel(environment: EnvironmentType): string {
  return environment === 'online'
    ? 'Azure DevOps Services (Online)'
    : 'Azure DevOps Server (OnPremises)';
}
