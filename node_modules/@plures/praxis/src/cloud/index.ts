/**
 * Praxis Cloud
 *
 * Cloud relay and synchronization for Praxis applications.
 *
 * @example
 * ```typescript
 * import { connectRelay } from "@plures/praxis/cloud";
 *
 * const relay = await connectRelay("https://my-app.azurewebsites.net", {
 *   appId: "my-app",
 *   authToken: "github-token",
 *   autoSync: true
 * });
 *
 * // Sync data
 * await relay.sync({
 *   type: "delta",
 *   appId: "my-app",
 *   clock: {},
 *   facts: [...],
 *   timestamp: Date.now()
 * });
 *
 * // Get usage metrics
 * const usage = await relay.getUsage();
 * console.log(`Syncs: ${usage.syncCount}, Events: ${usage.eventCount}`);
 * ```
 */

// Client
export { createCloudRelay, connectRelay } from './client.js';

// Types
export type {
  CloudRelayConfig,
  CloudRelayClient,
  RelayStatus,
  CRDTSyncMessage,
  UsageMetrics,
  HealthCheckResponse,
  GitHubUser,
  AuthResult,
} from './types.js';

// Authentication
export { GitHubOAuth, createGitHubOAuth, authenticateWithDeviceFlow } from './auth.js';
export type { GitHubOAuthConfig } from './auth.js';

// Billing and Subscriptions
export {
  SubscriptionTier,
  BillingProvider,
  SubscriptionStatus,
  TIER_LIMITS,
  hasAccessToTier,
  checkUsageLimits,
  createFreeSubscription,
  createSponsorSubscription,
} from './billing.js';
export type { TierLimits, Subscription, BillingEvent } from './billing.js';

// GitHub Sponsors
export { GitHubSponsorsClient, createSponsorsClient } from './sponsors.js';
export type { SponsorTier, Sponsorship } from './sponsors.js';

// GitHub Marketplace
export {
  GitHubMarketplaceClient,
  createMarketplaceClient,
  MARKETPLACE_PLANS,
} from './marketplace.js';
export type {
  MarketplacePlan,
  MarketplaceAccount,
  MarketplaceWebhookEvent,
} from './marketplace.js';

// Auto-Provisioning
export {
  generateStorageNamespace,
  generateTenantId,
  createTenant,
  validateStorageNamespace,
  getAppStorageContainer,
  provisionTenant,
  getOrCreateTenant,
} from './provisioning.js';
export type { Tenant, ProvisioningResult } from './provisioning.js';

// Relay endpoints (for Azure Functions deployment)
export {
  healthEndpoint,
  syncEndpoint,
  usageEndpoint,
  statsEndpoint,
  eventsEndpoint,
  schemaEndpoint,
} from './relay/endpoints.js';
export type { AzureContext, AzureHttpRequest, AzureHttpResponse } from './relay/endpoints.js';
