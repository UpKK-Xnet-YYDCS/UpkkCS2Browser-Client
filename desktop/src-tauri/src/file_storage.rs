use std::path::PathBuf;
use tauri::Manager;

fn monitor_data_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|directory| directory.join("monitor_data.json"))
        .map_err(|error| format!("Failed to get app data dir: {error}"))
}

#[tauri::command]
pub async fn write_text_file(path: String, contents: String) -> Result<(), String> {
    let path = PathBuf::from(path);
    match path.extension().and_then(|extension| extension.to_str()) {
        Some(extension) if extension.eq_ignore_ascii_case("json") => {}
        _ => return Err("Only .json files are allowed".to_string()),
    }
    tokio::task::spawn_blocking(move || {
        std::fs::write(path, contents).map_err(|error| format!("Failed to write file: {error}"))
    })
    .await
    .map_err(|error| format!("File write task failed: {error}"))?
}

#[tauri::command]
pub async fn save_monitor_data(app: tauri::AppHandle, data: String) -> Result<(), String> {
    let path = monitor_data_path(&app)?;
    tokio::task::spawn_blocking(move || {
        let directory = path
            .parent()
            .ok_or_else(|| "Monitor data path has no parent directory".to_string())?;
        std::fs::create_dir_all(directory)
            .map_err(|error| format!("Failed to create app data dir: {error}"))?;
        std::fs::write(path, data).map_err(|error| format!("Failed to save monitor data: {error}"))
    })
    .await
    .map_err(|error| format!("Monitor save task failed: {error}"))?
}

#[tauri::command]
pub async fn load_monitor_data(app: tauri::AppHandle) -> Result<String, String> {
    let path = monitor_data_path(&app)?;
    tokio::task::spawn_blocking(move || {
        if !path.exists() {
            return Ok(String::new());
        }
        std::fs::read_to_string(path)
            .map_err(|error| format!("Failed to read monitor data: {error}"))
    })
    .await
    .map_err(|error| format!("Monitor load task failed: {error}"))?
}
