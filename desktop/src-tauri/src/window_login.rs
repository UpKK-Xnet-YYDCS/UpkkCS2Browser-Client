use std::collections::HashMap;
use tauri::{Emitter, Manager};
use url::Url;

use crate::window_common::{focus_existing_window, BROWSER_USER_AGENT};

const LOGIN_CALLBACK_PREFIX: &str = "xproj://auth/callback";

pub(crate) fn login_callback_payload(url: &str) -> Option<String> {
    if !url.starts_with(LOGIN_CALLBACK_PREFIX) {
        return None;
    }
    let parsed = Url::parse(url).ok()?;
    let params: HashMap<String, String> = parsed
        .query_pairs()
        .map(|(key, value)| (key.to_string(), value.to_string()))
        .collect();
    let token = params.get("token")?;
    Some(
        serde_json::json!({
            "token": token,
            "user": {
                "id": params.get("user_id").and_then(|value| value.parse::<u64>().ok()).unwrap_or(0),
                "username": params.get("username").unwrap_or(&String::new()),
                "avatar_url": params.get("avatar_url").unwrap_or(&String::new()),
                "provider": params.get("provider").unwrap_or(&String::new()),
            }
        })
        .to_string(),
    )
}

#[tauri::command]
pub async fn open_steam_login(app: tauri::AppHandle, login_url: String) -> Result<(), String> {
    let window_label = "steam_login";
    let parsed_url: Url = login_url
        .parse()
        .map_err(|error: url::ParseError| error.to_string())?;
    if focus_existing_window(&app, window_label, parsed_url.clone())? {
        return Ok(());
    }

    let app_handle = app.clone();
    let window = tauri::WebviewWindowBuilder::new(
        &app,
        window_label,
        tauri::WebviewUrl::External(parsed_url),
    )
    .title("Login")
    .inner_size(900.0, 700.0)
    .min_inner_size(600.0, 500.0)
    .center()
    .user_agent(BROWSER_USER_AGENT)
    .on_navigation(move |url| {
        let url = url.to_string();
        if url.starts_with(LOGIN_CALLBACK_PREFIX) {
            println!("[Login] Token redirect intercepted: {}", url);
            if let Some(user_json) = login_callback_payload(&url) {
                println!("[Login] Emitting login-token-ready event");
                let _ = app_handle.emit("login-token-ready", user_json);
                let app_close = app_handle.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(300));
                    if let Some(window) = app_close.get_webview_window("steam_login") {
                        let _ = window.close();
                    }
                });
            }
            return false;
        }
        true
    })
    .build()
    .map_err(|error| error.to_string())?;

    let close_app_handle = app.clone();
    window.on_window_event(move |event| {
        if matches!(event, tauri::WindowEvent::Destroyed) {
            println!("[Login] Login window closed");
            let _ = close_app_handle.emit("login-window-closed", ());
        }
    });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn login_callback_payload_requires_the_existing_scheme_and_token() {
        assert_eq!(
            login_callback_payload("https://example.com/?token=abc"),
            None
        );
        assert_eq!(
            login_callback_payload("xproj://auth/callback?user_id=1"),
            None
        );
    }

    #[test]
    fn login_callback_payload_keeps_missing_user_fields_as_empty_defaults() {
        let payload = login_callback_payload("xproj://auth/callback?token=abc").unwrap();
        let value: serde_json::Value = serde_json::from_str(&payload).unwrap();
        assert_eq!(
            value,
            serde_json::json!({
                "token": "abc",
                "user": {
                    "id": 0,
                    "username": "",
                    "avatar_url": "",
                    "provider": ""
                }
            })
        );
    }

    #[test]
    fn login_callback_payload_maps_query_user_fields() {
        let payload = login_callback_payload(
            "xproj://auth/callback?token=tok&user_id=9&username=Ada&avatar_url=https://img/a.png&provider=steam",
        )
        .unwrap();
        let value: serde_json::Value = serde_json::from_str(&payload).unwrap();
        assert_eq!(
            value,
            serde_json::json!({
                "token": "tok",
                "user": {
                    "id": 9,
                    "username": "Ada",
                    "avatar_url": "https://img/a.png",
                    "provider": "steam"
                }
            })
        );
    }
}
