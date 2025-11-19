/**
 * Platform Detection Utility
 *
 * Detects which platform the extension is running on (VS Code or Visual Studio)
 * and creates the appropriate platform adapter.
 */

import type { PlatformAdapter, ExtensionContext } from './PlatformAdapter.js';
import { VSCodeAdapter } from './vscode/VSCodeAdapter.js';
import { VisualStudioAdapter } from './visualstudio/VisualStudioAdapter.js';
import { createLogger } from '../../logging/unifiedLogger.js';

const logger = createLogger('platform-detect');

/**
 * Platform type
 */
export type Platform = 'vscode' | 'visualstudio';

/**
 * Detect the platform the extension is running on
 *
 * @returns The detected platform
 * @throws Error if platform cannot be determined
 */
export function detectPlatform(): Platform {
  // Check environment variables first (most reliable)
  if (typeof process !== 'undefined' && process.env) {
    // Visual Studio may set specific environment variables
    if (process.env.VISUAL_STUDIO_VERSION || process.env.VSINSTALLDIR) {
      return 'visualstudio';
    }
    // VS Code sets VSCODE_PID
    if (process.env.VSCODE_PID) {
      return 'vscode';
    }
  }

  // Check for Visual Studio API
  // Visual Studio may expose APIs differently - this will need to be updated
  // based on actual Visual Studio JavaScript extension API
  if (typeof window !== 'undefined') {
    const vs = (window as any).VisualStudio || (window as any).vs;
    if (vs && typeof vs.commands !== 'undefined') {
      return 'visualstudio';
    }
  }

  // Check for VS Code API (try-catch for safety)
  // Note: We use require() here for dynamic platform detection
  // This is necessary because we can't use static ESM imports for conditional checks
  try {
    // VS Code provides the 'vscode' module via global

    if (typeof require !== 'undefined') {
      // eslint-disable-next-line no-restricted-syntax
      const vscode = require('vscode');
      if (vscode && typeof vscode.commands !== 'undefined') {
        return 'vscode';
      }
    }
  } catch (_e) {
    // require may not be available or vscode module may not be found
  }

  // Default to VS Code if we can't determine (for backward compatibility)
  // This allows existing code to continue working
  logger.warn('Could not determine platform, defaulting to VS Code');
  return 'vscode';
}

/**
 * Create a platform adapter for the detected platform
 *
 * @param context The extension context (platform-specific)
 * @returns A platform adapter instance
 */
export function createPlatformAdapter(context: any): PlatformAdapter {
  const platform = detectPlatform();

  switch (platform) {
    case 'vscode':
      return new VSCodeAdapter(context);
    case 'visualstudio':
      return new VisualStudioAdapter(context);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Get the current platform adapter instance
 * (stored globally for access throughout the extension)
 */
let platformAdapterInstance: PlatformAdapter | undefined;

/**
 * Set the platform adapter instance
 *
 * @param adapter The platform adapter to use
 */
export function setPlatformAdapter(adapter: PlatformAdapter): void {
  platformAdapterInstance = adapter;
}

/**
 * Get the current platform adapter instance
 *
 * @returns The current platform adapter
 * @throws Error if adapter has not been initialized
 */
export function getPlatformAdapter(): PlatformAdapter {
  if (!platformAdapterInstance) {
    throw new Error(
      'Platform adapter not initialized. Call createPlatformAdapter() and setPlatformAdapter() first.'
    );
  }
  return platformAdapterInstance;
}

/**
 * Check if platform adapter has been initialized
 *
 * @returns True if adapter is initialized, false otherwise
 */
export function isPlatformAdapterInitialized(): boolean {
  return platformAdapterInstance !== undefined;
}
