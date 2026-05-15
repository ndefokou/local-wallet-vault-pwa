/**
 * Vault backup and recovery logic
 */

import { importAESKey, createEnvelope, decryptEnvelope } from '../crypto/aesGcm';
import { base64urlEncode, base64urlDecode, generateRandomBytes } from '../base64url';
import type { VaultMetadata } from '../types/backup';
import type { VaultPlaintextV1 } from '../types/vault';
import type { CipherEnvelopeV1 } from '../types/envelope';

const BACKUP_KEY_LENGTH = 32; // 256 bits

export interface BackupPackage {
  magic: 'LWV_BACKUP';
  version: 1;
  createdAt: string;
  encryption: {
    alg: 'AES-GCM-256';
    keyFormat: 'base64url-256-bit-random-user-held-key';
  };
  metadata: {
    vaultId: string;
    createdAt: string;
  };
  payload: CipherEnvelopeV1;
}

export interface BackupResult {
  success: boolean;
  backupKey?: string;
  backupData?: string;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  vault?: VaultPlaintextV1;
  error?: string;
}

/**
 * Generate a random backup key
 */
export function generateBackupKey(): string {
  const keyBytes = generateRandomBytes(BACKUP_KEY_LENGTH);
  return base64urlEncode(keyBytes);
}

/**
 * Create an encrypted backup of the vault
 */
export async function createBackup(
  vault: VaultPlaintextV1,
  metadata: VaultMetadata
): Promise<BackupResult> {
  try {
    // Generate backup key
    const backupKeyBytes = generateRandomBytes(BACKUP_KEY_LENGTH);
    const backupKey = base64urlEncode(backupKeyBytes);
    
    // Import as CryptoKey
    const backupCryptoKey = await importAESKey(backupKeyBytes);
    
    // Create backup payload
    const backupPayload: BackupPackage = {
      magic: 'LWV_BACKUP',
      version: 1,
      createdAt: new Date().toISOString(),
      encryption: {
        alg: 'AES-GCM-256',
        keyFormat: 'base64url-256-bit-random-user-held-key',
      },
      metadata: {
        vaultId: metadata.vaultId,
        createdAt: metadata.createdAt,
      },
      payload: await createEnvelope(
        backupCryptoKey,
        new TextEncoder().encode(JSON.stringify(vault)),
        metadata.vaultId,
        'backup'
      ),
    };
    
    return {
      success: true,
      backupKey,
      backupData: JSON.stringify(backupPayload, null, 2),
    };
  } catch (error) {
    console.error('Backup creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during backup creation',
    };
  }
}

/**
 * Import a vault from an encrypted backup
 */
export async function importBackup(
  backupData: string,
  backupKey: string
): Promise<ImportResult> {
  try {
    // Parse backup
    const backup: BackupPackage = JSON.parse(backupData);
    
    // Validate backup
    if (backup.magic !== 'LWV_BACKUP') {
      return { success: false, error: 'Invalid backup format' };
    }
    
    if (backup.version !== 1) {
      return { success: false, error: `Unsupported backup version: ${backup.version}` };
    }
    
    if (backup.encryption.alg !== 'AES-GCM-256') {
      return { success: false, error: `Unsupported encryption algorithm: ${backup.encryption.alg}` };
    }
    
    // Decode backup key
    const backupKeyBytes = base64urlDecode(backupKey);
    if (backupKeyBytes.length !== BACKUP_KEY_LENGTH) {
      return { success: false, error: 'Invalid backup key length' };
    }
    
    // Import as CryptoKey
    const backupCryptoKey = await importAESKey(backupKeyBytes);
    
    // Decrypt payload
    const plaintext = await decryptEnvelope(backupCryptoKey, backup.payload);
    
    // Parse vault
    const vault: VaultPlaintextV1 = JSON.parse(new TextDecoder().decode(plaintext));
    
    return {
      success: true,
      vault,
    };
  } catch (error) {
    console.error('Backup import failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during backup import',
    };
  }
}

/**
 * Download backup file
 */
export function downloadBackup(backupData: string, vaultId: string): void {
  const blob = new Blob([backupData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vault-backup-${vaultId.slice(0, 8)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}