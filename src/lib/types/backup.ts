// Backup Types

import type { CipherEnvelopeV1 } from './envelope';

export type BackupPackageV1 = {
  magic: 'LWV_BACKUP';
  version: 1;
  createdAt: string;
  encryption: {
    alg: 'AES-GCM-256';
    keyFormat: 'base64url-256-bit-random-user-held-key';
  };
  payload: CipherEnvelopeV1;
};

export type VaultMetadata = {
  schemaVersion: 1;
  vaultId: string;
  createdAt: string;
  updatedAt: string;
  rpId: string;
  credentialId: string;
  credentialUserHandle: string;
  prfSalt: string;
  kdf: 'HKDF-SHA-256';
  wrapAlg: 'AES-GCM-256';
  dataAlg: 'AES-GCM-256';
};