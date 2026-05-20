// Cipher Envelope Types

export type CipherEnvelopeV1 = {
  magic: 'LWV_ENVELOPE';
  version: 1;
  alg: 'AES-GCM-256';
  nonce: string; // base64url, 96-bit random
  // AAD stored as base64url-encoded JSON bytes
  // This ensures the exact same bytes are used during decryption
  aadB64: string;
  ciphertext: string; // base64url
};

// AAD structure (for reference/inspection purposes)
export type EnvelopeAad = {
  vaultId: string;
  purpose: 'dek-wrap' | 'manifest' | 'wallet-record' | 'backup';
  schemaVersion: number;
  recordId?: string;
  revision?: number;
};

export type EnvelopePurpose = EnvelopeAad['purpose'];