use super::{decrypt_data, encrypt_data, write_private_file};
use std::fs;
use std::path::{Path, PathBuf};

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

fn scratch_dir(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!(
        "xproj-secure-storage-{}-{name}",
        std::process::id()
    ));
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).expect("create scratch dir");
    dir
}

fn entry_names(dir: &Path) -> Vec<String> {
    let mut names: Vec<String> = fs::read_dir(dir)
        .expect("read scratch dir")
        .map(|entry| {
            entry
                .expect("dir entry")
                .file_name()
                .to_string_lossy()
                .into_owned()
        })
        .collect();
    names.sort();
    names
}

#[cfg(unix)]
fn mode_of(path: &Path) -> u32 {
    use std::os::unix::fs::PermissionsExt;
    fs::metadata(path).expect("metadata").permissions().mode() & 0o777
}

#[test]
fn write_private_file_writes_exact_bytes_owner_only() {
    let dir = scratch_dir("write");
    let path = dir.join("credentials.enc");
    let encrypted = encrypt_data("payload", &[7u8; 32]).expect("encrypt");

    write_private_file(&path, encrypted.as_bytes()).expect("write");

    assert_eq!(fs::read_to_string(&path).expect("read"), encrypted);
    assert_eq!(entry_names(&dir), vec!["credentials.enc"]);
    #[cfg(unix)]
    assert_eq!(mode_of(&path), 0o600);
    fs::remove_dir_all(&dir).expect("cleanup");
}

#[test]
fn write_private_file_replaces_existing_file_and_tightens_permissions() {
    let dir = scratch_dir("replace");
    let path = dir.join("api-token.enc");
    fs::write(&path, "an older and much longer payload").expect("seed");
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&path, fs::Permissions::from_mode(0o644)).expect("chmod");
    }

    write_private_file(&path, b"new").expect("write");

    assert_eq!(fs::read_to_string(&path).expect("read"), "new");
    assert_eq!(entry_names(&dir), vec!["api-token.enc"]);
    #[cfg(unix)]
    assert_eq!(mode_of(&path), 0o600);
    fs::remove_dir_all(&dir).expect("cleanup");
}

#[test]
fn write_private_file_failures_report_errors_and_leave_no_temp_file() {
    let dir = scratch_dir("failure");
    // The rename step fails when the target is a non-empty directory.
    let blocked = dir.join("credentials.enc");
    fs::create_dir(&blocked).expect("create blocking dir");
    fs::write(blocked.join("keep"), "x").expect("seed");
    assert!(write_private_file(&blocked, b"payload").is_err());
    assert_eq!(entry_names(&dir), vec!["credentials.enc"]);
    assert_eq!(fs::read_to_string(blocked.join("keep")).expect("read"), "x");

    // The temp-file step fails when the parent directory is missing.
    let missing = dir.join("missing").join("api-token.enc");
    assert!(write_private_file(&missing, b"payload").is_err());
    assert!(!missing.exists());

    assert!(write_private_file(Path::new("/"), b"payload").is_err());
    fs::remove_dir_all(&dir).expect("cleanup");
}

#[cfg(unix)]
#[test]
fn concurrent_private_writes_never_leave_a_mixed_or_truncated_file() {
    let dir = scratch_dir("concurrent");
    let path = dir.join("credentials.enc");
    let payloads: Vec<String> = (0..8)
        .map(|index| index.to_string().repeat(4_096 * (index + 1)))
        .collect();

    std::thread::scope(|scope| {
        for payload in &payloads {
            let path = &path;
            scope.spawn(move || write_private_file(path, payload.as_bytes()).expect("write"));
        }
    });

    let written = fs::read_to_string(&path).expect("read");
    assert!(payloads.contains(&written), "mixed or truncated payload");
    assert_eq!(entry_names(&dir), vec!["credentials.enc"]);
    assert_eq!(mode_of(&path), 0o600);
    fs::remove_dir_all(&dir).expect("cleanup");
}
