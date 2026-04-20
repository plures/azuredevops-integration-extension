/**
 * GitHub Marketplace API Client
 *
 * Client for GitHub Marketplace SaaS integration (preparatory).
 */

import type { Subscription } from './billing.js';
import { SubscriptionTier, SubscriptionStatus, BillingProvider, TIER_LIMITS } from './billing.js';

/**
 * GitHub Marketplace plan
 */
export interface MarketplacePlan {
  /**
   * Plan ID
   */
  id: number;

  /**
   * Plan name
   */
  name: string;

  /**
   * Plan description
   */
  description: string;

  /**
   * Monthly price in cents
   */
  monthlyPriceInCents: number;

  /**
   * Yearly price in cents
   */
  yearlyPriceInCents: number;

  /**
   * Price model
   */
  priceModel: 'FLAT_RATE' | 'PER_UNIT';

  /**
   * Whether this plan has a free trial
   */
  hasFreeTrial: boolean;

  /**
   * Unit name (for per-unit pricing)
   */
  unitName?: string;

  /**
   * Bullets (features list)
   */
  bullets: string[];
}

/**
 * Marketplace account
 */
export interface MarketplaceAccount {
  /**
   * Account ID
   */
  id: number;

  /**
   * Account login
   */
  login: string;

  /**
   * Account type
   */
  type: 'User' | 'Organization';

  /**
   * Plan
   */
  plan: MarketplacePlan;

  /**
   * Whether account is on free trial
   */
  onFreeTrial: boolean;

  /**
   * Free trial ends on (if applicable)
   */
  freeTrialEndsOn?: string;

  /**
   * Next billing date
   */
  nextBillingDate?: string;
}

/**
 * Marketplace webhook event
 */
export interface MarketplaceWebhookEvent {
  /**
   * Action type
   */
  action: 'purchased' | 'cancelled' | 'changed' | 'pending_change' | 'pending_change_cancelled';

  /**
   * Effective date
   */
  effectiveDate?: string;

  /**
   * Marketplace purchase
   */
  marketplacePurchase: {
    account: MarketplaceAccount;
    billingCycle: 'monthly' | 'yearly';
    unitCount?: number;
    onFreeTrial: boolean;
    freeTrialEndsOn?: string;
    nextBillingDate?: string;
  };

  /**
   * Previous plan (for changes)
   */
  previousMarketplacePurchase?: {
    account: MarketplaceAccount;
    billingCycle: 'monthly' | 'yearly';
    unitCount?: number;
  };
}

/**
 * Praxis Cloud Marketplace plans configuration
 */
export const MARKETPLACE_PLANS = {
  solo: {
    name: 'Praxis Cloud Solo',
    description: 'For individual developers',
    monthlyPriceInCents: 500, // $5/month
    yearlyPriceInCents: 5000, // $50/year (2 months free)
    features: ['50,000 syncs/month', '1 GB storage', '10 apps/projects', 'Standard support'],
  },
  team: {
    name: 'Praxis Cloud Team',
    description: 'For small teams',
    monthlyPriceInCents: 2000, // $20/month
    yearlyPriceInCents: 20000, // $200/year (2 months free)
    features: [
      '500,000 syncs/month',
      '10 GB storage',
      '50 apps/projects',
      'Up to 10 team members',
      'Standard support',
    ],
  },
  enterprise: {
    name: 'Praxis Cloud Enterprise',
    description: 'For large teams and organizations',
    monthlyPriceInCents: 5000, // $50/month
    yearlyPriceInCents: 50000, // $500/year (2 months free)
    features: [
      '5,000,000 syncs/month',
      '100 GB storage',
      '1,000 apps/projects',
      'Unlimited team members',
      'Priority support',
      'SLA guarantees',
    ],
  },
};

/**
 * GitHub Marketplace API client
 */
export class GitHubMarketplaceClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  /**
   * Get accounts for the authenticated user
   */
  async getAccounts(): Promise<MarketplaceAccount[]> {
    try {
      const response = await fetch('https://api.github.com/marketplace_listing/accounts', {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      return (await response.json()) as MarketplaceAccount[];
    } catch (error) {
      console.error('Failed to get marketplace accounts:', error);
      return [];
    }
  }

  /**
   * Get subscription from marketplace account
   */
  async getSubscription(accountId: number): Promise<Subscription | null> {
    const accounts = await this.getAccounts();
    const account = accounts.find((a) => a.id === accountId);

    if (!account) {
      return null;
    }

    // Map plan to tier
    let tier = SubscriptionTier.FREE;
    if (account.plan.monthlyPriceInCents >= 5000) {
      tier = SubscriptionTier.ENTERPRISE;
    } else if (account.plan.monthlyPriceInCents >= 2000) {
      tier = SubscriptionTier.TEAM;
    } else if (account.plan.monthlyPriceInCents >= 500) {
      tier = SubscriptionTier.SOLO;
    }

    return {
      tier,
      status: SubscriptionStatus.ACTIVE,
      provider: BillingProvider.MARKETPLACE,
      marketplacePlanId: account.plan.id,
      startDate:
        account.onFreeTrial && account.freeTrialEndsOn
          ? new Date(account.freeTrialEndsOn).getTime()
          : Date.now(),
      periodEnd: account.nextBillingDate ? new Date(account.nextBillingDate).getTime() : undefined,
      autoRenew: true,
      limits: TIER_LIMITS[tier],
    };
  }

  /**
   * Handle marketplace webhook event
   */
  handleWebhookEvent(event: MarketplaceWebhookEvent): {
    userId: number;
    userLogin: string;
    subscription: Subscription;
  } | null {
    const account = event.marketplacePurchase.account;

    if (event.action === 'cancelled') {
      // Handle cancellation
      return null;
    }

    // Map plan to tier
    let tier = SubscriptionTier.FREE;
    if (account.plan.monthlyPriceInCents >= 5000) {
      tier = SubscriptionTier.ENTERPRISE;
    } else if (account.plan.monthlyPriceInCents >= 2000) {
      tier = SubscriptionTier.TEAM;
    } else if (account.plan.monthlyPriceInCents >= 500) {
      tier = SubscriptionTier.SOLO;
    }

    return {
      userId: account.id,
      userLogin: account.login,
      subscription: {
        tier,
        status: SubscriptionStatus.ACTIVE,
        provider: BillingProvider.MARKETPLACE,
        marketplacePlanId: account.plan.id,
        startDate: Date.now(),
        periodEnd: event.marketplacePurchase.nextBillingDate
          ? new Date(event.marketplacePurchase.nextBillingDate).getTime()
          : undefined,
        autoRenew: true,
        limits: TIER_LIMITS[tier],
      },
    };
  }
}

/**
 * Create a GitHub Marketplace client
 */
export function createMarketplaceClient(token: string): GitHubMarketplaceClient {
  return new GitHubMarketplaceClient(token);
}
