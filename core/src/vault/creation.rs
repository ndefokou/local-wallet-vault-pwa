//! Vault creation logic
//!
//! Mirrors `src/lib/vault/vaultCreation.ts`

use crate::base64url::generate_random_base64url;
use crate::crypto::aes_gcm::{create_envelope, generate_aes_key};
use crate::crypto::hkdf::derive_kek_from_prf;
use crate::crypto::key_wrap::wrap_dek;
use crate::error::Result;
use crate::types::{CipherEnvelopeV1, EnvelopePurpose, VaultMetadata, VaultPlaintextV1};

/// Result of vault creation
#[derive(Debug)]
pub struct CreateVaultResult {
    /// Vault metadata (to be stored in OPFS)
    pub metadata: VaultMetadata,
    /// Wrapped DEK envelope (to be stored in OPFS)
    pub wrapped_keys: CipherEnvelopeV1,
    /// Encrypted manifest envelope (to be stored in OPFS)
    pub manifest: CipherEnvelopeV1,
    /// Initial vault plaintext (for in-memory use)
    pub vault: VaultPlaintextV1,
    /// DEK (Data Encryption Key) - 32 bytes
    pub dek: Vec<u8>,
}

/// Create a new vault
///
/// This function handles the cryptographic operations for vault creation.
/// The OPFS and WebAuthn operations are handled by the TypeScript bridge.
///
/// # Arguments
/// * `prf_output` - PRF output from WebAuthn (32 bytes)
/// * `credential_id` - WebAuthn credential ID (base64url encoded)
/// * `user_handle` - WebAuthn user handle (base64url encoded)
///
/// # Returns
/// CreateVaultResult containing all data needed to persist the vault
pub fn create_vault(
    prf_output: &[u8],
    prf_salt: &str,
    credential_id: &str,
    user_handle: &str,
    created_at: &str,
) -> Result<CreateVaultResult> {
    // Generate vault ID
    let vault_id = generate_random_base64url(32);

    // Derive KEK from PRF output
    let kek = derive_kek_from_prf(prf_output)?;

    // Generate DEK
    let dek = generate_aes_key();

    // Create vault metadata
    // Note: prf_salt is passed from TypeScript (generated there for WebAuthn PRF)
    let metadata = VaultMetadata::new(
        vault_id.clone(),
        credential_id.to_string(),
        user_handle.to_string(),
        prf_salt.to_string(),
        created_at.to_string(),
    );

    // Wrap DEK with KEK
    let wrapped_keys = wrap_dek(&kek, &dek, &vault_id)?;

    // Create initial empty vault
    let vault = VaultPlaintextV1::new(vault_id.clone(), created_at.to_string());

    // Encrypt vault manifest with DEK
    let manifest = create_envelope(
        &dek,
        &vault.to_json_bytes()?,
        vault_id,
        EnvelopePurpose::Manifest,
    )?;

    Ok(CreateVaultResult {
        metadata,
        wrapped_keys,
        manifest,
        vault,
        dek,
    })
}

/// Generate a new user handle for WebAuthn
pub fn generate_user_handle() -> String {
    generate_random_base64url(32)
}

/// Generate a new PRF salt
pub fn generate_prf_salt() -> String {
    generate_random_base64url(32)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_vault() {
        let prf_output = vec![1u8; 32];
        let prf_salt = "test-prf-salt-base64url";
        let credential_id = "cred-123";
        let user_handle = "user-456";
        let created_at = "2024-01-01T00:00:00Z";

        let result = create_vault(&prf_output, prf_salt, credential_id, user_handle, created_at).unwrap();

        assert_eq!(result.metadata.credential_id, credential_id);
        assert_eq!(result.metadata.credential_user_handle, user_handle);
        assert_eq!(result.wrapped_keys.magic, "LWV_ENVELOPE");
        assert_eq!(result.manifest.magic, "LWV_ENVELOPE");
        assert_eq!(result.dek.len(), 32);
    }

    #[test]
    fn test_generate_user_handle() {
        let handle1 = generate_user_handle();
        let handle2 = generate_user_handle();
        assert_ne!(handle1, handle2);
        assert!(!handle1.contains('+'));
        assert!(!handle1.contains('/'));
    }
}