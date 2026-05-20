//! Cipher Envelope Types
//!
//! Mirrors `src/lib/types/envelope.ts`

use serde::{Deserialize, Serialize};

use crate::base64url::{base64url_decode, base64url_encode};
use crate::error::{Error, Result};

/// Cipher envelope version 1
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CipherEnvelopeV1 {
    /// Magic identifier for the envelope format
    pub magic: String, // "LWV_ENVELOPE"
    /// Envelope version
    pub version: u8,
    /// Encryption algorithm
    pub alg: String, // "AES-GCM-256"
    /// Nonce/IV for encryption (base64url, 96-bit random)
    pub nonce: String,
    /// Additional authenticated data (base64url encoded JSON bytes)
    /// Stored as base64 to ensure exact same bytes are used during decryption
    #[serde(rename = "aadB64")]
    pub aad_b64: String,
    /// Encrypted ciphertext (base64url)
    pub ciphertext: String,
}

/// Additional authenticated data for the envelope
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvelopeAad {
    /// Vault identifier
    #[serde(rename = "vaultId")]
    pub vault_id: String,
    /// Purpose of the envelope
    pub purpose: EnvelopePurpose,
    /// Schema version
    #[serde(rename = "schemaVersion")]
    pub schema_version: u8,
    /// Optional record ID (for wallet records)
    #[serde(rename = "recordId", skip_serializing_if = "Option::is_none")]
    pub record_id: Option<String>,
    /// Optional revision number
    #[serde(rename = "revision", skip_serializing_if = "Option::is_none")]
    pub revision: Option<u32>,
}

/// Purpose of the cipher envelope
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum EnvelopePurpose {
    DekWrap,
    Manifest,
    WalletRecord,
    Backup,
}

impl CipherEnvelopeV1 {
    /// Create a new envelope with the given AAD and ciphertext
    ///
    /// # Arguments
    /// * `_vault_id` - Vault identifier (unused, kept for API consistency)
    /// * `_purpose` - Envelope purpose (unused, kept for API consistency)
    /// * `nonce` - Encryption nonce (12 bytes)
    /// * `ciphertext` - Encrypted data
    /// * `aad_bytes` - Additional authenticated data (already serialized)
    pub fn new_with_aad(
        _vault_id: String,
        _purpose: EnvelopePurpose,
        nonce: Vec<u8>,
        ciphertext: Vec<u8>,
        aad_bytes: Vec<u8>,
    ) -> Self {
        Self {
            magic: "LWV_ENVELOPE".to_string(),
            version: 1,
            alg: "AES-GCM-256".to_string(),
            nonce: base64url_encode(&nonce),
            aad_b64: base64url_encode(&aad_bytes),
            ciphertext: base64url_encode(&ciphertext),
        }
    }

    /// Validate the envelope magic and version
    pub fn validate(&self) -> Result<()> {
        if self.magic != "LWV_ENVELOPE" {
            return Err(Error::InvalidEnvelopeMagic);
        }
        if self.version != 1 {
            return Err(Error::UnsupportedEnvelopeVersion(self.version));
        }
        if self.alg != "AES-GCM-256" {
            return Err(Error::UnsupportedAlgorithm(self.alg.clone()));
        }
        Ok(())
    }

    /// Get the nonce as bytes
    pub fn nonce_bytes(&self) -> Result<Vec<u8>> {
        base64url_decode(&self.nonce)
    }

    /// Get the ciphertext as bytes
    pub fn ciphertext_bytes(&self) -> Result<Vec<u8>> {
        base64url_decode(&self.ciphertext)
    }

    /// Get the AAD as bytes (directly from base64, no re-serialization)
    pub fn aad_bytes(&self) -> Result<Vec<u8>> {
        base64url_decode(&self.aad_b64)
    }

    /// Parse the AAD into a struct (for inspection purposes)
    pub fn aad(&self) -> Result<EnvelopeAad> {
        let bytes = self.aad_bytes()?;
        let aad: EnvelopeAad = serde_json::from_slice(&bytes)?;
        Ok(aad)
    }
}

/// Create AAD bytes from components
///
/// This function creates the AAD JSON bytes that will be used during encryption.
/// The same bytes must be used during decryption.
pub fn create_aad_bytes(vault_id: String, purpose: EnvelopePurpose) -> Result<Vec<u8>> {
    let aad = EnvelopeAad {
        vault_id,
        purpose,
        schema_version: 1,
        record_id: None,
        revision: None,
    };
    Ok(serde_json::to_vec(&aad)?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_envelope_serialization() {
        let aad_bytes = create_aad_bytes("vault-123".to_string(), EnvelopePurpose::Manifest).unwrap();
        let envelope = CipherEnvelopeV1::new_with_aad(
            "vault-123".to_string(),
            EnvelopePurpose::Manifest,
            vec![0u8; 12],
            vec![1u8; 32],
            aad_bytes,
        );

        let json = serde_json::to_string(&envelope).unwrap();
        assert!(json.contains("LWV_ENVELOPE"));
        assert!(json.contains("aadB64"));

        let parsed: CipherEnvelopeV1 = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.magic, "LWV_ENVELOPE");
        assert!(parsed.validate().is_ok());
    }

    #[test]
    fn test_envelope_aad_roundtrip() {
        let aad_bytes = create_aad_bytes("vault-123".to_string(), EnvelopePurpose::Manifest).unwrap();
        let envelope = CipherEnvelopeV1::new_with_aad(
            "vault-123".to_string(),
            EnvelopePurpose::Manifest,
            vec![0u8; 12],
            vec![1u8; 32],
            aad_bytes.clone(),
        );

        // Verify AAD bytes are preserved exactly
        let recovered_aad_bytes = envelope.aad_bytes().unwrap();
        assert_eq!(aad_bytes, recovered_aad_bytes);
    }

    #[test]
    fn test_envelope_validation() {
        let aad_bytes = create_aad_bytes("vault".to_string(), EnvelopePurpose::Manifest).unwrap();
        let valid_envelope = CipherEnvelopeV1::new_with_aad(
            "vault".to_string(),
            EnvelopePurpose::Manifest,
            vec![0u8; 12],
            vec![1u8; 32],
            aad_bytes,
        );
        assert!(valid_envelope.validate().is_ok());

        let invalid_envelope = CipherEnvelopeV1 {
            magic: "INVALID".to_string(),
            ..valid_envelope.clone()
        };
        assert!(invalid_envelope.validate().is_err());
    }
}