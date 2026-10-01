use url::Url;

pub(crate) fn escape_js_string(value: &str) -> String {
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

pub(crate) fn generate_post_form_js(url: &str, uid: &str, auth: &str) -> String {
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

const TRUSTED_NAVIGATION_HOSTS: [&str; 2] = ["bbs.upkk.com", "servers.upkk.com"];

/// Forum/browser window navigation guard. Compares the parsed host exactly so
/// lookalike hosts (`bbs.upkk.com.evil.example`, `bbs.upkk.com@evil.example`,
/// `servers.upkk.company`) are rejected; `about:` pages stay allowed.
pub(crate) fn trusted_navigation(url: &Url) -> bool {
    if url.scheme() == "about" {
        return true;
    }
    matches!(url.scheme(), "http" | "https")
        && url.username().is_empty()
        && url.password().is_none()
        && url
            .host_str()
            .is_some_and(|host| TRUSTED_NAVIGATION_HOSTS.contains(&host))
}

pub(crate) fn create_tab_script(url: &Url) -> String {
    format!(
        "if(window.__xprojTabs) window.__xprojTabs.createTab('{}', true);",
        url.as_str().replace('\\', "\\\\").replace('\'', "\\'")
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse_url(value: &str) -> Url {
        value
            .parse()
            .unwrap_or_else(|error| panic!("{value}: {error}"))
    }

    #[test]
    fn trusted_navigation_allows_about_and_upkk_hosts() {
        assert!(trusted_navigation(&parse_url("about:blank")));
        assert!(trusted_navigation(&parse_url("https://bbs.upkk.com/")));
        assert!(trusted_navigation(&parse_url(
            "http://bbs.upkk.com/plugin.php?id=xnet_core_api:xproj_sign"
        )));
        assert!(trusted_navigation(&parse_url(
            "https://servers.upkk.com/api"
        )));
        assert!(trusted_navigation(&parse_url("http://servers.upkk.com")));
    }

    #[test]
    fn trusted_navigation_rejects_other_hosts() {
        assert!(!trusted_navigation(&parse_url("https://example.com")));
        assert!(!trusted_navigation(&parse_url("https://evil.upkk.com")));
        assert!(!trusted_navigation(&parse_url(
            "https://steamcommunity.com"
        )));
        assert!(!trusted_navigation(&parse_url("file:///tmp/index.html")));
    }

    #[test]
    fn trusted_navigation_rejects_lookalike_hosts_and_userinfo() {
        for value in [
            "https://bbs.upkk.com.evil.example/",
            "https://bbs.upkk.com.evil.example/plugin.php?id=xnet_core_api:xproj_sign",
            "https://bbs.upkk.com@evil.example/",
            "https://bbs.upkk.com:secret@evil.example/",
            "http://servers.upkk.company/",
            "https://servers.upkk.company/api",
            "https://bbs.upkk.comevil.example/",
            "https://user@bbs.upkk.com/",
            "https://user:secret@servers.upkk.com/",
            "ftp://bbs.upkk.com/",
            "wss://bbs.upkk.com/",
        ] {
            assert!(!trusted_navigation(&parse_url(value)), "{value}");
        }
        for value in [
            "https://bbs.upkk.com.evil.example/",
            "https://bbs.upkk.com@evil.example/",
            "http://servers.upkk.company/",
        ] {
            assert!(legacy_prefix_navigation(&parse_url(value)), "{value}");
        }
    }

    /// The previous prefix guard; every URL it allowed on the exact trusted
    /// hosts must still be allowed by the parsed-host guard.
    fn legacy_prefix_navigation(url: &Url) -> bool {
        let url = url.as_str();
        url.starts_with("about:")
            || url.starts_with("https://bbs.upkk.com")
            || url.starts_with("http://bbs.upkk.com")
            || url.starts_with("https://servers.upkk.com")
            || url.starts_with("http://servers.upkk.com")
    }

    #[test]
    fn trusted_navigation_keeps_every_legitimately_allowed_url() {
        for value in [
            "about:blank",
            "about:srcdoc",
            "https://bbs.upkk.com",
            "https://bbs.upkk.com/",
            "http://bbs.upkk.com/",
            "https://bbs.upkk.com/plugin.php?id=xnet_core_api:xproj_login_to_bbs",
            "https://bbs.upkk.com/forum.php?mod=viewthread&tid=1&page=2#pid3",
            "https://BBS.UPKK.COM/Forum.php",
            "https://bbs.upkk.com:443/home.php",
            "https://bbs.upkk.com:8443/home.php",
            "https://servers.upkk.com/",
            "http://servers.upkk.com/api/servers?page=1",
            "https://servers.upkk.com/#/detail",
        ] {
            let url = parse_url(value);
            assert!(legacy_prefix_navigation(&url), "legacy {value}");
            assert!(trusted_navigation(&url), "{value}");
        }
    }

    #[test]
    fn escape_js_string_escapes_quotes_and_markup() {
        assert_eq!(escape_js_string("\\"), "\\\\");
        assert_eq!(escape_js_string("'"), "\\'");
        assert_eq!(escape_js_string("\""), "\\\"");
        assert_eq!(escape_js_string("\n"), "\\n");
        assert_eq!(escape_js_string("\r"), "\\r");
        assert_eq!(escape_js_string("<tag>"), "\\x3ctag\\x3e");
    }

    #[test]
    fn generate_post_form_js_embeds_escaped_fields() {
        let script = generate_post_form_js("https://bbs.upkk.com/x", "u'1", "a\"2");
        assert!(script.contains("https://bbs.upkk.com/x"));
        assert!(script.contains("u\\'1"));
        assert!(script.contains("a\\\"2"));
    }

    #[test]
    fn create_tab_script_escapes_quotes_for_eval() {
        let script = create_tab_script(&parse_url("https://bbs.upkk.com/path"));
        assert_eq!(
            script,
            "if(window.__xprojTabs) window.__xprojTabs.createTab('https://bbs.upkk.com/path', true);"
        );
    }
}
