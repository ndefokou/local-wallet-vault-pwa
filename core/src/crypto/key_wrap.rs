//! Key wrap/unwrap utilities for wrapping DEK with KEK
//!
//! Mirrors `src/lib/crypto/keyWrap.ts`

use crate::crypto::aes_gcm::{decrypt_aes_gcm, encrypt_aes_gcm};
use crate::error::{Error, Result};
use crate::types::{CipherEnvelopeV1, EnvelopeAad, EnvelopePurpose};

/// Wrap a Data Encryption Key (DEK) with a Key Encryption Key (KEK)
///
/// # Arguments
/// * `kek` - Key Encryption Key (32 bytes)
/// * `dek` - Data Encryption Key (32 bytes)
/// * `vault_id` - Vault identifier
///
/// # Returns
/// CipherEnvelopeV1 containing the wrapped DEK
pub fn wrap_dek(kek: &[u8], dek: &[u8], vault_id: &str) -> Result<CipherEnvelopeV1> {
    // Create AAD for the wrap
    let aad = EnvelopeAad {
        vault_id: vault_id.to_string(),
        purpose: EnvelopePurpose::DekWrap,
        schema_version: 1,
        record_id: None,
        revision: None,
    };
    let aad_bytes = serde_json::to_vec(&aad)?;

    // Encrypt the DEK
    let (ciphertext, nonce) = encrypt_aes_gcm(kek, dek, &aad_bytes)?;

    Ok(CipherEnvelopeV1 {
        magic: "LWV_ENVELOPE".to_string(),
        version: 1,
        alg: "AES-GCM-256".to_string(),
        nonce: crate::base64url::base64url_encode(&nonce),
        aad,
        ciphertext: crate::base64url::base64url_encode(&ciphertext),
    })
}

/// Unwrap a Data Encryption Key (DEK) with a Key Encryption Key (KEK)
///
/// # Arguments
/// * `kek` - Key Encryption Key (32 bytes)
/// * `envelope` - Cipher envelope containing the wrapped DEK
///
/// # Returns
/// Unwrapped DEK (32 bytes)
pub fn unwrap_dek(kek: &[u8], envelope: &CipherEnvelopeV1) -> Result<Vec<u8>> {
    // Validate envelope
    envelope.validate()?;

    if envelope.aad.purpose != EnvelopePurpose::DekWrap {
        return Err(Error::InvalidEnvelopePurpose(format!(
            "{:?}",
            envelope.aad.purpose
        )));
    }

    // Get nonce and ciphertext
    let nonce = envelope.nonce_bytes()?;
    let ciphertext = envelope.ciphertext_bytes()?;
    let aad_bytes = envelope.aad_bytes()?;

    // Decrypt the DEK
    decrypt_aes_gcm(kek, &ciphertext, &nonce, &aad_bytes)
}

/// Parse envelope from JSON string
///
/// # Arguments
/// * `json` - JSON string representing the envelope
///
/// # Returns
/// Parsed CipherEnvelopeV1
pub fn parse_envelope(json: &str) -> Result<CipherEnvelopeV1> {
    let envelope: CipherEnvelopeV1 = serde_json::from_str(json)?;
    envelope.validate()?;
    Ok(envelope)
}

/// Serialize envelope to JSON string
///
/// # Arguments
/// * `envelope` - Envelope to serialize
///
/// # Returns
/// JSON string
pub fn serialize_envelope(envelope: &CipherEnvelopeV1) -> Result<String> {
    Ok(serde_json::to_string(envelope)?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wrap_unwrap_dek() {
        let kek = generate_aes_key();
        let dek = generate_aes_key();
        let vault_id = "vault-123";

        let envelope = wrap_dek(&kek, &dek, vault_id).unwrap();
        assert_eq!(envelope.magic, "LWV_ENVELOPE");
        assert_eq!(envelope.version, 1);
        assert_eq!(envelope.alg, "AES-GCM-256");
        assert_eq!(envelope.aad.purpose, EnvelopePurpose::DekWrap);

        let unwrapped = unwrap_dek(&kek, &envelope).unwrap();
        assert_eq!(dek, unwrapped);
    }

    #[test]
    fn test_wrap_unwrap_with_wrong_kek() {
        let kek1 = generate_aes_key();
        let kek2 = generate_aes_key();
        let dek = generate_aes_key();
        let vault_id = "vault-123";

        let envelope = wrap_dek(&kek1, &dek, vault_id).unwrap();
        let result = unwrap_dek(&kek2, &envelope);

        assert!(result.is_err());
    }

    #[test]
    fn test_parse_serialize_envelope() {
        let kek = generate_aes_key();
        let dek = generate_aes_key();
        let vault_id = "vault-456";

        let envelope = wrap_dek(&kek, &dek, vault_id).unwrap();
        let json = serialize_envelope(&envelope).unwrap();
        let parsed = parse_envelope(&json).unwrap();

        assert_eq!(parsed.magic, envelope.magic);
        assert_eq!(parsed.version, envelope.version);
        assert_eq!(parsed.vault_id(), envelope.vault_id());
    }
}