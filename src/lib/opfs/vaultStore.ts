/**
 * Vault storage operations using OPFS
 */

import { getVaultDirectory, getRecordsDirectory, writeOPFSFile, readOPFSFile, deleteOPFSFile, fileExists, listFiles, clearVaultDirectory } from './opfsRoot';
import type { VaultMetadata } from '../types/backup';
import type { CipherEnvelopeV1 } from '../types/envelope';
import type { VaultPlaintextV1 } from '../types/vault';
import { generateRandomBase64url } from '../base64url';

const METADATA_FILE = 'metadata.json';
const WRAPPED_KEYS_FILE = 'wrapped-keys.json';
const MANIFEST_FILE = 'manifest.enc.json';

/**
 * Check if a vault exists
 */
export async function vaultExists(): Promise<boolean> {
  const vaultDir = await getVaultDirectory();
  return fileExists(vaultDir, METADATA_FILE);
}

/**
 * Create vault metadata
 */
export async function createVaultMetadata(
  credentialId: string,
  userHandle: string,
  prfSalt: string
): Promise<VaultMetadata> {
  const now = new Date().toISOString();
  const vaultId = generateRandomBase64url(32);
  
  return {
    schemaVersion: 1,
    vaultId,
    createdAt: now,
    updatedAt: now,
    rpId: window.location.hostname,
    credentialId,
    credentialUserHandle: userHandle,
    prfSalt,
    kdf: 'HKDF-SHA-256',
    wrapAlg: 'AES-GCM-256',
    dataAlg: 'AES-GCM-256',
  };
}

/**
 * Save vault metadata
 */
export async function saveVaultMetadata(metadata: VaultMetadata): Promise<void> {
  const vaultDir = await getVaultDirectory();
  await writeOPFSFile(vaultDir, METADATA_FILE, JSON.stringify(metadata, null, 2));
}

/**
 * Load vault metadata
 */
export async function loadVaultMetadata(): Promise<VaultMetadata | null> {
  const vaultDir = await getVaultDirectory();
  const content = await readOPFSFile(vaultDir, METADATA_FILE);
  if (!content) {
    return null;
  }
  return JSON.parse(content) as VaultMetadata;
}

/**
 * Save wrapped keys envelope
 */
export async function saveWrappedKeys(envelope: CipherEnvelopeV1): Promise<void> {
  const vaultDir = await getVaultDirectory();
  await writeOPFSFile(vaultDir, WRAPPED_KEYS_FILE, JSON.stringify(envelope, null, 2));
}

/**
 * Load wrapped keys envelope
 */
export async function loadWrappedKeys(): Promise<CipherEnvelopeV1 | null> {
  const vaultDir = await getVaultDirectory();
  const content = await readOPFSFile(vaultDir, WRAPPED_KEYS_FILE);
  if (!content) {
    return null;
  }
  return JSON.parse(content) as CipherEnvelopeV1;
}

/**
 * Save encrypted manifest
 */
export async function saveManifest(envelope: CipherEnvelopeV1): Promise<void> {
  const vaultDir = await getVaultDirectory();
  await writeOPFSFile(vaultDir, MANIFEST_FILE, JSON.stringify(envelope, null, 2));
}

/**
 * Load encrypted manifest
 */
export async function loadManifest(): Promise<CipherEnvelopeV1 | null> {
  const vaultDir = await getVaultDirectory();
  const content = await readOPFSFile(vaultDir, MANIFEST_FILE);
  if (!content) {
    return null;
  }
  return JSON.parse(content) as CipherEnvelopeV1;
}

/**
 * Save an encrypted wallet record
 */
export async function saveWalletRecord(
  recordId: string,
  envelope: CipherEnvelopeV1
): Promise<void> {
  const recordsDir = await getRecordsDirectory();
  await writeOPFSFile(recordsDir, `${recordId}.enc.json`, JSON.stringify(envelope, null, 2));
}

/**
 * Load an encrypted wallet record
 */
export async function loadWalletRecord(recordId: string): Promise<CipherEnvelopeV1 | null> {
  const recordsDir = await getRecordsDirectory();
  const content = await readOPFSFile(recordsDir, `${recordId}.enc.json`);
  if (!content) {
    return null;
  }
  return JSON.parse(content) as CipherEnvelopeV1;
}

/**
 * Delete a wallet record
 */
export async function deleteWalletRecord(recordId: string): Promise<void> {
  const recordsDir = await getRecordsDirectory();
  await deleteOPFSFile(recordsDir, `${recordId}.enc.json`);
}

/**
 * List all wallet record IDs
 */
export async function listWalletRecordIds(): Promise<string[]> {
  const recordsDir = await getRecordsDirectory();
  const files = await listFiles(recordsDir);
  return files
    .filter(f => f.endsWith('.enc.json'))
    .map(f => f.replace('.enc.json', ''));
}

/**
 * Create an empty vault plaintext
 */
export function createEmptyVault(vaultId: string): VaultPlaintextV1 {
  return {
    schemaVersion: 1,
    vaultId,
    profile: {},
    wallets: [],
    preferences: {
      lockAfterSeconds: 300, // 5 minutes default
      allowNetworkLookups: false,
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Delete the entire vault
 */
export async function deleteVault(): Promise<void> {
  await clearVaultDirectory();
}