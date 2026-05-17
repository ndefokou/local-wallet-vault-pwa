//! Base64URL encoding/decoding utilities
//!
//! Used for encoding binary data in a URL-safe format.
//! Compatible with the TypeScript implementation in `base64url.ts`.

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rand::RngCore;

/// Encode a byte slice to base64url string (no padding)
pub fn base64url_encode(data: &[u8]) -> String {
    URL_SAFE_NO_PAD.encode(data)
}

/// Decode a base64url string to bytes
pub fn base64url_decode(s: &str) -> Result<Vec<u8>, crate::Error> {
    URL_SAFE_NO_PAD
        .decode(s)
        .map_err(crate::Error::from)
}

/// Generate cryptographically random bytes
pub fn generate_random_bytes(length: usize) -> Vec<u8> {
    let mut bytes = vec![0u8; length];
    rand::thread_rng().fill_bytes(&mut bytes);
    bytes
}

/// Generate a random base64url-encoded string
pub fn generate_random_base64url(length: usize) -> String {
    base64url_encode(&generate_random_bytes(length))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_decode() {
        let data = b"hello world";
        let encoded = base64url_encode(data);
        let decoded = base64url_decode(&encoded).unwrap();
        assert_eq!(data.to_vec(), decoded);
    }

    #[test]
    fn test_url_safe() {
        let data = b"\xff\xfe\xfd";
        let encoded = base64url_encode(data);
        assert!(!encoded.contains('+'));
        assert!(!encoded.contains('/'));
        assert!(!encoded.contains('='));
    }

    #[test]
    fn test_generate_random_bytes() {
        let bytes1 = generate_random_bytes(32);
        let bytes2 = generate_random_bytes(32);
        assert_eq!(bytes1.len(), 32);
        assert_eq!(bytes2.len(), 32);
        assert_ne!(bytes1, bytes2); // Very unlikely to be equal
    }

    #[test]
    fn test_generate_random_base64url() {
        let s = generate_random_base64url(32);
        assert_eq!(s.len(), 43); // 32 bytes -> 43 base64url chars (no padding)
    }
}