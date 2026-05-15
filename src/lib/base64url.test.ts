import { describe, it, expect } from 'vitest';
import { 
  base64urlEncode, 
  base64urlDecode, 
  generateRandomBytes, 
  generateRandomBase64url 
} from './base64url';

describe('Base64URL Utilities', () => {
  it('should encode bytes to base64url', () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const encoded = base64urlEncode(bytes);
    expect(encoded).toBe('SGVsbG8');
  });

  it('should decode base64url to bytes', () => {
    const encoded = 'SGVsbG8';
    const decoded = base64urlDecode(encoded);
    expect(decoded).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(decoded)).toBe('Hello');
  });

  it('should handle URL-safe characters', () => {
    // Test with bytes that produce + and / in standard base64
    const bytes = new Uint8Array([255, 239, 191, 189, 207]);
    const encoded = base64urlEncode(bytes);
    // Should not contain + or /
    expect(encoded).not.toMatch(/[+/]/);
    // Should contain - and _ instead
    expect(encoded).toMatch(/[-_]/);
  });

  it('should roundtrip correctly', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5, 255, 128, 64, 32]);
    const encoded = base64urlEncode(original);
    const decoded = base64urlDecode(encoded);
    expect(decoded).toEqual(original);
  });

  it('should generate random bytes of correct length', () => {
    const bytes16 = generateRandomBytes(16);
    const bytes32 = generateRandomBytes(32);
    
    expect(bytes16.length).toBe(16);
    expect(bytes32.length).toBe(32);
  });

  it('should generate different random bytes each time', () => {
    const bytes1 = generateRandomBytes(32);
    const bytes2 = generateRandomBytes(32);
    expect(bytes1).not.toEqual(bytes2);
  });

  it('should generate random base64url strings', () => {
    const str16 = generateRandomBase64url(16);
    const str32 = generateRandomBase64url(32);
    
    // 16 bytes = 22 base64url chars (without padding)
    expect(str16.length).toBe(22);
    // 32 bytes = 43 base64url chars (without padding)
    expect(str32.length).toBe(43);
    
    // Should only contain base64url characters
    expect(str16).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(str32).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});