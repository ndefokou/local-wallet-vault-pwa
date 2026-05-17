//! Vault operations module
//!
//! Provides vault creation and unlock logic.

pub mod creation;
pub mod unlock;

pub use creation::{create_vault, CreateVaultResult};
pub use unlock::{decrypt_record, encrypt_record, unlock_vault, UnlockVaultResult};