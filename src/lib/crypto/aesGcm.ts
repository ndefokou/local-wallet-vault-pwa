/**
 * AES-GCM-256 encryption utilities
 */

import { base64urlEncode, base64urlDecode, generateRandomBytes } from '../base64url';
import type { CipherEnvelopeV1, EnvelopePurpose } from '../types/envelope';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const NONCE_LENGTH = 12; // 96 bits

/**
 * Generate a new AES-GCM-256 key
 */
export async function generateAESKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Import a raw key as a CryptoKey for AES-GCM
 */
export async function importAESKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    rawKey.buffer as ArrayBuffer,
    { name: ALGORITHM },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Export a CryptoKey as raw bytes
 */
export async function exportAESKey(key: CryptoKey): Promise<Uint8Array> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(exported);
}

/**
 * Encrypt data using AES-GCM-256
 */
export async function encryptAESGCM(
  key: CryptoKey,
  plaintext: Uint8Array,
  aad: Uint8Array
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> {
  const nonce = generateRandomBytes(NONCE_LENGTH);
  
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: nonce.buffer as ArrayBuffer,
      additionalData: aad.buffer as ArrayBuffer,
    },
    key,
    plaintext.buffer as ArrayBuffer
  );
  
  return {
    ciphertext: new Uint8Array(ciphertext),
    nonce,
  };
}

/**
 * Decrypt data using AES-GCM-256
 */
export async function decryptAESGCM(
  key: CryptoKey,
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  aad: Uint8Array
): Promise<Uint8Array> {
  const plaintext = await crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: nonce.buffer as ArrayBuffer,
      additionalData: aad.buffer as ArrayBuffer,
    },
    key,
    ciphertext.buffer as ArrayBuffer
  );
  
  return new Uint8Array(plaintext);
}

/**
 * Create a cipher envelope for encrypted data
 */
export async function createEnvelope(
  key: CryptoKey,
  plaintext: Uint8Array,
  vaultId: string,
  purpose: EnvelopePurpose,
  recordId?: string
): Promise<CipherEnvelopeV1> {
  const aadData = {
    vaultId,
    purpose,
    schemaVersion: 1,
    ...(recordId ? { recordId } : {}),
  };
  
  const aadBytes = new TextEncoder().encode(JSON.stringify(aadData));
  const { ciphertext, nonce } = await encryptAESGCM(key, plaintext, aadBytes);
  
  return {
    magic: 'LWV_ENVELOPE',
    version: 1,
    alg: 'AES-GCM-256',
    nonce: base64urlEncode(nonce),
    aad: aadData,
    ciphertext: base64urlEncode(ciphertext),
  };
}

/**
 * Decrypt a cipher envelope
 */
export async function decryptEnvelope(
  key: CryptoKey,
  envelope: CipherEnvelopeV1
): Promise<Uint8Array> {
  if (envelope.magic !== 'LWV_ENVELOPE') {
    throw new Error('Invalid envelope magic');
  }
  
  if (envelope.version !== 1) {
    throw new Error(`Unsupported envelope version: ${envelope.version}`);
  }
  
  if (envelope.alg !== 'AES-GCM-256') {
    throw new Error(`Unsupported algorithm: ${envelope.alg}`);
  }
  
  const nonce = base64urlDecode(envelope.nonce);
  const ciphertext = base64urlDecode(envelope.ciphertext);
  const aadBytes = new TextEncoder().encode(JSON.stringify(envelope.aad));
  
  return decryptAESGCM(key, ciphertext, nonce, aadBytes);
}