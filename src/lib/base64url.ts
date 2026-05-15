/**
 * Base64url encoding/decoding utilities
 * Used for encoding binary data in a URL-safe format
 */

/**
 * Encode a Uint8Array to base64url string
 */
export function base64urlEncode(data: Uint8Array | ArrayBuffer): string {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
  return btoa(binString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

/**
 * Decode a base64url string to Uint8Array
 */
export function base64urlDecode(str: string): Uint8Array {
  const base64 = str
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  // Add padding if needed
  const padding = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  const paddedBase64 = base64 + padding;
  
  const binString = atob(paddedBase64);
  const bytes = new Uint8Array(binString.length);
  for (let i = 0; i < binString.length; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate cryptographically random bytes
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