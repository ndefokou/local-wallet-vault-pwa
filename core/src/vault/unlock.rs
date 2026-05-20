//! Vault unlock logic
//!
//! Mirrors `src/lib/vault/vaultUnlock.ts`

use crate::crypto::aes_gcm::decrypt_envelope;
use crate::crypto::hkdf::derive_kek_from_prf;
use crate::crypto::key_wrap::unwrap_dek;
use crate::error::{Error, Result};
use crate::types::{CipherEnvelopeV1, VaultMetadata, VaultPlaintextV1};

/// Result of vault unlock
#[derive(Debug)]
pub struct UnlockVaultResult {
    /// Decrypted vault plaintext
    pub vault: VaultPlaintextV1,
    /// DEK (Data Encryption Key) - 32 bytes
    pub dek: Vec<u8>,
}

/// Unlock the vault using PRF output
///
/// This function handles the cryptographic operations for vault unlock.
/// The OPFS and WebAuthn operations are handled by the TypeScript bridge.
///
/// # Arguments
/// * `prf_output` - PRF output from WebAuthn (32 bytes)
/// * `metadata_json` - Vault metadata JSON from OPFS
/// * `wrapped_keys_json` - Wrapped keys envelope JSON from OPFS
/// * `manifest_json` - Encrypted manifest envelope JSON from OPFS
///
/// # Returns
/// UnlockVaultResult containing the decrypted vault and DEK
pub fn unlock_vault(
    prf_output: &[u8],
    metadata_json: &str,
    wrapped_keys_json: &str,
    manifest_json: &str,
) -> Result<UnlockVaultResult> {
    // Parse metadata
    let metadata: VaultMetadata = serde_json::from_str(metadata_json)
        .map_err(|e| Error::VaultCorrupted(format!("Invalid metadata: {}", e)))?;

    // Parse wrapped keys envelope
    let wrapped_keys: CipherEnvelopeV1 = serde_json::from_str(wrapped_keys_json)
        .map_err(|e| Error::VaultCorrupted(format!("Invalid wrapped keys: {}", e)))?;

    // Parse manifest envelope
    let manifest: CipherEnvelopeV1 = serde_json::from_str(manifest_json)
        .map_err(|e| Error::VaultCorrupted(format!("Invalid manifest: {}", e)))?;

    // Derive KEK from PRF output
    let kek = derive_kek_from_prf(prf_output)?;

    // Unwrap DEK
    let dek = unwrap_dek(&kek, &wrapped_keys)
        .map_err(|e| Error::AuthenticationFailed(format!("Failed to unwrap DEK: {}", e)))?;

    // Decrypt vault manifest
    let plaintext = decrypt_envelope(&dek, &manifest)
        .map_err(|e| Error::AuthenticationFailed(format!("Failed to decrypt manifest: {}", e)))?;

    // Parse vault plaintext
    let vault: VaultPlaintextV1 = VaultPlaintextV1::from_json_bytes(&plaintext)
        .map_err(|e| Error::VaultCorrupted(format!("Invalid vault data: {}", e)))?;

    // Verify vault ID matches
    if vault.vault_id != metadata.vault_id {
        return Err(Error::VaultCorrupted("Vault ID mismatch".to_string()));
    }

    Ok(UnlockVaultResult { vault, dek })
}

/// Decrypt a wallet record
///
/// # Arguments
/// * `dek` - Data Encryption Key (32 bytes)
/// * `record_json` - Encrypted record envelope JSON from OPFS
///
/// # Returns
/// Decrypted record bytes
pub fn decrypt_record(dek: &[u8], record_json: &str) -> Result<Vec<u8>> {
    let envelope: CipherEnvelopeV1 = serde_json::from_str(record_json)
        .map_err(|e| Error::VaultCorrupted(format!("Invalid record envelope: {}", e)))?;

    decrypt_envelope(dek, &envelope)
        .map_err(|e| Error::DecryptionFailed(format!("Failed to decrypt record: {}", e)))
}

/// Encrypt a wallet record
///
/// # Arguments
/// * `dek` - Data Encryption Key (32 bytes)
/// * `plaintext` - Record data to encrypt
/// * `vault_id` - Vault identifier
/// * `record_id` - Record identifier
///
/// # Returns
/// Encrypted record envelope
pub fn encrypt_record(
    dek: &[u8],
    plaintext: &[u8],
    vault_id: &str,
    record_id: &str,
) -> Result<CipherEnvelopeV1> {
    use crate::types::EnvelopeAad;
    
    // Create AAD with record ID included
    let aad = EnvelopeAad {
        vault_id: vault_id.to_string(),
        purpose: crate::types::EnvelopePurpose::WalletRecord,
        schema_version: 1,
        record_id: Some(record_id.to_string()),
        revision: None,
    };
    let aad_bytes = serde_json::to_vec(&aad)?;
    
    // Encrypt the plaintext
    let (ciphertext, nonce) = crate::crypto::aes_gcm::encrypt_aes_gcm(dek, plaintext, &aad_bytes)?;
    
    Ok(CipherEnvelopeV1::new_with_aad(
        vault_id.to_string(),
        crate::types::EnvelopePurpose::WalletRecord,
        nonce,
        ciphertext,
        aad_bytes,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::base64url::base64url_encode;
    use crate::crypto::aes_gcm::generate_aes_key;
    use crate::vault::creation::create_vault;

    #[test]
    fn test_unlock_vault() {
        // Create a vault first
        let prf_output = vec![1u8; 32];
        let prf_salt = "test-prf-salt-base64url";
        let credential_id = "cred-123";
        let user_handle = "user-456";
        let created_at = "2024-01-01T00:00:00Z";

        let created = create_vault(&prf_output, prf_salt, credential_id, user_handle, created_at).unwrap();

        // Serialize for storage
        let metadata_json = serde_json::to_string(&created.metadata).unwrap();
        let wrapped_keys_json = serde_json::to_string(&created.wrapped_keys).unwrap();
        let manifest_json = serde_json::to_string(&created.manifest).unwrap();

        // Unlock the vault
        let result = unlock_vault(&prf_output, &metadata_json, &wrapped_keys_json, &manifest_json).unwrap();

        assert_eq!(result.vault.vault_id, created.vault.vault_id);
        assert_eq!(result.dek.len(), 32);
    }

    #[test]
    fn test_unlock_vault_wrong_prf() {
        // Create a vault
        let prf_output = vec![1u8; 32];
        let prf_salt = "test-prf-salt-base64url";
        let created_at = "2024-01-01T00:00:00Z";
        let created = create_vault(&prf_output, prf_salt, "cred", "user", created_at).unwrap();

        // Try to unlock with wrong PRF output
        let wrong_prf = vec![2u8; 32];
        let metadata_json = serde_json::to_string(&created.metadata).unwrap();
        let wrapped_keys_json = serde_json::to_string(&created.wrapped_keys).unwrap();
        let manifest_json = serde_json::to_string(&created.manifest).unwrap();

        let result = unlock_vault(&wrong_prf, &metadata_json, &wrapped_keys_json, &manifest_json);
        assert!(result.is_err());
    }

    #[test]
    fn test_encrypt_decrypt_record() {
        let dek = generate_aes_key();
        let vault_id = "vault-123";
        let record_id = "record-456";
        let plaintext = b"wallet secret data";

        let envelope = encrypt_record(&dek, plaintext, vault_id, record_id).unwrap();
        assert_eq!(envelope.aad.record_id, Some(record_id.to_string()));

        let envelope_json = serde_json::to_string(&envelope).unwrap();
        let decrypted = decrypt_record(&dek, &envelope_json).unwrap();

        assert_eq!(plaintext.to_vec(), decrypted);
    }
}