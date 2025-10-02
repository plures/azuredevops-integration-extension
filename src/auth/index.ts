/**
 * Authentication Module
 * Exports all authentication-related types and services
 */

export { AuthService, createAuthService } from './authService.js';
export { PatAuthProvider } from './patAuthProvider.js';
export { EntraAuthProvider } from './entraAuthProvider.js';
export type {
  AuthMethod,
  AuthenticationResult,
  TokenInfo,
  IAuthProvider,
  PatAuthConfig,
  EntraAuthConfig,
  DeviceCodeCallback,
  DeviceCodeResponse,
} from './types.js';
