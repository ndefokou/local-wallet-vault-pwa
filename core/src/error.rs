//! Error types for the Local Wallet Vault Core

use thiserror::Error;

#[derive(Debug, Error)]
pub enum Error {
    #[error("Base64URL encoding error: {0}")]
    Base64Error(#[from] base64::DecodeError),

    #[error("Crypto error: {0}")]
    CryptoError(String),

    #[error("Invalid key length")]
    InvalidKeyLength,

    #[error("Invalid nonce length")]
    InvalidNonceLength,

    #[error("Encryption failed")]
    EncryptionFailed,

    #[error("Decryption failed: {0}")]
    DecryptionFailed(String),

    #[error("Invalid envelope magic: expected 'LWV_ENVELOPE'")]
    InvalidEnvelopeMagic,

    #[error("Unsupported envelope version: {0}")]
    UnsupportedEnvelopeVersion(u8),

    #[error("Unsupported algorithm: {0}")]
    UnsupportedAlgorithm(String),

    #[error("Invalid envelope purpose: {0}")]
    InvalidEnvelopePurpose(String),

    #[error("JSON serialization error: {0}")]
    JsonError(#[from] serde_json::Error),

    #[error("IO error: {0}")]
    IoError(String),

    #[error("Vault not found")]
    VaultNotFound,

    #[error("Vault corrupted: {0}")]
    VaultCorrupted(String),

    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),
}

pub type Result<T> = std::result::Result<T, Error>;

// Implement From<Error> for wasm_bindgen::JsValue for WASM bindings
#[cfg(target_arch = "wasm32")]
impl From<Error> for wasm_bindgen::JsValue {
    fn from(error: Error) -> Self {
        wasm_bindgen::JsValue::from_str(&error.to_string())
    }
}