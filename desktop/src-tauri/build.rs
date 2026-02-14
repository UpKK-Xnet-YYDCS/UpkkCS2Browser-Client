fn main() {
    // Read version from version.txt for consistent versioning across the project
    let version = std::fs::read_to_string("../version.txt")
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|_| "1.3.0".to_string());
    
    // Browser User-Agent for WebView windows (can be overridden via XPROJ_BROWSER_USER_AGENT env var)
    let default_ua = format!("XProj-Desktop-Browser/{} (+https://servers.upkk.com) Chrome/120.0.0.0", version);
    let browser_ua = std::env::var("XPROJ_BROWSER_USER_AGENT").unwrap_or(default_ua);

    // Make the User-Agent available at compile time via env!() macro
    println!("cargo::rustc-env=XPROJ_BROWSER_USER_AGENT={}", browser_ua);

    tauri_build::build()
}
