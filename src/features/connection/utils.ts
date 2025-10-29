/**
 * Connection Utilities
 *
 * Utility functions for connection management and token handling.
 */

import type { ProjectConnection } from './types.js';

/**
 * Normalizes expiry time to milliseconds
 */
export const normalizeExpiryToMs = (expiresAt?: Date | number | string): number | undefined => {
  if (!expiresAt) {
    return undefined;
  }

  if (typeof expiresAt === 'number') {
    return expiresAt;
  }

  if (typeof expiresAt === 'string') {
    const parsed = new Date(expiresAt).getTime();
    return isNaN(parsed) ? undefined : parsed;
  }

  if (expiresAt instanceof Date) {
    return expiresAt.getTime();
  }

  return undefined;
};

/**
 * Checks if a token is expired or will expire soon
 */
export const isTokenExpiredOrExpiringSoon = (
  expiresAt?: number,
  bufferMs: number = 5 * 60 * 1000 // 5 minutes
): boolean => {
  if (!expiresAt) {
    return true; // No expiry info means assume expired
  }

  const now = Date.now();
  const bufferTime = now + bufferMs;

  return expiresAt <= bufferTime;
};

/**
 * Calculates time until token expiry
 */
export const getTimeUntilExpiry = (expiresAt?: number): number => {
  if (!expiresAt) {
    return 0;
  }

  const now = Date.now();
  return Math.max(0, expiresAt - now);
};

/**
 * Formats time remaining in human-readable format
 */
export const formatTimeRemaining = (ms: number): string => {
  if (ms <= 0) {
    return 'expired';
  }

  const minutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else {
    return `${minutes}m`;
  }
};

/**
 * Validates connection configuration
 */
export const validateConnectionConfig = (config: ProjectConnection): string[] => {
  const errors: string[] = [];

  if (!config.id) {
    errors.push('Connection ID is required');
  }

  if (!config.organization) {
    errors.push('Organization is required');
  }

  if (!config.project) {
    errors.push('Project is required');
  }

  if (config.authMethod === 'pat' && !config.patKey) {
    errors.push('PAT key is required for PAT authentication');
  }

  if (config.authMethod === 'entra' && !config.tenantId) {
    errors.push('Tenant ID is required for Entra authentication');
  }

  return errors;
};

/**
 * Creates a safe connection label
 */
export const createConnectionLabel = (config: ProjectConnection): string => {
  if (config.label) {
    return config.label;
  }

  return `${config.organization}/${config.project}`;
};

/**
 * Checks if two connections are equivalent
 */
export const areConnectionsEquivalent = (a: ProjectConnection, b: ProjectConnection): boolean => {
  return (
    a.id === b.id &&
    a.organization === b.organization &&
    a.project === b.project &&
    a.authMethod === b.authMethod &&
    a.baseUrl === b.baseUrl
  );
};
