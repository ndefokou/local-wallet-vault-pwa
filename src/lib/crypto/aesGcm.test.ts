import { describe, it, expect } from 'vitest';
import { generateAESKey, importAESKey, exportAESKey, encryptAESGCM, decryptAESGCM } from './aesGcm';

describe('AES-GCM Crypto', () => {
  it('should generate a valid AES key', async () => {
    const key = await generateAESKey();
    expect(key).toBeDefined();
    expect(key.type).toBe('secret');
    expect(key.algorithm.name).toBe('AES-GCM');
  });

  it('should export and import a key correctly', async () => {
    const key = await generateAESKey();
    const exported = await exportAESKey(key);
    expect(exported).toBeInstanceOf(Uint8Array);
    expect(exported.length).toBe(32); // 256 bits

    const imported = await importAESKey(exported);
    expect(imported).toBeDefined();
    expect(imported.algorithm.name).toBe('AES-GCM');
  });

  it('should encrypt and decrypt correctly', async () => {
    const key = await generateAESKey();
    const plaintext = new TextEncoder().encode('Hello, World!');
    const aad = new TextEncoder().encode('additional-data');

    const { ciphertext, nonce } = await encryptAESGCM(key, plaintext, aad);
    expect(ciphertext).toBeInstanceOf(Uint8Array);
    expect(nonce).toBeInstanceOf(Uint8Array);
    expect(nonce.length).toBe(12); // 96 bits

    const decrypted = await decryptAESGCM(key, ciphertext, nonce, aad);
    expect(new TextDecoder().decode(decrypted)).toBe('Hello, World!');
  });

  it('should fail decryption with wrong key', async () => {
    const key1 = await generateAESKey();
    const key2 = await generateAESKey();
    const plaintext = new TextEncoder().encode('Secret message');
    const aad = new TextEncoder().encode('additional-data');

    const { ciphertext, nonce } = await encryptAESGCM(key1, plaintext, aad);
    
    await expect(decryptAESGCM(key2, ciphertext, nonce, aad)).rejects.toThrow();
  });

  it('should fail decryption with wrong AAD', async () => {
    const key = await generateAESKey();
    const plaintext = new TextEncoder().encode('Secret message');
    const aad1 = new TextEncoder().encode('additional-data-1');
    const aad2 = new TextEncoder().encode('additional-data-2');

    const { ciphertext, nonce } = await encryptAESGCM(key, plaintext, aad1);
    
    await expect(decryptAESGCM(key, ciphertext, nonce, aad2)).rejects.toThrow();
  });

  it('should produce different ciphertext for same plaintext (nonce uniqueness)', async () => {
    const key = await generateAESKey();
    const plaintext = new TextEncoder().encode('Same message');
    const aad = new TextEncoder().encode('additional-data');

    const result1 = await encryptAESGCM(key, plaintext, aad);
    const result2 = await encryptAESGCM(key, plaintext, aad);

    // Nonces should be different
    expect(result1.nonce).not.toEqual(result2.nonce);
    // Ciphertexts should be different
    expect(result1.ciphertext).not.toEqual(result2.ciphertext);
  });
});