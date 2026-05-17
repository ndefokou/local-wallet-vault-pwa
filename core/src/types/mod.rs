//! Type definitions for the Local Wallet Vault
//!
//! These types mirror the TypeScript definitions in `src/lib/types/`.

mod backup;
mod envelope;
mod vault;

pub use backup::{BackupPackageV1, VaultMetadata};
pub use envelope::{CipherEnvelopeV1, EnvelopeAad, EnvelopePurpose};
pub use vault::{
    ExperimentalSecretPayload, LocalProfile, VaultPlaintextV1, VaultPreferences, WalletAddress,
    WalletRecord,
};