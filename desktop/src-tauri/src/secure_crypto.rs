use aes_gcm::{
    aead::{Aead, Generate, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use sha2::{Digest, Sha256};
use std::fs;
use std::sync::OnceLock;

// Cached device ID and derived encryption key (computed once, reused for all operations)
static CACHED_DEVICE_ID: OnceLock<String> = OnceLock::new();
static CACHED_DERIVED_KEY: OnceLock<[u8; 32]> = OnceLock::new();

/// Get or create a persistent fallback device ID
pub(crate) fn get_or_create_fallback_device_id() -> String {
    // Try to read existing fallback ID from a file in the user's home directory
    if let Some(home) = dirs::home_dir() {
        let fallback_path = home.join(".xproj-device-id");

        // Try to read existing ID
        if let Ok(existing_id) = fs::read_to_string(&fallback_path) {
            let trimmed = existing_id.trim();
            if trimmed.len() == 32 {
                return trimmed.to_string();
            }
        }

        // Generate new random ID
        let mut random_bytes = [0u8; 16];
        rand::fill(&mut random_bytes);
        let new_id = hex::encode(random_bytes);

        // Try to save it (ignore errors - we'll just use the generated ID)
        let _ = fs::write(&fallback_path, &new_id);

        return new_id;
    }

    // Ultimate fallback: generate random ID (won't persist across restarts)
    let mut random_bytes = [0u8; 16];
    rand::fill(&mut random_bytes);
    hex::encode(random_bytes)
}

/// Get machine unique identifier for device binding (cached after first call)
pub(crate) fn get_device_id() -> &'static str {
    CACHED_DEVICE_ID.get_or_init(|| {
        match machine_uid::get() {
            Ok(id) => {
                // Hash the machine ID for privacy
                let mut hasher = Sha256::new();
                hasher.update(id.as_bytes());
                let result = hasher.finalize();
                hex::encode(&result[..16]) // Use first 16 bytes
            }
            Err(_) => {
                // Fallback: generate and persist a unique device ID
                get_or_create_fallback_device_id()
            }
        }
    })
}

/// Derive encryption key from device ID and app secret (cached after first call)
pub(crate) fn derive_key() -> &'static [u8; 32] {
    CACHED_DERIVED_KEY.get_or_init(|| {
        let device_id = get_device_id();
        let mut hasher = Sha256::new();
        // Combine device ID with app-specific secret
        hasher.update(device_id.as_bytes());
        hasher.update(b"xproj-desktop-secure-v1");
        hasher.update(b"upkk-credential-protection");
        let result = hasher.finalize();
        let mut key = [0u8; 32];
        key.copy_from_slice(&result);
        key
    })
}

/// Encrypt data using AES-256-GCM
pub(crate) fn encrypt_data(data: &str, key: &[u8; 32]) -> Result<String, String> {
    let cipher =
        Aes256Gcm::new_from_slice(key).map_err(|e| format!("Failed to create cipher: {}", e))?;

    // Generate random nonce (12 bytes for AES-GCM)
    let nonce = Nonce::generate();

    // Encrypt
    let ciphertext = cipher
        .encrypt(&nonce, data.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    // Combine nonce + ciphertext and encode as base64 (pre-allocate to avoid realloc)
    let mut combined = Vec::with_capacity(12 + ciphertext.len());
    combined.extend_from_slice(&nonce);
    combined.extend(ciphertext);
    Ok(BASE64_STANDARD.encode(&combined))
}

/// Decrypt data using AES-256-GCM
pub(crate) fn decrypt_data(encrypted: &str, key: &[u8; 32]) -> Result<String, String> {
    let cipher =
        Aes256Gcm::new_from_slice(key).map_err(|e| format!("Failed to create cipher: {}", e))?;

    // Decode base64
    let combined = BASE64_STANDARD
        .decode(encrypted)
        .map_err(|e| format!("Base64 decode failed: {}", e))?;

    if combined.len() < 13 {
        return Err("Invalid encrypted data".to_string());
    }

    // Extract nonce and ciphertext
    let nonce =
        Nonce::try_from(&combined[..12]).map_err(|_| "Invalid encrypted data nonce".to_string())?;
    let ciphertext = &combined[12..];

    // Decrypt
    let plaintext = cipher.decrypt(&nonce, ciphertext).map_err(|_| {
        "Decryption failed - credentials may be corrupted or from another device".to_string()
    })?;

    String::from_utf8(plaintext).map_err(|e| format!("UTF-8 decode failed: {}", e))
}
