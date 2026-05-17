/**
 * Base64URL encoding/decoding utilities for browser APIs
 *
 * This is a minimal implementation for WebAuthn and OPFS operations.
 * These need synchronous operations that don't depend on WASM initialization.
 */

/**
 * Encode a Uint8Array to base64url string
 */
export function base64urlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decode a base64url string to Uint8Array
 */
export function base64urlDecode(str: string): Uint8Array {
  const base64 = str
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/**
 * Generate random bytes
 */
export function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Generate a random base64url-encoded string
 */
export function generateRandomBase64url(length: number): string {
  return base64urlEncode(generateRandomBytes(length));
}