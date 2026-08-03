use tauri::{Emitter, Manager};
use url::Url;

const BROWSER_USER_AGENT: &str = env!("XPROJ_BROWSER_USER_AGENT");
const FORUM_URL: &str = "https://bbs.upkk.com";
const FORUM_TAB_MANAGER_JS: &str = include_str!("../js/forum_tab_manager.js");

fn escape_js_string(value: &str) -> String {
    let mut result = String::with_capacity(value.len() + value.len() / 8);
    for character in value.chars() {
        match character {
            '\\' => result.push_str("\\\\"),
            '\'' => result.push_str("\\'"),
            '"' => result.push_str("\\\""),
            '\n' => result.push_str("\\n"),
            '\r' => result.push_str("\\r"),
            '<' => result.push_str("\\x3c"),
            '>' => result.push_str("\\x3e"),
            _ => result.push(character),
        }
    }
    result
}

fn generate_post_form_js(url: &str, uid: &str, auth: &str) -> String {
    let escaped_url = escape_js_string(url);
    let escaped_uid = escape_js_string(uid);
    let escaped_auth = escape_js_string(auth);

    format!(
        r#"
        (function() {{
            var form = document.createElement('form');
            form.method = 'POST';
            form.action = '{}';

            var uidInput = document.createElement('input');
            uidInput.type = 'hidden';
            uidInput.name = 'uid';
            uidInput.value = '{}';
            form.appendChild(uidInput);

            var authInput = document.createElement('input');
            authInput.type = 'hidden';
            authInput.name = 'auth';
            authInput.value = '{}';
            form.appendChild(authInput);

            document.body.appendChild(form);
            form.submit();
        }})();
        "#,
        escaped_url, escaped_uid, escaped_auth
    )
}

fn trusted_navigation(url: &Url) -> bool {
    let url = url.as_str();
    url.starts_with("about:")
        || url.starts_with("https://bbs.upkk.com")
        || url.starts_with("http://bbs.upkk.com")
        || url.starts_with("https://servers.upkk.com")
        || url.starts_with("http://servers.upkk.com")
}

fn create_tab_script(url: &Url) -> String {
    format!(
        "if(window.__xprojTabs) window.__xprojTabs.createTab('{}', true);",
        url.as_str().replace('\\', "\\\\").replace('\'', "\\'")
    )
}

#[tauri::command]
pub async fn open_forum_window(app: tauri::AppHandle) -> Result<(), String> {
    open_url_in_browser_window(
        app,
        "forum".to_string(),
        FORUM_URL.to_string(),
        "Upkk 社区论坛".to_string(),
    )
    .await
}

#[tauri::command]
pub async fn open_forum_with_login(
    app: tauri::AppHandle,
    uid: String,
    auth: String,
) -> Result<(), String> {
    let login_url = "https://bbs.upkk.com/plugin.php?id=xnet_core_api:xproj_login_to_bbs";
    let window_label = "forum";
    let post_js = generate_post_form_js(login_url, &uid, &auth);

    if let Some(window) = app.get_webview_window(window_label) {
        window.eval(&post_js).map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        return Ok(());
    }

    let app_handle = app.clone();
    let blank_url: Url = "about:blank"
        .parse()
        .map_err(|error: url::ParseError| error.to_string())?;
    let window = tauri::WebviewWindowBuilder::new(
        &app,
        window_label,
        tauri::WebviewUrl::External(blank_url),
    )
    .title("Upkk 社区论坛")
    .inner_size(1200.0, 800.0)
    .min_inner_size(800.0, 600.0)
    .center()
    .user_agent(BROWSER_USER_AGENT)
    .devtools(cfg!(feature = "devtools"))
    .on_page_load(|window, payload| {
        if let tauri::webview::PageLoadEvent::Finished = payload.event() {
            let url = payload.url().to_string();
            if url != "about:blank" {
                println!("[Forum] Page loaded: {}, injecting tab manager", url);
                if let Err(error) = window.eval(FORUM_TAB_MANAGER_JS) {
                    eprintln!("[Forum] Failed to inject tab manager: {}", error);
                }
            }
        }
    })
    .on_new_window(move |url, _features| {
        println!("[Forum] New window request intercepted: {}", url);
        if let Some(forum_window) = app_handle.get_webview_window("forum") {
            if let Err(error) = forum_window.eval(create_tab_script(&url)) {
                eprintln!("[Forum] Failed to create new tab: {}", error);
            }
        }
        tauri::webview::NewWindowResponse::Deny
    })
    .on_navigation(trusted_navigation)
    .build()
    .map_err(|error| error.to_string())?;

    window.eval(&post_js).map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn open_url_in_browser_window(
    app: tauri::AppHandle,
    window_label: String,
    url: String,
    title: String,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_label) {
        let parsed_url: Url = url
            .parse()
            .map_err(|error: url::ParseError| error.to_string())?;
        window
            .navigate(parsed_url)
            .map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        return Ok(());
    }

    let app_handle = app.clone();
    let label_clone = window_label.clone();
    let parsed_url: Url = url
        .parse()
        .map_err(|error: url::ParseError| error.to_string())?;
    tauri::WebviewWindowBuilder::new(&app, &window_label, tauri::WebviewUrl::External(parsed_url))
        .title(&title)
        .inner_size(1200.0, 800.0)
        .min_inner_size(800.0, 600.0)
        .center()
        .user_agent(BROWSER_USER_AGENT)
        .devtools(cfg!(feature = "devtools"))
        .on_page_load(|window, payload| {
            if let tauri::webview::PageLoadEvent::Finished = payload.event() {
                let url = payload.url().to_string();
                if url != "about:blank" {
                    println!("[Browser] Page loaded: {}, injecting tab manager", url);
                    if let Err(error) = window.eval(FORUM_TAB_MANAGER_JS) {
                        eprintln!("[Browser] Failed to inject tab manager: {}", error);
                    }
                }
            }
        })
        .on_new_window(move |url, _features| {
            println!("[Browser] New window request intercepted: {}", url);
            if let Some(browser_window) = app_handle.get_webview_window(&label_clone) {
                if let Err(error) = browser_window.eval(create_tab_script(&url)) {
                    eprintln!("[Browser] Failed to create new tab: {}", error);
                }
            }
            tauri::webview::NewWindowResponse::Deny
        })
        .on_navigation(trusted_navigation)
        .build()
        .map_err(|error| error.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn open_steam_login(app: tauri::AppHandle, login_url: String) -> Result<(), String> {
    let window_label = "steam_login";
    if let Some(window) = app.get_webview_window(window_label) {
        let parsed_url: Url = login_url
            .parse()
            .map_err(|error: url::ParseError| error.to_string())?;
        window
            .navigate(parsed_url)
            .map_err(|error| error.to_string())?;
        window.set_focus().map_err(|error| error.to_string())?;
        return Ok(());
    }

    let app_handle = app.clone();
    let parsed_url: Url = login_url
        .parse()
        .map_err(|error: url::ParseError| error.to_string())?;
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
        if url.starts_with("xproj://auth/callback") {
            println!("[Login] Token redirect intercepted: {}", url);
            if let Ok(parsed) = url::Url::parse(&url) {
                let params: std::collections::HashMap<String, String> = parsed
                    .query_pairs()
                    .map(|(key, value)| (key.to_string(), value.to_string()))
                    .collect();
                if let Some(token) = params.get("token") {
                    let user_json = serde_json::json!({
                        "token": token,
                        "user": {
                            "id": params.get("user_id").and_then(|value| value.parse::<u64>().ok()).unwrap_or(0),
                            "username": params.get("username").unwrap_or(&String::new()),
                            "avatar_url": params.get("avatar_url").unwrap_or(&String::new()),
                            "provider": params.get("provider").unwrap_or(&String::new()),
                        }
                    });
                    println!("[Login] Emitting login-token-ready event");
                    let _ = app_handle.emit("login-token-ready", user_json.to_string());
                    let app_close = app_handle.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(300));
                        if let Some(window) = app_close.get_webview_window("steam_login") {
                            let _ = window.close();
                        }
                    });
                }
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

#[tauri::command]
pub async fn open_checkin_page(app: tauri::AppHandle) -> Result<(), String> {
    open_url_in_browser_window(
        app,
        "forum".to_string(),
        "https://bbs.upkk.com/plugin.php?id=xnet_core_api:xproj_sign".to_string(),
        "Upkk 社区论坛 - 签到".to_string(),
    )
    .await
}

#[tauri::command]
pub async fn close_window(app: tauri::AppHandle, window_label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_label) {
        window.close().map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn forum_navigate(app: tauri::AppHandle, url: String) -> Result<(), String> {
    let window = app
        .get_webview_window("forum")
        .ok_or_else(|| "论坛窗口未打开".to_string())?;
    let parsed_url: Url = url
        .parse()
        .map_err(|error: url::ParseError| error.to_string())?;
    window
        .navigate(parsed_url)
        .map_err(|error| error.to_string())
}

fn eval_forum(app: tauri::AppHandle, script: &str) -> Result<(), String> {
    let window = app
        .get_webview_window("forum")
        .ok_or_else(|| "论坛窗口未打开".to_string())?;
    window.eval(script).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn forum_reload(app: tauri::AppHandle) -> Result<(), String> {
    eval_forum(app, "window.location.reload()")
}

#[tauri::command]
pub async fn forum_go_back(app: tauri::AppHandle) -> Result<(), String> {
    eval_forum(app, "window.history.back()")
}

#[tauri::command]
pub async fn forum_go_forward(app: tauri::AppHandle) -> Result<(), String> {
    eval_forum(app, "window.history.forward()")
}

#[tauri::command]
pub async fn forum_get_url(app: tauri::AppHandle) -> Result<String, String> {
    app.get_webview_window("forum")
        .ok_or_else(|| "论坛窗口未打开".to_string())?
        .url()
        .map(|url| url.to_string())
        .map_err(|error| error.to_string())
}
