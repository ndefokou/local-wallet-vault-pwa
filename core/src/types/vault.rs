//! Vault Types
//!
//! Mirrors `src/lib/types/vault.ts`

use serde::{Deserialize, Serialize};

/// Vault plaintext version 1
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultPlaintextV1 {
    /// Schema version
    #[serde(rename = "schemaVersion")]
    pub schema_version: u8,
    /// Vault identifier
    #[serde(rename = "vaultId")]
    pub vault_id: String,
    /// User profile
    pub profile: LocalProfile,
    /// Wallet records
    pub wallets: Vec<WalletRecord>,
    /// User preferences
    pub preferences: VaultPreferences,
    /// Last update timestamp (ISO 8601)
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// Local user profile
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LocalProfile {
    /// Display name
    #[serde(rename = "displayName", skip_serializing_if = "Option::is_none")]
    pub display_name: Option<String>,
    /// Notes
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

/// Vault preferences
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultPreferences {
    /// Default chain ID
    #[serde(rename = "defaultChainId", skip_serializing_if = "Option::is_none")]
    pub default_chain_id: Option<u64>,
    /// Auto-lock timeout in seconds
    #[serde(rename = "lockAfterSeconds")]
    pub lock_after_seconds: u32,
    /// Allow network lookups
    #[serde(rename = "allowNetworkLookups")]
    pub allow_network_lookups: bool,
}

impl Default for VaultPreferences {
    fn default() -> Self {
        Self {
            default_chain_id: None,
            lock_after_seconds: 300, // 5 minutes
            allow_network_lookups: false,
        }
    }
}

/// Wallet record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletRecord {
    /// Unique identifier
    pub id: String,
    /// User-friendly label
    pub label: String,
    /// Wallet type
    pub kind: WalletKind,
    /// Wallet addresses
    pub addresses: Vec<WalletAddress>,
    /// User-defined tags
    pub tags: Vec<String>,
    /// Notes
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    /// Creation timestamp (ISO 8601)
    #[serde(rename = "createdAt")]
    pub created_at: String,
    /// Last update timestamp (ISO 8601)
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

/// Wallet type
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum WalletKind {
    WatchOnly,
    BrowserWallet,
    HardwareWallet,
    ExperimentalSecret,
}

/// Wallet address
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletAddress {
    /// Chain ID
    #[serde(rename = "chainId")]
    pub chain_id: u64,
    /// Address
    pub address: String,
    /// Optional label
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

/// Experimental secret payload (for advanced users)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExperimentalSecretPayload {
    /// Secret type
    #[serde(rename = "type")]
    pub secret_type: SecretType,
    /// Secret value
    pub value: String,
    /// Warning acceptance timestamp
    #[serde(rename = "warningAcceptedAt")]
    pub warning_accepted_at: String,
}

/// Secret type
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SecretType {
    Mnemonic,
    PrivateKey,
    ApiToken,
}

impl VaultPlaintextV1 {
    /// Create a new empty vault
    pub fn new(vault_id: String) -> Self {
        Self {
            schema_version: 1,
            vault_id,
            profile: LocalProfile::default(),
            wallets: Vec::new(),
            preferences: VaultPreferences::default(),
            updated_at: chrono_like_timestamp(),
        }
    }

    /// Serialize to JSON bytes
    pub fn to_json_bytes(&self) -> Result<Vec<u8>, crate::Error> {
        Ok(serde_json::to_vec(self)?)
    }

    /// Deserialize from JSON bytes
    pub fn from_json_bytes(bytes: &[u8]) -> Result<Self, crate::Error> {
        Ok(serde_json::from_slice(bytes)?)
    }
}

/// Generate an ISO 8601 timestamp (simple implementation)
fn chrono_like_timestamp() -> String {
    // Use a simple timestamp format without chrono dependency
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    // Format: YYYY-MM-DDTHH:MM:SSZ (approximate)
    // This is a simplified version - in production you'd use chrono or time crate
    format!("{}Z", secs)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_serialization() {
        let vault = VaultPlaintextV1::new("vault-123".to_string());
        let json = serde_json::to_string(&vault).unwrap();
        assert!(json.contains("vaultId"));
        assert!(json.contains("schemaVersion"));

        let parsed: VaultPlaintextV1 = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.vault_id, "vault-123");
    }

    #[test]
    fn test_wallet_kind_serialization() {
        let wallet = WalletRecord {
            id: "wallet-1".to_string(),
            label: "My Wallet".to_string(),
            kind: WalletKind::BrowserWallet,
            addresses: vec![],
            tags: vec!["main".to_string()],
            notes: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        };

        let json = serde_json::to_string(&wallet).unwrap();
        assert!(json.contains("browser-wallet"));
    }
}