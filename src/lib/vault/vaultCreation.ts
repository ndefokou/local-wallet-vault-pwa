/**
 * Vault creation logic
 */

import { createCredentialWithPRF, getPRFOutputByCredential, generateUserHandle, generatePRFSalt } from '../webauthn/prf';
import { deriveKeyHKDF } from '../crypto/hkdf';
import { generateAESKey, createEnvelope } from '../crypto/aesGcm';
import { wrapDEK } from '../crypto/keyWrap';
import { createVaultMetadata, saveVaultMetadata, saveWrappedKeys, saveManifest } from '../opfs/vaultStore';
import { base64urlEncode } from '../base64url';
import type { VaultPlaintextV1 } from '../types/vault';

const KEK_INFO = 'local-wallet-vault:kek:v1';

export interface CreateVaultResult {
  success: boolean;
  error?: string;
}

/**
 * Create a new vault with WebAuthn PRF protection
 */
export async function createVault(): Promise<CreateVaultResult> {
  try {
    // Step 1: Generate random user handle and PRF salt
    const userHandle = generateUserHandle();
    const prfSalt = generatePRFSalt();

    // Step 2: Create WebAuthn credential with PRF extension
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

    // Step 3: Get PRF output to derive KEK
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

    // Step 4: Derive KEK from PRF output using HKDF
    const kek = await deriveKeyHKDF(
      prfOutput,
      new Uint8Array(32), // Use zero salt for KEK derivation (PRF salt already provides randomness)
      KEK_INFO,
      32
    );

    // Step 5: Generate DEK
    const dek = await generateAESKey();

    // Step 6: Create vault metadata
    const metadata = await createVaultMetadata(
      credentialResult.credentialId,
      base64urlEncode(userHandle),
      base64urlEncode(prfSalt)
    );

    // Step 7: Wrap DEK with KEK
    const wrappedKeys = await wrapDEK(kek, dek, metadata.vaultId);

    // Step 8: Create initial empty vault
    const initialVault: VaultPlaintextV1 = {
      schemaVersion: 1,
      vaultId: metadata.vaultId,
      profile: {},
      wallets: [],
      preferences: {
        lockAfterSeconds: 300, // 5 minutes default
        allowNetworkLookups: false,
      },
      updatedAt: new Date().toISOString(),
    };

    // Step 9: Encrypt vault manifest with DEK
    const manifestEnvelope = await createEnvelope(
      dek,
      new TextEncoder().encode(JSON.stringify(initialVault)),
      metadata.vaultId,
      'manifest'
    );

    // Step 10: Save everything to OPFS
    await saveVaultMetadata(metadata);
    await saveWrappedKeys(wrappedKeys);
    await saveManifest(manifestEnvelope);

    return { success: true };
  } catch (error) {
    console.error('Vault creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during vault creation',
    };
  }
}