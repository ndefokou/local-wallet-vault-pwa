/**
 * Vault operations using WASM core
 *
 * This module provides vault creation and unlock operations using the Rust WASM core.
 * The OPFS and WebAuthn operations remain in TypeScript (browser APIs).
 */

import {
  loadVaultMetadata,
  saveVaultMetadata,
  loadWrappedKeys,
  saveWrappedKeys,
  loadManifest,
  saveManifest,
  vaultExists,
} from '../opfs/vaultStore';
import {
  createCredentialWithPRF,
  getPRFOutputByCredential,
  generateUserHandle,
  generatePRFSalt,
} from '../webauthn/prf';
import {
  init as initWasm,
  isInitialized as isWasmInitialized,
  base64urlEncode,
  base64urlDecode,
  createVault as wasmCreateVault,
  unlockVault as wasmUnlockVault,
  encryptRecord as wasmEncryptRecord,
  decryptRecord as wasmDecryptRecord,
  generateAESKey,
} from '../wasm/index';
import type { VaultMetadata } from '../types/backup';
import type { VaultPlaintextV1, WalletRecord } from '../types/vault';
import type { CipherEnvelopeV1 } from '../types/envelope';

// Re-export types
export type { VaultMetadata, VaultPlaintextV1, WalletRecord, CipherEnvelopeV1 };

// Track initialization state
let wasmInitPromise: Promise<void> | null = null;
let wasmReady = false;

/**
 * Initialize the WASM module
 * Must be called before any other functions
 */
export async function init(): Promise<void> {
  if (wasmReady) return;
  
  if (wasmInitPromise) {
    return wasmInitPromise;
  }
  
  wasmInitPromise = initWasm().then(() => {
    wasmReady = true;
  });
  
  return wasmInitPromise;
}

/**
 * Check if WASM module is initialized
 */
export function isInitialized(): boolean {
  return wasmReady || isWasmInitialized();
}

/**
 * Ensure WASM is initialized before operations
 */
function ensureInitialized(): void {
  if (!isInitialized()) {
    throw new Error('WASM module not initialized. Call init() first.');
  }
}

// ============================================================================
// Vault Creation
// ============================================================================

export interface CreateVaultResult {
  success: boolean;
  vault?: VaultPlaintextV1;
  dek?: Uint8Array;
  error?: string;
}

/**
 * Create a new vault with WebAuthn PRF protection
 *
 * This function orchestrates:
 * 1. WebAuthn credential creation (TypeScript - browser API)
 * 2. PRF output derivation (TypeScript - browser API)
 * 3. Vault creation with crypto (Rust WASM)
 * 4. OPFS storage (TypeScript - browser API)
 */
export async function createVault(): Promise<CreateVaultResult> {
  try {
    // Ensure WASM is initialized
    ensureInitialized();
    
    // Step 1: Generate random user handle and PRF salt
    const userHandle = generateUserHandle();
    const prfSalt = generatePRFSalt();

    // Step 2: Create WebAuthn credential with PRF extension (TypeScript - browser API)
    let credentialResult;
    try {
      credentialResult = await createCredentialWithPRF(userHandle);
    } catch (error) {
      console.error('Failed to create credential:', error);
      return {
        success: false,
        error: 'Failed to create passkey. Please ensure your device supports WebAuthn PRF.',
      };
    }

    if (!credentialResult.prfEnabled) {
      return {
        success: false,
        error: 'PRF extension is not enabled for this credential. Please try a different authenticator.',
      };
    }

    // Step 3: Get PRF output from WebAuthn (TypeScript - browser API)
    let prfOutput;
    try {
      prfOutput = await getPRFOutputByCredential(credentialResult.credentialId, prfSalt);
    } catch (error) {
      console.error('Failed to get PRF output:', error);
      return {
        success: false,
        error: 'Failed to derive key from passkey. Please try again.',
      };
    }

    // Step 4: Create vault using WASM (Rust - crypto)
    // Generate timestamp in JavaScript (WASM doesn't support SystemTime)
    const createdAt = new Date().toISOString();
    const prfSaltBase64 = base64urlEncode(prfSalt);
    const wasmResult = wasmCreateVault(
      prfOutput,
      prfSaltBase64,
      credentialResult.credentialId,
      base64urlEncode(userHandle),
      createdAt
    );

    // Parse results
    const metadata: VaultMetadata = JSON.parse(wasmResult.metadata);
    const vault: VaultPlaintextV1 = JSON.parse(wasmResult.vault);

    // Step 5: Save to OPFS (TypeScript - browser API)
    await saveVaultMetadata(metadata);
    await saveWrappedKeys(JSON.parse(wasmResult.wrappedKeys));
    await saveManifest(JSON.parse(wasmResult.manifest));

    return {
      success: true,
      vault,
      dek: wasmResult.dek,
    };
  } catch (error) {
    console.error('Vault creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during vault creation',
    };
  }
}

// ============================================================================
// Vault Unlock
// ============================================================================

export interface UnlockVaultResult {
  success: boolean;
  vault?: VaultPlaintextV1;
  dek?: Uint8Array;
  error?: string;
}

/**
 * Unlock the vault using WebAuthn PRF
 *
 * This function orchestrates:
 * 1. OPFS load (TypeScript - browser API)
 * 2. WebAuthn PRF derivation (TypeScript - browser API)
 * 3. Vault unlock with crypto (Rust WASM)
 */
export async function unlockVault(): Promise<UnlockVaultResult> {
  try {
    // Ensure WASM is initialized
    ensureInitialized();
    
    // Step 1: Check if vault exists
    const hasVault = await vaultExists();
    if (!hasVault) {
      return {
        success: false,
        error: 'No vault found. Please create a vault first.',
      };
    }

    // Step 2: Load from OPFS (TypeScript - browser API)
    const metadata = await loadVaultMetadata();
    if (!metadata) {
      return {
        success: false,
        error: 'Vault metadata not found. Vault may be corrupted.',
      };
    }

    const wrappedKeys = await loadWrappedKeys();
    if (!wrappedKeys) {
      return {
        success: false,
        error: 'Wrapped keys not found. Vault may be corrupted.',
      };
    }

    const manifest = await loadManifest();
    if (!manifest) {
      return {
        success: false,
        error: 'Encrypted manifest not found. Vault may be corrupted.',
      };
    }

    // Step 3: Get PRF output from WebAuthn (TypeScript - browser API)
    const prfSalt = base64urlDecode(metadata.prfSalt);
    let prfOutput;
    try {
      prfOutput = await getPRFOutputByCredential(metadata.credentialId, prfSalt);
    } catch (error) {
      console.error('Failed to get PRF output:', error);
      return {
        success: false,
        error: 'Failed to authenticate with passkey. Please try again.',
      };
    }

    // Step 4: Unlock vault using WASM (Rust - crypto)
    const wasmResult = wasmUnlockVault(
      prfOutput,
      JSON.stringify(metadata),
      JSON.stringify(wrappedKeys),
      JSON.stringify(manifest)
    );

    // Parse results
    const vault: VaultPlaintextV1 = JSON.parse(wasmResult.vault);

    return {
      success: true,
      vault,
      dek: wasmResult.dek,
    };
  } catch (error) {
    console.error('Vault unlock failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during vault unlock',
    };
  }
}

// ============================================================================
// Wallet Record Operations
// ============================================================================

/**
 * Encrypt arbitrary data
 */
export async function encryptRecord(
  dek: Uint8Array,
  plaintext: Uint8Array,
  vaultId: string,
  purpose: string
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    ensureInitialized();
    const envelopeJson = wasmEncryptRecord(dek, plaintext, vaultId, purpose);
    return { success: true, data: envelopeJson };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to encrypt record',
    };
  }
}

/**
 * Encrypt and save a wallet record
 */
export async function saveWalletRecord(
  dek: Uint8Array,
  recordId: string,
  recordData: WalletRecord,
  vaultId: string
): Promise<{ success: boolean; envelope?: CipherEnvelopeV1; error?: string }> {
  try {
    ensureInitialized();
    const plaintext = new TextEncoder().encode(JSON.stringify(recordData));
    const envelopeJson = wasmEncryptRecord(dek, plaintext, vaultId, recordId);
    const envelope: CipherEnvelopeV1 = JSON.parse(envelopeJson);
    return { success: true, envelope };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to encrypt record',
    };
  }
}

/**
 * Load and decrypt a wallet record
 */
export async function loadWalletRecord(
  dek: Uint8Array,
  envelopeJson: string
): Promise<{ success: boolean; data?: WalletRecord; error?: string }> {
  try {
    ensureInitialized();
    const plaintext = wasmDecryptRecord(dek, envelopeJson);
    const data: WalletRecord = JSON.parse(new TextDecoder().decode(plaintext));
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to decrypt record',
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a new DEK (Data Encryption Key)
 */
export function generateDEK(): Uint8Array {
  ensureInitialized();
  return generateAESKey();
}

/**
 * Check if a vault exists
 */
export async function hasVault(): Promise<boolean> {
  return vaultExists();
}

/**
 * Get vault metadata
 */
export async function getVaultMetadata(): Promise<VaultMetadata | null> {
  return loadVaultMetadata();
}

// ============================================================================
// Backup Functions
// ============================================================================

/**
 * Create an encrypted backup of the vault
 */
export async function createBackup(
  dek: Uint8Array,
  vault: VaultPlaintextV1,
  metadata: VaultMetadata
): Promise<{ success: boolean; backup?: string; error?: string }> {
  try {
    ensureInitialized();
    // Encrypt the vault with the DEK
    const vaultJson = JSON.stringify(vault);
    const plaintext = new TextEncoder().encode(vaultJson);
    const envelopeJson = wasmEncryptRecord(dek, plaintext, metadata.vaultId, 'backup');
    
    const backup = {
      version: '1.0',
      metadata,
      envelope: JSON.parse(envelopeJson),
      createdAt: new Date().toISOString(),
    };
    
    return { success: true, backup: JSON.stringify(backup) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create backup',
    };
  }
}

/**
 * Download a backup file
 */
export function downloadBackup(backup: string, filename: string): void {
  const blob = new Blob([backup], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import a backup file
 */
export async function importBackup(
  dek: Uint8Array,
  backupJson: string
): Promise<{ success: boolean; vault?: VaultPlaintextV1; metadata?: VaultMetadata; error?: string }> {
  try {
    ensureInitialized();
    const backup = JSON.parse(backupJson);
    
    if (backup.version !== '1.0') {
      return { success: false, error: 'Unsupported backup version' };
    }
    
    const envelopeJson = JSON.stringify(backup.envelope);
    const plaintext = wasmDecryptRecord(dek, envelopeJson);
    const vault: VaultPlaintextV1 = JSON.parse(new TextDecoder().decode(plaintext));
    
    return { success: true, vault, metadata: backup.metadata };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import backup',
    };
  }
}