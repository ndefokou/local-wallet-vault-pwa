/**
 * WASM Bridge - Orchestrates between Rust WASM core and browser APIs
 *
 * This module provides the high-level API that combines:
 * - Rust WASM for cryptographic operations
 * - OPFS for file storage (browser API)
 * - WebAuthn for authentication (browser API)
 */

import * as wasm from './index';
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
import { base64urlEncode, base64urlDecode } from '../base64url';
import type { VaultMetadata } from '../types/backup';
import type { VaultPlaintextV1 } from '../types/vault';

// Re-export WASM functions
export * from './index';

/**
 * Initialize the WASM module
 */
export async function initWasm(): Promise<void> {
  await wasm.init();
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
export async function createVaultWithPRF(): Promise<CreateVaultResult> {
  try {
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
    const wasmResult = wasm.createVault(
      prfOutput,
      credentialResult.credentialId,
      base64urlEncode(userHandle)
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
export async function unlockVaultWithPRF(): Promise<UnlockVaultResult> {
  try {
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
    const wasmResult = wasm.unlockVault(
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
 * Encrypt and save a wallet record
 */
export async function saveWalletRecord(
  dek: Uint8Array,
  recordId: string,
  recordData: unknown,
  vaultId: string
): Promise<{ success: boolean; envelope: string; error?: string }> {
  try {
    const plaintext = new TextEncoder().encode(JSON.stringify(recordData));
    const envelope = wasm.encryptRecord(dek, plaintext, vaultId, recordId);
    return { success: true, envelope };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to encrypt record',
      envelope: '',
    };
  }
}

/**
 * Load and decrypt a wallet record
 */
export async function loadWalletRecord(
  dek: Uint8Array,
  envelopeJson: string
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const plaintext = wasm.decryptRecord(dek, envelopeJson);
    const data = JSON.parse(new TextDecoder().decode(plaintext));
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
 * Check if WASM is initialized
 */
export function isWasmInitialized(): boolean {
  try {
    wasm.getVersion();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get WASM version
 */
export function getWasmVersion(): string {
  return wasm.getVersion();
}