mod a2s;
mod file_storage;
mod secure_storage;
mod window;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            window::open_forum_window,
            window::open_forum_with_login,
            window::open_url_in_browser_window,
            window::open_steam_login,
            window::open_checkin_page,
            window::close_window,
            window::forum_navigate,
            window::forum_reload,
            window::forum_go_back,
            window::forum_go_forward,
            window::forum_get_url,
            a2s::query_server_a2s,
            a2s::query_servers_a2s,
            secure_storage::save_credentials,
            secure_storage::load_credentials,
            secure_storage::clear_credentials,
            secure_storage::get_device_fingerprint,
            secure_storage::has_stored_credentials,
            secure_storage::save_api_token,
            secure_storage::load_api_token,
            secure_storage::clear_api_token,
            file_storage::write_text_file,
            file_storage::save_monitor_data,
            file_storage::load_monitor_data
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
