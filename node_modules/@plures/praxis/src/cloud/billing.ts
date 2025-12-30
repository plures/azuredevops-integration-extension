/**
 * GitHub Sponsors and Marketplace Billing
 *
 * Types and utilities for GitHub-based monetization.
 */

/**
 * Praxis Cloud subscription tiers
 */
export enum SubscriptionTier {
  /**
   * Free tier - limited usage
   */
  FREE = 'free',

  /**
   * Solo tier - individual developers via GitHub Sponsors
   */
  SOLO = 'solo',

  /**
   * Team tier - small teams via GitHub Sponsors
   */
  TEAM = 'team',

  /**
   * Enterprise tier - self-service enterprise via GitHub Sponsors/Marketplace
   */
  ENTERPRISE = 'enterprise',
}

/**
 * Billing provider type
 */
export enum BillingProvider {
  /**
   * GitHub Sponsors
   */
  SPONSORS = 'sponsors',

  /**
   * GitHub Marketplace (SaaS)
   */
  MARKETPLACE = 'marketplace',

  /**
   * Free tier (no billing)
   */
  NONE = 'none',
}

/**
 * Subscription status
 */
export enum SubscriptionStatus {
  /**
   * Active subscription
   */
  ACTIVE = 'active',

  /**
   * Subscription cancelled, but still valid until period end
   */
  CANCELLED = 'cancelled',

  /**
   * Subscription expired or payment failed
   */
  EXPIRED = 'expired',

  /**
   * No subscription
   */
  NONE = 'none',
}

/**
 * Tier limits for different subscription levels
 */
export interface TierLimits {
  /**
   * Maximum sync operations per month
   */
  maxSyncsPerMonth: number;

  /**
   * Maximum storage in bytes
   */
  maxStorageBytes: number;

  /**
   * Maximum number of team members (null = unlimited)
   */
  maxTeamMembers: number | null;

  /**
   * Maximum number of apps/projects
   */
  maxApps: number;

  /**
   * Support level
   */
  supportLevel: 'community' | 'standard' | 'priority';
}

/**
 * Subscription information
 */
export interface Subscription {
  /**
   * Subscription tier
   */
  tier: SubscriptionTier;

  /**
   * Subscription status
   */
  status: SubscriptionStatus;

  /**
   * Billing provider
   */
  provider: BillingProvider;

  /**
   * GitHub sponsor tier ID (if applicable)
   */
  sponsorTierId?: string;

  /**
   * GitHub Marketplace plan ID (if applicable)
   */
  marketplacePlanId?: number;

  /**
   * Subscription start date
   */
  startDate: number;

  /**
   * Current period end date
   */
  periodEnd?: number;

  /**
   * Whether subscription auto-renews
   */
  autoRenew: boolean;

  /**
   * Usage limits for this tier
   */
  limits: TierLimits;
}

/**
 * Billing event type
 */
export interface BillingEvent {
  /**
   * Event type
   */
  type: 'subscription_created' | 'subscription_cancelled' | 'subscription_renewed' | 'tier_changed';

  /**
   * Timestamp
   */
  timestamp: number;

  /**
   * User/organization ID
   */
  userId: number;

  /**
   * Old subscription (for changes)
   */
  oldSubscription?: Subscription;

  /**
   * New subscription
   */
  newSubscription: Subscription;
}

/**
 * Default tier limits
 */
export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  [SubscriptionTier.FREE]: {
    maxSyncsPerMonth: 1000,
    maxStorageBytes: 10 * 1024 * 1024, // 10 MB
    maxTeamMembers: 1,
    maxApps: 1,
    supportLevel: 'community',
  },
  [SubscriptionTier.SOLO]: {
    maxSyncsPerMonth: 50000,
    maxStorageBytes: 1024 * 1024 * 1024, // 1 GB
    maxTeamMembers: 1,
    maxApps: 10,
    supportLevel: 'standard',
  },
  [SubscriptionTier.TEAM]: {
    maxSyncsPerMonth: 500000,
    maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10 GB
    maxTeamMembers: 10,
    maxApps: 50,
    supportLevel: 'standard',
  },
  [SubscriptionTier.ENTERPRISE]: {
    maxSyncsPerMonth: 5000000,
    maxStorageBytes: 100 * 1024 * 1024 * 1024, // 100 GB
    maxTeamMembers: null, // unlimited
    maxApps: 1000,
    supportLevel: 'priority',
  },
};

/**
 * Check if a user has access to a specific tier
 */
export function hasAccessToTier(
  subscription: Subscription,
  requiredTier: SubscriptionTier
): boolean {
  if (subscription.status !== SubscriptionStatus.ACTIVE) {
    return false;
  }

  const tierOrder = [
    SubscriptionTier.FREE,
    SubscriptionTier.SOLO,
    SubscriptionTier.TEAM,
    SubscriptionTier.ENTERPRISE,
  ];

  const currentTierIndex = tierOrder.indexOf(subscription.tier);
  const requiredTierIndex = tierOrder.indexOf(requiredTier);

  return currentTierIndex >= requiredTierIndex;
}

/**
 * Check if usage is within tier limits
 */
export function checkUsageLimits(
  subscription: Subscription,
  usage: {
    syncCount: number;
    storageBytes: number;
    teamMembers: number;
    appCount: number;
  }
): {
  withinLimits: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  if (usage.syncCount > subscription.limits.maxSyncsPerMonth) {
    violations.push(
      `Sync limit exceeded: ${usage.syncCount}/${subscription.limits.maxSyncsPerMonth}`
    );
  }

  if (usage.storageBytes > subscription.limits.maxStorageBytes) {
    violations.push(
      `Storage limit exceeded: ${(usage.storageBytes / 1024 / 1024).toFixed(2)}MB/${(subscription.limits.maxStorageBytes / 1024 / 1024).toFixed(2)}MB`
    );
  }

  if (
    subscription.limits.maxTeamMembers !== null &&
    usage.teamMembers > subscription.limits.maxTeamMembers
  ) {
    violations.push(
      `Team member limit exceeded: ${usage.teamMembers}/${subscription.limits.maxTeamMembers}`
    );
  }

  if (usage.appCount > subscription.limits.maxApps) {
    violations.push(`App limit exceeded: ${usage.appCount}/${subscription.limits.maxApps}`);
  }

  return {
    withinLimits: violations.length === 0,
    violations,
  };
}

/**
 * Create a free tier subscription
 */
export function createFreeSubscription(): Subscription {
  return {
    tier: SubscriptionTier.FREE,
    status: SubscriptionStatus.ACTIVE,
    provider: BillingProvider.NONE,
    startDate: Date.now(),
    autoRenew: true,
    limits: TIER_LIMITS[SubscriptionTier.FREE],
  };
}

/**
 * Create a subscription from GitHub Sponsors tier
 */
export function createSponsorSubscription(
  tierName: string,
  monthlyPriceInCents: number
): Subscription {
  let tier = SubscriptionTier.FREE;

  // Map price to tier (example pricing)
  if (monthlyPriceInCents >= 5000) {
    // $50/month
    tier = SubscriptionTier.ENTERPRISE;
  } else if (monthlyPriceInCents >= 2000) {
    // $20/month
    tier = SubscriptionTier.TEAM;
  } else if (monthlyPriceInCents >= 500) {
    // $5/month
    tier = SubscriptionTier.SOLO;
  }

  return {
    tier,
    status: SubscriptionStatus.ACTIVE,
    provider: BillingProvider.SPONSORS,
    sponsorTierId: tierName,
    startDate: Date.now(),
    autoRenew: true,
    limits: TIER_LIMITS[tier],
  };
}
