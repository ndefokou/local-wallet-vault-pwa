//! Backup Types
//!
//! Mirrors `src/lib/types/backup.ts`

use serde::{Deserialize, Serialize};

use super::CipherEnvelopeV1;

/// Backup package version 1
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupPackageV1 {
    /// Magic identifier for the backup format
    pub magic: String, // "LWV_BACKUP"
    /// Backup version
    pub version: u8,
    /// Creation timestamp (ISO 8601)
    #[serde(rename = "createdAt")]
    pub created_at: String,
    /// Encryption configuration
    pub encryption: BackupEncryption,
    /// Encrypted payload
    pub payload: CipherEnvelopeV1,
}

/// Backup encryption configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupEncryption {
    /// Encryption algorithm
    pub alg: String, // "AES-GCM-256"
    /// Key format
    #[serde(rename = "keyFormat")]
    pub key_format: String, // "base64url-256-bit-random-user-held-key"
}

/// Vault metadata stored in OPFS
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultMetadata {
    /// Schema version
    #[serde(rename = "schemaVersion")]
    pub schema_version: u8,
    /// Vault identifier
    #[serde(rename = "vaultId")]
    pub vault_id: String,
    /// Creation timestamp (ISO 8601)
    #[serde(rename = "createdAt")]
    pub created_at: String,
    /// Last update timestamp (ISO 8601)
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    /// Relying party ID (hostname)
    #[serde(rename = "rpId")]
    pub rp_id: String,
    /// WebAuthn credential ID (base64url)
    #[serde(rename = "credentialId")]
    pub credential_id: String,
    /// WebAuthn user handle (base64url)
    #[serde(rename = "credentialUserHandle")]
    pub credential_user_handle: String,
    /// PRF salt (base64url)
    #[serde(rename = "prfSalt")]
    pub prf_salt: String,
    /// Key derivation function
    pub kdf: String, // "HKDF-SHA-256"
    /// Key wrapping algorithm
    #[serde(rename = "wrapAlg")]
    pub wrap_alg: String, // "AES-GCM-256"
    /// Data encryption algorithm
    #[serde(rename = "dataAlg")]
    pub data_alg: String, // "AES-GCM-256"
}

impl VaultMetadata {
    /// Create new vault metadata
    ///
    /// # Arguments
    /// * `vault_id` - Unique vault identifier
    /// * `credential_id` - WebAuthn credential ID (base64url)
    /// * `user_handle` - WebAuthn user handle (base64url)
    /// * `prf_salt` - PRF salt (base64url)
    /// * `created_at` - ISO 8601 timestamp (provided from JavaScript)
    pub fn new(vault_id: String, credential_id: String, user_handle: String, prf_salt: String, created_at: String) -> Self {
        Self {
            schema_version: 1,
            vault_id,
            created_at: created_at.clone(),
            updated_at: created_at,
            rp_id: "localhost".to_string(), // Will be set from JS
            credential_id,
            credential_user_handle: user_handle,
            prf_salt,
            kdf: "HKDF-SHA-256".to_string(),
            wrap_alg: "AES-GCM-256".to_string(),
            data_alg: "AES-GCM-256".to_string(),
        }
    }

    /// Serialize to JSON
    pub fn to_json(&self) -> Result<String, crate::Error> {
        Ok(serde_json::to_string(self)?)
    }

    /// Deserialize from JSON
    pub fn from_json(json: &str) -> Result<Self, crate::Error> {
        Ok(serde_json::from_str(json)?)
    }
}

/// Generate current ISO 8601 timestamp
///
/// Note: In WASM, SystemTime::now() is not supported, so this function
/// should not be used in WASM builds. Use JavaScript's `new Date().toISOString()`
/// instead and pass the timestamp to Rust functions.
#[cfg(not(target_arch = "wasm32"))]
fn current_timestamp() -> String {
    // Simple ISO 8601 timestamp without chrono dependency
    // In production, use chrono or time crate
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    // Approximate ISO 8601 format
    format!("{}Z", secs)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metadata_serialization() {
        let metadata = VaultMetadata::new(
            "vault-123".to_string(),
            "cred-456".to_string(),
            "user-789".to_string(),
            "salt-abc".to_string(),
            "2024-01-01T00:00:00Z".to_string(),
        );

        let json = serde_json::to_string(&metadata).unwrap();
        assert!(json.contains("vaultId"));
        assert!(json.contains("credentialId"));
        assert!(json.contains("HKDF-SHA-256"));

        let parsed: VaultMetadata = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.vault_id, "vault-123");
        assert_eq!(parsed.schema_version, 1);
    }

    #[test]
    fn test_backup_package_serialization() {
        let envelope = CipherEnvelopeV1::new(
            "vault-123".to_string(),
            crate::types::EnvelopePurpose::Backup,
            vec![0u8; 12],
            vec![1u8; 32],
        );

        let backup = BackupPackageV1 {
            magic: "LWV_BACKUP".to_string(),
            version: 1,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            encryption: BackupEncryption {
                alg: "AES-GCM-256".to_string(),
                key_format: "base64url-256-bit-random-user-held-key".to_string(),
            },
            payload: envelope,
        };

        let json = serde_json::to_string(&backup).unwrap();
        assert!(json.contains("LWV_BACKUP"));
        assert!(json.contains("LWV_ENVELOPE"));
    }
}