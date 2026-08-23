use std::fs;
use std::path::PathBuf;
use tauri::Manager;

use crate::secure_crypto::{decrypt_data, derive_key, encrypt_data, get_device_id};

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

async fn run_blocking<T, F>(operation: &'static str, work: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tokio::task::spawn_blocking(work)
        .await
        .map_err(|error| format!("{operation} task failed: {error}"))?
}

#[tauri::command]
pub async fn save_api_token(
    app: tauri::AppHandle,
    token: String,
) -> Result<ApiTokenResponse, String> {
    run_blocking("save_api_token", move || {
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
    })
    .await
}

#[tauri::command]
pub async fn load_api_token(app: tauri::AppHandle) -> Result<ApiTokenResponse, String> {
    run_blocking("load_api_token", move || {
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
    })
    .await
}

#[tauri::command]
pub async fn clear_api_token(app: tauri::AppHandle) -> Result<ApiTokenResponse, String> {
    run_blocking("clear_api_token", move || {
        let path = get_api_token_path(&app)?;
        if path.exists() {
            fs::remove_file(path).map_err(|e| format!("Failed to clear API token: {}", e))?;
        }

        Ok(ApiTokenResponse {
            success: true,
            message: "API token cleared".to_string(),
            token: None,
        })
    })
    .await
}

#[tauri::command]
pub async fn save_credentials(
    app: tauri::AppHandle,
    steamid64: String,
    securecode: String,
) -> Result<CredentialResponse, String> {
    run_blocking("save_credentials", move || {
        let device_id = get_device_id();
        let key = derive_key();

        let credentials = StoredCredentials {
            steamid64: steamid64.clone(),
            securecode: securecode.clone(),
            device_id: device_id.to_string(),
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        };

        let json = serde_json::to_string(&credentials)
            .map_err(|e| format!("Serialization failed: {}", e))?;

        let encrypted = encrypt_data(&json, key)?;

        let path = get_credentials_path(&app)?;
        fs::write(&path, encrypted).map_err(|e| format!("Failed to save credentials: {}", e))?;

        log::info!("[SecureStorage] Credentials saved successfully with device binding");

        Ok(CredentialResponse {
            success: true,
            message: "凭据已安全保存".to_string(),
            steamid64: Some(steamid64),
            securecode: None, // Don't return securecode
        })
    })
    .await
}

#[tauri::command]
pub async fn load_credentials(app: tauri::AppHandle) -> Result<CredentialResponse, String> {
    run_blocking("load_credentials", move || {
        let device_id = get_device_id();
        let key = derive_key();

        let path = get_credentials_path(&app)?;

        if !path.exists() {
            return Ok(CredentialResponse {
                success: false,
                message: "未找到保存的凭据".to_string(),
                steamid64: None,
                securecode: None,
            });
        }

        let encrypted =
            fs::read_to_string(&path).map_err(|e| format!("Failed to read credentials: {}", e))?;

        let json = decrypt_data(&encrypted, key)?;

        let credentials: StoredCredentials = serde_json::from_str(&json)
            .map_err(|e| format!("Failed to parse credentials: {}", e))?;

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
    })
    .await
}

#[tauri::command]
pub async fn clear_credentials(app: tauri::AppHandle) -> Result<CredentialResponse, String> {
    run_blocking("clear_credentials", move || {
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
    })
    .await
}

#[tauri::command]
pub async fn get_device_fingerprint() -> Result<String, String> {
    run_blocking("get_device_fingerprint", move || {
        Ok(get_device_id().to_string())
    })
    .await
}

#[tauri::command]
pub async fn has_stored_credentials(app: tauri::AppHandle) -> Result<bool, String> {
    run_blocking("has_stored_credentials", move || {
        let path = get_credentials_path(&app)?;
        Ok(path.exists())
    })
    .await
}

#[cfg(test)]
mod tests;
