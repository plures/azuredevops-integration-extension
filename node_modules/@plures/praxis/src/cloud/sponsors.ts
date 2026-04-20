/**
 * GitHub Sponsors API Client
 *
 * Client for checking GitHub Sponsors subscription status.
 */

import type { Subscription } from './billing.js';
import { createSponsorSubscription, createFreeSubscription } from './billing.js';

/**
 * GitHub Sponsors tier information
 */
export interface SponsorTier {
  /**
   * Tier ID
   */
  id: string;

  /**
   * Tier name
   */
  name: string;

  /**
   * Monthly price in cents
   */
  monthlyPriceInCents: number;

  /**
   * Tier description
   */
  description?: string;

  /**
   * Whether this is a one-time sponsorship
   */
  isOneTime: boolean;
}

/**
 * Sponsorship information
 */
export interface Sponsorship {
  /**
   * Sponsor login
   */
  sponsorLogin: string;

  /**
   * Sponsor ID
   */
  sponsorId: number;

  /**
   * Tier information
   */
  tier: SponsorTier;

  /**
   * Creation date
   */
  createdAt: string;

  /**
   * Whether sponsorship is active
   */
  isActive: boolean;
}

/**
 * GitHub Sponsors API client
 */
export class GitHubSponsorsClient {
  private token: string;
  private accountLogin: string;

  constructor(token: string, accountLogin: string) {
    this.token = token;
    this.accountLogin = accountLogin;
  }

  /**
   * Get current user's sponsorship of the Praxis account
   */
  async getSponsorship(userLogin: string): Promise<Sponsorship | null> {
    try {
      const query = `
        query($accountLogin: String!, $userLogin: String!) {
          user(login: $userLogin) {
            sponsorshipForViewerAsSponsor(activeOnly: true) {
              tier {
                id
                name
                monthlyPriceInCents
                description
                isOneTime
              }
              createdAt
              isActive
            }
            sponsorshipsAsSponsor(first: 100, activeOnly: true) {
              nodes {
                sponsorable {
                  ... on User {
                    login
                  }
                  ... on Organization {
                    login
                  }
                }
                tier {
                  id
                  name
                  monthlyPriceInCents
                  description
                  isOneTime
                }
                createdAt
                isActive
              }
            }
          }
        }
      `;

      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            accountLogin: this.accountLogin,
            userLogin,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const data = (await response.json()) as any;

      if (data.errors) {
        throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
      }

      // Check if user sponsors the Praxis account
      const sponsorships = data.data?.user?.sponsorshipsAsSponsor?.nodes || [];
      const praxisSponsorship = sponsorships.find(
        (s: any) => s.sponsorable?.login === this.accountLogin
      );

      if (!praxisSponsorship) {
        return null;
      }

      return {
        sponsorLogin: userLogin,
        sponsorId: data.data.user.id,
        tier: {
          id: praxisSponsorship.tier.id,
          name: praxisSponsorship.tier.name,
          monthlyPriceInCents: praxisSponsorship.tier.monthlyPriceInCents,
          description: praxisSponsorship.tier.description,
          isOneTime: praxisSponsorship.tier.isOneTime,
        },
        createdAt: praxisSponsorship.createdAt,
        isActive: praxisSponsorship.isActive,
      };
    } catch (error) {
      console.error('Failed to get sponsorship:', error);
      return null;
    }
  }

  /**
   * Get subscription from sponsorship
   */
  async getSubscription(userLogin: string): Promise<Subscription> {
    const sponsorship = await this.getSponsorship(userLogin);

    if (!sponsorship || !sponsorship.isActive) {
      return createFreeSubscription();
    }

    return createSponsorSubscription(sponsorship.tier.name, sponsorship.tier.monthlyPriceInCents);
  }

  /**
   * Check if user is a sponsor
   */
  async isSponsor(userLogin: string): Promise<boolean> {
    const sponsorship = await this.getSponsorship(userLogin);
    return sponsorship !== null && sponsorship.isActive;
  }
}

/**
 * Create a GitHub Sponsors client
 */
export function createSponsorsClient(
  token: string,
  accountLogin: string = 'plures'
): GitHubSponsorsClient {
  return new GitHubSponsorsClient(token, accountLogin);
}
