/**
 * User Detection Utilities
 *
 * Detects current Windows user and domain information for OnPremises setup.
 * Works on Windows systems only.
 */

import * as os from 'os';
import { createLogger } from '../../../logging/unifiedLogger.js';

const logger = createLogger('user-detection');

export interface WindowsUserInfo {
  username: string;
  domain: string;
  formatted: string; // DOMAIN\user format
}

/**
 * Detects current Windows user and domain for OnPremises setup
 * Returns formatted username in DOMAIN\user format
 *
 * @returns User info if on Windows and detection successful, null otherwise
 */
export function detectWindowsUser(): WindowsUserInfo | null {
  if (process.platform !== 'win32') {
    return null; // Not Windows
  }

  try {
    const userInfo = os.userInfo();
    const username = userInfo.username;

    // Try to get domain from environment variables
    // USERDOMAIN_ROAMINGPROFILE is most reliable, falls back to USERDOMAIN or COMPUTERNAME
    const domain =
      process.env.USERDOMAIN_ROAMINGPROFILE ||
      process.env.USERDOMAIN ||
      process.env.COMPUTERNAME ||
      '';

    if (!domain) {
      // No domain detected, return username only
      return {
        username,
        domain: '',
        formatted: username,
      };
    }

    // Format as DOMAIN\user (uppercase for consistency)
    const formatted = `${domain}\\${username}`.toUpperCase();

    return {
      username,
      domain: domain.toUpperCase(),
      formatted,
    };
  } catch (error) {
    // Detection failed, return null
    logger.warn('Failed to detect Windows user', { meta: error });
    return null;
  }
}

/**
 * Validates username format for OnPremises connections
 * Accepts: DOMAIN\user, user@domain.com, or user
 *
 * @param username - Username string to validate
 * @returns true if format is valid, false otherwise
 */
export function validateUsernameFormat(username: string): boolean {
  if (!username || typeof username !== 'string') {
    return false;
  }

  const trimmed = username.trim();
  if (trimmed.length === 0) {
    return false;
  }

  // Accept various formats:
  // - DOMAIN\user
  // - user@domain.com
  // - user (single domain)
  // - Any non-empty string (let server validate)
  return trimmed.length > 0;
}

/**
 * Formats username into standard DOMAIN\user format if possible
 *
 * @param username - Username in any format
 * @returns Formatted username or original if cannot format
 */
export function formatUsername(username: string): string {
  if (!username || typeof username !== 'string') {
    return '';
  }

  const trimmed = username.trim();

  // Already in DOMAIN\user format
  if (trimmed.includes('\\')) {
    return trimmed.toUpperCase();
  }

  // Email format - extract user and domain
  if (trimmed.includes('@')) {
    const [user, domain] = trimmed.split('@');
    return `${domain.toUpperCase()}\\${user.toUpperCase()}`;
  }

  // Just username - return as-is (trimmed)
  return trimmed;
}
