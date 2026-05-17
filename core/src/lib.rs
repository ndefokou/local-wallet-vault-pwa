//! Local Wallet Vault Core
//!
//! Core cryptographic and business logic for the Local Wallet Vault PWA.
//! This crate is compiled to WebAssembly for use in the browser.

pub mod base64url;
pub mod crypto;
pub mod error;
pub mod types;
pub mod vault;
pub mod wasm;

// Re-exports for convenience
pub use base64url::{base64url_decode, base64url_encode, generate_random_bytes};
pub use error::{Error, Result};
pub use types::{BackupPackageV1, CipherEnvelopeV1, EnvelopePurpose, VaultMetadata, VaultPlaintextV1};
pub use vault::{create_vault, unlock_vault};

/// Initialize the WASM module (required for wasm-bindgen)
#[cfg(target_arch = "wasm32")]
pub fn init() {
    // Set up panic hook for better error messages in browser console
    console_error_panic_hook::set_once();
}