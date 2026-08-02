use aes_gcm::{
    aead::{Aead, Generate, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use std::sync::OnceLock;
use tauri::Manager;

// Cached device ID and derived encryption key (computed once, reused for all operations)
static CACHED_DEVICE_ID: OnceLock<String> = OnceLock::new();
static CACHED_DERIVED_KEY: OnceLock<[u8; 32]> = OnceLock::new();

/// Stored credentials structure
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct StoredCredentials {
    pub steamid64: String,
    pub securecode: String,
    pub device_id: String,
    pub created_at: u64,
}

/// Response for credential operations
#[derive(serde::Serialize, Clone, Debug)]
pub struct CredentialResponse {
    pub success: bool,
    pub message: String,
    pub steamid64: Option<String>,
    pub securecode: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct StoredApiToken {
    token: String,
    device_id: String,
    created_at: u64,
}

#[derive(serde::Serialize, Clone, Debug)]
pub struct ApiTokenResponse {
    pub success: bool,
    pub message: String,
    pub token: Option<String>,
}

/// Get or create a persistent fallback device ID
fn get_or_create_fallback_device_id() -> String {
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
fn get_device_id() -> &'static str {
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
fn derive_key() -> &'static [u8; 32] {
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
fn encrypt_data(data: &str, key: &[u8; 32]) -> Result<String, String> {
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
fn decrypt_data(encrypted: &str, key: &[u8; 32]) -> Result<String, String> {
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

/// Get credentials file path
fn get_credentials_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    // Ensure directory exists
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;

    Ok(app_data_dir.join("credentials.enc"))
}

fn get_api_token_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;

    Ok(app_data_dir.join("api-token.enc"))
}

#[tauri::command]
pub async fn save_api_token(
    app: tauri::AppHandle,
    token: String,
) -> Result<ApiTokenResponse, String> {
    if token.trim().is_empty() {
        return Err("API token cannot be empty".to_string());
    }

    let stored = StoredApiToken {
        token,
        device_id: get_device_id().to_string(),
        created_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    };
    let json = serde_json::to_string(&stored)
        .map_err(|e| format!("API token serialization failed: {}", e))?;
    let encrypted = encrypt_data(&json, derive_key())?;
    fs::write(get_api_token_path(&app)?, encrypted)
        .map_err(|e| format!("Failed to save API token: {}", e))?;

    log::info!("[SecureStorage] Cloud API token saved with device binding");
    Ok(ApiTokenResponse {
        success: true,
        message: "API token saved securely".to_string(),
        token: None,
    })
}

#[tauri::command]
pub async fn load_api_token(app: tauri::AppHandle) -> Result<ApiTokenResponse, String> {
    let path = get_api_token_path(&app)?;
    if !path.exists() {
        return Ok(ApiTokenResponse {
            success: false,
            message: "No stored API token".to_string(),
            token: None,
        });
    }

    let encrypted =
        fs::read_to_string(path).map_err(|e| format!("Failed to read API token: {}", e))?;
    let json = decrypt_data(&encrypted, derive_key())?;
    let stored: StoredApiToken =
        serde_json::from_str(&json).map_err(|e| format!("Failed to parse API token: {}", e))?;
    if stored.device_id != get_device_id() {
        return Err("API token does not belong to this device".to_string());
    }

    Ok(ApiTokenResponse {
        success: true,
        message: "API token loaded".to_string(),
        token: Some(stored.token),
    })
}

#[tauri::command]
pub async fn clear_api_token(app: tauri::AppHandle) -> Result<ApiTokenResponse, String> {
    let path = get_api_token_path(&app)?;
    if path.exists() {
        fs::remove_file(path).map_err(|e| format!("Failed to clear API token: {}", e))?;
    }

    Ok(ApiTokenResponse {
        success: true,
        message: "API token cleared".to_string(),
        token: None,
    })
}

/// Save credentials securely (encrypted with device binding)
#[tauri::command]
pub async fn save_credentials(
    app: tauri::AppHandle,
    steamid64: String,
    securecode: String,
) -> Result<CredentialResponse, String> {
    let device_id = get_device_id();
    let key = derive_key();

    // Create credentials object
    let credentials = StoredCredentials {
        steamid64: steamid64.clone(),
        securecode: securecode.clone(),
        device_id: device_id.to_string(),
        created_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    };

    // Serialize to JSON
    let json =
        serde_json::to_string(&credentials).map_err(|e| format!("Serialization failed: {}", e))?;

    // Encrypt
    let encrypted = encrypt_data(&json, key)?;

    // Save to file
    let path = get_credentials_path(&app)?;
    fs::write(&path, encrypted).map_err(|e| format!("Failed to save credentials: {}", e))?;

    log::info!("[SecureStorage] Credentials saved successfully with device binding");

    Ok(CredentialResponse {
        success: true,
        message: "凭据已安全保存".to_string(),
        steamid64: Some(steamid64),
        securecode: None, // Don't return securecode
    })
}

/// Load credentials securely (verify device binding)
#[tauri::command]
pub async fn load_credentials(app: tauri::AppHandle) -> Result<CredentialResponse, String> {
    let device_id = get_device_id();
    let key = derive_key();

    let path = get_credentials_path(&app)?;

    // Check if file exists
    if !path.exists() {
        return Ok(CredentialResponse {
            success: false,
            message: "未找到保存的凭据".to_string(),
            steamid64: None,
            securecode: None,
        });
    }

    // Read encrypted data
    let encrypted =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read credentials: {}", e))?;

    // Decrypt
    let json = decrypt_data(&encrypted, key)?;

    // Deserialize
    let credentials: StoredCredentials =
        serde_json::from_str(&json).map_err(|e| format!("Failed to parse credentials: {}", e))?;

    // Verify device binding
    if credentials.device_id != device_id {
        log::warn!("[SecureStorage] Device ID mismatch - credentials from another device");
        return Err("凭据与当前设备不匹配，可能已被复制。请重新登录。".to_string());
    }

    log::info!("[SecureStorage] Credentials loaded successfully");

    Ok(CredentialResponse {
        success: true,
        message: "凭据加载成功".to_string(),
        steamid64: Some(credentials.steamid64),
        securecode: Some(credentials.securecode),
    })
}

/// Clear stored credentials
#[tauri::command]
pub async fn clear_credentials(app: tauri::AppHandle) -> Result<CredentialResponse, String> {
    let path = get_credentials_path(&app)?;

    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to remove credentials: {}", e))?;
        log::info!("[SecureStorage] Credentials cleared");
    }

    Ok(CredentialResponse {
        success: true,
        message: "凭据已清除".to_string(),
        steamid64: None,
        securecode: None,
    })
}

/// Get current device ID (for display/debugging)
#[tauri::command]
pub async fn get_device_fingerprint() -> Result<String, String> {
    Ok(get_device_id().to_string())
}

/// Check if credentials exist
#[tauri::command]
pub async fn has_stored_credentials(app: tauri::AppHandle) -> Result<bool, String> {
    let path = get_credentials_path(&app)?;
    Ok(path.exists())
}

#[cfg(test)]
mod tests {
    use super::{decrypt_data, encrypt_data};

    #[test]
    fn encryption_round_trip_preserves_plaintext() {
        let key = [42u8; 32];
        let plaintext = r#"{"steamid64":"76561198000000000","securecode":"test"}"#;

        let encrypted = encrypt_data(plaintext, &key).expect("encryption should succeed");
        let decrypted = decrypt_data(&encrypted, &key).expect("decryption should succeed");

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn decrypts_existing_nonce_ciphertext_format() {
        let key = std::array::from_fn(|index| index as u8);
        let encrypted = "AAECAwQFBgcICQoLK2exeqac73j/JPPu350RDO/791WJFzAdXGv6bPf8QJGQnbY0d9Yume0=";

        let decrypted = decrypt_data(encrypted, &key).expect("legacy payload should decrypt");

        assert_eq!(decrypted, "legacy-credential-payload");
    }
}
