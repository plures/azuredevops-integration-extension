/**
 * PKCE (Proof Key for Code Exchange) Utilities
 *
 * Implements RFC 7636 for OAuth 2.0 Authorization Code Flow with PKCE
 */

import * as crypto from 'crypto';

export interface PKCEParams {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

/**
 * Generate PKCE parameters for authorization code flow
 *
 * @returns PKCE parameters with code verifier and challenge
 */
export function generatePKCEParams(): PKCEParams {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
  };
}

/**
 * Generate a cryptographically random code verifier
 * Must be 43-128 characters, URL-safe base64 encoded
 */
function generateCodeVerifier(): string {
  // Generate 32 random bytes = 256 bits
  // Base64 encoding of 32 bytes = 44 characters (with padding)
  // After removing padding and URL-safe encoding = 43 characters
  const randomBytes = crypto.randomBytes(32);
  return base64URLEncode(randomBytes);
}

/**
 * Generate code challenge from verifier using SHA256
 *
 * @param verifier - The code verifier
 * @returns Base64URL-encoded SHA256 hash
 */
function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64URLEncode(hash);
}

/**
 * Encode buffer as base64url (RFC 4648 Section 5)
 *
 * @param buffer - Buffer to encode
 * @returns Base64URL-encoded string without padding
 */
function base64URLEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Generate a cryptographically random state parameter for CSRF protection
 *
 * @returns Random state string
 */
export function generateState(): string {
  return base64URLEncode(crypto.randomBytes(32));
}

/**
 * Validate code verifier format
 *
 * @param verifier - Code verifier to validate
 * @returns True if valid
 */
export function isValidCodeVerifier(verifier: string): boolean {
  // Must be 43-128 characters
  if (verifier.length < 43 || verifier.length > 128) {
    return false;
  }
  // Must contain only URL-safe characters: A-Z, a-z, 0-9, -, _, ., ~
  return /^[A-Za-z0-9\-_.~]+$/.test(verifier);
}
