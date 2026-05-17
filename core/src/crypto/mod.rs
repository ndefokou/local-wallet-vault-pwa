//! Cryptographic utilities for the Local Wallet Vault
//!
//! This module provides AES-GCM-256 encryption, HKDF-SHA-256 key derivation,
//! and key wrapping functionality.

pub mod aes_gcm;
pub mod hkdf;
pub mod key_wrap;

pub use aes_gcm::{create_envelope, decrypt_aes_gcm, decrypt_envelope, encrypt_aes_gcm, generate_aes_key};
pub use hkdf::{derive_backup_key, derive_key_hkdf, derive_kek_from_prf};
pub use key_wrap::{parse_envelope, serialize_envelope, unwrap_dek, wrap_dek};