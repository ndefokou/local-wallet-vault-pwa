/**
 * Key wrap/unwrap utilities for wrapping DEK with KEK
 */

import { generateAESKey, importAESKey, exportAESKey, encryptAESGCM, decryptAESGCM } from './aesGcm';
import { base64urlEncode, base64urlDecode } from '../base64url';
import type { CipherEnvelopeV1 } from '../types/envelope';

/**
 * Wrap a Data Encryption Key (DEK) with a Key Encryption Key (KEK)
 */
export async function wrapDEK(
  kek: CryptoKey,
  dek: CryptoKey,
  vaultId: string
): Promise<CipherEnvelopeV1> {
  // Export the DEK to raw bytes
  const dekBytes = await exportAESKey(dek);
  
  // Create AAD for the wrap
  const aad = {
    vaultId,
    purpose: 'dek-wrap' as const,
    schemaVersion: 1,
  };
  const aadBytes = new TextEncoder().encode(JSON.stringify(aad));
  
  // Encrypt the DEK - encryptAESGCM generates and returns the nonce
  const { ciphertext, nonce } = await encryptAESGCM(kek, dekBytes, aadBytes);
  
  return {
    magic: 'LWV_ENVELOPE',
    version: 1,
    alg: 'AES-GCM-256',
    nonce: base64urlEncode(nonce),
    aad,
    ciphertext: base64urlEncode(ciphertext),
  };
}

/**
 * Unwrap a Data Encryption Key (DEK) with a Key Encryption Key (KEK)
 */
export async function unwrapDEK(
  kek: CryptoKey,
  envelope: CipherEnvelopeV1
): Promise<CryptoKey> {
  if (envelope.magic !== 'LWV_ENVELOPE') {
    throw new Error('Invalid envelope magic');
  }
  
  if (envelope.version !== 1) {
    throw new Error(`Unsupported envelope version: ${envelope.version}`);
  }
  
  if (envelope.alg !== 'AES-GCM-256') {
    throw new Error(`Unsupported algorithm: ${envelope.alg}`);
  }
  
  if (envelope.aad.purpose !== 'dek-wrap') {
    throw new Error(`Invalid purpose for DEK unwrap: ${envelope.aad.purpose}`);
  }
  
  // Decode the envelope
  const nonce = base64urlDecode(envelope.nonce);
  const ciphertext = base64urlDecode(envelope.ciphertext);
  const aadBytes = new TextEncoder().encode(JSON.stringify(envelope.aad));
  
  // Decrypt the DEK
  const dekBytes = await decryptAESGCM(kek, ciphertext, nonce, aadBytes);
  
  // Import as CryptoKey
  return importAESKey(dekBytes);
}

/**
 * Generate a new Data Encryption Key (DEK)
 */
export async function generateDEK(): Promise<CryptoKey> {
  return generateAESKey();
}

/**
 * Export DEK as base64url string (for backup purposes)
 */
export async function exportDEKBase64url(dek: CryptoKey): Promise<string> {
  const dekBytes = await exportAESKey(dek);
  return base64urlEncode(dekBytes);
}

/**
 * Import DEK from base64url string
 */
export async function importDEKBase64url(base64url: string): Promise<CryptoKey> {
  const dekBytes = base64urlDecode(base64url);
  return importAESKey(dekBytes);
}