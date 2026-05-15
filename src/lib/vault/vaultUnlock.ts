/**
 * Vault unlock logic
 */

import { getPRFOutputByCredential } from '../webauthn/prf';
import { deriveKeyHKDF } from '../crypto/hkdf';
import { unwrapDEK } from '../crypto/keyWrap';
import { decryptEnvelope } from '../crypto/aesGcm';
import { loadVaultMetadata, loadWrappedKeys, loadManifest } from '../opfs/vaultStore';
import { base64urlDecode } from '../base64url';
import type { VaultMetadata } from '../types/backup';
import type { VaultPlaintextV1 } from '../types/vault';

const KEK_INFO = 'local-wallet-vault:kek:v1';

export interface UnlockResult {
  success: boolean;
  vault?: VaultPlaintextV1;
  dek?: CryptoKey;
  metadata?: VaultMetadata;
  error?: string;
}

/**
 * Unlock the vault using WebAuthn PRF
 */
export async function unlockVault(): Promise<UnlockResult> {
  try {
    // Step 1: Load vault metadata
    const metadata = await loadVaultMetadata();
    if (!metadata) {
      return {
        success: false,
        error: 'No vault found. Please create a vault first.',
      };
    }

    // Step 2: Load wrapped keys
    const wrappedKeys = await loadWrappedKeys();
    if (!wrappedKeys) {
      return {
        success: false,
        error: 'Wrapped keys not found. Vault may be corrupted.',
      };
    }

    // Step 3: Load encrypted manifest
    const manifestEnvelope = await loadManifest();
    if (!manifestEnvelope) {
      return {
        success: false,
        error: 'Encrypted manifest not found. Vault may be corrupted.',
      };
    }

    // Step 4: Get PRF output from WebAuthn assertion
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

    // Step 5: Derive KEK from PRF output
    const kek = await deriveKeyHKDF(
      prfOutput,
      new Uint8Array(32), // Use zero salt for KEK derivation
      KEK_INFO,
      32
    );

    // Step 6: Unwrap DEK
    let dek;
    try {
      dek = await unwrapDEK(kek, wrappedKeys);
    } catch (error) {
      console.error('Failed to unwrap DEK:', error);
      return {
        success: false,
        error: 'Failed to decrypt vault key. Wrong passkey or corrupted vault.',
      };
    }

    // Step 7: Decrypt vault manifest
    let plaintext;
    try {
      plaintext = await decryptEnvelope(dek, manifestEnvelope);
    } catch (error) {
      console.error('Failed to decrypt manifest:', error);
      return {
        success: false,
        error: 'Failed to decrypt vault. Wrong passkey or corrupted vault.',
      };
    }

    // Step 8: Parse vault
    const vault: VaultPlaintextV1 = JSON.parse(new TextDecoder().decode(plaintext));

    return {
      success: true,
      vault,
      dek,
      metadata,
    };
  } catch (error) {
    console.error('Vault unlock failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during vault unlock',
    };
  }
}