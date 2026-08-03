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
