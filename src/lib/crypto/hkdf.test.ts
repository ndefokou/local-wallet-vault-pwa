import { describe, it, expect } from 'vitest';
import { deriveKeyHKDF, deriveBitsHKDF } from './hkdf';

describe('HKDF', () => {
  it('should derive a key from input keying material', async () => {
    const ikm = new Uint8Array(32).fill(1);
    const salt = new Uint8Array(32).fill(2);
    const info = 'test-info';

    const key = await deriveKeyHKDF(ikm, salt, info, 32);
    expect(key).toBeDefined();
    expect(key.type).toBe('secret');
    expect(key.algorithm.name).toBe('AES-GCM');
  });

  it('should derive different keys for different info', async () => {
    const ikm = new Uint8Array(32).fill(1);
    const salt = new Uint8Array(32).fill(2);

    const key1 = await deriveKeyHKDF(ikm, salt, 'info-1', 32);
    const key2 = await deriveKeyHKDF(ikm, salt, 'info-2', 32);

    // Keys should be different
    const exported1 = await crypto.subtle.exportKey('raw', key1);
    const exported2 = await crypto.subtle.exportKey('raw', key2);
    expect(new Uint8Array(exported1)).not.toEqual(new Uint8Array(exported2));
  });

  it('should derive different keys for different salts', async () => {
    const ikm = new Uint8Array(32).fill(1);
    const salt1 = new Uint8Array(32).fill(1);
    const salt2 = new Uint8Array(32).fill(2);
    const info = 'test-info';

    const key1 = await deriveKeyHKDF(ikm, salt1, info, 32);
    const key2 = await deriveKeyHKDF(ikm, salt2, info, 32);

    const exported1 = await crypto.subtle.exportKey('raw', key1);
    const exported2 = await crypto.subtle.exportKey('raw', key2);
    expect(new Uint8Array(exported1)).not.toEqual(new Uint8Array(exported2));
  });

  it('should derive raw bits', async () => {
    const ikm = new Uint8Array(32).fill(1);
    const salt = new Uint8Array(32).fill(2);
    const info = 'test-info';

    const bits = await deriveBitsHKDF(ikm, salt, info, 32);
    expect(bits).toBeInstanceOf(Uint8Array);
    expect(bits.length).toBe(32);
  });

  it('should produce deterministic output for same inputs', async () => {
    const ikm = new Uint8Array(32).fill(1);
    const salt = new Uint8Array(32).fill(2);
    const info = 'test-info';

    const key1 = await deriveKeyHKDF(ikm, salt, info, 32);
    const key2 = await deriveKeyHKDF(ikm, salt, info, 32);

    const exported1 = await crypto.subtle.exportKey('raw', key1);
    const exported2 = await crypto.subtle.exportKey('raw', key2);
    expect(new Uint8Array(exported1)).toEqual(new Uint8Array(exported2));
  });
});