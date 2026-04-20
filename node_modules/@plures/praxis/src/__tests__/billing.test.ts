/**
 * Billing Tests
 *
 * Tests for billing types and utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  SubscriptionTier,
  SubscriptionStatus,
  BillingProvider,
  TIER_LIMITS,
  hasAccessToTier,
  checkUsageLimits,
  createFreeSubscription,
  createSponsorSubscription,
} from '../cloud/billing.js';

describe('Billing', () => {
  describe('Tier Limits', () => {
    it('should have limits for all tiers', () => {
      expect(TIER_LIMITS[SubscriptionTier.FREE]).toBeDefined();
      expect(TIER_LIMITS[SubscriptionTier.SOLO]).toBeDefined();
      expect(TIER_LIMITS[SubscriptionTier.TEAM]).toBeDefined();
      expect(TIER_LIMITS[SubscriptionTier.ENTERPRISE]).toBeDefined();
    });

    it('should have increasing limits for higher tiers', () => {
      expect(TIER_LIMITS[SubscriptionTier.SOLO].maxSyncsPerMonth).toBeGreaterThan(
        TIER_LIMITS[SubscriptionTier.FREE].maxSyncsPerMonth
      );
      expect(TIER_LIMITS[SubscriptionTier.TEAM].maxSyncsPerMonth).toBeGreaterThan(
        TIER_LIMITS[SubscriptionTier.SOLO].maxSyncsPerMonth
      );
      expect(TIER_LIMITS[SubscriptionTier.ENTERPRISE].maxSyncsPerMonth).toBeGreaterThan(
        TIER_LIMITS[SubscriptionTier.TEAM].maxSyncsPerMonth
      );
    });
  });

  describe('hasAccessToTier', () => {
    it('should grant access to same tier', () => {
      const subscription = createFreeSubscription();
      expect(hasAccessToTier(subscription, SubscriptionTier.FREE)).toBe(true);
    });

    it('should grant access to lower tiers', () => {
      const subscription = {
        ...createFreeSubscription(),
        tier: SubscriptionTier.ENTERPRISE,
      };
      expect(hasAccessToTier(subscription, SubscriptionTier.FREE)).toBe(true);
      expect(hasAccessToTier(subscription, SubscriptionTier.SOLO)).toBe(true);
      expect(hasAccessToTier(subscription, SubscriptionTier.TEAM)).toBe(true);
    });

    it('should deny access to higher tiers', () => {
      const subscription = createFreeSubscription();
      expect(hasAccessToTier(subscription, SubscriptionTier.SOLO)).toBe(false);
      expect(hasAccessToTier(subscription, SubscriptionTier.TEAM)).toBe(false);
      expect(hasAccessToTier(subscription, SubscriptionTier.ENTERPRISE)).toBe(false);
    });

    it('should deny access if subscription is not active', () => {
      const subscription = {
        ...createFreeSubscription(),
        status: SubscriptionStatus.EXPIRED,
      };
      expect(hasAccessToTier(subscription, SubscriptionTier.FREE)).toBe(false);
    });
  });

  describe('checkUsageLimits', () => {
    it('should pass when usage is within limits', () => {
      const subscription = createFreeSubscription();
      const result = checkUsageLimits(subscription, {
        syncCount: 500,
        storageBytes: 5 * 1024 * 1024, // 5 MB
        teamMembers: 1,
        appCount: 1,
      });
      expect(result.withinLimits).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail when sync count exceeds limit', () => {
      const subscription = createFreeSubscription();
      const result = checkUsageLimits(subscription, {
        syncCount: 2000,
        storageBytes: 0,
        teamMembers: 1,
        appCount: 1,
      });
      expect(result.withinLimits).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]).toContain('Sync limit exceeded');
    });

    it('should fail when storage exceeds limit', () => {
      const subscription = createFreeSubscription();
      const result = checkUsageLimits(subscription, {
        syncCount: 0,
        storageBytes: 20 * 1024 * 1024, // 20 MB
        teamMembers: 1,
        appCount: 1,
      });
      expect(result.withinLimits).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]).toContain('Storage limit exceeded');
    });

    it('should fail when team members exceed limit', () => {
      const subscription = createFreeSubscription();
      const result = checkUsageLimits(subscription, {
        syncCount: 0,
        storageBytes: 0,
        teamMembers: 5,
        appCount: 1,
      });
      expect(result.withinLimits).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]).toContain('Team member limit exceeded');
    });

    it('should allow unlimited team members for enterprise', () => {
      const subscription = {
        ...createFreeSubscription(),
        tier: SubscriptionTier.ENTERPRISE,
        limits: TIER_LIMITS[SubscriptionTier.ENTERPRISE],
      };
      const result = checkUsageLimits(subscription, {
        syncCount: 0,
        storageBytes: 0,
        teamMembers: 1000,
        appCount: 1,
      });
      expect(result.withinLimits).toBe(true);
    });
  });

  describe('createFreeSubscription', () => {
    it('should create a free subscription', () => {
      const subscription = createFreeSubscription();
      expect(subscription.tier).toBe(SubscriptionTier.FREE);
      expect(subscription.status).toBe(SubscriptionStatus.ACTIVE);
      expect(subscription.provider).toBe(BillingProvider.NONE);
      expect(subscription.autoRenew).toBe(true);
    });
  });

  describe('createSponsorSubscription', () => {
    it('should create solo tier for $5/month', () => {
      const subscription = createSponsorSubscription('Solo', 500);
      expect(subscription.tier).toBe(SubscriptionTier.SOLO);
      expect(subscription.provider).toBe(BillingProvider.SPONSORS);
    });

    it('should create team tier for $20/month', () => {
      const subscription = createSponsorSubscription('Team', 2000);
      expect(subscription.tier).toBe(SubscriptionTier.TEAM);
      expect(subscription.provider).toBe(BillingProvider.SPONSORS);
    });

    it('should create enterprise tier for $50/month', () => {
      const subscription = createSponsorSubscription('Enterprise', 5000);
      expect(subscription.tier).toBe(SubscriptionTier.ENTERPRISE);
      expect(subscription.provider).toBe(BillingProvider.SPONSORS);
    });

    it('should default to free tier for low amounts', () => {
      const subscription = createSponsorSubscription('Supporter', 100);
      expect(subscription.tier).toBe(SubscriptionTier.FREE);
    });
  });
});
