// Cipher Envelope Types

export type CipherEnvelopeV1 = {
  magic: 'LWV_ENVELOPE';
  version: 1;
  alg: 'AES-GCM-256';
  nonce: string; // base64url, 96-bit random
  aad: {
    vaultId: string;
    purpose: 'dek-wrap' | 'manifest' | 'wallet-record' | 'backup';
    schemaVersion: number;
    recordId?: string;
    revision?: number;
  };
  ciphertext: string; // base64url
};

export type EnvelopePurpose = CipherEnvelopeV1['aad']['purpose'];