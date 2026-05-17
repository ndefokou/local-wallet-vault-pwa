//! WebAssembly bindings for the Local Wallet Vault Core
//!
//! This module provides the JavaScript/WASM interface for the vault operations.

use wasm_bindgen::prelude::*;

use crate::base64url::{base64url_decode, base64url_encode, generate_random_base64url, generate_random_bytes};
use crate::crypto::aes_gcm::{decrypt_aes_gcm, encrypt_aes_gcm, generate_aes_key};
use crate::crypto::hkdf::derive_key_hkdf;
use crate::crypto::key_wrap::{parse_envelope, serialize_envelope, unwrap_dek, wrap_dek};
use crate::types::{CipherEnvelopeV1, EnvelopePurpose};
use crate::vault::{create_vault, unlock_vault};

// ============================================================================
// Base64URL Functions
// ============================================================================

/// Encode bytes to base64url string
#[wasm_bindgen]
pub fn wasm_base64url_encode(data: &[u8]) -> String {
    base64url_encode(data)
}

/// Decode base64url string to bytes
#[wasm_bindgen]
pub fn wasm_base64url_decode(s: &str) -> Result<Vec<u8>, JsValue> {
    base64url_decode(s).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Generate random bytes
#[wasm_bindgen]
pub fn wasm_generate_random_bytes(length: usize) -> Vec<u8> {
    generate_random_bytes(length)
}

/// Generate random base64url string
#[wasm_bindgen]
pub fn wasm_generate_random_base64url(length: usize) -> String {
    generate_random_base64url(length)
}

// ============================================================================
// Crypto Functions
// ============================================================================

/// Generate a new AES-256 key
#[wasm_bindgen]
pub fn wasm_generate_aes_key() -> Vec<u8> {
    generate_aes_key()
}

/// Encrypt data using AES-GCM-256
#[wasm_bindgen]
pub fn wasm_encrypt_aes_gcm(key: &[u8], plaintext: &[u8], aad: &[u8]) -> Result<JsValue, JsValue> {
    let (ciphertext, nonce) = encrypt_aes_gcm(key, plaintext, aad)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    
    let result = js_sys::Object::new();
    js_sys::Reflect::set(&result, &"ciphertext".into(), &js_sys::Uint8Array::from(&ciphertext[..])).unwrap();
    js_sys::Reflect::set(&result, &"nonce".into(), &js_sys::Uint8Array::from(&nonce[..])).unwrap();
    
    Ok(result.into())
}

/// Decrypt data using AES-GCM-256
#[wasm_bindgen]
pub fn wasm_decrypt_aes_gcm(key: &[u8], ciphertext: &[u8], nonce: &[u8], aad: &[u8]) -> Result<Vec<u8>, JsValue> {
    decrypt_aes_gcm(key, ciphertext, nonce, aad)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Derive key using HKDF-SHA-256
#[wasm_bindgen]
pub fn wasm_derive_key_hkdf(ikm: &[u8], salt: &[u8], info: &str, length: usize) -> Vec<u8> {
    derive_key_hkdf(ikm, salt, info, length).unwrap_or_default()
}

/// Derive KEK from PRF output
#[wasm_bindgen]
pub fn wasm_derive_kek_from_prf(prf_output: &[u8]) -> Vec<u8> {
    crate::crypto::hkdf::derive_kek_from_prf(prf_output).unwrap_or_default()
}

// ============================================================================
// Key Wrap Functions
// ============================================================================

/// Wrap DEK with KEK
#[wasm_bindgen]
pub fn wasm_wrap_dek(kek: &[u8], dek: &[u8], vault_id: &str) -> Result<String, JsValue> {
    let envelope = wrap_dek(kek, dek, vault_id)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    serialize_envelope(&envelope).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Unwrap DEK with KEK
#[wasm_bindgen]
pub fn wasm_unwrap_dek(kek: &[u8], envelope_json: &str) -> Result<Vec<u8>, JsValue> {
    let envelope = parse_envelope(envelope_json)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    unwrap_dek(kek, &envelope).map_err(|e| JsValue::from_str(&e.to_string()))
}

// ============================================================================
// Envelope Functions
// ============================================================================

/// Create an envelope for encrypted data
#[wasm_bindgen]
pub fn wasm_create_envelope(key: &[u8], plaintext: &[u8], vault_id: &str, purpose: &str) -> Result<String, JsValue> {
    let purpose = match purpose {
        "dek-wrap" => EnvelopePurpose::DekWrap,
        "manifest" => EnvelopePurpose::Manifest,
        "wallet-record" => EnvelopePurpose::WalletRecord,
        "backup" => EnvelopePurpose::Backup,
        _ => return Err(JsValue::from_str("Invalid purpose")),
    };
    
    let envelope = crate::crypto::aes_gcm::create_envelope(key, plaintext, vault_id.to_string(), purpose)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    
    serde_json::to_string(&envelope).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Decrypt an envelope
#[wasm_bindgen]
pub fn wasm_decrypt_envelope(key: &[u8], envelope_json: &str) -> Result<Vec<u8>, JsValue> {
    let envelope: CipherEnvelopeV1 = serde_json::from_str(envelope_json)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    decrypt_aes_gcm(
        key,
        &envelope.ciphertext_bytes().map_err(|e| JsValue::from_str(&e.to_string()))?,
        &envelope.nonce_bytes().map_err(|e| JsValue::from_str(&e.to_string()))?,
        &envelope.aad_bytes().map_err(|e| JsValue::from_str(&e.to_string()))?,
    ).map_err(|e| JsValue::from_str(&e.to_string()))
}

// ============================================================================
// Vault Functions
// ============================================================================

/// Create a new vault
#[wasm_bindgen]
pub fn wasm_create_vault(prf_output: &[u8], credential_id: &str, user_handle: &str) -> Result<JsValue, JsValue> {
    let result = create_vault(prf_output, credential_id, user_handle)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    
    let obj = js_sys::Object::new();
    
    // Metadata
    let metadata_json = serde_json::to_string(&result.metadata)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    js_sys::Reflect::set(&obj, &"metadata".into(), &metadata_json.into()).unwrap();
    
    // Wrapped keys
    let wrapped_keys_json = serde_json::to_string(&result.wrapped_keys)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    js_sys::Reflect::set(&obj, &"wrappedKeys".into(), &wrapped_keys_json.into()).unwrap();
    
    // Manifest
    let manifest_json = serde_json::to_string(&result.manifest)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    js_sys::Reflect::set(&obj, &"manifest".into(), &manifest_json.into()).unwrap();
    
    // Vault
    let vault_json = serde_json::to_string(&result.vault)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    js_sys::Reflect::set(&obj, &"vault".into(), &vault_json.into()).unwrap();
    
    // DEK
    js_sys::Reflect::set(&obj, &"dek".into(), &js_sys::Uint8Array::from(&result.dek[..])).unwrap();
    
    Ok(obj.into())
}

/// Unlock a vault
#[wasm_bindgen]
pub fn wasm_unlock_vault(
    prf_output: &[u8],
    metadata_json: &str,
    wrapped_keys_json: &str,
    manifest_json: &str,
) -> Result<JsValue, JsValue> {
    let result = unlock_vault(prf_output, metadata_json, wrapped_keys_json, manifest_json)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    
    let obj = js_sys::Object::new();
    
    // Vault
    let vault_json = serde_json::to_string(&result.vault)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    js_sys::Reflect::set(&obj, &"vault".into(), &vault_json.into()).unwrap();
    
    // DEK
    js_sys::Reflect::set(&obj, &"dek".into(), &js_sys::Uint8Array::from(&result.dek[..])).unwrap();
    
    Ok(obj.into())
}

/// Encrypt a wallet record
#[wasm_bindgen]
pub fn wasm_encrypt_record(dek: &[u8], plaintext: &[u8], vault_id: &str, record_id: &str) -> Result<String, JsValue> {
    let envelope = crate::vault::unlock::encrypt_record(dek, plaintext, vault_id, record_id)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;
    serde_json::to_string(&envelope).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Decrypt a wallet record
#[wasm_bindgen]
pub fn wasm_decrypt_record(dek: &[u8], record_json: &str) -> Result<Vec<u8>, JsValue> {
    crate::vault::unlock::decrypt_record(dek, record_json)
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

// ============================================================================
// Utility Functions
// ============================================================================

/// Initialize the WASM module
#[wasm_bindgen]
pub fn wasm_init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Get the version of the WASM module
#[wasm_bindgen]
pub fn wasm_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}