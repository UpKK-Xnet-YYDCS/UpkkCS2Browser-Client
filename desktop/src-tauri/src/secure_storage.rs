use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64_STANDARD};
use rand::RngCore;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

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
        OsRng.fill_bytes(&mut random_bytes);
        let new_id = hex::encode(random_bytes);
        
        // Try to save it (ignore errors - we'll just use the generated ID)
        let _ = fs::write(&fallback_path, &new_id);
        
        return new_id;
    }
    
    // Ultimate fallback: generate random ID (won't persist across restarts)
    let mut random_bytes = [0u8; 16];
    OsRng.fill_bytes(&mut random_bytes);
    hex::encode(random_bytes)
}

/// Get machine unique identifier for device binding
fn get_device_id() -> String {
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
}

/// Derive encryption key from device ID and app secret
fn derive_key(device_id: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    // Combine device ID with app-specific secret
    hasher.update(device_id.as_bytes());
    hasher.update(b"xproj-desktop-secure-v1");
    hasher.update(b"upkk-credential-protection");
    let result = hasher.finalize();
    let mut key = [0u8; 32];
    key.copy_from_slice(&result);
    key
}

/// Encrypt data using AES-256-GCM
fn encrypt_data(data: &str, key: &[u8; 32]) -> Result<String, String> {
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;
    
    // Generate random nonce (12 bytes for AES-GCM)
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    // Encrypt
    let ciphertext = cipher
        .encrypt(nonce, data.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;
    
    // Combine nonce + ciphertext and encode as base64
    let mut combined = nonce_bytes.to_vec();
    combined.extend(ciphertext);
    Ok(BASE64_STANDARD.encode(&combined))
}

/// Decrypt data using AES-256-GCM
fn decrypt_data(encrypted: &str, key: &[u8; 32]) -> Result<String, String> {
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;
    
    // Decode base64
    let combined = BASE64_STANDARD.decode(encrypted)
        .map_err(|e| format!("Base64 decode failed: {}", e))?;
    
    if combined.len() < 13 {
        return Err("Invalid encrypted data".to_string());
    }
    
    // Extract nonce and ciphertext
    let nonce = Nonce::from_slice(&combined[..12]);
    let ciphertext = &combined[12..];
    
    // Decrypt
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "Decryption failed - credentials may be corrupted or from another device".to_string())?;
    
    String::from_utf8(plaintext)
        .map_err(|e| format!("UTF-8 decode failed: {}", e))
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

/// Save credentials securely (encrypted with device binding)
#[tauri::command]
pub async fn save_credentials(
    app: tauri::AppHandle,
    steamid64: String,
    securecode: String,
) -> Result<CredentialResponse, String> {
    let device_id = get_device_id();
    let key = derive_key(&device_id);
    
    // Create credentials object
    let credentials = StoredCredentials {
        steamid64: steamid64.clone(),
        securecode: securecode.clone(),
        device_id: device_id.clone(),
        created_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    };
    
    // Serialize to JSON
    let json = serde_json::to_string(&credentials)
        .map_err(|e| format!("Serialization failed: {}", e))?;
    
    // Encrypt
    let encrypted = encrypt_data(&json, &key)?;
    
    // Save to file
    let path = get_credentials_path(&app)?;
    fs::write(&path, encrypted)
        .map_err(|e| format!("Failed to save credentials: {}", e))?;
    
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
    let key = derive_key(&device_id);
    
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
    let encrypted = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read credentials: {}", e))?;
    
    // Decrypt
    let json = decrypt_data(&encrypted, &key)?;
    
    // Deserialize
    let credentials: StoredCredentials = serde_json::from_str(&json)
        .map_err(|e| format!("Failed to parse credentials: {}", e))?;
    
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
        fs::remove_file(&path)
            .map_err(|e| format!("Failed to remove credentials: {}", e))?;
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
    Ok(get_device_id())
}

/// Check if credentials exist
#[tauri::command]
pub async fn has_stored_credentials(app: tauri::AppHandle) -> Result<bool, String> {
    let path = get_credentials_path(&app)?;
    Ok(path.exists())
}
