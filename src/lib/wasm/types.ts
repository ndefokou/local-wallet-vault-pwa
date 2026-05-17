/**
 * Type definitions for WASM module
 *
 * These types mirror the Rust types and provide TypeScript type safety.
 */

// Re-export types from the existing types module
export type { CipherEnvelopeV1, EnvelopePurpose } from '../types/envelope';
export type { VaultPlaintextV1, LocalProfile, VaultPreferences, WalletRecord, WalletAddress } from '../types/vault';
export type { BackupPackageV1, VaultMetadata } from '../types/backup';