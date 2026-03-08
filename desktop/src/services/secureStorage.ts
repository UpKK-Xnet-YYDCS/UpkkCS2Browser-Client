/**
 * Secure Credential Storage Service
 * 
 * This service provides encrypted credential storage with device binding.
 * Features:
 * - AES-256-GCM encryption
 * - Device fingerprint binding (prevents credential theft if file is copied)
 * - Automatic credential persistence
 */

import { invoke } from '@tauri-apps/api/core';

export interface CredentialResponse {
  success: boolean;
  message: string;
  steamid64?: string;
  securecode?: string;
}

/**
 * Save credentials securely with device binding
 * The credentials are encrypted using AES-256-GCM with a key derived from
 * the device's unique identifier, preventing credential theft if the
 * encrypted file is copied to another device.
 */
export async function saveCredentials(
  steamid64: string,
  securecode: string
): Promise<CredentialResponse> {
  try {
    return await invoke<CredentialResponse>('save_credentials', {
      steamid64,
      securecode,
    });
  } catch (error) {
    console.error('[SecureStorage] Failed to save credentials:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Load stored credentials
 * Returns the decrypted credentials if they exist and the device binding matches.
 * If the credentials were copied from another device, decryption will fail.
 */
export async function loadCredentials(): Promise<CredentialResponse> {
  try {
    return await invoke<CredentialResponse>('load_credentials');
  } catch (error) {
    console.error('[SecureStorage] Failed to load credentials:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Clear stored credentials
 */
export async function clearCredentials(): Promise<CredentialResponse> {
  try {
    return await invoke<CredentialResponse>('clear_credentials');
  } catch (error) {
    console.error('[SecureStorage] Failed to clear credentials:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get the device fingerprint
 * This is used for display/debugging purposes
 */
export async function getDeviceFingerprint(): Promise<string> {
  try {
    return await invoke<string>('get_device_fingerprint');
  } catch (error) {
    console.error('[SecureStorage] Failed to get device fingerprint:', error);
    return 'unknown';
  }
}

/**
 * Check if credentials are stored
 */
export async function hasStoredCredentials(): Promise<boolean> {
  try {
    return await invoke<boolean>('has_stored_credentials');
  } catch (error) {
    console.error('[SecureStorage] Failed to check credentials:', error);
    return false;
  }
}
