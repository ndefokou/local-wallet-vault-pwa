//! AES-GCM-256 encryption utilities
//!
//! Mirrors `src/lib/crypto/aesGcm.ts`

use aes_gcm::{
    aead::{Aead, KeyInit, Payload},
    Aes256Gcm, Nonce,
};
use rand::rngs::OsRng;
use rand::RngCore;

use crate::error::{Error, Result};
use crate::types::{CipherEnvelopeV1, EnvelopePurpose};

/// AES-GCM nonce length (96 bits / 12 bytes)
const NONCE_LENGTH: usize = 12;

/// Generate a new AES-256-GCM key
///
/// Returns 32 bytes of random key material
pub fn generate_aes_key() -> Vec<u8> {
    let mut key = vec![0u8; 32];
    OsRng.fill_bytes(&mut key);
    key
}

/// Encrypt data using AES-GCM-256
///
/// # Arguments
/// * `key` - 32-byte encryption key
/// * `plaintext` - Data to encrypt
/// * `aad` - Additional authenticated data
///
/// # Returns
/// Tuple of (ciphertext, nonce)
pub fn encrypt_aes_gcm(key: &[u8], plaintext: &[u8], aad: &[u8]) -> Result<(Vec<u8>, Vec<u8>)> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|_| Error::InvalidKeyLength)?;

    let mut nonce_bytes = [0u8; NONCE_LENGTH];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let payload = Payload {
        msg: plaintext,
        aad,
    };

    let ciphertext = cipher
        .encrypt(nonce, payload)
        .map_err(|_| Error::EncryptionFailed)?;

    Ok((ciphertext, nonce_bytes.to_vec()))
}

/// Decrypt data using AES-GCM-256
///
/// # Arguments
/// * `key` - 32-byte encryption key
/// * `ciphertext` - Encrypted data
/// * `nonce` - 12-byte nonce
/// * `aad` - Additional authenticated data
///
/// # Returns
/// Decrypted plaintext
pub fn decrypt_aes_gcm(key: &[u8], ciphertext: &[u8], nonce: &[u8], aad: &[u8]) -> Result<Vec<u8>> {
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|_| Error::InvalidKeyLength)?;

    let nonce = Nonce::from_slice(
        nonce
            .try_into()
            .map_err(|_| Error::InvalidNonceLength)?,
    );

    let payload = Payload {
        msg: ciphertext,
        aad,
    };

    cipher
        .decrypt(nonce, payload)
        .map_err(|_| Error::DecryptionFailed("AES-GCM decryption failed".to_string()))
}

/// Create a cipher envelope for encrypted data
///
/// # Arguments
/// * `key` - 32-byte encryption key
/// * `plaintext` - Data to encrypt
/// * `vault_id` - Vault identifier
/// * `purpose` - Envelope purpose
///
/// # Returns
/// CipherEnvelopeV1 with encrypted data
pub fn create_envelope(
    key: &[u8],
    plaintext: &[u8],
    vault_id: String,
    purpose: EnvelopePurpose,
) -> Result<CipherEnvelopeV1> {
    use crate::types::create_aad_bytes;
    
    // Create AAD bytes (serialized once, stored as base64)
    let aad_bytes = create_aad_bytes(vault_id.clone(), purpose.clone())?;

    // Encrypt the plaintext
    let (ciphertext, nonce) = encrypt_aes_gcm(key, plaintext, &aad_bytes)?;

    Ok(CipherEnvelopeV1::new_with_aad(
        vault_id,
        purpose,
        nonce,
        ciphertext,
        aad_bytes,
    ))
}

/// Decrypt a cipher envelope
///
/// # Arguments
/// * `key` - 32-byte encryption key
/// * `envelope` - Cipher envelope to decrypt
///
/// # Returns
/// Decrypted plaintext
pub fn decrypt_envelope(key: &[u8], envelope: &CipherEnvelopeV1) -> Result<Vec<u8>> {
    // Validate envelope
    envelope.validate()?;

    // Get nonce and ciphertext
    let nonce = envelope.nonce_bytes()?;
    let ciphertext = envelope.ciphertext_bytes()?;
    let aad_bytes = envelope.aad_bytes()?;

    // Decrypt
    decrypt_aes_gcm(key, &ciphertext, &nonce, &aad_bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let key = generate_aes_key();
        let plaintext = b"Hello, World!";
        let aad = b"additional data";

        let (ciphertext, nonce) = encrypt_aes_gcm(&key, plaintext, aad).unwrap();
        let decrypted = decrypt_aes_gcm(&key, &ciphertext, &nonce, aad).unwrap();

        assert_eq!(plaintext.to_vec(), decrypted);
    }

    #[test]
    fn test_encrypt_decrypt_with_wrong_key() {
        let key1 = generate_aes_key();
        let key2 = generate_aes_key();
        let plaintext = b"Hello, World!";
        let aad = b"additional data";

        let (ciphertext, nonce) = encrypt_aes_gcm(&key1, plaintext, aad).unwrap();
        let result = decrypt_aes_gcm(&key2, &ciphertext, &nonce, aad);

        assert!(result.is_err());
    }

    #[test]
    fn test_create_decrypt_envelope() {
        let key = generate_aes_key();
        let plaintext = b"Test vault data";
        let vault_id = "vault-123".to_string();

        let envelope = create_envelope(&key, plaintext, vault_id.clone(), EnvelopePurpose::Manifest).unwrap();
        assert_eq!(envelope.magic, "LWV_ENVELOPE");
        assert_eq!(envelope.version, 1);
        assert_eq!(envelope.alg, "AES-GCM-256");

        let decrypted = decrypt_envelope(&key, &envelope).unwrap();
        assert_eq!(plaintext.to_vec(), decrypted);
    }
}