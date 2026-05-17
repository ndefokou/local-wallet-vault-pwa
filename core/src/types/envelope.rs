//! Cipher Envelope Types
//!
//! Mirrors `src/lib/types/envelope.ts`

use serde::{Deserialize, Serialize};

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
    /// Additional authenticated data
    pub aad: EnvelopeAad,
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
    /// Create a new envelope
    pub fn new(vault_id: String, purpose: EnvelopePurpose, nonce: Vec<u8>, ciphertext: Vec<u8>) -> Self {
        use crate::base64url::base64url_encode;
        
        Self {
            magic: "LWV_ENVELOPE".to_string(),
            version: 1,
            alg: "AES-GCM-256".to_string(),
            nonce: base64url_encode(&nonce),
            aad: EnvelopeAad {
                vault_id,
                purpose,
                schema_version: 1,
                record_id: None,
                revision: None,
            },
            ciphertext: base64url_encode(&ciphertext),
        }
    }

    /// Validate the envelope magic and version
    pub fn validate(&self) -> Result<(), crate::Error> {
        if self.magic != "LWV_ENVELOPE" {
            return Err(crate::Error::InvalidEnvelopeMagic);
        }
        if self.version != 1 {
            return Err(crate::Error::UnsupportedEnvelopeVersion(self.version));
        }
        if self.alg != "AES-GCM-256" {
            return Err(crate::Error::UnsupportedAlgorithm(self.alg.clone()));
        }
        Ok(())
    }

    /// Get the nonce as bytes
    pub fn nonce_bytes(&self) -> Result<Vec<u8>, crate::Error> {
        crate::base64url::base64url_decode(&self.nonce)
    }

    /// Get the ciphertext as bytes
    pub fn ciphertext_bytes(&self) -> Result<Vec<u8>, crate::Error> {
        crate::base64url::base64url_decode(&self.ciphertext)
    }

    /// Serialize the AAD to JSON bytes
    pub fn aad_bytes(&self) -> Result<Vec<u8>, crate::Error> {
        Ok(serde_json::to_string(&self.aad)?.into_bytes())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_envelope_serialization() {
        let envelope = CipherEnvelopeV1 {
            magic: "LWV_ENVELOPE".to_string(),
            version: 1,
            alg: "AES-GCM-256".to_string(),
            nonce: "test-nonce".to_string(),
            aad: EnvelopeAad {
                vault_id: "vault-123".to_string(),
                purpose: EnvelopePurpose::Manifest,
                schema_version: 1,
                record_id: None,
                revision: None,
            },
            ciphertext: "test-ciphertext".to_string(),
        };

        let json = serde_json::to_string(&envelope).unwrap();
        assert!(json.contains("LWV_ENVELOPE"));
        assert!(json.contains("vaultId"));

        let parsed: CipherEnvelopeV1 = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.magic, "LWV_ENVELOPE");
    }

    #[test]
    fn test_envelope_validation() {
        let valid_envelope = CipherEnvelopeV1 {
            magic: "LWV_ENVELOPE".to_string(),
            version: 1,
            alg: "AES-GCM-256".to_string(),
            nonce: "test".to_string(),
            aad: EnvelopeAad {
                vault_id: "vault".to_string(),
                purpose: EnvelopePurpose::Manifest,
                schema_version: 1,
                record_id: None,
                revision: None,
            },
            ciphertext: "test".to_string(),
        };
        assert!(valid_envelope.validate().is_ok());

        let invalid_envelope = CipherEnvelopeV1 {
            magic: "INVALID".to_string(),
            ..valid_envelope.clone()
        };
        assert!(invalid_envelope.validate().is_err());
    }
}