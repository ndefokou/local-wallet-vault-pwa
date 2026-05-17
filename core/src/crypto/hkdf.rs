//! HKDF-SHA-256 key derivation utilities
//!
//! Mirrors `src/lib/crypto/hkdf.ts`

use hkdf::Hkdf;
use sha2::Sha256;

use crate::error::Result;

/// Derive a key using HKDF-SHA-256
///
/// # Arguments
/// * `ikm` - Input keying material
/// * `salt` - Salt value
/// * `info` - Context and application specific information
/// * `length` - Output length in bytes (default: 32)
///
/// # Returns
/// Derived key material
pub fn derive_key_hkdf(ikm: &[u8], salt: &[u8], info: &str, length: usize) -> Result<Vec<u8>> {
    let hkdf = Hkdf::<Sha256>::new(Some(salt), ikm);
    let mut okm = vec![0u8; length];
    hkdf.expand(info.as_bytes(), &mut okm)
        .expect("HKDF expand should not fail with valid output length");
    Ok(okm)
}

/// Derive a Key Encryption Key (KEK) from PRF output
///
/// This uses a zero salt since the PRF salt already provides randomness
///
/// # Arguments
/// * `prf_output` - PRF output from WebAuthn
///
/// # Returns
/// 32-byte KEK
pub fn derive_kek_from_prf(prf_output: &[u8]) -> Result<Vec<u8>> {
    derive_key_hkdf(
        prf_output,
        &[0u8; 32], // Zero salt
        "local-wallet-vault:kek:v1",
        32,
    )
}

/// Derive a backup encryption key from a user-provided password
///
/// # Arguments
/// * `password` - User password
/// * `salt` - Random salt
///
/// # Returns
/// 32-byte key
pub fn derive_backup_key(password: &str, salt: &[u8]) -> Result<Vec<u8>> {
    derive_key_hkdf(
        password.as_bytes(),
        salt,
        "local-wallet-vault:backup:v1",
        32,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_key_hkdf() {
        let ikm = b"input keying material";
        let salt = b"salt value";
        let info = "test context";
        let length = 32;

        let key1 = derive_key_hkdf(ikm, salt, info, length).unwrap();
        let key2 = derive_key_hkdf(ikm, salt, info, length).unwrap();

        // Same inputs should produce same output
        assert_eq!(key1, key2);
        assert_eq!(key1.len(), 32);
    }

    #[test]
    fn test_derive_key_hkdf_different_inputs() {
        let key1 = derive_key_hkdf(b"ikm1", b"salt", "info", 32).unwrap();
        let key2 = derive_key_hkdf(b"ikm2", b"salt", "info", 32).unwrap();
        let key3 = derive_key_hkdf(b"ikm1", b"salt2", "info", 32).unwrap();

        // Different inputs should produce different outputs
        assert_ne!(key1, key2);
        assert_ne!(key1, key3);
    }

    #[test]
    fn test_derive_kek_from_prf() {
        let prf_output = vec![1u8; 32];
        let kek = derive_kek_from_prf(&prf_output).unwrap();

        assert_eq!(kek.len(), 32);

        // Same PRF output should produce same KEK
        let kek2 = derive_kek_from_prf(&prf_output).unwrap();
        assert_eq!(kek, kek2);
    }

    #[test]
    fn test_derive_backup_key() {
        let password = "my-secret-password";
        let salt = vec![0u8; 16];

        let key1 = derive_backup_key(password, &salt).unwrap();
        let key2 = derive_backup_key(password, &salt).unwrap();

        assert_eq!(key1, key2);
        assert_eq!(key1.len(), 32);
    }
}