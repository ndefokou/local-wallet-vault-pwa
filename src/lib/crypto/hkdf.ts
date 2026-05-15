/**
 * HKDF-SHA-256 key derivation utilities
 */

const HKDF_HASH = 'SHA-256';

/**
 * Derive a key using HKDF-SHA-256
 */
export async function deriveKeyHKDF(
  inputKeyingMaterial: Uint8Array,
  salt: Uint8Array,
  info: string,
  keyLength: number = 32
): Promise<CryptoKey> {
  // Import the input keying material
  const ikm = await crypto.subtle.importKey(
    'raw',
    inputKeyingMaterial.buffer as ArrayBuffer,
    'HKDF',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Derive the key
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: HKDF_HASH,
      salt: salt.buffer as ArrayBuffer,
      info: new TextEncoder().encode(info),
    },
    ikm,
    {
      name: 'AES-GCM',
      length: keyLength * 8, // Convert bytes to bits
    },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
  
  return derivedKey;
}

/**
 * Derive raw bits using HKDF-SHA-256
 */
export async function deriveBitsHKDF(
  inputKeyingMaterial: Uint8Array,
  salt: Uint8Array,
  info: string,
  length: number = 32
): Promise<Uint8Array> {
  // Import the input keying material
  const ikm = await crypto.subtle.importKey(
    'raw',
    inputKeyingMaterial.buffer as ArrayBuffer,
    'HKDF',
    false,
    ['deriveBits']
  );
  
  // Derive bits
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: HKDF_HASH,
      salt: salt.buffer as ArrayBuffer,
      info: new TextEncoder().encode(info),
    },
    ikm,
    length * 8 // Convert bytes to bits
  );
  
  return new Uint8Array(derivedBits);
}

/**
 * Derive a key-encryption key from PRF output
 */
export async function deriveKEKFromPRF(
  prfOutput: Uint8Array,
  vaultId: string
): Promise<CryptoKey> {
  // Use a fixed salt for KEK derivation (no additional salt needed)
  const salt = new Uint8Array(32); // Zero salt
  
  const info = `local-wallet-vault:kek:v1:${vaultId}`;
  
  return deriveKeyHKDF(prfOutput, salt, info, 32);
}

/**
 * Derive a backup key-encryption key from a backup key
 */
export async function deriveBackupKEK(
  backupKey: Uint8Array,
  vaultId: string
): Promise<CryptoKey> {
  const salt = new Uint8Array(32); // Zero salt
  const info = `local-wallet-vault:backup-kek:v1:${vaultId}`;
  
  return deriveKeyHKDF(backupKey, salt, info, 32);
}