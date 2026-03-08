/**
 * Update service for checking and handling application updates
 * 
 * Update server URL: https://update-software.upkk.com/xproj-server-clients/update.json
 * 
 * Expected JSON format for update.json:
 * {
 *   "version": "1.0.1",                              // Latest version string (semver format)
 *   "release_date": "2026-02-07",                    // Release date
 *   "download_url": "https://update-software.upkk.com/xproj-server-clients/releases/1.0.1/upkk-server-browser-1.0.1-setup.exe",
 *   "changelog": "- 新增功能A\n- 修复问题B\n- 优化性能C",
 *   "mandatory": false,                              // If true, user must update
 *   "min_version": "0.9.0"                           // Minimum supported version (optional)
 * }
 */

import { XPROJ_USER_AGENT } from '@/api';

// Current app version - auto-read from version.txt via Vite compile-time define
// Version is centralized in desktop/version.txt for easy maintenance
export const APP_VERSION = __XPROJ_APP_VERSION__;

// Update server URL
const UPDATE_URL = 'https://update-software.upkk.com/xproj-server-clients/update.json';

// Update info interface
export interface UpdateInfo {
  version: string;
  release_date?: string;
  download_url?: string;
  changelog?: string;
  mandatory?: boolean;
  min_version?: string;
}

// Check result interface
export interface UpdateCheckResult {
  hasUpdate: boolean;
  updateInfo?: UpdateInfo;
  currentVersion: string;
  error?: string;
}

/**
 * Compare two semver version strings
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(n => parseInt(n, 10) || 0);
  const partsB = b.split('.').map(n => parseInt(n, 10) || 0);
  
  const maxLength = Math.max(partsA.length, partsB.length);
  
  for (let i = 0; i < maxLength; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  
  return 0;
}

/**
 * Check for updates from the update server
 * Called once when the application starts
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  try {
    // Try using Tauri HTTP plugin first (bypasses CORS restrictions)
    let response: Response;
    
    try {
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
      response = await tauriFetch(UPDATE_URL, {
        method: 'GET',
        headers: {
          'User-Agent': XPROJ_USER_AGENT,
          'X-Client-Version': APP_VERSION,
          'Cache-Control': 'no-cache',
        },
      });
    } catch {
      // Fallback to regular fetch if Tauri HTTP is not available
      response = await fetch(UPDATE_URL, {
        method: 'GET',
        headers: {
          'X-Client-Version': APP_VERSION,
          'Cache-Control': 'no-cache',
        },
      });
    }

    if (!response.ok) {
      return {
        hasUpdate: false,
        currentVersion: APP_VERSION,
        error: `Failed to check for updates: HTTP ${response.status}`,
      };
    }

    const updateInfo: UpdateInfo = await response.json();

    // Validate the response
    if (!updateInfo.version) {
      return {
        hasUpdate: false,
        currentVersion: APP_VERSION,
        error: 'Invalid update info: missing version',
      };
    }

    // Compare versions
    const hasUpdate = compareVersions(updateInfo.version, APP_VERSION) > 0;

    // Check if current version is below minimum supported version
    if (updateInfo.min_version) {
      const isBelowMinimum = compareVersions(APP_VERSION, updateInfo.min_version) < 0;
      if (isBelowMinimum) {
        // Force update if below minimum version
        updateInfo.mandatory = true;
      }
    }

    return {
      hasUpdate,
      updateInfo: hasUpdate ? updateInfo : undefined,
      currentVersion: APP_VERSION,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Update] Failed to check for updates:', errorMessage);
    
    return {
      hasUpdate: false,
      currentVersion: APP_VERSION,
      error: `Failed to check for updates: ${errorMessage}`,
    };
  }
}

/**
 * Open the download URL in the default browser
 */
export async function openDownloadUrl(url: string): Promise<void> {
  try {
    const { open } = await import('@tauri-apps/plugin-shell');
    await open(url);
  } catch (error) {
    // Fallback to window.open if Tauri shell is not available
    console.error('[Update] Failed to open URL with Tauri shell:', error);
    window.open(url, '_blank');
  }
}

/**
 * Get the last dismissed update version from localStorage
 */
export function getDismissedVersion(): string | null {
  try {
    return localStorage.getItem('xproj-dismissed-update-version');
  } catch {
    return null;
  }
}

/**
 * Save the dismissed update version to localStorage
 * User won't be prompted again for this version
 */
export function setDismissedVersion(version: string): void {
  try {
    localStorage.setItem('xproj-dismissed-update-version', version);
  } catch {
    console.error('[Update] Failed to save dismissed version');
  }
}

/**
 * Check if user has already dismissed this update version
 */
export function isUpdateDismissed(version: string): boolean {
  const dismissed = getDismissedVersion();
  return dismissed === version;
}
